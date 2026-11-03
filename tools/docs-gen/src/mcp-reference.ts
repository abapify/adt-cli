import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { registerTools } from '@abapify/adt-mcp';
import { z } from 'zod';
import {
  code,
  escapeCell,
  escapeText,
  frontmatter,
  generatedNote,
  summary,
  table,
} from './markdown';

const GITHUB_BLOB = 'https://github.com/abapify/adt-cli/blob/main/';

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
  annotations?: Record<string, unknown>;
}

interface JsonSchema {
  type?: string | string[];
  description?: string;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
}

export interface McpPage {
  id: string;
  name: string;
  /** Builds the page; `existing` is the current file content, if any. */
  render(existing: string | undefined): string;
}

function isZodSchema(value: unknown): boolean {
  return typeof value === 'object' && value !== null && '_zod' in value;
}

function isRawShape(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !isZodSchema(value) &&
    Object.values(value).every(isZodSchema)
  );
}

/** Splits the `McpServer.tool(name, [description], [shape], [annotations], cb)` overloads. */
function parseToolArgs(name: string, rest: unknown[]): ToolInfo {
  const args = rest.slice(0, -1);
  const info: ToolInfo = { name };
  if (typeof args[0] === 'string') info.description = args.shift() as string;
  if (isRawShape(args[0]) || isZodSchema(args[0]))
    info.inputSchema = args.shift();
  if (typeof args[0] === 'object' && args[0] !== null) {
    info.annotations = args.shift() as Record<string, unknown>;
  }
  return info;
}

/** Registers every tool against a recording stand-in for `McpServer`. */
function collectTools(): ToolInfo[] {
  const tools: ToolInfo[] = [];
  const recorder = {
    tool: (name: string, ...rest: unknown[]) => {
      tools.push(parseToolArgs(name, rest));
    },
    registerTool: (name: string, config: Omit<ToolInfo, 'name'>) => {
      tools.push({ name, ...config });
    },
  };
  const server = new Proxy(recorder, {
    get: (target, prop) =>
      prop in target ? target[prop as keyof typeof target] : () => undefined,
  });
  registerTools(
    server as unknown as Parameters<typeof registerTools>[0],
    {} as Parameters<typeof registerTools>[1],
  );
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}

function toJsonSchema(input: unknown): JsonSchema {
  if (input === undefined) return {};
  const schema = isZodSchema(input)
    ? (input as z.ZodType)
    : z.object(input as z.ZodRawShape);
  return z.toJSONSchema(schema, {
    io: 'input',
    unrepresentable: 'any',
  }) as JsonSchema;
}

type ZodDef = { type?: string; innerType?: unknown };

function zodDef(value: unknown): ZodDef | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  return '_zod' in value
    ? (value as { _zod: { def: ZodDef } })._zod.def
    : undefined;
}

/** True when a Zod field resolves to `z.never()` through optional wrappers. */
function isNeverSchema(value: unknown): boolean {
  for (let def = zodDef(value); def; def = zodDef(def.innerType)) {
    if (def.type === 'never') return true;
  }
  return false;
}

/** Field names the schema rejects outright (`z.never()`); documented nowhere. */
function forbiddenKeys(input: unknown): Set<string> {
  const shape = isZodSchema(input)
    ? ((input as { shape?: z.ZodRawShape }).shape ?? {})
    : ((input as z.ZodRawShape | undefined) ?? {});
  const out = new Set<string>();
  for (const [key, field] of Object.entries(shape)) {
    if (isNeverSchema(field)) out.add(key);
  }
  return out;
}

function arrayLabel(s: JsonSchema): string {
  const item = s.items ? typeLabel(s.items) : 'unknown';
  return item.includes(' | ') ? `(${item})[]` : `${item}[]`;
}

function typeLabel(s: JsonSchema): string {
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (s.const !== undefined) return JSON.stringify(s.const);
  const union = s.anyOf ?? s.oneOf;
  if (union) return union.map(typeLabel).join(' | ');
  if (s.type === 'array') return arrayLabel(s);
  return Array.isArray(s.type) ? s.type.join(' | ') : (s.type ?? 'unknown');
}

function parameterRow(
  name: string,
  prop: JsonSchema,
  required: boolean,
): string[] {
  const notes = [prop.description];
  if (prop.default !== undefined) {
    notes.push(`Default: \`${JSON.stringify(prop.default)}\`.`);
  }
  return [
    code(name),
    code(typeLabel(prop)),
    required ? 'yes' : 'no',
    escapeCell(notes.filter(Boolean).join(' ')),
  ];
}

/** Rows for nested object fields (`a.b`) and array item fields (`a[].b`). */
function nestedRows(prop: JsonSchema, name: string, depth: number): string[][] {
  if (depth >= 2) return [];
  const own = prop.properties ? parameterRows(prop, `${name}.`, depth + 1) : [];
  const items = prop.items?.properties
    ? parameterRows(prop.items, `${name}[].`, depth + 1)
    : [];
  const variants = prop.anyOf ?? prop.oneOf ?? [];
  const union = variants.flatMap((v) =>
    parameterRows(v, `${name}.`, depth + 1),
  );
  return [...own, ...items, ...union];
}

