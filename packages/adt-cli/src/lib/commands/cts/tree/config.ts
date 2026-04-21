/**
 * adt cts tree config - View/Edit search configuration
 *
 * Shows or edits the current search configuration used by the transport tree.
 * Uses fully typed contracts with adt-schemas.
 *
 * Usage:
 *   adt cts tree config         - View current configuration
 *   adt cts tree config --edit  - Interactive editor (Ink TUI)
 *   adt cts tree config --json  - Output as JSON
 */

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';
import {
  TreeConfigEditor,
  type TreeConfigState,
} from '../../../components/TreeConfigEditor';
import { treeConfigSetCommand } from './config-set';

// Date filter preset names
const DATE_FILTER_PRESETS: Record<string, string> = {
  '0': 'Last Week',
  '1': 'Last 2 Weeks',
  '2': 'Last 4 Weeks',
  '3': 'Last 3 Months',
  '4': 'Custom',
  '5': 'All Time',
};

/**
 * Format date from YYYYMMDD to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  if (dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

/**
 * Extract config ID from URI path
 */
function extractConfigId(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1];
}

/**
 * Convert properties from parsed configuration to key-value map.
 *
 * The typed PUT/GET schema stores property text as `$value` (ts-xsd
 * simpleContent convention — see `packages/ts-xsd/src/xml/parse.ts`).
 */
function propertiesToMap(config: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!config || typeof config !== 'object') return result;

  const configObj = config as Record<string, unknown>;
  const properties = configObj.properties as
    | Record<string, unknown>
    | undefined;

  if (!properties) return result;

  const propArray = properties.property;
  if (!propArray) return result;

  const props = Array.isArray(propArray) ? propArray : [propArray];

  for (const prop of props) {
    if (prop && typeof prop === 'object') {
      const p = prop as Record<string, unknown>;
      const key = p.key as string | undefined;
      const value = p.$value as string | undefined;
      if (key && value !== undefined) {
        result[key] = String(value);
      }
    }
  }
  return result;
}

/**
 * Convert API properties to TreeConfigState for the editor
 */
function propertiesToConfigState(
  properties: Record<string, string>,
  _configDetails: unknown,
): TreeConfigState {
  return {
    userName: (properties.User || '*') as string,
    customizingRequests: properties.CustomizingRequests === 'true',
    workbenchRequests: properties.WorkbenchRequests === 'true',
    transportOfCopies: properties.TransportOfCopies === 'true',
    modifiable: properties.Modifiable === 'true',
    released: properties.Released === 'true',
    releasedDateFilter: properties.DateFilter || '5',
    fromDate: properties.FromDate
      ? formatDate(properties.FromDate)
      : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
    toDate: properties.ToDate
      ? formatDate(properties.ToDate)
      : new Date().toISOString().slice(0, 10),
  };
}

/**
 * Convert TreeConfigState to Configuration schema format for saving
 * (matches ConfigurationSchema — root element is `configuration`)
 */
function configStateToConfigurationData(config: TreeConfigState) {
  // Convert date format YYYY-MM-DD to YYYYMMDD
  const fromDate = config.fromDate.replaceAll('-', '');
  const toDate = config.toDate.replaceAll('-', '');

  // Build properties array matching the schema structure.
  // simpleContent text is `$value` per ts-xsd convention.
  const properties = [
    { key: 'User', $value: config.userName },
    { key: 'WorkbenchRequests', $value: String(config.workbenchRequests) },
    { key: 'CustomizingRequests', $value: String(config.customizingRequests) },
    { key: 'TransportOfCopies', $value: String(config.transportOfCopies) },
    { key: 'Modifiable', $value: String(config.modifiable) },
    { key: 'Released', $value: String(config.released) },
    { key: 'DateFilter', $value: config.releasedDateFilter },
    { key: 'FromDate', $value: fromDate },
    { key: 'ToDate', $value: toDate },
  ];

  return {
    configuration: {
      properties: {
        property: properties,
      },
    },
  };
}

/**
 * Launch the interactive Ink-based editor
 */
async function launchEditor(
  initialConfig: TreeConfigState,
  onSave: (config: TreeConfigState) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let savedConfig: TreeConfigState | null = null;

    const handleSave = async (config: TreeConfigState) => {
      savedConfig = config;
    };

    const handleCancel = () => {
      // Silent exit - no message needed
      resolve();
    };

    const { waitUntilExit, clear } = render(
      React.createElement(TreeConfigEditor, {
        initialConfig,
        onSave: handleSave,
        onCancel: handleCancel,
      }),
    );

    waitUntilExit().then(async () => {
      // Clear the TUI from the terminal
      // Ink's clear() removes rendered content, then we clear remaining lines
      clear();
      // Move cursor up ~20 lines (TUI height) and clear from cursor to end of screen
      const tuiHeight = 20;
      process.stdout.write(`\x1b[${tuiHeight}A\x1b[J`);

      if (savedConfig) {
        try {
          await onSave(savedConfig);
          console.log('✅ Configuration saved successfully');
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        // Silent exit on cancel - no message
        resolve();
      }
    });
  });
}

