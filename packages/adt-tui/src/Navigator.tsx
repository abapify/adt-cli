/**
 * Navigator Component
 *
 * Main entry point - renders pages using the framework.
 * Pages return PageResult, Navigator handles rendering.
 */

import { useState, useMemo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { exec } from 'child_process';
import { NavigationProvider, useNavigation } from './lib/context';
import { parseResponse } from './lib/parser';
import { PageRenderer } from './lib/PageRenderer';
import { matchRoute } from './pages/_routes';
import { genericPage } from './pages/GenericPage';
import type { FetchFn, PageComponent, PageResult } from './lib/types';

interface NavigatorProps {
  /** Optional starting URL - if not provided, shows prompt */
  startUrl?: string;
  /** Fetch function */
  fetch: FetchFn;
  /** SAP system name for ADT links (e.g., 'S0D', 'NPL') */
  systemName?: string;
}

/**
 * Open raw XML in IDE (VS Code)
 */
function openXmlInIde(xml: string, url: string): void {
  const safeName = url.replace(/[^a-zA-Z0-9]/g, '_').slice(-50);
  const filename = `adt_${safeName}.xml`;
  const filepath = join(tmpdir(), filename);
  writeFileSync(filepath, xml, 'utf-8');
  exec(`code "${filepath}"`, (error) => {
    if (error) {
      exec(`xdg-open "${filepath}"`);
    }
  });
}

/**
 * Open in Eclipse ADT
 * Format: adt://[system]/[path]
 * @see https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide/opening-adt-links
 */
function openInAdt(systemName: string, url: string): void {
  const adtUrl = `adt://${systemName}${url}`;
  // Use xdg-open on Linux, open on macOS
  exec(`xdg-open "${adtUrl}" 2>/dev/null || open "${adtUrl}"`, (error) => {
    if (error) {
      console.error('Failed to open ADT link:', error.message);
    }
  });
}

/**
 * Inner component that uses navigation context
 */
function NavigatorInner({ systemName }: { systemName?: string }) {
  const { current, loading, error, navigate, back } = useNavigation();

  // Get page result
  const pageResult = useMemo<PageResult | null>(() => {
    if (!current) return null;

    // Try file-based route matching first
    const fileRoute = matchRoute(current.url);
    const pageFn: PageComponent = fileRoute?.page ?? genericPage;

    return pageFn({ url: current.url, response: current.response });
  }, [current]);

  // Handle actions
  const handleAction = (key: string) => {
    if (key === 'openXml' && current) {
      openXmlInIde(current.response.raw, current.url);
    } else if (key === 'openAdt' && current && systemName) {
      openInAdt(systemName, current.url);
    }
  };

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> Loading...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={1} flexDirection="column">
        <Text color="red">❌ Error: {error}</Text>
        <Text dimColor>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (!current && !loading) {
    return <UrlPrompt onSubmit={navigate} />;
  }

  if (!current || !pageResult) {
    return (
      <Box padding={1}>
        <Text dimColor>No content loaded</Text>
      </Box>
    );
  }

  return (
    <PageRenderer
      result={pageResult}
      onNavigate={navigate}
      onBack={back}
      onAction={handleAction}
    />
  );
}

/**
 * Main Navigator component
 */
export function Navigator({
  startUrl,
  fetch,
  systemName,
}: NavigatorProps): React.ReactNode {
  return (
    <NavigationProvider
      fetch={fetch}
      parseResponse={parseResponse}
      initialUrl={startUrl}
    >
      <NavigatorInner systemName={systemName} />
    </NavigationProvider>
  );
}

/**
 * URL input prompt component
 */
function UrlPrompt({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="cyan" bold>
        ADT TUI - Hypermedia Navigator
      </Text>
      <Box marginTop={1}>
        <Text>Enter URL: </Text>
        <TextInput value={url} onChange={setUrl} onSubmit={handleSubmit} />
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Example: /sap/bc/adt/cts/transportrequests/S0DK900001
        </Text>
      </Box>
    </Box>
  );
}
