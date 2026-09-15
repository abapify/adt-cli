import type { AdkContext } from '../../base/context';
import { TuningIndex } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import { AdkSourceOnlyCdsObject } from './source-only-object';

export class AdkTuningIndex extends AdkSourceOnlyCdsObject {
  static readonly kind = TuningIndex;
  readonly kind = AdkTuningIndex.kind;
  protected readonly endpoint = 'ddic/dtix/sources';
  constructor(ctx: AdkContext, name: string) {
    super(ctx, name);
  }
}
registerObjectType('DTIX', TuningIndex, AdkTuningIndex, {
  endpoint: 'ddic/dtix/sources',
});
