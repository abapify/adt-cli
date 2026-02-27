# ADT Client Specification

**Version**: 1.0  
**Status**: Draft  
**Created**: 2025-01-09

## Overview

The ADT Client (`@abapify/adt-client`) provides an abstracted layer for communicating with SAP ABAP Development Tools (ADT) services. It handles connection management, authentication, and provides high-level APIs for ABAP object operations, abstracting away the complexity of ADT endpoints from consuming applications.

## Architecture

### Design Principles

- **Single Responsibility**: Focus solely on ADT communication
- **Abstraction**: Hide ADT endpoint complexity from consumers
- **Reusability**: Usable by CLI, plugins, and other tools
- **Testability**: Support mocking for unit tests
- **Type Safety**: Full TypeScript support with strong typing

### Core Components

```typescript
interface AdtClient {
  // Connection management
  connect(config: AdtConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Object operations
  getObject(objectType: string, objectName: string): Promise<AdtObject>;
  getObjectSource(
    objectType: string,
    objectName: string,
    include?: string,
  ): Promise<string>;
  getObjectMetadata(
    objectType: string,
    objectName: string,
  ): Promise<ObjectMetadata>;
  updateObject(
    objectType: string,
    objectName: string,
    content: string,
  ): Promise<UpdateResult>;
  createObject(
    objectType: string,
    objectName: string,
    content: string,
  ): Promise<CreateResult>;
  deleteObject(objectType: string, objectName: string): Promise<DeleteResult>;

  // Search and discovery
  searchObjects(query: SearchQuery): Promise<SearchResult[]>;
  getPackageContents(packageName: string): Promise<PackageContent>;
  getObjectStructure(
    objectType: string,
    objectName: string,
  ): Promise<ObjectStructure>;

  // Transport operations
  getTransportObjects(transportId: string): Promise<TransportObject[]>;
  assignToTransport(
    objectKey: string,
    transportId: string,
  ): Promise<AssignResult>;

  // System information
  getSystemInfo(): Promise<SystemInfo>;
  getSupportedObjectTypes(): Promise<ObjectTypeInfo[]>;

  // Low-level access for advanced use cases
  request(endpoint: string, options?: RequestOptions): Promise<Response>;
}
```

## Connection Management

### Configuration

```typescript
interface AdtConnectionConfig {
  baseUrl: string;
  client: string;
  username: string;
  password: string;
  language?: string;
  samlAssertion?: string;
  timeout?: number;
  retryAttempts?: number;
}
```

### Authentication Flow

1. **Basic Authentication**: Username/password for development systems
2. **SAML Authentication**: Token-based for production systems
3. **Session Management**: Automatic session renewal and cleanup
4. **Connection Pooling**: Reuse connections for performance

## Object Operations

### Object Retrieval

```typescript
// Get complete object with all segments
const classObject = await client.getObject('CLAS', 'ZCL_EXAMPLE');

// Get specific source segments
const classSource = await client.getObjectSource(
  'CLAS',
  'ZCL_EXAMPLE',
  'source/main',
);

// Get object metadata only
const metadata = await client.getObjectMetadata('CLAS', 'ZCL_EXAMPLE');
```

### Object Modification

```typescript
// Update object source
const result = await client.updateObject('CLAS', 'ZCL_EXAMPLE', updatedSource);

// Create new object
const createResult = await client.createObject(
  'CLAS',
  'ZCL_NEW',
  initialSource,
);
```

## Search and Discovery

### Object Search

```typescript
interface SearchQuery {
  pattern: string;
  objectTypes?: string[];
  packages?: string[];
  maxResults?: number;
  includeSubpackages?: boolean;
}

const results = await client.searchObjects({
  pattern: 'ZCL_*',
  objectTypes: ['CLAS', 'INTF'],
  packages: ['ZPACKAGE'],
  maxResults: 100,
});
```

### Package Navigation

```typescript
const packageContent = await client.getPackageContents('ZPACKAGE');
// Returns: { objects: ObjectInfo[], subpackages: string[] }
```

## Error Handling

### Error Categories

```typescript
interface AdtClientError extends Error {
  readonly category:
    | 'connection'
    | 'authentication'
    | 'authorization'
    | 'system'
    | 'network';
  readonly statusCode?: number;
  readonly adtErrorCode?: string;
  readonly context?: Record<string, unknown>;
}
```

### Error Recovery

