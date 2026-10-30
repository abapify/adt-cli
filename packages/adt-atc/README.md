# @abapify/adt-atc

[![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-atc/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-atc)

ABAP Test Cockpit (ATC) CLI plugin for `@abapify/adt-cli`.

## Installation

```bash
npm install @abapify/adt-atc
```

## Usage

### As a CLI Plugin

Add to your `adt.config.ts`:

```typescript
export default {
  commands: ['@abapify/adt-atc/commands/atc'],
};
```

Then use the command:

```bash
# Run ATC on a transport
adt atc -t TRLK942970

# Run ATC on a package
adt atc -p ZMY_PACKAGE

# Run ATC on a specific object
adt atc -o /sap/bc/adt/oo/classes/zcl_my_class

# Output as SARIF (for GitHub Code Scanning)
adt atc -t TRLK942970 --format sarif --output atc-results.sarif

# Output as GitLab Code Quality
adt atc -t TRLK942970 --format gitlab --output gl-code-quality.json
```

### Options

| Option                        | Description                                          |
| ----------------------------- | ---------------------------------------------------- |
| `-p, --package <package>`     | Run ATC on package                                   |
| `-o, --object <uri>`          | Run ATC on specific object                           |
| `-t, --transport <transport>` | Run ATC on transport request                         |
| `--variant <variant>`         | ATC check variant (default: from system customizing) |
| `--max-results <number>`      | Maximum number of results (default: 100)             |
| `--format <format>`           | Output format: console, json, gitlab, sarif          |
| `--output <file>`             | Output file (required for gitlab/sarif format)       |
| `--resolver <name>`           | Resolve report paths (built-in: `abapgit`)           |

### Programmatic Usage

```typescript
import {
  atcCommand,
  outputSarifReport,
  outputGitLabCodeQuality,
} from '@abapify/adt-atc';
import type { AtcResult, AtcFinding } from '@abapify/adt-atc';

// Use the formatters directly
const result: AtcResult = {
  checkVariant: 'DEFAULT',
  totalFindings: 1,
  errorCount: 0,
  warningCount: 1,
  infoCount: 0,
  findings: [
    {
      checkId: 'CL_CI_TEST_SELECT',
      checkTitle: 'Analysis of WHERE Condition for SELECT',
      messageId: '001',
      priority: 2,
      messageText: 'Table SFLIGHT: No WHERE condition',
      objectUri: '/sap/bc/adt/oo/classes/zcl_my_class',
      objectType: 'CLAS',
      objectName: 'ZCL_MY_CLASS',
      location: '/sap/bc/adt/oo/classes/zcl_my_class/source/main#start=10,0',
      // Optional: resolved by the atc command from the run's check variant
      // form template (check categories are best-effort enrichment)
      checkCategory: 'CI_PERFORMANCE',
    },
  ],
};

await outputSarifReport(result, 'atc-results.sarif');
await outputGitLabCodeQuality(result, 'gl-code-quality.json');
```

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

## License

MIT
