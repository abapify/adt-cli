/**
 * Mock OAT Plugin for E2E Testing
 * Simulates the @abapify/oat plugin behavior
 */

export interface OatPluginOptions {
  preset?: 'flat' | 'hierarchical' | 'grouped';
  fileStructure?: 'flat' | 'hierarchical' | 'grouped';
  includeMetadata?: boolean;
}

export class MockOatPlugin {
  public readonly name = 'oat';
  public readonly description =
    'Mock OAT (ABAP Transport) format plugin for testing';
  private options: OatPluginOptions;

  constructor(options: OatPluginOptions = {}) {
    this.options = {
      preset: options.preset || 'hierarchical',
      fileStructure: options.fileStructure || options.preset || 'hierarchical',
      includeMetadata: options.includeMetadata ?? true,
      ...options,
    };
  }

  /**
   * Serialize ABAP objects to OAT format
   */
  async serialize(
    objectData: any,
    objectType: string,
    outputDir: string,
  ): Promise<any> {
    console.log(
      `📝 Mock OAT Plugin: Serializing ${objectType} to ${outputDir}`,
    );
    console.log(`🎛️  Using preset: ${this.options.preset}`);
    console.log(`📁 File structure: ${this.options.fileStructure}`);

    return {
      success: true,
      objectType,
      outputDir,
      preset: this.options.preset,
      fileStructure: this.options.fileStructure,
      filesCreated: this.getMockFilesForType(objectType),
    };
  }

  /**
   * Get supported object types
   */
  getSupportedObjectTypes(): string[] {
    return ['CLAS', 'INTF', 'FUGR', 'TABL', 'DDLS', 'DEVC'];
  }

  /**
   * Register object type (no-op for mock)
   */
  registerObjectType(objectType: string): void {
    // Mock implementation - just log
    console.log(`📋 Registered object type: ${objectType}`);
  }

  /**
   * Get mock file list for object type
   */
  private getMockFilesForType(objectType: string): string[] {
    const baseFiles =
      this.options.fileStructure === 'flat'
        ? [`${objectType.toLowerCase()}.abap`]
        : [
            `${objectType.toLowerCase()}/definition.abap`,
            `${objectType.toLowerCase()}/implementation.abap`,
          ];

    if (this.options.includeMetadata) {
      baseFiles.push(`${objectType.toLowerCase()}/metadata.json`);
    }

    return baseFiles;
  }
}

// Export as default to match expected plugin interface
export default MockOatPlugin;
