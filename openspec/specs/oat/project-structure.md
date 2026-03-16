# OAT Format Structure

## Directory Layout

The OAT format uses a clean, type-based directory structure for organizing ABAP objects:

```
oat-package-name/
├── .oat.json            # OAT project manifest
├── objects/             # All ABAP objects organized by type
│   ├── clas/           # Classes
│   │   └── zcl_example/
│   │       ├── zcl_example.clas.abap  # Source code
│   │       └── zcl_example.clas.yaml  # Metadata
│   ├── intf/           # Interfaces
│   │   └── zif_example/
│   │       ├── zif_example.intf.abap
│   │       └── zif_example.intf.yaml
│   ├── devc/           # Packages
│   │   └── zpackage/
│   │       └── zpackage.devc.yaml     # Package metadata only
│   ├── tabl/           # Tables
│   ├── dtel/           # Data elements
│   ├── doma/           # Domains
│   └── fugr/           # Function groups
└── README.md           # Optional project documentation
```

## File Naming

### Source Files

- **Format**: `{objectname}.{type}.abap` (lowercase)
- **Example**: `zcl_invoice_processor.clas.abap`
- **Note**: Packages (DEVC) have no source files, only metadata

### Metadata Files

- **Format**: `{objectname}.{type}.yaml` (lowercase)
- **Example**: `zcl_invoice_processor.clas.yaml`
- **Structure**: Kubernetes-inspired with `kind` and `spec` sections

## Manifest File (.oat.json)

Generated automatically by ADT CLI during import:

```json
{
  "format": "oat",
  "tooling": "Open ABAP Tooling",
  "version": "1.0.0",
  "generator": "adt-cli",
  "objectsProcessed": 25,
  "structure": "objects/type/name/"
}
```

## Example Object Structure

### Class Example

```
objects/clas/zcl_invoice_processor/
├── zcl_invoice_processor.clas.abap    # ABAP source code
└── zcl_invoice_processor.clas.yaml    # Object metadata
```

**Source file content** (zcl_invoice_processor.clas.abap):

```abap
CLASS zcl_invoice_processor DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS: process_invoice IMPORTING invoice_data TYPE string.
ENDCLASS.

CLASS zcl_invoice_processor IMPLEMENTATION.
  METHOD process_invoice.
    " Implementation here
  ENDMETHOD.
ENDCLASS.
```

**Metadata file content** (zcl_invoice_processor.clas.yaml):

```yaml
kind: CLAS
spec:
  name: ZCL_INVOICE_PROCESSOR
  description: 'Invoice processing utility class'
```

### Package Example

```
objects/DEVC/ZFINANCE/
└── zfinance.devc.yaml                 # Package metadata only
```

**Metadata file content** (zfinance.devc.yaml):

```yaml
kind: DEVC
spec:
  name: ZFINANCE
  description: 'Finance domain package'
```

## Key Design Decisions

### Type-Based Organization

Objects are grouped by SAP object type (CLAS, INTF, DEVC, etc.) rather than functional area, making it easy to locate specific object types.

### Lowercase File Names

All file names use lowercase with dots as separators, following modern file naming conventions and avoiding case sensitivity issues.

### Minimal Metadata

YAML metadata contains only essential information (name, description), keeping files small and focused while remaining extensible.

### No Deep Nesting

The three-level structure (`objects/type/name/`) provides organization without complexity, making navigation and tooling development straightforward.
