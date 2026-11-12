## Why

The SDK already emits ATC Code Quality/SARIF and AUnit JUnit/JaCoCo, while consumers still repair paths, merge run variants and convert reports themselves — with subtly different results per consumer (e.g. inspected SARIF fallback paths are not equivalent to richer consumer locations).

## What Changes

- Introduce a canonical finding/result model and pure normalization APIs inside the existing `adt-atc` and `adt-aunit` packages (no new package, no consumer cutover).
- ATC side: preserve resolved repository paths, stable fingerprints/check identity, result-level category, composite objects, namespace handling and line locations across formats; expose deterministic variant merging with an injected priority/severity policy — configured policy and provider publication stay outside core.
- AUnit side: normalize JUnit/JaCoCo integrity and source paths without confusing assertion failures with technical errors.
- Existing format contracts and CLI/MCP parity are preserved; formatters keep their current wire shapes.

## Impact

- Affected specs: `report-normalization` (new capability)
- Affected code: `packages/adt-atc`, `packages/adt-aunit` (pure normalization modules + exports + tests); formatters become thin projections of the normalized model.
- GitLab canary integration only; no consumer cutover or production delivery in this change.
- Related existing reporting work item: work item 5.
