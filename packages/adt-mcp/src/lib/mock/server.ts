/**
 * Backwards-compatibility re-export.
 *
 * The mock ADT server now lives in `@abapify/adt-fixtures` so that both
 * MCP and CLI e2e tests can share the same implementation and fixture
 * files. This module preserves the original import path used by MCP
 * integration tests.
 */
export {
  createMockAdtServer,
  LockRegistry,
  type MockAdtServer,
  type MockAdtServerOptions,
  type LockEntry,
} from '@abapify/adt-fixtures';
