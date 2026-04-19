import { print } from '@abapify/abap-ast';
import { loadSpec } from './oas/index';
import { getProfile, type TargetProfileId } from './profiles/index';
import { planTypes } from './types/index';
import { getCloudRuntime, type CloudRuntime } from './runtime/index';
import { emitClientClass, sanitizeStarComments } from './emit/index';
import {
  writeLayout,
  type OutputFormat,
  type ClassArtifact,
  type WriteResult,
} from './format/index';

export interface GenerateOptions {
  /** Path or URL to the OpenAPI spec, or a parsed object. */
  input: string | URL | object;
  /** Output directory (the layout writer creates files inside it). */
  outDir: string;
  /** Target SAP system profile. Only `s4-cloud` is implemented in v1. */
  target: TargetProfileId;
  /** Packaging layout. */
  format: OutputFormat;
  /** Uppercase ABAP class name, e.g. `ZCL_PETSTORE3_CLIENT`. */
  className: string;
  /**
   * Lower-case ABAP type prefix (without `ty_` or trailing underscore),
   * e.g. `ps3` produces `ty_ps3_pet`.
   */
  typePrefix: string;
  /** Optional short description used in the generated `.clas.xml` DESCRIPT. */
  description?: string;
}

export interface GenerateResult extends WriteResult {
  className: string;
  typeCount: number;
  operationCount: number;
  source: string;
}

/**
 * Run the full pipeline:
 *   OpenAPI → normalize → plan types → emit class AST → print → write layout.
 *
 * Deterministic: re-running with the same inputs produces byte-identical files.
 */
export async function generate(
  options: GenerateOptions,
): Promise<GenerateResult> {
  if (options.target !== 's4-cloud') {
    throw new Error(
      `target '${options.target}' is not implemented in v1; only 's4-cloud' is supported`,
    );
  }

  const spec = await loadSpec(options.input);
  const profile = getProfile(options.target);
  const plan = planTypes(spec, { typePrefix: options.typePrefix });
  const runtime = getCloudRuntime();

  const emitted = emitClientClass(spec, plan, profile, runtime, {
    className: options.className,
    typePrefix: options.typePrefix,
  });

  // Print the bare AST, then splice the raw HTTP/URL/JSON runtime into
  // both the PRIVATE SECTION (declarations) and the class IMPLEMENTATION
  // block (bodies). The AST has no representation for these raw ABAP
  // blocks; we keep them as plain strings to avoid re-parsing ABAP.
  const printedMain = print(emitted.class);
  const mainWithRuntime = injectRuntime(
    printedMain,
    options.className,
    runtime,
  );
  // Steampunk rejects source with `" ` line comments in certain structural
  // positions ("The class contains unknown comments which can't be stored").
  // Strip all line-only comments before writing. Inline trailing comments
  // after code on the same line are kept.
  const mainSource = stripLineComments(mainWithRuntime);

  // Emit the main class artifact first.
  const mainArtifact: ClassArtifact = {
    className: options.className,
    mainSource,
    description: options.description,
  };
  const mainResult = await writeLayout(
    mainArtifact,
    options.format,
    options.outDir,
  );

  const allFiles: string[] = [...mainResult.files];
  const sourceParts: string[] = [mainSource];

  // Each extra is emitted as its own global class file so that the (ZCX_*)
  // exception class has its own .clas.abap + .clas.xml, which is what
  // Steampunk / abapGit expect.
  for (const extra of emitted.extras) {
    const extraSource = printExtraAsGlobalClass(extra.name, print(extra));
    sourceParts.push(extraSource);
    const extraArtifact: ClassArtifact = {
      className: extra.name,
      mainSource: extraSource,
      description: `Generated error type for ${options.className}`,
    };
    const extraResult = await writeLayout(
      extraArtifact,
      options.format,
      options.outDir,
    );
    allFiles.push(...extraResult.files);
  }

  // Deduplicate shared files (package.devc.xml) and keep sorted.
  const uniqueFiles = Array.from(new Set(allFiles)).sort();
  const source = sourceParts.join('\n\n');

  return {
    files: uniqueFiles,
    className: options.className,
    typeCount: plan.entries.length,
    operationCount: spec.operations.length,
    source,
  };
}

