## ADDED Requirements

### Requirement: Workflow accepts package mode input

The `codeReviewWorkflow` SHALL accept `{ mode: 'package', packageName: string, baseUrl: string, username: string, password: string, client?: string }` as input and produce a `CodeReviewReport`.

#### Scenario: Package mode resolves objects

- **WHEN** the workflow is executed with `mode: 'package'` and a valid `packageName`
- **THEN** the `resolveObjects` step calls the `list_package_objects` MCP tool with that package name
- **THEN** the step result contains an array of ABAP object URIs from that package and its sub-packages

#### Scenario: Package mode runs ATC on resolved objects

- **WHEN** `resolveObjects` returns a non-empty object list
- **THEN** the `runAtcChecks` step calls `atc_run` for each object URI
- **THEN** the `buildReport` step aggregates all findings into a `CodeReviewReport`

#### Scenario: Empty package produces empty report

- **WHEN** `list_package_objects` returns zero objects
- **THEN** the workflow completes successfully with `findings: []` and `summary.totalFindings: 0`

### Requirement: Workflow accepts transport mode input

The `codeReviewWorkflow` SHALL accept `{ mode: 'transport', transportNumber: string, baseUrl: string, username: string, password: string, client?: string }` as input and produce a `CodeReviewReport`.

#### Scenario: Transport mode resolves objects

- **WHEN** the workflow is executed with `mode: 'transport'` and a valid `transportNumber`
- **THEN** the `resolveObjects` step calls the `cts_get_transport` MCP tool with that transport number
- **THEN** the step result contains the list of ABAP object URIs from that transport

#### Scenario: Transport mode runs ATC on resolved objects

- **WHEN** `resolveObjects` returns a non-empty object list
- **THEN** the `runAtcChecks` step calls `atc_run` for each resolved object URI
- **THEN** the `buildReport` step aggregates all findings into a `CodeReviewReport`

### Requirement: CodeReviewReport output schema

The workflow output SHALL conform to `CodeReviewReport`:

```typescript
{
  mode: 'package' | 'transport';
  target: string;          // packageName or transportNumber
  objects: string[];       // resolved object URIs
  findings: AtcFinding[];  // all ATC findings across objects
  summary: {
    totalObjects: number;
    totalFindings: number;
    bySeverity: Record<string, number>;
  };
}
```

#### Scenario: Report structure is correct

- **WHEN** the workflow completes
- **THEN** the output matches the `CodeReviewReport` schema
- **THEN** `summary.totalObjects` equals the number of objects resolved
- **THEN** `summary.totalFindings` equals the total number of findings across all objects

### Requirement: Workflow is three steps

The `codeReviewWorkflow` SHALL consist of exactly three named steps executed in sequence:

1. `resolveObjects`
2. `runAtcChecks`
3. `buildReport`

#### Scenario: Step chain is deterministic

- **WHEN** the workflow is committed (`.commit()`)
- **THEN** the execution order is always resolveObjects → runAtcChecks → buildReport

### Requirement: Workflow handles MCP tool errors gracefully

If an MCP tool call fails for an individual object, the workflow SHALL continue processing remaining objects and include an error entry in `findings` for the failed object.

#### Scenario: Partial ATC failure

- **WHEN** `atc_run` fails for one object but succeeds for others
- **THEN** the failed object produces a finding with `priority: 'error'` and a `description` containing the error message
- **THEN** the workflow does not throw; it returns a completed `CodeReviewReport`
