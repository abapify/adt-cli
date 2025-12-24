import { describe, it, expect, beforeAll } from 'vitest';
import { type FixtureHandle } from 'adt-fixtures';
import type { TypedSchema } from 'ts-xsd';

/** Schema with parse/build methods */
export type TestableSchema<T = unknown> = TypedSchema<T>;

/** Extract the type from a TypedSchema */
export type SchemaType<S> = S extends TypedSchema<infer T> ? T : unknown;

/** Extract array element type - useful when TS hits recursion limits */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/** Extract property type from an object - useful when TS hits recursion limits */
export type PropertyType<T, K extends keyof T> = T[K];

/**
 * Base class for schema-specific test scenarios.
 * Generic parameter S is the schema type for full type inference.
 */
export abstract class Scenario<S extends TestableSchema = TestableSchema> {
  abstract readonly schema: S;
  /** Fixture handles from adt-fixtures */
  abstract readonly fixtures: FixtureHandle[];

  /** Validate parsed object - fully typed */
  abstract validateParsed(parsed: SchemaType<S>): void;

  /** Optional: Validate built XML */
  validateBuilt?(xml: string): void;
}

/**
 * Run a scenario as a standalone test suite.
 * Call this from each *.test.ts file.
 *
 * @example
 * ```ts
 * // classes.test.ts
 * import { runScenario } from './base/scenario';
 * import { ClassesScenario } from './classes';
 * runScenario(new ClassesScenario());
 * ```
 */
export function runScenario<S extends TestableSchema>(
  scenario: Scenario<S>,
): void {
  describe(scenario.constructor.name, () => {
    for (const fixture of scenario.fixtures) {
      describe(fixture.path.replace('.xml', ''), () => {
        // State shared between tests
        const state: {
          xml: string;
          parsed: SchemaType<S> | null;
          built: string;
        } = {
          xml: '',
          parsed: null,
          built: '',
        };

        beforeAll(async () => {
          state.xml = await fixture.load();
          state.parsed = scenario.schema.parse(state.xml) as SchemaType<S>;
          state.built = scenario.schema.build!(state.parsed);
        });

        it('parses', () => {
          expect(state.parsed).toBeDefined();
        });

        it('validates parsed', () => {
          scenario.validateParsed(state.parsed!);
        });

        it('builds', () => {
          expect(state.built).toContain('<?xml');
        });

        it('validates built', () => {
          scenario.validateBuilt?.(state.built);
        });

        it('round-trips', () => {
          const parsed2 = scenario.schema.parse(state.built);
          const built2 = scenario.schema.build!(parsed2 as SchemaType<S>);
          expect(state.built).toBe(built2);
        });
      });
    }
  });
}
