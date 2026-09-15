/**
 * SOD1 (ODS Object 1) handler for abapGit format
 */

import { sod1 } from '../../../schemas/generated';
import { createOdsHandler } from './sod';

export const odsObject1Handler = createOdsHandler('SOD1', sod1);
