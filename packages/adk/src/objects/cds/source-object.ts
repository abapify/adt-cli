import type { AdkContext } from '../../base/context';
import { toText } from '../../base/fetch-utils';

/**
 * Structural type for the ADT source contract used by CDS source objects.
 * Captures the `get` and `source.main.get` members used by {@link getSource}
 * and {@link load}, so incompatible contract shapes are rejected at compile
 * time instead of failing at runtime.
 */
export interface AdkCdsSourceContract {
  get(name: string): Promise<unknown>;
  source: {
    main: {
      get(name: string): Promise<unknown>;
      put(
        name: string,
        options: Record<string, unknown>,
        body: string,
      ): Promise<unknown>;
    };
  };
}

/**
 * Broader CRUD contract for standalone source objects that also support
 * create (POST) and delete. Used by DDL, DCL, BDEF, SRVD, etc.
 */
export interface AdkCrudSourceContract extends AdkCdsSourceContract {
  post(options: Record<string, unknown>, body: unknown): Promise<unknown>;
  delete(name: string, options: Record<string, unknown>): Promise<unknown>;
}

/** Minimal shared implementation for CDS source objects used by import. */
export abstract class AdkCdsSourceObject {
  readonly name: string;
  protected readonly ctx: AdkContext;
  protected abstract readonly endpoint: string;
  private metadata?: {
    blueSource?: {
      description?: string;
      masterLanguage?: string;
      abapLanguageVersion?: string;
      packageRef?: { name?: string };
    };
  };

  protected constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/${this.endpoint}/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  get description(): string {
    return this.metadata?.blueSource?.description ?? this.name;
  }

  get originalLanguage(): string | undefined {
    return this.metadata?.blueSource?.masterLanguage;
  }

  get abapLanguageVersion(): string | undefined {
    return this.metadata?.blueSource?.abapLanguageVersion;
  }

  get package(): string | undefined {
    return this.metadata?.blueSource?.packageRef?.name;
  }

  protected abstract get contract(): AdkCdsSourceContract;

  async getSource(): Promise<string> {
    return toText(await this.contract.source.main.get(this.name));
  }

  async load(): Promise<this> {
    const [metadata] = await Promise.all([
      this.contract.get(this.name),
      this.getSource(),
    ]);
    this.metadata = metadata as {
      blueSource?: {
        description?: string;
        masterLanguage?: string;
        abapLanguageVersion?: string;
        packageRef?: { name?: string };
      };
    };
    return this;
  }
}
