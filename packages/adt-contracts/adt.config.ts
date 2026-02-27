/**
 * ADT Contracts - Code Generation Configuration
 *
 * This package generates its own contracts from SAP ADT discovery data.
 *
 * Usage:
 *   npx nx run adt-contracts:generate-contracts
 *
 * The command will:
 * 1. Fetch discovery from SAP if not cached (requires: npx adt auth login)
 * 2. Cache discovery XML to tmp/discovery/discovery.xml
 * 3. Generate contracts to src/generated/adt/
 */

import { contentTypeMapping } from './config/contracts/content-type-mapping.ts';
import { enabledEndpoints } from './config/contracts/enabled-endpoints.ts';

/**
 * Import resolver for generated contracts
 * Uses tsconfig path aliases - tsdown 0.18+ resolves these in .d.ts files
 */
const resolveImports = () => ({
  base: '#base',
  schemas: '#schemas',
});

export default {
  // CLI command plugins to load dynamically
  commands: ['@abapify/adt-codegen/commands/codegen'],

  // Contract generation configuration
  contracts: {
    // Discovery XML cache path (auto-fetched from SAP if not exists)
    discovery: 'tmp/discovery/discovery.xml',

    // Content-type to schema mapping
    contentTypeMapping,

    // Endpoints whitelist
    enabledEndpoints,

    // Output directories
    output: 'src/generated/adt',
    docs: 'docs',

    // Custom import resolver for package self-references
    resolveImports,

    // Clean output directory before generating
    clean: true,
  },
};
