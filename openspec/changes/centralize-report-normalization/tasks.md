## Implementation

- [ ] Compare current consumer output against formatter output before changing adapters (SARIF fallback paths vs richer consumer locations); record differences in the change notes.
- [ ] Behavioral regressions for ATC normalization: duplicate findings, category collisions, composite objects, namespaces, line locations, fingerprints.
- [ ] Behavioral regressions for deterministic variant merging with injected severity policy (order independence).
- [ ] Behavioral regressions for AUnit/JUnit/JaCoCo normalization: assertion vs technical errors, malformed reports, package-level coverage totals, zero tests, composite filenames, failure-count contracts.
- [ ] Implement the pure normalization modules and export them; formatters project the normalized model without changing wire shapes.
- [ ] Run package tests, build, typecheck, lint and formatting; record limitations.
