/**
 * JaCoCo XML coverage report formatter.
 *
 * Consumes parsed coverage data from the adt-contracts runtime endpoints:
 *
 *   measurements: client.adt.runtime.traces.coverage.measurements.post(id, query)
 *                 → AcoverageResultSchema  (tree of DEVC → CLAS → methods)
 *   statements:   client.adt.runtime.traces.coverage.statements.post(id, bulkRequest)
 *                 → AcoverageStatementsSchema (per-method line hits/misses)
 *
 * Emits JaCoCo 1.1 XML:
 *
 *   <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
 *   <!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">
 *   <report name="ABAP Coverage">
 *     <package name="TEST_PACKAGE">
 *       <class name="CL_FOO" sourcefilename="cl_foo.clas.abap">
 *         <method name="METHOD_A" desc="" line="52">
 *           <counter type="BRANCH"      missed="…" covered="…"/>
 *           <counter type="METHOD"      missed="…" covered="…"/>
 *           <counter type="INSTRUCTION" missed="…" covered="…"/>
 *         </method>
 *         <counter type="…" …/>
 *       </class>
 *       <sourcefile name="cl_foo.clas.abap">
 *         <line nr="N" mi="0|1" ci="1|0" mb="0" cb="0"/>
 *       </sourcefile>
 *       <counter …/>
 *     </package>
 *     <counter …/>
 *   </report>
 *
 * Improvement over sapcli: we use adtUriToAbapGitPath() and an optional
 * repository resolver so JaCoCo package + sourcefile names reconstruct the
 * tracked abapGit path. GitLab can then match changed files for MR diff
 * annotations, while standard JaCoCo consumers retain the same path.
 */

import { existsSync, readdirSync, writeFileSync, type Dirent } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import {
  acoverageResult,
  acoverageStatements,
  type InferTypedSchema,
} from '@abapify/adt-schemas';
import { adtUriToAbapGitPath } from '@abapify/adt-plugin-abapgit';

type AcoverageResultSchema = InferTypedSchema<typeof acoverageResult>;
type AcoverageStatementsSchema = InferTypedSchema<typeof acoverageStatements>;

// ─── Counter mapping ──────────────────────────────────────────────────

const COUNTER_TYPE_MAPPING: Record<string, string> = {
  branch: 'BRANCH',
  procedure: 'METHOD',
  statement: 'INSTRUCTION',
};

// ─── Narrow, recursive views of the schema types ──────────────────────
//
// The generated types mark deep recursion as `unknown`; we cast once
// here so the rest of the formatter stays type-safe.

interface Coverage {
  type?: string;
  total?: number;
  executed?: number;
}

interface ObjectRef {
  uri?: string;
  type?: string;
  name?: string;
}

interface CoverageNode {
  objectReference?: ObjectRef;
  coverages?: { coverage?: Coverage[] };
  nodes?: { node?: CoverageNode[] };
}

interface StatementEntry {
  objectReference?: ObjectRef;
  executed?: number;
}

interface StatementResponse {
  name?: string;
  procedure?: StatementEntry[];
  statement?: StatementEntry[];
}

// ─── XML helpers ──────────────────────────────────────────────────────

function escapeAttr(s: string): string {
  return s
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
    .replaceAll(/"/g, '&quot;');
}

function indent(level: number): string {
  return '   '.repeat(level);
}

function toPosix(filePath: string): string {
  return sep === '/' ? filePath : filePath.split(sep).join('/');
}

function collectAbapSources(root: string): string[] {
  const sources: string[] = [];
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    let entries: Dirent[];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const candidate = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(candidate);
      else if (entry.isFile() && entry.name.endsWith('.abap')) {
        sources.push(candidate);
      }
    }
  }
  return sources;
}

export type CoverageSourcePathResolver = (
  reportedPath: string,
) => string | null;

/** Resolve an abapGit basename to a unique repository-relative source path. */
export function createAbapGitCoverageSourceResolver(
  sourceRoot = 'src',
  repositoryRoot = process.cwd(),
): CoverageSourcePathResolver {
  const absoluteSourceRoot = join(repositoryRoot, sourceRoot);
  const byBasename = new Map<string, string[]>();
  if (existsSync(absoluteSourceRoot)) {
    for (const source of collectAbapSources(absoluteSourceRoot)) {
      const name = basename(source);
      const matches = byBasename.get(name) ?? [];
      matches.push(toPosix(relative(repositoryRoot, source)));
      byBasename.set(name, matches);
    }
  }

  return (reportedPath: string): string | null => {
    const matches = byBasename.get(basename(reportedPath)) ?? [];
    if (matches.length > 1) {
      throw new Error(
        `Ambiguous ABAP coverage source ${basename(reportedPath)}: ${matches.join(', ')}`,
      );
    }
    return matches[0] ?? null;
  };
}

