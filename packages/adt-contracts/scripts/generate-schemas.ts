/**
 * Generate schemas.ts with speci-compatible wrappers
 *
 * This script reads all schema exports from @abapify/adt-schemas
 * and generates the schemas.ts file with toSpeciSchema() wrappers.
 *
 * Run: npx tsx scripts/generate-schemas.ts
 */

import * as adtSchemas from '@abapify/adt-schemas';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Identify TypedSchema instances (ts-xsd) vs JSON schemas (zod)
// TypedSchema has: parse(), build(), schema property, _type property
// JSON schemas have: parse() but NO schema property
const allExports = Object.entries(adtSchemas);

const xmlSchemaExports = allExports.filter(([_, value]) => {
  return (
    value && typeof value === 'object' && 'parse' in value && 'schema' in value
  ); // TypedSchema has schema property
});

const jsonSchemaExports = allExports.filter(([_, value]) => {
  return (
    value &&
    typeof value === 'object' &&
    'parse' in value &&
    !('schema' in value)
  ); // JSON schemas don't have schema property
});

// Get schema names and sort alphabetically
const xmlSchemaNames = xmlSchemaExports.map(([name]) => name).sort();
const jsonSchemaNames = jsonSchemaExports.map(([name]) => name).sort();

// Generate the file content
const output = `/**
 * Generated schema exports
 * 
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run: npx tsx scripts/generate-schemas.ts
 */

import * as adtSchemas from '@abapify/adt-schemas';
import { toSpeciSchema } from '../helpers/speci-schema';

// ============================================================================
// XML Schemas (wrapped for speci compatibility)
// ============================================================================
${xmlSchemaNames.map((name) => `export const ${name} = toSpeciSchema(adtSchemas.${name});`).join('\n')}

// ============================================================================
// JSON Schemas (re-exported directly - they use zod, not ts-xsd)
// ============================================================================
${jsonSchemaNames.length > 0 ? `export { ${jsonSchemaNames.join(', ')} } from '@abapify/adt-schemas';` : '// No JSON schemas found'}
`;

// Write to file
const outputPath = join(import.meta.dirname, '../src/generated/schemas.ts');
writeFileSync(outputPath, output);

console.log(`✅ Generated schemas.ts`);
console.log(
  `   XML schemas (${xmlSchemaNames.length}): ${xmlSchemaNames.join(', ')}`,
);
console.log(
  `   JSON schemas (${jsonSchemaNames.length}): ${jsonSchemaNames.join(', ')}`,
);
