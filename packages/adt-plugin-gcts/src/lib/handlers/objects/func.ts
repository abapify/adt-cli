/**
 * FUNC (function module) handler for gCTS / AFF format.
 *
 * Projects ADK function module data to the AFF func-v1.json schema shape.
 */

import { createHandler } from '../base';
import type { FuncAff } from '../../../schemas/generated';

type FuncLike = {
  name: string;
  description?: string;
  dataSync?: Record<string, unknown>;
  groupName?: string;
  getSource?: () => Promise<string> | string;
};

const RELEASE_STATE_MAP: Record<string, FuncAff['releaseState']> = {
  notReleased: 'notReleased',
  internal: 'releasedSapInternal',
  external: 'released',
  obsolete: 'obsolete',
  markedForRelease: 'releasePlanned',
};

export const functionModuleHandler = createHandler('FUNC', {
  toMetadata(func: FuncLike): FuncAff {
    const data = (func.dataSync ?? {}) as any;
    const meta: FuncAff = {
      formatVersion: '1',
      header: {
        description:
          func.description ?? (data.description as string) ?? func.name ?? '',
      },
      processingType:
        (data.processingType as FuncAff['processingType']) ?? 'normal',
      includeNumber: (data.includeNumber as string) ?? '0000',
    };
    // RFC properties: AFF nests them; ADT exposes flat fields.
    if (
      typeof data.basXMLEnabled === 'boolean' ||
      typeof data.rfcScope === 'string' ||
      typeof data.rfcVersion === 'string' ||
      typeof data.abapFromJava === 'boolean' ||
      typeof data.javaFromAbap === 'boolean' ||
      typeof data.javaRemote === 'boolean'
    ) {
      meta.rfcProperties = {
        basxmlEnabled: data.basXMLEnabled === true,
        rfcScope:
          (data.rfcScope as NonNullable<
            FuncAff['rfcProperties']
          >['rfcScope']) ?? 'notClassified',
        rfcVersion:
          (data.rfcVersion as NonNullable<
            FuncAff['rfcProperties']
          >['rfcVersion']) ?? 'any',
        abapFromJava: data.abapFromJava as boolean | undefined,
        javaFromAbap: data.javaFromAbap as boolean | undefined,
        javaRemote: data.javaRemote as boolean | undefined,
      };
    }
    // Update properties: AFF nests updateTaskKind.
    if (typeof data.updateTaskKind === 'string') {
      meta.updateProperties = {
        updateTaskKind: data.updateTaskKind as NonNullable<
          FuncAff['updateProperties']
        >['updateTaskKind'],
      };
    }
    if (typeof data.releaseState === 'string') {
      const mapped = RELEASE_STATE_MAP[data.releaseState];
      if (mapped) meta.releaseState = mapped;
    }
    if (typeof data.releaseDate === 'string')
      meta.releaseDate = data.releaseDate;
    if (typeof data.global === 'boolean') meta.global = data.global;
    if (typeof data.exceptionClasses === 'boolean')
      meta.exceptionClasses = data.exceptionClasses;
    if (typeof data.application === 'string')
      meta.application = data.application as FuncAff['application'];
    if (typeof data.client === 'string')
      meta.client = data.client as FuncAff['client'];
    if (typeof data.activeFunctionExit === 'string')
      meta.activeFunctionExit =
        data.activeFunctionExit as FuncAff['activeFunctionExit'];
    if (typeof data.notExecutable === 'boolean')
      meta.notExecutable = data.notExecutable;
    if (typeof data.editLocked === 'boolean') meta.editLocked = data.editLocked;
    return meta;
  },

  getSource: (func: FuncLike) =>
    typeof func.getSource === 'function' ? func.getSource() : '',

  fromMetadata: (meta: FuncAff) => ({
    name: '',
    description: meta.header.description,
    language: undefined,
    masterLanguage: undefined,
    processingType: meta.processingType,
    includeNumber: meta.includeNumber,
    releaseState: meta.releaseState,
    global: meta.global,
    exceptionClasses: meta.exceptionClasses,
  }),
});
