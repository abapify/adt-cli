/**
 * Transport Request/Task Page
 *
 * Returns PageResult for framework-driven rendering.
 * Uses schema-driven parsing via [slug].loader.ts
 */

import { Box, Text } from 'ink';
import type {
  PageProps,
  PageResult,
  MenuItem,
} from '../../../../../../lib/types';
import { load } from './[slug].loader';

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'D':
      return 'yellow'; // Modifiable
    case 'R':
      return 'green'; // Released
    case 'O':
      return 'cyan'; // Protected
    default:
      return 'white';
  }
}

/**
 * Transport Page - returns PageResult for framework rendering
 */
export function transportPage({
  url: _url,
  response,
}: PageProps): PageResult | null {
  // Parse transport data
  let transport;
  try {
    transport = load(response.raw);
  } catch (_e) {
    return null;
  }

  // Build menu items
  const menu: MenuItem[] = [
    { key: 'back', label: 'Back', icon: '←', isBack: true },
  ];

  // Add parent link for tasks
  if (transport.isTask && transport.parent) {
    menu.push({
      key: 'parent',
      label: 'Go to Parent Request',
      icon: '⬆️',
      href: `/sap/bc/adt/cts/transportrequests/${transport.parent}`,
    });
  }

  // Add tasks (for requests)
  for (const task of transport.tasks) {
    menu.push({
      key: task.number,
      label: `${task.number} - ${task.desc || '(no desc)'}`,
      icon: '📝',
      href: task.uri,
      info: `@${task.owner}`,
      status: { text: task.statusText, color: getStatusColor(task.status) },
    });
  }

  // Add objects (for tasks)
  for (const obj of transport.objects) {
    const lockIcon = obj.lockStatus === 'X' ? '🔒' : '📦';
    menu.push({
      key: `${obj.pgmid}-${obj.name}`,
      label: `${obj.type} ${obj.name}`,
      icon: lockIcon,
      href: obj.uri,
      info: obj.uri ? undefined : '(no link)',
    });
  }

  // Add actions from links
  const actions = [
    { rel: 'consistencycheck', label: 'Consistency Check', icon: '🔍' },
    { rel: 'newreleasejobs', label: 'Release', icon: '🚀' },
    { rel: 'transportchecks', label: 'Transport Checks', icon: '✅' },
  ];

  for (const action of actions) {
    const link = response.links.find((l) => l.rel.includes(action.rel));
    if (link) {
      menu.push({
        key: action.rel,
        label: action.label,
        icon: action.icon,
        href: link.href,
      });
    }
  }

  // Build content
  const content = (
    <Box flexDirection="column">
      <Text>
        <Text bold>Description:</Text> {transport.desc || '(no description)'}
      </Text>
      <Text>
        <Text bold>Owner:</Text> {transport.owner}
      </Text>
      <Text>
        <Text bold>Type:</Text> {transport.type}
      </Text>
      <Text>
        <Text bold>Status:</Text>{' '}
        <Text color={getStatusColor(transport.status)}>
          {transport.statusText} ({transport.status})
        </Text>
      </Text>
      {transport.target && (
        <Text>
          <Text bold>Target:</Text> {transport.target}{' '}
          {transport.targetDesc && `(${transport.targetDesc})`}
        </Text>
      )}
      {transport.tasks.length > 0 && (
        <Box marginTop={1}>
          <Text bold color="yellow">
            📋 Tasks ({transport.tasks.length}):
          </Text>
        </Box>
      )}
      {transport.objects.length > 0 && (
        <Box marginTop={1}>
          <Text bold color="cyan">
            📦 Objects ({transport.objects.length}):
          </Text>
        </Box>
      )}
    </Box>
  );

  const isTask = transport.isTask;
  return {
    title: `${isTask ? 'Task' : 'Transport Request'}: ${transport.number}`,
    icon: isTask ? '�' : '�',
    color: isTask ? 'yellow' : 'cyan',
    subtitle:
      isTask && transport.parent ? `Parent: ${transport.parent}` : undefined,
    content,
    menu,
    footer: '[o] XML in VS Code | [e] open in Eclipse ADT',
  };
}

// Default export for file-based routing
export default transportPage;
