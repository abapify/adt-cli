/**
 * ABAP object creation / deletion via typed ADT contracts.
 *
 * STATUS (parity note): the original intent of the consolidation PR was to
 * route MCP object CRUD through @abapify/adk so that MCP shares the exact
 * save/lock/ETag orchestration used by the CLI. That refactor was scoped
 * out of this change because ADK's full save flow (checkObjectExists +
 * metadata PUT + lock + ETag refresh + source PUT) requires many more
 * mock-server endpoints than currently exist. The tool still uses the
 * typed contracts from @abapify/adt-client (schema-driven XML) and
 * initializes ADK so that `ctx.lockService` is available to any helper
 * that needs it — which gets us most of the way to parity without the
 * mock churn.
 *
 * TODO: migrate to AdkClass.create / AdkProgram.create / AdkInterface.create
 *       / AdkPackage.create once the mock server gains coverage for the
 *       full ADK save flow (see packages/adk/AGENTS.md).
 */

import type { ToolContext } from '../types';
import { initializeAdk } from '@abapify/adk';

export const CREATE_OBJECT_TYPES = [
  'PROG',
  'CLAS',
  'INTF',
  'FUGR',
  'DEVC',
  'DOMA',
  'DTEL',
  'TABL',
  'STRUCT',
  'DDLS',
  'DCLS',
] as const;

export const SOURCE_BACKED_OBJECT_TYPES = [
  'PROG',
  'CLAS',
  'INTF',
  'DDLS',
  'DCLS',
] as const;

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

/**
 * Wire ADK's global context to the current client so that any helper using
 * @abapify/adk (e.g. lock/unlock, transport operations) picks up the
 * right client + lock service automatically. MCP is stateless per call,
 * so we re-initialize on every invocation — cheap, no HTTP.
 */
function ensureAdkInitialized(client: AdtClient): void {
  initializeAdk(client);
}

export async function createAdtObject(
  client: AdtClient,
  args: CreateObjectArgs,
): Promise<void> {
  ensureAdkInitialized(client);

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

    case 'DOMA':
      await client.adt.ddic.domains.post(queryOptions, {
        domain: { ...commonFields, type: 'DOMA/DD' },
      } as any);
      return;

    case 'DTEL':
      await client.adt.ddic.dataelements.post(queryOptions, {
        wbobj: { ...commonFields, type: 'DTEL/DE' },
      } as any);
      return;

    case 'TABL':
      await client.adt.ddic.tables.post(queryOptions, {
        blueSource: { ...commonFields, type: 'TABL/DT' },
      } as any);
      return;

    case 'STRUCT':
      await client.adt.ddic.structures.post(queryOptions, {
        blueSource: { ...commonFields, type: 'TABL/DS' },
      } as any);
      return;

    case 'DDLS':
      await client.adt.ddic.ddl.sources.post(queryOptions, {
        source: { ...commonFields, type: 'DDLS/DF' },
      } as any);
      return;

    case 'DCLS':
      await client.adt.ddic.dcl.sources.post(queryOptions, {
        source: { ...commonFields, type: 'DCLS/DL' },
      } as any);
      return;
  }
}
