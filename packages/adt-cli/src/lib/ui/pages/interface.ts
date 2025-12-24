/**
 * Interface Page
 *
 * Self-registering page for INTF (ABAP Interface) objects.
 * Uses InterfaceResponse type from adt-client.
 */

import type { InterfaceResponse } from '@abapify/adt-client';
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
 * Render interface page
 */
function renderInterfacePage(intf: any, _params: NavParams): Page {
  const sections: Component[] = [];

  // Extract values with defaults for optional fields
  const name = intf?.name ?? '';
  const type = intf?.type ?? 'INTF/OI';
  const description = intf?.description ?? '-';

  // Header section with core info
  const headerFields: Component[] = [
    Field('Name', adtLink({ name, type })),
    Field('Type', type),
    Field('Description', description),
  ];

  // Package link
  const pkgRef = intf?.packageRef;
  if (pkgRef?.name) {
    headerFields.push(Field('Package', adtLink({ ...pkgRef, type: 'DEVC/K' })));
  }

  sections.push(Section('▼ Interface', ...headerFields));

  // Interface attributes section - only show non-default values
  const intfFields: Component[] = [];
  if (intf?.modeled) intfFields.push(Field('Modeled', '✓ Yes'));
  if (intfFields.length > 0) {
    sections.push(Section('▼ Interface Attributes', ...intfFields));
  }

  // Inherited interfaces (very useful navigation!)
  const interfaces = intf?.interfaceRef ?? [];
  if (interfaces.length > 0) {
    type InterfaceRef = {
      name?: string;
      uri?: string;
      type?: string;
      description?: string;
    };
    const inheritedFields = interfaces.map((ref: InterfaceRef) =>
      Field(
        adtLink({ ...ref, type: ref.type || 'INTF/OI' }),
        ref.description ?? '',
      ),
    );
    sections.push(
      Section(
        `▼ Inherited Interfaces (${interfaces.length})`,
        ...inheritedFields,
      ),
    );
  }

  // Metadata section
  const responsible = intf?.responsible ?? '-';
  const masterLanguage = intf?.masterLanguage ?? '-';
  const language = intf?.language ?? '-';
  const version = intf?.version ?? '-';
  const createdBy = intf?.createdBy ?? '-';
  const changedBy = intf?.changedBy ?? '-';
  const createdAt = intf?.createdAt;
  const changedAt = intf?.changedAt;

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
    title: `Interface: ${name}`,
    icon: '🔶',
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
 * Interface Page Definition
 *
 * Self-registers with the router on import.
 * Type: INTF (ABAP Interface)
 *
 * Usage:
 * ```ts
 * const page = await router.navTo(client, 'INTF', { name: 'IF_MY_INTERFACE' });
 * page.print();
 * ```
 */
export default definePage<any>({
  type: 'INTF',
  name: 'Interface',
  icon: '🔶',

  // Use client's OO contract to fetch interface data
  fetch: async (client, params) => {
    if (!params.name) throw new Error('Interface name is required');
    return (await client.adt.oo.interfaces.get(
      params.name,
    )) as InterfaceResponse;
  },

  render: renderInterfacePage,
});
