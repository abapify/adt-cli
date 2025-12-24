# Export Architecture Design

## Problem Statement

The current export implementation in `ExportService` tries to iterate over files directly,
but this is wrong because:

1. **Each format has different file structures** - OAT uses `.oat.xml`, abapGit uses `.abap` + `.xml`
2. **Only the plugin knows how to read its format** - file discovery is format-specific
3. **Plugin should not be responsible for deployment** - only for format mapping

## Proposed Architecture: Two Generators

### Core Concept

**Two generators in a pipeline:**

1. **FileTree** (provided by CLI) → yields files to plugin
2. **Plugin** → yields ADK objects ready to deploy

**Plugin is a pure transformer:** `FileTree → AdkObject`

```
┌─────────────────────────────────────────────────────────────┐
│ CLI / ExportService                                         │
│ - Creates FileTree from source directory                    │
│ - Iterates plugin generator                                 │
│ - Deploys each ADK object (save inactive → bulk activate)   │
└─────────────────────────────────────────────────────────────┘
                              │
                    FileTree  │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Plugin (format.export generator)                            │
│ - Receives FileTree                                         │
│ - Iterates files in its format (*.oat.xml, *.abap, etc.)    │
│ - Parses each file into ADK object                          │
│ - Yields ADK objects (does NOT deploy)                      │
└─────────────────────────────────────────────────────────────┘
                              │
               AdkObject      │  (generator yields)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ CLI / ExportService (deployment)                            │
│ - Receives ADK objects from generator                       │
│ - Saves each object (inactive)                              │
│ - Bulk activates all objects                                │
└─────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Layer           | Responsibility                                     | Does NOT do             |
| --------------- | -------------------------------------------------- | ----------------------- |
| **CLI/Service** | Create FileTree, iterate generator, deploy objects | Parse file formats      |
| **Plugin**      | Map FileTree → ADK objects                         | Deploy to SAP           |
| **ADK**         | Object operations (save, activate)                 | Know about file formats |

### FileTree Abstraction

Virtual file system interface - allows testing without real FS:

```typescript
interface FileTree {
  /** List files matching pattern (glob) */
  glob(pattern: string): Promise<string[]>;

  /** Read file contents */
  read(path: string): Promise<string>;

  /** Check if path exists */
  exists(path: string): Promise<boolean>;

  /** List directory contents */
  readdir(path: string): Promise<string[]>;

  /** Get file stats */
  stat(path: string): Promise<{ isFile: boolean; isDirectory: boolean }>;
}

// Implementation for real FS
class FsFileTree implements FileTree {
  constructor(private basePath: string) {}
  // ... uses node:fs
}

// Implementation for testing
class MemoryFileTree implements FileTree {
  constructor(private files: Map<string, string>) {}
  // ... uses in-memory map
}
```

### Updated Plugin Interface

```typescript
interface AdtPlugin {
  // ... existing ...

