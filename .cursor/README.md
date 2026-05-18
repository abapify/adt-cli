# Cursor layer (`adt-cli`)

**Thin wrapper only.** Procedures, rules, and skills are maintained under [`.agents/`](../.agents/README.md).

| Path                | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `commands/`         | Slash-command frontmatter + pointer to `.agents/workflows/*.md` |
| `rules/`            | Short Cursor-specific `.mdc` rules (e.g. SSOT reminder)         |
| `skills/openspec-*` | Discovery stubs → canonical `.agents/skills/openspec-*`         |

Edit workflows in **`.agents/workflows/`**, not duplicate bodies here.

## No `/models` Anthropic command

This repository **does not** define `/models`. If you still see a custom command with that name that runs `curl` against Anthropic’s `/v1/models`, delete it: use Cursor’s **`/commands`** flow to edit/remove commands, or remove `models.md` from **`.cursor/commands/`** (project) or **`~/.cursor/commands/`** (global) if those files exist.

For Cursor-native model listing, use the **model picker** in the IDE or Cursor CLI **`/model`** ([slash commands](https://cursor.com/docs/cli/reference/slash-commands)); programmatic listing uses **`Cursor.models.list`** from `@cursor/sdk` with **`CURSOR_API_KEY`**.
