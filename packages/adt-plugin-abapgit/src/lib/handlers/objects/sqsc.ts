/**
 * SQSC (Database Procedure Proxy) handler for abapGit format
 *
 * Database procedure proxies are XML-only. The abapGit format stores
 * description, header, parameters, and parameter types under a single SQSC node.
 */

import { sqsc } from '../../../schemas/generated';
import { createHandler } from '../base';

type DbProcProxyLike = {
  name: string;
  description?: string;
  dbRepositoryPackage?: string;
  dbRepositoryProcName?: string;
  dbCatalogSchema?: string;
  dbCatalogProcName?: string;
  readOnly?: boolean;
  interfacePool?: string;
};

export const dbProcProxyHandler = createHandler<DbProcProxyLike, typeof sqsc>(
  'SQSC',
  {
    schema: sqsc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_SQSC',
    serializer_version: 'v1.0.0',

    toAbapGit: (obj) => ({
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
      },
    }),

    fromAbapGit: ({ SQSC }) => ({
      name: '',
      description: SQSC?.DESCRIPTION,
      dbRepositoryPackage: SQSC?.HEADER?.DB_REPOSITORY_PACKAGE,
      dbRepositoryProcName: SQSC?.HEADER?.DB_REPOSITORY_PROC_NAME,
      dbCatalogSchema: SQSC?.HEADER?.DB_CATALOG_SCHEMA,
      dbCatalogProcName: SQSC?.HEADER?.DB_CATALOG_PROC_NAME,
      readOnly: SQSC?.HEADER?.READ_ONLY === 'X',
      interfacePool: SQSC?.HEADER?.INTERFACE_POOL,
    }),
  },
);
