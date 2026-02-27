/**
 * @datetime - SAP Timestamp Property Decorator
 *
 * Parses SAP timestamp formats into JavaScript Date objects.
 *
 * SAP Timestamp Formats:
 * - YYYYMMDDHHMMSS (14 chars) - e.g., "20231215143052"
 * - YYYYMMDD (8 chars) - date only
 *
 * Usage:
 *   class MyObject {
 *     @datetime() lastChangedAt?: Date;
 *     @datetime('lastchanged_timestamp') modifiedAt?: Date;
 *   }
 */

/**
 * Parse SAP timestamp string to Date
 * Supports: YYYYMMDDHHMMSS (14 chars) or YYYYMMDD (8 chars)
 */
export function parseSapTimestamp(ts: unknown): Date | undefined {
  if (!ts || typeof ts !== 'string') return undefined;

  const s = ts.trim();
  if (s.length < 8) return undefined;

  const year = s.slice(0, 4);
  const month = s.slice(4, 6);
  const day = s.slice(6, 8);
  const hour = s.length >= 10 ? s.slice(8, 10) : '00';
  const min = s.length >= 12 ? s.slice(10, 12) : '00';
  const sec = s.length >= 14 ? s.slice(12, 14) : '00';

  return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
}

/**
 * @datetime - SAP timestamp property decorator
 *
 * @param from - Source field name (defaults to property name)
 *
 * @example
 * ```typescript
 * // Maps from same-named field
 * @datetime() lastChangedAt?: Date;
 *
 * // Maps from different field
 * @datetime('lastchanged_timestamp') modifiedAt?: Date;
 * ```
 */
export function datetime(from?: string): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol): void {
    const key = String(propertyKey);
    const sourceKey = from || key;

    Object.defineProperty(target, key, {
      get(this: { _propSource?: Record<string, unknown> }) {
        const value = this._propSource?.[sourceKey];
        return parseSapTimestamp(value);
      },
      enumerable: true,
      configurable: true,
    });
  } as PropertyDecorator;
}

/**
 * @date - SAP date-only property decorator (alias for datetime)
 */
export const date = datetime;
