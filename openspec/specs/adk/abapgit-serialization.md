# abapGit Format Plugin - Serialization Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-11-09

## Overview

This specification defines the serialization and deserialization capabilities for the `@abapify/abapgit` format plugin. The plugin enables conversion between ADK (ABAP Development Kit) object representation and abapGit file format.

## Objectives

1. Implement `FormatPlugin` interface for abapGit format
2. Serialize ADK objects to abapGit file structure
3. Deserialize abapGit files to ADK objects
4. Support standard ABAP object types (Class, Interface, Program, etc.)
5. Generate valid abapGit XML metadata

## Background

### abapGit Format

abapGit is an open-source Git client for ABAP, storing ABAP objects as XML metadata and source code files:

```
project-root/
├── .abapgit.xml           # Project configuration
└── src/
    └── package_name/
        ├── object.type.xml    # Metadata
        └── object.type.abap   # Source code
```

### ADK Object Model

ADK (ABAP Development Kit) provides a unified object model. See [ADK Architecture Overview](../architecture/adk-overview.md) for details.

```typescript
interface AdkObject {
  readonly kind: string; // 'Class', 'Interface', 'Domain'
  readonly name: string; // 'ZCL_TEST', 'ZIF_TEST'
  readonly type: string; // 'CLAS/OC', 'INTF/OI'
  readonly description?: string;

  toAdtXml(): string; // Serialize to ADT XML
}

// Each object has a type-specific spec
interface Class extends AdkObject {
  spec: ClassSpec;
}

interface ClassSpec {
  core: AdtCoreAttributes; // Name, package, description
  class: ClassAttrs; // Class-specific attributes
  include?: ClassInclude[]; // Segments (locals_def, locals_imp, etc.)
  source: AbapSourceAttributes;
}

interface ClassInclude {
  includeType:
    | 'definitions'
    | 'implementations'
    | 'macros'
    | 'testclasses'
    | 'main';
  sourceUri?: string; // Link to source content
  content?: LazyContent; // Lazy-loaded source
}

type LazyContent = string | (() => Promise<string>);
```

## Requirements

### Functional Requirements

#### FR1: FormatPlugin Interface Implementation

The plugin MUST implement the `FormatPlugin` interface:

```typescript
interface FormatPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  serialize(
    objects: AdkObject[],
    targetPath: string,
    options?: SerializeOptions,
  ): Promise<SerializeResult>;

  deserialize(
    sourcePath: string,
    options?: DeserializeOptions,
  ): Promise<AdkObject[]>;

  getSupportedObjectTypes(): string[];
}
```

#### FR2: Serialization

**Input:** Array of ADK objects  
**Output:** abapGit file structure

The serializer MUST:

- Create directory structure: `src/<package>/`
- Generate `.xml` metadata files
- Generate `.abap` source code files
- Create root `.abapgit.xml` configuration
- Use lowercase filenames
- Use correct file extensions per object type

**Object Type Mapping:**

| ADK Kind      | abapGit Extension | Files                                                                                                                                              |
| ------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Class         | `clas`            | `name.clas.xml`, `name.clas.abap`, `name.clas.locals_def.abap`, `name.clas.locals_imp.abap`, `name.clas.macros.abap`, `name.clas.testclasses.abap` |
| Interface     | `intf`            | `name.intf.xml`, `name.intf.abap`                                                                                                                  |
| Program       | `prog`            | `name.prog.xml`, `name.prog.abap`                                                                                                                  |
| FunctionGroup | `fugr`            | `name.fugr.xml`, `name.fugr.abap`                                                                                                                  |
| Table         | `tabl`            | `name.tabl.xml`                                                                                                                                    |
| DataElement   | `dtel`            | `name.dtel.xml`                                                                                                                                    |
| Domain        | `doma`            | `name.doma.xml`                                                                                                                                    |

**Class Segments:**

Classes support multiple segments (includes) based on `ClassInclude.includeType`:

| Include Type      | File Extension           | Description                              |
| ----------------- | ------------------------ | ---------------------------------------- |
| `main`            | `.clas.abap`             | Main class definition and implementation |
| `definitions`     | `.clas.locals_def.abap`  | Local class definitions                  |
| `implementations` | `.clas.locals_imp.abap`  | Local class implementations              |
| `macros`          | `.clas.macros.abap`      | Macro definitions                        |
| `testclasses`     | `.clas.testclasses.abap` | Test class definitions                   |

