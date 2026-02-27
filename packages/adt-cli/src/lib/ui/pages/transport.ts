/**
 * Transport Page
 *
 * Self-registering page for transport requests using ADK.
 * Similar to Eclipse ADT Transport Organizer view.
 */

import type { Page, Component } from '../types';
import type { NavParams } from '../router';
import {
  AdkTransportRequest,
  AdkTransportTask,
  type AdkTransportObject,
} from '@abapify/adk';
import { Box, Field, Section, Text, adtLink } from '../components';
import { IconRegistry } from '../../utils/icon-registry';
import { createPrintFn } from '../render';
import { definePage } from '../router';

// Note: ADK global context is automatically initialized by getAdtClientV2()
// No need to create context manually - just use ADK objects directly.

// =============================================================================
// Types
// =============================================================================

/**
 * Transport page navigation parameters
 */
export interface TransportParams extends NavParams {
  /** Transport number (e.g., S0DK942971) */
  name?: string;
  /** Show objects in transport */
  showObjects?: boolean;
}

/**
 * Transport data - can be either a request or a task
 */
export type TransportData = AdkTransportRequest | AdkTransportTask;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a date for display
 */
function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get icon for object type (uses shared IconRegistry)
 */
function getObjectIcon(type: string): string {
  return IconRegistry.getIcon(type);
}

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Calculate max name length from objects
 */
function getMaxNameLength(objects: AdkTransportObject[]): number {
  if (!objects || objects.length === 0) return 30;
  return Math.max(...objects.map((o) => (o.name || '').length));
}

/**
 * Render object row with ADT link
 * Format: [icon] [pgmid] [type] [name-link] [desc]
 * Like Eclipse: R3TR CLAS ZCL_MY_CLASS  Description
 */
function renderObject(
  obj: AdkTransportObject,
  prefix = '',
  nameWidth = 30,
): Component {
  const name = obj.name || '';
  const type = obj.type || '';
  const pgmid = obj.pgmid || '';
  const icon = getObjectIcon(type);
  const lock = obj.lockStatus ? ` 🔒` : '';
  // Create ADT link for the object (original name), then add padding after
  const nameLink = adtLink({ name, type, uri: obj.uri });
  const padding = ' '.repeat(Math.max(0, nameWidth - name.length));
  const pgmidPad = pgmid.padEnd(4);
  const typePad = type.padEnd(4);
  const desc = obj.objectDescription || '-';
  return Text(
    `${prefix}${icon} ${pgmidPad} ${typePad} ${nameLink}${padding} ${desc}${lock}`,
  );
}

/**
 * Render task with its objects (Eclipse-style: simple indentation, no tree connectors for objects)
 */
function renderTask(
  task: AdkTransportTask,
  isLast: boolean,
  showObjects: boolean,
  nameWidth = 30,
): Component[] {
  const prefix = isLast ? '└─' : '├─';
  const childIndent = '   '; // Simple indentation for objects under task
  const components: Component[] = [];

  // Task header with ADT link
  const taskLink = adtLink({ name: task.number, uri: task.uri });
  components.push(
    Text(`${prefix} 📁 ${taskLink} - ${task.owner} (${task.statusText})`),
  );

  // Task objects (Eclipse-style: simple indented list)
  if (showObjects) {
    const taskObjects = task.objects;
    if (taskObjects.length > 0) {
      for (const obj of taskObjects) {
        components.push(renderObject(obj, childIndent, nameWidth));
      }
    } else {
      components.push(Text(`${childIndent}(no objects)`));
    }
  }

  return components;
}

/**
 * Render transport page
 */
function renderTransportPage(
  transport: TransportData,
  params: NavParams,
): Page {
  const showObjects = (params.showObjects as boolean | undefined) ?? false;
  // Tasks only exist on requests, not on tasks themselves
  const tasks = 'tasks' in transport ? transport.tasks : [];
  const objects = transport.objects;

  // Build content sections
  const sections: Component[] = [];

  // Properties section with ADT link
  const transportLink = adtLink({ name: transport.number, uri: transport.uri });
  const propertyFields: Component[] = [
    Field('Short Description', transport.description || '-'),
    Field('Owner', transport.owner || '-'),
  ];

  // For tasks, show parent request link
  if (transport.itemType === 'task' && 'request' in transport) {
    const parentRequest = (transport as AdkTransportTask).request;
    const parentLink = adtLink({
      name: parentRequest.number,
      uri: parentRequest.uri,
    });
    propertyFields.push(Field('Request', parentLink));
  }

  propertyFields.push(
    Field('Target', transport.targetDescription || transport.target || '-'),
    Field('Status', transport.statusText || transport.status || '-'),
    Field('Last Changed', formatDate(transport.lastChangedAt)),
    Field('ADT Link', transportLink),
  );

  sections.push(Section('▼ Properties', ...propertyFields));

  // Objects section
  const objectComponents: Component[] = [];

  // Calculate max name width for alignment
  const nameWidth = getMaxNameLength(objects);

  if (tasks.length > 0) {
    // Show tree with tasks (only for requests)
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const isLast = i === tasks.length - 1;
      objectComponents.push(
        ...renderTask(task, isLast, showObjects, nameWidth),
      );
    }
  } else if (showObjects && objects.length > 0) {
    // No tasks (or this is a task itself), show objects directly with indentation
    const indent = '   '; // Same indentation as task objects
    for (const obj of objects) {
      objectComponents.push(renderObject(obj, indent, nameWidth));
    }
  } else if (!showObjects && (tasks.length > 0 || objects.length > 0)) {
    const totalObjects = objects.length;
    objectComponents.push(
      Text(`${tasks.length} task(s), ${totalObjects} object(s)`),
    );
    objectComponents.push(Text(`Use --objects flag to show details`));
  } else {
    objectComponents.push(Text('(no objects)'));
  }

  sections.push(Section('▼ Objects', ...objectComponents));

  const content = Box(...sections);

  // Determine if this is a request or task
  const itemType = transport.itemType; // 'request' or 'task'
  const typeLabel =
    itemType === 'task' ? 'Transport Task' : 'Transport Request';

  const page: Page = {
    title: `${typeLabel}: ${transport.number}`,
    icon: '📋',
    render: () => content.render(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    print: () => {},
  };

  page.print = createPrintFn(page);
  return page;
}

// =============================================================================
// Page Definition
// =============================================================================

/**
 * Transport Page Definition
 *
 * Self-registers with the router on import.
 * Type: RQRQ (Transport Request)
 *
 * Usage:
 * ```ts
 * const page = await router.navTo(client, 'RQRQ', {
 *   name: 'S0DK942971',
 *   showObjects: true
 * });
 * page.print();
 * ```
 */
export const transportPageDef = definePage<TransportData>({
  type: 'RQRQ',
  name: 'Transport',
  icon: '📋',

  // ADK global context is auto-initialized by getAdtClientV2()
  // Just use ADK objects directly - no context needed!
  fetch: async (_client, params) => {
    if (!params.name) throw new Error('Transport number is required');
    // AdkTransportRequest.get() auto-detects if it's a task or request
    // and returns the appropriate type
    return AdkTransportRequest.get(params.name);
  },

  render: renderTransportPage,
});

export default transportPageDef;
