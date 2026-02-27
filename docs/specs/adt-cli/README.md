# ADT CLI Specification

## Overview

The ADT CLI is a platform-agnostic command-line interface that provides end-to-end ABAP development operations through direct integration with SAP ADT (ABAP Development Tools) APIs. It serves as the unified tool for ABAP DevOps workflows, from object serialization to quality reporting.

## Why ADT CLI is Needed

### Problem Statement with Existing Solutions

#### SAP Piper Limitations

**1. Infrastructure Dependency**

- Requires Jenkins infrastructure setup and maintenance
- Tied to specific CI/CD platforms and configurations
- Heavy infrastructure overhead for simple tasks
- Complex deployment and scaling requirements

**2. Fragmented Workflow**

- Multiple separate tools for different tasks
- No unified end-to-end experience
- Complex orchestration between different components
- Inconsistent interfaces across tools

**3. Configuration Complexity**

- Multiple configuration files required (`repositories.yml`, `Jenkinsfile`, etc.)
- Complex setup process with many prerequisites
- Steep learning curve for teams
- Difficult to troubleshoot configuration issues

**4. Limited Local Development Support**

- Primarily designed for CI/CD environments
- Difficult to run and test locally
- Poor developer experience for local workflows
- No offline development capabilities

**5. Platform Lock-in**

- Jenkins-specific implementation
- Difficult to migrate to other CI/CD platforms
- Vendor-specific dependencies and limitations

### Business Impact of Current Limitations

- **Reduced Developer Productivity**: Complex setup and fragmented tools slow development cycles
- **High Operational Overhead**: Infrastructure maintenance and configuration management costs
- **Limited Flexibility**: Platform lock-in prevents adoption of modern CI/CD solutions
- **Poor Developer Experience**: Inconsistent local and CI/CD workflows
- **Scalability Issues**: Infrastructure-heavy solutions don't scale efficiently

## ADT CLI Solution Architecture

### Core Design Principles

#### 1. Platform-Agnostic Design

**Universal Compatibility**

- Works with any CI/CD platform (GitLab, GitHub, Azure DevOps, Jenkins, etc.)
- Same commands and behavior across all environments
- No platform-specific dependencies or configurations
- Easy migration between CI/CD platforms

**Local-First Development**

- Full functionality available for local development
- Offline capabilities where possible
- Consistent experience between local and CI/CD environments
- Developer-friendly debugging and troubleshooting

#### 2. End-to-End Unified Experience

**Single Tool Philosophy**

- Complete workflow from serialization to reporting in one CLI
- Unified interface for all ABAP DevOps tasks
- Consistent command structure and options
- Reduced context switching between tools

**Integrated Workflow**

```bash
# Complete transport analysis in single command chain
adt auth login --service-key ./service-key.json
adt import transport TR001 ./output --format oat
adt atc --transport TR001 --format gitlab --output results.json
adt report generate --transport TR001 --template summary
```

#### 3. Transport-Centric Workflow

**Granular Change Focus**

- Transport requests as the primary unit of change
- Delta analysis showing exactly what changed
- Context-aware change reviews
- Business-focused change documentation

**Change Traceability**

- Complete audit trail of transport contents
- Before/after comparison capabilities
- Impact analysis across dependent objects
- Change history and evolution tracking

#### 4. Environment-Aware Intelligence

**Adaptive Output Formatting**

- GitLab Code Quality format for GitLab CI/CD
- GitHub Actions format for GitHub workflows
- SARIF format for security and quality tools
- Human-readable console output for local development

**Context-Sensitive Behavior**

- Automatic detection of CI/CD environment
- Appropriate logging levels and output formats
- Environment-specific optimizations
- Intelligent error handling and reporting

### Technical Architecture

#### Direct ADT API Integration

**Native SAP Integration**

- Direct communication with SAP ADT APIs
- No intermediate layers or proxies
- Authentic SAP authentication and authorization
- Full access to SAP object metadata and operations

**Type-Safe Object Handling**

- Integration with ADK for type-safe ABAP object modeling
- Compile-time validation of object structures
- Consistent object representation across operations
- Extensible object type system

#### Lightweight Self-Contained Design

**Zero Infrastructure Requirements**

- Single executable with no external dependencies
- No server infrastructure to maintain
- No database or persistent storage requirements
- Minimal resource footprint

**Fast Setup and Execution**

- Minutes to get started vs. hours for complex pipelines
- No complex configuration or setup procedures
- Immediate productivity for new team members
- Rapid iteration and testing cycles

