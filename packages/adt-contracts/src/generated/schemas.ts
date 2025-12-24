/**
 * Generated schema exports
 *
 * THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run: npx tsx scripts/generate-schemas.ts
 */

import * as adtSchemas from '@abapify/adt-schemas';
import { toSpeciSchema } from '../helpers/speci-schema';

// ============================================================================
// XML Schemas (wrapped for speci compatibility)
// ============================================================================
export const adtcore = toSpeciSchema(adtSchemas.adtcore);
export const atc = toSpeciSchema(adtSchemas.atc);
export const atcRun = toSpeciSchema(adtSchemas.atcRun);
export const atcexemption = toSpeciSchema(adtSchemas.atcexemption);
export const atcfinding = toSpeciSchema(adtSchemas.atcfinding);
export const atcinfo = toSpeciSchema(adtSchemas.atcinfo);
export const atcobject = toSpeciSchema(adtSchemas.atcobject);
export const atcresult = toSpeciSchema(adtSchemas.atcresult);
export const atcresultquery = toSpeciSchema(adtSchemas.atcresultquery);
export const atctagdescription = toSpeciSchema(adtSchemas.atctagdescription);
export const atcworklist = toSpeciSchema(adtSchemas.atcworklist);
export const atom = toSpeciSchema(adtSchemas.atom);
export const atomExtended = toSpeciSchema(adtSchemas.atomExtended);
export const checklist = toSpeciSchema(adtSchemas.checklist);
export const checkrun = toSpeciSchema(adtSchemas.checkrun);
export const classes = toSpeciSchema(adtSchemas.classes);
export const configuration = toSpeciSchema(adtSchemas.configuration);
export const configurations = toSpeciSchema(adtSchemas.configurations);
export const debuggerSchema = toSpeciSchema(adtSchemas.debuggerSchema);
export const discovery = toSpeciSchema(adtSchemas.discovery);
export const http = toSpeciSchema(adtSchemas.http);
export const interfaces = toSpeciSchema(adtSchemas.interfaces);
export const log = toSpeciSchema(adtSchemas.log);
export const logpoint = toSpeciSchema(adtSchemas.logpoint);
export const packagesV1 = toSpeciSchema(adtSchemas.packagesV1);
export const quickfixes = toSpeciSchema(adtSchemas.quickfixes);
export const templatelink = toSpeciSchema(adtSchemas.templatelink);
export const templatelinkExtended = toSpeciSchema(
  adtSchemas.templatelinkExtended,
);
export const traces = toSpeciSchema(adtSchemas.traces);
export const transportfind = toSpeciSchema(adtSchemas.transportfind);
export const transportmanagment = toSpeciSchema(adtSchemas.transportmanagment);
export const transportmanagmentCreate = toSpeciSchema(
  adtSchemas.transportmanagmentCreate,
);
export const transportmanagmentSingle = toSpeciSchema(
  adtSchemas.transportmanagmentSingle,
);
export const transportsearch = toSpeciSchema(adtSchemas.transportsearch);

// ============================================================================
// JSON Schemas (re-exported directly - they use zod, not ts-xsd)
// ============================================================================
export {
  systeminformation,
  systeminformationSchema,
} from '@abapify/adt-schemas';
