# @abapify/adt-atc

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
adt atc -t S0DK942970

# Run ATC on a package
adt atc -p ZMY_PACKAGE

# Run ATC on a specific object
adt atc -o /sap/bc/adt/oo/classes/zcl_my_class

# Output as SARIF (for GitHub Code Scanning)
adt atc -t S0DK942970 --format sarif --output atc-results.sarif

# Output as GitLab Code Quality
adt atc -t S0DK942970 --format gitlab --output gl-code-quality.json
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
    },
  ],
};

await outputSarifReport(result, 'atc-results.sarif');
await outputGitLabCodeQuality(result, 'gl-code-quality.json');
```

## Output Formats

### Console (default)

Human-readable output with emoji indicators and clickable ADT links (in supported terminals).

### JSON

Raw JSON output of the ATC results for further processing.

### SARIF

[SARIF](https://sarifweb.azurewebsites.net/) format for GitHub Code Scanning integration.

### GitLab Code Quality

[GitLab Code Quality](https://docs.gitlab.com/ee/ci/testing/code_quality.html) format for GitLab CI/CD integration.

## License

MIT
