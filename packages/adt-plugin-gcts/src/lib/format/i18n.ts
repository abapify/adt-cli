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
): string {
  const base = gctsFilename(name, type, 'metadata').replace(/\.json$/, '');
  return language
    ? `${base}.${language.toLowerCase()}.properties`
    : `${base}.properties`;
}

/**
 * Create .properties files for an object's translations.
 *
 * @param name        Object name (lowercased)
 * @param type        ABAP object type code
 * @param translations Map of language code → entries. The key '' (empty
 *                    string) represents the master / default language.
 */
export function createPropertiesFiles(
  name: string,
  type: string,
  translations: Record<string, TranslationEntry[]>,
): PropertiesFile[] {
  const files: PropertiesFile[] = [];
  for (const [lang, entries] of Object.entries(translations)) {
    if (!entries || entries.length === 0) continue;
    const path = lang
      ? propertiesFilename(name, type, lang)
      : propertiesFilename(name, type);
    files.push({ path, content: buildProperties(entries) });
  }
  return files;
}
