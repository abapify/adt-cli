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
import type { DataPreviewFreestyleResponse } from '@abapify/adt-contracts';

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

/**
 * Convert the typed freestyle response (columnar: each column has
 * `metadata` + `dataPreviewContent[row]`) to the row-oriented
 * `OsqlResult` shape used by the renderer below.
 */
function toOsqlResult(result: DataPreviewFreestyleResponse): OsqlResult {
  const rawColumns = result.dataPreview?.columns ?? [];

  const columns: OsqlResultColumn[] = rawColumns.map((col) => {
    const meta = col.metadata ?? {};
    return {
      name: String(meta.name ?? ''),
      isKey: Boolean(meta.isKey ?? meta.keyAttribute ?? false),
      type: String(meta.type ?? ''),
      description: String(meta.description ?? ''),
    };
  });

  const rowCount = rawColumns.reduce(
    (max, col) => Math.max(max, col.dataPreviewContent?.length ?? 0),
    0,
  );

  const rows: OsqlResultRow[] = [];
  for (let r = 0; r < rowCount; r++) {
    const row: OsqlResultRow = {};
    rawColumns.forEach((col, i) => {
      const name = columns[i].name;
      const values = col.dataPreviewContent ?? [];
      row[name] = values[r] ?? null;
    });
    rows.push(row);
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
  let colNames: string[];
  if (columns.length > 0) {
    colNames = columns.map((c) => c.name);
  } else if (rows.length > 0) {
    colNames = Object.keys(rows[0]);
  } else {
    colNames = [];
  }

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
        const maxRows = Number.parseInt(options.rows, 10) || 100;

        const result = await client.adt.datapreview.freestyle.post(
          {
            rowCount: maxRows,
            outputFormat: 'json',
            ...(options.noaging ? { noaging: true } : {}),
          },
          trimmed,
        );

        if (options.output === 'json') {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        // Render typed response as human-readable table
        renderTable(toOsqlResult(result), options.noheadings);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('❌ Query failed:', message);
        process.exit(1);
      }
    },
  );
