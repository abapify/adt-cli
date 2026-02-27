# Intelligent ADK Usage Examples

## Overview

The intelligent ADK provides a high-level interface for working with ABAP objects by integrating directly with the ADT client. Objects are fetched and parsed automatically, providing both generic metadata and object-specific methods.

## Basic Usage

```typescript
import { AdkObjectFactory } from '@abapify/adk';
import { AdtClient } from '@abapify/adt-client';

// Create factory with ADT client
const adtClient = new AdtClient(/* connection config */);
const factory = new AdkObjectFactory(adtClient);

// Create objects by type and name
const classObj = await factory.create('Class', 'ZCL_MY_CLASS');
const interfaceObj = await factory.create('Interface', 'ZIF_MY_INTERFACE');
const domainObj = await factory.create('Domain', 'ZD_MY_DOMAIN');
```

## Working with Class Objects

```typescript
// Generic properties (available on all objects)
console.log(classObj.kind); // 'Class'
console.log(classObj.name); // 'ZCL_MY_CLASS'
console.log(classObj.package); // 'ZPACKAGE'
console.log(classObj.description); // 'My test class'

// Class-specific methods
if (classObj.kind === 'Class') {
  const mainSource = classObj.getMainSource();
  const localClasses = classObj.getLocalClasses();
  const testClasses = classObj.getTestClasses();
  const macros = classObj.getMacros();

  // Structural information
  const methods = classObj.getMethods();
  const attributes = classObj.getAttributes();
  const interfaces = classObj.getInterfaces();
  const superclass = classObj.getSuperclass();

  console.log(`Class has ${methods.length} methods`);
  console.log(`Implements interfaces: ${interfaces.join(', ')}`);
}
```

## Working with Interface Objects

```typescript
if (interfaceObj.kind === 'Interface') {
  const mainSource = interfaceObj.getMainSource();

  // Structural information
  const methods = interfaceObj.getMethods();
  const types = interfaceObj.getTypes();
  const constants = interfaceObj.getConstants();

  console.log(`Interface defines ${methods.length} methods`);
  console.log(`Interface has ${types.length} type definitions`);
}
```

## Working with Domain Objects

```typescript
if (domainObj.kind === 'Domain') {
  const definition = domainObj.getDefinition();

  // Structural information
  const dataType = domainObj.getDataType();
  const length = domainObj.getLength();
  const values = domainObj.getValues();

  console.log(`Domain type: ${dataType}(${length})`);
  console.log(`Fixed values: ${values.length}`);
}
```

## Plugin Integration

```typescript
// Example: Enhanced OAT Plugin using intelligent objects
class EnhancedOatPlugin implements FormatPlugin {
  async serialize(
    objects: AdkObjectBase[],
    targetPath: string,
  ): Promise<SerializeResult> {
    for (const obj of objects) {
      // Get all source files for the object
      const sourceFiles = obj.getSourceFiles();
      const metadata = obj.getMetadata();

      // Object-specific handling
      if (obj.kind === 'Class') {
        const classObj = obj as ClassObject;

        // Access class-specific information
        const methods = classObj.getMethods();
        const isAbstract = classObj.isAbstract();

        // Enhanced metadata for OAT format
        const enhancedMetadata = {
          ...metadata,
          methodCount: methods.length,
          isAbstract,
          interfaces: classObj.getInterfaces(),
        };

        await this.writeClassFiles(
          classObj,
          sourceFiles,
          enhancedMetadata,
          targetPath,
        );
      }

      // Handle other object types...
    }

    return { success: true, filesWritten: objects.length };
  }
}
```

## Batch Operations

```typescript
// Create multiple objects in batch
const requests = [
  { objectType: 'Class', objectName: 'ZCL_CLASS_1' },
  { objectType: 'Class', objectName: 'ZCL_CLASS_2' },
  { objectType: 'Interface', objectName: 'ZIF_INTERFACE_1' },
];

const objects = await factory.createBatch(requests);

// Process all objects
for (const obj of objects) {
  console.log(`Processing ${obj.kind}: ${obj.name}`);
  const sourceFiles = obj.getSourceFiles();

  // Write to file system or process further
  for (const [filename, content] of Object.entries(sourceFiles)) {
    console.log(`File: ${filename} (${content.length} chars)`);
  }
}
```

## Error Handling

```typescript
try {
  const obj = await factory.create('Class', 'NON_EXISTENT_CLASS');
} catch (error) {
  console.error('Failed to create object:', error.message);
  // Handle specific error types
}
```

## Benefits for Plugin Development

1. **Simplified Access**: No need to parse raw XML - get structured objects directly
2. **Type Safety**: Object-specific interfaces provide compile-time guarantees
3. **Lazy Loading**: Source files are fetched only when needed
4. **Consistent Interface**: All objects provide the same base functionality
5. **Extensible**: Easy to add new object types and methods

## Migration from Raw ADK

```typescript
// Old approach: Manual XML parsing
const adapter = new ClassAdtAdapter();
const rawXml = await adtClient.getClassDefinition('ZCL_MY_CLASS');
const classSpec = adapter.fromAdt(parseXml(rawXml));

// New approach: Intelligent objects
const classObj = await factory.create('Class', 'ZCL_MY_CLASS');
const methods = classObj.getMethods(); // Direct access to structured data
const sourceFiles = classObj.getSourceFiles(); // All source files ready for serialization
```
