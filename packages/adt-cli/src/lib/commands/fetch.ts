import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { asText } from '../utils/text';

const MAX_RESPONSE_DIAGNOSTIC_CHARS = 4_000;

type FetchFailure = Error & {
  code?: unknown;
  status?: unknown;
  statusText?: unknown;
  rawBody?: unknown;
  cause?: unknown;
};

// The sensitive-name fragments appear once in the SENSITIVE_NAME pattern
// below (kept as a regex literal rather than interpolated via new RegExp to
// satisfy Codacy's non-literal-RegExp rule). The redaction patterns match the
// surrounding shape and defer the sensitive-name test to the captured key, so
// each regex stays within the complexity budget (S5843) without changing what
// is redacted.

/** Sensitive key/name fragments whose values must be redacted. */
const SENSITIVE_NAME =
  /token|password|passwd|secret|api[_-]?key|access[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie/i;

/** `"key": "value` shape; the sensitive-name check runs on group 3. */
const JSON_KEY_VALUE =
  /((["'])([a-z0-9_-]+)(["']\s*:\s*["']))(?:[^"'\\]|\\.)*/giy;

/** `<tag key="value" …>…</…>` shape; the name check runs on the tag body. */
const XML_KEY_ATTR =
  /(<\w+\b[^>]*\bkey=["']([a-z0-9_-]+)["'][^>]*>)[\s\S]*?(<\/[^>]+>)/giy;

/** `[?&]key=value` shape; the sensitive-name check runs on group 3. */
const QUERY_PARAM = /(([?&])([a-z0-9_-]+)(=))[^&\s]*/giy;

/**
 * Replace leftmost non-overlapping matches of `candidate` whose `isSensitive`
 * test passes, mirroring `String#replace` semantics of the full sensitive-name
 * patterns while keeping those names out of the per-shape regexes.
 */
function replaceSensitiveMatches(
  text: string,
  candidate: RegExp,
  isSensitive: (match: RegExpExecArray) => boolean,
  replacement: (match: RegExpExecArray) => string,
): string {
  let out = '';
  let pos = 0;
  let i = 0;
  while (i < text.length) {
    candidate.lastIndex = i;
    const match = candidate.exec(text);
    if (match && match[0].length > 0 && isSensitive(match)) {
      out += text.slice(pos, i) + replacement(match);
      pos = i + match[0].length;
      i = pos;
    } else {
      i += 1;
    }
  }
  return out + text.slice(pos);
}

/** True when the tag body has a `key="…"` attribute with a sensitive name. */
function hasSensitiveAttrKey(tagInner: string): boolean {
  const wordRun = /^\w+/.exec(tagInner)?.[0] ?? '';
  for (const m of tagInner.matchAll(/\bkey=["']([a-z0-9_-]*)["']/g)) {
    if (m.index < wordRun.length) continue;
    if (SENSITIVE_NAME.test(m[1])) return true;
  }
  return false;
}

function redactDiagnostic(value: string): string {
  const headers = value
    .replace(
      /((?:(?:proxy-)?authorization|x-api-key|x-apikey|api-key|x-auth-token):\s*)[^\r\n]*/gi,
      '$1[REDACTED]',
    )
    .replace(/(?:set-)?cookie:\s*[^\r\n]*/gi, 'Cookie: [REDACTED]');
  const jsonPairs = replaceSensitiveMatches(
    headers,
    JSON_KEY_VALUE,
    (m) => SENSITIVE_NAME.test(m[3]),
    (m) => `${m[1]}[REDACTED]`,
  );
  const xmlTags = jsonPairs.replace(
    /(<(?:token|password|passwd|secret|(?:api|access)[_-]?key|samlrequest|relaystate|authorization|cookie|set-cookie)\b[^>]*>)[\s\S]*?(<\/[^>]+>)/gi,
    '$1[REDACTED]$2',
  );
  const xmlAttrs = replaceSensitiveMatches(
    xmlTags,
    XML_KEY_ATTR,
    (m) => hasSensitiveAttrKey(m[0].slice(1, m[0].indexOf('>'))),
    (m) => `${m[1]}[REDACTED]${m[3]}`,
  );
  return replaceSensitiveMatches(
    xmlAttrs,
    QUERY_PARAM,
    (m) => SENSITIVE_NAME.test(m[3]),
    (m) => `${m[1]}[REDACTED]`,
  );
}

function describeCause(cause: unknown): string | undefined {
  if (!(cause instanceof Error)) return undefined;
  const code = 'code' in cause ? (cause as { code?: unknown }).code : undefined;
  const message = redactDiagnostic(cause.message ?? '');
  return code ? `${message} (${asText(code)})` : message;
}

/** Parse repeated -H/--header values and the --accept shorthand into a map. */
function buildRequestHeaders(
  headers: string[],
  accept: string | undefined,
): Record<string, string> {
  const customHeaders: Record<string, string> = {};
  for (const header of headers) {
    const [key, ...valueParts] = header.split(':');
    if (key && valueParts.length > 0) {
      customHeaders[key.trim()] = valueParts.join(':').trim();
    }
  }
  // Add Accept header if specified
  if (accept) {
    customHeaders['Accept'] = accept;
  }
  return customHeaders;
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

      // Parse custom headers (incl. the --accept shorthand)
      const customHeaders = buildRequestHeaders(options.header, options.accept);

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
      } else if (typeof response === 'string') {
        // Display response (string or formatted JSON)
        console.log(response);
      } else {
        console.log(JSON.stringify(response, null, 2));
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
