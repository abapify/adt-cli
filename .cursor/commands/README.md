# Project Cursor slash commands

Only **`opsx-*.md`** belong here (thin wrappers → `.agents/workflows/`).

**Do not add `models.md` or any command that proxies Anthropic’s REST API.** Cursor model discovery belongs in the IDE (**model picker**), Cursor CLI (**`/model`** per [slash commands](https://cursor.com/docs/cli/reference/slash-commands)), or `Cursor.models.list` + `CURSOR_API_KEY` in `@cursor/sdk`.

If `/models` still appears in the `/` menu, it comes from **outside this repo** (global Cursor commands or team/account-level commands). Remove it with Cursor **`/commands`**, or delete `models.md` from `~/.cursor/commands/` when that folder exists.