function parameterRows(schema: JsonSchema, prefix = '', depth = 0): string[][] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties ?? {}).flatMap(([key, prop]) => {
    const name = `${prefix}${key}`;
    return [
      parameterRow(name, prop, required.has(key)),
      ...nestedRows(prop, name, depth),
    ];
  });
}

function listSources(dir: string): string[] {
  return readdirSync(dir)
    .sort()
    .flatMap((n) => {
      const full = join(dir, n);
      if (statSync(full).isDirectory()) return listSources(full);
      return n.endsWith('.ts') && !n.endsWith('.test.ts') ? [full] : [];
    });
}

function findSource(
  name: string,
  sources: Map<string, string>,
): string | undefined {
  const quoted = ["'", '"', '`'].map((q) => `${q}${name}${q}`);
  const matches = [...sources].filter(([, text]) =>
    quoted.some((literal) => text.includes(literal)),
  );
  const preferred = matches.find(
    ([file]) => basename(file, '.ts') === name.replace(/_/g, '-'),
  );
  return (preferred ?? matches[0])?.[0];
}

const DEFAULT_TAIL = [
  '## Output',
  'The tool returns a single text content item whose body is JSON (`content[0].text`). On error, the response has `isError: true` and a human-readable message.',
  '## See also',
  '- [MCP overview](../overview.md)',
].join('\n\n');

const INPUT_SCHEMA_HEADING = /^## Input schema\s*$/;

/** Hand-written sections (everything after "Input schema") are preserved. */
function handwrittenTail(existing: string | undefined): string {
  if (existing === undefined) return DEFAULT_TAIL;
  const lines = existing.split('\n');
  const schemaAt = lines.findIndex((l) => INPUT_SCHEMA_HEADING.test(l));
  // No generated anchor — nothing safe to preserve, regenerate the stub.
  if (schemaAt === -1) return DEFAULT_TAIL;
  const tailAt = lines.findIndex(
    (l, i) => i > schemaAt && /^## /.test(l) && !INPUT_SCHEMA_HEADING.test(l),
  );
  return tailAt === -1 ? DEFAULT_TAIL : lines.slice(tailAt).join('\n').trim();
}

function sourceLine(rootDir: string, source: string | undefined): string {
  if (!source || !existsSync(source)) return '';
  const rel = relative(rootDir, source);
  return `Defined in [\`${rel}\`](${GITHUB_BLOB}${rel}).`;
}

const DESTINATION_MODE_NOTE =
  '_In destination mode every call additionally requires a `destination` key ' +
  'and rejects the connection fields (`baseUrl`, `client`, `username`, ' +
  '`password`, `systemId`)._';

function inputSchemaSection(tool: ToolInfo): string {
  const jsonSchema = toJsonSchema(tool.inputSchema);
  const forbidden = forbiddenKeys(tool.inputSchema);
  if (forbidden.size > 0 && jsonSchema.properties) {
    jsonSchema.properties = Object.fromEntries(
      Object.entries(jsonSchema.properties).filter(
        ([key]) => !forbidden.has(key),
      ),
    );
  }
  const rows = parameterRows(jsonSchema);
  const body =
    rows.length > 0
      ? table(['Parameter', 'Type', 'Required', 'Description'], rows)
      : 'This tool takes no arguments.';
  return `## Input schema\n\n${body}\n\n${DESTINATION_MODE_NOTE}`;
}

function annotationsSection(tool: ToolInfo): string {
  const entries = Object.entries(tool.annotations ?? {});
  if (entries.length === 0) return '';
  const list = entries
    .map(([k, v]) => `- ${code(k)}: ${code(JSON.stringify(v))}`)
    .join('\n');
  return `**Annotations**\n\n${list}`;
}

export function generateMcpPages(rootDir: string): McpPage[] {
  const toolsDir = join(rootDir, 'packages/adt-mcp/src/lib/tools');
  const sources = new Map(
    listSources(toolsDir).map((f) => [f, readFileSync(f, 'utf8')]),
  );
  const note = generatedNote(
    'the MCP tool registry; sections below "Input schema" are hand-written',
  );

  return collectTools().map((tool) => ({
    id: `mcp/tools/${tool.name}`,
    name: tool.name,
    render: (existing) => {
      const description = tool.description?.trim() ?? '';
      return [
        frontmatter({
          title: tool.name,
          sidebar_label: tool.name,
          description: summary(description) || tool.name,
        }),
        note,
        `# \`${tool.name}\``,
        escapeText(description),
        sourceLine(rootDir, findSource(tool.name, sources)),
        inputSchemaSection(tool),
        annotationsSection(tool),
        handwrittenTail(existing),
      ]
        .filter(Boolean)
        .join('\n\n');
    },
  }));
}
