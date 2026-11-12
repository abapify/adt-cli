# Derive unchanged class component boundaries from sibling in-scope provenance

Import-completeness evidence shows class leaves (`CINC`, `CLSD`, `CPRI`,
`METH`) resolved to their `R3TR CLAS` owner where only the includes actually
changed in the requested transport scope carry in-scope versions in their
immutable feeds. Every other include of the same class — definitions, macros,
testclasses, and sometimes `main` — has zero in-scope versions, is classified
`SOURCE_HISTORY_SCOPE_VERSION_MISSING`, and is skipped. Downstream, a class
whose `main` component is skipped while sibling includes materialize leaves an
orphaned partial class in the Git tree (include fragments without
`*.clas.abap`), which consumers classify as a missing class companion.

## Change

1. **Derived component boundaries (adk manifest).** When a component's feed
   has no version attributed to the requested transport scope, and sibling
   components of the same repository object prove in-scope boundaries, derive
   the component's boundaries from immutable history instead of skipping it:
   head = newest feed version whose object version id is at or below the
   newest sibling in-scope version id; base = newest feed version strictly
   below the oldest sibling in-scope version id. ADT object version ids are
   the object-level version counter and are comparable across component feeds
   of one object. Such entries carry `exact: false` and the new
   `SOURCE_COMPONENT_SCOPE_DERIVED` diagnostic — the manifest never claims
   exactness, and the message names the derived version and its transports.
   If no version exists at or below the head bound, or none strictly below the
   base bound, the entry keeps `SOURCE_HISTORY_SCOPE_VERSION_MISSING`
   (genuinely unavailable stays an explicit omission). Deleted-object selection
   is unchanged.
2. **Materialize derived entries (adt-flow).** Derived entries carry real
   base/head version references, so checkout materializes them like exact
   entries while recording each derived component in a new additive
   `derived` result list — derived content is covered by real historical
   versions but is never silently presented as scope-attributed provenance.
3. **Class companion guard (adt-flow).** A repository object whose `main`
   component entry exists but is not materializable must not emit include
   fragments: the whole group is skipped and the main component's diagnostic
   is reported. Objects that never discovered a `main` component keep their
   current behavior.

## Constraints honored

- Immutable history only: derivation never reads mutable active source and
  never concatenates method bodies (per `fix-cts-class-coverage`).
- Exactness semantics unchanged: `exact: true` still requires in-scope
  transport-attributed base/head provenance.
- Additive report surface only (issue 15 keeps the JSON contract).

## Validation

- Manifest regressions: for each of `CINC`, `CLSD`, `CPRI`, `METH` leaves
  resolved to a CLAS owner with mixed feeds (changed include in scope,
  unchanged siblings out of scope), unchanged siblings materialize as derived
  entries; a feed with only post-boundary versions and an empty feed stay
  explicit omissions; over-shooting versions beyond the head bound are
  excluded.
- Flow regressions: checkout materializes the full expected class file set
  (including unchanged includes) into the repository tree; the structured
  report lists derived components and matches the resulting tree; a class
  with a genuinely unavailable `main` component is skipped entirely with no
  orphan include fragments.
- No live SAP access required; synthetic feeds with object-level version ids.