  readonly format: {
    // Existing: SAP → Files (import)
    import(
      object: AdkObject,
      targetPath: string,
      context: ImportContext,
    ): Promise<ImportResult>;

    // NEW: Files → ADK Objects (export) - GENERATOR
    export?(fileTree: FileTree): AsyncGenerator<AdkObject>;
  };
}
```

### ExportService Usage

```typescript
// ExportService - simple orchestration
async exportTransport(options: TransportExportOptions): Promise<ExportResult> {
  const plugin = await loadFormatPlugin(options.format);
  const fileTree = createFileTree(options.inputPath);

  const objects: AdkObject[] = [];

  // Plugin yields ADK objects - we just collect and deploy
  for await (const adkObject of plugin.format.export!(fileTree)) {
    // Filter by type if needed
    if (options.objectTypes && !options.objectTypes.includes(adkObject.type)) {
      continue;
    }

    // Save inactive
    if (!options.dryRun) {
      await adkObject.save({
        inactive: true,
        transport: options.transportNumber
      });
    }

    objects.push(adkObject);
  }

  // Bulk activate all at once
  if (!options.dryRun && objects.length > 0) {
    await adk.activate(objects);
  }

  return { /* results */ };
}
```

### Plugin Implementation Example (OAT)

```typescript
// In @abapify/oat plugin
async function* export(fileTree: FileTree): AsyncGenerator<AdkObject> {
  // Plugin knows OAT format: *.oat.xml files
  for await (const file of fileTree.glob('**/*.oat.xml')) {
    const content = await fileTree.read(file);

    // Parse OAT XML → extract type, name, source, metadata
    const parsed = parseOatXml(content);

    // Create ADK object with data
    const adkObject = adk.get(parsed.name, parsed.type);
    adkObject.setSource(parsed.source);
    adkObject.setMetadata(parsed.metadata);

    yield adkObject;
  }
}
```

### Plugin Implementation Example (abapGit)

```typescript
// In @abapify/adt-plugin-abapgit plugin
async function* export(fileTree: FileTree): AsyncGenerator<AdkObject> {
  // Plugin knows abapGit format: .abap + .xml files
  // First scan to build object list
  const objects = await scanAbapGitStructure(fileTree);

  for (const obj of objects) {
    // Read source files (.abap)
    const source = await fileTree.read(obj.sourcePath);

    // Read metadata (.xml)
    const metadata = await fileTree.read(obj.metadataPath);

    // Create ADK object
    const adkObject = adk.get(obj.name, obj.type);
    adkObject.setSource(source);
    adkObject.setMetadata(parseAbapGitXml(metadata));

    yield adkObject;
  }
}
```

## Export Flow (Files → SAP)

1. **CLI** parses args, calls ExportService
2. **ExportService** creates FileTree, loads plugin
3. **ExportService** iterates `plugin.format.export(fileTree)` generator
4. **Plugin** yields ADK objects (parsed from its format)
5. **ExportService** saves each object (inactive)
6. **ExportService** bulk activates all objects
7. **Results** returned to CLI

## Benefits

1. **Plugin is pure transformer** - FileTree → AdkObject, nothing else
2. **Plugin doesn't deploy** - just yields objects
3. **Generator pattern** - memory efficient, lazy evaluation
4. **FileTree abstraction** - testable, supports virtual files
5. **Service handles deployment** - save inactive, bulk activate

## Package Responsibilities

```
@abapify/adt-export (NEW - opt-in plugin)
├── FileTree interface + FsFileTree implementation
├── Export command (CliCommandPlugin)
└── Orchestration logic

@abapify/adt-plugin
└── AdtPlugin interface (with export generator signature)

@abapify/adk
└── Object operations only (save, activate, bulk activate)

@abapify/adt-cli
└── Core commands only (no export - it's opt-in via adt-export)
```

**Why separate package?**

- Export can modify SAP system - should be explicit opt-in
- Users must consciously add to config - no accidental deployments
- Clear separation of read-only vs write operations
- Easier to audit which projects have deploy capabilities

**ADK stays clean** - no file system knowledge, no plugin knowledge.

## Implementation Status

### Completed ✅

1. Created `@abapify/adt-export` package (opt-in plugin)
2. Defined `FileTree` interface in `@abapify/adt-export/src/types.ts`
3. Implemented `FsFileTree` and `MemoryFileTree` in `@abapify/adt-export/src/utils/filetree.ts`
4. Created export command skeleton in `@abapify/adt-export/src/commands/export.ts`

### Remaining TODO

1. Update `AdtPlugin` interface with `export` generator in `@abapify/adt-plugin`
2. Implement `export` generator in OAT plugin
3. Add bulk activation to ADK (if not exists)
4. Remove export commands from `@abapify/adt-cli` (now in separate plugin)
5. Wire up full export flow in adt-export command

## Usage

Add to `adt.config.ts`:

```typescript
export default {
  commands: ['@abapify/adt-export/commands/export'],
};
```

Then use:

```bash
adt export --source ./my-objects --format oat --transport DEVK900123
```

## Open Questions

1. **Dependency ordering** - Should plugin yield in dependency order, or should service sort?
2. **Progress reporting** - How to report progress from generator?
