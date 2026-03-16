# ADK Intelligent Object Factory Specification

## Overview

Extend ADK to provide intelligent object instantiation by integrating with ADT client. Objects are fetched and parsed from SAP system using minimal keys (object type + name), returning both type-agnostic metadata and object-specific serialization methods.

## Core Concept

```typescript
// Usage example
const factory = new AdkObjectFactory(adtClient);
const classObj = await factory.create('Class', 'ZCL_MY_CLASS');

// Generic interface (all objects)
console.log(classObj.kind); // 'Class'
console.log(classObj.name); // 'ZCL_MY_CLASS'
console.log(classObj.package); // 'ZPACKAGE'
console.log(classObj.description); // 'My test class'

// Object-specific interface
const localClasses = classObj.getLocalClasses();
const macros = classObj.getMacros();
const testClasses = classObj.getTestClasses();
```

## Architecture

### 1. Base ADK Object Interface

```typescript
interface AdkObjectBase {
  // Type-agnostic properties
  readonly kind: string;
  readonly name: string;
  readonly description: string;
  readonly package: string;
  readonly author?: string;
  readonly createdAt?: Date;
  readonly modifiedAt?: Date;
  readonly transportRequest?: string;

  // Core serialization method
  getSourceFiles(): Record<string, string>;

  // Metadata access
  getMetadata(): ObjectMetadata;
  getRawXml(): string;
}
```

### 2. Object-Specific Interfaces

```typescript
interface ClassObject extends AdkObjectBase {
  kind: 'Class';

  // Class-specific serialization methods
  getMainSource(): string;
  getLocalClasses(): string;
  getTestClasses(): string;
  getMacros(): string;
  getLocalDefinitions(): string;
  getLocalImplementations(): string;

  // Structural access
  getMethods(): ClassMethod[];
  getAttributes(): ClassAttribute[];
  getInterfaces(): string[];
  getSuperclass(): string | undefined;
}

interface InterfaceObject extends AdkObjectBase {
  kind: 'Interface';

  // Interface-specific serialization methods
  getMainSource(): string;

  // Structural access
  getMethods(): InterfaceMethod[];
  getTypes(): InterfaceType[];
}

interface DomainObject extends AdkObjectBase {
  kind: 'Domain';

  // Domain-specific serialization methods
  getDefinition(): string;

  // Structural access
  getDataType(): string;
  getLength(): number;
  getValues(): DomainValue[];
}
```

### 3. Object Factory

```typescript
class AdkObjectFactory {
  constructor(private adtClient: AdtClient) {}

  async create(
    objectType: string,
    objectName: string,
    packageName?: string,
  ): Promise<AdkObjectBase> {
    // 1. Fetch object XML from ADT client
    const xml = await this.fetchObjectXml(objectType, objectName, packageName);

    // 2. Parse XML and extract metadata
    const metadata = this.parseMetadata(xml);

    // 3. Create object-specific instance
    return this.createTypedObject(objectType, metadata, xml);
  }

  private async fetchObjectXml(
    objectType: string,
    objectName: string,
    packageName?: string,
  ): Promise<string> {
    // Use ADT client to fetch object definition
    // Handle different object types with appropriate ADT endpoints
  }

  private createTypedObject(
    objectType: string,
    metadata: ObjectMetadata,
    xml: string,
  ): AdkObjectBase {
    switch (objectType) {
      case 'Class':
        return new ClassObjectImpl(metadata, xml, this.adtClient);
      case 'Interface':
        return new InterfaceObjectImpl(metadata, xml, this.adtClient);
      case 'Domain':
        return new DomainObjectImpl(metadata, xml, this.adtClient);
      default:
        return new GenericObjectImpl(objectType, metadata, xml, this.adtClient);
    }
  }
}
```

### 4. Object Implementation Example

```typescript
class ClassObjectImpl implements ClassObject {
  readonly kind = 'Class';

  constructor(
    private metadata: ObjectMetadata,
    private rawXml: string,
    private adtClient: AdtClient,
  ) {}

  get name(): string {
    return this.metadata.name;
  }
  get description(): string {
    return this.metadata.description;
  }
  get package(): string {
    return this.metadata.package;
  }

  getMainSource(): string {
    // Parse XML and extract main class source
    return this.parseSourceFromXml('main');
  }

  getLocalClasses(): string {
    // Parse XML and extract local classes
    return this.parseSourceFromXml('locals_def');
  }

  getTestClasses(): string {
    // Parse XML and extract test classes
    return this.parseSourceFromXml('testclasses');
  }

  getMacros(): string {
    // Parse XML and extract macros
    return this.parseSourceFromXml('macros');
  }

  getSourceFiles(): Record<string, string> {
    return {
      [`${this.name.toLowerCase()}.clas.abap`]: this.getMainSource(),
      [`${this.name.toLowerCase()}.clas.locals_def.abap`]:
        this.getLocalClasses(),
      [`${this.name.toLowerCase()}.clas.testclasses.abap`]:
        this.getTestClasses(),
      [`${this.name.toLowerCase()}.clas.macros.abap`]: this.getMacros(),
    };
  }

  private parseSourceFromXml(sourceType: string): string {
    // Use existing ADT adapter logic to parse XML
    // Extract specific source sections
  }
}
```

## Integration with Plugins

Plugins will receive intelligent ADK objects instead of raw data:

```typescript
// OAT Plugin usage
class OatPlugin implements FormatPlugin {
  async serialize(
    objects: AdkObjectBase[],
    targetPath: string,
    options?: SerializeOptions,
  ): Promise<SerializeResult> {
    for (const obj of objects) {
      // Use object-specific methods
      const sourceFiles = obj.getSourceFiles();
      const metadata = obj.getMetadata();

      // Object-specific handling
      if (obj.kind === 'Class') {
        const classObj = obj as ClassObject;
        const methods = classObj.getMethods();
        // Handle class-specific serialization
      }

      // Write files using source files and metadata
      await this.writeObjectFiles(obj, sourceFiles, metadata, targetPath);
    }
  }
}
```

## Implementation Plan

1. **Create base interfaces** - Define AdkObjectBase and object-specific interfaces
2. **Implement object factory** - Create AdkObjectFactory with ADT client integration
3. **Create object implementations** - Implement ClassObjectImpl, InterfaceObjectImpl, etc.
4. **Integrate with existing adapters** - Reuse current XML parsing logic
5. **Update plugins** - Modify OAT plugin to use new intelligent objects

## Benefits

- **Simplified plugin development** - Plugins get structured objects instead of raw XML
- **Type safety** - Object-specific interfaces provide compile-time guarantees
- **Lazy loading** - Source files fetched only when needed
- **Extensibility** - Easy to add new object types and methods
- **Separation of concerns** - ADK handles parsing, plugins handle serialization
