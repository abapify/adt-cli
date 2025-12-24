import pino from 'pino';
import type { Logger } from '@abapify/logger';

export interface LoggerOptions {
  verbose?: boolean | string;
  components?: string[];
}

/**
 * Create configured logger for ADT CLI
 * @param options - Logger configuration options
 * @returns Configured Pino logger instance
 */
export function createCliLogger(options: LoggerOptions = {}): Logger {
  const { verbose = false, components: _components } = options;

  // Determine log level and components from verbose option
  let level: string;
  let filterComponents: string[] | undefined;

  if (verbose === false) {
    // No verbose flag - silent
    level = 'silent';
  } else if (verbose === true) {
    // --verbose flag without value - debug all components
    level = 'debug';
    filterComponents = undefined; // All components
  } else if (typeof verbose === 'string') {
    // --verbose=component1,component2 - debug specific components
    level = 'debug';
    filterComponents = parseComponents(verbose);
  } else {
    level = 'silent';
  }

  // Create pino logger with CLI-friendly formatting
  const logger = pino({
    level,
    transport:
      level !== 'silent'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              ignore: 'pid,hostname,time',
              messageFormat: '[{component}] {msg}',
              hideObject: true,
            },
          }
        : undefined,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  });

  // Apply component filtering if specified
  if (filterComponents && filterComponents.length > 0) {
    return createFilteredLogger(logger, filterComponents);
  }

  return logger;
}

/**
 * Create a filtered logger that only logs for specified components
 */
function createFilteredLogger(
  baseLogger: any,
  allowedComponents: string[],
): Logger {
  return {
    trace: (msg: string, obj?: any) => {
      // Only log if no component specified (basic logs) or component is allowed
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.trace(msg, obj);
      }
    },
    debug: (msg: string, obj?: any) => {
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.debug(msg, obj);
      }
    },
    info: (msg: string, obj?: any) => {
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.info(msg, obj);
      }
    },
    warn: (msg: string, obj?: any) => {
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.warn(msg, obj);
      }
    },
    error: (msg: string, obj?: any) => {
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.error(msg, obj);
      }
    },
    fatal: (msg: string, obj?: any) => {
      if (!obj?.component || allowedComponents.includes(obj.component)) {
        baseLogger.fatal(msg, obj);
      }
    },
    child: (bindings: Record<string, any>) => {
      const component = bindings.component;

      // If component is not in allowed list, return no-op logger
      if (component && !allowedComponents.includes(component)) {
        return createNoOpLogger();
      }

      return baseLogger.child(bindings);
    },
  };
}

/**
 * Create a no-op logger that doesn't log anything
 */
function createNoOpLogger(): Logger {
  const noop = () => {
    /* no-op */
  };
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => createNoOpLogger(),
  };
}

/**
 * Parse components from a comma-separated string
 */
function parseComponents(componentsStr: string): string[] {
  return componentsStr
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Available component names for filtering
 */
export const AVAILABLE_COMPONENTS = [
  'auth',
  'connection',
  'cts',
  'atc',
  'repository',
  'discovery',
  'http',
  'cli',
] as const;

export type ComponentName = (typeof AVAILABLE_COMPONENTS)[number];
