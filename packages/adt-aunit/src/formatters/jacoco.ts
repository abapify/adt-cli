/**
 * JaCoCo XML coverage report formatter.
 *
 * Consumes parsed coverage data from the adt-contracts runtime endpoints:
 *
 *   measurements: client.adt.runtime.traces.coverage.measurements.post(id)
 *                 → AcoverageResultSchema  (tree of DEVC → CLAS → methods)
 *   statements:   client.adt.runtime.traces.coverage.statements.get(id)
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
 * Improvement over sapcli: we use adtUriToAbapGitPath() so the
 * <sourcefile name=…> matches the on-disk abapGit filename (e.g.
 * `cl_foo.clas.abap`), making the report directly consumable by
 * SonarQube.
 */

import { writeFileSync } from 'node:fs';
import type {
  AcoverageResultSchema,
  AcoverageStatementsSchema,
} from '@abapify/adt-schemas';
import { adtUriToAbapGitPath } from '@abapify/adt-plugin-abapgit';

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

type CoverageResultRoot = AcoverageResultSchema['result'];

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
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function indent(level: number): string {
  return '   '.repeat(level);
}

/**
 * Parse a `#start=L,C` fragment out of an ADT URI. Returns `null`
 * if the URI has no fragment or the fragment is not well-formed.
 */
function parseStartLine(uri: string | undefined): number | null {
  if (!uri) return null;
  const m = uri.match(/#start=(\d+)/);
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
    const methodName = parts[parts.length - 1];
    const className = parts[parts.length - 2];
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

function sourcefileNameFor(ref: ObjectRef | undefined): string {
  const uri = ref?.uri;
  const abapgit = uri ? adtUriToAbapGitPath(uri) : null;
  if (abapgit) {
    // Strip the leading `src/` since JaCoCo `name` is the bare filename;
    // full path can still be reconstructed by consumers.
    return abapgit.replace(/^src\//, '');
  }
  // Fallback: raw name
  return (ref?.name ?? 'UNKNOWN').toLowerCase();
}

function emitClass(
  classNode: CoverageNode,
  lineMap: Map<MethodKey, LineHit[]>,
  indentLevel: number,
  out: string[],
): void {
  const ref = classNode.objectReference;
  const className = ref?.name ?? 'UNKNOWN';
  const sourcefile = sourcefileNameFor(ref);

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
  indentLevel: number,
  out: string[],
): void {
  const packageName = packageNode.objectReference?.name ?? 'UNKNOWN';
  out.push(`${indent(indentLevel)}<package name="${escapeAttr(packageName)}">`);
  const classNodes = packageNode.nodes?.node ?? [];
  for (const classNode of classNodes) {
    emitClass(classNode, lineMap, indentLevel + 1, out);
  }
  emitCounters(packageNode, indentLevel + 1, out);
  out.push(`${indent(indentLevel)}</package>`);
}

// ─── Public API ───────────────────────────────────────────────────────

export interface JacocoInput {
  measurements: AcoverageResultSchema;
  statements?: AcoverageStatementsSchema;
  reportName?: string;
}

export function toJacocoXml(input: JacocoInput): string {
  const root = (input.measurements?.result ?? undefined) as
    | CoverageResultRoot
    | undefined;
  const lineMap = buildMethodLinesMapping(input.statements);
  const out: string[] = [];

  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  out.push(
    '<!DOCTYPE report PUBLIC "-//JACOCO//DTD Report 1.1//EN" "report.dtd">',
  );
  out.push(
    `<report name="${escapeAttr(input.reportName ?? 'ABAP Coverage')}">`,
  );

  if (root) {
    const packages = ((root.nodes?.node as unknown as CoverageNode[]) ??
      []) as CoverageNode[];
    for (const pkg of packages) {
      emitPackage(pkg, lineMap, 1, out);
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
  const root = input.measurements?.result as CoverageResultRoot | undefined;

  // Build file → lines map by walking measurements tree for class refs,
  // then looking up lines via their method keys.
  const fileLines = new Map<string, LineHit[]>();

  function walk(node: CoverageNode): void {
    const ref = node.objectReference;
    if (ref?.uri && ref.type?.startsWith('CLAS')) {
      const filePath = adtUriToAbapGitPath(ref.uri);
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
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push('<coverage version="1">');
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
