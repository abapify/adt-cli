# ADK Factory Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-11-09

## Overview

The ADK Factory is responsible for converting ADT (ABAP Development Tools) API responses into ADK (ABAP Development Kit) objects. It serves as the bridge between raw SAP data and the unified object model.

## Objectives

1. Parse ADT XML responses into structured data
2. Create ADK objects with proper type-specific specs
3. Setup lazy loading for object segments (e.g., class includes)
4. Provide extensible factory pattern for new object types
5. Handle errors gracefully with detailed diagnostics

## Background

### Current Flow (❌ Problematic)

```
ADT Client → Raw XML/JSON → Format Plugin
```

**Problems:**

- Plugins receive raw data, not structured objects
- No unified object model
- Duplicate parsing logic across plugins
- No support for lazy loading

### Target Flow (✅ Correct)

```
ADT Client → ADT XML → ADK Factory → ADK Objects → Format Plugin
```

**Benefits:**

- Single source of truth (ADK objects)
- Plugins work with structured data
- Lazy loading support
- Consistent error handling

## Requirements

### Functional Requirements

#### FR1: Factory Interface

```typescript
interface AdkFactory {
  /**
   * Create ADK object from ADT response
   */
  createFromAdt(
    adtResponse: AdtResponse,
    options?: FactoryOptions,
  ): Promise<AdkObject>;

  /**
   * Get supported object types
   */
  getSupportedTypes(): string[];
}

interface AdtResponse {
  type: string; // 'CLAS/OC', 'INTF/OI', etc.
  metadata: string; // ADT XML metadata
  source?: string; // Main source code
  includes?: AdtInclude[]; // Additional segments
}

interface AdtInclude {
  type: string; // 'definitions', 'implementations', etc.
  sourceUri: string; // URI to fetch content
}

interface FactoryOptions {
  lazyLoad?: boolean; // Enable lazy loading (default: true)
  fetchContent?: (uri: string) => Promise<string>; // Content fetcher
}
```

#### FR2: Type-Specific Factories

Each object type has a dedicated factory:

```typescript
class ClassFactory {
  create(
    adtResponse: AdtResponse,
    options: FactoryOptions,
  ): Promise<AdkObject> {
    // Parse ADT XML
    const parsed = this.parseClassXml(adtResponse.metadata);

    // Create ClassSpec with includes
    const spec: ClassSpec = {
      core: this.extractCoreAttributes(parsed),
      class: this.extractClassAttributes(parsed),
      include: this.createIncludes(adtResponse.includes, options),
      source: this.extractSourceAttributes(parsed),
    };

    // Create ADK object
    return {
      kind: 'Class',
      name: spec.core.name,
      type: 'CLAS/OC',
      description: spec.core.description,
      spec,
    };
  }

  private createIncludes(
    adtIncludes: AdtInclude[],
    options: FactoryOptions,
  ): ClassInclude[] {
    return adtIncludes.map((inc) => ({
      includeType: this.mapIncludeType(inc.type),
      sourceUri: inc.sourceUri,
      content: options.lazyLoad
        ? () => options.fetchContent!(inc.sourceUri) // Lazy
        : undefined, // Will be fetched immediately
    }));
  }
}
```

#### FR3: Lazy Loading Setup

The factory MUST setup lazy loading for segments:

```typescript
// Lazy loading example
const classInclude: ClassInclude = {
  includeType: 'definitions',
  sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/definitions',
  content: async () => {
    // This function is called only when content is needed
    return await adtClient.request(sourceUri);
  },
};

// Later, in serializer
const content = await resolveContent(classInclude.content);
```

#### FR4: Error Handling

```typescript
class FactoryError extends Error {
  constructor(
    message: string,
    public readonly objectType: string,
    public readonly objectName: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'FactoryError';
  }
}

// Usage
try {
  const adkObject = await factory.createFromAdt(response);
} catch (error) {
  if (error instanceof FactoryError) {
    console.error(
      `Failed to create ${error.objectType} ${error.objectName}: ${error.message}`,
    );
  }
}
```

### Non-Functional Requirements

#### NFR1: Performance

