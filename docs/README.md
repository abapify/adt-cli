# Internal project docs

Maintainer-facing documentation. **Not** rendered on the website — see `website/docs/` for public docs.

Contents:

- `roadmap/` — OpenSpec-style epic briefs (E01–E15)
- `changelogs/`, `history/` — daily session notes + change records
- `design/`, `architecture/` — historical design notes and internal architecture docs
- `planning/` — sprint planning and roll-out plans (includes `docs-rollout.md`)
- `migration/` — version migration notes
- `examples/` — usage samples
- `ci-cd-setup.md` — CI/CD configuration notes

For end-user docs visit https://adt-cli.netlify.app (source: `website/docs/`).

## Specs → OpenSpec

Design contracts and specifications are managed via [OpenSpec](https://openspec.dev/) in `openspec/`. Use `/opsx:propose`, `/opsx:apply`, and `/opsx:archive` to manage changes.
