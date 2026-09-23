const GENERIC_FAILURE = '❌ Command failed: unexpected failure';
const CODE_PATTERN = /^[a-z0-9_]{1,64}$/i;
const MAX_MESSAGE_LENGTH = 300;
const DIAGNOSTIC_DETAIL_KEYS = [
  'object',
  'component',
  'path',
  'diagnostic',
  'changeKind',
] as const;
// eslint-disable-next-line no-control-regex
const ANSI_CSI = /\u001b\[[0-9;:]*[ -/]*[@-~]/gu;
// eslint-disable-next-line no-control-regex
const ANSI_OSC = /\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/gu;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/gu;

/** Collapse plugin text to a single safe log line: no escape sequences, bounded length. */
function sanitizeLogText(text: string): string {
  return text
    .replaceAll(ANSI_CSI, '')
    .replaceAll(ANSI_OSC, '')
    .replaceAll(CONTROL_CHARS, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function formatDiagnosticDetails(error: Error): string {
  const details = (error as { details?: unknown }).details;
  if (details === null || typeof details !== 'object') return '';

  const rendered = DIAGNOSTIC_DETAIL_KEYS.flatMap((key) => {
    const value = (details as Record<string, unknown>)[key];
    return typeof value === 'string' && value.length > 0
      ? [`${key}=${sanitizeLogText(value)}`]
      : [];
  }).join(', ');

  return rendered ? ` [${rendered}]` : '';
}

/**
 * Render typed plugin failures as a stable single-line message so CI logs do
 * not expose implementation stacks, control sequences, or arbitrary thrown
 * values. Only errors carrying a well-formed `code` are treated as typed;
 * anything else falls back to a generic message.
 */
export function formatPluginExecutionError(error: unknown): string {
  if (!(error instanceof Error)) {
    return GENERIC_FAILURE;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !CODE_PATTERN.test(code)) {
    return GENERIC_FAILURE;
  }
  const message = sanitizeLogText(error.message);
  const details = formatDiagnosticDetails(error);
  return message
    ? `❌ Command failed [${code}]: ${message}${details}`
    : `❌ Command failed [${code}]${details}`;
}
