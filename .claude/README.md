# Claude Code layer (`adt-cli`)

**Thin wrapper.** Shared procedures live under [`.agents/`](../.agents/README.md).

| Path                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `commands/opsx/*.md` | Slash-command metadata + pointer to `.agents/workflows/opsx-*.md` |
| `skills/openspec-*`  | Discovery stubs → `.agents/skills/openspec-*`                     |

Hooks (`hooks/`), team defaults (`settings.json`), and local overrides (`settings.local.json`) stay here—they are Claude-specific execution concerns, not portable workflows.
