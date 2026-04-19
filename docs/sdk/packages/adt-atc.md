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
  AtcResult, AtcFinding, OutputFormat,
  FindingResolver, ResolvedLocation,
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

## See also

- [ATC contracts](../contracts/atc)
- [`adt-aunit`](./adt-aunit) — sibling for ABAP Unit
