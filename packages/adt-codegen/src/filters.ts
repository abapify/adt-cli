/**
 * Filter matching logic
 */

import type { FilterValue, FilterConfig } from './types';

/**
 * Check if a value matches a filter value (supports strings, regex, arrays)
 */
function matchesValue(
  value: string | undefined,
  filter: FilterValue<string>,
): boolean {
  if (!value) return false;

  // Array = OR condition (match any)
  if (Array.isArray(filter)) {
    return filter.some((f) => matchesValue(value, f));
  }

  // RegExp matching
  if (filter instanceof RegExp) {
    return filter.test(value);
  }

  // Glob pattern (simple * support)
  if (typeof filter === 'string' && filter.includes('*')) {
    const pattern = filter.replace(/\*/g, '.*');
    return new RegExp(`^${pattern}$`).test(value);
  }

  // Exact string match
  return value === filter;
}

/**
 * Check if an object matches a filter (deep matching)
 */
function matchesObject(obj: any, filter: any): boolean {
  if (!filter) return true;

  for (const key in filter) {
    const filterValue = filter[key];
    const objValue = obj?.[key];

    // Nested object
    if (
      typeof filterValue === 'object' &&
      !Array.isArray(filterValue) &&
      !(filterValue instanceof RegExp)
    ) {
      if (!matchesObject(objValue, filterValue)) {
        return false;
      }
      continue;
    }

    // Value matching
    if (!matchesValue(objValue, filterValue)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a workspace matches the filter
 */
export function matchesWorkspaceFilter(workspace: any, filter: any): boolean {
  if (!filter) return true;
  return matchesObject(workspace, filter);
}

/**
 * Check if a collection matches the filter
 */
export function matchesCollectionFilter(collection: any, filter: any): boolean {
  if (!filter) return true;

  // Check basic fields
  if (!matchesObject(collection, filter)) {
    return false;
  }

  // Check template links if filter specified
  if (filter.templateLinks && collection.link) {
    const links = Array.isArray(collection.link)
      ? collection.link
      : [collection.link];
    const hasMatchingLink = links.some((link: any) =>
      matchesObject(link, filter.templateLinks),
    );
    if (!hasMatchingLink) return false;
  }

  return true;
}

/**
 * Check if workspace/collection matches any filter in the config
 */
export function matchesFilter(
  item: any,
  filterConfig: FilterConfig | undefined,
  type: 'workspace' | 'collection',
): boolean {
  if (!filterConfig) return true;

  // Normalize to array (array = OR condition)
  const filters = Array.isArray(filterConfig) ? filterConfig : [filterConfig];

  // Match any filter (OR)
  return filters.some((filter) => {
    const typeFilter = filter[type];
    if (!typeFilter) return true;

    return type === 'workspace'
      ? matchesWorkspaceFilter(item, typeFilter)
      : matchesCollectionFilter(item, typeFilter);
  });
}

/**
 * Helper to define filters with type safety
 */
export function defineFilters(filters: FilterConfig): FilterConfig {
  return filters;
}
