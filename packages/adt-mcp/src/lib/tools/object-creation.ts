import type { ToolContext } from '../types';

export const CREATE_OBJECT_TYPES = [
  'PROG',
  'CLAS',
  'INTF',
  'FUGR',
  'DEVC',
] as const;

export const SOURCE_BACKED_OBJECT_TYPES = ['PROG', 'CLAS', 'INTF'] as const;

export type CreateObjectType = (typeof CREATE_OBJECT_TYPES)[number];
export type SourceBackedObjectType =
  (typeof SOURCE_BACKED_OBJECT_TYPES)[number];

type AdtClient = ReturnType<ToolContext['getClient']>;

type CreateObjectArgs = {
  objectType: CreateObjectType;
  objectName: string;
  description: string;
  packageName?: string;
  transport?: string;
};

export function isCreateObjectType(type: string): type is CreateObjectType {
  return CREATE_OBJECT_TYPES.includes(type.toUpperCase() as CreateObjectType);
}

export function isSourceBackedObjectType(
  type: string,
): type is SourceBackedObjectType {
  return SOURCE_BACKED_OBJECT_TYPES.includes(
    type.toUpperCase() as SourceBackedObjectType,
  );
}

export async function createAdtObject(
  client: AdtClient,
  args: CreateObjectArgs,
): Promise<void> {
  const packageRef = args.packageName
    ? { uri: `/sap/bc/adt/packages/${args.packageName.toUpperCase()}` }
    : undefined;
  const queryOptions = args.transport ? { corrNr: args.transport } : {};
  const commonFields = {
    name: args.objectName.toUpperCase(),
    description: args.description,
    language: 'EN',
    masterLanguage: 'EN',
    ...(packageRef ? { packageRef } : {}),
  };

  switch (args.objectType) {
    case 'PROG':
      await client.adt.programs.programs.post(queryOptions, {
        abapProgram: { ...commonFields, type: 'PROG' },
      });
      return;

    case 'CLAS':
      await client.adt.oo.classes.post(queryOptions, {
        abapClass: { ...commonFields, type: 'CLAS/OC' },
      });
      return;

    case 'INTF':
      await client.adt.oo.interfaces.post(queryOptions, {
        abapInterface: { ...commonFields, type: 'INTF/OI' },
      });
      return;

    case 'FUGR':
      await client.adt.functions.groups.post(queryOptions, {
        abapFunctionGroup: { ...commonFields, type: 'FUGR' },
      });
      return;

    case 'DEVC':
      await client.adt.packages.post(queryOptions, {
        package: {
          name: args.objectName.toUpperCase(),
          type: 'DEVC/K',
          description: args.description,
          language: 'EN',
          masterLanguage: 'EN',
          attributes: { packageType: 'development' },
          superPackage: {},
          extensionAlias: {},
          switch: {},
          applicationComponent: {},
          transport: {},
          translation: {},
          useAccesses: {},
          packageInterfaces: {},
          subPackages: {},
        },
      });
      return;
  }
}
