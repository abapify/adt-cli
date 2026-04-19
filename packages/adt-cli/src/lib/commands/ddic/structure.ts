/**
 * adt structure - ABAP Structure CRUD commands
 *
 * Structures have CDS-style ABAP source definitions.
 *
 * Usage:
 *   adt structure create ZSTRUCT "My structure" ZMYPKG
 *   adt structure read ZSTRUCT
 *   adt structure write ZSTRUCT source.abap --transport DEVK900001
 *   adt structure activate ZSTRUCT
 *   adt structure delete ZSTRUCT --transport DEVK900001
 */

import { AdkStructure } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const structureCommand = buildObjectCrudCommands({
  label: 'structure',
  command: 'structure',

  get: (name) => AdkStructure.get(name),
  exists: (name) => AdkStructure.exists(name),
  create: (name, description, packageName, options) =>
    AdkStructure.create(name, description, packageName, options),
  delete: (name, options) => AdkStructure.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
