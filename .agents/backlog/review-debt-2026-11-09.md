# Review-debt backlog (collected 2026-11-09)

Unresolved review threads across merged/open PRs. Total: 36.

## PR #309 — 1 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/309

- **packages/adt-client/src/adapter.ts:606** (amazon-q-developer) — thread `PRRT_kwDOM80YYc61PbvQ`
  :stop_sign: **Logic Error**: `basicCredentials` is defined as `` `${username}:${password}` ``, which always produces a non-empty string (at minimum `":"`), so `basicCredentials ? 'present' : 'none'` w

## PR #308 — 1 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/308

- **packages/adt-mcp/tests/integration.test.ts:353** (coderabbitai) — thread `PRRT_kwDOM80YYc61N2J6`
  <!-- coderabbit-ai-generated:v1 -->  **<picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/major-16.svg" width="16" height="16" align="absmiddle" alt="">

## PR #306 — 2 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/306

- **packages/adt-cli/src/lib/commands/cts/search.ts:146** (codeant-ai) — thread `PRRT_kwDOM80YYc600Iis`
  **Suggestion:** With `--json`, this prints a human-readable banner to stdout before the JSON array, so consumers cannot parse the output as JSON. **Assessment:** 🟠 `Major` · 🔁 `Occurrence: Sometime

- **packages/adt-mcp/src/bin/adt-mcp-http.ts:128** (codeant-ai) — thread `PRRT_kwDOM80YYc600I5u`
  **Suggestion:** Passing an empty value, such as `--host ""`, stores `''`; Node binds an unspecified address, making the default unauthenticated server reachable off-loopback. **Assessment:** 🔴 `Crit

## PR #293 — 1 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/293

