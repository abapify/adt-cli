/**
 * RAP Contracts - Contract Definition Validation
 *
 * These tests verify the RAP contracts are properly defined with correct
 * endpoints, methods, headers, and query parameters.
 *
 * Integration tests against a real SAP system are documented at the bottom
 * of this file. To run them, set ADT_SERVICE_KEY in your environment
 * and run: bun test packages/adt-contracts/tests/adt/rap/integration.test.ts
 *
 * Note: These are compile-time and contract-definition tests, not
 * integration tests. Real system tests require a running SAP system.
 */

import { describe, it, expect } from 'vitest';
import { adtContract } from '../../../src/adt';

describe('RAP Contracts - Contract Definitions', () => {
  describe('Behavior Definition (BDEF) Contract', () => {
    it('should define GET contract for BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.get('zcl_test_behav');
      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/rap/behavdeft/');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.rap.behavdeft',
      );
    });

    it('should define POST contract for creating BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.post();
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/behavdeft');
      expect(descriptor.headers?.['Content-Type']).toContain(
        'application/vnd.sap.adt.rap.behavdeft',
      );
    });

    it('should define PUT contract for updating BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.put('zcl_test_behav', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });
      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define DELETE contract for BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.delete('zcl_test_behav');
      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zcl_test_behav');
    });

    it('should define lock contract for BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.lock('zcl_test_behav');
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?._action).toBe('LOCK');
    });

    it('should define unlock contract for BDEF', () => {
      const descriptor = adtContract.rap.behavdeft.unlock('zcl_test_behav', {
        lockHandle: 'abc123',
      });
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?._action).toBe('UNLOCK');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define source access contract', () => {
      const sourceDescriptor =
        adtContract.rap.behavdeft.source.main.get('zcl_test_behav');
      expect(sourceDescriptor.method).toBe('GET');
      expect(sourceDescriptor.path).toContain('/sap/bc/adt/rap/behavdeft/');
      expect(sourceDescriptor.path).toContain('/source/main');
    });

    it('should define objectstructure contract for BDEF', () => {
      const structureDescriptor =
        adtContract.rap.behavdeft.objectstructure('zcl_test_behav');
      expect(structureDescriptor.method).toBe('GET');
      expect(structureDescriptor.path).toContain('zcl_test_behav');
      expect(structureDescriptor.path).toContain('/objectstructure');
    });
  });

  describe('CDS View/Entity (DDLS) Contract', () => {
    it('should define GET contract for DDLS', () => {
      const descriptor = adtContract.rap.ddls.get('zcds_view');
      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/ddl/ddls/');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.ddl.ddlsource',
      );
    });

    it('should define POST contract for DDLS', () => {
      const createDescriptor = adtContract.rap.ddls.post();
      expect(createDescriptor.method).toBe('POST');
      expect(createDescriptor.path).toBe('/sap/bc/adt/ddl/ddls');
      expect(createDescriptor.headers?.['Content-Type']).toContain(
        'application/vnd.sap.adt.ddl.ddlsource',
      );
    });

    it('should define PUT contract for DDLS', () => {
      const descriptor = adtContract.rap.ddls.put('zcds_view', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });
      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define DELETE contract for DDLS', () => {
      const descriptor = adtContract.rap.ddls.delete('zcds_view');
      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zcds_view');
    });

    it('should define lock contract for DDLS', () => {
      const descriptor = adtContract.rap.ddls.lock('zcds_view', {
        corrNr: 'DEVK900001',
      });
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.query?._action).toBe('LOCK');
    });

    it('should define source access for DDLS', () => {
      const sourceDescriptor =
        adtContract.rap.ddls.source.main.get('zcds_view');
      expect(sourceDescriptor.method).toBe('GET');
      expect(sourceDescriptor.path).toContain('/sap/bc/adt/ddl/ddls/');
      expect(sourceDescriptor.path).toContain('/source/main');
    });
  });

  describe('RAP Generator Workspace Contract', () => {
    it('should define list contract', () => {
      const descriptor = adtContract.rap.generator.list();
      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/generator');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.rap.generator',
      );
    });

    it('should define get contract', () => {
      const descriptor = adtContract.rap.generator.get('zrap_workspace');
      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/rap/generator/');
      expect(descriptor.path).toContain('zrap_workspace');
    });

    it('should define create contract', () => {
      const descriptor = adtContract.rap.generator.create({
        corrNr: 'DEVK900001',
      });
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/generator');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
    });

    it('should define update contract', () => {
      const descriptor = adtContract.rap.generator.update('zrap_workspace', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });
      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define delete contract', () => {
      const descriptor = adtContract.rap.generator.delete('zrap_workspace');
      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zrap_workspace');
    });

    it('should define lock contract', () => {
      const descriptor = adtContract.rap.generator.lock('zrap_workspace', {
        corrNr: 'DEVK900001',
      });
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?._action).toBe('LOCK');
      expect(descriptor.query?.accessMode).toBe('MODIFY');
    });

    it('should define unlock contract', () => {
      const descriptor = adtContract.rap.generator.unlock(
        'zrap_workspace',
        'lock-handle-123',
      );
      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?._action).toBe('UNLOCK');
      expect(descriptor.query?.lockHandle).toBe('lock-handle-123');
    });

    it('should define getSource contract', () => {
      const descriptor = adtContract.rap.generator.getSource('zrap_workspace');
      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/source/main');
      expect(descriptor.headers?.Accept).toContain('text/plain');
    });

    it('should define putSource contract', () => {
      const descriptor = adtContract.rap.generator.putSource('zrap_workspace', {
        lockHandle: 'abc123',
      });
      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('/source/main');
      expect(descriptor.headers?.['Content-Type']).toContain('text/plain');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });
  });

  describe('RAP Contract Type Exports', () => {
    it('should export BehavdeftContract type', () => {
      const contract = adtContract.rap.behavdeft;
      expect(contract).toBeDefined();
      expect(typeof contract.get).toBe('function');
      expect(typeof contract.post).toBe('function');
      expect(typeof contract.put).toBe('function');
      expect(typeof contract.delete).toBe('function');
    });

    it('should export DdlsContract type', () => {
      const contract = adtContract.rap.ddls;
      expect(contract).toBeDefined();
      expect(typeof contract.get).toBe('function');
      expect(typeof contract.post).toBe('function');
      expect(typeof contract.put).toBe('function');
      expect(typeof contract.delete).toBe('function');
    });

    it('should export GeneratorContract type', () => {
      const contract = adtContract.rap.generator;
      expect(contract).toBeDefined();
      expect(typeof contract.list).toBe('function');
      expect(typeof contract.get).toBe('function');
      expect(typeof contract.create).toBe('function');
    });
  });
});

