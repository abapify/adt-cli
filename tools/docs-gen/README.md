# docs-gen

Generates the website's CLI and MCP reference from code, so the reference
cannot drift from the implementation.

| Output                            | Source                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `website/docs/cli/reference/*.md` | Commander tree from `createCLI()` plus the first-party plugins |
| `website/docs/mcp/tools/*.md`     | Tools registered by `registerTools()` in `@abapify/adt-mcp`    |
| `website/sidebars.generated.ts`   | Sidebar ids for both, imported by `website/sidebars.ts`        |

```bash
bunx nx run docs-gen:docs:gen     # regenerate after changing commands or tools
bunx nx run docs-gen:docs:check   # what CI runs; fails if pages are stale
```

CLI reference pages are fully generated. MCP tool pages are generated up to
and including `## Input schema`; everything after that heading (output,
examples, see also) is hand-written and preserved on regeneration. To change a
description, option or parameter, edit the command or tool in code and rerun
`docs:gen`.
