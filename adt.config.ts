/**
 * ADT Configuration for abapify root
 *
 * This config enables CLI command plugins when running from abapify root.
 *
 * NOTE: Contract generation config is now in packages/adt-contracts/adt.config.ts
 * Run: npx nx run adt-contracts:generate-contracts
 */

export default {
  // CLI command plugins to load dynamically
  commands: [
    // Code generation plugin
    '@abapify/adt-codegen/commands/codegen',
    // ATC (ABAP Test Cockpit) plugin - code quality checks
    '@abapify/adt-atc/commands/atc',
    // Export plugin - deploy local files to SAP (aliased as 'deploy')
    '@abapify/adt-export/commands/export',
  ],
};
