# Epic \_Template

> Copy this file to `epics/eXX-name.md` and fill in every section.
> The mega-agent reviews this; the spawned Devin session executes it.

## Mission

One sentence. What capability ships when this epic lands.

## Why

Value, urgency, what gaps it closes, what dependencies it unblocks.

## Dependencies

- Blocked by: `eXX-...` (or "none")
- Blocks: `eXX-...`

## References

- sapcli reference: `tmp/sapcli-ref/sapcli/sap/cli/<file>.py` (line ranges)
- sapcli ADT layer: `tmp/sapcli-ref/sapcli/sap/adt/<file>.py`
- sapcli fixtures: `tmp/sapcli-ref/sapcli/test/unit/fixtures_*<area>.py`
- Our existing surface: `packages/<pkg>/...`
- ADT XSD reference (if SAP downloads): `e2e/adt-sdk/extracted/schemas/xsd/<file>.xsd`

## Scope — files

### Add

```
packages/<pkg>/src/...
packages/adt-cli/src/lib/commands/...
packages/adt-mcp/src/lib/tools/...
packages/adt-fixtures/src/fixtures/...
packages/adt-contracts/src/adt/...
packages/adt-schemas/.xsd/custom/...   # only if new endpoint
```

### Modify

```
packages/<pkg>/src/...
```

### Delete

- (usually none)

## Out of scope

- Things deliberately excluded so the agent doesn't sprawl.
- Cross-references to other epics that own this work.

## Tests

- Unit: `packages/<pkg>/tests/...`
- Contract scenarios: `packages/adt-contracts/tests/contracts/<area>.test.ts`
- CLI+MCP parity: `packages/adt-cli/tests/e2e/parity.<area>.test.ts`
- MCP integration: `packages/adt-mcp/tests/integration.test.ts` (or new file)

Expected pass counts:

- Unit: ≥ N tests
- Contract: ≥ N tests
- Parity: ≥ N tests

## Acceptance

```bash
bunx nx run-many -t build -p <touched-packages>
bunx nx run-many -t test -p <touched-packages>
bunx nx typecheck
bunx nx lint
bunx nx format:write
```

All green. Pre-existing failures (`object-uri.test.ts`, devc/diff TypedSchema variance) are out of scope — agent must verify these are pre-existing via `git stash`.

## Devin prompt

> Paste this verbatim as the opening message of a fresh Devin session.

```
Repo: github.com/abapify/adt-cli, branch pr-103.

Read these files first:
- /mnt/wsl/workspace/ubuntu/adt-cli/AGENTS.md
- /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/README.md
- /mnt/wsl/workspace/ubuntu/adt-cli/docs/roadmap/epics/eXX-NAME.md   ← THIS FILE IS YOUR ENTIRE SPEC

Implement everything in the "Scope" section. Stay strictly within "Out of scope" boundaries.
Run the full Acceptance block before declaring done.
Do NOT commit unless explicitly approved by the operator.

If you encounter blockers (missing contract, undecided design choice), document them in
docs/roadmap/epics/eXX-NAME.md under a new "Open questions" section and stop — don't guess.

Reference implementation lives at /tmp/sapcli-ref/sapcli/ (clone if missing:
git clone --depth 1 https://github.com/jfilak/sapcli.git /tmp/sapcli-ref/sapcli).
```

## Open questions

_(Blank by default. Append here if blocked.)_
