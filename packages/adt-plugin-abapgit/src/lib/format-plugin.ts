/**
 * abapGit as a FormatPlugin.
 *
 * This is the thin adapter that plugs the abapGit handler registry into the
 * generic `FormatPlugin` contract defined by `@abapify/adt-plugin`. External
 * consumers (adt-export, adt-diff, adt-cli) interact with this plugin
 * **through the registry only** — they look it up with
 * `getFormatPlugin('abapgit')` and never import this package directly.
 *
 * Registration happens as a side-effect of importing `@abapify/adt-plugin-abapgit`;
 * the CLI bootstraps the registration once in `adt-cli/src/lib/cli.ts`.
 */

import type { FormatPlugin, FormatHandler } from '@abapify/adt-plugin';
import {
  getHandler as getAbapGitHandler,
  getSupportedTypes,
} from './handlers/registry';
import { parseAbapGitFilename } from './deserializer';

export const abapgitFormatPlugin: FormatPlugin = {
  id: 'abapgit',
  description: 'abapGit serialization format',

  // `supportedTypes` is backed by the live handler registry so registering
  // additional handlers at import time is reflected here without extra work.
  get supportedTypes(): ReadonlyArray<string> {
    return getSupportedTypes();
  },

  getHandler(type: string): FormatHandler | undefined {
    // The concrete abapGit `ObjectHandler` is a structural superset of the
    // generic `FormatHandler`, so this is just a widening cast.
    return getAbapGitHandler(type) as unknown as FormatHandler | undefined;
  },

  parseFilename(filename: string) {
    const parsed = parseAbapGitFilename(filename);
    return parsed ?? undefined;
  },
};

export default abapgitFormatPlugin;
