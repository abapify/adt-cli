---
title: gCTS workflow
sidebar_position: 8
description: Use git-enabled CTS for clone / pull / commit / push directly from the CLI.
---

# gCTS workflow

## Goal

Use SAP's **git-enabled CTS** (gCTS) for version control instead of transports
(or on top of them). Unlike [abapGit roundtrip](./abapgit-checkout-checkin),
gCTS runs on the SAP server: the system itself is a git client, repos live
inside SAP, and `adt gcts` just drives the `/sap/bc/cts_abapvcs/*` endpoints.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- gCTS enabled on the SAP system (check with `adt fetch /sap/bc/cts_abapvcs/`)
- A remote git host (GitHub / GitLab / BitBucket Server) reachable by the SAP
  system — **not** from your laptop
- VCS token for the remote (personal access token, deploy key, ...)

## Steps

### 1. Create a gCTS repository on SAP

```bash
adt gcts repo create zdemo https://github.com/acme/zdemo.git \
  --role SOURCE --type GITHUB \
  --starting-folder src/ \
  --vcs-token "$GITHUB_PAT" \
  --json
```

`zdemo` is the gCTS repository ID — use it in every subsequent command.

### 2. Clone into the SAP server

```bash
adt gcts repo clone zdemo
```

This pulls the git repo's content into the system. Objects land in the
package configured for `zdemo` (default: a package named after the rid).

### 3. Pull the latest

```bash
adt gcts repo pull zdemo
```

### 4. Commit your local SAP changes

gCTS commits scope by **ABAP package** or **transport**:

```bash
# Commit an entire package
adt gcts commit zdemo -d \$ZDEMO -m "Add customer view"

# Commit a transport
adt gcts commit zdemo --corrnr DEVK900001 -m "Release TR"
```

The commit is automatically pushed to the remote.

### 5. Branching

```bash
adt gcts branch list   zdemo --all
adt gcts branch create zdemo feature/customer
adt gcts branch switch zdemo feature/customer
```

### 6. History

```bash
adt gcts log     zdemo
adt gcts objects zdemo          # list repository objects
```

### 7. Cleanup

```bash
adt gcts repo delete zdemo
```

## gCTS vs abapGit vs transports

| Aspect            | **gCTS**                  | **abapGit**                | **Transports (STMS)** |
| ----------------- | ------------------------- | -------------------------- | --------------------- |
| Runs where        | SAP server                | Your laptop (disk ↔ SAP)   | SAP server            |
| Target            | Remote git repo           | Local filesystem + any git | SAP target systems    |
| Format            | **AFF** (JSON-heavy, new) | abapGit classic (XML)      | Binary TR files       |
| Commit scope      | Package or transport      | Any edit                   | Transport             |
| Cross-landscape   | Yes (git pull on target)  | Yes (checkin on target)    | Yes (STMS import)     |
| CLI command group | `adt gcts`                | `adt checkout` / `checkin` | `adt cts`             |

**Rule of thumb**: gCTS is for SAP-server-driven git; abapGit is for
developer-machine-driven git; transports remain the native change vehicle.
See [Format comparison](./format-comparison) for file-level differences.

## Troubleshooting

| Error                              | Cause                                               | Fix                                                                          |
| ---------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `SSL handshake failed` on clone    | SAP can't reach github.com — firewall or missing CA | Basis adds the CA to STRUST (SSL client SSL client (Anonymous))              |
| `403 Forbidden` on push            | VCS token lacks `repo` scope                        | Regenerate PAT with write access, `adt gcts config zdemo set VCS_TOKEN $NEW` |
| `Commit failed: nothing to commit` | No modified objects in package / transport          | Confirm changes: `adt ls \$ZDEMO --modified`, or commit by transport instead |
| `Repository not found`             | rid is case-sensitive and lower-case by convention  | Use exact rid from `adt gcts repo list`                                      |

## See also

- [`adt gcts` reference](/cli/gcts)
- [abapGit roundtrip](./abapgit-checkout-checkin) — disk-side alternative
- [Format comparison](./format-comparison)
- [CTS workflow](./cts-workflow)
- [MCP gCTS tools](/mcp/tools/gcts_clone_repo)
