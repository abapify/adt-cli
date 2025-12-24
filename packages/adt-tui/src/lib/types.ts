/**
 * Core types for ADT TUI
 */

// ComponentType not needed - pages return PageResult, not React components

/**
 * Hypermedia link extracted from ADT responses
 */
export interface HypermediaLink {
  href: string;
  rel: string;
  type?: string;
  title?: string;
}

/**
 * Parsed ADT response
 */
export interface ParsedResponse {
  raw: string;
  data: Record<string, unknown>;
  links: HypermediaLink[];
  namespace?: string;
  rootElement?: string;
}

/**
 * Navigation entry in history
 */
export interface NavigationEntry {
  url: string;
  response: ParsedResponse;
  timestamp: Date;
}

/**
 * Fetch function type - abstracted from client
 */
export type FetchFn = (
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<string>;

/**
 * Menu item for navigation
 */
export interface MenuItem {
  /** Unique key for React */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji) */
  icon?: string;
  /** URL to navigate to (if navigable) */
  href?: string;
  /** Whether this is a back action */
  isBack?: boolean;
  /** Additional info shown dimmed */
  info?: string;
  /** Status indicator */
  status?: { text: string; color: string };
}

/**
 * Page result returned by page components
 */
export interface PageResult {
  /** Page title */
  title: string;
  /** Title icon */
  icon?: string;
  /** Title color */
  color?: string;
  /** Subtitle (shown dimmed) */
  subtitle?: string;
  /** Content to render (React element) */
  content: React.ReactNode;
  /** Menu items for navigation */
  menu: MenuItem[];
  /** Footer text */
  footer?: string;
}

/**
 * Props passed to every page component
 */
export interface PageProps {
  /** Current URL */
  url: string;
  /** Parsed response data */
  response: ParsedResponse;
}

/**
 * Page component type - returns PageResult, not JSX
 */
export type PageComponent = (props: PageProps) => PageResult | null;

/**
 * Route definition
 */
export interface Route {
  /** URL pattern (string for exact, RegExp for pattern) */
  pattern: RegExp | string;
  /** Page function that returns PageResult */
  page: PageComponent;
  /** Optional name for debugging */
  name?: string;
}
