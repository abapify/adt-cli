/**
 * Lightweight progress reporter for CLI output.
 * - Compact mode keeps updates on a single line (overwriting previous text).
 * - Non-compact mode logs through the provided logger (or console).
 *
 * When a logger is provided, progress messages are tagged with { progress: true }.
 */

import type { Logger } from '@abapify/logger';

export interface ProgressReporter {
  /** Update progress message (overwrites previous message in compact mode) */
  step(message: string): void;
  /** Emit a message on its own line (always persists) */
  persist(message: string): void;
  /** Finish the progress block and ensure the cursor moves to the next line */
  done(finalMessage?: string): void;
  /** Clear current progress without outputting anything (silent finish) */
  clear(): void;
}

export interface ProgressOptions {
  /** When true, log updates replace each other on the same line */
  compact?: boolean;
  /** Optional logger to record progress events (info level by default) */
  logger?: Logger;
  /** Log level to use when writing progress messages */
  level?: 'trace' | 'debug' | 'info' | 'warn';
}

function sanitize(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}

export function createProgressReporter(
  options: ProgressOptions = {},
): ProgressReporter {
  const compact = Boolean(options.compact);
  const logger = options.logger;
  const level = options.level ?? 'info';
  let lastMessage = '';
  let open = false;

  const logWithFlag = (message: string, meta?: Record<string, unknown>) => {
    if (logger) {
      const logFn = (logger as any)[level] ?? logger.info;
      logFn.call(logger, message, {
        progress: true,
        component: 'progress',
        ...meta,
      });
    }
  };

  const clearLine = () => {
    if (open) {
      process.stdout.write('\r\x1b[K');
    }
  };

  const step = (message: string) => {
    const clean = sanitize(message);
    if (!compact) {
      logWithFlag(clean, { transient: false });
      return;
    }
    clearLine();
    process.stdout.write(clean);
    lastMessage = clean;
    open = true;
    logWithFlag(clean, { transient: true });
  };

  const persist = (message: string) => {
    const clean = sanitize(message);
    clearLine();
    if (compact || !logger) {
      process.stdout.write(`${clean}\n`);
    }
    logWithFlag(clean);
    open = false;
    lastMessage = '';
  };

  const done = (finalMessage?: string) => {
    if (!open && !finalMessage) {
      return;
    }

    clearLine();
    if (compact) {
      if (finalMessage) {
        const clean = sanitize(finalMessage);
        process.stdout.write(`${clean}\n`);
        logWithFlag(clean);
      } else if (open && lastMessage) {
        process.stdout.write(`${lastMessage}\n`);
        logWithFlag(lastMessage);
      }
    } else {
      const clean = sanitize(finalMessage ?? lastMessage);
      if (clean) {
        logWithFlag(clean);
      }
    }

    open = false;
    lastMessage = '';
  };

  const clear = () => {
    clearLine();
    open = false;
    lastMessage = '';
  };

  return { step, persist, done, clear };
}
