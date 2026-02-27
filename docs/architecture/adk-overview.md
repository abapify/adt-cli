# ADK (ABAP Development Kit) Architecture Overview

**Version:** 1.0.0  
**Last Updated:** 2025-11-09  
**Status:** Active

## Purpose

ADK provides an abstract, type-safe representation of ABAP objects that is completely independent of:

- ADT (ABAP Development Tools) Client
- File system operations
- Format-specific serialization
- CLI tooling

**Key Principle:** ADK is the single source of truth for ABAP object representation in abapify.

## Core Concepts

### 1. ADK Object

The base interface for all ABAP objects:

```typescript
// packages/adk/src/base/adk-object.ts
interface AdkObject {
  readonly kind: string; // 'Class', 'Interface', 'Domain'
  readonly name: string; // 'ZCL_TEST', 'ZIF_TEST'
  readonly type: string; // 'CLAS/OC', 'INTF/OI', 'DOMA/DD'
  readonly description?: string;

  toAdtXml(): string; // Serialize to ADT XML format
}
```

### 2. Object Specifications (Specs)

Each object type has a corresponding `Spec` class that contains type-specific metadata and structure:

```typescript
// Example: ClassSpec
class ClassSpec extends OoSpec {
  class: ClassAttrs; // Class-specific attributes
  include?: ClassInclude[]; // Segments/includes

  // Inherited from OoSpec:
  core: AdtCoreAttributes; // Name, description, package
  links: AtomLink[]; // Navigation links
  source: AbapSourceAttributes; // Source metadata
  oo: AbapOOAttributes; // OO-specific metadata
}
```

### 3. Segments/Includes

ABAP objects can have multiple segments (also called includes). For example, a Class has:

```typescript
interface ClassInclude {
  includeType: IncludeType; // Type of segment
  sourceUri?: string; // Link to source content
  name?: string; // Include name
  core?: AdtCoreAttributes; // Metadata
  links?: AtomLink[]; // Navigation
}

type IncludeType =
  | 'definitions' // Local class definitions
  | 'implementations' // Local class implementations
  | 'macros' // Macro definitions
  | 'testclasses' // Test classes
  | 'main'; // Main class definition
```

**Mapping to abapGit Files:**

```
includeType: 'main'             → zcl_example.clas.abap
includeType: 'definitions'      → zcl_example.clas.locals_def.abap
includeType: 'implementations'  → zcl_example.clas.locals_imp.abap
includeType: 'macros'           → zcl_example.clas.macros.abap
includeType: 'testclasses'      → zcl_example.clas.testclasses.abap
```

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Format Plugins (@abapify/abapgit, @abapify/oat)            │
│ - Serialize ADK → Files                                     │
│ - Deserialize Files → ADK                                   │
│ - NO direct ADT Client access                               │
│ - NO file I/O outside serialize/deserialize                 │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│ ADK Objects (@abapify/adk)                                  │
│ - Abstract representation                                    │
│ - Type-safe specs                                           │
│ - Segment/include support                                   │
│ - NO dependencies on client, CLI, or plugins                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│ ADK Factory (@abapify/adt-client)                           │
│ - Convert ADT responses → ADK objects                       │
│ - Handle lazy loading of segments                           │
│ - Type-specific factories                                   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│ ADT Client (@abapify/adt-client)                            │
│ - Communicate with SAP ADT API                              │
│ - Fetch object metadata and source                          │
│ - Return raw ADT responses                                  │
└─────────────────────────────────────────────────────────────┘
```

## Object Model

### Base Hierarchy

```
AdkObject (interface)
  ↓
BaseObject (abstract class)
  ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Class     │  Interface  │   Domain    │   Program   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Spec Hierarchy

```
BaseSpec
  ↓
OoSpec (Object-Oriented base)
  ↓
┌─────────────┬─────────────┐
│  ClassSpec  │  IntfSpec   │
└─────────────┴─────────────┘

BaseSpec
  ↓
DdicSpec (Data Dictionary base)
  ↓
┌─────────────┬─────────────┐
│  DomainSpec │  DataElement│
└─────────────┴─────────────┘
```

