/**
 * abapGit filename parsing utilities.
 *
 * Extracted into a standalone module so it can be unit-tested without
 * pulling in the full handler/schema dependency chain.
 */

/**
 * abapGit file naming convention:
 * - XML metadata: {name}.{type}.xml (e.g., zcl_myclass.clas.xml)
 * - AFF JSON metadata: {name}.{type}.json (e.g., zfoo.bdef.json)
 * - Source code: {name}.{type}.abap (e.g., zcl_myclass.clas.abap)
 * - Source includes: {name}.{type}.{suffix}.abap (e.g., zcl_myclass.clas.testclasses.abap)
 * - AFF source files: {name}.{type}.abdl, {name}.{type}.acds, {name}.{type}.asrvd
 */

/**
 * Parse abapGit filename to extract object info
 *
 * Supports both legacy XML metadata (.xml) and AFF JSON metadata (.json),
 * plus source file extensions (.abap, .abdl, .acds, .asrvd).
 */
export function parseAbapGitFilename(filename: string): {
  name: string;
  type: string;
  suffix?: string;
  extension: string;
} | null {
  // Match patterns like: name.type.xml, name.type.json, name.type.suffix.abap,
  // name.type.<suffix>.abdl/.acds/.asrvd source files.
  const match = filename.match(
    /^([^.]+)\.([^.]+)(?:\.([^.]+))?\.(xml|json|abap|abdl|acds|asrvd)$/,
  );
  if (!match) return null;

  const [, name, type, suffixOrExt, extension] = match;

  // If 4 parts, middle is suffix; if 3 parts, no suffix
  return {
    name: name.toUpperCase(),
    type: type.toUpperCase(),
    suffix: suffixOrExt && suffixOrExt !== extension ? suffixOrExt : undefined,
    extension,
  };
}
