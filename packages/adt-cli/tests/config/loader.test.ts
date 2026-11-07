import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ConfigLoader } from '../../src/lib/config/loader';

const fixtureRoot = path.resolve(
  import.meta.dirname,
  '../../../../tmp/tests/yaml-config',
);
const base = `auth:\n  type: mock\n  mock:\n    enabled: true\nplugins:\n  formats:\n    - name: '@abapify/adt-plugin-abapgit'\n`;
let directory: string;
let loader: ConfigLoader;

async function load(extra: string) {
  const file = path.join(directory, 'adt.config.yaml');
  // Fixed fixture name inside the test-owned temporary directory.
  // nosemgrep: javascript_pathtraversal_rule-non-literal-fs-filename
  await fs.writeFile(file, base + extra);
  return loader.load(file);
}

beforeEach(async () => {
  ConfigLoader.clearCache();
  loader = new ConfigLoader();
  // Fixed fixture root resolved relative to this test file.
  // nosemgrep: javascript_pathtraversal_rule-non-literal-fs-filename
  await fs.mkdir(fixtureRoot, { recursive: true });
  directory = await fs.mkdtemp(path.join(fixtureRoot, 'loader-'));
});

afterEach(async () => {
  ConfigLoader.clearCache();
  vi.unstubAllEnvs();
  await fs.rm(directory, { recursive: true, force: true });
});

describe('YAML configuration loading', () => {
  it('keeps prototype-like keys as own data without changing prototypes', async () => {
    const config = await load(
      'extra:\n  __proto__:\n    polluted: true\n  constructor: ordinary-data\n',
    );
    const extra = (config as unknown as { extra: Record<string, unknown> })
      .extra;
    expect(Object.getPrototypeOf(extra)).toBe(Object.prototype);
    expect(Object.hasOwn(extra, '__proto__')).toBe(true);
    expect(extra.__proto__).toEqual({ polluted: true });
    expect(extra.polluted).toBeUndefined();
    expect(extra.constructor).toBe('ordinary-data');
    expect(
      (Object.prototype as Record<string, unknown>).polluted,
    ).toBeUndefined();
  });

  it('rejects cyclic aliases with a configuration error', async () => {
    await expect(load('extra: &loop { next: *loop }\n')).rejects.toThrow(
      'Cyclic configuration values are not supported',
    );
  });

  it('bounds alias expansion before environment processing', async () => {
    await expect(
      load(
        `extra:\n  value: &item { enabled: true }\n  references: [${Array.from({ length: 101 }, () => '*item').join(', ')}]\n`,
      ),
    ).rejects.toThrow(/alias count|resource exhaustion/i);
  });

  // Each level references the previous anchor twice. Aliases rooted in an empty
  // collection have zero YAML alias weight, so only the loader's own bound
  // stops the doubling. 18 levels is ~500k copies without that bound: small
  // enough to finish quickly if the bound regresses, large enough to fail.
  function nestedAliases(levels: number): string {
    const lines = ['extra:', '  level0: &level0 []'];
    for (let level = 1; level <= levels; level++) {
      const previous = `*level${level - 1}`;
      lines.push(`  level${level}: &level${level} [${previous}, ${previous}]`);
    }
    return `${lines.join('\n')}\n`;
  }

  it('bounds nested aliases rooted in an empty collection', async () => {
    await expect(load(nestedAliases(18))).rejects.toThrow(
      /exceeds the supported size/,
    );
  });

  function doubled(depth: number): unknown[] {
    let value: unknown[] = [];
    for (let level = 0; level < depth; level += 1) {
      value = [value, value];
    }
    return value;
  }

  it('still loads modest nested aliases', async () => {
    const config = await load(nestedAliases(4));
    expect(config).toMatchObject({
      extra: {
        level0: doubled(0),
        level1: doubled(1),
        level2: doubled(2),
        level3: doubled(3),
        level4: doubled(4),
      },
    });
  });

  it('preserves plain date-like strings', async () => {
    const config = await load('extra: { date: 2026-11-06 }\n');
    expect((config as unknown as { extra: unknown }).extra).toEqual({
      date: '2026-11-06',
    });
  });

  it('preserves merge keys, repeated noncyclic aliases and environment values', async () => {
    vi.stubEnv('ADT_CONFIG_TEST_OUTPUT', './generated');
    const config = await load(
      'extra:\n  base: &shared { enabled: true, count: 2 }\n  first: { <<: *shared, count: 3 }\n  second: *shared\n  values: [false, null, 4.5, text]\ndefaults:\n  outputPath: ${ADT_CONFIG_TEST_OUTPUT}\n',
    );
    expect((config as unknown as { extra: unknown }).extra).toEqual({
      base: { enabled: true, count: 2 },
      first: { enabled: true, count: 3 },
      second: { enabled: true, count: 2 },
      values: [false, null, 4.5, 'text'],
    });
    expect(config.defaults?.outputPath).toBe('./generated');
  });

  it.each([
    { environment: '', expected: '' },
    { environment: undefined, expected: '${ADT_CONFIG_TEST_OUTPUT}' },
    { environment: './generated', expected: './generated' },
  ])(
    'preserves an environment value of $environment',
    async ({ environment, expected }) => {
      vi.stubEnv('ADT_CONFIG_TEST_OUTPUT', environment);
      const config = await load(
        'defaults:\n  outputPath: ${ADT_CONFIG_TEST_OUTPUT}\n',
      );
      expect(config.defaults?.outputPath).toBe(expected);
    },
  );

  it.each([
    '!!js/function function(){}',
    '!!js/regexp /x/',
    '!!js/undefined value',
    '!custom value',
    '!!binary YQ==',
    '!!timestamp 2026-11-06',
  ])('rejects unsupported object tags: %s', async (tag) => {
    await expect(load(`extra: ${tag}\n`)).rejects.toThrow();
  });

  it.each([
    'extra: [unterminated',
    'extra: 1\nextra: 2',
    '---\nextra: second-document',
  ])('rejects invalid or ambiguous YAML: %s', async (yaml) => {
    await expect(load(yaml)).rejects.toThrow();
  });

  it('round-trips saved configuration after clearing the cache', async () => {
    const config = await load(
      'extra: { text: "2026-11-06", enabled: true, list: [1, null, text] }\n',
    );
    const extra = (config as unknown as { extra: Record<string, unknown> })
      .extra;
    const shared = { enabled: true };
    extra.first = shared;
    extra.second = shared;
    const output = path.join(directory, 'saved.yml');
    await loader.save(config, output);
    ConfigLoader.clearCache();
    expect(await new ConfigLoader().load(output)).toEqual(config);
    // Reads back the fixed fixture file this test just saved.
    // nosemgrep: javascript_pathtraversal_rule-non-literal-fs-filename
    expect(await fs.readFile(output, 'utf8')).not.toMatch(
      /(?:^|\s)[&*][a-zA-Z0-9_-]+/m,
    );
  });
});
