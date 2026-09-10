import { bdef } from '../../../schemas/generated';
import { createHandler, type SerializedFile } from '../base';
import { FormatMaterializationError } from '@abapify/adt-plugin';

interface DsfiDefinition {
  formatVersion: '1';
  header: {
    description: string;
    originalLanguage: string;
    abapLanguageVersion?: string;
  };
  scalarFunctionName: string;
  engine: 'analyticalEngine' | 'sqlEngine';
  sqlProperties?: { amdpReference: string; autoExposedInSqlServices?: boolean };
}

type DsfiLike = {
  name: string;
  getSource?: () => Promise<unknown>;
};

const VALID_ENGINES = new Set(['analyticalEngine', 'sqlEngine']);

function isDsfiDefinition(value: unknown): value is DsfiDefinition {
  const candidate = value as Partial<DsfiDefinition> | undefined;
  return (
    !!candidate &&
    candidate.formatVersion === '1' &&
    typeof candidate.scalarFunctionName === 'string' &&
    VALID_ENGINES.has(candidate.engine ?? '') &&
    typeof candidate.header?.description === 'string' &&
    typeof candidate.header?.originalLanguage === 'string'
  );
}

function parseDsfiDefinition(value: unknown): DsfiDefinition {
  let parsed: unknown;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    throw new FormatMaterializationError(
      'FORMAT_SOURCE_COMPONENT_UNSUPPORTED',
      'DSFI source/main did not return valid JSON.',
    );
  }
  if (!isDsfiDefinition(parsed)) {
    throw new FormatMaterializationError(
      'FORMAT_SOURCE_COMPONENT_UNSUPPORTED',
      'DSFI source/main did not return the required ABAP File Format JSON document.',
    );
  }
  return parsed;
}

export const scalarFunctionImplementationHandler = createHandler<
  DsfiLike,
  typeof bdef
>('DSFI', {
  schema: bdef,
  version: 'v1.0.0',
  serializer: 'LCL_OBJECT_DSFI',
  serializer_version: 'v1.0.0',
  toAbapGit: (obj) => ({
    SKEY: { TYPE: 'DSFI', NAME: String(obj?.name ?? '').toUpperCase() },
  }),
  fromAffJson: (json) => {
    const def = json as Partial<DsfiDefinition> | undefined;
    return {
      // Use filename-derived name (injected by deserializer); scalarFunctionName
      // is a reference, not the object identity.
      name: '',
      description: def?.header?.description,
      originalLanguage: def?.header?.originalLanguage,
      abapLanguageVersion: def?.header?.abapLanguageVersion,
    };
  },
  async serialize(object, ctx): Promise<SerializedFile[]> {
    const definition = parseDsfiDefinition(
      typeof object.getSource === 'function'
        ? await object.getSource()
        : undefined,
    );
    return [
      ctx.createFile(
        `${ctx.getObjectName(object)}.dsfi.json`,
        `${JSON.stringify(definition, null, 2)}\n`,
      ),
    ];
  },
});
