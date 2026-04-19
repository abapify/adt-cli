/**
 * adt domain - ABAP Domain CRUD commands
 *
 * Domains are metadata-only DDIC objects (no source code).
 *
 * Usage:
 *   adt domain create ZDOMAIN "My domain" ZMYPKG
 *   adt domain read ZDOMAIN
 *   adt domain activate ZDOMAIN
 *   adt domain delete ZDOMAIN --transport DEVK900001
 */

import { AdkDomain } from '@abapify/adk';
import { buildObjectCrudCommands } from '../object/builder';

export const domainCommand = buildObjectCrudCommands({
  label: 'domain',
  command: 'domain',

  get: (name) => AdkDomain.get(name),
  exists: (name) => AdkDomain.exists(name),
  create: (name, description, packageName, options) =>
    AdkDomain.create(name, description, packageName, options),
  delete: (name, options) => AdkDomain.delete(name, options),

  // Domains are metadata-only — no source code
});
