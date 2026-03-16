# OAT Format Structure

## Directory Layout

The OAT format uses a clean, package-based directory structure for organizing ABAP objects:

```
oat-project-name/
├── .oat.json            # OAT project manifest
├── packages/            # All packages in the project
│   ├── zfinance/       # Finance package
│   │   ├── zfinance.devc.yaml # Package metadata
│   │   └── objects/    # Objects in this package
│   │       ├── clas/   # Classes
│   │       │   └── zcl_invoice_processor/
│   │       │       ├── zcl_invoice_processor.clas.abap
│   │       │       └── zcl_invoice_processor.clas.yaml
│   │       └── intf/   # Interfaces
│   │           └── zif_payment_gateway/
│   │               ├── zif_payment_gateway.intf.abap
│   │               └── zif_payment_gateway.intf.yaml
│   └── zbasis/         # Basis package
│       ├── zbasis.devc.yaml
│       └── objects/
│           ├── clas/
│           │   └── zcl_utility_helper/
│           │       ├── zcl_utility_helper.clas.abap
│           │       └── zcl_utility_helper.clas.yaml
│           └── fugr/   # Function groups
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
  "structure": "packages/pkg/objects/type/name/"
}
```

## Example Object Structure

### Class Example

```
packages/zfinance/objects/clas/zcl_invoice_processor/
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
objects/devc/zfinance/
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

The package-based structure (`packages/pkg/objects/type/name/`) provides clear separation between packages while maintaining organized object storage within each package.
