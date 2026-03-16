# OAT Metadata Schema

## YAML Structure

OAT uses Kubernetes-inspired YAML metadata for each object:

```yaml
kind: { OBJECT_TYPE }
spec:
  name: { OBJECT_NAME }
  description: { DESCRIPTION }
```

## Core Fields

### `kind` (Required)

The SAP object type identifier:

- `CLAS` - Classes
- `INTF` - Interfaces
- `DEVC` - Packages
- `TABL` - Tables
- `DTEL` - Data Elements
- `DOMA` - Domains
- `FUGR` - Function Groups

### `spec.name` (Required)

The exact object name as it appears in SAP system (uppercase).

### `spec.description` (Optional)

Human-readable description of the object, typically extracted from SAP system metadata.

## Examples by Object Type

### Class Metadata

```yaml
kind: CLAS
spec:
  name: ZCL_UTILITY_HELPER
  description: 'Utility class for common operations'
```

### Interface Metadata

```yaml
kind: INTF
spec:
  name: ZIF_PAYMENT_GATEWAY
  description: 'Interface for payment processing'
```

### Package Metadata

```yaml
kind: DEVC
spec:
  name: ZFINANCE
  description: 'Finance application package'
```

### Table Metadata

```yaml
kind: TABL
spec:
  name: ZTRANSACTIONS
  description: 'Financial transaction history table'
```

## Extensibility

The `spec` section can be extended with additional fields for future OAT versions or specific tooling requirements:

```yaml
kind: CLAS
spec:
  name: ZCL_EXAMPLE
  description: 'Example class'
  # Future extensions
  version: '1.2.0'
  author: 'Development Team'
  dependencies:
    - ZIF_INTERFACE_A
    - ZCL_UTILITY_B
```

## Serialization Implementation

The OAT format uses the YAML serializer from the ADT CLI:

- **Serializer**: `YamlSerializer` class in serializer registry
- **Extension**: `.yaml` files
- **Format**: Clean, minimal YAML without complex nesting
- **Encoding**: UTF-8

## Validation Rules

### File Naming

- Metadata files must be lowercase: `objectname.type.yaml`
- Object name in file name must match `spec.name` (case-insensitive)
- Type extension must match `kind` field

### Required Fields

- Every metadata file must have `kind` field
- Every metadata file must have `spec.name` field
- `spec.name` must be valid SAP object name (uppercase, alphanumeric + underscore)

### Consistency

- Directory name must match object name (case-insensitive)
- Object type directory must match `kind` field
- Source file (if present) must be in same directory as metadata file
