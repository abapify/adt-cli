/**
 * SAP 1-character language code ↔ ISO 639-1 mapping
 *
 * abapGit stores SAP internal 1-char codes (e.g. "E" for English).
 * SAP ADT REST API expects ISO 639-1 codes (e.g. "EN").
 */

const SAP_TO_ISO: Record<string, string> = {
  E: 'EN', // English
  D: 'DE', // German
  F: 'FR', // French
  I: 'IT', // Italian
  S: 'ES', // Spanish
  P: 'PT', // Portuguese
  J: 'JA', // Japanese
  K: 'KO', // Korean
  '1': 'ZH', // Chinese
  W: 'RU', // Russian
  T: 'TR', // Turkish
  N: 'NL', // Dutch
  H: 'HU', // Hungarian
  L: 'PL', // Polish
  Q: 'CS', // Czech
  R: 'SK', // Slovak
  U: 'SV', // Swedish
  V: 'DA', // Danish
  Y: 'FI', // Finnish
  X: 'NO', // Norwegian
  G: 'EL', // Greek
  B: 'HE', // Hebrew
  A: 'AR', // Arabic
  '3': 'TH', // Thai
  M: 'UK', // Ukrainian
  '6': 'HR', // Croatian
  O: 'SL', // Slovenian
  '7': 'BG', // Bulgarian
  '8': 'SR', // Serbian
  C: 'RO', // Romanian
};

const ISO_TO_SAP: Record<string, string> = Object.fromEntries(
  Object.entries(SAP_TO_ISO).map(([k, v]) => [v, k]),
);

/**
 * Convert SAP 1-char language code to ISO 639-1.
 * Returns the input uppercased if no mapping exists (may already be ISO).
 */
export function sapLangToIso(sapLang: string | undefined): string {
  if (!sapLang) return 'EN';
  const upper = sapLang.toUpperCase();
  // If it's already 2 chars, assume ISO
  if (upper.length >= 2) return upper;
  return SAP_TO_ISO[upper] ?? upper;
}

/**
 * Convert ISO 639-1 language code to SAP 1-char code.
 * Returns "E" (English) if no mapping exists.
 */
export function isoToSapLang(isoLang: string | undefined): string {
  if (!isoLang) return 'E';
  const upper = isoLang.toUpperCase();
  // If it's already 1 char, assume SAP code
  if (upper.length === 1) return upper;
  return ISO_TO_SAP[upper] ?? 'E';
}

// ============================================
// ABAP Language Version mapping
// ============================================

/**
 * abapGit numeric code → ADT API string value
 *
 * abapGit serializes ABAP_LANGUAGE_VERSION as a numeric string (e.g. "5").
 * SAP ADT REST API expects descriptive strings (e.g. "cloudDevelopment").
 */
const ABAP_LANG_VER_TO_ADT: Record<string, string> = {
  '2': 'keyUser',
  '5': 'cloudDevelopment',
};
const ABAP_LANG_VER_FROM_ADT: Record<string, string> = Object.fromEntries(
  Object.entries(ABAP_LANG_VER_TO_ADT).map(([k, v]) => [v, k]),
);

/**
 * Convert abapGit ABAP_LANGUAGE_VERSION code to ADT API value.
 * Returns undefined if not set or standard ABAP.
 * Passes through values that are already in ADT format (e.g. "cloudDevelopment").
 */
export function abapLangVerToAdt(
  abapGitCode: string | undefined,
): string | undefined {
  if (!abapGitCode) return undefined;
  return ABAP_LANG_VER_TO_ADT[abapGitCode] ?? abapGitCode;
}

/**
 * Convert ADT API abapLanguageVersion to abapGit ABAP_LANGUAGE_VERSION code.
 * Returns undefined if not set or standard ABAP.
 */
export function abapLangVerFromAdt(
  adtValue: string | undefined,
): string | undefined {
  if (!adtValue) return undefined;
  return ABAP_LANG_VER_FROM_ADT[adtValue] ?? adtValue;
}
