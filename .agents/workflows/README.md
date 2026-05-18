# Workflows (agent-agnostic)

Executable procedures shared by **Cursor**, **Windsurf**, **Claude Code**, and other tools. Cursor slash commands under `.cursor/commands/` are thin entrypoints; **this directory holds the full steps**.

| Workflow         | File                               | Notes                       |
| ---------------- | ---------------------------------- | --------------------------- |
| OpenSpec explore | [opsx-explore.md](opsx-explore.md) | Thinking / discovery only   |
| OpenSpec propose | [opsx-propose.md](opsx-propose.md) | Scaffold change + artifacts |
| OpenSpec apply   | [opsx-apply.md](opsx-apply.md)     | Implement tasks             |
| OpenSpec archive | [opsx-archive.md](opsx-archive.md) | Archive completed change    |
| Lint loop        | [lint.md](lint.md)                 | Nx lint + fix iteration     |

## ADT workflows

ADT command bodies live under [`.agents/commands/adt/`](../commands/adt/). Windsurf/Cursor shortcuts should link there rather than duplicating content.

See [adt/README.md](adt/README.md).
