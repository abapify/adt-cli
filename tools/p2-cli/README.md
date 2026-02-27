# @abapify/p2-cli

CLI for Eclipse P2 repositories - download, extract, and decompile plugins.

## Installation

```bash
# From monorepo root
bun install
npx nx build p2-cli

# Or run directly with tsx
npx tsx tools/p2-cli/src/cli.ts
```

## Commands

### `p2 download <url>`

Download plugins from a P2 repository.

```bash
# Download ADT plugins from SAP tools
p2 download https://tools.hana.ondemand.com/latest -o ./sdk

# Filter to specific plugins
p2 download https://tools.hana.ondemand.com/latest -o ./sdk -f "com.sap.adt.*"

# Download and extract in one step
p2 download https://tools.hana.ondemand.com/latest -o ./sdk --extract
```

**Options:**

- `-o, --output <dir>` - Output directory (default: `./p2-download`)
- `-f, --filter <patterns>` - Filter plugins by ID pattern (comma-separated)
- `-e, --extract` - Also extract files after download
- `--extract-output <dir>` - Output directory for extraction
- `--extract-patterns <patterns>` - File patterns to extract (default: `*.xsd,*.ecore,*.genmodel,*.xml`)

### `p2 extract <input>`

Extract files from JAR archives. Works as a general-purpose JAR extractor.

```bash
# Extract schemas from downloaded plugins
p2 extract ./sdk/plugins -o ./extracted

# Extract specific file types
p2 extract ./sdk/plugins -o ./extracted -p "*.xsd,*.xml"

# Extract everything (no organization)
p2 extract ./sdk/plugins -o ./extracted -p "*" --no-organize

# Single JAR file
p2 extract ./my-plugin.jar -o ./extracted
```

**Options:**

- `-o, --output <dir>` - Output directory (default: `./extracted`)
- `-p, --patterns <patterns>` - File patterns to extract (default: `*.xsd,*.ecore,*.genmodel,*.xml`)
- `--no-organize` - Do not organize files by type (flat output)
- `-v, --verbose` - Verbose output

**Organized output structure:**

```
extracted/
├── schemas/
│   ├── xsd/       # XML Schema definitions
│   ├── ecore/     # Eclipse EMF models
│   └── genmodel/  # Generator models
├── templates/     # Code templates
├── xml/           # Other XML files
├── classes/       # Java class files (by JAR)
└── sources/       # Java source files (by JAR)
```

### `p2 decompile <input>`

Decompile Java class files to readable source code.

```bash
# Decompile extracted classes
p2 decompile ./extracted/classes -o ./decompiled

# Use specific decompiler
p2 decompile ./extracted/classes -o ./decompiled -d cfr
```

**Options:**

- `-o, --output <dir>` - Output directory (default: `./decompiled`)
- `-d, --decompiler <name>` - Decompiler to use (`cfr`, `procyon`, `fernflower`)
- `-v, --verbose` - Verbose output

**Supported decompilers:**

- **CFR** - `brew install cfr-decompiler` (macOS/Linux)
- **Procyon** - Download from GitHub
- **Fernflower** - Bundled with IntelliJ IDEA

## Examples

### Download SAP ADT SDK

```bash
# Full workflow: download, extract, and organize
p2 download https://tools.hana.ondemand.com/latest \
  -o ./adt-sdk \
  -f "com.sap.adt.*,com.sap.conn.jco.*" \
  --extract \
  --extract-output ./adt-sdk/extracted

# Result:
# ./adt-sdk/
# ├── artifacts.jar
# ├── content.jar
# ├── plugins/
# │   ├── com.sap.adt.tools.core_3.54.1.jar
# │   └── ...
# └── extracted/
#     ├── schemas/xsd/
#     ├── schemas/ecore/
#     └── ...
```

### Extract from existing Eclipse installation

```bash
# macOS
p2 extract /Applications/Eclipse.app/Contents/Eclipse/plugins \
  -o ./eclipse-schemas \
  -p "*.xsd"

# Linux
p2 extract ~/.eclipse/*/plugins -o ./eclipse-schemas
```

## Requirements

- Node.js 18+
- `wget` command (for downloads)
- `unzip` command (for extraction)
- Java decompiler (optional, for decompilation)
