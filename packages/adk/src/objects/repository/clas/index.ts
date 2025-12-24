/**
 * CLAS - ABAP Class
 */

// Public types
export type { 
  AbapClass, 
  ClassCategory,
  ClassVisibility,
  ClassInclude,
  ClassIncludeType,
  ObjectReference,
} from './clas.types';

// ADK object (internal implementation)
export { AdkClass } from './clas.model';

// Schema-inferred type for raw API response
export type { ClassXml } from './clas.model';
