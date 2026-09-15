import type { AdkContext } from '../../base/context';

/**
 * CDS source object without a metadata schema in the connected ABAP release.
 *
 * DRAS and DRTY are absent from the reference system's repository search, so their source
 * endpoint is represented by the ADT DDIC naming convention and exercised
 * with official ABAP File Formats fixtures. The object is intentionally
 * source-first: import only needs the immutable source and a safe header.
 */
export abstract class AdkSourceOnlyCdsObject {
  readonly name: string;
  protected readonly ctx: AdkContext;
  protected abstract readonly endpoint: string;
  private source?: string;

  protected constructor(ctx: AdkContext, name: string) {
    this.ctx = ctx;
    this.name = name.toUpperCase();
  }

  get objectUri(): string {
    return `/sap/bc/adt/${this.endpoint}/${encodeURIComponent(this.name.toLowerCase())}`;
  }

  get description(): string {
    return this.name;
  }
  get originalLanguage(): string {
    return 'EN';
  }

  async getSource(): Promise<string> {
    this.source ??= await this.ctx.client.readTextBounded(
      `${this.objectUri}/source/main`,
      5 * 1024 * 1024,
      { headers: { Accept: 'text/plain' } },
    );
    return this.source;
  }

  async load(): Promise<this> {
    await this.getSource();
    return this;
  }
}
