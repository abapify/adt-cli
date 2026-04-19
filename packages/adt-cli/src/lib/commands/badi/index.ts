/**
 * adt badi — BAdI / Enhancement Implementation (ENHO/XHH) commands
 *
 * Enhancement Implementations are RAP-era containers for BAdI
 * implementations. Full CRUD + activation exposed at
 * `/sap/bc/adt/enhancements/enhoxhh`. Source (the BAdI payload) is
 * served as text via `/source/main`.
 *
 * Usage:
 *   adt badi create ZE_MY_BADI_IMPL "My BAdI impl" ZMYPKG
 *   adt badi read   ZE_MY_BADI_IMPL
 *   adt badi write  ZE_MY_BADI_IMPL impl.abap --transport DEVK900001
 *   adt badi activate ZE_MY_BADI_IMPL
 *   adt badi delete ZE_MY_BADI_IMPL --transport DEVK900001
 *
 * sapcli reference: `sap/cli/badi.py` (list, set-active). The sapcli
 * surface is narrower — only a list over a fetched ENHO and a
 * set-active toggle. Full CRUD exposes the same metadata plus
 * ADT-native write/activate flows.
 */

import { AdkBadi } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const badiCommand = buildObjectCrudCommands({
  label: 'BAdI / enhancement implementation',
  command: 'badi',

  get: (name) => AdkBadi.get(name),
  exists: (name) => AdkBadi.exists(name),
  create: (name, description, packageName, options) =>
    AdkBadi.create(name, description, packageName, options),
  delete: (name, options) => AdkBadi.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
