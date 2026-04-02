/**
 * XML formatting utilities for abapGit serialization.
 *
 * Centralizes XML post-processing that was previously duplicated
 * across base.ts, fugr.ts, tabl.ts, and roundtrip.ts.
 *
 * Uses indexOf-based parsing instead of regex to avoid
 * super-linear backtracking (SonarQube S5852).
 */

/**
 * Extract `name="value"` attribute pairs from an XML attribute string
 * using indexOf-based scanning (no regex).
 */
function extractAttributes(content: string): string[] {
  const attrs: string[] = [];
  let i = 0;
  while (i < content.length) {
    // Skip whitespace
    while (
      i < content.length &&
      (content[i] === ' ' || content[i] === '\n' || content[i] === '\t')
    )
      i++;
    if (i >= content.length) break;

    // Find '=' for attribute name boundary
    const eqIdx = content.indexOf('=', i);
    if (eqIdx === -1) break;

    // Find opening quote
    const openQuote = content.indexOf('"', eqIdx + 1);
    if (openQuote === -1) break;

    // Find closing quote
    const closeQuote = content.indexOf('"', openQuote + 1);
    if (closeQuote === -1) break;

    attrs.push(content.slice(i, closeQuote + 1));
    i = closeQuote + 1;
  }
  return attrs;
}

/**
 * Format XML attributes on separate lines for better diff readability.
 *
 * Turns `<tag a="1" b="2">` into:
 * ```
 * <tag
 *   a="1"
 *   b="2"
 * >
 * ```
 *
 * Uses indexOf-based scanning to avoid regex backtracking (S5852).
 */
export function formatXmlAttributes(xml: string): string {
  let result = '';
  let pos = 0;

  while (pos < xml.length) {
    const openBracket = xml.indexOf('<', pos);
    if (openBracket === -1) {
      result += xml.slice(pos);
      break;
    }

    // Copy everything before '<'
    result += xml.slice(pos, openBracket);

    const closeBracket = xml.indexOf('>', openBracket);
    if (closeBracket === -1) {
      result += xml.slice(openBracket);
      break;
    }

    const tagContent = xml.slice(openBracket + 1, closeBracket);
    const spaceIdx = tagContent.indexOf(' ');

    // No attributes, or special tags (</, <!, <?)
    if (
      spaceIdx === -1 ||
      tagContent[0] === '/' ||
      tagContent[0] === '!' ||
      tagContent[0] === '?'
    ) {
      result += xml.slice(openBracket, closeBracket + 1);
      pos = closeBracket + 1;
      continue;
    }

    const tag = tagContent.slice(0, spaceIdx);
    const attrPart = tagContent.slice(spaceIdx + 1);
    const isSelfClosing = attrPart.trimEnd().endsWith('/');
    const attrContent = isSelfClosing
      ? attrPart.slice(0, attrPart.lastIndexOf('/'))
      : attrPart;

    const attrs = extractAttributes(attrContent);
    if (attrs.length === 0) {
      result += xml.slice(openBracket, closeBracket + 1);
    } else {
      result += `<${tag}${attrs.map((a) => `\n  ${a}`).join('')}\n${isSelfClosing ? '/' : ''}>`;
    }
    pos = closeBracket + 1;
  }

  return result;
}

/**
 * Move `xmlns:asx` declaration from root `<abapGit>` to nested `<asx:abap>`.
 *
 * Uses indexOf-based approach instead of regex to avoid backtracking on
 * the `[\s\S]*?` pattern that SonarQube flags.
 */
export function moveNamespaceToAbap(xml: string): string {
  const nsDecl = ' xmlns:asx="http://www.sap.com/abapxml"';
  const nsIdx = xml.indexOf(nsDecl);
  if (nsIdx === -1) return xml;

  // Verify the namespace is on the <abapGit root element
  const tagStart = xml.lastIndexOf('<abapGit', nsIdx);
  if (tagStart === -1) return xml;

  // Remove from root
  const stripped = xml.slice(0, nsIdx) + xml.slice(nsIdx + nsDecl.length);

  // Insert on <asx:abap element
  const asxTag = '<asx:abap';
  const asxIdx = stripped.indexOf(asxTag);
  if (asxIdx === -1) return stripped;

  return (
    stripped.slice(0, asxIdx + asxTag.length) +
    '\n  ' +
    nsDecl.trim() +
    stripped.slice(asxIdx + asxTag.length)
  );
}

/**
 * Apply standard abapGit XML formatting:
 * 1. Format attributes on separate lines
 * 2. Move xmlns:asx to asx:abap element
 */
export function formatAbapGitXml(xml: string): string {
  return moveNamespaceToAbap(formatXmlAttributes(xml));
}
