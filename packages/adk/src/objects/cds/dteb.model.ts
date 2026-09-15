import type { AdkContext } from '../../base/context';
import { EntityBuffer } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import { AdkCdsSourceObject, type AdkCdsSourceContract } from './source-object';

export class AdkEntityBuffer extends AdkCdsSourceObject {
  static readonly kind = EntityBuffer;
  readonly kind = AdkEntityBuffer.kind;
  protected readonly endpoint = 'ddic/dteb/sources';
  constructor(ctx: AdkContext, name: string) {
    super(ctx, name);
  }
  protected get contract(): AdkCdsSourceContract {
    return this.ctx.client.adt.ddic.dteb.sources as AdkCdsSourceContract;
  }
}

registerObjectType('DTEB', EntityBuffer, AdkEntityBuffer, {
  endpoint: 'ddic/dteb/sources',
});