## Core Command Categories

### Authentication Commands

```bash
# Service key authentication (BTP)
adt auth login --service-key ./service-key.json

# Basic authentication (on-premise)
adt auth login --username $SAP_USER --password $SAP_PASSWORD --host $SAP_HOST

# Interactive authentication
adt auth login --interactive

# Token-based authentication
adt auth login --token $SAP_TOKEN --endpoint $SAP_ENDPOINT
```

**Design Rationale**: Flexible authentication supporting multiple SAP deployment scenarios:

- **Service Key**: SAP Business Technology Platform (BTP) with OAuth 2.0
- **Basic Auth**: On-premise S/4HANA systems with username/password
- **Interactive**: Browser-based OAuth flows
- **Token**: Pre-generated tokens for automation

### Object Management Commands

```bash
# Import transport contents
adt import transport TR001 ./output --format oat

# Get individual objects
adt get object ZCL_TEST --type class --output ./objects/

# List objects in package
adt list package Z_CUSTOM --recursive
```

**Design Rationale**: Transport-centric operations with support for individual object manipulation when needed.

### Quality Analysis Commands

```bash
# Run ATC checks on transport
adt atc --transport TR001 --format gitlab --output atc-results.json

# Run ATC on specific objects
adt atc --objects ZCL_TEST,ZIF_TEST --format sarif

# Custom rule sets
adt atc --transport TR001 --ruleset custom-rules.xml
```

**Design Rationale**: Comprehensive quality analysis with environment-aware output formatting.

### Reporting Commands

```bash
# Generate transport summary
adt report generate --transport TR001 --template summary

# Custom report templates
adt report generate --transport TR001 --template ./custom-template.md

# Delta analysis report
adt report delta --transport TR001 --baseline TR000
```

**Design Rationale**: Flexible reporting system supporting custom templates and multiple output formats.

## Integration Architecture

### With ADT Client

**Abstracted ADT Communication**

- ADT CLI initializes and manages ADT Client instances
- ADT Client handles all SAP ADT API communication
- Plugins receive initialized ADT Client for operations
- Clean separation between CLI orchestration and ADT communication
- **Specification**: See [ADT Client Specification](../adt-client/README.md)

```typescript
// CLI initializes ADT Client
const adtClient = new AdtClient();
await adtClient.connect(connectionConfig);

// Plugins receive client instance
const plugin = pluginRegistry.getPlugin(format);
await plugin.exportObject({
  objectType: 'CLAS',
  objectName: 'ZCL_EXAMPLE',
  adtClient: adtClient,
  targetPath: './output',
});
```

### With ADK (ABAP Development Kit)

**Type-Safe Object Processing**

- ADK provides type-safe ABAP object specifications
- ADT Client uses ADK adapters for object serialization/parsing
- Compile-time validation of object structures
- Consistent object representation across operations

```typescript
// Bridge pattern integration via ADT Client
class AdkObjectHandler<T extends Spec<unknown, Kind>> {
  constructor(
    private adtClient: AdtClient,
    private parser: (xml: string) => T,
    private objectType: string,
  ) {}
}
```

### With OAT Format

**Standardized Object Storage**

- OAT format as the canonical object representation
- Git-friendly project structure
- Consistent metadata storage using ADK specifications
- Version control optimized serialization

### With CI/CD Platforms

**Universal Integration Pattern**

```yaml
# GitLab CI example
abap-quality-check:
  script:
    - adt auth login --service-key $SERVICE_KEY
    - adt atc --transport $TRANSPORT_ID --format gitlab --output gl-code-quality-report.json
  artifacts:
    reports:
      codequality: gl-code-quality-report.json
```

**Environment Detection**

- Automatic CI/CD platform detection
- Appropriate output formatting and logging
- Environment-specific optimizations
- Seamless integration without configuration

## Command Behavioral Specifications

### Error Handling Standards

**Consistent Error Codes**

- `0`: Success
- `1`: General error
- `2`: Authentication error
- `3`: Network/connectivity error
- `4`: Object not found
- `5`: Permission denied

**Error Message Format**

```
ERROR: [Category] Description
  Context: Additional context information
  Solution: Suggested resolution steps
```

### Output Format Standards

**JSON Output Structure**

```json
{
  "success": boolean,
  "data": object,
  "metadata": {
    "timestamp": "ISO8601",
    "command": "string",
    "version": "string"
  },
  "errors": [
    {
      "code": "string",
      "message": "string",
      "context": object
    }
  ]
}
```

