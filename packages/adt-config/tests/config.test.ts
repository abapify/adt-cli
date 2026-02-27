/**
 * Config Module Tests
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  type Destination,
  type AdtConfig,
  defineConfig,
  loadConfig,
} from '../src';

// =============================================================================
// Config Tests
// =============================================================================

describe('Config Module', () => {
  describe('Types', () => {
    it('should create a destination config', () => {
      const dest: Destination = {
        type: 'basic',
        options: {
          url: 'https://example.com',
          client: '100',
        },
      };

      expect(dest.type).toBe('basic');
      expect((dest.options as any).url).toBe('https://example.com');
    });

    it('should create typed destination config', () => {
      interface PuppeteerOptions {
        url: string;
        client: string;
      }

      const dest: Destination<PuppeteerOptions> = {
        type: 'puppeteer',
        options: {
          url: 'https://example.com',
          client: '100',
        },
      };

      expect(dest.type).toBe('puppeteer');
      expect(dest.options.url).toBe('https://example.com');
      expect(dest.options.client).toBe('100');
    });
  });

  describe('defineConfig', () => {
    it('should return config as-is', () => {
      const config: AdtConfig = {
        destinations: {
          DEV: { type: 'basic', options: { url: 'https://dev.example.com' } },
        },
      };

      const result = defineConfig(config);

      expect(result).toBe(config);
    });

    it('should normalize TS config to JSON', () => {
      const tsConfig = defineConfig({
        destinations: {
          DEV: {
            type: 'puppeteer',
            options: { url: 'https://dev.example.com', client: '100' },
          },
          QAS: { type: 'basic', options: { url: 'https://qas.example.com' } },
        },
      });

      // Verify it's JSON-serializable
      const json = JSON.stringify(tsConfig);
      const parsed = JSON.parse(json);

      expect(parsed.destinations.DEV.type).toBe('puppeteer');
      expect(parsed.destinations.DEV.options.url).toBe(
        'https://dev.example.com',
      );
      expect(parsed.destinations.QAS.type).toBe('basic');
    });
  });

  describe('LoadedConfig', () => {
    const testDir = join(tmpdir(), 'adt-config-test-' + Date.now());

    beforeAll(() => {
      mkdirSync(testDir, { recursive: true });
      writeFileSync(
        join(testDir, 'adt.config.json'),
        JSON.stringify({
          destinations: {
            DEV: { type: 'basic', options: { url: 'https://dev.example.com' } },
            QAS: {
              type: 'puppeteer',
              options: { url: 'https://qas.example.com' },
            },
          },
        }),
      );
    });

    afterAll(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('should load config and provide get method', async () => {
      const config = await loadConfig(testDir);

      const dev = config.getDestination('DEV');
      expect(dev).toBeDefined();
      expect(dev?.type).toBe('basic');
    });

    it('should return undefined for unknown destination', async () => {
      const config = await loadConfig(testDir);

      expect(config.getDestination('UNKNOWN')).toBeUndefined();
    });

    it('should list all destinations', async () => {
      const config = await loadConfig(testDir);

      const list = config.listDestinations();
      expect(list).toContain('DEV');
      expect(list).toContain('QAS');
      expect(list).toHaveLength(2);
    });

    it('should check if destination exists', async () => {
      const config = await loadConfig(testDir);

      expect(config.hasDestination('DEV')).toBe(true);
      expect(config.hasDestination('UNKNOWN')).toBe(false);
    });

    it('should provide raw config', async () => {
      const config = await loadConfig(testDir);

      expect(config.raw.destinations).toBeDefined();
      expect(config.raw.destinations?.DEV).toBeDefined();
    });
  });
});
