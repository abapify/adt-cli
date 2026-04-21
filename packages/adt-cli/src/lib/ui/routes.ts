/**
 * Route Registrations
 *
 * Import pages to trigger self-registration.
 * Each page uses definePage() which auto-registers with the router.
 */

import { GenericPage } from './pages';
import type { Page } from './types';

// Import pages to trigger self-registration
import './pages/package';
import './pages/class';
import './pages/interface';

// Export initialized router
// ============================================================================
// Helper: Create generic page from search result
// ============================================================================

export interface SearchResult {
  name?: string;
  type?: string;
  uri?: string;
  description?: string;
  packageName?: string;
}

export function createGenericPage(result: SearchResult): Page {
  return GenericPage({
    name: result.name || 'Unknown',
    type: result.type || 'Unknown',
    uri: result.uri,
    description: result.description,
    packageName: result.packageName,
  });
}
export { router } from './router';
