/**
 * ADT Configuration for abapify root
 *
 * This config enables CLI command plugins when running from abapify root.
 *
 * NOTE: Contract generation config is now in packages/adt-contracts/adt.config.ts
 * Run: npx nx run adt-contracts:generate-contracts
 */
import type { AdtConfig } from '@abapify/adt-config';

export default {
  // CLI command plugins to load dynamically
  commands: [
    // Code generation plugin
    '@abapify/adt-codegen/commands/codegen',
    // ATC (ABAP Test Cockpit) plugin - code quality checks
    '@abapify/adt-atc/commands/atc',
    // AUnit (ABAP Unit Tests) plugin - with JUnit XML for GitLab CI
    '@abapify/adt-aunit/commands/aunit',
    // Export plugin - deploy local files to SAP (aliased as 'deploy')
    '@abapify/adt-export/commands/export',
    // Roundtrip test - deploy, reimport, compare
    '@abapify/adt-export/commands/roundtrip',
    // Activate - bulk activate inactive objects
    '@abapify/adt-export/commands/activate',
  ],
} as AdtConfig;
