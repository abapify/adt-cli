/**
 * Generic Page Component
 *
 * Fallback page for unknown endpoints - shows payload + links.
 * Returns PageResult for framework-driven rendering.
 */

// React import not needed with JSX transform
import { Box, Text } from 'ink';
import type { PageProps, PageResult, MenuItem } from '../lib/types';
import { getActionName } from '../lib/parser';

interface SummaryItem {
  key: string;
  value: string;
}

/**
 * Generic page - returns PageResult for framework rendering
 */
export function genericPage({ url, response }: PageProps): PageResult {
  // Extract summary from data
  const summary = extractSummary(response.data);

  // Build menu items from links
  const menu: MenuItem[] = [
    { key: 'back', label: 'Back', icon: '←', isBack: true },
  ];

  for (const link of response.links) {
    const title = link.title || getActionName(link.rel);

    // Make path relative/shorter for display
    let displayPath = link.href;
    const currentBase = url.split('/').slice(0, -1).join('/');
    if (link.href.startsWith(currentBase)) {
      displayPath = '.' + link.href.slice(currentBase.length);
    } else if (link.href.startsWith('/sap/bc/adt/')) {
      displayPath = link.href.replace('/sap/bc/adt/', '/');
    }
    if (displayPath.length > 40) {
      displayPath = '...' + displayPath.slice(-37);
    }

    menu.push({
      key: link.href,
      label: title,
      icon: '🔗',
      href: link.href,
      info: displayPath,
    });
  }

  // Build content
  const content = (
    <Box flexDirection="column">
      <Text dimColor>URL: {url}</Text>
      <Box marginTop={1} flexDirection="column">
        {summary.length > 0 ? (
          summary.map((item, i) => (
            <Text key={i}>
              <Text color="yellow">{item.key}:</Text> {item.value}
            </Text>
          ))
        ) : (
          <Text dimColor>No summary available</Text>
        )}
      </Box>
    </Box>
  );

  return {
    title: `${response.namespace || 'unknown'}:${response.rootElement || 'response'}`,
    icon: '📄',
    color: 'cyan',
    content,
    menu,
    footer: `[o] XML | [e] Eclipse ADT | ${response.links.length} links`,
  };
}

/**
 * Extract key fields for summary display
 */
function extractSummary(data: Record<string, unknown>): SummaryItem[] {
  const summary: SummaryItem[] = [];
  const seen = new Set<string>();

  function extract(obj: unknown, prefix = ''): void {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((item) => extract(item, prefix));
      return;
    }

    const record = obj as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      // Skip links and xml declaration
      if (key.includes('link') || key === '?xml') continue;

      // Extract interesting attributes (those starting with @_)
      if (
        (key.startsWith('@_') && typeof value === 'string') ||
        typeof value === 'number'
      ) {
        const cleanKey = key.replace('@_', '').replace(/^\w+:/, '');
        // Skip duplicates and uninteresting fields
        if (
          seen.has(cleanKey) ||
          cleanKey === 'version' ||
          cleanKey === 'encoding'
        )
          continue;
        seen.add(cleanKey);

        // Limit to important fields
        const important = [
          'number',
          'owner',
          'desc',
          'status',
          'status_text',
          'type',
          'target',
          'name',
          'uri',
        ];
        if (important.some((f) => cleanKey.includes(f))) {
          summary.push({ key: cleanKey, value: String(value) });
        }
      }

      // Recurse into nested objects
      if (typeof value === 'object') {
        extract(value, key);
      }
    }
  }

  extract(data);
  return summary.slice(0, 8); // Limit to 8 items
}

// removeLinks function removed - was unused