export const treeConfigCommand = new Command('config')
  .description('View or edit search configuration')
  .addCommand(treeConfigSetCommand)
  .option('--json', 'Output as JSON')
  .option('-e, --edit', 'Open interactive editor')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();

      // Only show loading message in non-edit mode
      if (!options.edit) {
        console.log('🔍 Fetching search configuration...');
      }

      // Get configurations list (typed)
      const configsResponse =
        await client.adt.cts.transportrequests.searchconfiguration.configurations.get();

      // Response has 'configurations' property (plural) containing config array
      const configsData = configsResponse as { configurations?: unknown };
      const configs = configsData?.configurations as
        | Array<{ link?: { href?: string } }>
        | undefined;
      if (!configs) {
        console.log('\n📭 No search configuration found');
        return;
      }

      const configArray = Array.isArray(configs) ? configs : [configs];
      if (configArray.length === 0) {
        console.log('\n📭 No search configuration found');
        return;
      }

      const firstConfig = configArray[0];
      const configUri = firstConfig?.link?.href;

      if (!configUri) {
        console.log('\n❌ No configuration URI found');
        return;
      }

      // Extract config ID and fetch details using typed contract
      const configId = extractConfigId(configUri);
      const configDetailsRaw =
        await client.adt.cts.transportrequests.searchconfiguration.configurations.getById(
          configId,
        );

      // Response has nested structure - extract configuration object
      // Cast to expected shape for property access (matches ConfigurationSchema)
      type ConfigDetails = {
        configuration?: {
          properties?: {
            property?: Array<{
              key?: string;
              $value?: string;
              isMandatory?: boolean;
            }>;
          };
          createdBy?: string;
          createdAt?: string;
          changedBy?: string;
          changedAt?: string;
        };
      };
      const configDetails = (configDetailsRaw as ConfigDetails)?.configuration;

      // Convert properties to map for easy access
      const properties = propertiesToMap(
        configDetails as Record<string, unknown>,
      );

      // Edit mode - launch interactive editor
      if (options.edit) {
        const initialConfig = propertiesToConfigState(
          properties,
          configDetails,
        );

        // Save handler - updates the configuration on the server using typed contract
        const handleSave = async (newConfig: TreeConfigState) => {
          console.log('\n🔄 Saving configuration...');

          // Convert config to schema-compatible format
          const configData = configStateToConfigurationData(newConfig);

          // PUT the configuration back using the typed contract.
          // Note: CSRF token is auto-initialized by the adapter before writes.
          await client.adt.cts.transportrequests.searchconfiguration.configurations.put(
            configId,
            configData,
          );
        };

        await launchEditor(initialConfig, handleSave);
        return;
      }

      if (options.json) {
        const jsonOutput = {
          uri: configUri,
          configId,
          createdBy: configDetails?.createdBy,
          createdAt: configDetails?.createdAt,
          changedBy: configDetails?.changedBy,
          changedAt: configDetails?.changedAt,
          properties,
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
      } else {
        console.log('\n📋 Search Configuration');
        console.log('═'.repeat(50));

        // Metadata
        if (configDetails?.changedBy) {
          console.log(`\n📝 Last modified by: ${configDetails.changedBy}`);
        }
        if (configDetails?.changedAt) {
          console.log(`   Last modified at: ${configDetails.changedAt}`);
        }

        // Request Types
        console.log('\n📦 Request Types:');
        const requestTypes = [
          { key: 'WorkbenchRequests', label: 'Workbench' },
          { key: 'CustomizingRequests', label: 'Customizing' },
          { key: 'TransportOfCopies', label: 'Transport of Copies' },
        ];
        for (const rt of requestTypes) {
          const enabled = properties[rt.key] === 'true';
          console.log(`   ${enabled ? '✅' : '⬜'} ${rt.label}`);
        }

        // Status Filters
        console.log('\n📊 Status Filters:');
        const statuses = [
          { key: 'Modifiable', label: 'Modifiable' },
          { key: 'Released', label: 'Released' },
        ];
        for (const s of statuses) {
          const enabled = properties[s.key] === 'true';
          console.log(`   ${enabled ? '✅' : '⬜'} ${s.label}`);
        }

        // Owner
        console.log('\n👤 Owner Filter:');
        console.log(`   ${properties.User || '*'}`);

        // Date Range
        console.log('\n📅 Date Range:');
        const datePreset =
          DATE_FILTER_PRESETS[properties.DateFilter] || 'Unknown';
        console.log(`   Preset: ${datePreset}`);
        if (properties.FromDate) {
          console.log(`   From: ${formatDate(properties.FromDate)}`);
        }
        if (properties.ToDate) {
          console.log(`   To: ${formatDate(properties.ToDate)}`);
        }

        console.log('\n' + '═'.repeat(50));
        console.log(
          '💡 Configure in ADT Eclipse: Transport Organizer → Configure Tree',
        );
      }
    } catch (error) {
      console.error(
        '❌ Failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
