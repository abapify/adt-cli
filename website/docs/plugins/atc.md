---
title: ATC plugin
sidebar_position: 3
---

# ATC plugin

Package: [`@abapify/adt-atc`](../sdk/packages/adt-atc) · adds: `adt atc`

Runs **ABAP Test Cockpit** checks on a package, transport, or single object
and emits findings in formats consumable by common code-scanning UIs.

## What it does

Invokes the ADT ATC runner (`/sap/bc/adt/atc/worklists`, `/atc/runs`) with a
scope + check variant, waits for completion, pulls the result, and translates
the findings into one of several report formats:

- **console** — colored, grouped summary
- **json** — raw finding list
- **gitlab** — [GitLab Code Quality](https://docs.gitlab.com/ee/ci/testing/code_quality.html)
  JSON, surfaces findings in MR diffs
- **sarif** — [SARIF 2.1.0](https://sarifweb.azurewebsites.net/) for GitHub
  Code Scanning / Azure DevOps

Both `--format gitlab` and `--format sarif` map ATC priorities (1–3) to severity
levels in the respective standard.

## Installation

```bash
bun add -D @abapify/adt-atc
```

Enable in `adt.config.ts`:

```ts
export default {
  commands: ['@abapify/adt-atc/commands/atc'],
};
```

## Usage

```bash
# Run ATC on a package, print summary
adt atc -p ZMY_PACKAGE

# Run ATC on a transport, output SARIF for GitHub Code Scanning
adt atc -t S0DK942970 --format sarif --output atc.sarif

# GitLab Code Quality in an MR pipeline
adt atc -t $CI_COMMIT_SHA --format gitlab --output gl-code-quality.json

# Single object with a specific variant
adt atc -o /sap/bc/adt/oo/classes/zcl_my_class --variant STRICT
```

Full flag reference: `adt atc --help` or [CLI: atc](../cli/check).

## Baseline comparison (planned)

ATC baseline comparison — show only findings that are **new** since a given
commit or baseline file — is on the roadmap. The design uses an
**abapGit-based resolver**: findings are keyed by `(object, check, message,
source-line-hash)` where the source line is taken from the abapGit-serialized
file on a reference commit, so cosmetic line-number churn doesn't produce false
positives. Track progress in the open issues under
[`docs/roadmap/epics/atc-baseline.md`](https://github.com/abapify/adt-cli/tree/main/docs/roadmap/epics)
(TBD).

## SonarQube

ATC does not have a built-in Sonar Generic issue format yet. If your Sonar
project needs ATC findings, use the **sarif → Sonar** conversion via the
[`sonar-sarif` plugin](https://github.com/Sonar-Scanners/sonar-sarif) on the
server side, or request
[generic issue format](https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/importing-external-issues/generic-issue-data/)
support by opening an issue.

## Internals

- Entry point: `src/commands/atc.ts` — a `CliCommandPlugin` calling
  `client.adt.atc.*` contracts.
- Format emitters live in `src/formatters/` (one per output format). Each is a
  pure `(result: AtcResult) => string`.
- Programmatic API exported from the package root —
  `outputSarifReport`, `outputGitLabCodeQuality`, `AtcResult`, `AtcFinding` —
  so you can integrate with custom pipelines without the CLI.

## Extending

To add a new output format:

1. Create `src/formatters/<name>.ts` exporting a pure formatter.
2. Register in the command's `--format` options.
3. Export from the package `index.ts` if it should be callable programmatically.
4. Add a test under `tests/`.

See [writing a command plugin](./writing-command-plugin) for the full pattern.

## Troubleshooting

- **`No check variant specified`** — the system has no default variant; pass
  `--variant <name>`.
- **Run stuck / timeout** — ATC worklists are asynchronous; the plugin polls
  with backoff. If a run truly hangs server-side, check SM12/SM13 on the
  system.
- **SARIF rejected by GitHub** — GitHub's upload action enforces the SARIF
  schema strictly; re-run with `--format sarif --output file.sarif` and
  validate with [SARIF Validator](https://sarifweb.azurewebsites.net/Validation)
  before uploading.
