/**
 * adt srvd - RAP Service Definition source commands
 *
 * SRVD (Service Definition) objects are source-based RAP artifacts with full
 * CRUD support at `/sap/bc/adt/ddic/srvd/sources`. The source is `.asrvd`
 * text — same shape as the abapGit on-disk payload.
 *
 * Usage:
 *   adt srvd create ZUI_MY_SRV "Service definition" ZMYPKG
 *   adt srvd read ZUI_MY_SRV
 *   adt srvd write ZUI_MY_SRV service.asrvd --transport DEVK900001
 *   adt srvd activate ZUI_MY_SRV
 *   adt srvd delete ZUI_MY_SRV --transport DEVK900001
 */

import { AdkServiceDefinition } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const srvdCommand = buildObjectCrudCommands({
  label: 'service definition',
  command: 'srvd',

  get: (name) => AdkServiceDefinition.get(name),
  exists: (name) => AdkServiceDefinition.exists(name),
  create: (name, description, packageName, options) =>
    AdkServiceDefinition.create(name, description, packageName, options),
  delete: (name, options) => AdkServiceDefinition.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
