import {
  createHandler,
  type HandlerContext,
  type InferAdkData,
} from '../../src/lib/handlers/base.ts';
import { devc } from '../../src/schemas/generated/index.ts';
import { packageHandler } from '../../src/lib/handlers/objects/devc.ts';
import {
  createAffSourceFile,
  serializeAffSource,
  serializeDualFormat,
} from '../../src/lib/handlers/source-resolver.ts';
import { numberRangeObjectHandler } from '../../src/lib/handlers/objects/nrob.ts';

type PackageFacade = { name: string; description?: string };

const handler = createHandler<PackageFacade, typeof devc>('TYPE_FIXTURE', {
  schema: devc,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DEVC',
  serializer_version: 'v1.0.0',
  toAbapGit: (object) => ({ DEVC: { CTEXT: object.description ?? '' } }),
  fromAbapGit: ({ DEVC }) => ({ name: '', description: DEVC?.CTEXT }),
});

const payload: InferAdkData<PackageFacade> = {
  name: 'ZPACKAGE',
  description: 'Typed facade',
};
void handler.serialize(payload);
handler.fromAbapGit?.({ DEVC: { CTEXT: 'Typed metadata' } });

// @ts-expect-error A serialized facade must still have an object name.
void handler.serialize({ description: 'Missing object identity' });
// @ts-expect-error Schema inference must reject invalid metadata values.
handler.fromAbapGit?.({ DEVC: { CTEXT: 42 } });
// @ts-expect-error The ADK-class overload still requires an actual ADK object.
void packageHandler.serialize({ name: 'ZPACKAGE' });

type SourceFacade = PackageFacade & { getSource: () => Promise<string> };
declare const source: SourceFacade;
declare const context: HandlerContext<SourceFacade>;
const layout = { typeLabel: 'BDEF', sourceExt: 'abdl', jsonExt: 'bdef.json' };
void serializeAffSource(source, context, undefined, layout);
void serializeDualFormat(source, context, undefined, layout);
createAffSourceFile(context, {
  object: source,
  source: 'source',
  suppliedSource: undefined,
  sourceExt: 'abdl',
});

void numberRangeObjectHandler.serialize({ name: 'ZRANGE', domainLength: '10' });
// @ts-expect-error Interval state is not a number-range object attribute.
void numberRangeObjectHandler.serialize({ name: 'ZRANGE', nrLvl: '42' });
