import { createHandler } from '../../src/lib/handlers/base.ts';
import type { BdefAff } from '../../src/schemas/generated/index.ts';

type SourceFacade = { name: string; description: string };
const handler = createHandler<SourceFacade, BdefAff>('BDEF', {
  toMetadata: (object) => ({
    formatVersion: '1',
    header: { description: object.description, originalLanguage: 'en' },
  }),
});
void handler.serialize({ name: 'ZBEHAVIOR', description: 'Typed source' });
// @ts-expect-error Object identity remains mandatory.
void handler.serialize({ description: 'Missing name' });
// @ts-expect-error Concrete AFF schemas still require their header.
createHandler<SourceFacade, BdefAff>('BDEF_INVALID', {
  toMetadata: () => ({ formatVersion: '1' }),
});

// Compile actual schema-backed handlers, not just the common factory.
import { ddlSourceHandler } from '../../src/lib/handlers/objects/ddls.ts';
import '../../src/lib/handlers/objects/doma.ts';
import '../../src/lib/handlers/objects/dtel.ts';
import '../../src/lib/handlers/objects/prog.ts';
void ddlSourceHandler.serialize({ name: 'ZVIEW', sourceType: 'viewEntity' });
// @ts-expect-error Source origin must be an official AFF value.
void ddlSourceHandler.serialize({ name: 'ZVIEW', sourceOrigin: 'invented' });
