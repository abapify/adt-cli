/**
 * Link Component
 *
 * Creates OSC 8 hyperlinks for terminal emulators that support them.
 * Falls back to plain text in unsupported terminals.
 *
 * OSC 8 format: \x1b]8;;URL\x07TEXT\x1b]8;;\\x07
 *
 * @see https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda
 */

import chalk from 'chalk';
import type { Component } from '../types';

// =============================================================================
// Core Hyperlink Function
// =============================================================================

/**
 * Create an OSC 8 hyperlink
 *
 * @param text - Display text
 * @param url - URL to link to
 * @returns Formatted hyperlink string
 */
export function hyperlink(text: string, url: string): string {
  const OSC = '\x1b]';
  const BEL = '\x07';
  const SEP = ';';
  return `${OSC}8${SEP}${SEP}${url}${BEL}${text}${OSC}8${SEP}${SEP}${BEL}`;
}

// =============================================================================
// ADT System Configuration
// =============================================================================

let adtSystemName = '';

/**
 * Set the ADT system name for hyperlinks (called by CLI on init)
 */
export function setAdtSystem(systemName: string): void {
  adtSystemName = systemName;
}

/**
 * Get current ADT system name
 */
export function getAdtSystem(): string {
  return adtSystemName;
}

// =============================================================================
// ADT Path Templates
// =============================================================================

/**
 * ADT path templates for object types
 * Template uses {name} placeholder for object name
 */
const ADT_PATH_TEMPLATES: Record<string, string> = {
  // Packages
  DEVC: '/packages/{name}',
  'DEVC/K': '/packages/{name}',
  // Classes
  CLAS: '/oo/classes/{name}',
  'CLAS/OC': '/oo/classes/{name}',
  // Interfaces
  INTF: '/oo/interfaces/{name}',
  'INTF/OI': '/oo/interfaces/{name}',
  // Function Groups
  FUGR: '/functions/groups/{name}',
  'FUGR/F': '/functions/groups/{name}',
  // Function Modules (need group context, simplified)
  FUNC: '/functions/groups/{name}',
  // Programs
  PROG: '/programs/programs/{name}',
  'PROG/P': '/programs/programs/{name}',
  // Includes
  'PROG/I': '/programs/includes/{name}',
  // Tables
  TABL: '/ddic/tables/{name}',
  'TABL/DT': '/ddic/tables/{name}',
  // Structures
  'TABL/DS': '/ddic/structures/{name}',
  // Views
  VIEW: '/ddic/views/{name}',
  // Data Elements
  DTEL: '/ddic/dataelements/{name}',
  'DTEL/DE': '/ddic/dataelements/{name}',
  // Domains
  DOMA: '/ddic/domains/{name}',
  'DOMA/DO': '/ddic/domains/{name}',
  // Search Helps
  SHLP: '/ddic/searchhelps/{name}',
  // Lock Objects
  ENQU: '/ddic/lockobjects/{name}',
  // Message Classes
  MSAG: '/messageclass/{name}',
  // Transactions
  TRAN: '/transactions/{name}',
  // CDS Views
  DDLS: '/ddic/ddl/sources/{name}',
  'DDLS/DF': '/ddic/ddl/sources/{name}',
  // Behavior Definitions
  BDEF: '/bo/behaviordefinitions/{name}',
  // Service Definitions
  SRVD: '/businessservices/servicedefinitions/{name}',
  // Service Bindings
  SRVB: '/businessservices/servicebindings/{name}',
};

/**
 * Get ADT path template for an object type
 */
function getAdtPathTemplate(objectType: string): string | undefined {
  // Try exact match first
  if (ADT_PATH_TEMPLATES[objectType]) {
    return ADT_PATH_TEMPLATES[objectType];
  }
  // Try base type (before /)
  const baseType = objectType.split('/')[0];
  return ADT_PATH_TEMPLATES[baseType];
}

/**
 * Resolve ADT path from template
 */
function resolveAdtPath(template: string, name: string): string {
  return template.replace('{name}', encodeURIComponent(name));
}

// =============================================================================
// Types
// =============================================================================

/**
 * ADT Object Reference (matches AdtObjectReference schema)
 * Core attributes: uri, type, name
 */
export interface AdtObjectRef {
  /** Object name */
  name?: string;
  /** Object type (e.g., "DEVC/K", "CLAS/OC") */
  type?: string;
  /** ADT URI (e.g., "/sap/bc/adt/packages/$TMP") */
  uri?: string;
}

// =============================================================================
// Link Functions
// =============================================================================

/**
 * Create a generic link (plain URL)
 */
export function link(text: string, url: string): string {
  return hyperlink(chalk.cyan(text), url);
}

/**
 * Create an ADT Eclipse link for an object reference
 * Format: adt://[SYSTEM]/sap/bc/adt/[path]
 *
 * @param ref - ADT object reference with name, type, and/or uri (can be undefined)
 * @returns Formatted hyperlink string (or empty string if no ref/name)
 */
export function adtLink(ref?: AdtObjectRef): string {
  const name = ref?.name || '';

  if (!adtSystemName || !name) {
    return name ? chalk.cyan(name) : '';
  }

  // If URI is provided, use it directly
  if (ref?.uri) {
    const path = ref.uri.startsWith('/sap/bc/adt')
      ? ref.uri
      : `/sap/bc/adt${ref.uri}`;
    const url = `adt://${adtSystemName}${path}`;
    return hyperlink(chalk.cyan(name), url);
  }

  // Otherwise, resolve from type + name using template
  if (ref?.type) {
    const template = getAdtPathTemplate(ref.type);
    if (template) {
      const adtPath = resolveAdtPath(template, name);
      const url = `adt://${adtSystemName}/sap/bc/adt${adtPath}`;
      return hyperlink(chalk.cyan(name), url);
    }
  }

  // Fallback: plain text
  return chalk.cyan(name);
}

/**
 * Create a clickable package link (convenience wrapper)
 */
export function packageLink(packageName: string): string {
  return adtLink({ type: 'DEVC', name: packageName });
}

// =============================================================================
// Link Components
// =============================================================================

/**
 * Link Component - generic hyperlink
 */
export default function Link(text: string, url: string): Component {
  return {
    render: () => [hyperlink(chalk.cyan(text), url)],
  };
}

/**
 * ADT Link Component - link to ADT object in Eclipse
 * Extends Link with ADT-specific URL resolution
 */
export function AdtLink(ref?: AdtObjectRef): Component {
  return {
    render: () => {
      const result = adtLink(ref);
      return result ? [result] : [];
    },
  };
}

/**
 * Package Link Component - convenience for package links
 */
export function PackageLink(packageName: string): Component {
  return AdtLink({ type: 'DEVC', name: packageName });
}
