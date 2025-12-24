/**
 * adt cts create - Create a new transport request (interactive)
 *
 * Uses ADK layer for proper transport creation.
 * Provides interactive prompts for transport creation options.
 *
 * Usage:
 *   adt cts create                    # Interactive mode
 *   adt cts create -d "Description"   # Non-interactive with description
 *   adt cts create --json             # Output as JSON
 */

import { Command } from 'commander';
import { input, select, confirm } from '@inquirer/prompts';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';
import { AdkTransportRequest } from '@abapify/adk';

/**
 * Transport creation input (matches schema structure)
 */
interface TransportCreateInput {
  description: string;
  type: string;
  target: string;
  project?: string;
  owner?: string;
}

// Transport type options
const TRANSPORT_TYPES = [
  { name: 'Workbench Request (K)', value: 'K' },
  { name: 'Customizing Request (W)', value: 'W' },
];

// Human-readable type names
const TYPE_NAMES: Record<string, string> = {
  K: 'Workbench Request',
  W: 'Customizing Request',
};

/**
 * Interactive prompts for transport creation
 */
async function promptForOptions(
  existingOptions: Partial<TransportCreateInput>,
): Promise<TransportCreateInput> {
  // Description is required
  const description =
    existingOptions.description ||
    (await input({
      message: '📝 Transport description:',
      validate: (value) =>
        value.trim().length > 0 ? true : 'Description is required',
    }));

  // Transport type
  const type =
    existingOptions.type ||
    (await select({
      message: '📦 Transport type:',
      choices: TRANSPORT_TYPES,
      default: 'K',
    }));

  // Target system (optional, default LOCAL)
  const target =
    existingOptions.target ||
    (await input({
      message: '🎯 Target system (press Enter for LOCAL):',
      default: 'LOCAL',
    }));

  // CTS Project (optional)
  const wantProject = await confirm({
    message: '📁 Assign to a CTS project?',
    default: false,
  });

  let project: string | undefined;
  if (wantProject) {
    project = await input({
      message: '📁 CTS project name:',
    });
  }

  return {
    description: description.trim(),
    type,
    target: target || 'LOCAL',
    project: project || undefined,
  };
}

/**
 * Format transport creation result for display
 */
function displayResult(tr: AdkTransportRequest): void {
  console.log('\n✅ Transport request created successfully!\n');
  console.log(`🚛 Transport: ${tr.number}`);
  console.log(`   Description: ${tr.description}`);
  console.log(`   Type: ${TYPE_NAMES[tr.type] || tr.type}`);
  console.log(`   Target: ${tr.target || 'LOCAL'}`);
  console.log(`   Owner: ${tr.owner || '(current user)'}`);
  console.log(`   Status: ${tr.statusText}`);

  // Display tasks if present
  const tasks = tr.tasks;
  if (tasks.length > 0) {
    console.log('\n📋 Tasks:');
    for (const task of tasks) {
      console.log(`   └── ${task.number} (${task.owner || 'current user'})`);
    }
  }
}

export const ctsCreateCommand = new Command('create')
  .description('Create a new transport request')
  .option('-d, --description <desc>', 'Transport description')
  .option(
    '-t, --type <type>',
    'Transport type: K (Workbench) or W (Customizing)',
    'K',
  )
  .option('--target <target>', 'Target system', 'LOCAL')
  .option('--project <project>', 'CTS project')
  .option('--no-interactive', 'Skip interactive prompts (requires -d)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const client = await getAdtClientV2();

      let createOptions: TransportCreateInput;

      // Determine if we should use interactive mode
      const useInteractive =
        options.interactive !== false && !options.description;

      if (useInteractive) {
        console.log('🚚 Create Transport Request\n');
        createOptions = await promptForOptions({
          description: options.description,
          type: options.type as 'K' | 'W',
          target: options.target,
          project: options.project,
        });
      } else {
        // Non-interactive mode - description is required
        if (!options.description) {
          console.error('❌ Description is required in non-interactive mode');
          console.error('💡 Use -d or --description to provide a description');
          process.exit(1);
        }

        createOptions = {
          description: options.description,
          type: (options.type as 'K' | 'W') || 'K',
          target: options.target || 'LOCAL',
          project: options.project,
        };
      }

      // Show what we're creating
      if (!options.json) {
        console.log(
          `\n🔄 Creating ${TYPE_NAMES[createOptions.type || 'K']}...`,
        );
        console.log(`   Description: "${createOptions.description}"`);
        console.log(`   Target: ${createOptions.target}`);
        if (createOptions.project) {
          console.log(`   Project: ${createOptions.project}`);
        }
      }

      // Create the transport via ADK layer
      // ADK expects (options, ctx?) - ctx is AdkContext with client property
      const tr = await AdkTransportRequest.create(
        {
          description: createOptions.description,
          type: createOptions.type as 'K' | 'W',
          target: createOptions.target,
          project: createOptions.project,
          owner: createOptions.owner,
        },
        { client },
      );

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              transport: tr.number,
              description: tr.description,
              type: tr.type,
              target: tr.target,
              owner: tr.owner,
              status: tr.statusText,
              tasks: tr.tasks.map((t) => ({
                number: t.number,
                owner: t.owner,
              })),
            },
            null,
            2,
          ),
        );
      } else {
        displayResult(tr);
      }
    } catch (error) {
      console.error(
        '❌ Transport creation failed:',
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });
