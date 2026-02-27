/**
 * ADT Schemas Index (v2 - W3C format)
 *
 * Structure:
 *   generated/
 *     index.ts        - Typed schemas + types re-export
 *     schemas/sap/    - SAP schema literals from XSD
 *     schemas/custom/ - Custom schema literals from XSD
 *     types/          - TypeScript interfaces (204 types)
 *
 * Usage:
 *   import { classes, AbapClass } from '@abapify/adt-schemas';
 *   const data = classes.parse(xml);  // data is AbapClass
 */

// Re-export everything from generated
export * from './generated';

// Re-export JSON schemas
export * from './json';
export type { SystemInformation as SystemInformationJson } from './json';
