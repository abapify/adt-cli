import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { getAdtClientV2 } from '../utils/adt-client-v2';

const MAX_RESPONSE_DIAGNOSTIC_CHARS = 4_000;

type FetchFailure = Error & {
  code?: unknown;
  status?: unknown;
  statusText?: unknown;
  rawBody?: unknown;
  cause?: unknown;
};

// Sensitive key fragments are inlined into each regex literal below (rather
// than interpolated via new RegExp) to satisfy Codacy's non-literal-RegExp
// rule. Keep the lists in sync when adding new sensitive key names.

function redactDiagnostic(value: string): string {
  return value
    .replace(
      /((?:(?:proxy-)?authorization|x-api-key|x-apikey|api-key|x-auth-token):\s*)[^\r\n]*/gi,
      '$1[REDACTED]',
    )
    .replace(/(?:set-)?cookie:\s*[^\r\n]*/gi, 'Cookie: [REDACTED]')
    .replace(
      /(["'](?:[a-z0-9_-]*?(?:token|password|passwd|secret|api[_-]?key|access[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie)[a-z0-9_-]*)["']\s*:\s*["'])(?:[^"'\\]|\\.)*/gi,
      '$1[REDACTED]',
    )
    .replace(
      /(<(?:token|password|passwd|secret|api[_-]?key|access[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie)\b[^>]*>)[\s\S]*?(<\/[^>]+>)/gi,
      '$1[REDACTED]$2',
    )
    .replace(
      /(<\w+\b[^>]*\bkey=["'](?:[a-z0-9_-]*?(?:token|password|passwd|secret|api[_-]?key|access[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie)[a-z0-9_-]*)["'][^>]*>)[\s\S]*?(<\/[^>]+>)/gi,
      '$1[REDACTED]$2',
    )
    .replace(
      /([?&](?:[a-z0-9_-]*?(?:token|password|passwd|secret|api[_-]?key|access[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie)[a-z0-9_-]*)=)[^&\s]*/gi,
      '$1[REDACTED]',
    );
}

function describeCause(cause: unknown): string | undefined {
  if (!(cause instanceof Error)) return undefined;
  const code = 'code' in cause ? (cause as { code?: unknown }).code : undefined;
  const message = redactDiagnostic(cause.message ?? '');
  return code ? `${message} (${String(code)})` : message;
}

/**
 * Formats a fetch failure without exposing credentials or unbounded response data.
 * A missing HTTP response is meaningful: it distinguishes a network/proxy/TLS
 * failure from a server-side HTTP failure.
 */
export function formatFetchFailure(error: unknown): string[] {
  const failure = error instanceof Error ? (error as FetchFailure) : undefined;
  const message = redactDiagnostic(failure?.message ?? String(error));
  const lines = [`❌ Request failed: ${message}`];

  if (typeof failure?.status === 'number') {
    const statusText =
      typeof failure.statusText === 'string'
        ? ` ${redactDiagnostic(failure.statusText)}`
        : '';
    lines.push(`   HTTP status: ${failure.status}${statusText}`);
  } else {
    lines.push(
      '   HTTP response: none received (connection failed before a server response)',
    );
  }

  if (typeof failure?.rawBody === 'string' && failure.rawBody.length > 0) {
    const sanitized = redactDiagnostic(failure.rawBody);
    // Slice by code points to avoid splitting surrogate pairs (invalid UTF-8).
    const codePoints = Array.from(sanitized);
    const body = codePoints.slice(0, MAX_RESPONSE_DIAGNOSTIC_CHARS).join('');
    const suffix =
      codePoints.length > MAX_RESPONSE_DIAGNOSTIC_CHARS ? '… [truncated]' : '';
    lines.push(
      `   Response body (sanitized, max ${MAX_RESPONSE_DIAGNOSTIC_CHARS} chars): ${body}${suffix}`,
    );
  }

  const cause = describeCause(failure?.cause);
  if (cause) lines.push(`   Transport cause: ${cause}`);

  return lines;
}

export const fetchCommand = new Command('fetch')
  .description('Fetch a URL with authentication (like curl but authenticated)')
  .argument('<url>', 'URL path to fetch (e.g., /sap/bc/adt/core/http/sessions)')
  .option('-X, --method <method>', 'HTTP method', 'GET')
  .option(
    '-H, --header <header>',
    'Add header (can be used multiple times)',
    collect,
    [],
  )
  .option('-d, --data <data>', 'Request body (for POST/PUT)')
  .option('-o, --output <file>', 'Save response to file')
  .option(
    '--accept <type>',
    'Set Accept header (shorthand for -H "Accept: <type>")',
  )
  .action(async (url: string, options, _command) => {
    try {
      // Create v2 client (uses global CLI context automatically)
      const adtClient = await getAdtClientV2({
        writeMetadata: true, // Always write metadata for debugging
      });

      // Parse custom headers
      const customHeaders: Record<string, string> = {};
      for (const header of options.header) {
        const [key, ...valueParts] = header.split(':');
        if (key && valueParts.length > 0) {
          customHeaders[key.trim()] = valueParts.join(':').trim();
        }
      }

      // Add Accept header if specified
      if (options.accept) {
        customHeaders['Accept'] = options.accept;
      }

      const method = options.method.toUpperCase() as
        'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

      console.log(`🔄 ${method} ${url}...\n`);

      // Use the client's fetch utility method
      const response = await adtClient.fetch(url, {
        method,
        headers: customHeaders,
        body: options.data,
      });

      // Display response
      if (options.output) {
        const content =
          typeof response === 'string'
            ? response
            : JSON.stringify(response, null, 2);
        writeFileSync(options.output, content);
        console.log(`💾 Response saved to: ${options.output}`);
      } else {
        // Display response (string or formatted JSON)
        if (typeof response === 'string') {
          console.log(response);
        } else {
          console.log(JSON.stringify(response, null, 2));
        }
      }

      console.log('\n✅ Done!');
    } catch (error) {
      for (const line of formatFetchFailure(error)) console.error(line);
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:', redactDiagnostic(error.stack));
      }
      process.exit(1);
    }
  });

// Helper to collect repeated options
function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}
