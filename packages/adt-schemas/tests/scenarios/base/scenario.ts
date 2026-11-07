import { describe, it, expect, beforeAll } from 'vitest';
import { type FixtureHandle } from '@abapify/adt-fixtures';
import type { TypedSchema } from '@abapify/ts-xsd';

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
 * Load, parse and build one fixture for a scenario.
 *
 * `build` is optional in `TypedSchema`; when a schema exposes none, the
 * fixture is parsed only and `built` stays undefined — the build-dependent
 * checks are skipped rather than crashing on the missing method.
 */
async function prepareFixture<S extends TestableSchema>(
  scenario: Scenario<S>,
  fixture: FixtureHandle,
): Promise<{ parsed: SchemaType<S>; built?: string }> {
  const xml = await fixture.load();
  const parsed = scenario.schema.parse(xml) as SchemaType<S>;
  const built = scenario.schema.build?.(parsed);
  return { parsed, built };
}

function assertParsedDefined(parsed: unknown): void {
  expect(parsed).toBeDefined();
}

function assertValidatesParsed<S extends TestableSchema>(
  scenario: Scenario<S>,
  parsed: SchemaType<S>,
): void {
  scenario.validateParsed(parsed);
}

function assertBuiltXml(built: string): void {
  expect(built).toContain('<?xml');
}

function assertValidatesBuilt<S extends TestableSchema>(
  scenario: Scenario<S>,
  built: string,
): void {
  scenario.validateBuilt?.(built);
}

function assertRoundTrips<S extends TestableSchema>(
  scenario: Scenario<S>,
  built: string,
): void {
  const parsed2 = scenario.schema.parse(built);
  const build = scenario.schema.build;
  if (!build) return; // parse-only schema: nothing to re-build
  const built2 = build.call(scenario.schema, parsed2 as SchemaType<S>);
  expect(built).toBe(built2);
}

/**
 * Run every check for one scenario fixture: parse, parsed-content
 * validation, build, built-XML validation and round-trip stability.
 *
 * This runs exactly the assertions `runScenario` applies to one fixture.
 * Test files can declare their own `it()` cases around it, which keeps the
 * test declarations statically visible to test discovery tooling.
 */
export async function checkScenarioFixture<S extends TestableSchema>(
  scenario: Scenario<S>,
  fixture: FixtureHandle,
): Promise<void> {
  const { parsed, built } = await prepareFixture(scenario, fixture);

  assertParsedDefined(parsed);
  assertValidatesParsed(scenario, parsed);
  // Build-dependent checks run only for schemas that expose a build method;
  // parse-only schemas keep their parse/content assertions.
  if (built !== undefined) {
    assertBuiltXml(built);
    assertValidatesBuilt(scenario, built);
    assertRoundTrips(scenario, built);
  }
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
          parsed: SchemaType<S> | null;
          built?: string;
        } = {
          parsed: null,
        };

        beforeAll(async () => {
          const prepared = await prepareFixture(scenario, fixture);
          state.parsed = prepared.parsed;
          state.built = prepared.built;
        });

        it('parses', () => {
          assertParsedDefined(state.parsed);
        });

        it('validates parsed', () => {
          assertValidatesParsed(scenario, state.parsed!);
        });

        it('builds', () => {
          assertBuiltXml(state.built);
        });

        it('validates built', () => {
          assertValidatesBuilt(scenario, state.built);
        });

        it('round-trips', () => {
          assertRoundTrips(scenario, state.built);
        });
      });
    }
  });
}
