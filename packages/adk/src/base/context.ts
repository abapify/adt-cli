/**
 * ADK v2 - Context
 *
 * Injected into models. Provides typed client access.
 *
 * Architecture:
 * - ADK objects receive ADT client via context
 * - Objects access contracts directly: ctx.client.adt.*
 * - Objects access services directly: ctx.client.services.*
 * - No intermediate "services" abstraction layer
 */

import type { AdtClient } from './adt';

/**
 * Context provided to all ADK objects
 *
 * Provides direct access to ADT client.
 * Objects use client.adt.* for contracts and client.services.* for services.
 *
 * @example
 * // In AdkClass.load():
 * const data = await this.ctx.client.adt.oo.classes.get(this.name);
 *
 * // In AdkTransport:
 * const transport = await this.ctx.client.services.transports.get(this.id);
 */
export interface AdkContext {
  /**
   * ADT client instance
   *
   * Provides:
   * - client.adt.* - Low-level REST contracts
   * - client.services.* - High-level service APIs
   * - client.fetch() - Raw HTTP for edge cases
   */
  readonly client: AdtClient;
}
