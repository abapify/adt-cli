# @abapify/adt-plugin

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-plugin)](https://www.npmjs.com/package/@abapify/adt-plugin)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

Core plugin interface for ADT format serialization.

## Overview

This package defines the **plugin contract** for serializing ADK objects to various formats (abapGit, OAT, etc.). Plugins implement this interface to provide format-specific serialization.

**Key principle:** Plugins only handle serialization format. They receive ADK objects and produce files - no ADT client logic.

## Installation

```bash
bun add @abapify/adt-plugin
```

## Usage

### Creating a Plugin

```typescript
import { createPlugin, type AdtPlugin } from '@abapify/adt-plugin';

export const myPlugin = createPlugin({
  name: 'myFormat',
  version: '1.0.0',
  description: 'My custom format plugin',

  // Registry service - what object types are supported
  registry: {
    isSupported: (type) => ['CLAS', 'INTF'].includes(type),
    getSupportedTypes: () => ['CLAS', 'INTF'],
  },

  // Format service - import/export operations
  format: {
    // Import: ADK object → file system
    import: async (object, targetPath, context) => {
      // Serialize object to files
      return {
        success: true,
        filesCreated: ['myclass.clas.xml'],
      };
    },

    // Export: file system → ADK object (optional)
    export: async (sourcePath, type, name) => {
      // Deserialize files to ADK object
      return {
        success: true,
        object: myAdkObject,
      };
    },
  },

  // Lifecycle hooks (optional)
  hooks: {
    afterImport: async (targetPath) => {
      // Generate metadata files, etc.
    },
  },
});
```

### Using a Plugin

```typescript
import { abapGitPlugin } from '@abapify/adt-plugin-abapgit';

// Check if type is supported
if (abapGitPlugin.registry.isSupported('CLAS')) {
  // Import object to file system
  const result = await abapGitPlugin.format.import(myClassObject, './output', {
    packagePath: ['ZROOT', 'ZSUB'],
  });

  if (result.success) {
    console.log('Files created:', result.filesCreated);
  }
}

// Get all supported types
const types = abapGitPlugin.registry.getSupportedTypes();
// → ['CLAS', 'INTF', 'DOMA', 'DEVC', 'DTEL']
```

## API

### `createPlugin(definition)`

Factory function to create a validated plugin instance.

### `AdtPlugin` Interface

```typescript
interface AdtPlugin {
  readonly name: string;
  readonly version: string;
  readonly description: string;

  readonly registry: {
    isSupported(type: AbapObjectType): boolean;
    getSupportedTypes(): AbapObjectType[];
  };

  readonly format: {
    import(object, targetPath, context): Promise<ImportResult>;
    export?(sourcePath, type, name): Promise<ExportResult>;
  };

  readonly hooks?: {
    afterImport?(targetPath: string): Promise<void>;
    beforeExport?(sourcePath: string): Promise<void>;
  };
}
```

## Terminology

- **Import** (to Git): ADK object → serialized files (SAP → file system)
- **Export** (from Git): serialized files → ADK object (file system → SAP)
