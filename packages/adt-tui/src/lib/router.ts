/**
 * URL Router
 *
 * Matches URLs to page components.
 */

import type { Route, PageComponent } from './types';

/**
 * Router class for URL pattern matching
 */
export class Router {
  private readonly routes: Route[] = [];
  private fallback: PageComponent | null = null;

  /**
   * Register a route
   */
  register(route: Route): this {
    this.routes.push(route);
    return this;
  }

  /**
   * Set fallback page for unmatched routes
   */
  setFallback(page: PageComponent): this {
    this.fallback = page;
    return this;
  }

  /**
   * Match URL to a route
   */
  match(url: string): { page: PageComponent; name?: string } | null {
    for (const route of this.routes) {
      if (typeof route.pattern === 'string') {
        if (url === route.pattern || url.startsWith(route.pattern)) {
          return { page: route.page, name: route.name };
        }
      } else if (route.pattern.test(url)) {
        return { page: route.page, name: route.name };
      }
    }

    if (this.fallback) {
      return { page: this.fallback, name: 'fallback' };
    }

    return null;
  }

  /**
   * List all registered routes
   */
  listRoutes(): Array<{ pattern: string; name?: string }> {
    return this.routes.map((r) => ({
      pattern: r.pattern instanceof RegExp ? r.pattern.source : r.pattern,
      name: r.name,
    }));
  }
}

/**
 * Create a new router instance
 */
export function createRouter(): Router {
  return new Router();
}
