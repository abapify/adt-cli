/**
 * adt dcl - CDS Access Control Definition source commands
 *
 * CDS DCL sources (DCLS) are source-based objects with full CRUD support.
 *
 * Usage:
 *   adt dcl create ZI_MY_VIEW_ACL "Access control for my view" ZMYPKG
 *   adt dcl read ZI_MY_VIEW_ACL
 *   adt dcl write ZI_MY_VIEW_ACL acl.dcl.asdcls --transport DEVK900001
 *   adt dcl activate ZI_MY_VIEW_ACL
 *   adt dcl delete ZI_MY_VIEW_ACL --transport DEVK900001
 */

import { AdkDclSource } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const dclCommand = buildObjectCrudCommands({
  label: 'DCL source',
  command: 'dcl',

  get: (name) => AdkDclSource.get(name),
  exists: (name) => AdkDclSource.exists(name),
  create: (name, description, packageName, options) =>
    AdkDclSource.create(name, description, packageName, options),
  delete: (name, options) => AdkDclSource.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
