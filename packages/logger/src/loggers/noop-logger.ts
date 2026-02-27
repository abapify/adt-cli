import type { Logger } from '../types';

/**
 * No-op logger that discards all log messages
 * Useful for testing or when logging is not needed
 */
export class NoOpLogger implements Logger {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  trace(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  debug(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  info(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  warn(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  error(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fatal(): void {}
  child(): Logger {
    return this;
  }
}
