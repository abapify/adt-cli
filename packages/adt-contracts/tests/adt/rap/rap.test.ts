/**
 * RAP Contracts Integration Tests
 *
 * These tests verify that the RAP contracts are properly defined.
 * All tests run using contract definitions without live system.
 *
 * Run with: bun test packages/adt-contracts/tests/adt/rap/rap.test.ts
 */

import { describe, it, expect } from 'vitest';
import { adtContract } from '../../../src/adt';

describe('RAP Contracts - Contract Definition Tests', () => {
  describe('Behavior Definition (BDEF) Contract', () => {
    it('should define GET contract for BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.get('zcl_test_behav');

      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/rap/behavdeft/');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.rap.behavdeft',
      );
    });

    it('should define POST contract for creating BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.post();

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/behavdeft');
      expect(descriptor.headers?.['Content-Type']).toContain(
        'application/vnd.sap.adt.rap.behavdeft',
      );
    });

    it('should define PUT contract for updating BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.put('zcl_test_behav', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });

      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define DELETE contract for BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.delete('zcl_test_behav');

      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zcl_test_behav');
    });

    it('should define lock contract for BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.lock('zcl_test_behav');

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?._action).toBe('LOCK');
    });

    it('should define unlock contract for BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const descriptor = contract.unlock('zcl_test_behav', {
        lockHandle: 'abc123',
      });

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcl_test_behav');
      expect(descriptor.query?._action).toBe('UNLOCK');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define source access contract', () => {
      const contract = adtContract.rap.behavdeft;

      const sourceDescriptor = contract.source.main.get('zcl_test_behav');

      expect(sourceDescriptor.method).toBe('GET');
      expect(sourceDescriptor.path).toContain('/sap/bc/adt/rap/behavdeft/');
      expect(sourceDescriptor.path).toContain('/source/main');
    });

    it('should define objectstructure contract for BDEF', () => {
      const contract = adtContract.rap.behavdeft;

      const structureDescriptor = contract.objectstructure('zcl_test_behav');

      expect(structureDescriptor.method).toBe('GET');
      expect(structureDescriptor.path).toContain('zcl_test_behav');
      expect(structureDescriptor.path).toContain('/objectstructure');
    });
  });

  describe('CDS View/Entity (DDLS) Contract', () => {
    it('should define GET contract for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const descriptor = contract.get('zcds_view');

      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/ddl/ddls/');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.ddl.ddlsource',
      );
    });

    it('should define POST contract for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const createDescriptor = contract.post();

      expect(createDescriptor.method).toBe('POST');
      expect(createDescriptor.path).toBe('/sap/bc/adt/ddl/ddls');
      expect(createDescriptor.headers?.['Content-Type']).toContain(
        'application/vnd.sap.adt.ddl.ddlsource',
      );
    });

    it('should define PUT contract for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const descriptor = contract.put('zcds_view', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });

      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define DELETE contract for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const descriptor = contract.delete('zcds_view');

      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zcds_view');
    });

    it('should define lock contract for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const descriptor = contract.lock('zcds_view', {
        corrNr: 'DEVK900001',
      });

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zcds_view');
      expect(descriptor.query?._action).toBe('LOCK');
    });

    it('should define source access for DDLS', () => {
      const contract = adtContract.rap.ddls;

      const sourceDescriptor = contract.source.main.get('zcds_view');

      expect(sourceDescriptor.method).toBe('GET');
      expect(sourceDescriptor.path).toContain('/sap/bc/adt/ddl/ddls/');
      expect(sourceDescriptor.path).toContain('/source/main');
    });
  });

  describe('RAP Generator Workspace Contract', () => {
    it('should define list contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.list();

      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/generator');
      expect(descriptor.headers?.Accept).toContain(
        'application/vnd.sap.adt.rap.generator',
      );
    });

    it('should define get contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.get('zrap_workspace');

      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/sap/bc/adt/rap/generator/');
      expect(descriptor.path).toContain('zrap_workspace');
    });

    it('should define create contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.create({ corrNr: 'DEVK900001' });

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toBe('/sap/bc/adt/rap/generator');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
    });

    it('should define update contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.update('zrap_workspace', {
        corrNr: 'DEVK900001',
        lockHandle: 'abc123',
      });

      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?.corrNr).toBe('DEVK900001');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });

    it('should define delete contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.delete('zrap_workspace');

      expect(descriptor.method).toBe('DELETE');
      expect(descriptor.path).toContain('zrap_workspace');
    });

    it('should define lock contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.lock('zrap_workspace', {
        corrNr: 'DEVK900001',
      });

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?._action).toBe('LOCK');
      expect(descriptor.query?.accessMode).toBe('MODIFY');
    });

    it('should define unlock contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.unlock('zrap_workspace', 'lock-handle-123');

      expect(descriptor.method).toBe('POST');
      expect(descriptor.path).toContain('zrap_workspace');
      expect(descriptor.query?._action).toBe('UNLOCK');
      expect(descriptor.query?.lockHandle).toBe('lock-handle-123');
    });

    it('should define getSource contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.getSource('zrap_workspace');

      expect(descriptor.method).toBe('GET');
      expect(descriptor.path).toContain('/source/main');
      expect(descriptor.headers?.Accept).toContain('text/plain');
    });

    it('should define putSource contract', () => {
      const contract = adtContract.rap.generator;

      const descriptor = contract.putSource('zrap_workspace', {
        lockHandle: 'abc123',
      });

      expect(descriptor.method).toBe('PUT');
      expect(descriptor.path).toContain('/source/main');
      expect(descriptor.headers?.['Content-Type']).toContain('text/plain');
      expect(descriptor.query?.lockHandle).toBe('abc123');
    });
  });

  describe('RAP Contract Types', () => {
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
