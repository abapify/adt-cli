/**
 * Finding Resolver for abapGit repositories
 *
 * Resolves ATC finding locations (object type/name + method-relative line)
 * to actual git file paths and file-relative line numbers, respecting
 * the repository's folder logic (PREFIX vs FULL).
 *
 * The implementation lives in `@abapify/adt-atc` as the built-in
 * `createAbapGitResolver`; the abapgit plugin re-exports it under its
 * public API name `createFindingResolver`. Keeping a single source of
 * truth avoids drift between the two copies (and duplication warnings
 * from SonarCloud's CPD).
 *
 * @example
 * ```typescript
 * const resolver = createFindingResolver();
 * const loc = await resolver.resolve('CLAS', 'ZCL_MY_CLASS', 21, 'my_method');
 * // { path: 'src/zpackage/zpackage_clas/zcl_my_class.clas.abap', line: 38 }
 * ```
 */

export { createAbapGitResolver as createFindingResolver } from '@abapify/adt-atc';
