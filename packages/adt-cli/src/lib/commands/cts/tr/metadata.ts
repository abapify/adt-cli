import { Command } from 'commander';
import { getAdtClientV2 } from '../../../utils/adt-client-v2';
import { CtsTransportMetadataService } from '../../../services/cts';

type AdtClient = Awaited<ReturnType<typeof getAdtClientV2>>;
type MetadataServicePort = Pick<CtsTransportMetadataService, 'get'>;

export interface CtsTransportMetadataCommandDependencies {
  getClient: () => Promise<AdtClient>;
  createService: (client: AdtClient) => MetadataServicePort;
  writeLine: (content: string) => void;
  writeError: (content: string) => void;
  setExitCode: (code: number) => void;
}

const DEFAULT_DEPENDENCIES: CtsTransportMetadataCommandDependencies = {
  getClient: getAdtClientV2,
  createService: (client) => new CtsTransportMetadataService(client),
  writeLine: (content) => console.log(content),
  writeError: (content) => console.error(content),
  setExitCode: (code) => {
    process.exitCode = code;
  },
};

/** Create a machine-readable CTS metadata command with no progress on stdout. */
export function createCtsTransportMetadataCommand(
  overrides: Partial<CtsTransportMetadataCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('metadata')
    .description('Get typed CTS request/task metadata for automation')
    .argument('<transport>', 'Transport request or task number')
    .option('--json', 'Output metadata as JSON')
    .action(async (transport: string, options: { json?: boolean }) => {
      try {
        const metadata = await dependencies
          .createService(await dependencies.getClient())
          .get(transport);
        if (options.json) {
          dependencies.writeLine(JSON.stringify(metadata, null, 2));
          return;
        }
        for (const unit of metadata.units) {
          dependencies.writeLine(
            `${unit.kind} ${unit.number}: ${unit.status ?? 'unknown'} ${unit.type ?? ''}`.trim(),
          );
        }
      } catch (error) {
        dependencies.writeError(
          `Transport metadata failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        dependencies.setExitCode(1);
      }
    });
}

export const ctsTransportMetadataCommand = createCtsTransportMetadataCommand();