- Parse and create ADK object in < 100ms per object
- Support batch processing (100+ objects)
- Minimal memory overhead

#### NFR2: Extensibility

- Easy to add new object type factories
- Plugin-based architecture
- Override default factories

#### NFR3: Testability

- Mock ADT responses for testing
- Unit test each factory independently
- Integration tests with real ADT data

## Architecture

### Component Structure

```
packages/adt-client/src/factories/
├── index.ts                    # Public exports
├── adk-factory.ts             # Main factory class
├── base-factory.ts            # Base class for type factories
├── class-factory.ts           # Class object factory
├── interface-factory.ts       # Interface object factory
├── program-factory.ts         # Program object factory
├── generic-factory.ts         # Fallback for unsupported types
└── types.ts                   # Type definitions
```

### Class Hierarchy

```typescript
abstract class BaseFactory {
  abstract create(
    adtResponse: AdtResponse,
    options: FactoryOptions,
  ): Promise<AdkObject>;

  protected parseXml(xml: string): any {
    // Common XML parsing logic
  }

  protected extractCoreAttributes(parsed: any): AdtCoreAttributes {
    // Extract common attributes
  }
}

class ClassFactory extends BaseFactory {
  async create(
    response: AdtResponse,
    options: FactoryOptions,
  ): Promise<AdkObject> {
    // Class-specific creation logic
  }
}

class InterfaceFactory extends BaseFactory {
  async create(
    response: AdtResponse,
    options: FactoryOptions,
  ): Promise<AdkObject> {
    // Interface-specific creation logic
  }
}
```

### Main Factory

```typescript
export class AdkFactory {
  private factories = new Map<string, BaseFactory>();

  constructor() {
    // Register type-specific factories
    this.factories.set('CLAS/OC', new ClassFactory());
    this.factories.set('INTF/OI', new InterfaceFactory());
    this.factories.set('PROG/P', new ProgramFactory());
    // ... more types
  }

  async createFromAdt(
    response: AdtResponse,
    options?: FactoryOptions,
  ): Promise<AdkObject> {
    const factory = this.factories.get(response.type);

    if (!factory) {
      // Use generic factory as fallback
      return new GenericFactory().create(response, options);
    }

    return factory.create(response, options);
  }

  registerFactory(type: string, factory: BaseFactory): void {
    this.factories.set(type, factory);
  }
}
```

## Implementation Examples

### Example 1: Class with Includes

**Input (ADT Response):**

```typescript
{
  type: 'CLAS/OC',
  metadata: '<class:abapClass xmlns:class="...">...</class:abapClass>',
  source: 'CLASS zcl_test DEFINITION...',
  includes: [
    { type: 'definitions', sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/definitions' },
    { type: 'implementations', sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/implementations' },
    { type: 'testclasses', sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/testclasses' }
  ]
}
```

**Output (ADK Object):**

```typescript
{
  kind: 'Class',
  name: 'ZCL_TEST',
  type: 'CLAS/OC',
  description: 'Test class',
  spec: {
    core: {
      name: 'ZCL_TEST',
      package: 'ZTEST',
      description: 'Test class'
    },
    class: {
      clstype: 'normal',
      exposure: 'public',
      final: false
    },
    include: [
      {
        includeType: 'main',
        content: 'CLASS zcl_test DEFINITION...'
      },
      {
        includeType: 'definitions',
        sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/definitions',
        content: async () => await fetchContent(sourceUri)  // Lazy
      },
      {
        includeType: 'implementations',
        sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/implementations',
        content: async () => await fetchContent(sourceUri)  // Lazy
      },
      {
        includeType: 'testclasses',
        sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/testclasses',
        content: async () => await fetchContent(sourceUri)  // Lazy
      }
    ],
    source: {
      sourceUri: '/sap/bc/adt/oo/classes/zcl_test/source/main'
    }
  }
}
```

### Example 2: Interface (Simple)

**Input:**

```typescript
{
  type: 'INTF/OI',
  metadata: '<intf:abapInterface xmlns:intf="...">...</intf:abapInterface>',
  source: 'INTERFACE zif_test PUBLIC...'
}
```

**Output:**