/**
 * Parse a `#start=L,C` fragment out of an ADT URI. Returns `null`
 * if the URI has no fragment or the fragment is not well-formed.
 */
function parseStartLine(uri: string | undefined): number | null {
  if (!uri) return null;
  const m = /#start=(\d+)/.exec(uri);
  return m ? Number.parseInt(m[1], 10) : null;
}

/**
 * For a given statement entry, return the start line encoded in its
 * `adtcore:uri` fragment (1-based). Returns `null` when unavailable.
 */
function statementLine(entry: StatementEntry): number | null {
  return parseStartLine(entry.objectReference?.uri);
}

// ─── Mapping: (class_name, method_name) → lines ───────────────────────

type MethodKey = string;

function methodKey(cls: string, method: string): MethodKey {
  return `${cls}.${method}`;
}

interface LineHit {
  line: number;
  covered: boolean;
}

function buildMethodLinesMapping(
  statements: AcoverageStatementsSchema | undefined,
): Map<MethodKey, LineHit[]> {
  const result = new Map<MethodKey, LineHit[]>();
  const responses: StatementResponse[] =
    (statements?.statementsBulkResponse
      ?.statementsResponse as unknown as StatementResponse[]) ?? [];

  for (const response of responses) {
    const parts = (response.name ?? '').split('.');
    if (parts.length < 2) continue;
    const methodName = parts.at(-1)!;
    const className = parts.at(-2)!;
    const key = methodKey(className, methodName);
    const bucket = result.get(key) ?? [];
    for (const stmt of response.statement ?? []) {
      const line = statementLine(stmt);
      if (line == null) continue;
      bucket.push({ line, covered: (stmt.executed ?? 0) > 0 });
    }
    result.set(key, bucket);
  }
  return result;
}

// ─── Emit <counter …/> rollups ────────────────────────────────────────

function emitCounters(
  node: CoverageNode,
  indentLevel: number,
  out: string[],
): void {
  for (const c of node.coverages?.coverage ?? []) {
    if (!c.type) continue;
    const jacocoType = COUNTER_TYPE_MAPPING[c.type];
    if (!jacocoType) continue;
    const total = c.total ?? 0;
    const executed = c.executed ?? 0;
    const missed = Math.max(0, total - executed);
    out.push(
      `${indent(indentLevel)}<counter type="${jacocoType}" missed="${missed}" covered="${executed}"/>`,
    );
  }
}

// ─── Emit <class>, <sourcefile> ───────────────────────────────────────

function sourcefilePathFor(
  ref: ObjectRef | undefined,
  resolver: CoverageSourcePathResolver | undefined,
): string {
  const uri = ref?.uri;
  const abapgit = uri ? adtUriToAbapGitPath(uri) : null;
  if (abapgit) {
    return resolver?.(abapgit) ?? abapgit;
  }
  // Fallback: raw name
  return (ref?.name ?? 'UNKNOWN').toLowerCase();
}

function emitClass(
  classNode: CoverageNode,
  sourcePath: string,
  lineMap: Map<MethodKey, LineHit[]>,
  indentLevel: number,
  out: string[],
): void {
  const ref = classNode.objectReference;
  const className = ref?.name ?? 'UNKNOWN';
  const sourcefile = basename(sourcePath);

  out.push(
    `${indent(indentLevel)}<class name="${escapeAttr(className)}" sourcefilename="${escapeAttr(sourcefile)}">`,
  );

  const classLines: LineHit[] = [];
  const methods = classNode.nodes?.node ?? [];

  for (const method of methods) {
    const methodRef = method.objectReference;
    const methodName = methodRef?.name ?? 'UNKNOWN';
    const line = parseStartLine(methodRef?.uri) ?? 0;

    out.push(
      `${indent(indentLevel + 1)}<method name="${escapeAttr(methodName)}" desc="" line="${line}">`,
    );
    emitCounters(method, indentLevel + 2, out);
    out.push(`${indent(indentLevel + 1)}</method>`);

    // Gather line data
    const key = methodKey(className, methodName);
    const hits = lineMap.get(key);
    if (hits) classLines.push(...hits);
  }

  emitCounters(classNode, indentLevel + 1, out);
  out.push(`${indent(indentLevel)}</class>`);

  if (classLines.length > 0) {
    out.push(
      `${indent(indentLevel)}<sourcefile name="${escapeAttr(sourcefile)}">`,
    );
    for (const { line, covered } of classLines) {
      const ci = covered ? 1 : 0;
      const mi = covered ? 0 : 1;
      out.push(
        `${indent(indentLevel + 1)}<line nr="${line}" mi="${mi}" ci="${ci}" mb="0" cb="0"/>`,
      );
    }
    out.push(`${indent(indentLevel)}</sourcefile>`);
  }
}

// ─── Emit <package> ───────────────────────────────────────────────────