- **Automatic Retry**: Configurable retry logic for transient failures
- **Connection Recovery**: Automatic reconnection on session timeout
- **Graceful Degradation**: Fallback strategies for partial failures

## Performance Considerations

### Caching Strategy

- **Object Metadata**: Cache frequently accessed metadata
- **System Information**: Cache static system data
- **Search Results**: Cache search results with TTL
- **Connection State**: Maintain connection pools

### Request Optimization

- **Batch Operations**: Group multiple requests when possible
- **Compression**: Enable HTTP compression for large responses
- **Streaming**: Stream large object content
- **Parallel Requests**: Execute independent requests concurrently

## Testing Support

### Mock Client

```typescript
interface MockAdtClient extends AdtClient {
  setMockResponse(endpoint: string, response: any): void;
  setMockError(endpoint: string, error: AdtClientError): void;
  clearMocks(): void;
  getRequestHistory(): RequestRecord[];
}
```

### Test Utilities

```typescript
// Factory for creating test clients
export function createMockAdtClient(): MockAdtClient;

// Predefined mock responses for common scenarios
export const mockResponses: {
  classObject: AdtObject;
  searchResults: SearchResult[];
  systemInfo: SystemInfo;
};
```

## Integration Points

### CLI Integration

```typescript
// CLI initializes client and passes to plugins
const client = new AdtClient();
await client.connect(connectionConfig);

const plugin = pluginRegistry.getPlugin(format);
await plugin.exportObject({
  objectType: 'CLAS',
  objectName: 'ZCL_EXAMPLE',
  adtClient: client,
  targetPath: './output',
  options: exportOptions,
});
```

### Plugin Integration

```typescript
// Plugins receive initialized client
export class OatPlugin implements AdtPlugin {
  async exportObject(params: ExportObjectParams): Promise<ExportResult> {
    const { adtClient, objectType, objectName } = params;

    // Use client without connection concerns
    const object = await adtClient.getObject(objectType, objectName);
    const metadata = await adtClient.getObjectMetadata(objectType, objectName);

    // Format-specific processing...
    return this.transformToOatFormat(object, metadata);
  }
}
```

## Configuration

### Client Configuration

```typescript
interface AdtClientConfig {
  connection: AdtConnectionConfig;
  cache?: CacheConfig;
  retry?: RetryConfig;
  logging?: LoggingConfig;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

interface RetryConfig {
  attempts: number;
  backoff: 'linear' | 'exponential';
  delay: number;
}
```

## Security Considerations

### Credential Management

- **No Storage**: Client never persists credentials
- **Memory Protection**: Clear sensitive data from memory
- **Secure Transport**: Enforce HTTPS for all communications
- **Token Handling**: Secure SAML token management

### Access Control

- **Principle of Least Privilege**: Request minimal required permissions
- **Session Validation**: Validate session state before operations
- **Audit Logging**: Log security-relevant operations

## Extensibility

### Custom Endpoints

```typescript
// Support for custom ADT endpoints
interface CustomEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  requestTransform?: (data: any) => any;
  responseTransform?: (data: any) => any;
}

client.registerCustomEndpoint('custom-operation', customEndpoint);
```

### Middleware Support

```typescript
interface AdtMiddleware {
  beforeRequest?(config: RequestConfig): RequestConfig;
  afterResponse?(response: Response): Response;
  onError?(error: AdtClientError): AdtClientError;
}

client.use(loggingMiddleware);
client.use(metricsMiddleware);
```

## Implementation Notes

### Package Structure

```
@abapify/adt-client/
├── src/
│   ├── client/
│   │   ├── adt-client.ts
│   │   ├── connection-manager.ts
│   │   └── session-manager.ts
│   ├── services/
│   │   ├── object-service.ts
│   │   ├── search-service.ts
│   │   └── transport-service.ts
│   ├── types/
│   │   ├── client.ts
│   │   ├── objects.ts
│   │   └── responses.ts
│   ├── utils/
│   │   ├── url-builder.ts
│   │   ├── xml-parser.ts
│   │   └── error-handler.ts
│   └── index.ts
├── tests/
└── package.json
```

### Dependencies

- **HTTP Client**: axios or fetch-based implementation
- **XML Processing**: Fast XML parser for ADT responses
- **Authentication**: SAML and basic auth support
- **Caching**: In-memory cache with TTL support
- **Logging**: Structured logging with configurable levels