## Namespaces

ADK uses XML namespaces to organize attributes:

```typescript
// adtcore - Core ADT attributes
namespace: 'http://www.sap.com/adt/core'
attributes: name, description, package, responsible, createdAt, changedAt

// abapsource - Source code metadata
namespace: 'http://www.sap.com/adt/abapsource'
attributes: sourceUri, fixPointArithmetic, activeUnicodeCheck

// abapoo - Object-Oriented metadata
namespace: 'http://www.sap.com/adt/oo'
attributes: modeled, proxy, category

// class - Class-specific
namespace: 'http://www.sap.com/adt/oo/classes'
attributes: final, abstract, visibility, category

// atom - Atom feed links
namespace: 'http://www.w3.org/2005/Atom'
elements: link (with rel, href, type)
```

## Factory Pattern

### ADK Factory Responsibility

The ADK Factory converts ADT responses to ADK objects:

```typescript
class AdkFactory {
  /**
   * Create ADK object from ADT response
   */
  createFromAdtObject(adtObject: AdtObject): AdkObject {
    // 1. Determine object kind
    const kind = this.mapAdtTypeToKind(adtObject.type);

    // 2. Get type-specific factory
    const factory = this.getFactory(kind);

    // 3. Create ADK object with spec
    return factory.create(adtObject);
  }

  /**
   * Create with lazy-loaded segments
   */
  createWithLazySegments(
    adtObject: AdtObject,
    segmentLoader: (uri: string) => Promise<string>,
  ): AdkObject {
    // Create object with lazy content loaders
  }
}
```

### Type-Specific Factories

```typescript
class ClassFactory {
  create(adtObject: AdtObject): Class {
    // 1. Parse ClassSpec from ADT XML
    const spec = ClassSpec.fromXMLString(adtObject.xml);

    // 2. Create Class instance
    const classObj = new Class();
    classObj.spec = spec;

    // 3. Set up lazy loading for includes
    if (spec.include) {
      for (const include of spec.include) {
        include.content = () => this.loadIncludeContent(include.sourceUri);
      }
    }

    return classObj;
  }
}
```

## Lazy Loading

### Concept

Segments/includes can be loaded lazily to improve performance:

```typescript
type LazyContent = string | (() => Promise<string>);

interface ClassInclude {
  includeType: IncludeType;
  sourceUri?: string;
  content?: LazyContent; // Can be immediate or lazy
}
```

### Usage

```typescript
// In format plugin
async function serializeClass(classObj: Class, outputDir: string) {
  // Main class file
  await writeFile(
    `${outputDir}/${classObj.name}.clas.abap`,
    classObj.spec.source.mainSource,
  );

  // Includes (lazy loaded)
  for (const include of classObj.spec.include) {
    // Resolve lazy content
    const content =
      typeof include.content === 'function'
        ? await include.content()
        : include.content;

    // Write segment file
    await writeFile(
      `${outputDir}/${classObj.name}.clas.${include.includeType}.abap`,
      content,
    );
  }
}
```

## Design Principles

### 1. Separation of Concerns

- **ADK:** Object representation only
- **ADT Client:** SAP communication only
- **Factory:** Conversion only
- **Plugins:** Serialization only

### 2. No Dependencies

ADK package has NO dependencies on:

- `@abapify/adt-client`
- `@abapify/adt-cli`
- Any format plugins
- File system operations

### 3. Type Safety

All objects are strongly typed:

```typescript
const classObj: Class = factory.createClass(adtResponse);
const spec: ClassSpec = classObj.spec;
const includes: ClassInclude[] = spec.include ?? [];
```

### 4. Extensibility

New object types can be added by:

1. Creating new Spec class
2. Creating factory
3. Registering in ObjectRegistry

## Usage Examples

### Creating ADK Objects

