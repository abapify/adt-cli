/**
 * adt-fixtures - SAP ADT XML fixtures for testing
 *
 * Provides lazy access to real SAP XML samples for use in:
 * - Schema tests (adt-schemas)
 * - Contract tests (adt-contracts)
 * - E2E tests
 * - Scripts and CLI tools
 *
 * @example
 * ```typescript
 * import { fixtures } from '@abapify/adt-fixtures';
 *
 * // Nothing loads on import!
 * // Explicitly load when needed:
 * const xml = await fixtures.transport.single.load();
 * ```
 */

export { load, getPath, getFixturesRoot } from './loader';
export { fixtures } from './fixtures';
export type { FixtureHandle, Fixtures } from './fixtures';

// Mock ADT HTTP server — shared by MCP and CLI e2e tests
export {
  createMockAdtServer,
  LockRegistry,
  matchRoute,
  loadRouteFixtures,
} from './mock-server/server';
export type {
  MockAdtServer,
  MockAdtServerOptions,
  LockEntry,
  RouteResult,
  LoadedFixtures,
} from './mock-server/server';
