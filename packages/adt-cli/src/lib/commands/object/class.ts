/**
 * adt class - ABAP Class CRUD commands
 *
 * Usage:
 *   adt class create ZCL_MY_CLASS "My class" ZMYPKG
 *   adt class read ZCL_MY_CLASS
 *   adt class write ZCL_MY_CLASS source.abap --transport DEVK900001
 *   adt class write ZCL_MY_CLASS - < source.abap   # stdin
 *   adt class activate ZCL_MY_CLASS
 *   adt class delete ZCL_MY_CLASS --transport DEVK900001
 */

import { AdkClass } from '@abapify/adk';
import { buildObjectCrudCommands } from './builder';

export const classCommand = buildObjectCrudCommands({
  label: 'class',
  command: 'class',

  get: (name) => AdkClass.get(name),
  exists: (name) => AdkClass.exists(name),
  create: (name, description, packageName, options) =>
    AdkClass.create(name, description, packageName, options),
  delete: (name, options) => AdkClass.delete(name, options),

  getSource: (obj) => obj.getMainSource(),
});
