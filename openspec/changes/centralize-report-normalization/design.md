## Decision

Add pure normalization modules inside `adt-atc` (`normalizeAtcResult`, `mergeAtcVariants`) and `adt-aunit` (`normalizeAunitResult`, `normalizeJacocoReport`). The canonical model keeps existing `AtcFinding`/`AtcResult` and `AunitResult` shapes at its core and adds stable fingerprints (derived from check identity + object + location) and per-finding resolved locations. Formatters keep their wire shapes and become projections of the normalized model; the existing formatter contracts do not change in this increment.

Variant merging takes an injected severity policy (`{ error: number, warning: number, info: number }` thresholds or an ordering function); aggregation is commutative so merge order cannot change the outcome. AUnit normalization classifies failures: assertion failures (message present, kind assertion) stay distinct from technical errors (missing source, stack without message). Malformed input raises typed errors; zero-test suites are valid results, not errors.

## Risks / Trade-offs

- Fingerprints must stay stable across releases; derivation is versioned in the module and covered by tests.
- Loading format plugins is unchanged; normalization is pure and synchronous.
- Consumer adapters (path repair, provider publication, configured policy) remain outside core per the work item.
