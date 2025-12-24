/**
 * Class Page
 *
 * Self-registering page for CLAS (ABAP Class) objects.
 * Uses ClassResponse type from adt-client.
 */

import type { ClassResponse } from '@abapify/adt-client';
import type { Page, Component } from '../types';
import type { NavParams } from '../router';
import { Section, Field, Box, adtLink } from '../components';
import { definePage } from '../router';
import { createPrintFn } from '../render';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date for display
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render class page
 */
function renderClassPage(cls: any, _params: NavParams): Page {
  const sections: Component[] = [];

  // Extract values with defaults for optional fields
  const name = cls?.name ?? '';
  const type = cls?.type ?? 'CLAS/OC';
  const description = cls?.description ?? '-';

  // Header section with core info
  const headerFields: Component[] = [
    Field('Name', adtLink({ name, type })),
    Field('Type', type),
    Field('Description', description),
  ];

  // Package link
  const pkgRef = cls?.packageRef;
  if (pkgRef?.name) {
    headerFields.push(Field('Package', adtLink({ ...pkgRef, type: 'DEVC/K' })));
  }

  sections.push(Section('▼ Class', ...headerFields));

  // Class-specific attributes section - only show non-default values
  const classFields: Component[] = [
    Field('Category', cls?.category ?? '-'),
    Field('Visibility', cls?.visibility ?? '-'),
  ];
  if (cls?.state && cls.state !== 'active')
    classFields.push(Field('State', cls.state));
  if (cls?.abstract) classFields.push(Field('Abstract', '✓ Yes'));
  if (cls?.final) classFields.push(Field('Final', '✓ Yes'));
  if (cls?.hasTests) classFields.push(Field('Has Tests', '✓ Yes'));
  if (cls?.sharedMemoryEnabled)
    classFields.push(Field('Shared Memory', '✓ Yes'));
  if (cls?.modeled) classFields.push(Field('Modeled', '✓ Yes'));
  sections.push(Section('▼ Class Attributes', ...classFields));

  // Super class link (most useful navigation!)
  const superRef = cls?.superClassRef;
  if (superRef?.name) {
    const navFields: Component[] = [
      Field(
        'Super Class',
        adtLink({ ...superRef, type: superRef.type || 'CLAS/OC' }),
      ),
    ];

    // Message class
    const msgRef = cls?.messageClassRef;
    if (msgRef?.name) {
      navFields.push(
        Field(
          'Message Class',
          adtLink({ ...msgRef, type: msgRef.type || 'MSAG' }),
        ),
      );
    }

    // Root entity (for RAP)
    const rootRef = cls?.rootEntityRef;
    if (rootRef?.name) {
      navFields.push(
        Field(
          'Root Entity',
          adtLink({ ...rootRef, type: rootRef.type || 'DDLS/DF' }),
        ),
      );
    }

    sections.push(Section('▼ Related Objects', ...navFields));
  }

  // Implemented interfaces (very useful navigation!)
  const interfaces = cls?.interfaceRef ?? [];
  if (interfaces.length > 0) {
    type InterfaceRef = {
      name?: string;
      uri?: string;
      type?: string;
      description?: string;
    };
    const intfFields = interfaces.map((ref: InterfaceRef) =>
      Field(
        adtLink({ ...ref, type: ref.type || 'INTF/OI' }),
        ref.description ?? '',
      ),
    );
    sections.push(
      Section(`▼ Implemented Interfaces (${interfaces.length})`, ...intfFields),
    );
  }

  // Class includes (definitions, implementations, etc.) - clickable links
  const includes = cls?.include ?? [];
  if (includes.length > 0) {
    const includeFields = includes.map((inc: any) => {
      const includeType = inc.includeType ?? 'unknown';
      const sourceUri = inc.sourceUri ?? `includes/${includeType}`;
      // Build full URI: /sap/bc/adt/oo/classes/{className}/{sourceUri}
      const uri = `/sap/bc/adt/oo/classes/${name.toLowerCase()}/${sourceUri}`;
      return Field(
        includeType,
        adtLink({ name: `${name} (${includeType})`, uri, type: 'CLAS/I' }),
      );
    });
    sections.push(Section(`▼ Includes (${includes.length})`, ...includeFields));
  }

  // Metadata section
  const responsible = cls?.responsible ?? '-';
  const masterLanguage = cls?.masterLanguage ?? '-';
  const language = cls?.language ?? '-';
  const version = cls?.version ?? '-';
  const createdBy = cls?.createdBy ?? '-';
  const changedBy = cls?.changedBy ?? '-';
  const createdAt = cls?.createdAt;
  const changedAt = cls?.changedAt;

  const metaFields: Component[] = [
    Field('Responsible', responsible),
    Field('Master Language', masterLanguage),
    Field('Language', language),
    Field('Version', version),
    Field('Created By', createdBy),
    Field('Created At', formatDate(createdAt)),
    Field('Changed By', changedBy),
    Field('Changed At', formatDate(changedAt)),
  ];
  sections.push(Section('▼ Metadata', ...metaFields));

  const content = Box(...sections);

  const page: Page = {
    title: `Class: ${name}`,
    icon: '🔷',
    render: () => content.render(),
    print: () => {},
  };

  page.print = createPrintFn(page);
  return page;
}

// =============================================================================
// Page Definition
// =============================================================================

/**
 * Class Page Definition
 *
 * Self-registers with the router on import.
 * Type: CLAS (ABAP Class)
 *
 * Usage:
 * ```ts
 * const page = await router.navTo(client, 'CLAS', { name: 'ZCL_MY_CLASS' });
 * page.print();
 * ```
 */
export default definePage<any>({
  type: 'CLAS',
  name: 'Class',
  icon: '🔷',

  // Use client's OO contract to fetch class data
  fetch: async (client, params) => {
    if (!params.name) throw new Error('Class name is required');
    return (await client.adt.oo.classes.get(params.name)) as ClassResponse;
  },

  render: renderClassPage,
});
