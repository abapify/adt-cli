/**
 * adt function group - Function Group CRUD commands
 *
 * Usage:
 *   adt function group create ZFG_DEMO "Demo group" ZMYPKG
 *   adt function group read ZFG_DEMO
 *   adt function group activate ZFG_DEMO
 *   adt function group delete ZFG_DEMO --transport DEVK900001
 *
 * Mirrors sapcli's `sap function group` subcommand
 * (tmp/sapcli-ref/sapcli/sap/cli/function.py).
 */

import { AdkFunctionGroup } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const functionGroupCommand = buildObjectCrudCommands({
  label: 'function group',
  command: 'group',

  get: (name) => AdkFunctionGroup.get(name),
  exists: (name) => AdkFunctionGroup.exists(name),
  create: (name, description, packageName, options) =>
    AdkFunctionGroup.create(name, description, packageName, options),
  delete: (name, options) => AdkFunctionGroup.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
