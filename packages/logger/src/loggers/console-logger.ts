import type { Logger } from '../types';

/**
 * Console logger that logs to stdout/stderr
 * Simple logger for basic use cases
 */
export class ConsoleLogger implements Logger {
  constructor(private prefix?: string) {}

  trace(msg: string, obj?: any): void {
    console.debug(this.format(msg, obj));
  }

  debug(msg: string, obj?: any): void {
    console.debug(this.format(msg, obj));
  }

  info(msg: string, obj?: any): void {
    console.log(this.format(msg, obj));
  }

  warn(msg: string, obj?: any): void {
    console.warn(this.format(msg, obj));
  }

  error(msg: string, obj?: any): void {
    console.error(this.format(msg, obj));
  }

  fatal(msg: string, obj?: any): void {
    console.error(this.format(msg, obj));
  }

  child(bindings: Record<string, any>): Logger {
    const childPrefix = bindings.component || bindings.name || 'child';
    const newPrefix = this.prefix
      ? `${this.prefix}:${childPrefix}`
      : childPrefix;
    return new ConsoleLogger(newPrefix);
  }

  private format(msg: string, obj?: any): string {
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    const objStr = obj ? ` ${JSON.stringify(obj)}` : '';
    return `${prefix}${msg}${objStr}`;
  }
}
