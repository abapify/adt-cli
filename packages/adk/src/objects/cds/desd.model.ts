import type { AdkContext } from '../../base/context';
import { ExternalSchema } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';

export class AdkExternalSchema {
  static readonly kind = ExternalSchema;
  readonly kind = AdkExternalSchema.kind;
  readonly name: string;
  protected readonly ctx: AdkContext;
  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }
  get objectUri(): string {
    return `/sap/bc/adt/ddic/desd/${encodeURIComponent(this.name.toLowerCase())}`;
  }
  get description(): string {
    return this.name;
  }
  get originalLanguage(): string {
    return 'EN';
  }
  async load(): Promise<this> {
    await this.ctx.client.readTextBounded(this.objectUri, 5 * 1024 * 1024, {
      headers: { Accept: 'application/xml' },
    });
    return this;
  }
}
registerObjectType('DESD', ExternalSchema, AdkExternalSchema, {
  endpoint: 'ddic/desd',
});
