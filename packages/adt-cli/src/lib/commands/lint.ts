import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import {
  lintAndFix,
  lintSource,
  listRules,
  type LintOptions,
} from '@abapify/adt-lint';

function stripJsonComments(text: string): string {
  return text.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([\]}])/g, '$1');
}

async function loadRuleOverrides(
  configPath?: string,
): Promise<Record<string, unknown> | undefined> {
  if (!configPath) return undefined;
  const raw = await readFile(configPath, 'utf8');
  try {
    const cleaned = stripTrailingCommas(stripJsonComments(raw));
    const parsed = JSON.parse(cleaned) as { rules?: Record<string, unknown> };
    return parsed.rules;
  } catch (e) {
    throw new Error(
      `Invalid JSON/JSONC in ${configPath}: ${e instanceof Error ? e.message : String(e)}`,
      { cause: e },
    );
  }
}

export const lintCommand = new Command('lint')
  .description('Lint ABAP source locally via @abaplint/core')
  .argument('[file]', 'ABAP source file path')
  .option('--source <source>', 'Inline ABAP source instead of file input')
  .option('--json', 'Output as JSON')
  .option('--fix', 'Apply auto-fixes and print fixed source')
  .option('--list-rules', 'List available abaplint rules')
  .option('--preset <preset>', 'Lint preset: btp|onpremise', 'onpremise')
  .option('--config <path>', 'Optional path to abaplint.json-like config')
  .action(
    async (
      file: string | undefined,
      options: {
        source?: string;
        json?: boolean;
        fix?: boolean;
        listRules?: boolean;
        preset?: 'btp' | 'onpremise';
        config?: string;
      },
    ) => {
      try {
        const lintOptions: LintOptions = {
          filename: file,
          systemType: options.preset,
          ruleOverrides: await loadRuleOverrides(options.config),
        };

        if (options.listRules) {
          const rules = listRules(lintOptions);
          if (options.json) {
            console.log(JSON.stringify({ rules }, null, 2));
          } else {
            for (const rule of rules) {
              console.log(`${rule.enabled ? '✓' : ' '} ${rule.key}`);
            }
          }
          return;
        }

        const source =
          options.source ?? (file ? await readFile(file, 'utf8') : undefined);

        if (!source) {
          console.error('❌ Provide either <file> or --source');
          process.exit(1);
        }

        if (options.fix) {
          const result = lintAndFix(source, lintOptions);
          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            process.stdout.write(result.source);
            if (result.remaining.length > 0) {
              console.error(
                `\n⚠️ Remaining issues: ${result.remaining.length}`,
              );
            }
          }

          if (result.remaining.some((issue) => issue.severity === 'error')) {
            process.exit(1);
          }
          return;
        }

        const issues = lintSource(source, lintOptions);

        if (options.json) {
          console.log(JSON.stringify({ issues }, null, 2));
        } else if (issues.length === 0) {
          console.log('✅ No lint issues');
        } else {
          for (const issue of issues) {
            console.log(
              `${issue.severity.toUpperCase()} ${issue.filename}:${issue.start.line}:${issue.start.column} ${issue.key} ${issue.message}`,
            );
          }
        }

        if (issues.some((issue) => issue.severity === 'error')) {
          process.exit(1);
        }
      } catch (error) {
        console.error(
          '❌ Lint failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
