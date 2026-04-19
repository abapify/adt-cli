/**
 * SOAP-over-HTTP RFC transport for SAP.
 *
 * Wraps an RFC call in a SOAP 1.1 envelope targeted at
 * `/sap/bc/soap/rfc?sap-client=<n>` — the SAP NetWeaver built-in
 * wrapper around the NW RFC library. Avoids the native `libsapnwrfc`
 * dependency of node-rfc at the cost of a slightly restricted
 * parameter type space (scalars, structures, tables).
 *
 * No third-party XML parser is used — SAP's SOAP output for RFC is
 * well-formed, stable, and simple enough to handle with a minimal
 * hand-rolled parser (see {@link parseRfcSoapResponse}).
 *
 * Reference: https://wiki.scn.sap.com/wiki/display/Snippets/Calling+RFC+enabled+Function+Modules+via+SOAP
 */

import {
  RfcSoapFault,
  type RfcParams,
  type RfcResponse,
  type RfcScalar,
  type RfcStructure,
  type RfcTable,
} from './types';

/** SAP RFC SOAP namespace — fixed. */
export const RFC_SOAP_NS = 'urn:sap-com:document:sap:rfc:functions';

/** SOAP 1.1 envelope namespace. */
export const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

// ────────────────────────────────────────────────────────────────────────────
// Envelope builder
// ────────────────────────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderScalar(value: RfcScalar): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'X' : ' ';
  return escapeXml(String(value));
}

function renderStructure(obj: RfcStructure): string {
  let out = '';
  for (const [field, v] of Object.entries(obj)) {
    out += renderField(field, v);
  }
  return out;
}

function renderTable(name: string, rows: RfcTable): string {
  // SAP RFC SOAP convention: <TABLE_NAME><item>…</item><item>…</item></TABLE_NAME>
  const items = rows
    .map((row) => `<item>${renderStructure(row)}</item>`)
    .join('');
  return `<${name}>${items}</${name}>`;
}

function renderField(
  name: string,
  value: RfcScalar | RfcStructure | RfcTable,
): string {
  if (Array.isArray(value)) return renderTable(name, value);
  if (value !== null && typeof value === 'object') {
    return `<${name}>${renderStructure(value)}</${name}>`;
  }
  return `<${name}>${renderScalar(value)}</${name}>`;
}

/**
 * Build the SOAP request envelope for an RFC function module call.
 *
 * @param fmName - The RFC function module name (will be upper-cased).
 * @param params - Flat map of importing / changing / tables parameters.
 * @returns XML string suitable for `POST /sap/bc/soap/rfc` with
 *          `Content-Type: text/xml; charset=utf-8`.
 */