```typescript
{
  kind: 'Interface',
  name: 'ZIF_TEST',
  type: 'INTF/OI',
  description: 'Test interface',
  spec: {
    core: {
      name: 'ZIF_TEST',
      package: 'ZTEST',
      description: 'Test interface'
    },
    interface: {
      exposure: 'public'
    },
    source: {
      sourceUri: '/sap/bc/adt/oo/interfaces/zif_test/source/main',
      content: 'INTERFACE zif_test PUBLIC...'
    }
  }
}
```

## Integration with ADT Client

### Current ADT Client Usage

```typescript
// Before (❌ Returns raw data)
const classXml = await adtClient.oo.getClass('ZCL_TEST');
const source = await adtClient.oo.getClassSource('ZCL_TEST', 'main');
```

### With ADK Factory

```typescript
// After (✅ Returns ADK object)
const adkFactory = new AdkFactory();

// Fetch ADT data
const metadata = await adtClient.oo.getClass('ZCL_TEST');
const includes = await adtClient.oo.getClassIncludes('ZCL_TEST');

// Convert to ADK
const adkObject = await adkFactory.createFromAdt(
  {
    type: 'CLAS/OC',
    metadata,
    includes,
  },
  {
    lazyLoad: true,
    fetchContent: (uri) => adtClient.request(uri),
  },
);

// Use in plugin
await abapGitPlugin.serialize([adkObject], './output');
```

## Testing Strategy

### Unit Tests

```typescript
describe('ClassFactory', () => {
  it('should create ADK object from ADT response', async () => {
    const factory = new ClassFactory();
    const response = createMockAdtResponse('CLAS/OC');

    const adkObject = await factory.create(response, { lazyLoad: false });

    expect(adkObject.kind).toBe('Class');
    expect(adkObject.name).toBe('ZCL_TEST');
    expect(adkObject.spec.include).toHaveLength(4);
  });

  it('should setup lazy loading for includes', async () => {
    const factory = new ClassFactory();
    const fetchContent = jest.fn().mockResolvedValue('content');

    const adkObject = await factory.create(response, {
      lazyLoad: true,
      fetchContent,
    });

    // Content not fetched yet
    expect(fetchContent).not.toHaveBeenCalled();

    // Resolve lazy content
    const content = await resolveContent(adkObject.spec.include[0].content);

    // Now fetched
    expect(fetchContent).toHaveBeenCalledTimes(1);
    expect(content).toBe('content');
  });
});
```

### Integration Tests

```typescript
describe('AdkFactory Integration', () => {
  it('should work with real ADT client', async () => {
    const adtClient = new AdtClient(config);
    const factory = new AdkFactory();

    // Fetch from real SAP system
    const metadata = await adtClient.oo.getClass('ZCL_TEST');

    // Convert to ADK
    const adkObject = await factory.createFromAdt(
      {
        type: 'CLAS/OC',
        metadata,
      },
      {
        fetchContent: (uri) => adtClient.request(uri),
      },
    );

    // Verify structure
    expect(adkObject).toMatchObject({
      kind: 'Class',
      name: 'ZCL_TEST',
      spec: expect.objectContaining({
        core: expect.any(Object),
        class: expect.any(Object),
        include: expect.any(Array),
      }),
    });
  });
});
```

## Dependencies

- `fast-xml-parser` - XML parsing
- `@abapify/adk` - ADK object model
- ADT Client - For lazy content fetching

## Security Considerations

- Validate XML input to prevent XXE attacks
- Sanitize URIs before fetching
- Limit recursion depth in XML parsing
- No execution of external commands

## Future Enhancements

1. Caching of parsed objects
2. Incremental updates (only changed objects)
3. Parallel processing of multiple objects
4. Custom factory registration via plugins
5. Schema validation for ADT responses

## References

- [ADK Architecture Overview](../architecture/adk-overview.md)
- [abapGit Serialization Spec](./abapgit-serialization.md)
- [ADT API Documentation](https://help.sap.com/docs/ABAP_PLATFORM/c238d694b825421f940829321ffa326a/4ec5711c6e391014adc9fffe4e204223.html)
