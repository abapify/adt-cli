import type { AdkContext } from '../../base/context';
import { StaticCache } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import { AdkSourceOnlyCdsObject } from './source-only-object';

export class AdkStaticCache extends AdkSourceOnlyCdsObject {
  static readonly kind = StaticCache;
  readonly kind = AdkStaticCache.kind;
  protected readonly endpoint = 'ddic/dtsc/sources';
  constructor(ctx: AdkContext, name: string) {
    super(ctx, name);
  }
}
registerObjectType('DTSC', StaticCache, AdkStaticCache, {
  endpoint: 'ddic/dtsc/sources',
});
