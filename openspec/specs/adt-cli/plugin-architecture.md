# ADT CLI Plugin System - Complete Specification

**Version**: 2.1  
**Status**: Implementation Complete  
**Created**: 2025-01-09  
**Updated**: 2025-09-16

## Overview

The ADT CLI implements a dynamic plugin system that enables configuration-driven format plugin management with runtime loading capabilities. This system provides complete separation between CLI core, ADT operations, and format-specific serialization.

## Architecture Components

### 1. ADT CLI Core

- **Package**: `@abapify/adt-cli`
- **Role**: Command orchestration and plugin management
- **Key Classes**: `PluginManager`, `CommandBuilder`, CLI commands

### 2. ADT Client

- **Package**: `@abapify/adt-client`
- **Role**: SAP system connectivity and ADT operations
- **Abstraction**: Complete isolation from format plugins

### 3. ADK (ABAP Development Kit)

- **Package**: `@abapify/adk`
- **Role**: ABAP object type definitions and adapters
- **Interface**: Plugin-agnostic object representations

### 4. Format Plugins

- **Packages**: `@abapify/oat`, `@abapify/abapgit`, custom plugins
- **Role**: ADK object ↔ file system serialization
- **Isolation**: Zero knowledge of CLI or ADT operations

## Dynamic Plugin System

### Plugin Manager

```typescript
class PluginManager {
  // Configuration-driven plugin loading
  async loadPluginsFromConfig(config?: CliConfig): Promise<void>;

  // Runtime plugin loading with @package/plugin syntax
  async loadPlugin(
    pluginName: string,
    options?: Record<string, any>,
  ): Promise<PluginInfo>;

  // Format discovery and validation
  getAvailableFormats(): string[];
  getPlugin(shortName: string): PluginInfo | undefined;

  // Automatic format selection
  async getDefaultFormat(config?: CliConfig): Promise<string | undefined>;
  isFormatSelectionRequired(): boolean;
}
```

### Dynamic Command Generation

```typescript
// Async command factory for dynamic option generation
export async function createImportTransportCommand(): Promise<Command> {
  const pluginManager = PluginManager.getInstance();
  await pluginManager.loadPluginsFromConfig();

  const availableFormats = pluginManager.getAvailableFormats();
  const defaultFormat = await pluginManager.getDefaultFormat();

  // Dynamic --format option with discovered plugins
  command.option('--format <format>', formatDescription, defaultFormat);
}
```

## Configuration Schema

### Primary Configuration Format: TypeScript

The ADT CLI prioritizes `adt.config.ts` over YAML for enhanced flexibility, type safety, and IntelliSense support.

```typescript
// adt.config.ts - Primary configuration format
import type { CliConfig } from '@abapify/adt-cli/config/interfaces';

const config: CliConfig = {
  auth: {
    type: 'btp',
    btp: {
      serviceKey: process.env.BTP_SERVICE_KEY_PATH || './service-key.json',
    },
  },

  plugins: {
    formats: [
      {
        name: '@abapify/oat',
        config: {
          enabled: true,
          options: {
            fileStructure: 'hierarchical',
            includeMetadata: true,
            packageMapping: {
              finance: 'ZTEAMA_FIN',
              basis: 'ZTEAMA_BASIS',
              utilities: 'ZTEAMA_UTIL',

              // Dynamic transform function
              transform: (remotePkg: string, context?: any) => {
                return remotePkg
                  .toLowerCase()
                  .replace(/^z(teama|dev|prd)_/, '')
                  .replace(/_/g, '-');
              },
            },
            objectFilters: {
              include: ['CLAS', 'INTF', 'FUGR', 'TABL'],
              exclude: ['DEVC'],
            },
          },
        },
      },
      {
        name: '@abapify/abapgit',
        config: {
          enabled: true,
          options: {
            xmlFormat: true,
            includeInactive: false,
          },
        },
      },
    ],
  },

  defaults: {
    format: 'oat',
    outputPath: './output',
  },
};

export default config;
```

### Legacy YAML Configuration (Still Supported)

```yaml
# adt.config.yaml - Legacy format
auth:
  type: btp
  btp:
    serviceKey: ${BTP_SERVICE_KEY_PATH}

plugins:
  formats:
    - name: '@abapify/oat'
      config:
        enabled: true
        options:
          fileStructure: hierarchical
          includeMetadata: true
          packageMapping:
            finance: ZTEAMA_FIN
            basis: ZTEAMA_BASIS
    - name: '@abapify/abapgit'
      config:
        enabled: true
        options:
          xmlFormat: true
          includeInactive: false
    - name: '@company/custom-format'
      config:
        enabled: false
        options:
          customOption: value

defaults:
  format: oat
  outputPath: ./output
  objectTypes:
    - CLAS
    - INTF
    - DDLS
    - FUGR
```

### Plugin Specification Interface

```typescript
interface PluginSpec {
  name: string; // Package name or short name
  config?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
}
```

## Usage Patterns

### Automatic Format Selection

```bash
# Single plugin configured - auto-selected
npx adt import transport TR123456 ./output

# Multiple plugins - requires selection or default
npx adt import transport TR123456 ./output --format oat
```

