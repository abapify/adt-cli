import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario, type SchemaType } from './base/scenario';
import { packagesV1 } from '../../src/schemas/index';

/**
 * Test for package response - GET /sap/bc/adt/packages/{name}
 *
 * Fixture: $TMP package (system temporary package)
 * Source: GET /sap/bc/adt/packages/%24TMP
 */
class PackagesScenario extends Scenario<typeof packagesV1> {
  readonly schema = packagesV1;
  readonly fixtures = [fixtures.packages.tmp];

  validateParsed(data: SchemaType<typeof packagesV1>): void {
    // parse() now returns wrapped format: { elementName: content }
    const pkg = (data as any).package;
    expect(pkg).toBeDefined();

    // Root adtcore: attributes
    expect(pkg.name).toBe('$TMP');
    expect(pkg.type).toBe('DEVC/K');
    expect(pkg.description).toBe('Temporary Objects (never transported!)');
    expect(pkg.responsible).toBe('SAP');
    expect(pkg.masterLanguage).toBe('EN');
    expect(pkg.language).toBe('EN');
    expect(pkg.version).toBe('active');
    expect(pkg.changedBy).toBe('SAP');
    expect(pkg.createdBy).toBe('SAP');

    // Package attributes
    expect(pkg.attributes).toBeDefined();
    expect(pkg.attributes?.packageType).toBe('development');
    expect(pkg.attributes?.isEncapsulated).toBe(false);
    expect(pkg.attributes?.isAddingObjectsAllowed).toBe(false);
    expect(pkg.attributes?.recordChanges).toBe(false);

    // Transport properties
    expect(pkg.transport).toBeDefined();
    expect(pkg.transport?.softwareComponent?.name).toBe('LOCAL');
    expect(pkg.transport?.softwareComponent?.description).toBe(
      'Local Developments (No Automatic Transport)',
    );

    // Subpackages
    expect(pkg.subPackages).toBeDefined();
    expect(pkg.subPackages?.packageRef).toBeDefined();
    expect(pkg.subPackages?.packageRef?.length).toBeGreaterThan(0);
    expect(pkg.subPackages?.packageRef?.[0].name).toBe('$TEST_TO_DELETE');
    expect(pkg.subPackages?.packageRef?.[0].type).toBe('DEVC/K');
  }

  override validateBuilt(xml: string): void {
    // Root element with namespace (schema uses 'pak' prefix from XSD)
    expect(xml).toContain('xmlns:pak="http://www.sap.com/adt/packages"');
    expect(xml).toContain('name="$TMP"');

    // Package attributes (attributes are output without namespace prefix)
    expect(xml).toContain('packageType="development"');
    expect(xml).toContain('isEncapsulated="false"');

    // Transport
    expect(xml).toContain('<pak:transport');
    expect(xml).toContain('<pak:softwareComponent');
    expect(xml).toContain('name="LOCAL"');

    // Subpackages
    expect(xml).toContain('<pak:subPackages');
    expect(xml).toContain('<pak:packageRef');
  }
}

// Run the scenario
runScenario(new PackagesScenario());
