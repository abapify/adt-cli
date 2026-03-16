# ADT Response Logging Specification

**Version:** 1.0.0  
**Status:** Draft  
**Last Updated:** 2025-11-09

## Overview

This specification defines a logging mechanism for ADT (ABAP Development Tools) API responses to support debugging, testing, and fixture creation.

## Objectives

1. Enable file-based logging of ADT responses
2. Maintain ADT endpoint path structure in logs
3. Support fixture creation from logged responses
4. Minimal CLI configuration
5. Work with existing logger facade (CLI and MCP)

## Requirements

### FR1: CLI Flags

All logging flags use `--log-*` prefix for consistency:

| Flag                   | Type    | Default      | Description                                |
| ---------------------- | ------- | ------------ | ------------------------------------------ |
| `--log-level`          | string  | `info`       | Log level: trace, debug, info, warn, error |
| `--log-output`         | string  | `./tmp/logs` | Output directory for log files             |
| `--log-response-files` | boolean | `false`      | Save ADT responses as separate files       |

**Examples:**

```bash
# Basic logging (console only)
npx adt import transport BHFK900103 --log-level=debug

# Save responses to files
npx adt import transport BHFK900103 \
  --log-output=./tmp/logs \
  --log-response-files

# Full debugging
npx adt import transport BHFK900103 \
  --log-level=trace \
  --log-output=./tmp/logs \
  --log-response-files
```

### FR2: Output Structure

Logged responses mirror ADT endpoint structure:

```
{log-output}/
├── adt/                              # Mirrors ADT API structure
│   ├── core/
│   │   └── discovery.xml             # /sap/bc/adt/discovery
│   ├── oo/
│   │   ├── classes/
│   │   │   └── {class_name}/
│   │   │       ├── metadata.xml      # /sap/bc/adt/oo/classes/{name}
│   │   │       └── source/
│   │   │           ├── main          # /sap/bc/adt/oo/classes/{name}/source/main
│   │   │           ├── definitions   # /sap/bc/adt/oo/classes/{name}/source/definitions
│   │   │           ├── implementations
│   │   │           ├── macros
│   │   │           └── testclasses
│   │   └── interfaces/
│   │       └── {intf_name}/
│   │           ├── metadata.xml
│   │           └── source/
│   │               └── main
│   ├── cts/
│   │   └── transports/
│   │       └── {transport_id}/
│   │           └── metadata.xml      # /sap/bc/adt/cts/transports/{id}
│   └── ddic/
│       └── ...
└── session.log                       # Main log file (if --log-level set)
```

**Path Mapping:**

| ADT Endpoint                                       | Log File Path                              |
| -------------------------------------------------- | ------------------------------------------ |
| `/sap/bc/adt/discovery`                            | `adt/core/discovery.xml`                   |
| `/sap/bc/adt/oo/classes/{name}`                    | `adt/oo/classes/{name}/metadata.xml`       |
| `/sap/bc/adt/oo/classes/{name}/source/main`        | `adt/oo/classes/{name}/source/main`        |
| `/sap/bc/adt/oo/classes/{name}/source/definitions` | `adt/oo/classes/{name}/source/definitions` |
| `/sap/bc/adt/cts/transports/{id}`                  | `adt/cts/transports/{id}/metadata.xml`     |

### FR3: Logger Facade Extension

Extend existing logger facade to support file output:

```typescript
interface LogOptions {
  filename?: string; // Relative path from log-output dir
  metadata?: Record<string, any>; // Optional metadata
}

// Logger interface
interface Logger {
  log(content: string, options?: LogOptions): void;
  debug(message: string, options?: LogOptions): void;
  info(message: string, options?: LogOptions): void;
  warn(message: string, options?: LogOptions): void;
  error(message: string, options?: LogOptions): void;

  setOutputDir(dir: string): void;
  setLevel(level: LogLevel): void;
}
```

**Usage:**

