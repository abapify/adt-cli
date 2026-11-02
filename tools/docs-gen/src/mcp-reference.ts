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

/** Registers every tool against a recording stand-in for `McpServer`. */
function collectTools(): ToolInfo[] {
  const tools: ToolInfo[] = [];
  const recorder = {
    tool(name: string, ...rest: unknown[]) {
      const args = rest.slice(0, -1);
      const info: ToolInfo = { name };
      if (typeof args[0] === 'string')
        info.description = args.shift() as string;
      if (isRawShape(args[0])) info.inputSchema = args.shift();
      if (typeof args[0] === 'object' && args[0] !== null) {
        info.annotations = args.shift() as Record<string, unknown>;
      }
      tools.push(info);
    },
    registerTool(name: string, config: Omit<ToolInfo, 'name'>) {
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

function typeLabel(s: JsonSchema): string {
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (s.const !== undefined) return JSON.stringify(s.const);
  const union = s.anyOf ?? s.oneOf;
  if (union) return union.map(typeLabel).join(' | ');
  if (s.type === 'array') {
    const item = s.items ? typeLabel(s.items) : 'unknown';
    return item.includes(' | ') ? `(${item})[]` : `${item}[]`;
  }
  if (Array.isArray(s.type)) return s.type.join(' | ');
  return s.type ?? 'unknown';
}

function parameterRows(schema: JsonSchema, prefix = '', depth = 0): string[][] {
  const rows: string[][] = [];
  const required = new Set(schema.required ?? []);
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const name = `${prefix}${key}`;
    const notes = [
      prop.description,
      prop.default !== undefined &&
        `Default: \`${JSON.stringify(prop.default)}\`.`,
    ].filter(Boolean);
    rows.push([
      code(name),
      code(typeLabel(prop)),
      required.has(key) ? 'yes' : 'no',
      escapeCell(notes.join(' ')),
    ]);
    if (depth < 2) {
      if (prop.properties)
        rows.push(...parameterRows(prop, `${name}.`, depth + 1));
      if (prop.items?.properties) {
        rows.push(...parameterRows(prop.items, `${name}[].`, depth + 1));
      }
    }
  }
  return rows;
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
  const quoted = new RegExp(`['"\`]${name}['"\`]`);
  const matches = [...sources].filter(([, text]) => quoted.test(text));
  const preferred = matches.find(
    ([file]) => basename(file, '.ts') === name.replace(/_/g, '-'),
  );
  return (preferred ?? matches[0])?.[0];
}

/** Hand-written sections (everything after "Input schema") are preserved. */
function handwrittenTail(existing: string | undefined): string {
  if (existing === undefined) {
    return [
      '## Output',
      'The tool returns a single text content item whose body is JSON (`content[0].text`). On error, the response has `isError: true` and a human-readable message.',
      '## See also',
      '- [MCP overview](../overview.md)',
    ].join('\n\n');
  }
  const lines = existing.split('\n');
  const schemaAt = lines.findIndex((l) => /^## Input schema\s*$/.test(l));
  const tailAt = lines.findIndex(
    (l, i) => i > schemaAt && /^## /.test(l) && !/^## Input schema\s*$/.test(l),
  );
  return tailAt === -1 ? '' : lines.slice(tailAt).join('\n').trim();
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
    render(existing) {
      const description = tool.description?.trim() ?? '';
      const source = findSource(tool.name, sources);
      const rows = parameterRows(toJsonSchema(tool.inputSchema));
      const annotations = Object.entries(tool.annotations ?? {});
      const sourceRel = source && relative(rootDir, source);
      return [
        frontmatter({
          title: tool.name,
          sidebar_label: tool.name,
          description: summary(description) || tool.name,
        }),
        note,
        `# \`${tool.name}\``,
        description && escapeText(description),
        sourceRel &&
          existsSync(source) &&
          `Defined in [\`${sourceRel}\`](${GITHUB_BLOB}${sourceRel}).`,
        '## Input schema',
        rows.length > 0
          ? table(['Parameter', 'Type', 'Required', 'Description'], rows)
          : 'This tool takes no arguments.',
        annotations.length > 0 &&
          [
            '**Annotations**',
            annotations
              .map(([k, v]) => `- ${code(k)}: ${code(JSON.stringify(v))}`)
              .join('\n'),
          ].join('\n\n'),
        handwrittenTail(existing),
      ]
        .filter(Boolean)
        .join('\n\n');
    },
  }));
}