function emitPackage(
  packageNode: CoverageNode,
  lineMap: Map<MethodKey, LineHit[]>,
  resolver: CoverageSourcePathResolver | undefined,
  indentLevel: number,
  out: string[],
): void {
  const classNodes = packageNode.nodes?.node ?? [];
  const byDirectory = new Map<
    string,
    Array<{ node: CoverageNode; sourcePath: string }>
  >();
  for (const node of classNodes) {
    const sourcePath = sourcefilePathFor(node.objectReference, resolver);
    const directory = dirname(sourcePath);
    const group = byDirectory.get(directory) ?? [];
    group.push({ node, sourcePath });
    byDirectory.set(directory, group);
  }

  for (const [directory, classes] of byDirectory) {
    out.push(`${indent(indentLevel)}<package name="${escapeAttr(directory)}">`);
    for (const { node, sourcePath } of classes) {
      emitClass(node, sourcePath, lineMap, indentLevel + 1, out);
    }
    // Repository-path resolution can split one SAP package across multiple
    // JaCoCo packages. Roll up the class nodes actually emitted in this
    // directory so each package counter remains consistent with its children.
    for (const counterType of Object.keys(COUNTER_TYPE_MAPPING)) {
      let total = 0;
      let executed = 0;
      for (const { node } of classes) {
        const counter = node.coverages?.coverage?.find(
          (coverage) => coverage.type === counterType,
        );
        total += counter?.total ?? 0;
        executed += counter?.executed ?? 0;
      }
      if (total === 0 && executed === 0) continue;
      out.push(
        `${indent(indentLevel + 1)}<counter type="${COUNTER_TYPE_MAPPING[counterType]}" missed="${Math.max(0, total - executed)}" covered="${executed}"/>`,
      );
    }
    out.push(`${indent(indentLevel)}</package>`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────

export interface JacocoInput {
  measurements: AcoverageResultSchema;
  statements?: AcoverageStatementsSchema;
  reportName?: string;
  sourcePathResolver?: CoverageSourcePathResolver;
}

export function toJacocoXml(input: JacocoInput): string {
  const root = input.measurements?.result;
  const lineMap = buildMethodLinesMapping(input.statements);
  const out: string[] = [];

  out.push(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
    `<report name="${escapeAttr(input.reportName ?? 'ABAP Coverage')}">`,
  );

  if (root) {
    const packages = (root.nodes?.node as unknown as CoverageNode[]) ?? [];
    for (const pkg of packages) {
      emitPackage(pkg, lineMap, input.sourcePathResolver, 1, out);
    }
    emitCounters(root as unknown as CoverageNode, 1, out);
  }

  out.push('</report>');
  return out.join('\n');
}

export function outputJacocoReport(input: JacocoInput, filePath: string): void {
  writeFileSync(filePath, toJacocoXml(input), 'utf-8');
}

// ─── Alt: Sonar Generic Coverage format ───────────────────────────────
//
// Simpler line-based format:
//   <coverage version="1">
//     <file path="src/zcl_foo.clas.abap">
//       <lineToCover lineNumber="42" covered="true"/>
//     </file>
//   </coverage>

export function toSonarGenericCoverageXml(input: JacocoInput): string {
  const lineMap = buildMethodLinesMapping(input.statements);
  const root = input.measurements?.result;

  // Build file → lines map by walking measurements tree for class refs,
  // then looking up lines via their method keys.
  const fileLines = new Map<string, LineHit[]>();

  function walk(node: CoverageNode): void {
    const ref = node.objectReference;
    if (ref?.uri && ref.type?.startsWith('CLAS')) {
      const reportedPath = adtUriToAbapGitPath(ref.uri);
      const filePath = reportedPath
        ? (input.sourcePathResolver?.(reportedPath) ?? reportedPath)
        : null;
      if (filePath) {
        const className = ref.name ?? '';
        const methods = node.nodes?.node ?? [];
        for (const m of methods) {
          const methodName = m.objectReference?.name ?? '';
          const lines = lineMap.get(methodKey(className, methodName)) ?? [];
          const bucket = fileLines.get(filePath) ?? [];
          bucket.push(...lines);
          fileLines.set(filePath, bucket);
        }
      }
    }
    for (const child of node.nodes?.node ?? []) walk(child);
  }
  if (root) walk(root as unknown as CoverageNode);

  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>', '<coverage version="1">');
  for (const [file, lines] of fileLines) {
    if (lines.length === 0) continue;
    out.push(`  <file path="${escapeAttr(file)}">`);
    for (const { line, covered } of lines) {
      out.push(
        `    <lineToCover lineNumber="${line}" covered="${covered ? 'true' : 'false'}"/>`,
      );
    }
    out.push('  </file>');
  }
  out.push('</coverage>');
  return out.join('\n');
}

export function outputSonarGenericCoverageReport(
  input: JacocoInput,
  filePath: string,
): void {
  writeFileSync(filePath, toSonarGenericCoverageXml(input), 'utf-8');
}
