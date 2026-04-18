/**
 * adt include - ABAP Program Include CRUD commands
 *
 * Usage:
 *   adt include create ZMYINCL "My include" ZMYPKG
 *   adt include read ZMYINCL
 *   adt include write ZMYINCL source.abap --transport DEVK900001
 *   adt include write ZMYINCL - < source.abap   # stdin
 *   adt include activate ZMYINCL
 *   adt include delete ZMYINCL --transport DEVK900001
 *
 * Mirrors sapcli's `sap include` command group
 * (tmp/sapcli-ref/sapcli/sap/cli/include.py).
 */

import { AdkInclude } from '@abapify/adk';
import { buildObjectCrudCommands } from './builder';

export const includeCommand = buildObjectCrudCommands({
  label: 'include',
  command: 'include',

  get: (name) => AdkInclude.get(name),
  exists: (name) => AdkInclude.exists(name),
  create: (name, description, packageName, options) =>
    AdkInclude.create(name, description, packageName, options),
  delete: (name, options) => AdkInclude.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
