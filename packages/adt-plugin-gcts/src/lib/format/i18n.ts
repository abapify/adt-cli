/**
 * i18n .properties translation file support for AFF / gCTS.
 *
 * AFF stores translations alongside object metadata as .properties files:
 *   <name>.<type>.properties          — master / default language
 *   <name>.<type>.<lang>.properties   — per-language (e.g. .de.properties)
 *
 * This helper builds .properties file content from a translation map and
 * parses .properties filenames back into their components.
 */

import { gctsFilename } from '../format/filename';

export interface TranslationEntry {
  key: string;
  value: string;
}

export interface PropertiesFile {
  /** Relative path from object directory. */
  path: string;
  content: string;
}

/**
 * Build .properties file content from key-value pairs.
 * Uses the standard Java .properties format: `key = value` per line.
 */
export function buildProperties(entries: TranslationEntry[]): string {
  return entries.map((e) => `${e.key} = ${e.value}`).join('\n') + '\n';
}

/**
 * Build the .properties filename for an object.
 *
 * @param name     Object name (lowercased)
 * @param type     ABAP object type code (CLAS, INTF, ...)
 * @param language Optional language code. If omitted, emits the master file
 *                  (`<name>.<type>.properties`). If provided, emits a
 *                  per-language file (`<name>.<type>.<lang>.properties`).
 */
export function propertiesFilename(
  name: string,
  type: string,
  language?: string,
  contentType?: string,
): string {
  // A content-type segment without a language would emit the ambiguous
  // 4-part `{name}.{type}.{ct}.properties`, which reparses as a language
  // file — the AFF grammar only defines 3-, 4- (lang) and 5-part forms.
  if (contentType && !language) {
    throw new Error(
      'propertiesFilename: contentType requires a language — ' +
        'the 4-part `{name}.{type}.{content_type}.properties` form is ambiguous',
    );
  }
  // Filename segments are dot-separated — a dotted value would parse back
  // with a different suffix/language than it was emitted with.
  for (const [label, seg] of [
    ['contentType', contentType],
    ['language', language],
  ] as const) {
    if (seg?.includes('.')) {
      throw new Error(
        `propertiesFilename: ${label} must be a single filename segment, got "${seg}"`,
      );
    }
  }
  const base = gctsFilename(name, type, 'metadata').replace(/\.json$/, '');
  const segments = [base];
  if (contentType) segments.push(contentType.toLowerCase());
  if (language) segments.push(language.toLowerCase());
  return `${segments.join('.')}.properties`;
}

/**
 * Create .properties files for an object's translations.
 *
 * @param name        Object name (lowercased)
 * @param type        ABAP object type code
 * @param translations Map of language code → entries. The key '' (empty
 *                    string) represents the master / default language.
 * @param contentType  Optional content-type segment (e.g. `texts`,
 *                    `selections`, `headings`) — emits the 5-part
 *                    `{name}.{type}.{content_type}.{lang}.properties`
 *                    form and therefore requires a non-empty language key.
 */
export function createPropertiesFiles(
  name: string,
  type: string,
  translations: Record<string, TranslationEntry[]>,
  contentType?: string,
): PropertiesFile[] {
  const files: PropertiesFile[] = [];
  for (const [lang, entries] of Object.entries(translations)) {
    if (!entries || entries.length === 0) continue;
    const path = lang
      ? propertiesFilename(name, type, lang, contentType)
      : propertiesFilename(name, type, undefined, contentType);
    files.push({ path, content: buildProperties(entries) });
  }
  return files;
}
