import { describe, expect, it } from 'vitest';
import {
  AdtFlowError,
  assessFlowIndexReconciliation,
  type ObjectDescriptor,
} from '../src';

const source = 'src/sample/zcl_sample.clas.abap';
const metadata = 'src/sample/zcl_sample.clas.xml';
const original = 'a'.repeat(64);
const updated = 'b'.repeat(64);

function descriptor(): ObjectDescriptor {
  return {
    schemaVersion: 1,
    formatVersion: 1,
    identity: {
      canonical: 'R3TR/CLAS/ZCL_SAMPLE',
      pgmid: 'R3TR',
      type: 'CLAS',
      name: 'ZCL_SAMPLE',
    },
    state: 'present',
    packagePath: ['SAMPLE'],
    selections: [],
    ownedFiles: [
      { path: source, hash: original, role: 'source', sourceComponent: 'main' },
      { path: metadata, hash: original, role: 'metadata' },
    ],
    configDigest: original,
    formatDigest: original,
  };
}

function assess(
  current: Map<string, string | null>,
  previous = new Map([
    [source, original],
    [metadata, original],
  ]),
  value: unknown = descriptor(),
) {
  return assessFlowIndexReconciliation({
    descriptor: value,
    currentFileHashes: current,
    previousFileHashes: previous,
  });
}

describe('flow index reconciliation assessment', () => {
  it('keeps an index whose owned bytes still match', () => {
    expect(
      assess(
        new Map([
          [source, original],
          [metadata, original],
        ]),
      ),
    ).toEqual({
      identity: 'R3TR/CLAS/ZCL_SAMPLE',
      status: 'current',
      changedPaths: [],
    });
  });

  it('identifies a changed owned path without rewriting the descriptor', () => {
    const value = descriptor();
    const before = structuredClone(value);
    expect(
      assess(
        new Map([
          [source, updated],
          [metadata, original],
        ]),
        undefined,
        value,
      ),
    ).toEqual({
      identity: 'R3TR/CLAS/ZCL_SAMPLE',
      status: 'stale',
      changedPaths: [source],
    });
    expect(value).toEqual(before);
  });

  it('treats an explicit absence as a changed old path after deletion or rename', () => {
    expect(
      assess(
        new Map([
          [source, null],
          [metadata, original],
          ['src/renamed.clas.abap', updated],
        ]),
      ),
    ).toMatchObject({ status: 'stale', changedPaths: [source] });
  });

  it('does not turn missing current evidence into a deletion', () => {
    expect(() => assess(new Map([[metadata, original]]))).toThrow(/evidence/i);
  });

  it('rejects pre-existing corruption even in a currently unchanged companion', () => {
    expect(() =>
      assess(
        new Map([
          [source, updated],
          [metadata, original],
        ]),
        new Map([
          [source, original],
          [metadata, updated],
        ]),
      ),
    ).toThrow(/previous/i);
  });

  it('rejects missing previous evidence for a stale descriptor', () => {
    expect(() =>
      assess(
        new Map([
          [source, updated],
          [metadata, original],
        ]),
        new Map([[source, original]]),
      ),
    ).toThrow(/previous/i);
  });

  it('rejects malformed supplied hashes', () => {
    expect(() =>
      assess(
        new Map([
          [source, 'not-a-sha256'],
          [metadata, original],
        ]),
      ),
    ).toThrow(/hash/i);
  });

  it('uses existing schema validation for unsafe ownership and unknown versions', () => {
    const value = descriptor();
    value.ownedFiles[0].path = '../outside';
    expect(() => assess(new Map(), undefined, value)).toThrow();
    expect(() =>
      assess(new Map(), undefined, { ...descriptor(), schemaVersion: 2 }),
    ).toThrow();
  });

  it('reports invalid descriptors as flow errors instead of raw parse errors', () => {
    expect(() =>
      assess(new Map(), undefined, { ...descriptor(), schemaVersion: 2 }),
    ).toThrow(AdtFlowError);
    expect(() =>
      assess(new Map(), undefined, { ...descriptor(), schemaVersion: 2 }),
    ).toThrow(/unsupported or invalid schema/i);
  });

  it('rejects duplicate owned paths instead of choosing one hash', () => {
    const value = descriptor();
    value.ownedFiles.push({ ...value.ownedFiles[0], hash: updated });
    expect(() =>
      assess(
        new Map([
          [source, original],
          [metadata, original],
        ]),
        undefined,
        value,
      ),
    ).toThrow(/duplicate/i);
  });

  it('returns changed paths in deterministic order and preserves omissions', () => {
    const value = descriptor();
    value.ownedFiles.reverse();
    value.omissions = [
      { component: 'locals_imp', diagnostic: 'SOURCE_UNAVAILABLE' },
    ];
    expect(
      assess(
        new Map([
          [source, updated],
          [metadata, null],
        ]),
        undefined,
        value,
      ),
    ).toMatchObject({ status: 'stale', changedPaths: [source, metadata] });
    expect(value.omissions).toEqual([
      { component: 'locals_imp', diagnostic: 'SOURCE_UNAVAILABLE' },
    ]);
  });
});
