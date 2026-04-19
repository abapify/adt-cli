/**
 * adt bdef - RAP Behavior Definition source commands
 *
 * BDEF (Behavior Definition) objects are source-based RAP artifacts with full
 * CRUD support at `/sap/bc/adt/bo/behaviordefinitions`. The source is `.abdl`
 * text — same shape as the abapGit on-disk payload.
 *
 * Usage:
 *   adt bdef create ZBP_MY_ENTITY "Behavior for ZI_MY_ENTITY" ZMYPKG
 *   adt bdef read ZBP_MY_ENTITY
 *   adt bdef write ZBP_MY_ENTITY behavior.abdl --transport DEVK900001
 *   adt bdef activate ZBP_MY_ENTITY
 *   adt bdef delete ZBP_MY_ENTITY --transport DEVK900001
 */

import { AdkBehaviorDefinition } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const bdefCommand = buildObjectCrudCommands({
  label: 'behavior definition',
  command: 'bdef',

  get: (name) => AdkBehaviorDefinition.get(name),
  exists: (name) => AdkBehaviorDefinition.exists(name),
  create: (name, description, packageName, options) =>
    AdkBehaviorDefinition.create(name, description, packageName, options),
  delete: (name, options) => AdkBehaviorDefinition.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
