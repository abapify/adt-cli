---
title: abapGit format plugin
sidebar_position: 1
---

# abapGit format plugin

Package: [`@abapify/adt-plugin-abapgit`](../sdk/packages/adt-plugin-abapgit) ·
format name: `abapgit`

The reference implementation of the [`FormatPlugin`](../sdk/packages/adt-plugin)
interface. Serializes ADK objects to and from the classic
[abapGit](https://docs.abapgit.org/) on-disk layout (`.abap` + `.xml`), driven
by [XSD schemas](../sdk/packages/ts-xsd) generated into typed parsers and
builders.

## When to use it

- You want the exact layout that open-source abapGit clients produce — suitable
  for round-tripping with an existing abapGit repository.
- You prefer XML metadata validated by formal XSDs (you can run
  `xmllint --schema xsd/intf.xsd file.intf.xml`).
- Your CI already knows how to read abapGit trees.

If your workspace is gCTS / SAP AFF (`abap-file-formats`), use
[`@abapify/adt-plugin-gcts`](./gcts-format) instead — same ADK, different
file layout.

## Installation

```bash
bun add @abapify/adt-plugin-abapgit
```

The plugin self-registers on import. The CLI `import` command auto-resolves
`--format abapgit`; no `adt.config.ts` entry is required.

```bash
bunx adt import package ZMY_PKG ./out --format abapgit
bunx adt export --source ./out --format abapgit --transport DEVK900042
bunx adt checkin ZCL_MYCLASS --format abapgit
```

## Filename convention

Files live under a package folder (recursed from the root package). Each object
contributes one metadata XML and, if applicable, one or more source `.abap`
files.

| Object kind             | Metadata XML        | Source file(s)                                                                                                       |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Class (`CLAS`)          | `zcl_foo.clas.xml`  | `zcl_foo.clas.abap`, `.clas.locals_def.abap`, `.clas.locals_imp.abap`, `.clas.testclasses.abap`, `.clas.macros.abap` |
| Interface (`INTF`)      | `zif_foo.intf.xml`  | `zif_foo.intf.abap`                                                                                                  |
| Program (`PROG`)        | `zfoo.prog.xml`     | `zfoo.prog.abap`                                                                                                     |
| Function group (`FUGR`) | `zfg_foo.fugr.xml`  | Includes/FMs serialized separately under the group                                                                   |
| Data element (`DTEL`)   | `zde_foo.dtel.xml`  | —                                                                                                                    |
| Domain (`DOMA`)         | `zdo_foo.doma.xml`  | —                                                                                                                    |
| Table (`TABL`)          | `ztab_foo.tabl.xml` | —                                                                                                                    |
| Table type (`TTYP`)     | `ztt_foo.ttyp.xml`  | —                                                                                                                    |
| Package (`DEVC`)        | `package.devc.xml`  | —                                                                                                                    |
| CDS DDLS (`DDLS`)       | `zview.ddls.xml`    | `zview.ddls.asddls` (plain-text ABAP CDS source)                                                                     |
| CDS DCLS (`DCLS`)       | `zrole.dcls.xml`    | `zrole.dcls.asdcls`                                                                                                  |

The **include suffix** pattern (`.clas.locals_def.abap`, `.clas.testclasses.abap`)
is part of the standard and required for abapGit compatibility. Handlers in the
plugin encode these via their `getSources()` definition.

## Internals

```text
XSD (xsd/*.xsd)
  └─ ts-xsd codegen → typed schemas (src/schemas/generated/)
       └─ used by handlers via createHandler({ schema, ... })

Handler (src/lib/handlers/objects/<type>.ts)
  ├─ toAbapGit(adkObject)   → object literal matching schema._values
  ├─ getSource / getSources → plain-text / ABAP files
  └─ xmlFileName (optional) → override default naming

Registry (src/lib/handlers/registry.ts)
  └─ createHandler() auto-registers with @abapify/adt-plugin
```

Handlers are tiny mappings — they never touch the filesystem or the ADT client.
The CLI (for import) or `@abapify/adt-export` (for export) walks objects,
invokes handlers, and writes/reads the resulting files.

See the package [AGENTS.md](https://github.com/abapify/adt-cli/blob/main/packages/adt-plugin-abapgit/AGENTS)
for the XSD authoring rules and the handler template.

## Extending with new object types

1. Add a payload TYPE XSD under `xsd/types/<name>.xsd` (type only, no element).
2. Add a concrete document XSD `xsd/<type>.xsd` with exactly one root element
   `abapGit`.
3. Register the XSD in `ts-xsd.config.ts` and run
   `bunx nx codegen adt-plugin-abapgit`.
4. Create `src/lib/handlers/objects/<type>.ts` using the `createHandler(...)`
   factory.
5. Export it from `registry.ts`.
6. Add a fixture under `tests/fixtures/` and a handler test.

Full walkthrough in [writing a format plugin](./writing-format-plugin).

## Troubleshooting

- **"No handler registered for type X"** — the object type has no handler; add
  one as described above or file an issue.
- **XML does not validate against XSD** — run `xmllint --schema xsd/<type>.xsd
<file>.xml --noout`; the error tells you which field or attribute is wrong.
- **Round-trip mismatch (export then import)** — check that `toAbapGit()` emits
  every field the parser expects; missing optional fields default to empty
  strings in XSD `<xs:all>` groups.