- **packages/acds/dist/index.d.mts:743** (amazon-q-developer) — thread `PRRT_kwDOM80YYc6zWQSI`
  :stop_sign: **Logic Error**: `ParseResult` is exported as a value rather than a type re-export. Every other interface in the export statement uses `type` (e.g., `type AbstractEntityDefinition`, `type

## PR #285 — 25 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/285

- **packages/speci/src/rest/server/create-server.ts:null** (amazon-q-developer) — thread `PRRT_kwDOM80YYc6y3O9E`
  :stop_sign: **Merge Conflict**: Unresolved Git conflict markers (`<<<<<<< HEAD`, `=======`, `>>>>>>>`) remain in the `createServer` function body. This file will fail to compile and the exported `crea

- **packages/speci/src/rest/server/create-server.ts:null** (greptile-apps) — thread `PRRT_kwDOM80YYc6y3SCQ`
  <a href="#"><img alt="P1" src="https://greptile-static-assets.s3.amazonaws.com/badges/p1.svg?v=9" align="top"></a> **Server code cannot build** `createServer` contains unresolved merge markers in bot

- **packages/adt-plugin-abapgit/tests/schemas/idoc.test.ts:null** (greptile-apps) — thread `PRRT_kwDOM80YYc6y3SCU`
  <a href="#"><img alt="P1" src="https://greptile-static-assets.s3.amazonaws.com/badges/p1.svg?v=9" align="top"></a> **Schema tests cannot load** Both `idoc.test.ts` and `styl.test.ts` already import `

- **.commandcode/settings.json:4** (codeant-ai) — thread `PRRT_kwDOM80YYc6y3T5p`
  **Suggestion:** This wildcard pre-approves every `git` command, including destructive commands and remote pushes, allowing repository changes or publication without command-specific confirmation. **A

- **packages/adt-mcp/src/lib/flow-workspace.ts:40** (sourcery-ai) — thread `PRRT_kwDOM80YYc6y3UER`
  **🟠 High · Workspace writes escape allowed root** When a process able to modify the workspace’s parent swaps the directory for an external symlink after the final MCP validation and before a write,

- **packages/adt-client/src/adapter.ts:442** (sourcery-ai) — thread `PRRT_kwDOM80YYc6y3UEb`
  **🟡 Medium · Sensitive request bodies remain in logs** When verbose logging is enabled and a request body contains sensitive data, verbose requests with sensitive body fields still send body values

- **packages/adt-contracts/scripts/generate-schemas.ts:37** (sourcery-ai) — thread `PRRT_kwDOM80YYc6y3UEs`
  **🟡 Medium · Generated files vary by locale** When names collate differently under the default locales or ICU data used by generation environments, `xmlSchemaNames`, `jsonSchemaNames`, and `schemaIm

- **packages/adt-flow/src/service.ts:81** (codeant-ai) — thread `PRRT_kwDOM80YYc6y3XeW`
  **Suggestion:** This reorders caller-supplied transports before ADK’s first-win resolver; when multiple transports contain the same object, the selected source transport can change. **Assessment:** �

- **.agents/skills/herdr-throwaway-repro/SKILL.md:181** (coderabbitai) — thread `PRRT_kwDOM80YYc6y3Zi7`
  <!-- coderabbit-ai-generated:v1 -->  **<picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/major-16.svg" width="16" height="16" align="absmiddle" alt="">

- **.agents/skills/triage/SKILL.md:10** (coderabbitai) — thread `PRRT_kwDOM80YYc6y3ZjB`
  <!-- coderabbit-ai-generated:v1 -->  **<picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/amber-16.svg" width="16" height="16" align="absmiddle" alt="">

- **.commandcode/settings.json:4** (coderabbitai) — thread `PRRT_kwDOM80YYc6y3ZjI`
  <!-- coderabbit-ai-generated:v1 -->  **<picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/major-16.svg" width="16" height="16" align="absmiddle" alt="">

- **packages/adt-mcp/src/lib/flow-workspace.ts:14** (coderabbitai) — thread `PRRT_kwDOM80YYc6y3ZjM`
  <!-- coderabbit-ai-generated:v1 -->  **<picture><img src="https://storage.googleapis.com/coderabbit_public_assets/review-comment-icons-v1/amber-16.svg" width="16" height="16" align="absmiddle" alt="">

- **packages/adt-mcp/src/lib/flow-workspace.ts:40** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aNx`
  <!-- cubic:v=175c1d96-e159-4bfc-87f9-0a19309ca09a --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":7} --> P1: Keep the checked workspace directory pinned

- **packages/openai-codegen/tests/emit-types-interface.test.ts:336** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aN3`
  <!-- cubic:v=36b4cddc-7281-42b9-bd25-5baed8a0cd0f --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":10} --> P2: This assertion makes the following diagnost

- **packages/ts-xsd/src/codegen/ts-morph.ts:635** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aN_`
  <!-- cubic:v=3f1490e0-fb84-4e05-bc1d-103fcc269271 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P2: This comparator makes generated import order

- **packages/adk/src/objects/cts/transport-import.ts:475** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOK`
  <!-- cubic:v=787e21ac-67e8-41b9-bec9-a2969863ede2 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P2: This change makes `getObjectTypes()` orderin

- **.agents/skills/herdr-pre-release-audit/references/pre-release-audit.md:81** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOU`
  <!-- cubic:v=c1534616-641e-4892-82c7-5422e1bc4318 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":10} --> P2: This Herdr-only audit cannot run in the rep

- **packages/adt-codegen/src/plugins/generate-contracts.ts:504** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOa`
  <!-- cubic:v=4ac99679-3a3a-49ef-99bb-0755d5b33fa2 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P2: These comparators make generated artifacts d

- **packages/adt-mcp/src/lib/flow-workspace.ts:35** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOd`
  <!-- cubic:v=b30918a8-e045-4d81-9e72-08070d1dcfd7 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":10} --> P2: This traversal guard normalizes the input b

- **packages/adt-contracts/scripts/generate-schemas.ts:37** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOn`
  <!-- cubic:v=69c2c65b-b5ae-4ffa-b11d-8756e30e46eb --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":8} --> P2: This makes schema generation depend on the h

- **.commandcode/settings.json:4** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aOw`
  <!-- cubic:v=93274ad4-ee4e-488b-ba06-3761863b6818 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":8} --> P2: These wildcard allows auto-approve every Her

- **skills-lock.json:8** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aO2`
  <!-- cubic:v=13c39e3a-e24f-4208-a1a8-9ed07490338e --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P2: `skills-lock.json` records stale hashes for

- **.agents/skills/herdr-throwaway-repro/SKILL.md:31** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aO_`
  <!-- cubic:v=1beda299-3a0d-4d58-9532-e2900482d6fb --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":10} --> P3: This guard does not stop the workflow when

- **packages/adt-client/src/adapter.ts:441** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aPI`
  <!-- cubic:v=14fc1728-9e2b-41e0-ab69-f36fe5a42901 --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P3: `localeCompare` without an explicit locale m

- **packages/adt-contracts/scripts/generate-schemas.ts:37** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6y3aPR`
  <!-- cubic:v=67c3c2b2-1ed1-4293-bbe2-a779542c5b7d --> <!-- cubic:review-run=8ca32662-0752-5248-86d9-9c3ce34a72b3 --> <!-- metadata:{"confidence":9} --> P3: This generator change leaves the checked-in

## PR #277 — 4 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/277

- **packages/adt-services/src/services/import/service.ts:null** (greptile-apps) — thread `PRRT_kwDOM80YYc6yHGPf`
  <a href="#"><img alt="P2" src="https://greptile-static-assets.s3.amazonaws.com/badges/p2.svg?v=9" align="top"></a> **Same class imported repeatedly** Each accepted class leaf now triggers a separate

- **packages/adt-services/src/services/import/service.ts:null** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6yHLbF`
  <!-- cubic:v=b392ff92-9062-4673-9542-f89fa9c21738 --> <!-- cubic:review-run=9924921f-cab8-50ab-af43-567b235258bb --> <!-- metadata:{"confidence":9} --> P2: This new support path lets missing class lea

- **packages/adk/src/objects/cts/transport-object-owner.ts:null** (sourcery-ai) — thread `PRRT_kwDOM80YYc6yH2o3`
  **🟡 Medium · Interface methods resolve as classes** When a LIMU/METH interface-method reference has no `wbtype` and no class URI, `hasMatchingWorkbenchType` accepts a missing workbench type, and `cl

- **packages/adt-services/src/services/import/service.ts:null** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6yH-Ro`
  <!-- cubic:v=4529dee3-66ff-498f-92a6-0397b69dc4bf --> <!-- cubic:review-run=33976dba-0b15-516b-a466-1a5f20382e38 --> <!-- metadata:{"confidence":10} --> P3: This logs every missing-owner leaf with the

## PR #269 — 2 open thread(s)

Link: https://github.com/abapify/adt-cli/pull/269

- **nx.json:65** (cubic-dev-ai) — thread `PRRT_kwDOM80YYc6xyIX9`
  <!-- cubic:v=4f58b520-0c6b-49ac-a2bb-60fea59c40e2 --> <!-- cubic:review-run=fcfed4c4-cb24-5bb9-8b33-1fcf9c07ccbb --> <!-- metadata:{"confidence":10} --> P2: This change makes the p2-cli README’s publi

- **nx.json:42** (greptile-apps) — thread `PRRT_kwDOM80YYc6xyIz8`
  <a href="#"><img alt="P2" src="https://greptile-static-assets.s3.amazonaws.com/badges/p2.svg?v=9" align="top"></a> **Publishing instructions no longer work** `tools/p2-cli/README.md` still tells main
