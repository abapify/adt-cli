import type { AdkContext } from '../../base/context';
import { ScalarFunctionImplementation } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import type { AdkCdsSourceContract } from './source-object';

export class AdkScalarFunctionImplementation {
  static readonly kind = ScalarFunctionImplementation;
  readonly kind = AdkScalarFunctionImplementation.kind;
  readonly name: string;
  protected readonly ctx: AdkContext;
  private definition?: unknown;

  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/ddic/dsfi/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  private get contract(): AdkCdsSourceContract {
    return this.ctx.client.adt.ddic.dsfi as unknown as AdkCdsSourceContract;
  }

  async getSource(): Promise<unknown> {
    return this.definition ?? this.contract.source.main.get(this.name);
  }

  async load(): Promise<this> {
    const [, definition] = await Promise.all([
      this.contract.get(this.name),
      this.contract.source.main.get(this.name),
    ]);
    this.definition = definition;
    return this;
  }
}

registerObjectType(
  'DSFI',
  ScalarFunctionImplementation,
  AdkScalarFunctionImplementation,
  {
    endpoint: 'ddic/dsfi',
  },
);
