import { createHash } from 'node:crypto';

export function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

const NO_TO_JSON = Symbol('no toJSON');

function isObject(value: unknown): value is object {
  if (value === null) return false;
  if (typeof value !== 'object') return false;
  return true;
}

function maybeToJson(value: unknown, key: string): unknown {
  if (!isObject(value)) return NO_TO_JSON;
  const toJson = (value as { toJSON?: (key: string) => unknown }).toJSON;
  if (typeof toJson !== 'function') return NO_TO_JSON;
  return canonicalize(toJson.call(value, key), key, false);
}

function canonicalize(value: unknown, key = '', invokeToJson = true): unknown {
  if (invokeToJson) {
    const fromToJson = maybeToJson(value, key);
    if (fromToJson !== NO_TO_JSON) return fromToJson;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalize(item, String(index)));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([entryKey, item]) => [entryKey, canonicalize(item, entryKey)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value), null, 2);
  if (serialized === undefined) {
    throw new TypeError('Value cannot be serialized to stable JSON.');
  }
  return `${serialized}\n`;
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function digest(value: unknown): string {
  return sha256(stableJson(value));
}
