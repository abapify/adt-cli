/**
 * XML formatting utilities for abapGit serialization.
 *
 * Centralizes XML post-processing that was previously duplicated
 * across base.ts, fugr.ts, tabl.ts, and roundtrip.ts.
 *
 * All regexes use flat (non-nested) quantifiers to avoid
 * super-linear backtracking (SonarQube S5852).
 */

/** Simple tag regex — no nested quantifiers */
const TAG_WITH_ATTRS_RE = /<([\w:.-]+)\s([^>]+)>/g;
/** Flat attribute extractor */
const ATTR_RE = /[\w:.-]+="[^"]*"/g;

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
 */
export function formatXmlAttributes(xml: string): string {
  return xml.replace(
    TAG_WITH_ATTRS_RE,
    (match, tag: string, content: string) => {
      const isSelfClosing = content.trimEnd().endsWith('/');
      const attrContent = isSelfClosing
        ? content.slice(0, content.lastIndexOf('/'))
        : content;
      const attrs = attrContent.match(ATTR_RE);
      if (!attrs || attrs.length === 0) return match;
      return `<${tag}${attrs.map((a) => `\n  ${a}`).join('')}\n${isSelfClosing ? '/' : ''}>`;
    },
  );
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
