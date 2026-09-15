/**
 * Compatibility export for the canonical ADT URI → abapGit path mapper.
 *
 * The implementation lives in `@abapify/adt-atc` so the ATC resolver and the
 * abapGit format plugin cannot drift apart.
 */
export { adtUriToAbapGitPath } from '@abapify/adt-atc';
