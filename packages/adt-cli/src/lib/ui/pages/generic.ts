/**
 * Generic Page
 *
 * Fallback page for objects without a specific page.
 * Shows basic information from search results.
 */

import type { Page } from '../types';
import { Box, Field, Text } from '../components';
import { createPrintFn } from '../render';

/**
 * Generic object reference (from search results)
 */
interface ObjectReference {
  name: string;
  type: string;
  uri?: string;
  description?: string;
  packageName?: string;
}

/**
 * Generic Page
 *
 * Displays basic object information when no specific page exists.
 */
export default function GenericPage(obj: ObjectReference): Page {
  const page = {
    title: `${obj.name} (${obj.type})`,
    icon: '📄',
    render: () =>
      Box(
        Field('Description', obj.description),
        Field('Package', obj.packageName),
        Field('URI', obj.uri),
        Text(''),
        Text('💡 Use --json for full data', 'dim'),
      ).render(),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    print: () => {}, // placeholder
  };

  page.print = createPrintFn(page);
  return page;
}
