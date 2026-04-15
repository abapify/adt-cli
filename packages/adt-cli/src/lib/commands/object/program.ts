/**
 * adt program - ABAP Program CRUD commands
 *
 * Usage:
 *   adt program create ZMYPROG "My program" ZMYPKG
 *   adt program read ZMYPROG
 *   adt program write ZMYPROG source.abap --transport DEVK900001
 *   adt program write ZMYPROG - < source.abap   # stdin
 *   adt program activate ZMYPROG
 *   adt program delete ZMYPROG --transport DEVK900001
 */

import { AdkProgram } from '@abapify/adk';
import { buildObjectCrudCommands } from './builder';

export const programCommand = buildObjectCrudCommands({
  label: 'program',
  command: 'program',

  get: (name) => AdkProgram.get(name),
  exists: (name) => AdkProgram.exists(name),
  create: (name, description, packageName, options) =>
    AdkProgram.create(name, description, packageName, options),
  delete: (name, options) => AdkProgram.delete(name, options),

  getSource: (obj) => obj.getSource(),
});
