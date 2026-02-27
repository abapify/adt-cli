/**
 * ADT Core Page
 *
 * Base page for any ADT object that extends adtcore:AdtMainObject.
 * Renders common fields that all ADT objects share.
 */

import type { Page, Component } from '../types';
import { Box, Field, Section, adtLink } from '../components';
import { createPrintFn } from '../render';

/**
 * Common ADT object fields (from adtcore:AdtObject and AdtMainObject)
 */
export interface AdtCoreObject {
  name: string;
  type: string;
  description?: string;
  version?: string;
  language?: string;
  createdAt?: string;
  createdBy?: string;
  changedAt?: string;
  changedBy?: string;
  responsible?: string;
  masterLanguage?: string;
  masterSystem?: string;
  abapLanguageVersion?: string;
  packageRef?: { name?: string; uri?: string };
}

/**
 * Options for AdtCorePage
 */
export interface AdtCorePageOptions {
  /** Icon to display (default: 📄) */
  icon?: string;
  /** Additional content after core fields */
  extra?: Component;
}

/**
 * Base page for any ADT object
 *
 * Renders common fields from adtcore schema.
 * Specific pages can extend this by passing extra content.
 */
export default function AdtCorePage(
  obj: AdtCoreObject,
  options?: AdtCorePageOptions,
): Page {
  const icon = options?.icon || '📄';

  const content = Box(
    // Basic info
    Field('Type', obj.type),
    Field('Description', obj.description),
    Field('Package', obj.packageRef?.name),

    // Ownership
    Section(
      'Ownership',
      Field('Responsible', obj.responsible),
      Field('Created by', obj.createdBy),
      Field('Created at', obj.createdAt),
      Field('Changed by', obj.changedBy),
      Field('Changed at', obj.changedAt),
    ),

    // Technical
    Section(
      'Technical',
      Field('Language', obj.language || obj.masterLanguage),
      Field('Master System', obj.masterSystem),
      Field('ABAP Version', obj.abapLanguageVersion),
      Field('Version', obj.version),
    ),
  );

  // Create clickable title link to open in Eclipse ADT
  const titleLink = adtLink({ type: obj.type, name: obj.name });

  const page = {
    title: obj.name,
    titleLink, // Clickable link to ADT
    icon,
    render: () => {
      const lines = content.render();
      if (options?.extra) {
        lines.push(...options.extra.render());
      }
      return lines;
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    print: () => {}, // placeholder, set below
  };

  page.print = createPrintFn(page);
  return page;
}
