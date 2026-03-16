# ADT CLI Integration

## Overview

OAT is implemented as a format plugin in the ADT CLI tool, providing seamless integration with SAP ADT services for importing ABAP objects into Git-friendly formats.

## Usage

### Basic Import

```bash
adt import package ZPACKAGE
```

Imports package `ZPACKAGE` to `./oat-zpackage/` in OAT format.

### Custom Output Location

```bash
adt import package ZPACKAGE ./my-project/
```

Imports to specified directory.

### Format Selection

```bash
adt import package ZPACKAGE --format=oat
```

Explicitly specify OAT format (default).

### Object Type Filtering

```bash
adt import package ZPACKAGE --object-types=CLAS,INTF
```

Import only classes and interfaces.

## Implementation Architecture

### Format Plugin System

OAT is registered as a format plugin in the `FormatRegistry`:

```typescript
// packages/adt-cli/src/lib/formats/format-registry.ts
const oatFormat = new OatFormat();
this.formatInstances.set('oat', oatFormat);
```

### Object Handlers

Each ABAP object type has a dedicated handler that works with OAT:

- `packages/adt-cli/src/lib/objects/clas-object.ts` - Class handler
- `packages/adt-cli/src/lib/objects/intf-object.ts` - Interface handler
- `packages/adt-cli/src/lib/objects/devc-object.ts` - Package handler

### Serialization Flow

1. **ADT Read**: Object handler reads from SAP system via ADT API
2. **Data Transform**: Convert ADT response to `ObjectData` format
3. **OAT Serialize**: `OatFormat.serialize()` creates directory structure and files
4. **YAML Generation**: `YamlSerializer` creates metadata files

## Plugin Architecture Benefits

### Modular Design

OAT coexists with other formats (abapGit, JSON) through the plugin system, allowing users to choose the most suitable format for their workflow.

### Extensibility

New object types can be added without modifying the OAT format implementation - the format dynamically supports all registered object types.

### Consistent Interface

All formats implement the same `BaseFormat` interface, ensuring consistent behavior and easy format switching.

## ADT Service Integration

### Authentication

OAT leverages the ADT CLI authentication system:

```bash
adt auth login --file service-key.json
```

### Object Discovery

Uses ADT search services to find objects for import:

```bash
adt search ZCL* --package ZFINANCE --object-type CLAS
```

### Source Retrieval

Reads object source code and metadata through ADT REST APIs, handling CSRF tokens and session management automatically.

## Output Structure

### Generated Files

- **Source files**: Raw ABAP code with proper file extensions
- **Metadata files**: YAML files with object descriptions and properties
- **Manifest file**: JSON file with import metadata and statistics

### Directory Organization

The `packages/pkg/objects/type/name/` structure enables:

- **Easy navigation**: Find objects by type and name
- **Clean diffs**: Changes isolated to specific object directories
- **Tool integration**: Predictable paths for IDE and build tools

## Format Comparison

### vs abapGit

- **Structure**: OAT uses type-based directories vs abapGit's flat `/src`
- **Metadata**: OAT separates metadata into YAML vs abapGit's XML embedding
- **File naming**: OAT uses lowercase with dots vs abapGit's complex schemes

### vs Raw ADT

- **Git-friendly**: OAT creates multiple small files vs ADT's API responses
- **Human-readable**: YAML metadata vs raw ADT XML
- **Organized**: Type-based structure vs API endpoint structure
