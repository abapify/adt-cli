/**
 * RAP Contracts Type Verification Tests
 *
 * These tests verify the RAP contracts have correct:
 * - Endpoint paths
 * - HTTP methods
 * - Headers (Accept, Content-Type)
 * - Query parameters
 *
 * Note: Live integration tests are in scripts/rap-integration-test.ts
 *
 * Run with: bun test packages/adt-contracts/tests/adt/rap/e2e.test.ts
 */

import { describe, it, expect } from 'vitest';
import { adtContract } from '../../../src/adt';

describe('RAP Contracts - Type Verification', () => {
  describe('Behavior Definition (BDEF) Contract', () => {
    it('should have all expected methods', () => {
      const contract = adtContract.rap.behavdeft;

      expect(typeof contract.get).toBe('function');
      expect(typeof contract.post).toBe('function');
      expect(typeof contract.put).toBe('function');
      expect(typeof contract.delete).toBe('function');
      expect(typeof contract.lock).toBe('function');
      expect(typeof contract.unlock).toBe('function');
      expect(typeof contract.source?.main?.get).toBe('function');
      expect(typeof contract.objectstructure).toBe('function');
    });

    it('should have correct paths for all operations', () => {
      const behavdeft = adtContract.rap.behavdeft;

      expect(behavdeft.get('test').path).toBe('/sap/bc/adt/rap/behavdeft/test');
      expect(behavdeft.post().path).toBe('/sap/bc/adt/rap/behavdeft');
      expect(behavdeft.put('test', { corrNr: 'DEV1' }).path).toBe(
        '/sap/bc/adt/rap/behavdeft/test',
      );
      expect(behavdeft.delete('test').path).toBe(
        '/sap/bc/adt/rap/behavdeft/test',
      );
      expect(behavdeft.lock('test').path).toBe(
        '/sap/bc/adt/rap/behavdeft/test',
      );
      expect(behavdeft.unlock('test', { lockHandle: 'H123' }).path).toBe(
        '/sap/bc/adt/rap/behavdeft/test',
      );
      expect(behavdeft.source?.main?.get('test').path).toBe(
        '/sap/bc/adt/rap/behavdeft/test/source/main',
      );
      expect(behavdeft.objectstructure?.('test').path).toBe(
        '/sap/bc/adt/rap/behavdeft/test/objectstructure',
      );
    });

    it('should have correct HTTP methods', () => {
      const behavdeft = adtContract.rap.behavdeft;

      expect(behavdeft.get('test').method).toBe('GET');
      expect(behavdeft.post().method).toBe('POST');
      expect(behavdeft.put('test').method).toBe('PUT');
      expect(behavdeft.delete('test').method).toBe('DELETE');
      expect(behavdeft.lock('test').method).toBe('POST');
      expect(behavdeft.unlock('test', { lockHandle: 'H' }).method).toBe('POST');
    });

    it('should have correct Accept headers', () => {
      const behavdeft = adtContract.rap.behavdeft;
      const headers = behavdeft.get('test').headers?.Accept ?? '';

      expect(headers).toContain('application/vnd.sap.adt.rap.behavdeft');
    });

    it('should have correct Content-Type headers for write operations', () => {
      const behavdeft = adtContract.rap.behavdeft;
      const contentType = behavdeft.post().headers?.['Content-Type'] ?? '';

      expect(contentType).toContain('application/vnd.sap.adt.rap.behavdeft');
    });

    it('should have correct query parameters for lock/unlock', () => {
      const behavdeft = adtContract.rap.behavdeft;

      expect(behavdeft.lock('test').query?._action).toBe('LOCK');
      expect(behavdeft.unlock('test', { lockHandle: 'H' }).query?._action).toBe(
        'UNLOCK',
      );
      expect(
        behavdeft.unlock('test', { lockHandle: 'H' }).query?.lockHandle,
      ).toBe('H');
    });

    it('should support corrNr query parameter for transport operations', () => {
      const behavdeft = adtContract.rap.behavdeft;

      expect(behavdeft.put('test', { corrNr: 'DEV1' }).query?.corrNr).toBe(
        'DEV1',
      );
    });
  });

  describe('CDS View/Entity (DDLS) Contract', () => {
    it('should have all expected methods', () => {
      const contract = adtContract.rap.ddls;

      expect(typeof contract.get).toBe('function');
      expect(typeof contract.post).toBe('function');
      expect(typeof contract.put).toBe('function');
      expect(typeof contract.delete).toBe('function');
      expect(typeof contract.lock).toBe('function');
      expect(typeof contract.unlock).toBe('function');
      expect(typeof contract.source?.main?.get).toBe('function');
    });

    it('should have correct paths for all operations', () => {
      const ddls = adtContract.rap.ddls;

      expect(ddls.get('zcds_view').path).toBe('/sap/bc/adt/ddl/ddls/zcds_view');
      expect(ddls.post().path).toBe('/sap/bc/adt/ddl/ddls');
      expect(ddls.put('zcds_view', { corrNr: 'DEV1' }).path).toBe(
        '/sap/bc/adt/ddl/ddls/zcds_view',
      );
      expect(ddls.delete('zcds_view').path).toBe(
        '/sap/bc/adt/ddl/ddls/zcds_view',
      );
      expect(ddls.lock('zcds_view').path).toBe(
        '/sap/bc/adt/ddl/ddls/zcds_view',
      );
      expect(ddls.source?.main?.get('zcds_view').path).toBe(
        '/sap/bc/adt/ddl/ddls/zcds_view/source/main',
      );
    });

    it('should have correct HTTP methods', () => {
      const ddls = adtContract.rap.ddls;

      expect(ddls.get('v').method).toBe('GET');
      expect(ddls.post().method).toBe('POST');
      expect(ddls.put('v').method).toBe('PUT');
      expect(ddls.delete('v').method).toBe('DELETE');
      expect(ddls.lock('v').method).toBe('POST');
    });

    it('should have correct Accept headers', () => {
      const ddls = adtContract.rap.ddls;
      const headers = ddls.get('v').headers?.Accept ?? '';

      expect(headers).toContain('application/vnd.sap.adt.ddl.ddlsource');
    });

    it('should have correct Content-Type headers for write operations', () => {
      const ddls = adtContract.rap.ddls;
      const contentType = ddls.post().headers?.['Content-Type'] ?? '';

      expect(contentType).toContain('application/vnd.sap.adt.ddl.ddlsource');
    });

    it('should have correct query parameters for lock', () => {
      const ddls = adtContract.rap.ddls;

      expect(ddls.lock('v').query?._action).toBe('LOCK');
    });
  });

  describe('RAP Generator Contract', () => {
    it('should have all expected methods', () => {
      const contract = adtContract.rap.generator;

      expect(typeof contract.list).toBe('function');
      expect(typeof contract.get).toBe('function');
      expect(typeof contract.create).toBe('function');
      expect(typeof contract.update).toBe('function');
      expect(typeof contract.delete).toBe('function');
      expect(typeof contract.lock).toBe('function');
      expect(typeof contract.unlock).toBe('function');
      expect(typeof contract.getSource).toBe('function');
      expect(typeof contract.putSource).toBe('function');
    });

    it('should have correct paths for all operations', () => {
      const generator = adtContract.rap.generator;

      expect(generator.list().path).toBe('/sap/bc/adt/rap/generator');
      expect(generator.get('workspace').path).toBe(
        '/sap/bc/adt/rap/generator/workspace',
      );
      expect(generator.create({ corrNr: 'DEV1' }).path).toBe(
        '/sap/bc/adt/rap/generator',
      );
      expect(generator.update('workspace', { corrNr: 'DEV1' }).path).toBe(
        '/sap/bc/adt/rap/generator/workspace',
      );
      expect(generator.delete('workspace').path).toBe(
        '/sap/bc/adt/rap/generator/workspace',
      );
      expect(generator.lock('workspace').path).toBe(
        '/sap/bc/adt/rap/generator/workspace',
      );
      expect(generator.unlock('workspace', 'H123').path).toBe(
        '/sap/bc/adt/rap/generator/workspace',
      );
      expect(generator.getSource('workspace').path).toBe(
        '/sap/bc/adt/rap/generator/workspace/source/main',
      );
      expect(
        generator.putSource('workspace', { lockHandle: 'H123' }).path,
      ).toBe('/sap/bc/adt/rap/generator/workspace/source/main');
    });

    it('should have correct HTTP methods', () => {
      const generator = adtContract.rap.generator;

      expect(generator.list().method).toBe('GET');
      expect(generator.get('w').method).toBe('GET');
      expect(generator.create().method).toBe('POST');
      expect(generator.update('w').method).toBe('PUT');
      expect(generator.delete('w').method).toBe('DELETE');
      expect(generator.lock('w').method).toBe('POST');
      expect(generator.unlock('w', 'H').method).toBe('POST');
    });

    it('should have correct Accept headers', () => {
      const generator = adtContract.rap.generator;
      const headers = generator.list().headers?.Accept ?? '';

      expect(headers).toContain('application/vnd.sap.adt.rap.generator');
    });

    it('should have correct Content-Type headers for write operations', () => {
      const generator = adtContract.rap.generator;
      const contentType = generator.create().headers?.['Content-Type'] ?? '';

      expect(contentType).toContain('application/vnd.sap.adt.rap.generator');
    });

    it('should have correct query parameters for lock/unlock', () => {
      const generator = adtContract.rap.generator;

      expect(generator.lock('w').query?._action).toBe('LOCK');
      expect(generator.lock('w').query?.accessMode).toBe('MODIFY');
      expect(generator.unlock('w', 'H').query?._action).toBe('UNLOCK');
      expect(generator.unlock('w', 'H').query?.lockHandle).toBe('H');
    });

    it('should support corrNr query parameter', () => {
      const generator = adtContract.rap.generator;

      expect(generator.create({ corrNr: 'DEV1' }).query?.corrNr).toBe('DEV1');
      expect(generator.update('w', { corrNr: 'DEV1' }).query?.corrNr).toBe(
        'DEV1',
      );
    });
  });

  describe('RAP Contract Structure', () => {
    it('should export all three RAP contracts', () => {
      expect(adtContract.rap.behavdeft).toBeDefined();
      expect(adtContract.rap.ddls).toBeDefined();
      expect(adtContract.rap.generator).toBeDefined();
    });

    it('should have bodySchema for BDEF and DDLS', () => {
      expect(adtContract.rap.behavdeft.bodySchema).toBeDefined();
      expect(adtContract.rap.ddls.bodySchema).toBeDefined();
    });
  });
});