Reference: [SAP ABAP File Formats - CLAS](https://github.com/SAP/abap-file-formats/tree/main/file-formats/clas)

#### FR3: Deserialization

**Input:** abapGit directory structure  
**Output:** Array of ADK objects

The deserializer MUST:

- Read `.abapgit.xml` configuration
- Scan source folders for objects
- Parse XML metadata files
- Read source code files
- Group files by object
- Convert to ADK object model

#### FR4: Metadata Generation

XML metadata MUST follow abapGit format:

```xml
<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>CLASS_NAME</CLSNAME>
    <LANGU>E</LANGU>
    <DESCRIPT>Description</DESCRIPT>
    <STATE>1</STATE>
    <CLSCCINCL>X</CLSCCINCL>
    <FIXPT>X</FIXPT>
    <UNICODE>X</UNICODE>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
```

#### FR5: Root Configuration

`.abapgit.xml` MUST contain:

```xml
<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
 <asx:values>
  <DATA>
   <MASTER_LANGUAGE>E</MASTER_LANGUAGE>
   <STARTING_FOLDER>/src/</STARTING_FOLDER>
   <FOLDER_LOGIC>PREFIX</FOLDER_LOGIC>
   <IGNORE>
    <item>/.gitignore</item>
    <item>/LICENSE</item>
    <item>/README.md</item>
   </IGNORE>
  </DATA>
 </asx:values>
</asx:abap>
```

### Non-Functional Requirements

#### NFR1: Performance

- Serialize 100 objects in < 5 seconds
- Deserialize 100 objects in < 5 seconds

#### NFR2: Error Handling

- Validate input objects before serialization
- Provide detailed error messages
- Continue processing on individual object failures
- Return partial results with error list

#### NFR3: Compatibility

- Support Node.js 18+
- Compatible with abapGit v1.x format
- No external system dependencies

## Architecture

### Component Structure

```
@abapify/abapgit/
├── src/
│   ├── index.ts                 # Public exports
│   └── lib/
│       ├── abapgit.ts          # Main plugin class
│       ├── serializer.ts       # Serialization logic
│       ├── deserializer.ts     # Deserialization logic
│       ├── xml-generator.ts    # XML metadata generation
│       └── types.ts            # Type definitions
```

### Class Design

```typescript
export class AbapGitPlugin implements FormatPlugin {
  readonly name = 'abapGit';
  readonly version = '1.0.0';
  readonly description = 'abapGit project reader and parser';

  private serializer: AbapGitSerializer;
  private deserializer: AbapGitDeserializer;

  async serialize(
    objects: AdkObject[],
    targetPath: string,
    options?: SerializeOptions,
  ): Promise<SerializeResult>;

  async deserialize(
    sourcePath: string,
    options?: DeserializeOptions,
  ): Promise<AdkObject[]>;

  getSupportedObjectTypes(): string[];
}
```

## Lazy Loading Implementation

### Overview

Class segments (includes) support lazy loading to optimize memory usage and performance. Content can be loaded on-demand rather than fetching all segments upfront.

### LazyContent Type

```typescript
type LazyContent = string | (() => Promise<string>);
```

- **Immediate:** Content is already available as a string
- **Lazy:** Content is loaded via async function when needed

### Content Resolution

```typescript
async function resolveContent(lazy: LazyContent): Promise<string> {
  if (typeof lazy === 'string') {
    return lazy;
  }
  return await lazy();
}
```

### Usage in Serialization

```typescript
// In AbapGitSerializer
async serializeClass(classObj: AdkObject): Promise<void> {
  const spec = classObj.spec as ClassSpec;

  // Serialize main class file
  if (spec.include) {
    for (const include of spec.include) {
      if (include.content) {
        // Resolve lazy content
        const content = await resolveContent(include.content);

        // Write to file
        const filename = `${classObj.name.toLowerCase()}.clas.${include.includeType}.abap`;
        await writeFile(filename, content);
      }
    }
  }
}
```

### Benefits

1. **Memory Efficiency:** Only load segments when needed
2. **Performance:** Skip unused segments
3. **Flexibility:** Support both immediate and deferred loading
4. **Backward Compatible:** Existing code with immediate strings still works

## Implementation Plan

### Phase 1: Core Serialization

1. Implement `AbapGitSerializer` class
2. Directory structure creation
3. File naming conventions
4. Basic XML generation
5. Source code file writing

### Phase 2: Metadata Generation

1. Implement `XmlGenerator` class
2. Object-type-specific metadata
3. Root `.abapgit.xml` generation
4. XML escaping and formatting

### Phase 3: Deserialization

1. Implement `AbapGitDeserializer` class
2. File scanning and grouping
3. XML parsing
4. ADK object construction

### Phase 4: Plugin Integration

1. Update `AbapGitPlugin` class
2. Implement `FormatPlugin` interface
3. Wire up serializer and deserializer
4. Add `getSupportedObjectTypes()`

### Phase 5: Testing

1. Unit tests for serializer
2. Unit tests for deserializer
3. Integration tests
4. Format validation tests

## Testing Strategy

### Unit Tests

**Serializer Tests:**

- Empty object list
- Single object serialization
- Multiple objects in same package
- Multiple packages
- Objects without source code
- XML escaping
- Error handling

**Deserializer Tests:**

- Empty directory
- Single object
- Multiple objects
- Missing files
- Invalid XML
- Error handling

### Integration Tests

- Round-trip: serialize → deserialize → compare
- Real abapGit project import
- Large project (100+ objects)
- Performance benchmarks

## Dependencies

- `fast-xml-parser` - XML parsing and generation
- Node.js `fs` - File system operations
- Node.js `path` - Path manipulation

## Security Considerations

- Validate file paths to prevent directory traversal
- Sanitize XML content to prevent injection
- Limit file sizes to prevent DoS
- No execution of external commands

## Future Enhancements

1. Support for additional object types
2. Incremental serialization (only changed objects)
3. Compression support
4. Custom metadata templates
5. Validation against abapGit schema

## References

- [abapGit Documentation](https://docs.abapgit.org/)
- [abapGit File Format](https://docs.abapgit.org/guide-file-formats.html)
- [ADK Object Model](../adk/object-model.md)

## Appendix

### Example Serialization

**Input ADK Object:**

```typescript
{
  kind: 'Class',
  metadata: {
    name: 'ZCL_EXAMPLE',
    description: 'Example class',
    package: 'ZTEST'
  },
  source: 'CLASS zcl_example DEFINITION PUBLIC.\nENDCLASS.'
}
```

**Output Structure:**

```
output/
├── .abapgit.xml
└── src/
    └── ztest/
        ├── zcl_example.clas.xml
        └── zcl_example.clas.abap
```

### Supported Object Types (Initial)

- Class (CLAS)
- Interface (INTF)
- Program (PROG)
- Function Group (FUGR)
- Table (TABL)
- Data Element (DTEL)
- Domain (DOMA)
- Package (DEVC)
