# Redesigned ADK Object Architecture

## Problems with Current Approach

1. **Duplication**: `intelligent/` folder duplicates existing `objects/` structure
2. **Case Statements**: Factory uses switch statements instead of registry pattern
3. **Separation**: Intelligent features separated from existing adapters

## New Architecture

### Single Object Structure

```
packages/adk/src/objects/
├── base/
│   ├── interfaces.ts          # Base interfaces for all objects
│   ├── registry.ts           # Object type registry
│   └── factory.ts            # Factory using registry
├── class/
│   ├── index.ts              # Class interfaces + intelligent methods
│   ├── adapter.ts            # Enhanced adapter with intelligent features
│   └── registration.ts       # Self-registration
├── interface/
│   ├── index.ts              # Interface interfaces + intelligent methods
│   ├── adapter.ts            # Enhanced adapter
│   └── registration.ts       # Self-registration
├── domain/
│   ├── index.ts              # Domain interfaces + intelligent methods
│   ├── adapter.ts            # Enhanced adapter
│   └── registration.ts       # Self-registration
└── index.ts                  # Auto-imports all registrations
```

### Registry Pattern

```typescript
// Base registry interface
interface ObjectTypeRegistry {
  register(objectType: string, factory: ObjectFactory): void;
  create(
    objectType: string,
    metadata: ObjectMetadata,
    xml: string,
    client: AdtClient,
  ): AdkObjectBase;
  getSupportedTypes(): string[];
}

// Object factory interface
interface ObjectFactory {
  create(
    metadata: ObjectMetadata,
    xml: string,
    client: AdtClient,
  ): AdkObjectBase;
  getSupportedTypes(): string[];
}
```

### Self-Registration Pattern

```typescript
// packages/adk/src/objects/class/registration.ts
import { objectRegistry } from '../base/registry';
import { ClassObjectFactory } from './adapter';

// Self-register when module is imported
objectRegistry.register('class', new ClassObjectFactory());
objectRegistry.register('clas', new ClassObjectFactory()); // Alternative name
```

### Enhanced Adapters

```typescript
// packages/adk/src/objects/class/adapter.ts
export class ClassAdapter
  extends AdtAdapter<ClassSpec>
  implements AdkObjectBase
{
  constructor(
    private metadata: ObjectMetadata,
    private rawXml: string,
    private adtClient: AdtClient,
  ) {
    super();
  }

  // Existing ADT adapter methods
  override toAdt(): Record<string, unknown> {
    /* existing */
  }
  override fromAdt(adtObject: Record<string, unknown>): ClassSpec {
    /* existing */
  }

  // New intelligent object interface
  readonly kind = 'Class';
  get name(): string {
    return this.metadata.name;
  }
  get description(): string {
    return this.metadata.description;
  }

  // Class-specific intelligent methods
  getMainSource(): string {
    /* implementation */
  }
  getLocalClasses(): string {
    /* implementation */
  }
  getSourceFiles(): Record<string, string> {
    /* implementation */
  }
  getMethods(): ClassMethod[] {
    /* implementation */
  }
}

export class ClassObjectFactory implements ObjectFactory {
  getSupportedTypes(): string[] {
    return ['class', 'clas'];
  }

  create(
    metadata: ObjectMetadata,
    xml: string,
    client: AdtClient,
  ): ClassAdapter {
    return new ClassAdapter(metadata, xml, client);
  }
}
```

### Simplified Factory

```typescript
// packages/adk/src/objects/base/factory.ts
export class AdkObjectFactory {
  constructor(private adtClient: AdtClient) {}

  async create(
    objectType: string,
    objectName: string,
    packageName?: string,
  ): Promise<AdkObjectBase> {
    const xml = await this.fetchObjectXml(objectType, objectName, packageName);
    const metadata = await this.parseMetadata(
      xml,
      objectType,
      objectName,
      packageName,
    );

    // No case statements - use registry
    return objectRegistry.create(
      objectType.toLowerCase(),
      metadata,
      xml,
      this.adtClient,
    );
  }
}
```

### Auto-Registration

```typescript
// packages/adk/src/objects/index.ts
// Import all registration modules to trigger self-registration
import './class/registration';
import './interface/registration';
import './domain/registration';

// Export everything
export * from './base';
export * from './class';
export * from './interface';
export * from './domain';
```

## Benefits

1. **No Duplication**: Single object structure with enhanced adapters
2. **No Case Statements**: Registry pattern with self-registration
3. **Extensible**: New object types register themselves automatically
4. **Backward Compatible**: Existing adapter methods still work
5. **Clean Separation**: Each object type manages its own registration

## Migration Plan

1. Move intelligent interfaces to existing object folders
2. Enhance existing adapters with intelligent methods
3. Create object registry in ADK base
4. Add self-registration to each object type
5. Update factory to use registry
6. Remove intelligent folder
