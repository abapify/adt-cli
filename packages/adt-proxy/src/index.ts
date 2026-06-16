/**
 * @abapify/adt-proxy
 *
 * ADT proxy server with JSON↔XML conversion.
 *
 * Proxies ADT endpoint requests to a downstream SAP system with
 * automatic content conversion using contract schemas.
 *
 * @example
 * ```typescript
 * import { createAdtProxy } from '@abapify/adt-proxy';
 *
 * const proxy = createAdtProxy({
 *   targetUrl: 'https://my-sap-system.com:8000',
 *   auth: { username: 'user', password: 'pass', client: '100' },
 * });
 *
 * const { port } = await proxy.start();
 * ```
 */

export { createAdtProxy } from './proxy';
export type { AdtProxyConfig, ProxyResult, Logger } from './types';
export {
  jsonToXml,
  xmlToJson,
  detectContentType,
  isJsonContentType,
  isXmlContentType,
} from './converter';
