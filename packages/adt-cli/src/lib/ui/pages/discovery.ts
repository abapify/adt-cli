/**
 * Discovery Page
 *
 * Renders ADT service discovery information in a structured format.
 * Self-registers with the router on import.
 */

import type { Page, Component } from '../types';
import { Box, Field, Section, Text } from '../components';
import { createPrintFn } from '../render';
import { definePage, type NavParams } from '../router';
import type { DiscoveryResponse } from '@abapify/adt-contracts';

/**
 * Discovery response type - re-exported from adt-contracts
 * If the contract schema changes, this type updates automatically.
 */
export type DiscoveryData = DiscoveryResponse;

/**
 * Discovery-specific navigation params
 */
export interface DiscoveryParams extends NavParams {
  /** Filter workspaces by title (case-insensitive) */
  filter?: string;
}

/**
 * Render discovery data as a Page
 */
function renderDiscoveryPage(
  data: DiscoveryData,
  params: DiscoveryParams,
): Page {
  // Access service.workspace from discovery response
  const service = data?.service;
  const workspaces = (service?.workspace ?? []) as Array<{
    title?: string;
    collection?: unknown;
  }>;
  const filter = params.filter?.toLowerCase();

  // Filter workspaces if filter provided
  const filteredWorkspaces = filter
    ? workspaces.filter((ws: { title?: string }) =>
        ws.title?.toLowerCase().includes(filter),
      )
    : workspaces;

  // Build content
  const sections: Component[] = [];

  // Summary
  sections.push(
    Box(
      Field('Total Workspaces', String(workspaces.length)),
      Field('Showing', String(filteredWorkspaces.length)),
      ...(filter ? [Field('Filter', filter)] : []),
    ),
  );

  // Each workspace as a section
  for (const workspace of filteredWorkspaces) {
    const collections = Array.isArray(workspace.collection)
      ? workspace.collection
      : workspace.collection
        ? [workspace.collection]
        : [];

    // Build collection items
    const collectionComponents: Component[] = collections.map(
      (coll: {
        title?: string;
        href?: string;
        category?: unknown;
        templateLinks?: { templateLink?: unknown };
      }) => {
        const categories = Array.isArray(coll.category)
          ? coll.category
          : coll.category
            ? [coll.category]
            : [];
        const categoryTerms = categories
          .map((c: { term?: string }) => c.term)
          .filter(Boolean)
          .join(', ');

        const templateCount = Array.isArray(coll.templateLinks?.templateLink)
          ? coll.templateLinks.templateLink.length
          : coll.templateLinks?.templateLink
            ? 1
            : 0;

        const info = [
          categoryTerms ? `[${categoryTerms}]` : '',
          templateCount > 0 ? `(${templateCount} templates)` : '',
        ]
          .filter(Boolean)
          .join(' ');

        return Text(`  └─ ${coll.title || '-'} ${coll.href} ${info}`);
      },
    );

    if (collectionComponents.length > 0) {
      sections.push(
        Section(
          `📁 ${workspace.title || 'Unnamed Workspace'}`,
          ...collectionComponents,
        ),
      );
    }
  }

  const content = Box(...sections);

  const page: Page = {
    title: 'ADT Service Discovery',
    icon: '🔍',
    render: () => content.render(),
    print: () => {},
  };

  page.print = createPrintFn(page);
  return page;
}

/**
 * Create a Discovery Page directly (for dedicated commands)
 *
 * Usage:
 * ```ts
 * const data = await client.adt.discovery.getDiscovery();
 * const page = DiscoveryPage(data, { filter: 'CDS' });
 * page.print();
 * ```
 */
export default function DiscoveryPage(
  data: DiscoveryData,
  params: DiscoveryParams = {},
): Page {
  return renderDiscoveryPage(data, params);
}

/**
 * Discovery Page Definition for Router
 *
 * Self-registers with the router on import.
 * Type: DISCOVERY (singleton - no name parameter needed)
 */
export const discoveryPageDef = definePage<DiscoveryData>({
  type: 'DISCOVERY',
  name: 'Discovery',
  icon: '🔍',

  fetch: async (client) => {
    const discovery = await client.adt.discovery.getDiscovery();
    return discovery;
  },

  render: renderDiscoveryPage,
});