```typescript
// Log response with filename
logger.log(responseXML, {
  filename: './adt/oo/classes/zcl_test/metadata.xml',
});

// Log with metadata
logger.log(sourceCode, {
  filename: './adt/oo/classes/zcl_test/source/main',
  metadata: {
    endpoint: '/sap/bc/adt/oo/classes/zcl_test/source/main',
    method: 'GET',
    status: 200,
    duration: 234,
  },
});
```

### FR4: ADT Client Integration

ADT Client automatically logs responses when enabled:

```typescript
export class AdtClient {
  private logger: Logger;
  private logResponseFiles: boolean;

  async getClass(name: string): Promise<string> {
    const response = await this.request(
      'GET',
      `/sap/bc/adt/oo/classes/${name}`,
    );

    if (this.logResponseFiles) {
      this.logger.log(response, {
        filename: `./adt/oo/classes/${name.toLowerCase()}/metadata.xml`,
      });
    }

    return response;
  }

  async getClassSource(name: string, include: IncludeType): Promise<string> {
    const source = await this.request(
      'GET',
      `/sap/bc/adt/oo/classes/${name}/source/${include}`,
    );

    if (this.logResponseFiles) {
      this.logger.log(source, {
        filename: `./adt/oo/classes/${name.toLowerCase()}/source/${include}`,
      });
    }

    return source;
  }
}
```

### FR5: Fixture Creation

Logged responses can be directly used as test fixtures:

```bash
# Run with logging
npx adt import transport BHFK900103 \
  --log-output=./tmp/logs \
  --log-response-files

# Copy to fixtures
cp -r ./tmp/logs/adt/* tests/fixtures/adt/

# Or use helper command
npx adt logs:to-fixtures \
  --source=./tmp/logs \
  --target=tests/fixtures/adt
```

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ CLI Command                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Parse --log-* flags                                     │ │
│ │ Configure Logger (level, output dir)                    │ │
│ │ Pass logResponseFiles to ADT Client                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ADT Client                                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Make ADT API request                                    │ │
│ │ Receive response                                        │ │
│ │ IF logResponseFiles:                                    │ │
│ │   logger.log(response, { filename: path })             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Logger Facade                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Console output (based on log-level)                     │ │
│ │ IF filename provided:                                   │ │
│ │   - Create directory structure                          │ │
│ │   - Write content to file                               │ │
│ │   - Optionally write metadata                           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ File System                                                  │
│ {log-output}/adt/oo/classes/zcl_test/metadata.xml          │
└─────────────────────────────────────────────────────────────┘
```

### Sequence Diagram

```
User → CLI: npx adt import --log-response-files
CLI → Logger: setOutputDir('./tmp/logs')
CLI → ADTClient: new AdtClient({ logResponseFiles: true })
CLI → ImportService: importTransport()
ImportService → ADTClient: getClass('ZCL_TEST')
ADTClient → SAP: GET /sap/bc/adt/oo/classes/ZCL_TEST
SAP → ADTClient: <class:abapClass>...</class:abapClass>
ADTClient → Logger: log(xml, { filename: './adt/oo/classes/zcl_test/metadata.xml' })
Logger → FileSystem: write ./tmp/logs/adt/oo/classes/zcl_test/metadata.xml
ADTClient → ImportService: return xml
ImportService → CLI: return result
```

## Implementation Plan

### Phase 1: Logger Facade Extension

1. Add `filename` option to log methods
2. Implement file writing with directory creation
3. Add `setOutputDir()` method
4. Optional: Add metadata companion files

### Phase 2: CLI Flag Support

1. Add `--log-level`, `--log-output`, `--log-response-files` flags
2. Parse and validate flags
3. Configure logger from flags
4. Pass configuration to ADT Client

### Phase 3: ADT Client Integration

1. Add `logResponseFiles` option to ADT Client
2. Log responses after each request
3. Generate appropriate file paths from endpoints
4. Handle all object types (classes, interfaces, transports, etc.)

### Phase 4: Helper Commands

1. `logs:to-fixtures` - Copy logs to fixtures directory
2. `logs:clean` - Clean old log files
3. `logs:replay` - Mock ADT responses from logs (future)

## Testing

### Unit Tests

```typescript
describe('Logger with file output', () => {
  it('should write content to file', () => {
    logger.setOutputDir('./tmp/test-logs');
    logger.log('test content', { filename: './test.txt' });
    expect(fs.existsSync('./tmp/test-logs/test.txt')).toBe(true);
  });

  it('should create directory structure', () => {
    logger.log('content', { filename: './deep/nested/file.xml' });
    expect(fs.existsSync('./tmp/test-logs/deep/nested/file.xml')).toBe(true);
  });
});

