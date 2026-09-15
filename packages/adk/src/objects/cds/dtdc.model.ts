import type { AdkContext } from '../../base/context';
import { DynamicCache } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import { AdkSourceOnlyCdsObject } from './source-only-object';

export class AdkDynamicCache extends AdkSourceOnlyCdsObject {
  static readonly kind = DynamicCache;
  readonly kind = AdkDynamicCache.kind;
  protected readonly endpoint = 'ddic/dtdc/sources';
  constructor(ctx: AdkContext, name: string) {
    super(ctx, name);
  }
}
registerObjectType('DTDC', DynamicCache, AdkDynamicCache, {
  endpoint: 'ddic/dtdc/sources',
});
