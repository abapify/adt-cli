---
title: '@abapify/adt-aunit'
description: ABAP Unit CLI plugin with JUnit XML output for GitLab CI.
---

# `@abapify/adt-aunit`

CLI command plugin that runs ABAP Unit tests via
[`/sap/bc/adt/abapunit/testruns`](../contracts/aunit) and emits JUnit XML
(consumable by GitLab CI, Jenkins, etc.) plus optional JaCoCo coverage reports
for SonarQube.

## Install

```bash
bun add @abapify/adt-aunit
```

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-aunit/commands/aunit'],
};
```

## Public API

```ts
export { aunitCommand } from '@abapify/adt-aunit';
export { toJunitXml, outputJunitReport } from '@abapify/adt-aunit';
// JaCoCo formatter subpath:
// import { ... } from '@abapify/adt-aunit/formatters/jacoco';
```

## Usage

```bash
adt aunit -p ZMY_PACKAGE --format junit --output aunit-report.xml
```

GitLab CI snippet:

```yaml
abap-unit:
  script:
    - adt aunit -p $PACKAGE --format junit --output aunit-report.xml
  artifacts:
    when: always
    reports:
      junit: aunit-report.xml
```

## Dependencies

- `@abapify/adt-plugin`, `@abapify/adt-client`, `@abapify/adt-contracts`

## See also

- [AUnit contracts](../contracts/aunit)
- [ATC plugin](./adt-atc)
