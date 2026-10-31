# @abapify/adt

Standalone bundle of the [ADT CLI](https://github.com/abapify/adt-cli) — a
single minified ESM file with **zero runtime dependencies**.

```bash
npm install -g @abapify/adt
adt --help
```

Requires Node.js ≥ 18. Everything else — the ADT client, schemas, plugins,
UI — is embedded in the bundle, so the install is ~12 MB instead of ~100 MB
of `node_modules`.

## What's inside

- The full `adt` CLI built from `adt-cli/src/bin/adt-all.ts` (built-in
  plugins: codegen, ATC, export, diff, flow, abapGit, gCTS)
- `yoga.wasm` — layout engine asset, shipped next to the bundle

Externally-installed command plugins still work: dynamic `import()` calls
resolve upward from the installed package into the global `node_modules`.

For the unbundled variant (per-package installs, programmatic use of
`@abapify/adt-cli` services), use `@abapify/adt-cli`.
