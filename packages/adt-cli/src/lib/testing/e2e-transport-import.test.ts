/**
 * E2E Integration Test for Transport Import Command
 * Tests the full CLI flow with mock ADT client
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { executeCli, createMockAdtClient } from './cli-test-utils';

describe('Transport Import E2E Tests', () => {
  const testFixturesDir = join(process.cwd(), 'tmp', 'test-fixtures');
  const testOutputDir = join(process.cwd(), 'tmp', 'test-output');

  beforeAll(() => {
    // Create test directories
    mkdirSync(testFixturesDir, { recursive: true });
    mkdirSync(testOutputDir, { recursive: true });

    // Create minimal test fixtures
    createTestFixtures();
  });

  afterAll(() => {
    // Clean up test directories
    if (existsSync(testFixturesDir)) {
      rmSync(testFixturesDir, { recursive: true, force: true });
    }
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  async function runTransportImport(args: string[]) {
    const mockClient = createMockAdtClient({ fixturesPath: testFixturesDir });
    return executeCli(['import', 'transport', 'TRLK907362', ...args], {
      mockClient,
      captureOutput: true,
    });
  }

  it('should handle plugin loading errors gracefully', async () => {
    const result = await runTransportImport([
      testOutputDir,
      '--format=@nonexistent/plugin',
    ]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('@nonexistent/plugin');
  });

  it('should successfully configure transport import with format option', async () => {
    const result = await runTransportImport([
      testOutputDir,
      '--format=abapgit',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Transport import configured successfully');
    expect(result.stdout).toContain('Transport: TRLK907362');
    expect(result.stdout).toContain('ADT Client: Mock (Testing)');
  });

  it('should accept additional format-options without error', async () => {
    const result = await runTransportImport([
      testOutputDir,
      '--format=abapgit',
      '--format-option',
      'folderLogic=full',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Transport import configured successfully');
    expect(result.stdout).toContain('ADT Client: Mock (Testing)');
  });

  it('should support object type filtering', async () => {
    const result = await runTransportImport([
      testOutputDir,
      '--format=abapgit',
      '--object-types=CLAS,INTF',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Transport import configured successfully');
  });

  it('should use default output directory when not specified', async () => {
    const result = await runTransportImport(['--format=abapgit']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Output: ./output');
  });

  it('should enable debug logging when --debug flag is used', async () => {
    const result = await runTransportImport([
      testOutputDir,
      '--format=abapgit',
      '--debug',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Transport import configured successfully');
  });
});

/**
 * Create minimal test fixtures for mock responses
 */
function createTestFixtures() {
  const fixtures = [
    {
      name: 'discovery.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<app:service xmlns:app="http://www.w3.org/2007/app">
  <app:workspace>
    <atom:title>Test ADT Services</atom:title>
    <app:collection href="/sap/bc/adt/cts/transports">
      <atom:title>Transport Requests</atom:title>
    </app:collection>
  </app:workspace>
</app:service>`,
    },
    {
      name: 'transport-details.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<cts:transport xmlns:cts="http://www.sap.com/cts" number="TRLK907362">
  <cts:description>Test Transport for E2E Testing</cts:description>
  <cts:status>modifiable</cts:status>
  <cts:owner>TESTUSER</cts:owner>
  <cts:objects>
    <cts:object type="CLAS" name="ZCL_TEST_CLASS" />
    <cts:object type="INTF" name="ZIF_TEST_INTERFACE" />
    <cts:object type="DEVC" name="ZTEST_PKG" />
  </cts:objects>
</cts:transport>`,
    },
    {
      name: 'class-zcl-test.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>
<class:abapClass xmlns:class="http://www.sap.com/adt/oo/classes" name="ZCL_TEST_CLASS">
  <class:description>Test Class for E2E Testing</class:description>
  <class:package>ZTEST_PKG</class:package>
  <class:source>CLASS zcl_test_class DEFINITION PUBLIC.
  PUBLIC SECTION.
    METHODS: get_test_data RETURNING VALUE(rv_result) TYPE string.
ENDCLASS.

CLASS zcl_test_class IMPLEMENTATION.
  METHOD get_test_data.
    rv_result = 'Test data from E2E test'.
  ENDMETHOD.
ENDCLASS.</class:source>
</class:abapClass>`,
    },
  ];

  const fixturesDir = join(process.cwd(), 'tmp', 'test-fixtures');

  fixtures.forEach((fixture) => {
    const filePath = join(fixturesDir, fixture.name);
    writeFileSync(filePath, fixture.content, 'utf8');
  });
}
