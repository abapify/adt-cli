/**
 * ADK v2 - Global Context Provider
 *
 * Provides a global ADK context that can be set once and used by all ADK objects.
 * This eliminates the need to pass context to every ADK operation.
 *
 * Usage:
 *   // Initialize once (e.g., in CLI bootstrap)
 *   import { initializeAdk } from '@abapify/adk';
 *   initializeAdk(client);
 *
 *   // Then use ADK objects without passing context
 *   const transport = await AdkTransportRequest.get('S0DK900001');
 *
 * For testing or multi-connection scenarios, you can still pass explicit context:
 *   const transport = await AdkTransportRequest.get('S0DK900001', customCtx);
 */

import type { AdkContext } from './context';
import type { AdtClient } from './adt';

// =============================================================================
// Global State
// =============================================================================

let globalContext: AdkContext | null = null;

// =============================================================================
// Public API
// =============================================================================

/**
 * Initialize the global ADK context from an ADT client.
 *
 * Call this once during application bootstrap (e.g., in CLI initialization).
 * After initialization, ADK objects can be used without passing context.
 *
 * @param client - ADT client v2 instance
 * @throws Error if client is not provided
 *
 * @example
 * ```ts
 * import { initializeAdk } from '@abapify/adk';
 * import { createAdtClient } from '@abapify/adt-client';
 *
 * const client = createAdtClient({ ... });
 * initializeAdk(client);
 *
 * // Now ADK objects work without context
 * const transport = await AdkTransportRequest.get('S0DK900001');
 * ```
 */
export function initializeAdk(client: AdtClient): void {
  if (!client) {
    throw new Error('ADK initialization failed: client is required');
  }

  globalContext = { client };
}

/**
 * Get the global ADK context.
 *
 * Used internally by ADK objects when no explicit context is provided.
 *
 * @returns The global ADK context
 * @throws Error if ADK has not been initialized
 *
 * @example
 * ```ts
 * // Internal usage in ADK objects:
 * static async get(number: string, ctx?: AdkContext): Promise<AdkTransportRequest> {
 *   const context = ctx ?? getGlobalContext();
 *   // ...
 * }
 * ```
 */
export function getGlobalContext(): AdkContext {
  if (!globalContext) {
    throw new Error(
      'ADK not initialized. Call initializeAdk(client) before using ADK objects.\n' +
        'Example:\n' +
        "  import { initializeAdk } from '@abapify/adk';\n" +
        '  initializeAdk(client);',
    );
  }
  return globalContext;
}

/**
 * Check if ADK has been initialized.
 *
 * Useful for conditional logic or error handling.
 *
 * @returns true if initializeAdk() has been called
 */
export function isAdkInitialized(): boolean {
  return globalContext !== null;
}

/**
 * Reset the global ADK context.
 *
 * Primarily for testing purposes. Clears the global context.
 */
export function resetAdk(): void {
  globalContext = null;
}

/**
 * Get the global context or return undefined if not initialized.
 *
 * Unlike getGlobalContext(), this doesn't throw - useful when you want
 * to check if context exists before using it.
 *
 * @returns The global context or undefined
 */
export function tryGetGlobalContext(): AdkContext | undefined {
  return globalContext ?? undefined;
}
