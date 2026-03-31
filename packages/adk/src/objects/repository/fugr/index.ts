/**
 * FUGR - ABAP Function Group
 */

// Public types
export type { AbapFunctionGroup } from './fugr.types';

// ADK object (internal implementation)
export { AdkFunctionGroup } from './fugr.model';

// Schema-inferred type for raw API response
export type { FunctionGroupXml } from './fugr.model';

// Function Module (child object)
export type { AbapFunctionModule } from './func';
export { AdkFunctionModule } from './func';
export type { FunctionModuleXml } from './func';
