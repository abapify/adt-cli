/**
 * Object Type Router
 *
 * Maps ADT object types to their page renderers and fetch functions.
 * Enables type-agnostic get command.
 */

import type { AdtClient } from '@abapify/adt-client';
import type { Page } from './types';

export type { AdtClient };

/**
 * Navigation parameters - each page defines its own params
 */
export interface NavParams {
  /** Object name (for ADT object pages) */
  name?: string;
  /** Additional page-specific parameters */
  [key: string]: unknown;
}

/**
 * Route definition for an object type
 */
export interface Route<T = unknown, P extends NavParams = NavParams> {
  /** Object type code (DEVC, CLAS, INTF, etc.) */
  type: string;

  /** Display name */
  name: string;

  /** Icon for display */
  icon: string;

  /** Fetch object data via v2 client with navigation params */
  fetch: (client: AdtClient, params: P) => Promise<T>;

  /** Create page from fetched data with navigation params */
  page: (data: T, params: P) => Page;
}

/**
 * Page definition - combines route metadata with page factory
 * Used by definePage() helper for self-registering pages
 */
export interface PageDefinition<T = unknown, P extends NavParams = NavParams> {
  /** Object type code (DEVC, CLAS, INTF, etc.) or singleton identifier */
  type: string;

  /** Display name */
  name: string;

  /** Icon for display */
  icon: string;

  /** Fetch object data via v2 client with navigation params */
  fetch: (client: AdtClient, params: P) => Promise<T>;

  /** Create page from fetched data with navigation params */
  render: (data: T, params: P) => Page;
}

/**
 * Define and register a page in one step
 */
export function definePage<T>(
  definition: PageDefinition<T>,
): PageDefinition<T> {
  router.register({
    type: definition.type,
    name: definition.name,
    icon: definition.icon,
    fetch: definition.fetch,
    page: definition.render,
  });
  return definition;
}

/**
 * Router for object types
 */
class ObjectTypeRouter {
  private routes = new Map<string, Route>();

  /**
   * Register a route for an object type
   */
  register<T>(route: Route<T>): this {
    this.routes.set(route.type, route as Route);
    return this;
  }

  /**
   * Get route for an object type
   */
  get(type: string): Route | undefined {
    // Try exact match first
    if (this.routes.has(type)) {
      return this.routes.get(type);
    }

    // Try base type (before /)
    const baseType = type.includes('/') ? type.split('/')[0] : type;
    return this.routes.get(baseType);
  }

  /**
   * Check if a route exists for an object type
   */
  has(type: string): boolean {
    return this.get(type) !== undefined;
  }

  /**
   * Get all registered types
   */
  types(): string[] {
    return [...this.routes.keys()];
  }

  /**
   * Navigate to a page with parameters
   * Fetches data and renders the page in one call
   */
  async navTo(
    client: AdtClient,
    type: string,
    params: NavParams = {},
  ): Promise<Page> {
    const route = this.get(type);
    if (!route) {
      throw new Error(`No route registered for type: ${type}`);
    }
    const data = await route.fetch(client, params);
    return route.page(data, params);
  }
}

// Create singleton router
export const router = new ObjectTypeRouter();

// Export for type inference
export type { ObjectTypeRouter };
