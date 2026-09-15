import type { AdkContext } from '../../base/context';
import { toText } from '../../base/fetch-utils';
import { DdlExtension } from '../../base/kinds';
import { registerObjectType } from '../../base/registry';
import type { AdkCdsSourceContract } from './source-object';

export class AdkDdlExtension {
  static readonly kind = DdlExtension;
  readonly kind = AdkDdlExtension.kind;
  readonly name: string;
  protected readonly ctx: AdkContext;
  private metadata?: {
    ddlxSource?: {
      description?: string;
      masterLanguage?: string;
      abapLanguageVersion?: string;
      packageRef?: { name?: string };
    };
  };
  constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }
  get objectUri() {
    return `/sap/bc/adt/ddic/ddlx/sources/${encodeURIComponent(this.name.toLowerCase())}`;
  }
  get description() {
    return this.metadata?.ddlxSource?.description ?? this.name;
  }
  get originalLanguage() {
    return this.metadata?.ddlxSource?.masterLanguage;
  }
  get abapLanguageVersion() {
    return this.metadata?.ddlxSource?.abapLanguageVersion;
  }
  get package() {
    return this.metadata?.ddlxSource?.packageRef?.name;
  }
  private get contract(): AdkCdsSourceContract {
    return this.ctx.client.adt.ddic.ddlx.sources as AdkCdsSourceContract;
  }
  async getSource() {
    return toText(await this.contract.source.main.get(this.name));
  }
  async load(): Promise<this> {
    const [metadata] = await Promise.all([
      this.contract.get(this.name),
      this.getSource(),
    ]);
    this.metadata = metadata as {
      ddlxSource?: {
        description?: string;
        masterLanguage?: string;
        abapLanguageVersion?: string;
        packageRef?: { name?: string };
      };
    };
    return this;
  }
}
registerObjectType('DDLX', DdlExtension, AdkDdlExtension, {
  endpoint: 'ddic/ddlx/sources',
});
