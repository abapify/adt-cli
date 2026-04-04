/**
 * ADT RAP (RESTful ABAP Programming) Contracts
 *
 * RAP is the modern ABAP development model for building OData services.
 * These contracts cover:
 * - Behavior Definitions (BDEF) - /sap/bc/adt/rap/behavdeft
 * - CDS View/Entity (DDLS) - /sap/bc/adt/ddl/ddls
 * - RAP Generator - /sap/bc/adt/rap/generator
 *
 * RAP-managed CDS objects extend standard DDIC objects with additional
 * metadata and versioning for the RAP framework.
 */

export * from './behavdeft';
export * from './ddls';
export * from './generator';
