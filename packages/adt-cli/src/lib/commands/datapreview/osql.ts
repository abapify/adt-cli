/**
 * adt datapreview osql "<statement>" - Execute ABAP Open SQL queries
 *
 * Uses the ADT data preview freestyle endpoint to execute ABAP SQL SELECT
 * statements and display results in a human-readable table or JSON format.
 *
 * Mirrors sapcli's `datapreview osql` command.
 *
 * Usage:
 *   adt datapreview osql "SELECT * FROM T001 UP TO 10 ROWS"
 *   adt datapreview osql "SELECT MANDT, BUKRS FROM T001" --output json
 *   adt datapreview osql "SELECT * FROM MARA" --rows 5 --noheadings
 *   adt datapreview osql "SELECT SYSID FROM T000" --noaging
 *
 * ADT endpoint: POST /sap/bc/adt/datapreview/freestyle?rowCount=<n>&outputFormat=json
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getAdtClientV2 } from '../../utils/adt-client-v2';

type OsqlResultColumn = {
  name: string;
  isKey: boolean;
  type: string;
  description: string;
};

type OsqlResultRow = Record<string, string | null>;

type OsqlResult = {
  columns: OsqlResultColumn[];
  rows: OsqlResultRow[];
};

function parseAdtDataPreviewResponse(raw: unknown): OsqlResult {
  // ADT returns: { columns: [...], rows: [...] }
  // Each column: { name, isKey, type, description }
  // Each row: { keyValue: { ... }, values: [...] }  OR flat object
  if (!raw || typeof raw !== 'object') {
    return { columns: [], rows: [] };
  }
  const obj = raw as Record<string, unknown>;

  // Handle SAP's columnar format
  const columns: OsqlResultColumn[] = [];
  const rows: OsqlResultRow[] = [];

  if (Array.isArray(obj['columns'])) {
    for (const col of obj['columns'] as Record<string, unknown>[]) {
      columns.push({
        name: String(col['name'] ?? col['fieldName'] ?? ''),
        isKey: Boolean(col['isKey'] ?? col['key'] ?? false),
        type: String(col['type'] ?? col['dataType'] ?? ''),
        description: String(col['description'] ?? col['label'] ?? ''),
      });
    }
  }

  if (Array.isArray(obj['rows'])) {
    for (const row of obj['rows'] as Record<string, unknown>[]) {
      const flat: OsqlResultRow = {};
      // Rows can be flat or have a 'values' array matching columns
      if (Array.isArray(row['values'])) {
        const vals = row['values'] as (string | null)[];
        for (let i = 0; i < columns.length; i++) {
          flat[columns[i].name] = vals[i] ?? null;
        }
      } else {
        for (const [k, v] of Object.entries(row)) {
          flat[k] = v == null ? null : String(v);
        }
      }
      rows.push(flat);
    }
  }

  return { columns, rows };
}

function renderTable(result: OsqlResult, noHeadings: boolean): void {
  const { columns, rows } = result;
  if (columns.length === 0 && rows.length === 0) {
    console.log(chalk.dim('(no rows)'));
    return;
  }

  // Use column order from metadata (or from first row keys if no columns)
  const colNames =
    columns.length > 0
      ? columns.map((c) => c.name)
      : rows.length > 0
        ? Object.keys(rows[0])
        : [];

  // Calculate column widths
  const widths = colNames.map((col) => {
    const header = col.length;
    const max = rows.reduce(
      (acc, row) => Math.max(acc, String(row[col] ?? '').length),
      0,
    );
    return Math.max(header, max);
  });

  const separator = widths.map((w) => '-'.repeat(w)).join('  ');

  if (!noHeadings) {
    const header = colNames.map((col, i) => col.padEnd(widths[i])).join('  ');
    console.log(chalk.bold(header));
    console.log(chalk.dim(separator));
  }

  for (const row of rows) {
    const line = colNames
      .map((col, i) => String(row[col] ?? '').padEnd(widths[i]))
      .join('  ');
    console.log(line);
  }
}

export const datapreviewOsqlCommand = new Command('osql')
  .description('Execute an ABAP Open SQL SELECT statement')
  .argument('<statement>', 'ABAP SQL SELECT statement')
  .option(
    '-o, --output <format>',
    'Output format: human (default) or json',
    'human',
  )
  .option('-r, --rows <n>', 'Maximum number of rows to return', '100')
  .option('--noheadings', 'Suppress column headings')
  .option('--noaging', 'Disable SAP aging (bypass browser cache flag)')
  .action(
    async (
      statement: string,
      options: {
        output: string;
        rows: string;
        noheadings: boolean;
        noaging: boolean;
      },
    ) => {
      const trimmed = statement.trim();
      if (!trimmed.toUpperCase().startsWith('SELECT')) {
        console.error(
          '❌ Only SELECT statements are supported by the data preview endpoint',
        );
        process.exit(1);
      }

      try {
        const client = await getAdtClientV2();
        const maxRows = parseInt(options.rows, 10) || 100;

        const params = new URLSearchParams({
          rowCount: String(maxRows),
          outputFormat: 'json',
        });

        if (options.noaging) {
          params.set('noaging', 'true');
        }

        const result = await client.fetch(
          `/sap/bc/adt/datapreview/freestyle?${params.toString()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'text/plain',
              Accept: 'application/json',
            },
            body: trimmed,
          },
        );

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        // Parse and render as human table
        const parsed = parseAdtDataPreviewResponse(result);
        renderTable(parsed, options.noheadings);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Query failed:', message);
        process.exit(1);
      }
    },
  );
