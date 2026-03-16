# @abapify/adt-export

[![version](https://img.shields.io/github/package-json/v/abapify/adt-cli?filename=packages/adt-export/package.json)](https://github.com/abapify/adt-cli/pkgs/npm/%40abapify%2Fadt-export)

Export CLI plugin for adt-cli — deploy local serialized files to SAP.

## Installation

```bash
npm install @abapify/adt-export
```

## Usage

Add to your `adt.config.ts`:

```typescript
export default {
  commands: ['@abapify/adt-export/commands/export'],
};
```

Then use the command:

```bash
# Dry run - see what would be exported
adt export --source ./my-objects --format abapgit --dry-run

# Export to SAP with transport
adt export --source ./my-objects --format abapgit --transport DEVK900123

# Export specific object types only
adt export --source ./my-objects --format abapgit --transport DEVK900123 --types CLAS,INTF

# Export without activation (save inactive)
adt export --source ./my-objects --format abapgit --transport DEVK900123 --no-activate
```

## Options

| Option                      | Description                                             | Default                   |
| --------------------------- | ------------------------------------------------------- | ------------------------- |
| `-s, --source <path>`       | Source directory containing serialized files            | `.`                       |
| `-f, --format <format>`     | Format plugin: `abapgit`, `@abapify/adt-plugin-abapgit` | `abapgit`                 |
| `-t, --transport <request>` | Transport request for changes                           | (required unless dry-run) |
| `-p, --package <package>`   | Target package for new objects                          |                           |
| `--types <types>`           | Filter by object types (comma-separated)                |                           |
| `--dry-run`                 | Validate without saving to SAP                          | `false`                   |
| `--no-activate`             | Save inactive (skip activation)                         | `false`                   |

## Architecture

This plugin follows the two-generator pattern:

1. **FileTree** (provided by CLI) → yields files to format plugin
2. **Format Plugin** → yields ADK objects ready to deploy

The export command:

1. Creates a FileTree from the source directory
2. Calls the format plugin's `export(fileTree)` generator
3. For each yielded ADK object:
   - Filters by type if specified
   - Saves inactive (unless dry run)
4. Bulk activates all objects (unless `--no-activate`)

## Why a Separate Plugin?

Export functionality can modify your SAP system. By making it an explicit opt-in plugin:

- Users must consciously add it to their config
- No accidental deployments from typos
- Clear separation of read-only vs write operations
- Easier to audit which projects have deploy capabilities

## Supported Formats

- **abapgit** / `@abapify/adt-plugin-abapgit` - abapGit format (`.abap` + `.xml` files)

## License

MIT
