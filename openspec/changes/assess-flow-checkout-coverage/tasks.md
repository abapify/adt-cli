# Tasks

## 1. Assessment module

- [ ] 1.1 Create `packages/adt-flow/src/coverage-assessment.ts` with the
      discriminated assessment types, report payload schema validation,
      descriptor/inventory validation and deterministic output sorting.
- [ ] 1.2 Export the assessment types and function from the package index and
      update README + website SDK page.

## 2. Regression tests (RED before GREEN)

- [ ] 2.1 Complete coverage: full report + descriptors + matching evidence,
      including class companions and namespaced encoded paths.
- [ ] 2.2 Typed omissions: skipped, derived, absent objects and unmapped
      inventory keep status `partial`.
- [ ] 2.3 Unknown: missing payload, non-object payload, unsupported schema
      and coverage versions.
- [ ] 2.4 Source loss/divergence: verified absence and hash mismatch produce
      deleted/diverged files with typed omissions.
- [ ] 2.5 Boundaries: duplicate owned paths and non-`src/` paths throw the
      established typed errors; URI-less and padded component resolutions.
- [ ] 2.6 Determinism: repeated assessment is deeply equal.

## 3. Gates

- [ ] 3.1 `nx run adt-flow:test`, build, typecheck, lint, format green.
- [ ] 3.2 Existing report builder and CLI contracts unchanged (suites pass).
