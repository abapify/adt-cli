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
  // codacy-disable-next-line
  const file = path.join(directory, 'adt.config.yaml');
  await fs.writeFile(file, base + extra);
  return loader.load(file);
}

beforeEach(async () => {
  ConfigLoader.clearCache();
  loader = new ConfigLoader();
  await fs.mkdir(fixtureRoot, { recursive: true });
  // codacy-disable-next-line
  directory = await fs.mkdtemp(path.join(fixtureRoot, 'loader-'));
});

afterEach(() => {
  ConfigLoader.clearCache();
  vi.unstubAllEnvs();
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
    // codacy-disable-next-line
    const output = path.join(directory, 'saved.yml');
    await loader.save(config, output);
    ConfigLoader.clearCache();
    expect(await new ConfigLoader().load(output)).toEqual(config);
    expect(await fs.readFile(output, 'utf8')).not.toMatch(
      /(?:^|\s)[&*][a-zA-Z0-9_-]+/m,
    );
  });
});
