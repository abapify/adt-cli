# CINS/CPRO transport coverage: SNOTE instruction classification and class protected-section owner resolution

Import-completeness reports count `R3TR CINS` and `LIMU CPRO` leaves as
`OBJECT_TYPE_UNSUPPORTED` omissions, although neither is a missing-capability
case in the same sense as an unregistered workbench object:

- `R3TR CINS` is an SNOTE correction instruction downloaded with an `R3TR NOTE`
  object. It is not an ABAP repository object: ADT exposes no resource for it
  and abapGit has no serializer. It must be reported with a dedicated,
  actionable diagnostic instead of the generic unsupported code.
- `LIMU CPRO` is the protected section ("protected header") of an ABAP class.
  Like CLSD/CPUB/METH/CPRI/CINC it resolves to its `R3TR CLAS` owner; the
  existing immutable class source discovery and abapGit CLAS materialization
  then cover it without new serializers.

## Change

1. Add `CPRO` to the class-component workbench-type map (`CLAS/OSP`) so
   `resolveClassComponentOwnerName` resolves the leaf to the owning class.
   Existing tolerant wbtype matching keeps resolution safe if a system reports
   a different subtype code.
2. Add a dedicated `SNOTE_CORRECTION_INSTRUCTION` source-history diagnostic
   code. `R3TR CINS` manifest entries are emitted as unsupported with this
   diagnostic before any ADT discovery attempt, preserving the CTS identity in
   the inventory. The message states the SNOTE ownership and points at the
   actionable limitation (no ADT resource, no abapGit format).

## Validation

- Manifest regression: CPRO leaves canonicalize to `R3TR CLAS` and materialize
  through the standard class path; CINS entries carry the dedicated diagnostic
  with no metadata/source calls.
- Flow regression: the checkout skipped report shows the dedicated diagnostic
  for CINS while supported objects from the same transport still materialize —
  object-level results and the completeness report agree.
- No live SAP access required; synthetic transport leaves with real subtype
  strings.

Adjacent (out of scope, noted for follow-up): `R3TR NOTE` entries themselves
hit the generic `OBJECT_TYPE_UNSUPPORTED` diagnostic today and may deserve the
same dedicated classification.
