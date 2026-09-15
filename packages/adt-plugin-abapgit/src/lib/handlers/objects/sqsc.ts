/**
 * SQSC (Database Procedure Proxy) handler for abapGit format
 *
 * Database procedure proxies are XML-only. The abapGit format stores
 * description, header, parameters, and parameter types under a single SQSC node.
 */

import { sqsc } from '../../../schemas/generated';
import { createHandler, normalizeItems, mapItems, unwrapData } from '../base';

type DbProcProxyLike = {
  name: string;
  description?: string;
  dbRepositoryPackage?: string;
  dbRepositoryProcName?: string;
  dbCatalogSchema?: string;
  dbCatalogProcName?: string;
  readOnly?: boolean;
  interfacePool?: string;
  parameters?: Array<{
    position?: string;
    dbName?: string;
    direction?: string;
    kind?: string;
    dbTableTypeSchema?: string;
    dbTableTypeName?: string;
    dbTableTypeIsDdic?: boolean;
    transferTableSchema?: string;
    transferTableName?: string;
    abapName?: string;
    abapNameIsRo?: boolean;
    ddicTable?: string;
    ddicTableIsRo?: boolean;
  }>;
  parameterTypes?: Array<{
    paramPosition?: string;
    compIndex?: string;
    dbCompName?: string;
    abapCompName?: string;
    abapCompNameIsRo?: boolean;
    dbType?: string;
    dbTypeText?: string;
    abapTypeIsRo?: boolean;
    ddicType?: string;
    ddicTypeIsRo?: boolean;
  }>;
};

export const dbProcProxyHandler = createHandler<DbProcProxyLike, typeof sqsc>(
  'SQSC',
  {
    schema: sqsc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SQSC',
    serializer_version: 'v1.0.0',

    toAbapGit: (raw) => {
      const obj = unwrapData<DbProcProxyLike>(raw);
      return {
        SQSC: {
          DESCRIPTION: obj.description,
          HEADER: {
            DB_REPOSITORY_PACKAGE: obj.dbRepositoryPackage,
            DB_REPOSITORY_PROC_NAME: obj.dbRepositoryProcName,
            DB_CATALOG_SCHEMA: obj.dbCatalogSchema,
            DB_CATALOG_PROC_NAME: obj.dbCatalogProcName,
            READ_ONLY: obj.readOnly ? 'X' : undefined,
            INTERFACE_POOL: obj.interfacePool,
          },
          PARAMETERS: obj.parameters?.length
            ? {
                item: obj.parameters.map((p) => ({
                  POSITION: p.position,
                  DB_NAME: p.dbName,
                  DIRECTION: p.direction,
                  KIND: p.kind,
                  DB_TABLE_TYPE_SCHEMA: p.dbTableTypeSchema,
                  DB_TABLE_TYPE_NAME: p.dbTableTypeName,
                  DB_TABLE_TYPE_IS_DDIC: p.dbTableTypeIsDdic ? 'X' : undefined,
                  TRANSFER_TABLE_SCHEMA: p.transferTableSchema,
                  TRANSFER_TABLE_NAME: p.transferTableName,
                  ABAP_NAME: p.abapName,
                  ABAP_NAME_IS_RO: p.abapNameIsRo ? 'X' : undefined,
                  DDIC_TABLE: p.ddicTable,
                  DDIC_TABLE_IS_RO: p.ddicTableIsRo ? 'X' : undefined,
                })),
              }
            : undefined,
          PARAMETER_TYPES: obj.parameterTypes?.length
            ? {
                item: obj.parameterTypes.map((t) => ({
                  PARAM_POSITION: t.paramPosition,
                  COMP_INDEX: t.compIndex,
                  DB_COMP_NAME: t.dbCompName,
                  ABAP_COMP_NAME: t.abapCompName,
                  ABAP_COMP_NAME_IS_RO: t.abapCompNameIsRo ? 'X' : undefined,
                  DB_TYPE: t.dbType,
                  DB_TYPE_TEXT: t.dbTypeText,
                  ABAP_TYPE_IS_RO: t.abapTypeIsRo ? 'X' : undefined,
                  DDIC_TYPE: t.ddicType,
                  DDIC_TYPE_IS_RO: t.ddicTypeIsRo ? 'X' : undefined,
                })),
              }
            : undefined,
        },
      };
    },

    fromAbapGit: ({ SQSC }) => {
      const parameters = normalizeItems(SQSC?.PARAMETERS?.item);
      const parameterTypes = normalizeItems(SQSC?.PARAMETER_TYPES?.item);
      return {
        name: '',
        description: SQSC?.DESCRIPTION,
        dbRepositoryPackage: SQSC?.HEADER?.DB_REPOSITORY_PACKAGE,
        dbRepositoryProcName: SQSC?.HEADER?.DB_REPOSITORY_PROC_NAME,
        dbCatalogSchema: SQSC?.HEADER?.DB_CATALOG_SCHEMA,
        dbCatalogProcName: SQSC?.HEADER?.DB_CATALOG_PROC_NAME,
        readOnly: SQSC?.HEADER?.READ_ONLY === 'X',
        interfacePool: SQSC?.HEADER?.INTERFACE_POOL,
        parameters: mapItems(parameters, (p) => ({
          position: p.POSITION,
          dbName: p.DB_NAME,
          direction: p.DIRECTION,
          kind: p.KIND,
          dbTableTypeSchema: p.DB_TABLE_TYPE_SCHEMA,
          dbTableTypeName: p.DB_TABLE_TYPE_NAME,
          dbTableTypeIsDdic: p.DB_TABLE_TYPE_IS_DDIC === 'X',
          transferTableSchema: p.TRANSFER_TABLE_SCHEMA,
          transferTableName: p.TRANSFER_TABLE_NAME,
          abapName: p.ABAP_NAME,
          abapNameIsRo: p.ABAP_NAME_IS_RO === 'X',
          ddicTable: p.DDIC_TABLE,
          ddicTableIsRo: p.DDIC_TABLE_IS_RO === 'X',
        })),
        parameterTypes: mapItems(parameterTypes, (t) => ({
          paramPosition: t.PARAM_POSITION,
          compIndex: t.COMP_INDEX,
          dbCompName: t.DB_COMP_NAME,
          abapCompName: t.ABAP_COMP_NAME,
          abapCompNameIsRo: t.ABAP_COMP_NAME_IS_RO === 'X',
          dbType: t.DB_TYPE,
          dbTypeText: t.DB_TYPE_TEXT,
          abapTypeIsRo: t.ABAP_TYPE_IS_RO === 'X',
          ddicType: t.DDIC_TYPE,
          ddicTypeIsRo: t.DDIC_TYPE_IS_RO === 'X',
        })),
      };
    },
  },
);
