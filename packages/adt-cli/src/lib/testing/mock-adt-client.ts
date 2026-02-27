/**
 * Mock ADT Client for testing
 * Provides realistic XML responses based on fixtures
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MockAdtClientOptions {
  fixturesPath?: string;
  throwErrors?: boolean;
}

export class MockAdtClient {
  private fixturesPath: string;
  private throwErrors: boolean;

  constructor(options: MockAdtClientOptions = {}) {
    this.fixturesPath =
      options.fixturesPath || join(process.cwd(), 'tmp', 'adt-fixtures');
    this.throwErrors = options.throwErrors || false;
  }

  /**
   * Mock GET request - returns fixture data
   */
  async get(endpoint: string): Promise<string> {
    const fixtureName = this.getFixtureName(endpoint);
    return this.loadFixture(fixtureName);
  }

  /**
   * Mock POST request - returns fixture data
   */
  async post(endpoint: string, body?: any): Promise<string> {
    const fixtureName = this.getFixtureName(endpoint);
    return this.loadFixture(fixtureName);
  }

  /**
   * Mock PUT request - returns fixture data
   */
  async put(endpoint: string, body?: any): Promise<string> {
    const fixtureName = this.getFixtureName(endpoint);
    return this.loadFixture(fixtureName);
  }

  /**
   * Mock DELETE request - returns empty response
   */
  async delete(endpoint: string): Promise<string> {
    return '';
  }

  /**
   * Map endpoint to fixture name
   */
  private getFixtureName(endpoint: string): string {
    // Map common endpoints to fixture names
    const endpointMap: Record<string, string> = {
      '/sap/bc/adt/discovery': 'discovery',
      '/sap/bc/adt/cts/transports': 'transport-list',
      '/sap/bc/adt/oo/classes/zcl_test_class': 'class-zcl-test',
      '/sap/bc/adt/oo/interfaces/zif_test_interface': 'interface-zif-test',
      '/sap/bc/adt/packages/ztest_pkg': 'package-ztest',
    };

    // Check for exact match
    if (endpointMap[endpoint]) {
      return endpointMap[endpoint];
    }

    // Check for transport details pattern
    const transportMatch = endpoint.match(
      /\/sap\/bc\/adt\/cts\/transports\/([A-Z0-9]+)/,
    );
    if (transportMatch) {
      return 'transport-details';
    }

    // Check for class pattern
    const classMatch = endpoint.match(/\/sap\/bc\/adt\/oo\/classes\/([a-z_]+)/);
    if (classMatch) {
      return 'class-zcl-test'; // Use generic class fixture
    }

    // Check for interface pattern
    const interfaceMatch = endpoint.match(
      /\/sap\/bc\/adt\/oo\/interfaces\/([a-z_]+)/,
    );
    if (interfaceMatch) {
      return 'interface-zif-test'; // Use generic interface fixture
    }

    // Check for package pattern
    const packageMatch = endpoint.match(/\/sap\/bc\/adt\/packages\/([a-z_]+)/);
    if (packageMatch) {
      return 'package-ztest'; // Use generic package fixture
    }

    // Default fallback
    return 'discovery';
  }

  /**
   * Load fixture file
   */
  private loadFixture(fixtureName: string): string {
    const fixturePath = join(this.fixturesPath, `${fixtureName}.xml`);

    if (!existsSync(fixturePath)) {
      if (this.throwErrors) {
        throw new Error(`Fixture not found: ${fixturePath}`);
      }

      // Return minimal valid XML response
      return this.getDefaultResponse(fixtureName);
    }

    try {
      return readFileSync(fixturePath, 'utf8');
    } catch (error) {
      if (this.throwErrors) {
        throw error;
      }

      return this.getDefaultResponse(fixtureName);
    }
  }

  /**
   * Generate default XML responses when fixtures are missing
   */
  private getDefaultResponse(fixtureName: string): string {
    switch (fixtureName) {
      case 'discovery':
        return `<?xml version="1.0" encoding="UTF-8"?>
<app:service xmlns:app="http://www.w3.org/2007/app">
  <app:workspace>
    <atom:title>Mock ADT Services</atom:title>
    <app:collection href="/sap/bc/adt/cts/transports">
      <atom:title>Transport Requests</atom:title>
    </app:collection>
  </app:workspace>
</app:service>`;

      case 'transport-list':
        return `<?xml version="1.0" encoding="UTF-8"?>
<cts:transports xmlns:cts="http://www.sap.com/cts">
  <cts:transport number="TRLK907362" description="Test Transport" status="modifiable" owner="DEVELOPER" />
</cts:transports>`;

      case 'transport-details':
        return `<?xml version="1.0" encoding="UTF-8"?>
<cts:transport xmlns:cts="http://www.sap.com/cts" number="TRLK907362">
  <cts:description>Test Transport</cts:description>
  <cts:status>modifiable</cts:status>
  <cts:owner>DEVELOPER</cts:owner>
  <cts:objects>
    <cts:object type="CLAS" name="ZCL_TEST_CLASS" />
    <cts:object type="INTF" name="ZIF_TEST_INTERFACE" />
  </cts:objects>
</cts:transport>`;

      case 'class-zcl-test':
        return `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" name="ZCL_TEST_CLASS">
  <class:description>Test Class</class:description>
  <class:package>ZTEST_PKG</class:package>
  <class:source>CLASS zcl_test_class DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: test_method.
ENDCLASS.

CLASS zcl_test_class IMPLEMENTATION.
  METHOD test_method.
    " Implementation
  ENDMETHOD.
ENDCLASS.</class:source>
</class:abapClass>`;

      case 'interface-zif-test':
        return `<?xml version="1.0" encoding="UTF-8"?>
<intf:abapInterface xmlns:intf="http://www.sap.com/adt/oo/interfaces" name="ZIF_TEST_INTERFACE">
  <intf:description>Test Interface</intf:description>
  <intf:package>ZTEST_PKG</intf:package>
  <intf:source>INTERFACE zif_test_interface PUBLIC.
  METHODS: test_method.
ENDINTERFACE.</intf:source>
</intf:abapInterface>`;

      case 'package-ztest':
        return `<?xml version="1.0" encoding="UTF-8"?>
<pkg:package xmlns:pkg="http://www.sap.com/adt/packages" name="ZTEST_PKG">
  <pkg:description>Test Package</pkg:description>
  <pkg:packageType>development</pkg:packageType>
</pkg:package>`;

      default:
        return `<?xml version="1.0" encoding="UTF-8"?>
<mock:response xmlns:mock="http://mock.adt.client">
  <mock:message>Mock response for ${fixtureName}</mock:message>
</mock:response>`;
    }
  }
}
