import { http } from '@abapify/speci/rest';
import type { Serializable } from '@abapify/speci/rest';
import { crud } from '../../../helpers/crud';
import {
  blueSource as blueSourceSchema,
  type InferTypedSchema,
} from '../../../schemas';

export interface DsfiDefinition {
  formatVersion: '1';
  header: {
    description: string;
    originalLanguage: string;
    abapLanguageVersion?: string;
  };
  scalarFunctionName: string;
  engine: 'analyticalEngine' | 'sqlEngine';
  sqlProperties?: {
    amdpReference: string;
    autoExposedInSqlServices?: boolean;
  };
}

export const dsfiDefinitionSchema: Serializable<DsfiDefinition> = {
  _infer: undefined as unknown as DsfiDefinition,
  parse: (raw) => JSON.parse(raw) as DsfiDefinition,
  build: (value) => JSON.stringify(value),
};

const baseContract = crud({
  basePath: '/sap/bc/adt/ddic/dsfi',
  schema: blueSourceSchema,
  contentType: 'application/vnd.sap.adt.blues.v1+xml',
  accept: 'application/vnd.sap.adt.blues.v1+xml',
  nameTransform: (name) => encodeURIComponent(name.toLowerCase()),
});

export type DsfiResponse = InferTypedSchema<typeof blueSourceSchema>;

export const dsfiContract = {
  ...baseContract,
  source: {
    main: {
      get: (name: string) =>
        http.get(
          `/sap/bc/adt/ddic/dsfi/${encodeURIComponent(name.toLowerCase())}/source/main`,
          {
            responses: { 200: dsfiDefinitionSchema },
            headers: { Accept: 'application/json' },
          },
        ),
    },
  },
};
