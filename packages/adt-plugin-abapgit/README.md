# @abapify/adt-plugin-abapgit

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin-abapgit)](https://www.npmjs.com/package/@abapify/adt-plugin-abapgit)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

abapGit format plugin for ADT — serializes ABAP objects to Git-compatible XML/ABAP files.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        adt-plugin-abapgit                           │
├─────────────────────────────────────────────────────────────────────┤
│  XSD Schemas (xsd/)          →  ts-xsd codegen  →  TypeScript types │
│  (XML structure definition)     (build time)       + parser/builder │
├─────────────────────────────────────────────────────────────────────┤
│  Object Handlers (handlers/)                                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │  CLAS   │ │  INTF   │ │  DEVC   │ │  DTEL   │ │  DOMA   │       │
│  │ handler │ │ handler │ │ handler │ │ handler │ │ handler │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       └──────────┬┴──────────┬┴──────────┬┴──────────┘             │
│                  ▼           ▼           ▼                          │
│            createHandler (factory)                                  │
│            - Auto-registration                                      │
│            - Default serialize logic                                │
│            - File naming conventions                                │
├─────────────────────────────────────────────────────────────────────┤
│  ADK Facade (@abapify/adk)                                          │
│  - AdkClass, AdkInterface, AdkPackage...                            │
│  - Client-agnostic object model                                     │
│  - Source code retrieval via getSource()/getIncludeSource()         │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. XSD Schemas as Single Source of Truth

**Why XSD?**

- XML Schema Definition (XSD) is the **industry standard** for XML structure validation
- Can be used **outside our tools** (e.g., `xmllint --schema intf.xsd file.xml`)
- Provides **formal contract** for abapGit XML format
- Enables **automated validation** in CI/CD pipelines

```bash
# Validate any abapGit XML file against our schema
xmllint --schema xsd/intf.xsd myinterface.intf.xml --noout
```

### 2. ts-xsd for Type-Safe XML Handling

**Why ts-xsd?**

Unlike typical XML codegen tools that only generate types, `ts-xsd` provides:

- **TypeScript types** with full type inference
- **XML parser** that returns typed objects
- **XML builder** that accepts typed objects
- **Schema object** for runtime validation

```typescript
// Generated from XSD - fully typed parse/build
import { intf } from './schemas/generated';

const data = intf.parse(xmlString); // → AbapGitIntf (typed)
const xml = intf.build(data); // → string (valid XML)
```

### 3. ADK as Client-Agnostic Facade

**Why not implement ADT client features in the plugin?**

The plugin **only consumes** the ADK facade:

- ADK handles all SAP communication details
- Plugin focuses purely on **serialization format**
- Same plugin works with any ADT client implementation
- Clear separation of concerns

```typescript
// Plugin receives ADK objects, doesn't care how they were fetched
getSources: (cls) =>
  cls.includes.map((inc) => ({
    suffix: ABAPGIT_SUFFIX[inc.includeType],
    content: cls.getIncludeSource(inc.includeType), // ADK handles this
  }));
```

### 4. Handlers Don't Touch File System

**Why delegate file operations to base class?**

Object handlers **only define mappings**:

- `toAbapGit()` - ADK data → abapGit XML structure
- `getSource()` / `getSources()` - which source files to create

The `createHandler` factory handles:

- File creation with correct naming
- XML building with proper envelope
- Promise resolution for async sources
- Empty content filtering

## Supported Object Types

| Type | Status | Handler   | Notes                                                                 |
| ---- | ------ | --------- | --------------------------------------------------------------------- |
| CLAS | ✅     | `clas.ts` | Multiple includes (main, locals_def, locals_imp, testclasses, macros) |
| INTF | ✅     | `intf.ts` | Single source file                                                    |
| DEVC | ✅     | `devc.ts` | Fixed filename `package.devc.xml`                                     |
| DTEL | ✅     | `dtel.ts` | Metadata only (no source)                                             |
| DOMA | ✅     | `doma.ts` | Custom serialize for fixed values                                     |

## File Structure

```
src/
├── zcl_example.clas.abap              # Main class source
├── zcl_example.clas.locals_def.abap   # Local type definitions
├── zcl_example.clas.locals_imp.abap   # Local implementations
├── zcl_example.clas.testclasses.abap  # Test classes
├── zcl_example.clas.xml               # Class metadata
├── zif_example.intf.abap              # Interface source
├── zif_example.intf.xml               # Interface metadata
├── ztest_dtel.dtel.xml                # Data element (no source)
├── ztest_doma.doma.xml                # Domain (no source)
└── package.devc.xml                   # Package definition
```

## Development

### Building

```bash
npx nx build adt-plugin-abapgit
```

### Testing

```bash
npx nx test adt-plugin-abapgit
```

### Regenerating Schemas

After modifying XSD files:

```bash
npx nx codegen adt-plugin-abapgit
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on:

- Adding new object type support
- XSD schema conventions
- Handler implementation patterns
- Testing requirements

## See Also

- [abapGit Documentation](https://docs.abapgit.org/)
- [@abapify/adt-plugin](../adt-plugin/README.md) - Plugin interface
- [@abapify/adk](../adk/README.md) - ABAP Development Kit
