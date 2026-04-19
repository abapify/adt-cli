/**
 * adt table - ABAP Table CRUD commands
 *
 * Database tables have CDS-style ABAP source definitions.
 *
 * Usage:
 *   adt table create ZTABLE "My table" ZMYPKG
 *   adt table read ZTABLE
 *   adt table write ZTABLE source.abap --transport DEVK900001
 *   adt table activate ZTABLE
 *   adt table delete ZTABLE --transport DEVK900001
 */

import { AdkTable } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const tableCommand = buildObjectCrudCommands({
  label: 'table',
  command: 'table',

  get: (name) => AdkTable.get(name),
  exists: (name) => AdkTable.exists(name),
  create: (name, description, packageName, options) =>
    AdkTable.create(name, description, packageName, options),
  delete: (name, options) => AdkTable.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
