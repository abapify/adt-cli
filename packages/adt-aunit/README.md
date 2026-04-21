# @abapify/adt-aunit

ABAP Unit Test CLI plugin for [`adt-cli`](https://github.com/abapify/adt-cli).
Runs AUnit test runs against an SAP system via ADT and prints results to the
console or serialises them as JUnit XML (for GitLab CI / Jenkins),
SonarQube generic test reports, or JaCoCo / sonar-generic coverage.

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-aunit.svg)](https://www.npmjs.com/package/@abapify/adt-aunit)

## Install

```bash
npm i @abapify/adt-aunit
# or
bun add @abapify/adt-aunit
```

## Usage

Register the command in your `adt.config.ts` so `adt-cli` picks it up:

```ts
// adt.config.ts
export default {
  commands: ['@abapify/adt-aunit/commands/aunit'],
};
```

Then run tests against a package, class, transport, or arbitrary object URI:

```bash
adt aunit -p ZMY_PACKAGE
adt aunit -c ZCL_MY_CLASS
adt aunit --transport NPLK900042 --format junit --output aunit-report.xml
```

Example GitLab CI job:

```yaml
abap-unit:
  script:
    - npx adt aunit -p $PACKAGE --format junit --output aunit-report.xml
  artifacts:
    when: always
    reports:
      junit: aunit-report.xml
```

The package also exports helpers for embedding AUnit in custom tooling:

```ts
import { toJunitXml, type AunitResult } from '@abapify/adt-aunit';

const xml = toJunitXml(result satisfies AunitResult);
```

## Role in the monorepo

- CLI plugin loaded by `@abapify/adt-cli` via the `commands` entry in
  `adt.config.ts`; ships both the `aunit` command and result formatters.
- Depends on `@abapify/adt-contracts` / `@abapify/adt-schemas` for the
  AUnit ADT endpoint and on `@abapify/adt-plugin-abapgit` to resolve object
  names discovered from transports and packages.
- Focused on AUnit only; ATC checks, coverage orchestration outside AUnit,
  and generic test runners live elsewhere.

## Related

- [abapify/adt-cli monorepo](https://github.com/abapify/adt-cli)
- [Full docs](https://adt-cli.netlify.app)

## License

MIT
