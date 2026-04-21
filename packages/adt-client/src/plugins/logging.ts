/**
 * Logging Plugin - Logs requests and responses
 */

import type { ResponsePlugin, ResponseContext } from './types';

export type LogFunction = (message: string, data?: any) => void;

/**
 * Logging plugin - logs requests and responses
 */
export class LoggingPlugin implements ResponsePlugin {
  name = 'logging';

  constructor(private readonly logger: LogFunction = console.log) {}

  process(context: ResponseContext): unknown {
    this.logger(`[${context.method}] ${context.url}`, {
      contentType: context.contentType,
      hasParsedData: !!context.parsedData,
      rawSize: context.rawText.length,
    });
    return context.parsedData;
  }
}
