# ADT CLI Logging and Command Utilities Specification

## Overview

This specification defines the logging architecture and command utility patterns for the ADT CLI, establishing consistent patterns for command development, error handling, and observability.

## Logging Architecture

### Core Principles

1. **Single Library Approach**: Use pino consistently across all components
2. **Transport-Based Configuration**: Different outputs for different environments
3. **Component-Based Organization**: Clear separation of concerns with component prefixes
4. **Environment-Aware**: Automatic formatting based on context

### Logger Configuration

#### Base Configuration

```typescript
const baseLogger = pino({
  level: process.env.ADT_LOG_LEVEL || 'info',
  transport: shouldUsePrettyFormat
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname,time',
          messageFormat: '[{component}] {msg}',
          hideObject: true,
          singleLine: true,
        },
      }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
```

#### Pretty Formatting Conditions

Pretty formatting is enabled when:

- `NODE_ENV === 'development'` OR
- `ADT_CLI_MODE === 'true'`

#### Component Loggers

All loggers must include a component identifier:

```typescript
const logger = baseLogger.child({ component: 'auth' });
```

### Standard Components

- `auth` - Authentication operations
- `connection` - ADT connection management
- `cts` - Change Transport System operations
- `atc` - ABAP Test Cockpit operations
- `repository` - Repository operations
- `discovery` - Service discovery
- `http` - HTTP client operations
- `xml` - XML parsing operations
- `cli` - CLI-specific operations
- `error` - Error handling

## Command Utilities

### Shared Utilities (`command-helpers.ts`)

#### Global Options Extraction

```typescript
function getGlobalOptions(command: Command): any;
```

Traverses command hierarchy to extract root-level options.

#### Logger Creation

```typescript
function createCommandLogger(command: Command): Logger;
function createComponentLogger(command: Command, component: string): Logger;
```

Creates loggers with proper configuration based on global options.

#### Error Handling

```typescript
function handleCommandError(error: unknown, operation: string): never;
```

Standardized error handling with consistent formatting and process exit.

### Command Pattern

#### Standard Command Structure

```typescript
export const exampleCommand = new Command('example')
  .description('Example command')
  .action(async (options, command) => {
    try {
      const logger = createComponentLogger(command, 'example');

      // Command logic here

      console.log('✅ Operation completed successfully!');
    } catch (error) {
      handleCommandError(error, 'Example operation');
    }
  });
```

#### Required Elements

1. **Component logger**: Must use `createComponentLogger()`
2. **Error handling**: Must use `handleCommandError()`
3. **Success message**: Console output for user feedback
4. **Async/await**: Proper async handling for all operations

## Environment Variables

### Logging Control

- `ADT_LOG_LEVEL`: `trace|debug|info|warn|error|fatal` (default: `info`)
- `ADT_LOG_COMPONENTS`: Comma-separated list of components to enable
- `NODE_ENV`: `development` enables pretty printing
- `ADT_CLI_MODE`: `true` enables CLI-friendly formatting

### Usage Examples

```bash
# Enable debug logging for specific components
ADT_LOG_LEVEL=debug ADT_LOG_COMPONENTS=auth,connection npx adt auth login

# Enable verbose logging for all components
npx adt auth login --verbose

# Enable verbose logging for specific components
npx adt auth login --verbose=auth,http
```

## Verbose Mode Specification

### CLI Option

```
--verbose [components]    Enable verbose logging
                         Without value: enables all components
                         With value: comma-separated component list
```

### Behavior

- `--verbose` without value: Debug level for all components
- `--verbose=auth,cli`: Debug level for specified components only
- No verbose flag: Silent mode (level: 'silent')

### Component Filtering

When component filtering is active:

- Only specified components log messages
- Basic logs (without component) always show when verbose is enabled
- Filtered components return no-op loggers

## Error Handling Standards

### Error Message Format

```
❌ {Operation} failed: {error.message}
```

### Process Exit

- Success: Exit code 0
- Error: Exit code 1 with `process.exit(1)`

### Error Logging

Errors must be logged at appropriate levels:

- User errors (invalid input): `warn` level
- System errors (network, file): `error` level
- Critical failures: `fatal` level

## OAuth Authentication Logging

### Success Flow

1. System connection info
2. Browser opening notification
3. Server start notification (debug level)
4. Authentication success

### Error Flow

1. Error logging with context
2. User-friendly error messages
3. Proper cleanup (timeout clearing)

### Security Considerations

- OAuth URLs logged only at debug level
- No sensitive tokens in logs
- Service key details logged minimally

## Testing Requirements

### Unit Tests

- Logger creation utilities
- Error handling functions
- Component filtering logic

### Integration Tests

- Command execution with various verbose levels
- Error scenarios with proper exit codes
- OAuth flow cleanup verification

## Migration Guidelines

### Existing Commands

1. Replace manual logger setup with `createComponentLogger()`
2. Replace custom error handling with `handleCommandError()`
3. Remove duplicate global options extraction
4. Add proper component identifiers

### New Commands

1. Use command template with utilities
2. Follow standard error handling pattern
3. Include appropriate component logging
4. Test with various verbose levels

## Compliance

This specification must be followed for:

- All new CLI commands
- All logging implementations
- All error handling patterns
- All command utility usage

Deviations require specification update through the standard review process.
