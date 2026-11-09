/**
 * FUNC (function module) handler for gCTS / AFF format.
 *
 * Projects ADK function module data to the AFF func-v1.json schema shape.
 * A function module is a child of a function group, but it can also be
 * serialized as its own ADK object (FUNC) for the gCTS file format.
 */

import { AdkFunctionModule } from '@abapify/adk';
import { createHandler } from '../base';
import type { FuncAff } from '../../../schemas/generated';

type FuncLike = {
  name: string;
  description?: string;
  dataSync?: Record<string, unknown>;
  groupName?: string;
  getSource?: () => Promise<string> | string;
};

export const functionModuleHandler = createHandler(AdkFunctionModule, {
  toMetadata(func: FuncLike): FuncAff {
    const data = (func.dataSync ?? {}) as Record<string, unknown>;
    const meta: FuncAff = {
      formatVersion: '1',
      header: {
        description: func.description ?? (data.description as string) ?? '',
      },
      processingType:
        (data.processingType as FuncAff['processingType']) ?? 'normal',
      includeNumber: (data.includeNumber as string) ?? '0000',
    };
    if (data.rfcProperties && typeof data.rfcProperties === 'object') {
      meta.rfcProperties = data.rfcProperties as FuncAff['rfcProperties'];
    }
    if (data.updateProperties && typeof data.updateProperties === 'object') {
      meta.updateProperties =
        data.updateProperties as FuncAff['updateProperties'];
    }
    if (typeof data.releaseState === 'string') {
      meta.releaseState = data.releaseState as FuncAff['releaseState'];
    }
    if (typeof data.global === 'boolean') meta.global = data.global;
    if (typeof data.exceptionClasses === 'boolean')
      meta.exceptionClasses = data.exceptionClasses;
    return meta;
  },

  getSource: (func: FuncLike) =>
    typeof func.getSource === 'function' ? func.getSource() : '',

  fromMetadata: (meta: FuncAff) => ({
    name: '',
    description: meta.header.description,
    language: meta.header.originalLanguage?.toUpperCase(),
    masterLanguage: meta.header.originalLanguage?.toUpperCase(),
    processingType: meta.processingType,
    includeNumber: meta.includeNumber,
  }),
});
