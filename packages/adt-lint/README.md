# @abapify/adt-lint

Shared ABAP lint and source-shaping utilities built on top of `@abaplint/core`.

## Exports

- `lintSource(source, options)`
- `lintAndFix(source, options)`
- `listRules(options)`
- `buildPreset(systemType)`
- `stripToPublicApi(source, objectType)`
- `extractDependencies(source)`
- `detectMethodBoundary(source, methodName)`
