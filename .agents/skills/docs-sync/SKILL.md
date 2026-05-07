---
name: docs-sync
description: Detect and close drift between code and the Docusaurus site in `website/`. Use when the user asks to sync docs with code, audit docs drift, or after adding/removing packages, CLI commands, or MCP tools. Trigger words - sync docs, docs drift, update docs, website out of date, missing docs page.
---

# docs-sync

Three-level pipeline for keeping `website/` in sync with the code. Each level
runs independently — **do not** skip level 1 before running the later ones.

```
1. check-structure  (deterministic, no LLM)     → find structural drift
2. generate-stubs   (template, no LLM)          → create missing doc files from code facts
3. refresh-content  (agentic, diff-scoped)      → suggest updates to existing pages            [not implemented yet]
```

Nx targets (on the `adt-cli-docs` project):

```bash
bunx nx docs-check adt-cli-docs     # level 1 — fails CI on drift
bunx nx docs-stubs adt-cli-docs     # level 2 — materialises missing pages and patches sidebars.ts
```

## Why this shape

Most of `website/docs/` is a **1-to-1 projection of the code**:

| Docs path                         | Code source                           |
| --------------------------------- | ------------------------------------- |
| `website/docs/sdk/packages/*.md`  | `packages/*`                          |
| `website/docs/cli/*.md`           | `packages/adt-cli/src/lib/commands/*` |
| `website/docs/mcp/tools/*.md`     | `server.tool('name', …)` in `adt-mcp` |
| `website/docs/sdk/contracts/*.md` | `packages/adt-contracts/src/adt/*`    |
| `website/sidebars.ts`             | Index of all of the above             |

For this 80% of the docs, drift is a **set-difference problem**, not an
LLM problem. Level 1 computes that difference in a few milliseconds with no
model calls and no false positives. Run it first, always.

The remaining 20% (`guides/`, `architecture/`, `plugins/writing-*`) is genuine
prose that requires human judgement — level 3 handles that, but only as an
**advisor** that flags sections for review. It does not rewrite prose.

## Level 1 — check-structure (implemented)

```bash
bun .devin/skills/docs-sync/scripts/check-structure.ts
```

Exit code `0` if clean, `1` if drift. Emits a machine-readable-ish report with:

- `missing in docs` — exists in code, absent from docs/sidebar
- `orphan in docs` — exists in docs/sidebar, absent from code

Detection rules:

- **Packages**: every dir under `packages/` must have
  `website/docs/sdk/packages/<name>.md` and an entry under `sdkPackages` in
  `sidebars.ts`.
- **MCP tools**: every tool name registered in `packages/adt-mcp/src/lib/tools/`
  (both direct `server.tool('name', …)` and indirect
  `toolName: 'name'` wrappers) must have `website/docs/mcp/tools/<name>.md`
  and an entry under `mcpTools` in `sidebars.ts`.
- **Sidebar ↔ files**: every doc id quoted in `sidebars.ts` must resolve
  to an `.md`/`.mdx` file, and every doc file must be referenced from
  `sidebars.ts` (except `generated-index` categories).

Not yet covered (known gaps):

- CLI commands (name mapping is fuzzy — `cli/cts-transport` in sidebar vs
  `commands/cts/` in code). Needs an alias table before it can be automated
  without false positives.
- Contracts (`sdk/contracts/*`). Mapping is one-to-many per domain dir;
  needs a convention decision first.

When extending, add new rules to `scripts/check-structure.ts` only if the
mapping is unambiguous. Fuzzy mappings belong in level 3.

## Level 2 — generate-stubs (implemented)

```bash
bun .devin/skills/docs-sync/scripts/generate-stubs.ts           # dry-run
bun .devin/skills/docs-sync/scripts/generate-stubs.ts --write   # apply
# or: bunx nx docs-stubs adt-cli-docs
```

For each `missing in docs` item from level 1, creates a stub file populated
from code facts only:

- **Package**: title/description from `package.json`, links to the package
  source and `AGENTS.md`/`README.md` if present.
- **MCP tool**: title and description from the `server.tool(name, description, …)`
  call itself. Input schema extracted from the third argument — both object
  literals (`{ ...connectionShape, foo: z.string() }`) and bare identifiers
  referencing shared shapes (`sessionOrConnectionShape`) are supported.
  Fields keep their `.optional()` and `.describe(…)` annotations.
- **Sidebar**: new ids are inserted into `sdkPackages` / `mcpTools` in
  `website/sidebars.ts`, then the array is re-sorted alphabetically
  (keeping `*/overview` first).

Stubs carry zero hallucinated facts. When extraction is ambiguous — for
example a schema expression that is neither a recognised shared shape nor an
object literal — the stub links to the source instead of guessing.

Known limits of the Zod extractor (regex-based, no TS AST):

- Types beyond `string`/`number`/`boolean`/`array`/`object`/`enum`
  fall back to `unknown`.
- Complex refinements (`z.string().min(1).regex(…)`) are reported as the
  base type; the extra constraints are not shown.
- Conditional schemas (`z.union`, `z.discriminatedUnion`) are not supported
  yet — add a branch in `zodTypeOf` if needed.

When the extractor cannot determine the shape, it emits
`See [source](…) for the full Zod schema.` instead of a fake block. This is
intentional — **do not** teach the extractor to guess.

## Level 3 — refresh-content (planned, not yet implemented)

Diff-scoped advisor for **existing** pages. Runs only when level 1 is clean.

Baseline: last commit carrying a `Docs-Sync: true` trailer (fallback: last
commit touching `website/`, with a warning).

For each page whose backing code region changed since baseline, emit an
advisory: `<page>: possibly stale because of <files>`. Does **not** rewrite
prose — the human decides whether the page actually drifted.

Rewriting is deliberately out of scope. The failure mode of
"confidently-written but subtly-wrong prose" is worse than the failure mode
of "prose is a bit stale". Stubs close the former; advisories catch the
latter without creating new lies.

## Invocation recipe

When the user asks to "sync docs" or "check docs drift":

1. Run `bun .devin/skills/docs-sync/scripts/check-structure.ts`.
2. Report the result verbatim — do not summarise away items.
3. For each `missing` item, confirm with the user before creating any files.
   Level 2 stubs are safe, but even stubs land in a published site.
4. For each `orphan` item, ask: _was this renamed, or removed?_ Renames need
   redirects in `docusaurus.config.ts`; removals need the sidebar entry and
   file both deleted.

Never run level 3 on a repo with level 1 drift — the advisor will point at
sections that should not exist yet.

## Don'ts

- **Don't** write to `website/docs/` based on LLM output alone. Every claim
  in a generated stub must trace to a code symbol or configuration value.
- **Don't** treat `sidebars.ts` as an append-only log. The category arrays
  (`cliCommands`, `mcpTools`, `sdkPackages`, `sdkContracts`) are the spec —
  keep them alphabetically sorted when editing so diffs stay small.
- **Don't** add detection rules for fuzzy mappings (CLI aliases, multi-file
  contracts) until the mapping is decided. Better no rule than a noisy rule.