```typescript
// From ADT response
const factory = new AdkFactory();
const classObj = factory.createFromAdtObject(adtResponse);

// Access metadata
console.log(classObj.name); // 'ZCL_EXAMPLE'
console.log(classObj.spec.core.package); // 'ZTEST'

// Access includes
for (const include of classObj.spec.include) {
  console.log(include.includeType); // 'definitions', 'implementations', etc.
  const content = await resolveContent(include.content);
  console.log(content);
}
```

### Serializing to abapGit

```typescript
class AbapGitPlugin implements FormatPlugin {
  async serialize(objects: AdkObject[], targetPath: string) {
    for (const obj of objects) {
      if (obj.kind === 'Class') {
        await this.serializeClass(obj as Class, targetPath);
      }
    }
  }

  private async serializeClass(classObj: Class, targetPath: string) {
    const spec = classObj.spec;

    // Main file
    await this.writeMainFile(classObj, targetPath);

    // Segments
    for (const include of spec.include ?? []) {
      await this.writeIncludeFile(classObj, include, targetPath);
    }

    // Metadata XML
    await this.writeMetadataXml(classObj, targetPath);
  }
}
```

## Testing Strategy

### Unit Tests

Test each component in isolation:

```typescript
describe('ClassSpec', () => {
  it('should parse from ADT XML', () => {
    const xml = `<class:abapClass ...>...</class:abapClass>`;
    const spec = ClassSpec.fromXMLString(xml);
    expect(spec.core.name).toBe('ZCL_TEST');
    expect(spec.include).toHaveLength(4);
  });
});

describe('ClassFactory', () => {
  it('should create Class from ADT object', () => {
    const adtObject = {
      /* ... */
    };
    const classObj = factory.createClass(adtObject);
    expect(classObj.kind).toBe('Class');
    expect(classObj.spec).toBeInstanceOf(ClassSpec);
  });
});
```

### Integration Tests

Test full flow:

```typescript
describe('ADK Integration', () => {
  it('should convert ADT → ADK → abapGit', async () => {
    // 1. Get ADT response (mocked)
    const adtResponse = mockAdtResponse();

    // 2. Create ADK object
    const adkObj = factory.createFromAdtObject(adtResponse);

    // 3. Serialize to abapGit
    const result = await abapgitPlugin.serialize([adkObj], outputDir);

    // 4. Verify files
    expect(fs.existsSync(`${outputDir}/zcl_test.clas.abap`)).toBe(true);
    expect(fs.existsSync(`${outputDir}/zcl_test.clas.locals_def.abap`)).toBe(
      true,
    );
  });
});
```

## Migration Guide

### For Plugin Developers

**Before (❌ Wrong):**

```typescript
// Plugin reads files directly
class AbapGitPlugin {
  async readProject(path: string) {
    const files = fs.readdirSync(path);
    // Parse files manually
  }
}
```

**After (✅ Correct):**

```typescript
// Plugin works with ADK objects
class AbapGitPlugin implements FormatPlugin {
  async serialize(objects: AdkObject[], targetPath: string) {
    // Use ADK object properties
    for (const obj of objects) {
      const spec = obj.spec;
      // Serialize from spec
    }
  }
}
```

### For CLI Developers

**Before (❌ Wrong):**

```typescript
// CLI passes raw ADT data to plugins
const adtData = await adtClient.getObject(name, type);
await plugin.serialize(adtData, outputPath);
```

**After (✅ Correct):**

```typescript
// CLI creates ADK objects first
const adtData = await adtClient.getObject(name, type);
const adkObj = factory.createFromAdtObject(adtData);
await plugin.serialize([adkObj], outputPath);
```

## References

- [ADK Package](../../packages/adk/)
- [ClassSpec Implementation](../../packages/adk/src/namespaces/class/clas.ts)
- [ABAP File Formats](https://github.com/SAP/abap-file-formats)
- [ADT API Documentation](https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/index.htm?file=abenadt_api.htm)

## Changelog

| Date       | Version | Changes                            |
| ---------- | ------- | ---------------------------------- |
| 2025-11-09 | 1.0.0   | Initial architecture documentation |
