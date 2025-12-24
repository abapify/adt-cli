import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario, type SchemaType } from './base/scenario';
import { adtcore } from '../../src/schemas/index';

/**
 * Test for Repository Search (Object References) - GET /sap/bc/adt/repository/informationsystem/search
 *
 * Fixture: Real SAP XML response with object reference list
 * Source: GET /sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=ZCL
 *
 * Note: adtcore schema has multiple root elements. For quickSearch, the response uses 'objectReferences'.
 * Use AdtcoreData (InferXsdMerged) to access all element fields as optional.
 */
class SearchScenario extends Scenario<typeof adtcore> {
  readonly schema = adtcore;
  readonly fixtures = [fixtures.repository.search.quickSearch];

  validateParsed(data: SchemaType<typeof adtcore>): void {
    // parse() now returns wrapped format: { elementName: content }
    // The search response uses 'objectReferences' as root element
    const objectReferences = (data as any).objectReferences;
    expect(objectReferences).toBeDefined();

    // Cast to any to access dynamic properties from search response
    const merged = objectReferences as unknown as Record<string, unknown>;

    // Validate we got object reference array
    expect(merged.objectReference).toBeDefined();
    expect(Array.isArray(merged.objectReference)).toBe(true);
    expect(merged.objectReference).toHaveLength(2);

    // Validate first object reference
    const refs = merged.objectReference as Array<Record<string, unknown>>;
    const firstRef = refs[0];
    expect(firstRef?.uri).toBe('/sap/bc/adt/oo/classes/zcl_test');
    expect(firstRef?.type).toBe('CLAS/OC');
    expect(firstRef?.name).toBe('ZCL_TEST');
    expect(firstRef?.packageName).toBe('$TMP');
    expect(firstRef?.description).toBe('Test class');

    // Validate second object reference
    const secondRef = refs[1];
    expect(secondRef?.uri).toBe('/sap/bc/adt/oo/classes/zcl_another');
    expect(secondRef?.type).toBe('CLAS/OC');
    expect(secondRef?.name).toBe('ZCL_ANOTHER');
    expect(secondRef?.description).toBe('Another class');
  }

  override validateBuilt(xml: string): void {
    // Root element with namespace (schema uses 'adtcore' prefix from XSD)
    expect(xml).toContain('xmlns:adtcore="http://www.sap.com/adt/core"');
    // The search response uses 'objectReferences' as root element
    expect(xml).toContain('objectReferences');
  }
}

// Run the scenario
runScenario(new SearchScenario());
