import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario, type SchemaType } from './base/scenario';
import { classes } from '../../src/schemas/index';

/**
 * Test for ABAP class response - GET /sap/bc/adt/oo/classes/{name}
 *
 * Fixture: ZCL_SAMPLE_CLASS (sanitized from real SAP response)
 * Source: GET /sap/bc/adt/oo/classes/zcl_sample_class
 *
 * Note: This schema has multiple root elements (abapClass, abapClassInclude).
 * This test uses AbapClass type specifically since the fixture is an AbapClass.
 */
class ClassesScenario extends Scenario<typeof classes> {
  readonly schema = classes;
  readonly fixtures = [fixtures.oo.class];

  validateParsed(data: SchemaType<typeof classes>): void {
    // parse() now returns wrapped format: { elementName: content }
    const abapClass = (data as any).abapClass;
    expect(abapClass).toBeDefined();

    // Root class: attributes
    expect(abapClass.final).toBe(true);
    expect(abapClass.abstract).toBe(false);
    expect(abapClass.visibility).toBe('public');
    expect(abapClass.category).toBe('generalObjectType');
    expect(abapClass.sharedMemoryEnabled).toBe(false);

    // Inherited abapoo: attributes
    expect(abapClass.modeled).toBe(false);

    // Inherited abapsource: attributes
    expect(abapClass.fixPointArithmetic).toBe(true);
    expect(abapClass.activeUnicodeCheck).toBe(true);

    // Inherited adtcore: attributes
    expect(abapClass.name).toBe('ZCL_SAMPLE_CLASS');
    expect(abapClass.type).toBe('CLAS/OC');
    expect(abapClass.description).toBe('Sample class');
    expect(abapClass.responsible).toBe('DEVELOPER');
    expect(abapClass.masterLanguage).toBe('EN');
    expect(abapClass.version).toBe('active');
    expect(abapClass.changedBy).toBe('DEVELOPER');
    expect(abapClass.createdBy).toBe('DEVELOPER');

    // Package reference
    expect(abapClass.packageRef).toBeDefined();
    expect(abapClass.packageRef?.name).toBe('$TMP');
    expect(abapClass.packageRef?.type).toBe('DEVC/K');

    // Syntax configuration
    expect(abapClass.syntaxConfiguration).toBeDefined();
    expect(abapClass.syntaxConfiguration?.language?.version).toBe('X');
    expect(abapClass.syntaxConfiguration?.language?.description).toBe(
      'Standard ABAP',
    );

    // Class includes (definitions, implementations, macros, testclasses, main)
    expect(abapClass.include).toBeDefined();
    expect(abapClass.include).toHaveLength(5);

    // Verify include types
    // Note: Using 'any' because TypeScript hits recursion limit on deeply nested schema types
    const includeTypes = abapClass.include?.map((inc: any) => inc.includeType);
    expect(includeTypes).toContain('definitions');
    expect(includeTypes).toContain('implementations');
    expect(includeTypes).toContain('macros');
    expect(includeTypes).toContain('testclasses');
    expect(includeTypes).toContain('main');

    // Check main include details
    const mainInclude = abapClass.include?.find(
      (inc: any) => inc.includeType === 'main',
    );
    expect(mainInclude).toBeDefined();
    expect(mainInclude?.sourceUri).toBe('source/main');
    expect(mainInclude?.type).toBe('CLAS/I');
  }

  override validateBuilt(xml: string): void {
    // Root element with namespace (schema uses 'class' prefix per $xmlns)
    expect(xml).toContain('xmlns:class="http://www.sap.com/adt/oo/classes"');

    // Root element name
    expect(xml).toContain('<class:abapClass');

    // Note: Attributes are not prefixed in the built XML because
    // the builder doesn't currently handle qualified attributes.
    // This is a known limitation - the round-trip test passes
    // because parsing handles both prefixed and unprefixed attributes.
  }
}

// Run the scenario
runScenario(new ClassesScenario());
