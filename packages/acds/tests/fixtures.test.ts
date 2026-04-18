import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(__dirname, 'fixtures');

const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.acds'));

describe('real-world fixture parsing', () => {
  for (const name of fixtures) {
    it(`parses ${name} without errors`, () => {
      const src = readFileSync(join(FIXTURE_DIR, name), 'utf8');
      const r = parse(src);
      if (r.errors.length > 0) {
        console.error(`Errors in ${name}:`, r.errors);
      }
      expect(r.errors).toHaveLength(0);
      expect(r.ast.definitions).toHaveLength(1);
    });
  }
});