describe('ADT Client logging', () => {
  it('should log responses when enabled', async () => {
    const client = new AdtClient({ logResponseFiles: true });
    await client.getClass('ZCL_TEST');

    expect(
      fs.existsSync('./tmp/logs/adt/oo/classes/zcl_test/metadata.xml'),
    ).toBe(true);
  });

  it('should not log when disabled', async () => {
    const client = new AdtClient({ logResponseFiles: false });
    await client.getClass('ZCL_TEST');

    expect(
      fs.existsSync('./tmp/logs/adt/oo/classes/zcl_test/metadata.xml'),
    ).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Transport import with logging', () => {
  it('should create complete log structure', async () => {
    await runCommand(
      'npx adt import transport MOCK000001 --log-response-files',
    );

    expect(
      fs.existsSync('./tmp/logs/adt/cts/transports/MOCK000001/metadata.xml'),
    ).toBe(true);
    expect(
      fs.existsSync('./tmp/logs/adt/oo/classes/zcl_test/metadata.xml'),
    ).toBe(true);
    expect(
      fs.existsSync('./tmp/logs/adt/oo/classes/zcl_test/source/main'),
    ).toBe(true);
  });
});
```

## Security Considerations

### S1: Sensitive Data in Logs

**Risk:** ADT responses may contain sensitive data  
**Mitigation:**

- Logs stored in `./tmp/` (gitignored by default)
- Document that logs should not be committed
- Add `.gitignore` patterns for log directories
- Sanitize credentials from logged headers

### S2: File Path Injection

**Risk:** Malicious filenames could write outside log directory  
**Mitigation:**

- Validate and sanitize filenames
- Ensure paths are relative and within log directory
- Use `path.join()` and `path.resolve()` safely

### S3: Disk Space

**Risk:** Large transports could fill disk  
**Mitigation:**

- Document disk space requirements
- Provide `logs:clean` command
- Consider log rotation or size limits

## Performance Considerations

### P1: File I/O Overhead

**Impact:** Writing files adds latency  
**Mitigation:**

- Make logging optional (flag-based)
- Use async file writes
- Buffer writes if needed
- Document performance impact

### P2: Directory Creation

**Impact:** Creating nested directories is slow  
**Mitigation:**

- Cache created directories
- Use `{ recursive: true }` option
- Create parent directories once

## Future Enhancements

### E1: Log Replay

Ability to mock ADT responses from logged files for offline testing

### E2: Log Compression

Compress old log files to save space

### E3: Structured Logging

JSON-formatted logs for better parsing and analysis

### E4: Log Filtering

Filter which endpoints to log (e.g., only classes, not discovery)

## References

- [Logger Facade Implementation](../../packages/shared/logger/)
- [ADT Client](../../packages/adt-client/)
- [CLI Commands](../../packages/adt-cli/src/lib/commands/)
- [Test Fixtures](../../../tests/fixtures/adt/)

## Changelog

| Date       | Version | Changes               |
| ---------- | ------- | --------------------- |
| 2025-11-09 | 1.0.0   | Initial specification |
