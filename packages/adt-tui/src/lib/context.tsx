/**
 * Navigation Context
 *
 * React context for sharing navigation state across components.
 */

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { NavigationEntry, ParsedResponse, FetchFn } from './types';

interface NavigationContextValue {
  /** Current navigation entry */
  current: NavigationEntry | null;
  /** Navigation history */
  history: NavigationEntry[];
  /** Navigate to URL */
  navigate: (url: string) => Promise<void>;
  /** Go back */
  back: () => void;
  /** Is loading */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Fetch function */
  fetch: FetchFn;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: ReactNode;
  /** Fetch function for making requests */
  fetch: FetchFn;
  /** Parse response function */
  parseResponse: (xml: string) => ParsedResponse;
  /** Initial URL to load */
  initialUrl?: string;
}

export function NavigationProvider({
  children,
  fetch,
  parseResponse,
  initialUrl,
}: NavigationProviderProps): React.ReactNode {
  const [current, setCurrent] = useState<NavigationEntry | null>(null);
  const [history, setHistory] = useState<NavigationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(
    async (url: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { Accept: '*/*' },
        });

        const parsed = parseResponse(response);
        const entry: NavigationEntry = {
          url,
          response: parsed,
          timestamp: new Date(),
        };

        // Push current to history if exists
        if (current) {
          setHistory((prev: NavigationEntry[]) => [...prev, current]);
        }

        setCurrent(entry);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [current, fetch, parseResponse]
  );

  const back = useCallback(() => {
    if (history.length === 0) return;

    const prev = history[history.length - 1];
    setHistory((h: NavigationEntry[]) => h.slice(0, -1));
    setCurrent(prev);
  }, [history]);

  // Load initial URL on mount
  React.useEffect(() => {
    if (initialUrl && !current) {
      navigate(initialUrl);
    }
  }, [initialUrl, current, navigate]);

  return (
    <NavigationContext.Provider
      value={{
        current,
        history,
        navigate,
        back,
        loading,
        error,
        fetch,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access navigation context
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}
