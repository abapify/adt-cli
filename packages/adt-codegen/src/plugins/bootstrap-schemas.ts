/**
 * Bootstrap Schemas Plugin
 *
 * Extracts schema templates from collection accepts content types
 * - Generates JSON Schema templates for application/*+json types
 * - Generates XML Schema (XSD) templates for application/*+xml types
 */

import { definePlugin } from '../plugin';
import type { CodegenPlugin } from '../types';

/**
 * Schema info extracted from content type
 */
export interface SchemaInfo {
  contentType: string;
  format: 'json' | 'xml';
  schemaPath: string;
}

export interface BootstrapSchemasOptions {
  /**
   * Output path template for schema files
   *
   * Can be:
   * - String with {contentType}, {format} placeholders
   * - Function: `(info) => \`schemas/\${info.schemaPath}\``
   *
   * @default 'schemas/{schemaPath}'
   */
  output?: string | ((info: SchemaInfo) => string | false);

  /**
   * If true, assert that each output path is unique (no overwrites)
   * @default false
   */
  unique?: boolean;
}

/**
 * Convert content type to schema path
 * application/vnd.sap.adt.objecttypeconfiguration.v1+json
 * -> application/vnd/sap/adt/objecttypeconfiguration/v1.json
 */
function contentTypeToPath(
  contentType: string,
  format: 'json' | 'xml',
): string {
  // Remove +json or +xml suffix
  const base = contentType.replace(/\+(json|xml)$/, '');

  // Replace dots with slashes
  const path = base.replace(/\./g, '/');

  // Add appropriate extension
  const ext = format === 'json' ? 'json' : 'xsd';

  return `${path}.${ext}`;
}

/**
 * Generate JSON Schema template
 */
function generateJsonSchemaTemplate(contentType: string): string {
  const schemaId = contentType.replace(/\+json$/, '');

  return JSON.stringify(
    {
      $schema: 'http://json-schema.org/draft-07/schema#',
      $id: schemaId,
      title: `Schema for ${contentType}`,
      type: 'object',
      properties: {},
      additionalProperties: true,
    },
    null,
    2,
  );
}

/**
 * Generate XML Schema (XSD) template
 */
function generateXmlSchemaTemplate(contentType: string): string {
  const namespace = contentType.replace(/\+xml$/, '');

  return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="${namespace}"
           xmlns="${namespace}"
           elementFormDefault="qualified">
  
  <!-- Schema for ${contentType} -->
  
  <xs:element name="root">
    <xs:complexType>
      <xs:sequence>
        <!-- Define elements here -->
      </xs:sequence>
    </xs:complexType>
  </xs:element>
  
</xs:schema>`;
}

/**
 * Factory function to create bootstrap schemas plugin
 */
export function bootstrapSchemas(
  options: BootstrapSchemasOptions = {},
): CodegenPlugin {
  const { output = 'schemas/{schemaPath}', unique = false } = options;

  return definePlugin({
    name: 'bootstrap-schemas',

    hooks: {
      async finalize(ctx) {
        const isFunction = typeof output === 'function';
        const seenPaths = new Set<string>();
        const schemas = new Map<string, SchemaInfo>();

        // Collect all schemas from collections
        for (const ws of ctx.workspaces) {
          if (ws.data.collectionDetails) {
            for (const coll of ws.data.collectionDetails) {
              if (coll.accepts && Array.isArray(coll.accepts)) {
                for (const contentType of coll.accepts) {
                  // Check if it's a schema type (+json or +xml)
                  if (contentType.includes('+json')) {
                    const schemaPath = contentTypeToPath(contentType, 'json');
                    schemas.set(contentType, {
                      contentType,
                      format: 'json',
                      schemaPath,
                    });
                  } else if (contentType.includes('+xml')) {
                    const schemaPath = contentTypeToPath(contentType, 'xml');
                    schemas.set(contentType, {
                      contentType,
                      format: 'xml',
                      schemaPath,
                    });
                  }
                }
              }
            }
          }
        }

        // Generate schema files
        let generatedCount = 0;

        for (const info of schemas.values()) {
          let filePath: string | false;

          if (isFunction) {
            filePath = output(info);
            if (filePath === false) continue; // Skip this schema
          } else {
            filePath = output
              .replace(/{contentType}/g, info.contentType)
              .replace(/{format}/g, info.format)
              .replace(/{schemaPath}/g, info.schemaPath);
          }

          // Check uniqueness if enabled
          if (unique && filePath) {
            if (seenPaths.has(filePath)) {
              throw new Error(
                `Duplicate schema path detected: "${filePath}"\n` +
                  `Content type: ${info.contentType}\n` +
                  `Enable unique: true requires each schema to have a unique output path.`,
              );
            }
            seenPaths.add(filePath);
          }

          // Generate template content
          const content =
            info.format === 'json'
              ? generateJsonSchemaTemplate(info.contentType)
              : generateXmlSchemaTemplate(info.contentType);

          // Write to first workspace (schemas are global)
          if (ctx.workspaces.length > 0 && filePath) {
            await ctx.workspaces[0].writeFile(filePath, content);
            generatedCount++;
          }
        }

        if (generatedCount > 0) {
          ctx.logger.success(`Generated ${generatedCount} schema templates`);
        }
      },
    },
  });
}

/**
 * Default plugin instance (for backward compatibility)
 */
export const bootstrapSchemasPlugin = bootstrapSchemas();
