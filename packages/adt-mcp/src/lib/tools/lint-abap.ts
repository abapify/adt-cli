import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  lintAndFix,
  lintSource,
  listRules,
  type LintOptions,
} from '@abapify/adt-lint';
import type { ToolContext } from '../types';
import { sessionOrConnectionShape } from './shared-schemas';

export function registerLintAbapTool(
  server: McpServer,
  _ctx: ToolContext,
): void {
  server.tool(
    'lint_abap',
    'Run local ABAP lint checks using @abaplint/core. Supports lint, lint_and_fix, and list_rules.',
    {
      ...sessionOrConnectionShape,
      action: z.enum(['lint', 'lint_and_fix', 'list_rules']).default('lint'),
      source: z.string().optional().describe('ABAP source code to lint'),
      objectName: z
        .string()
        .optional()
        .describe('Optional object name used for issue filename context'),
      lintPreset: z
        .enum(['btp', 'onpremise'])
        .optional()
        .describe('Lint preset to apply (defaults to onpremise)'),
      ruleOverrides: z
        .record(z.unknown())
        .optional()
        .describe('Optional per-rule override config passed to abaplint'),
    },
    async (args) => {
      try {
        const options: LintOptions = {
          filename: args.objectName
            ? `${args.objectName.toLowerCase()}.abap`
            : undefined,
          systemType: args.lintPreset,
          ruleOverrides: args.ruleOverrides,
        };

        if (args.action === 'list_rules') {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ rules: listRules(options) }, null, 2),
              },
            ],
          };
        }

        if (!args.source) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'source is required for lint and lint_and_fix actions',
              },
            ],
          };
        }

        if (args.action === 'lint_and_fix') {
          const result = lintAndFix(args.source, options);
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  issues: lintSource(args.source, options),
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Lint ABAP failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  );
}