### Dynamic Plugin Loading

```bash
# Load external plugin at runtime
npx adt import transport TR123456 ./output --format @company/custom-format

# Load different abapify plugin
npx adt import transport TR123456 ./output --format @abapify/gcts
```

### Error Handling

```bash
# Format selection required
❌ Format selection required. Available formats: oat, abapgit
   Use --format <format> or configure a default format in adt.config.ts

# Unknown format
❌ Unknown format 'unknown'. Available: oat, abapgit

# Plugin loading failed
❌ Failed to load format plugin: Package '@company/missing' not found. Install it with: npm install @company/missing
```

## Plugin Interface Contract

### Base Format Plugin

```typescript
abstract class BaseFormat {
  abstract readonly name: string;
  abstract readonly description: string;

  // Core serialization interface
  abstract serialize(
    objectData: any,
    objectType: string,
    outputDir: string,
  ): Promise<SerializeResult>;

  // Plugin lifecycle hooks
  beforeImport?(outputDir: string): Promise<void>;
  afterImport?(outputDir: string, result: any): Promise<void>;

  // Object type support
  getSupportedObjectTypes(): string[];
  registerObjectType(objectType: string): void;
}
```

### External Plugin Structure

```typescript
// @company/my-format/index.ts
import { BaseFormat } from '@abapify/adt-cli';

export class MyFormat extends BaseFormat {
  readonly name = 'my-format';
  readonly description = 'My custom format';

  constructor(options?: Record<string, any>) {
    super();
    // Initialize with options from config
  }

  async serialize(objectData: any, objectType: string, outputDir: string) {
    // Implementation
  }
}

// Export as default or named export
export default MyFormat;
```

## Command Flow

### Import Transport Flow

```
1. CLI: Parse `adt import transport TR001`
2. PluginManager: Load plugins from adt.config.ts (or adt.config.yaml)
3. CLI: Generate dynamic --format option with available plugins
4. CLI: Handle format selection (auto/explicit/error)
5. CLI: Load selected plugin (built-in or @package/plugin)
6. ImportService: Fetch transport objects via ADT Client
7. ImportService: Convert ADT XML → ADK objects
8. Plugin: Serialize ADK objects → file system
9. CLI: Report results with plugin-specific output
```

### Plugin Loading Sequence

```
Command Init → Load Config → Discover Plugins → Generate Options → Execute
     ↓              ↓            ↓               ↓              ↓
createImport    adt.config.ts    PluginManager   --format      Import
Transport()     plugins.formats  .loadPlugins()  generation    Service
```

## Implementation Status

### ✅ Completed Features

- **PluginManager**: Singleton with config-driven loading
- **Dynamic Commands**: Async command factory with plugin discovery
- **Format Selection**: Auto-selection, validation, error handling
- **Runtime Loading**: @package/plugin syntax support
- **Configuration**: TypeScript config (primary) and YAML config with plugin specifications
- **CLI Integration**: Updated command registration and execution

### 🔄 Current Architecture

```
CLI Commands → PluginManager → FormatRegistry (built-in)
     ↓              ↓              ↓
  Dynamic        Config-driven   Plugin
  Options        Discovery       Loading
```

## Migration Benefits

### From Static to Dynamic

**Before**: Hardcoded format options, static plugin registration
**After**: Configuration-driven discovery, runtime plugin loading

### User Experience Improvements

1. **Simplified Usage**: Auto-format selection when unambiguous
2. **Clear Errors**: Actionable error messages with suggestions
3. **Extensibility**: Easy addition of custom format plugins
4. **Flexibility**: Runtime plugin loading without CLI updates

### Developer Experience

1. **Plugin Isolation**: Plugins independent of CLI internals
2. **Configuration Management**: Centralized plugin configuration
3. **Testing**: Easier plugin testing with mock configurations
4. **Deployment**: Environment-specific plugin configurations

## Future Enhancements

### Plugin Ecosystem

- Plugin discovery from npm registry
- Version compatibility checking
- Plugin marketplace and ratings

### Advanced Features

- Hot plugin reloading
- Plugin dependency management
- Performance optimizations (lazy loading, streaming)

### Enterprise Features

- Plugin security validation
- Corporate plugin repositories
- Audit logging for plugin usage

## Breaking Changes

### Configuration Required

- Plugins must be configured in `adt.config.yaml`
- Format selection required when multiple plugins available
- CLI commands now async for plugin loading

### Migration Path

1. Create `adt.config.yaml` with desired plugins
2. Update CLI usage to handle format selection
3. Install external plugins as needed
4. Test dynamic loading with @package/plugin syntax

## Success Metrics

✅ **Plugin Isolation**: Plugins work independently of CLI core  
✅ **Configuration-Driven**: All plugins discovered from config  
✅ **Dynamic Loading**: Runtime @package/plugin support  
✅ **User Experience**: Auto-selection and clear error messages  
✅ **Extensibility**: Easy custom plugin development  
✅ **Backward Compatibility**: Existing commands continue working
