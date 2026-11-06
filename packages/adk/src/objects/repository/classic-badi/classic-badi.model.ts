/**
 * Classic BAdI — read-only ADK models for SXSD/XD and SXCI/XI metadata.
 *
 * Served via vit/wb Basic Object Properties:
 *   GET /sap/bc/adt/vit/wb/object_type/sxsdxd/object_name/{name}
 *   GET /sap/bc/adt/vit/wb/object_type/sxcixi/object_name/{name}
 */

import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';
import type { BasicObjectPropertiesResponse } from '@abapify/adt-contracts';

interface ClassicBadiInput {
  name: string;
  ctx?: AdkContext;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { status?: unknown }).status === 404
  );
}

abstract class AdkClassicBadiBase {
  readonly name: string;
  protected readonly ctx: AdkContext;

  constructor(input: { ctx: AdkContext; name: string }) {
    this.ctx = input.ctx;
    this.name = input.name.toUpperCase();
  }

  abstract get kind(): string;
  abstract get objectUri(): string;
  abstract getMetadata(): Promise<BasicObjectPropertiesResponse>;

  static async get<T extends AdkClassicBadiBase>(
    this: new (input: { ctx: AdkContext; name: string }) => T,
    input: ClassicBadiInput,
  ): Promise<T> {
    const context = input.ctx ?? getGlobalContext();
    const obj = new this({ ctx: context, name: input.name });
    await obj.getMetadata();
    return obj;
  }

  static async exists<T extends AdkClassicBadiBase>(
    this: new (input: { ctx: AdkContext; name: string }) => T,
    input: ClassicBadiInput,
  ): Promise<boolean> {
    try {
      const ctor = this as unknown as {
        get(input: ClassicBadiInput): Promise<T>;
      };
      await ctor.get(input);
      return true;
    } catch (error) {
      if (!isNotFound(error)) throw error;
      return false;
    }
  }
}

export class AdkClassicBadiDefinition extends AdkClassicBadiBase {
  readonly kind = 'ClassicBadiDefinition' as const;

  get objectUri(): string {
    return `/sap/bc/adt/vit/wb/object_type/sxsdxd/object_name/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  async getMetadata(): Promise<BasicObjectPropertiesResponse> {
    return await this.ctx.client.adt.vit.wb.objectProperties.getDefinition(
      this.name,
    );
  }
}

export class AdkClassicBadiImplementation extends AdkClassicBadiBase {
  readonly kind = 'ClassicBadiImplementation' as const;

  get objectUri(): string {
    return `/sap/bc/adt/vit/wb/object_type/sxcixi/object_name/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  async getMetadata(): Promise<BasicObjectPropertiesResponse> {
    return await this.ctx.client.adt.vit.wb.objectProperties.getImplementation(
      this.name,
    );
  }
}
