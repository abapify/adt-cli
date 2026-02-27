/**
 * File Logging Plugin - Saves HTTP responses to files
 */

import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import type { ResponsePlugin, ResponseContext } from './types';
import type { Logger } from '@abapify/logger';

export interface FileLoggingConfig {
  outputDir: string;
  writeMetadata?: boolean;
  logger?: Logger;
}

/**
 * Plugin that logs HTTP responses to files
 * Similar to v1's FileLogger functionality
 */
export class FileLoggingPlugin implements ResponsePlugin {
  name = 'file-logging';

  constructor(private config: FileLoggingConfig) {}

  process(context: ResponseContext): unknown {
    try {
      // Generate file path based on endpoint
      const filePath = this.generateFilePath(context.url, context.method);
      const fullPath = join(this.config.outputDir, filePath);

      // Ensure directory exists
      mkdirSync(dirname(fullPath), { recursive: true });

      // Write response content
      writeFileSync(fullPath, context.rawText, 'utf8');
      this.config.logger?.trace(`Wrote response to: ${fullPath}`);

      // Write metadata if enabled
      if (this.config.writeMetadata) {
        const metadataPath = this.getMetadataPath(fullPath);
        const metadata = {
          url: context.url,
          method: context.method,
          contentType: context.contentType,
          timestamp: new Date().toISOString(),
          size: context.rawText.length,
        };
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
        this.config.logger?.trace(`Wrote metadata to: ${metadataPath}`);
      }
    } catch (error) {
      this.config.logger?.error(
        `Failed to write response file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return context.parsedData;
  }

  /**
   * Generate file path for HTTP response
   * Converts URL to fixture-style path structure
   */
  private generateFilePath(url: string, method: string): string {
    // Parse URL
    const urlObj = new URL(url);
    let path = urlObj.pathname;

    // Remove /sap/bc/adt prefix
    path = path.replace(/^\/sap\/bc\/adt\/?/, '');

    // Handle root/discovery
    if (!path || path === 'discovery') {
      return './adt/core/discovery.xml';
    }

    // Parse segments
    const [basePath] = path.split('?');
    const segments = basePath.split('/').filter((s) => s);

    // Check if source endpoint (no extension)
    const sourceTypes = [
      'main',
      'definitions',
      'implementations',
      'macros',
      'testclasses',
    ];
    const lastSegment = segments[segments.length - 1];

    if (sourceTypes.includes(lastSegment)) {
      return `./adt/${segments.join('/')}`;
    }

    // Generate request ID
    const requestId =
      Date.now().toString() + Math.random().toString(36).slice(2, 7);

    // Build directory path
    let dirPath = `./adt/${segments.join('/')}`;

    // Add query string to directory if present
    if (urlObj.search) {
      const sanitizedQuery = urlObj.search
        .slice(1)
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      dirPath += `/${sanitizedQuery}`;
    }

    // Use method in filename if not GET
    const methodPrefix = method !== 'GET' ? `${method.toLowerCase()}-` : '';

    return `${dirPath}/${methodPrefix}${requestId}-response.xml`;
  }

  /**
   * Get metadata file path for a response file
   */
  private getMetadataPath(responsePath: string): string {
    if (/-response\.xml$/.test(responsePath)) {
      return responsePath.replace(/-response\.xml$/, '-metadata.json');
    }
    if (/\.xml$/.test(responsePath)) {
      return responsePath.replace(/\.xml$/, '.metadata.json');
    }
    return `${responsePath}.metadata.json`;
  }
}
