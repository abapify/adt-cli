/**
 * adt interface - ABAP Interface CRUD commands
 *
 * Usage:
 *   adt interface create ZIF_MY_INTF "My interface" ZMYPKG
 *   adt interface read ZIF_MY_INTF
 *   adt interface write ZIF_MY_INTF source.abap --transport DEVK900001
 *   adt interface write ZIF_MY_INTF - < source.abap   # stdin
 *   adt interface activate ZIF_MY_INTF
 *   adt interface delete ZIF_MY_INTF --transport DEVK900001
 */

import { AdkInterface } from '@abapify/adk';
import { buildObjectCrudCommands } from './builder';

export const interfaceCommand = buildObjectCrudCommands({
  label: 'interface',
  command: 'interface',

  get: (name) => AdkInterface.get(name),
  exists: (name) => AdkInterface.exists(name),
  create: (name, description, packageName, options) =>
    AdkInterface.create(name, description, packageName, options),
  delete: (name, options) => AdkInterface.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
