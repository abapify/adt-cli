/**
 * ADT RAP Behavior Definition Contract
 *
 * Endpoint: /sap/bc/adt/rap/behavdeft
 *
 * Behavior Definitions (BDEF) define the behavior of RAP business objects.
 * They specify which operations (create, update, delete, read, actions)
 * are supported and how they behave.
 *
 * The BDEF contract supports:
 * - GET: Retrieve BDEF metadata
 * - POST: Create new BDEF
 * - PUT: Update existing BDEF
 * - DELETE: Remove BDEF
 * - Lock/Unlock for editing
 * - Source code access
 */

import { crud } from '../../base';
import { classes as classesSchema } from '../../schemas';

export const behavdeftContract = crud({
  basePath: '/sap/bc/adt/rap/behavdeft',
  schema: classesSchema,
  contentType: 'application/vnd.sap.adt.rap.behavdeft.v1+xml',
  accept:
    'application/vnd.sap.adt.rap.behavdeft.v1+xml, application/vnd.sap.adt.rap.behavdeft+xml',
  sources: ['main'] as const,
});

export type BehavdeftContract = typeof behavdeftContract;
