/**
 * Main App Component
 *
 * Entry point for the TUI application.
 */

import { useState, useEffect, useDebugValue } from 'react';
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
  /** SAP system name for ADT links (e.g., 'TRL', 'NPL') */
  systemName?: string;
}

/**
 * Main TUI Application
 */
export function App({
  startUrl,
  fetch,
  router: _router,
  systemName,
}: Readonly<AppProps>): React.ReactNode {
  // The counter value only exists to force a re-render on resize; reading it
  // via useDebugValue keeps the state consumed without touching the render
  // tree (useDebugValue is a no-op outside React DevTools).
  const [resizeKey, setResizeKey] = useState(0);
  useDebugValue(resizeKey);

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
    <Navigator
      startUrl={startUrl}
      fetch={fetch}
      systemName={systemName}
    />
  );
}
