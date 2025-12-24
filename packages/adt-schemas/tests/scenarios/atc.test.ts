import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario } from './base/scenario';
import { atc, atcworklist } from '../../src/schemas/index';
import type { InferTypedSchema } from 'ts-xsd';

// Extract types from schemas using ts-xsd's official type extractor
// Generated types now match parse() behavior - content directly without wrapper
type AtcCustomizing = InferTypedSchema<typeof atc>;
type AtcWorklist = InferTypedSchema<typeof atcworklist>;

/**
 * Test for ATC customizing response
 * GET /sap/bc/adt/atc/customizing
 */
class AtcCustomizingScenario extends Scenario<typeof atc> {
  readonly schema = atc;
  readonly fixtures = [fixtures.atc.customizing];

  validateParsed(data: AtcCustomizing): void {
    // parse() now returns wrapped format: { elementName: content }
    const customizing = (data as any).customizing;
    expect(customizing).toBeDefined();

    // Properties
    expect(customizing.properties).toBeDefined();
    expect(customizing.properties?.property).toBeDefined();
    expect(customizing.properties?.property?.length).toBeGreaterThan(0);

    // Check for systemCheckVariant property
    const checkVariant = customizing.properties?.property?.find(
      (p: any) => p.name === 'systemCheckVariant',
    );
    expect(checkVariant).toBeDefined();
    expect(checkVariant?.value).toBe('DEFAULT_CHECK_VARIANT');

    // Exemption reasons
    expect(customizing.exemption).toBeDefined();
    expect(customizing.exemption?.reasons).toBeDefined();
    expect(customizing.exemption?.reasons?.reason).toBeDefined();
    expect(customizing.exemption?.reasons?.reason?.length).toBeGreaterThan(0);

    // Check for FPOS reason
    const fposReason = customizing.exemption?.reasons?.reason?.find(
      (r: any) => r.id === 'FPOS',
    );
    expect(fposReason).toBeDefined();
    expect(fposReason?.justificationMandatory).toBe(true);
  }

  override validateBuilt(xml: string): void {
    expect(xml).toContain('xmlns:atc="http://www.sap.com/adt/atc"');
    expect(xml).toContain('systemCheckVariant');
    expect(xml).toContain('exemption');
  }
}

/**
 * Test for ATC worklist response
 * GET /sap/bc/adt/atc/worklists/{id}
 */
class AtcWorklistScenario extends Scenario<typeof atcworklist> {
  readonly schema = atcworklist;
  readonly fixtures = [fixtures.atc.worklist];

  validateParsed(data: AtcWorklist): void {
    // parse() now returns wrapped format: { elementName: content }
    const worklist = (data as any).worklist;
    expect(worklist).toBeDefined();

    // Root attributes
    expect(worklist.id).toBeDefined();
    expect(worklist.timestamp).toBeDefined();
    expect(worklist.usedObjectSet).toBeDefined();
    expect(worklist.objectSetIsComplete).toBe(true);

    // Object sets
    expect(worklist.objectSets).toBeDefined();
    expect(worklist.objectSets?.objectSet).toBeDefined();
    expect(worklist.objectSets?.objectSet?.length).toBeGreaterThanOrEqual(2);

    // Check for ALL object set
    const allSet = worklist.objectSets?.objectSet?.find(
      (s: any) => s.kind === 'ALL',
    );
    expect(allSet).toBeDefined();
    expect(allSet?.title).toBe('All Objects');

    // Check for TRANSPORT object set
    const transportSet = worklist.objectSets?.objectSet?.find(
      (s: any) => s.kind === 'TRANSPORT',
    );
    expect(transportSet).toBeDefined();

    // Objects
    expect(worklist.objects).toBeDefined();
    expect(worklist.objects?.object).toBeDefined();
    expect(worklist.objects?.object?.length).toBeGreaterThan(0);

    // Check first object has required attributes
    const firstObj = worklist.objects?.object?.[0];
    expect(firstObj?.uri).toBeDefined();
    expect(firstObj?.type).toBeDefined();
    expect(firstObj?.name).toBeDefined();
    expect(firstObj?.packageName).toBeDefined();
    expect(firstObj?.author).toBeDefined();

    // Check for object with findings
    const objWithFindings = worklist.objects?.object?.find(
      (o: any) => o.findings?.finding && o.findings.finding.length > 0,
    );
    expect(objWithFindings).toBeDefined();

    // Validate finding structure - findings are parsed with atcfinding namespace attributes
    const finding = objWithFindings?.findings?.finding?.[0] as Record<
      string,
      unknown
    >;
    expect(finding).toBeDefined();
    // Attributes may be parsed with or without namespace prefix depending on schema
    expect(finding?.uri ?? finding?.['atcfinding:uri']).toBeDefined();

    // Infos
    expect(worklist.infos).toBeDefined();
    expect(worklist.infos?.info).toBeDefined();
    expect(worklist.infos?.info?.length).toBeGreaterThan(0);

    // Check for FINDING_STATS info
    const statsInfo = worklist.infos?.info?.find(
      (i: any) => i.type === 'FINDING_STATS',
    );
    expect(statsInfo).toBeDefined();
    expect(statsInfo?.description).toBeDefined();
  }

  override validateBuilt(xml: string): void {
    expect(xml).toContain(
      'xmlns:atcworklist="http://www.sap.com/adt/atc/worklist"',
    );
    expect(xml).toContain('atcworklist:id=');
    expect(xml).toContain('atcworklist:objectSets');
    expect(xml).toContain('atcworklist:objects');
  }
}

// Run all ATC scenarios
runScenario(new AtcCustomizingScenario());
runScenario(new AtcWorklistScenario());
