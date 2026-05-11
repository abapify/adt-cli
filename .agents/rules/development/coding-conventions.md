---
trigger: always_on
description: Core coding conventions for the abapify monorepo. TypeScript strict, ESM only, naming, formatting.
---

# Coding Conventions

- **TypeScript strict** — no `any` without a comment explaining why
- **ESM only** — no `require()`, no `__dirname` (use `import.meta.url`)
- **No decorators** except in packages that already use them
- **Async/await** over Promises `.then()` chains
- PascalCase for types/classes/interfaces; camelCase for variables/functions.
  Module-level immutable primitive constants (e.g. `DEFAULT_TIMEOUT`,
  `NS_USAGE`, `PAGES_DIR`) may use `SCREAMING_SNAKE_CASE` — this is the
  convention used throughout the codebase and is preferred over camelCase
  for top-level values that act as constants rather than mutable state.
- 2-space indentation (Prettier enforced)
- Cross-package imports: `@abapify/<package-name>`
- Internal file imports: extensionless relative paths — see [bundler-imports](bundler-imports.md) for details
- `workspace:*` protocol for local workspace deps — see `$link-workspace-packages` skill for setup
