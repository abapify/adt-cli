---
title: '@abapify/adt-atc'
description: ABAP Test Cockpit (ATC) CLI plugin with SARIF / GitLab output.
---

# `@abapify/adt-atc`

CLI command plugin that adds `adt atc …` to the CLI. Runs ABAP Test Cockpit
checks against packages/transports and emits findings as SARIF or GitLab Code
Quality JSON. Supports customizing (check variants, exemption reasons).

## Install

```bash
bun add @abapify/adt-atc
```

Register in `adt.config.ts`:

```ts
export default {
  commands: ['@abapify/adt-atc/commands/atc'],
};
```

## Public API

```ts
export { atcCommand } from '@abapify/adt-atc';
export { atcCustomizingCommand } from '@abapify/adt-atc';
export { outputSarifReport, outputGitLabCodeQuality } from '@abapify/adt-atc';
export type {
  AtcResult,
  AtcFinding,
  OutputFormat,
  FindingResolver,
  ResolvedLocation,
} from '@abapify/adt-atc';
```

## Usage

```bash
adt atc -p ZMY_PACKAGE --format sarif --output atc.sarif.json
adt atc -p ZMY_PACKAGE --format gitlab --output atc.codequality.json
```

## Dependencies

- `@abapify/adt-plugin` (CLI command plugin contract)
- `@abapify/adt-client`, `@abapify/adt-contracts`

## Check Categories

Each finding can carry a `checkCategory` (e.g., `CI_PERFORMANCE`,
`CI_SECURITY`): the name of the ATC check category its check is assigned
to. The `atc` command resolves it automatically from the run's check
variant form template (`GET /sap/bc/adt/atc/checkvariants/formtemplate`)
by resolving each finding's documentation page to its implementing class
(the worklist `checkId` is a GUID), then mapping that class to a category.
The `enrichResultWithCategories` helper only does a direct `checkId` lookup;
the command uses the documentation bridge for normal worklist findings.
This is best-effort: unavailable templates, unreadable pages, or uncatalogued
checks leave the category unset without failing the run. Categories are
resolved from the variant's catalog as fetched after the run, so they
reflect the variant configuration in effect at that time (including any
edits made in the meantime).

The enrichment helpers are exported for reuse:

```typescript
import {
  parseCheckCategoryIndex,
  fetchCheckCategoryIndex,
  enrichResultWithCategories,
} from '@abapify/adt-atc';

// Build the implementing class -> category name index from a parsed form template
const index = parseCheckCategoryIndex(formTemplateDocument);

// Or fetch it through an ADT client (never throws)
const fetched = await fetchCheckCategoryIndex(client, 'DEFAULT');

// Enrich a result in place (direct lookup: only resolves findings whose
// checkId is already the implementing class name; normal worklist findings
// are enriched by the command via the documentation bridge)
enrichResultWithCategories(result, index);
```

The GitLab Code Quality formatter emits the category as `check_category`
per finding; the SARIF formatter sets it on each rule's
`properties.category`.

## Output Formats

### Console (default)

Human-readable output with emoji indicators and clickable ADT links (in supported terminals).

### JSON

Raw JSON output of the ATC results for further processing.

### SARIF

[SARIF](https://sarifweb.azurewebsites.net/) format for GitHub Code Scanning integration.

### GitLab Code Quality

[GitLab Code Quality](https://docs.gitlab.com/ee/ci/testing/code_quality.html) format for GitLab CI/CD integration.

For abapGit repositories, add `--resolver abapgit`. The resolver uses the
full ATC location URI to map compound objects such as function modules to
their serialized filenames, then scans the configured source tree so both
PREFIX and FULL folder logic point to the actual Git path. When multiple
files share the same basename (e.g. multiple `package.devc.xml` files in
different package directories), the resolver rejects the ambiguous match
rather than guessing.

## See also

- [ATC contracts](../contracts/atc)
- [`adt-aunit`](./adt-aunit) — sibling for ABAP Unit
