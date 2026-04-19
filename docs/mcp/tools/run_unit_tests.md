---
title: run_unit_tests
sidebar_label: run_unit_tests
description: "Run ABAP Unit tests on an object or package and return pass/fail counts per method"
---

# `run_unit_tests`

Run ABAP Unit tests on an object or package and return pass/fail counts per method

Defined in [`packages/adt-mcp/src/lib/tools/run-unit-tests.ts`](https://github.com/abapify/adt-cli/blob/main/packages/adt-mcp/src/lib/tools/run-unit-tests.ts).

## Input schema

```ts
{
  baseUrl: string;   // SAP system base URL
  client?: string;   // SAP client number
  username?: string; // Username for basic auth
  password?: string; // Password for basic auth
  objectName: string; // ABAP object name (class, program, or package)
  objectType?: string; // Object type (e.g. CLAS, PROG, DEVC). Speeds up URI resolution.
  withCoverage?: boolean; // Whether to collect code coverage data
  coverage?: boolean; // Alias for withCoverage. If true, returns coverage report XML alongside the results.
  coverageFormat?: 'jacoco' | 'sonar-generic'; // Coverage report format when coverage is enabled
}
```

## Output

The tool returns a single text content item whose body is a JSON-serialised object (`content[0].text`). On error, the response has `isError: true` and a human-readable message.

```json
{
  "content": [
    { "type": "text", "text": "<JSON.stringify(result, null, 2)>" }
  ]
}
```

See the source for the exact shape of `result`.

## Example invocation

```json
{
  "name": "run_unit_tests",
  "arguments": {
      "baseUrl": "https://sap.example.com:44300",
      "username": "DEVELOPER",
      "password": "***",
      "client": "100",
      "objectName": "<objectName>"
  }
}
```

## Underlying contract

- `client.adt.aunit.testruns.post`

## See also

- [MCP overview](../overview.md)
