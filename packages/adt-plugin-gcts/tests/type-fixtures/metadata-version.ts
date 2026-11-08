import { createHandler } from '../../src/lib/handlers/base.ts';
import type { GctsMetadata } from '../../src/lib/format/types.ts';

const accept = (metadata: GctsMetadata): GctsMetadata => metadata;

// Current shape: version at the top level.
accept({ formatVersion: '1', header: { description: 'Current' } });
// Legacy shape: version in the header.
accept({ header: { formatVersion: '1', description: 'Legacy' } });
// Both locations may carry the version.
accept({ formatVersion: '1', header: { formatVersion: '1' } });
// @ts-expect-error A version is required at the top level or in the header.
accept({ header: { description: 'Versionless' } });
// @ts-expect-error An undefined top-level version is not a version.
accept({ formatVersion: undefined, header: {} });

type Facade = { name: string };

createHandler<Facade, GctsMetadata>('TYPE_FIXTURE', {
  toMetadata: () => ({ formatVersion: '1', header: { description: 'Top' } }),
});
createHandler<Facade, GctsMetadata>('TYPE_FIXTURE', {
  toMetadata: () => ({ header: { formatVersion: '1', description: 'Old' } }),
});
// @ts-expect-error Handlers cannot return versionless metadata.
createHandler<Facade, GctsMetadata>('TYPE_FIXTURE', {
  toMetadata: () => ({ header: { description: 'Versionless' } }),
});
