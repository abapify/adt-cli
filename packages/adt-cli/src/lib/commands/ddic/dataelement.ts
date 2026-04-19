/**
 * adt dataelement - ABAP Data Element CRUD commands
 *
 * Data elements are metadata-only DDIC objects (no source code).
 *
 * Usage:
 *   adt dataelement create ZDTEL "My data element" ZMYPKG
 *   adt dataelement read ZDTEL
 *   adt dataelement activate ZDTEL
 *   adt dataelement delete ZDTEL --transport DEVK900001
 */

import { AdkDataElement } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const dataelementCommand = buildObjectCrudCommands({
  label: 'data element',
  command: 'dataelement',

  get: (name) => AdkDataElement.get(name),
  exists: (name) => AdkDataElement.exists(name),
  create: (name, description, packageName, options) =>
    AdkDataElement.create(name, description, packageName, options),
  delete: (name, options) => AdkDataElement.delete(name, options),

  // Data elements are metadata-only — no source code
});
