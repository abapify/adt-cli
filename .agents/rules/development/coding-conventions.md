---
trigger: always_on
description: Core coding conventions for the abapify monorepo. TypeScript strict, ESM only, naming, formatting.
---

# Coding Conventions

- **TypeScript strict** — no `any` without a comment explaining why
- **ESM only** — no `require()`, no `__dirname` (use `import.meta.url`)
- **No decorators** except in packages that already use them
- **Async/await** over Promises `.then()` chains
- PascalCase for types/classes/interfaces; camelCase for variables/functions
- 2-space indentation (Prettier enforced)
- Cross-package imports: `@abapify/<package-name>`
- Internal file imports: relative paths, no extension (`../utils/parse`)
- `workspace:*` protocol for local workspace deps
