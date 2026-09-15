import type { AdkContext } from '../../base/context';
import { CdsType } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import { AdkSourceOnlyCdsObject } from './source-only-object';

export class AdkCdsType extends AdkSourceOnlyCdsObject {
  static readonly kind = CdsType;
  readonly kind = AdkCdsType.kind;
  protected readonly endpoint = 'ddic/drty/sources';
  constructor(ctx: AdkContext, name: string) {
    super(ctx, name);
  }
}

registerObjectType('DRTY', CdsType, AdkCdsType, {
  endpoint: 'ddic/drty/sources',
});
