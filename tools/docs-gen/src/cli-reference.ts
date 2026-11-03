import type { Argument, Command, Option } from 'commander';
import { createCLI } from '@abapify/adt-cli';
import {
  code,
  escapeCell,
  escapeText,
  frontmatter,
  generatedNote,
  summary,
  table,
} from './markdown';

type CliCommandPlugin = NonNullable<
  NonNullable<Parameters<typeof createCLI>[0]>['preloadedPlugins']
>[number];

/** First-party command plugins documented alongside the core commands. */
const PLUGIN_MODULES = [
  '@abapify/adt-atc/commands/atc',
  '@abapify/adt-aunit/commands/aunit',
  '@abapify/adt-codegen/commands/codegen',
  '@abapify/adt-diff/commands/diff',
  '@abapify/adt-export/commands/export',
  '@abapify/adt-export/commands/roundtrip',
  '@abapify/adt-export/commands/activate',
  '@abapify/adt-flow/commands/flow',
];

const NOTE = generatedNote('the Commander command tree');

/** Plugins statically embedded in the `@abapify/adt` bundle (adt-all.ts). */
const BUNDLED_PLUGINS = new Set(['atc', 'codegen', 'diff', 'export', 'flow']);

function pluginNote(cmdName: string, plugins: CliCommandPlugin[]): string {
  const plugin = plugins.find((p) => p.name === cmdName);
  if (!plugin) return '';
  const pkg =
    PLUGIN_MODULES.find((s) => s.endsWith(`/commands/${cmdName}`))?.split(
      '/commands/',
    )[0] ?? '@abapify/adt-cli';
  const bundled = BUNDLED_PLUGINS.has(cmdName);
  const how = bundled
    ? 'included in the `@abapify/adt` bundle; in a regular `adt-cli` install enable it via the `commands` array in `adt.config.ts`'
    : 'not included in the `@abapify/adt` bundle — enable it via the `commands` array in `adt.config.ts`';
  return `_Provided by the \`${pkg}\` command plugin (${how})._`;
}

export interface CliPage {
  /** Doc id relative to `website/docs`, e.g. `cli/reference/auth`. */
  id: string;
  content: string;
}

function isHidden(cmd: Command): boolean {
  return Boolean((cmd as unknown as { _hidden?: boolean })._hidden);
}

function visibleCommands(cmd: Command): Command[] {
  return cmd.commands.filter((c) => !isHidden(c));
}

function formatDefault(value: unknown): string {
  if (value === undefined) return '';
  return code(typeof value === 'string' ? value : JSON.stringify(value));
}

function argumentRows(args: readonly Argument[]): string[][] {
  return args.map((a) => [
    code(
      `${a.required ? '<' : '['}${a.name()}${a.variadic ? '...' : ''}${a.required ? '>' : ']'}`,
    ),
    escapeCell(
      [a.description, a.argChoices && `One of: ${a.argChoices.join(', ')}.`]
        .filter(Boolean)
        .join(' '),
    ),
    formatDefault(a.defaultValue),
  ]);
}

function optionRows(options: readonly Option[]): string[][] {
  return options
    .filter((o) => !o.hidden)
    .map((o) => [
      code(o.flags),
      escapeCell(
        [
          o.description,
          o.argChoices && `One of: ${o.argChoices.join(', ')}.`,
          o.mandatory && '(required)',
        ]
          .filter(Boolean)
          .join(' '),
      ),
      formatDefault(o.defaultValue),
    ]);
}

function renderCommand(cmd: Command, path: string[], level: number): string[] {
  const full = ['adt', ...path].join(' ');
  const out: string[] = [`${'#'.repeat(level)} \`${full}\``];
  const description = cmd.description();
  if (description) out.push(escapeText(description));
  if (cmd.aliases().length > 0) {
    out.push(`Aliases: ${cmd.aliases().map(code).join(', ')}`);
  }
  out.push('```bash\n' + `${full} ${cmd.usage()}`.trim() + '\n```');

  const args = argumentRows(cmd.registeredArguments);
  if (args.length > 0) {
    out.push(
      '**Arguments**',
      table(['Argument', 'Description', 'Default'], args),
    );
  }
  const opts = optionRows(cmd.options);
  if (opts.length > 0) {
    out.push('**Options**', table(['Option', 'Description', 'Default'], opts));
  }
  const children = visibleCommands(cmd);
  if (children.length > 0) {
    out.push(
      '**Subcommands**',
      table(
        ['Command', 'Description'],
        children.map((c) => [
          code(`${full} ${c.name()}`),
          escapeCell(summary(c.description())),
        ]),
      ),
    );
    for (const child of children) {
      out.push(
        ...renderCommand(
          child,
          [...path, child.name()],
          Math.min(level + 1, 6),
        ),
      );
    }
  }
  return out;
}

async function loadPlugins(): Promise<CliCommandPlugin[]> {
  const plugins: CliCommandPlugin[] = [];
  for (const spec of PLUGIN_MODULES) {
    const mod = (await import(spec)) as { default: CliCommandPlugin };
    plugins.push(mod.default);
  }
  return plugins;
}

export async function generateCliPages(): Promise<CliPage[]> {
  const plugins = await loadPlugins();
  const program = await createCLI({ preloadedPlugins: plugins });
  const commands = visibleCommands(program).sort((a, b) =>
    a.name().localeCompare(b.name()),
  );

  const pages: CliPage[] = commands.map((cmd) => ({
    id: `cli/reference/${cmd.name()}`,
    content: [
      frontmatter({
        title: `adt ${cmd.name()}`,
        sidebar_label: cmd.name(),
        description: summary(cmd.description()) || `adt ${cmd.name()}`,
      }),
      NOTE,
      pluginNote(cmd.name(), plugins),
      ...renderCommand(cmd, [cmd.name()], 1),
      'Global options (`--sid`, `--config`, `--verbose`, …) are accepted by every command — see the [command reference index](./index.md#global-options).',
    ]
      .filter(Boolean)
      .join('\n\n'),
  }));

  pages.unshift({
    id: 'cli/reference/index',
    content: [
      frontmatter({
        title: 'Command reference',
        sidebar_label: 'Command reference',
        description:
          'Every adt command, argument and option, generated from the CLI itself.',
      }),
      NOTE,
      '# Command reference',
      'This reference is generated from the `adt` command tree, including the first-party command plugins (ATC, AUnit, codegen, diff, export, flow). It always matches the released CLI; run `adt <command> --help` for the same information in your terminal.',
      '## Global options',
      'Accepted by every command, anywhere on the command line.',
      table(['Option', 'Description', 'Default'], optionRows(program.options)),
      '## Commands',
      table(
        ['Command', 'Description'],
        commands.map((c) => [
          `[${code(`adt ${c.name()}`)}](./${c.name()}.md)`,
          escapeCell(summary(c.description())),
        ]),
      ),
    ].join('\n\n'),
  });

  return pages;
}
