/**
 * PageRenderer - Framework component that renders PageResult
 *
 * Handles:
 * - Header with title/icon
 * - Page content
 * - Menu navigation with keyboard
 * - Footer
 */

import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PageResult, MenuItem } from './types';

interface PageRendererProps {
  result: PageResult;
  onNavigate: (url: string) => void;
  onBack: () => void;
  onAction?: (key: string) => void;
}

/**
 * Render a single menu item
 */
function MenuItemRow({
  item,
  isSelected,
}: {
  item: MenuItem;
  isSelected: boolean;
}) {
  const prefix = isSelected ? '❯ ' : '  ';

  return (
    <Text color={isSelected ? 'cyan' : undefined}>
      {prefix}
      {item.icon && `${item.icon} `}
      {item.label}
      {item.status && (
        <Text color={item.status.color} dimColor={!isSelected}>
          {' '}
          [{item.status.text}]
        </Text>
      )}
      {item.info && <Text dimColor> {item.info}</Text>}
    </Text>
  );
}

/**
 * PageRenderer component
 */
export function PageRenderer({
  result,
  onNavigate,
  onBack,
  onAction,
}: PageRendererProps): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((i) => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex((i) => Math.min(result.menu.length - 1, i + 1));
    } else if (key.return) {
      const item = result.menu[selectedIndex];
      if (item.isBack) {
        onBack();
      } else if (item.href) {
        onNavigate(item.href);
      } else if (onAction) {
        onAction(item.key);
      }
    } else if (input === 'o' || input === 'O') {
      // Open XML in VS Code
      onAction?.('openXml');
    } else if (input === 'e' || input === 'E') {
      // Open in Eclipse ADT
      onAction?.('openAdt');
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor={result.color || 'cyan'}
        paddingX={2}
        marginBottom={1}
      >
        <Text bold color={result.color || 'cyan'}>
          {result.icon && `${result.icon} `}
          {result.title}
        </Text>
        {result.subtitle && <Text dimColor> ({result.subtitle})</Text>}
      </Box>

      {/* Content */}
      <Box flexDirection="column" marginBottom={1}>
        {result.content}
      </Box>

      {/* Menu */}
      <Box flexDirection="column">
        {result.menu.map((item, i) => (
          <MenuItemRow
            key={item.key}
            item={item}
            isSelected={i === selectedIndex}
          />
        ))}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text dimColor>
          {result.footer || '[↑↓] navigate | [Enter] select'}
        </Text>
      </Box>
    </Box>
  );
}
