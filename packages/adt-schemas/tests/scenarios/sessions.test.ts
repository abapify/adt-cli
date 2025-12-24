import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario, type SchemaType } from './base/scenario';
import { http } from '../../src/schemas/index';

/**
 * Test for HTTP Session response - GET /sap/bc/adt/core/http/sessions
 *
 * Fixture: Real SAP session response with CSRF tokens and atom links
 * Source: GET /sap/bc/adt/core/http/sessions
 */
class SessionsScenario extends Scenario<typeof http> {
  readonly schema = http;
  readonly fixtures = [fixtures.core.http.session];

  validateParsed(data: SchemaType<typeof http>): void {
    console.log('Parsed data:', JSON.stringify(data, null, 2));

    // parse() now returns wrapped format: { elementName: content }
    const session = (data as any).session;
    expect(session).toBeDefined();

    // Validate properties structure
    expect(session.properties).toBeDefined();
    expect(session.properties?.property).toBeDefined();
    expect(Array.isArray(session.properties?.property)).toBe(true);

    // Validate inactivity timeout property
    const timeoutProp = session.properties?.property?.find(
      (p: any) => p.name === 'inactivityTimeout',
    );
    expect(timeoutProp).toBeDefined();
    expect(timeoutProp?.name).toBe('inactivityTimeout');

    // Type assertions - verify full typing (using actual parsed structure)
    const propName: string | undefined =
      session.properties?.property?.[0]?.name;

    // Suppress unused variable warnings
    void propName;
  }
}

runScenario(new SessionsScenario());
