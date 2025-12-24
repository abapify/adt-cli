/**
 * Package Page
 *
 * Self-registering page for DEVC (package) objects.
 * Uses PackageXml type from adk (inferred from packagesV1 schema).
 */

import type { PackageXml } from '@abapify/adk';
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
function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render package page
 */
function renderPackagePage(pkg: PackageXml, _params: NavParams): Page {
  const sections: Component[] = [];

  // Extract values with defaults for optional fields
  const name = pkg?.name ?? '';
  const type = pkg?.type ?? 'DEVC/K';
  const description = pkg?.description ?? '-';
  const attrs = pkg?.attributes;
  const transport = pkg?.transport;
  const appComponent = pkg?.applicationComponent;
  const superPkg = pkg?.superPackage;

  // Header section with core info
  const headerFields: Component[] = [
    Field('Name', adtLink({ name, type })),
    Field('Type', type),
    Field('Description', description),
  ];
  sections.push(Section('▼ Package', ...headerFields));

  // Package attributes section
  const attrFields: Component[] = [
    Field('Package Type', String(attrs?.packageType ?? '-')),
    Field('Software Component', transport?.softwareComponent?.name ?? '-'),
    Field('Application Component', appComponent?.name ?? '-'),
    Field('Transport Layer', transport?.transportLayer?.name ?? '-'),
    Field('Encapsulated', attrs?.isEncapsulated ?? false),
    Field('Adding Objects Allowed', attrs?.isAddingObjectsAllowed ?? false),
    Field('Record Changes', attrs?.recordChanges ?? false),
    Field('Language Version', attrs?.languageVersion ?? '-'),
  ];

  // Super package link
  if (superPkg?.name) {
    attrFields.push(Field('Super Package', adtLink(superPkg)));
  }

  sections.push(Section('▼ Attributes', ...attrFields));

  // Metadata section
  const responsible = pkg?.responsible ?? '-';
  const masterLanguage = pkg?.masterLanguage ?? '-';
  const language = pkg?.language ?? '-';
  const version = pkg?.version ?? '-';
  const createdBy = pkg?.createdBy ?? '-';
  const changedBy = pkg?.changedBy ?? '-';
  const createdAt = pkg?.createdAt;
  const changedAt = pkg?.changedAt;

  const metaFields: Component[] = [
    Field('Responsible', responsible),
    Field('Master Language', masterLanguage),
    Field('Language', language),
    Field('Version', version),
    Field('Created By', createdBy),
    Field(
      'Created At',
      formatDate(createdAt ? new Date(createdAt as string) : undefined),
    ),
    Field('Changed By', changedBy),
    Field(
      'Changed At',
      formatDate(changedAt ? new Date(changedAt as string) : undefined),
    ),
  ];
  sections.push(Section('▼ Metadata', ...metaFields));

  // Subpackages section
  // Note: Subpackages are included in the package data if present
  const subPkgs = pkg?.subPackages?.packageRef ?? [];
  if (subPkgs.length > 0) {
    type PackageRef = {
      name?: string;
      uri?: string;
      type?: string;
      description?: string;
    };
    const subPkgFields = subPkgs.map((ref: PackageRef) =>
      Field(adtLink(ref), ref.description ?? ''),
    );
    sections.push(
      Section(`▼ Subpackages (${subPkgs.length})`, ...subPkgFields),
    );
  }

  const content = Box(...sections);

  const page: Page = {
    title: `Package: ${name}`,
    icon: '📦',
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
 * Package Page Definition
 *
 * Self-registers with the router on import.
 * Type: DEVC (Development Class / Package)
 *
 * Usage:
 * ```ts
 * const page = await router.navTo(client, 'DEVC', { name: '$TMP' });
 * page.print();
 * ```
 */
export default definePage<PackageXml>({
  type: 'DEVC',
  name: 'Package',
  icon: '📦',

  // Use client's packages contract to fetch data
  fetch: async (client, params) => {
    if (!params.name) throw new Error('Package name is required');
    const response = await client.adt.packages.get(params.name);
    // Extract package data from response - the API returns { package: PackageXml }
    return (response as unknown as { package: PackageXml }).package;
  },

  render: renderPackagePage,
});
