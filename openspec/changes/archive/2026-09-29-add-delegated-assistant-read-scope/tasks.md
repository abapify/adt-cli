# Tasks

- [x] Define the product-neutral delegated-assistant read policy.
- [x] Add failing policy-parser and HTTP catalogue tests.
- [x] Implement exact invocation verification.
- [x] Prove catalogue and dispatch remain server-owned and read-only.
- [x] Run adt-mcp build, typecheck, tests, lint, and full-tree formatting.
  - Focused policy, catalogue, and signed-JWT tests pass.
  - Scoped ESLint and Prettier checks pass; strict OpenSpec validation passes.
  - Full build/typecheck and server-construction tests remain blocked by the
    pre-existing dependency-tree mismatch (Zod 4 versus
    `zod-to-json-schema`, stale generated declarations). A clean frozen
    install is unavailable under the current registry policy.