export function buildRfcSoapEnvelope(
  fmName: string,
  params: RfcParams = {},
): string {
  const fm = fmName.toUpperCase();
  const body = renderStructure(params as RfcStructure);

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap-env:Envelope xmlns:soap-env="${SOAP_ENV_NS}">` +
    `<soap-env:Body>` +
    `<urn:${fm} xmlns:urn="${RFC_SOAP_NS}">` +
    body +
    `</urn:${fm}>` +
    `</soap-env:Body>` +
    `</soap-env:Envelope>`
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Envelope parser — minimal, regex + stack based
// ────────────────────────────────────────────────────────────────────────────

interface Token {
  kind: 'open' | 'close' | 'self' | 'text';
  name?: string;
  text?: string;
}

const TAG_RE = /<\/?([A-Za-z_][\w.:-]*)[^>]*>|<!\[CDATA\[([\s\S]*?)\]\]>/g;

function tokenize(xml: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(xml)) !== null) {
    // text segment between previous tag and this one
    if (m.index > lastIndex) {
      const text = xml.slice(lastIndex, m.index);
      if (text.trim().length > 0) tokens.push({ kind: 'text', text });
    }
    if (m[2] !== undefined) {
      tokens.push({ kind: 'text', text: m[2] });
    } else {
      const raw = m[0];
      const name = m[1];
      if (raw.startsWith('</')) {
        tokens.push({ kind: 'close', name });
      } else if (raw.endsWith('/>')) {
        tokens.push({ kind: 'self', name });
      } else {
        tokens.push({ kind: 'open', name });
      }
    }
    lastIndex = TAG_RE.lastIndex;
  }
  return tokens;
}

function localName(qname: string): string {
  const i = qname.indexOf(':');
  return i < 0 ? qname : qname.slice(i + 1);
}

function unescapeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

interface ParsedNode {
  text: string;
  children: Array<{ name: string; node: ParsedNode }>;
}

function newNode(): ParsedNode {
  return { text: '', children: [] };
}

/**
 * Parse an XML fragment (no `<?xml …?>` prolog required) into a tree of
 * `ParsedNode`s keyed by local element name. Repeated element names are
 * preserved as separate `children` entries (so `<item>` tables parse as
 * multiple children with the same name).
 */
function parseXmlFragment(xml: string): ParsedNode {
  const tokens = tokenize(xml);
  const root = newNode();
  const stack: ParsedNode[] = [root];

  for (const tok of tokens) {
    const top = stack[stack.length - 1];
    if (tok.kind === 'open') {
      const child = newNode();
      top.children.push({ name: localName(tok.name!), node: child });
      stack.push(child);
    } else if (tok.kind === 'close') {
      stack.pop();
    } else if (tok.kind === 'self') {
      const child = newNode();
      top.children.push({ name: localName(tok.name!), node: child });
    } else if (tok.kind === 'text') {
      top.text += tok.text ?? '';
    }
  }
  return root;
}

/**
 * Convert a `ParsedNode` into a JS value:
 *  - leaf → string (unescaped)
 *  - mixed children with all name="item" → array of objects (table)
 *  - object otherwise (structure)
 */
function nodeToValue(node: ParsedNode): RfcScalar | RfcStructure | RfcTable {
  if (node.children.length === 0) {
    return unescapeXml(node.text.trim());
  }
  // table detection: all children named "item" (case-insensitive)
  const allItems =
    node.children.length > 0 &&
    node.children.every((c) => c.name.toLowerCase() === 'item');
  if (allItems) {
    return node.children.map((c) => nodeToValue(c.node) as RfcStructure);
  }
  // structure: collapse children into an object; duplicate names → arrays
  const obj: RfcStructure = {};
  for (const { name, node: child } of node.children) {
    const val = nodeToValue(child);
    if (name in obj) {
      const existing = obj[name];
      if (Array.isArray(existing)) {
        (existing as RfcTable).push(val as RfcStructure);
      } else {
        obj[name] = [existing as unknown as RfcStructure, val as RfcStructure];
      }
    } else {
      obj[name] = val;
    }
  }
  return obj;
}

/**
 * Parse a SOAP-RFC response envelope and return the RFC response params.
 *
 * @param xml - Raw response body as returned by `/sap/bc/soap/rfc`.
 * @throws {@link RfcSoapFault} if the envelope contains a `soap:Fault`.
 */
export function parseRfcSoapResponse(xml: string): RfcResponse {
  const root = parseXmlFragment(xml);

  // Find soap:Envelope/soap:Body
  const envelope = root.children.find(
    (c) => c.name.toLowerCase() === 'envelope',
  );
  if (!envelope) {
    throw new Error(
      'Invalid SOAP response: no <Envelope> element found. Got: ' +
        xml.slice(0, 200),
    );
  }
  const body = envelope.node.children.find(
    (c) => c.name.toLowerCase() === 'body',
  );
  if (!body) {
    throw new Error('Invalid SOAP response: no <Body> element inside envelope');
  }

  // Check for Fault first
  const fault = body.node.children.find(
    (c) => c.name.toLowerCase() === 'fault',
  );
  if (fault) {
    const faultObj = nodeToValue(fault.node) as RfcStructure;
    const faultcode = String(faultObj.faultcode ?? 'Server');
    const faultstring = String(faultObj.faultstring ?? 'Unknown SOAP fault');
    throw new RfcSoapFault(faultcode, faultstring, xml);
  }

  // The RFC response is the single non-fault child of <Body>.
  // SAP names it either `<FMNAME.Response>` or `<FMNAMEResponse>` depending
  // on system version.
  const rfcRoot = body.node.children[0];
  if (!rfcRoot) return {};

  const result = nodeToValue(rfcRoot.node);
  if (result === null || typeof result !== 'object') {
    // degenerate scalar response (string, number, boolean, null)
    return {};
  }
  if (Array.isArray(result)) {
    // should not happen for an RFC response root
    return { items: result };
  }
  return result;
}