**Logging Levels**

- `ERROR`: Critical errors requiring immediate attention
- `WARN`: Warnings that don't prevent operation completion
- `INFO`: General information about operation progress
- `DEBUG`: Detailed debugging information
- `TRACE`: Verbose execution tracing

### Configuration Management

**Configuration Hierarchy**

1. Command-line arguments (highest priority)
2. Environment variables
3. Project configuration file (`.adtrc`)
4. User configuration file (`~/.adt/config`)
5. System defaults (lowest priority)

**Configuration File Format**

```json
{
  "endpoints": {
    "default": {
      "url": "https://api.sap.com",
      "client": "100"
    }
  },
  "output": {
    "format": "json",
    "verbosity": "info"
  },
  "quality": {
    "ruleset": "default",
    "failOnWarnings": false
  }
}
```

## Performance Requirements

### Response Time Targets

- **Authentication**: < 5 seconds
- **Object Retrieval**: < 10 seconds per object
- **Transport Import**: < 30 seconds for typical transport
- **ATC Analysis**: < 60 seconds for transport-level analysis

### Scalability Requirements

- **Concurrent Operations**: Support for parallel object processing
- **Large Transports**: Handle transports with 100+ objects
- **Memory Efficiency**: < 512MB memory usage for typical operations
- **Network Efficiency**: Minimize API calls through intelligent caching

## Security Requirements

### Authentication Security

- **Secure Credential Storage**: No plaintext credentials in logs or temporary files
- **Token Management**: Automatic token refresh and secure storage
- **Certificate Validation**: Strict SSL/TLS certificate validation
- **Audit Logging**: Complete audit trail of authentication events

### Data Protection

- **Sensitive Data Handling**: Secure handling of ABAP source code and metadata
- **Temporary File Security**: Secure cleanup of temporary files
- **Network Security**: Encrypted communication with SAP systems
- **Access Control**: Respect SAP authorization and role-based access

## Extensibility Architecture

### Plugin System

```typescript
interface AdtPlugin {
  name: string;
  version: string;
  commands: CommandDefinition[];
  initialize(context: AdtContext): Promise<void>;
}
```

### Custom Output Formats

```typescript
interface OutputFormatter {
  format: string;
  contentType: string;
  transform(data: any): string;
}
```

### Custom Quality Rules

```typescript
interface QualityRuleSet {
  name: string;
  rules: QualityRule[];
  apply(objects: AbapObject[]): QualityResult[];
}
```

## Migration and Compatibility

### SAP Piper Migration Path

1. **Assessment**: Analyze existing SAP Piper configuration
2. **Mapping**: Map SAP Piper steps to ADT CLI commands
3. **Configuration**: Create equivalent ADT CLI configuration
4. **Testing**: Validate equivalent functionality
5. **Deployment**: Gradual rollout with fallback capability

### Backward Compatibility

- **Configuration Migration**: Tools to convert existing configurations
- **Output Format Compatibility**: Support for legacy output formats where possible
- **API Stability**: Semantic versioning with clear deprecation policies

## Success Metrics

### Developer Experience

- **Setup Time**: < 5 minutes from installation to first successful command
- **Learning Curve**: < 1 hour to become productive with basic commands
- **Error Resolution**: Clear error messages with actionable solutions
- **Documentation Quality**: Complete command reference and examples

### Technical Performance

- **Reliability**: > 99.9% success rate for valid operations
- **Performance**: Meet all response time targets
- **Resource Usage**: Minimal memory and CPU footprint
- **Platform Coverage**: Support for all major CI/CD platforms

### Business Impact

- **Adoption Rate**: Replacement of SAP Piper in target organizations
- **Productivity Improvement**: Measurable reduction in ABAP DevOps cycle time
- **Cost Reduction**: Lower infrastructure and maintenance costs
- **Developer Satisfaction**: Positive feedback on developer experience

## Conclusion

The ADT CLI addresses the fundamental limitations of existing ABAP DevOps tools by providing a unified, platform-agnostic, developer-friendly solution. By eliminating infrastructure dependencies, simplifying configuration, and providing consistent local and CI/CD experiences, the ADT CLI enables organizations to adopt modern DevOps practices for ABAP development without the complexity and overhead of traditional solutions.

The integration with ADK ensures type safety and consistency, while the transport-centric workflow aligns with ABAP development practices. The environment-aware intelligence and extensible architecture provide the flexibility needed for diverse organizational requirements while maintaining simplicity and ease of use.
