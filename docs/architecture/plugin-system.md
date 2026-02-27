# Plugin-Based Configuration System

## Overview

The ADT CLI now implements a plugin-based configuration system where format handlers (like OAT) can leverage ADK for proper serialization/deserialization of ABAP objects received from the ADT client.

## Architecture

### Core Components

1. **Format Registry** (`/lib/formats/format-registry.ts`)
   - Manages format plugins (OAT, abapGit, etc.)
   - Auto-registers available object types from ObjectRegistry
   - Provides unified interface for format operations

2. **Object Registry** (`/lib/objects/registry.ts`)
   - Manages object type handlers using ADK adapters
   - Currently supports: CLAS, INTF, DOMA
   - Uses ADK bridge for type-safe operations

3. **ADK Bridge** (`/lib/objects/adk-bridge/adk-object-handler.ts`)
   - Bridges ADT client data with ADK specifications
   - Preserves original ADT XML context for round-trip compatibility
   - Enhances ObjectData with ADK spec metadata

### Enhanced OAT Format

The OAT format now properly leverages ADK for serialization/deserialization:

#### Serialization Flow

```
ADT Client → ADK Bridge → ObjectData (with ADK spec) → OAT Format → YAML files
```

#### Key Improvements

- **ADK-Aware Serialization**: Uses actual ADK spec structure instead of generic metadata
- **Context Preservation**: Maintains original ADT XML and ADK spec data
- **Round-Trip Compatibility**: Ensures data integrity during serialize/deserialize cycles
- **Type-Specific Handling**: Different serialization logic for CLAS, INTF, DOMA objects

#### Code Example

```typescript
// Enhanced serialization in OAT format
const adkSpec = objectData.metadata?.adkSpec
  ? this.createAdkSpecFromExistingData(objectData, objectType)
  : this.convertObjectDataToAdkSpec(objectData, objectType);

const serializer = SerializerRegistry.get('oat');
const serialized = serializer.serialize(adkSpec);
```

### Object Type Support

| Object Type            | ADK Adapter         | Status     |
| ---------------------- | ------------------- | ---------- |
| CLAS (Classes)         | ClassAdtAdapter     | ✅ Active  |
| INTF (Interfaces)      | InterfaceAdtAdapter | ✅ Active  |
| DOMA (Domains)         | DomainAdtAdapter    | ✅ Active  |
| DDLS (CDS Views)       | -                   | 🔄 Planned |
| DEVC (Packages)        | -                   | 🔄 Planned |
| FUGR (Function Groups) | -                   | 🔄 Planned |

### Configuration

The plugin system is automatically configured through:

1. **Format Registration**: Formats auto-register with available object types
2. **Object Handler Registration**: ADK adapters are registered for supported types
3. **Serializer Registration**: YAML/JSON serializers are available for different formats

### Benefits

1. **Type Safety**: ADK provides compile-time type checking for ABAP objects
2. **Extensibility**: Easy to add new object types by implementing ADK adapters
3. **Consistency**: Unified approach across all format handlers
4. **Data Integrity**: Preserves full context from ADT client through serialization
5. **Round-Trip Support**: Objects can be serialized and deserialized without data loss

## Usage

### Transport Import with Enhanced OAT

```bash
adt import transport TR001234 ./output --format oat --debug
```

This command now:

1. Retrieves transport objects via ADT client
2. Converts to ADK specs using appropriate adapters
3. Serializes using OAT format with full ADK context
4. Preserves all metadata for round-trip compatibility

### Supported Workflows

- **Import**: ADT → ADK → OAT YAML files
- **Export**: OAT YAML files → ADK → ADT (future)
- **Round-trip**: Maintains data integrity throughout the process

## Future Enhancements

1. **Additional Object Types**: DDLS, DEVC, FUGR, PROG support
2. **Custom Format Plugins**: Allow external format implementations
3. **Configuration Files**: Runtime plugin configuration
4. **Validation**: ADK-based object validation before serialization