/**
 * Integration Testing with Real SAP System
 * =========================================
 *
 * To test these contracts against a real SAP system:
 *
 * 1. Set ADT_SERVICE_KEY environment variable:
 *    export ADT_SERVICE_KEY='{"url":"https://your-sap-system.com:8000","uaa":{"clientid":"your-client","clientsecret":"your-secret"}}'
 *
 * 2. Or create a service key file and reference it:
 *    export ADT_SERVICE_KEY=/path/to/service-key.json
 *
 * 3. Create a test script:
 *    ```typescript
 *    // tests/rap-integration.ts
 *    import { resolveServiceKeyFromEnv } from '@abapify/adt-auth/utils/env';
 *    import { createAdtClient } from '@abapify/adt-client';
 *
 *    async function testRAPContracts() {
 *      const destination = resolveServiceKeyFromEnv();
 *      if (!destination) {
 *        throw new Error('ADT_SERVICE_KEY not configured');
 *      }
 *
 *      const serviceKey = destination.options?.serviceKey;
 *      const client = createAdtClient({
 *        baseUrl: serviceKey.url,
 *        username: process.env.ADT_USERNAME || 'Developer',
 *        password: process.env.ADT_PASSWORD || '',
 *      });
 *
 *      // Test BDEF endpoint
 *      try {
 *        const bdef = await client.adt.rap.behavdeft.get('ZCL_EXISTING_BDEF');
 *        console.log('BDEF retrieved:', bdef);
 *      } catch (e) {
 *        console.log('BDEF not found or error:', e);
 *      }
 *
 *      // Test DDLS endpoint
 *      try {
 *        const ddls = await client.adt.rap.ddls.get('ZCDS_EXISTING_VIEW');
 *        console.log('DDLS retrieved:', ddls);
 *      } catch (e) {
 *        console.log('DDLS not found or error:', e);
 *      }
 *
 *      // Test Generator endpoint
 *      try {
 *        const workspaces = await client.adt.rap.generator.list();
 *        console.log('Generator workspaces:', workspaces);
 *      } catch (e) {
 *        console.log('Generator error:', e);
 *      }
 *    }
 *
 *    testRAPContracts();
 *    ```
 *
 * 4. Run with bun:
 *    bun run tests/rap-integration.ts
 */
