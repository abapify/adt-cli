---
trigger: always_on
description: Zero internal context in any public GitHub contribution. Mandatory preflight before publishing to github.com.
---

# OSS Isolation Rule (public GitHub)

## The rule

**Public GitHub remotes (`origin`, `github.com`) and internal development
remotes are two separate worlds.** No internal context may ever appear in any
public GitHub artifact — not even as "evidence" or "provenance".

This applies to **every** contribution channel, for **every** agent runtime
(Cursor, Claude Code, Codex, and any CLI agent):

- PR titles, bodies, comments, and code-review replies
- Issues and issue comments
- Branch names and commit messages
- Author / committer emails (use the personal public identity, never a
  corporate address)
- Code comments, test fixtures, documentation, changelogs

## Forbidden patterns

Never write or paste into anything destined for GitHub:

| Pattern class                                             | Example of the leak                    |
| --------------------------------------------------------- | -------------------------------------- |
| Corporate host names and internal group paths             | shadow-MR / pipeline / work-item links |
| Corporate email domains in author metadata                | commit author `@corp.example`          |
| Internal system codenames                                 | release train / environment names      |
| Internal MR/pipeline/job numbers tied to internal systems | "!105", "builder 3029698363"           |

The concrete patterns for this organization live in
`scripts/.oss-guard-local.patterns` (local, untracked — never commit it). The
mechanical guard reads that file and adds its patterns to the generic scan.

Generic engineering words (`canary`, `draft`, `shadow review`) are fine.
Internal _system names_ and _links_ are not. When unsure, drop the sentence —
the public PR must stand on its own without internal evidence.

## Mandatory preflight (mechanical gate)

Before **any** of these actions targeting a public remote:

- `git push` to a `github.com` remote
- `gh pr create` / `gh pr edit` / `gh pr comment`
- `gh issue create` / `gh issue comment` (scan with `--issue <N>`)

run:

```sh
scripts/oss-github-guard.sh              # scans outgoing commits, patches and branch name
scripts/oss-github-guard.sh --pr <N>     # scans live PR text, reviews and inline replies via gh
scripts/oss-github-guard.sh --issue <N>  # scans live issue text via gh
```

The guard exits non-zero on any forbidden pattern. **A non-zero exit is a hard
stop** — fix the text, do not bypass, do not `--no-verify`.

## Summarizing internal work for a public PR

Rewrite from scratch in public terms: what the bug was, what changed, which
local tests pass. Internal MR numbers, pipelines, jobs, and system names are
never part of that story. If a commit message or prior PR body already
contains internal references, do not copy it — sanitize first.

## Why this exists

Prose alone failed: public contributions kept picking up internal links,
system codenames and corporate emails. The guard script plus this always-on
rule are the enforced baseline.
