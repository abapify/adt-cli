/**
 * Main App Component
 *
 * Entry point for the TUI application.
 */

import { useState, useEffect } from 'react';
import { Navigator } from './Navigator';
import type { FetchFn } from './lib/types';
import type { Router } from './lib/router';

export interface AppProps {
  /** Optional starting URL - if not provided, shows prompt */
  startUrl?: string;
  /** Fetch function for making HTTP requests */
  fetch: FetchFn;
  /** Optional custom router */
  router?: Router;
  /** SAP system name for ADT links (e.g., 'S0D', 'NPL') */
  systemName?: string;
}

/**
 * Main TUI Application
 */
export function App({
  startUrl,
  fetch,
  router,
  systemName,
}: AppProps): React.ReactNode {
  const [, setResizeKey] = useState(0);

  // Handle terminal resize - just trigger re-render, don't clear
  useEffect(() => {
    const handleResize = () => {
      setResizeKey((k) => k + 1);
    };

    process.stdout.on('resize', handleResize);
    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, []);

  return (
    <Navigator startUrl={startUrl} fetch={fetch} systemName={systemName} />
  );
}
