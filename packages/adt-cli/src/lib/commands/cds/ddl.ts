/**
 * adt ddl - CDS Data Definition Language source commands
 *
 * CDS DDL sources (DDLS) are source-based objects with full CRUD support.
 *
 * Usage:
 *   adt ddl create ZI_MY_VIEW "My CDS view" ZMYPKG
 *   adt ddl read ZI_MY_VIEW
 *   adt ddl write ZI_MY_VIEW view.ddl.asddls --transport DEVK900001
 *   adt ddl activate ZI_MY_VIEW
 *   adt ddl delete ZI_MY_VIEW --transport DEVK900001
 */

import { AdkDdlSource } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const ddlCommand = buildObjectCrudCommands({
  label: 'DDL source',
  command: 'ddl',

  get: (name) => AdkDdlSource.get(name),
  exists: (name) => AdkDdlSource.exists(name),
  create: (name, description, packageName, options) =>
    AdkDdlSource.create(name, description, packageName, options),
  delete: (name, options) => AdkDdlSource.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
