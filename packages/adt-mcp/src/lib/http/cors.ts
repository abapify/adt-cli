/**
 * CORS handler for the adt-mcp HTTP transport.
 *
 * Only engages when the request carries an `Origin` header.
 * The allow-list is exact-match (plus the `*` wildcard shortcut for dev).
 * Preflight (`OPTIONS`) requests are terminated here with the appropriate
 * headers; non-preflight requests get response headers applied to `res`
 * so the caller can continue the normal pipeline.
 *
 * Per the MCP spec, `Mcp-Session-Id` must be exposed via
 * `Access-Control-Expose-Headers` so browser clients can read it off the
 * `initialize` response.
 */
import http from 'node:http';

const ALLOW_METHODS = 'POST, GET, DELETE, OPTIONS';
const ALLOW_HEADERS = 'content-type, accept, mcp-session-id, authorization';
const EXPOSE_HEADERS = 'mcp-session-id';
const MAX_AGE = '600';

export interface CorsOptions {
  /**
   * Exact-match allow-list of origins. The single entry `'*'` disables
   * matching and mirrors any origin (intended for local dev only).
   * An empty / undefined list disables CORS entirely (no headers added).
   */
  allowedOrigins?: string[];
}

export interface CorsHandler {
  /**
   * Apply CORS handling to a request.
   *
   * Returns `true` if the response has been fully handled (preflight
   * short-circuit) and the caller MUST stop processing. Returns `false`
   * otherwise — the caller should continue; any non-preflight response
   * headers have already been written to `res.setHeader()` and will be
   * flushed with the final response.
   */
  handle(req: http.IncomingMessage, res: http.ServerResponse): boolean;
}

function getOrigin(req: http.IncomingMessage): string | undefined {
  const raw = req.headers['origin'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() && value.trim().length > 0 ? value.trim() : undefined;
}

function isAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.length === 1 && allowed[0] === '*') return true;
  return allowed.includes(origin);
}

export function createCorsHandler(options: CorsOptions = {}): CorsHandler {
  const allowed = (options.allowedOrigins ?? []).filter((s) => s.length > 0);
  const enabled = allowed.length > 0;

  return {
    handle(req, res) {
      if (!enabled) {
        // No CORS configured — if a preflight arrives it's not our concern
        // but we shouldn't crash the pipeline. Let the outer handler 404/405.
        return false;
      }
      const origin = getOrigin(req);
      const isPreflight = req.method === 'OPTIONS';

      if (!origin) {
        // Non-browser client, no CORS needed. Preflight without Origin is
        // malformed — fall through and let routing handle the 405.
        return false;
      }

      if (!isAllowed(origin, allowed)) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'origin not allowed' }));
        return true;
      }

      const mirror = allowed[0] === '*' ? origin : origin;
      res.setHeader('Access-Control-Allow-Origin', mirror);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Expose-Headers', EXPOSE_HEADERS);

      if (isPreflight) {
        res.setHeader('Access-Control-Allow-Methods', ALLOW_METHODS);
        res.setHeader('Access-Control-Allow-Headers', ALLOW_HEADERS);
        res.setHeader('Access-Control-Max-Age', MAX_AGE);
        res.writeHead(204);
        res.end();
        return true;
      }

      return false;
    },
  };
}
