/**
 * ts-xsd
 *
 * Core XSD parser, builder, and type inference for TypeScript.
 * Implements W3C XML Schema Definition (XSD) 1.1 specification.
 */

// XSD module - parse and build XSD files
export * from './xsd';

// Infer module - TypeScript type inference from schemas
export type * from './infer';

// Codegen module - generate TypeScript literals from XSD
export * from './codegen';

// XML module - parse and build XML using schema definitions
export * from './xml';

// Walker module - generator-based schema traversal for XML parsing/building
export * from './walker';