/**
 * Rewrite a printed `LocalClassDef` into a global-class-compatible source.
 *
 * The printer emits a LocalClassDef with a header like
 *   `CLASS zcx_foo DEFINITION ... INHERITING FROM cx_static_check.`
 * For a stand-alone abapGit / gCTS file we need the `PUBLIC CREATE PUBLIC`
 * modifiers (Steampunk rejects activation otherwise). We patch the first
 * line of the DEFINITION header only; the rest of the printed source is
 * already valid.
 */
function printExtraAsGlobalClass(className: string, printed: string): string {
  const defHeader = new RegExp(
    String.raw`^(\s*CLASS\s+${className}\s+DEFINITION)(?!\s+PUBLIC)(\b)`,
    'm',
  );
  return printed.replace(defHeader, '$1 PUBLIC CREATE PUBLIC$2');
}

/**
 * Inject the raw HTTP/URL/JSON runtime into a printed class source:
 *
 *  - {@link CloudRuntime.declarations} (METHODS lines) are spliced at the end
 *    of the PRIVATE SECTION, before the DEFINITION's closing `ENDCLASS.`.
 *  - {@link CloudRuntime.implementations} (METHOD…ENDMETHOD blocks) are
 *    spliced before the IMPLEMENTATION's closing `ENDCLASS.`.
 *
 * We split the printed source at `CLASS <name> IMPLEMENTATION.` and perform
 * the splice on each half separately so the pattern match can't escape its
 * intended scope. Star comments inside the runtime are normalised to line
 * comments so they survive the indented splice.
 */
function injectRuntime(
  printed: string,
  className: string,
  runtime: CloudRuntime,
): string {
  const implHeader = new RegExp(
    String.raw`^CLASS\s+${className}\s+IMPLEMENTATION\.`,
    'm',
  );
  const split = printed.split(implHeader);
  if (split.length !== 2) {
    throw new Error(
      `generate: could not locate IMPLEMENTATION block for ${className} in printed source`,
    );
  }
  const [defPart, implPartWithoutHeader] = split;
  const implHeaderMatch = implHeader.exec(printed);
  const implHeaderLine = implHeaderMatch ? implHeaderMatch[0] : '';

  // Splice declarations before the DEFINITION's closing `ENDCLASS.`
  const indentedDecl = indentLines(
    sanitizeStarComments(runtime.declarations),
    4,
  );
  const defWithRuntime = defPart!.replace(
    /\n(ENDCLASS\.\s*)$/,
    `\n${indentedDecl}\n$1`,
  );

  // Splice implementations before the IMPLEMENTATION's closing `ENDCLASS.`
  const indentedImpl = indentLines(
    sanitizeStarComments(runtime.implementations),
    2,
  );
  const implWithRuntime = implPartWithoutHeader!.replace(
    /\n(ENDCLASS\.\s*)$/,
    `\n${indentedImpl}\n$1`,
  );

  return `${defWithRuntime}${implHeaderLine}${implWithRuntime}`;
}

function indentLines(source: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return source
    .split('\n')
    .map((line) => (line.length > 0 ? pad + line : line))
    .join('\n');
}

/**
 * Remove line-only comments (`"` at the start of a line, optionally
 * indented) from an ABAP source string. Trailing comments after code on
 * the same line are preserved.
 *
 * Steampunk's source-save endpoint rejects sources that contain comments
 * it classifies as "unknown" — in practice any standalone line comment
 * inside sections like PRIVATE SECTION between METHODS declarations.
 * The safest option for a code-generator is to emit no standalone line
 * comments at all; this post-processor enforces that.
 */
function stripLineComments(source: string): string {
  const out: string[] = [];
  for (const line of source.split('\n')) {
    if (/^\s*"/.test(line)) continue; // drop pure line comment
    out.push(line);
  }
  // Collapse multiple blank lines that can result from stripping.
  const collapsed: string[] = [];
  let blank = false;
  for (const line of out) {
    if (line.trim().length === 0) {
      if (blank) continue;
      blank = true;
    } else {
      blank = false;
    }
    collapsed.push(line);
  }
  return collapsed.join('\n');
}
