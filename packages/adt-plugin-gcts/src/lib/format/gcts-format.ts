/**
 * gCTS / AFF FormatPlugin.
 *
 * Thin adapter that plugs the gCTS handler registry into the generic
 * `FormatPlugin` contract defined by `@abapify/adt-plugin`. External
 * consumers (adt-export, adt-diff, adt-cli) interact with this plugin
 * through the registry only — they look it up with
 * `getFormatPlugin('gcts')` and never import this package directly.
 *
 * Registration happens as a side-effect of importing
 * `@abapify/adt-plugin-gcts` (`src/index.ts`).
 */

import type { FormatPlugin, FormatHandler } from '@abapify/adt-plugin';
import { getHandler, getSupportedTypes } from '../handlers/base';
import '../handlers/objects';
import { parseGctsFilename } from './filename';

export const gctsFormatPlugin: FormatPlugin = {
  id: 'gcts',
  description:
    'gCTS / AFF (abap-file-formats) serialization format (JSON metadata + .abap/.acds sources)',

  get supportedTypes(): ReadonlyArray<string> {
    return getSupportedTypes();
  },

  getHandler(type: string): FormatHandler | undefined {
    return getHandler(type) as unknown as FormatHandler | undefined;
  },

  parseFilename(filename: string) {
    return parseGctsFilename(filename);
  },
};

export default gctsFormatPlugin;
