import { Command } from 'commander';
import { getAdtClientV2 } from '../utils/adt-client-v2';
import { normalizeSearchResults } from '../utils/lock-helpers';
import { getObjectUri } from '@abapify/adk';
import { extractDependencies, stripToPublicApi } from '@abapify/adt-lint';

type AdtClient = Awaited<ReturnType<typeof getAdtClientV2>>;

async function resolveUri(
  client: AdtClient,
  objectName: string,
  objectType?: string,
): Promise<string> {
  if (objectType) {
    const uri = getObjectUri(objectType, objectName);
    if (uri) return uri;
  }

  const searchResult =
    await client.adt.repository.informationsystem.search.quickSearch({
      query: objectName,
      maxResults: 10,
    });
  const objects = normalizeSearchResults(
    searchResult as Record<string, unknown>,
  );
  const match = objects.find(
    (o) => o.name?.toUpperCase() === objectName.toUpperCase(),
  );

  if (!match?.uri) throw new Error(`Object '${objectName}' not found`);
  return match.uri;
}

export const contextCommand = new Command('context')
  .description('Get compressed dependency context for an ABAP object')
  .argument('<objectName>', 'ABAP object name')
  .option('--type <type>', 'Object type hint (CLAS, INTF, PROG, DDLS, FUNC)')
  .option('--depth <depth>', 'Dependency depth (1..3)', '1')
  .option('--max-deps <maxDeps>', 'Maximum dependencies to include', '20')
  .option('--json', 'Output as JSON', true)
  .action(
    async (
      objectName: string,
      options: {
        type?: string;
        depth?: string;
        maxDeps?: string;
        json?: boolean;
      },
    ) => {
      try {
        const client = await getAdtClientV2();
        const depth = Math.min(Math.max(Number(options.depth ?? 1), 1), 3);
        const maxDeps = Math.max(Number(options.maxDeps ?? 20), 1);

        const uri = await resolveUri(client, objectName, options.type);
        const source = String(
          await client.fetch(`${uri}/source/main`, {
            method: 'GET',
            headers: { Accept: 'text/plain' },
          }),
        );

        const queue = extractDependencies(source).map((name) => ({
          name,
          level: 1,
        }));
        const seen = new Set<string>();
        const dependencies: Array<{
          name: string;
          type?: string;
          uri?: string;
          source: string;
          fallback: boolean;
        }> = [];

        while (queue.length > 0 && dependencies.length < maxDeps) {
          const current = queue.shift();
          if (!current) break;
          if (seen.has(current.name)) continue;
          seen.add(current.name);

          const searchResult =
            await client.adt.repository.informationsystem.search.quickSearch({
              query: current.name,
              maxResults: 10,
            });
          const objects = normalizeSearchResults(
            searchResult as Record<string, unknown>,
          );
          const match = objects.find(
            (item) => item.name?.toUpperCase() === current.name,
          );
          if (!match?.uri) continue;

          const depSource = String(
            await client.fetch(`${match.uri}/source/main`, {
              method: 'GET',
              headers: { Accept: 'text/plain' },
            }),
          );
          const stripped = stripToPublicApi(depSource, match.type ?? 'CLAS');

          dependencies.push({
            name: current.name,
            type: match.type,
            uri: match.uri,
            source: stripped.source,
            fallback: stripped.fallback,
          });

          if (current.level < depth) {
            for (const next of extractDependencies(depSource)) {
              if (!seen.has(next))
                queue.push({ name: next, level: current.level + 1 });
            }
          }
        }

        const result = {
          object: { name: objectName, type: options.type, uri },
          settings: {
            depth,
            maxDeps,
            truncated: dependencies.length >= maxDeps,
          },
          dependencies,
        };

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(
            `Dependencies for ${objectName}: ${dependencies.map((d) => d.name).join(', ')}`,
          );
        }
      } catch (error) {
        console.error(
          '❌ Context failed:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );
