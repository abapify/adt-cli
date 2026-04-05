/**
 * RAP Contracts Tests
 *
 * Tests RAP (RESTful ABAP Programming) contracts.
 *
 * Contract definition tests always run.
 * Integration tests require ADT_SERVICE_KEY environment variable to be set.
 * If ADT_SERVICE_KEY is not set, integration tests are skipped.
 */

import { describe, it, expect } from 'vitest';
import { rapContract } from '../../src/adt/rap';

let hasServiceKey = false;
try {
  const raw = process.env['ADT_SERVICE_KEY'];
  hasServiceKey = !!raw?.trim();
} catch {
  hasServiceKey = false;
}

const integration = hasServiceKey ? describe : describe.skip;

integration('RAP Integration Tests', () => {
  it('should verify integration tests are enabled when ADT_SERVICE_KEY is set', () => {
    expect(hasServiceKey).toBe(true);
  });
});

describe('RAP Contract Definitions', () => {
  describe('Behaviour Definitions Contract', () => {
    it('should have correct get path', () => {
      const contract = rapContract.behaviourDefinitions.get('ZBDEF_TEST');
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours/zbdef_test');
      expect(contract.method).toBe('GET');
    });

    it('should have correct post path', () => {
      const contract = rapContract.behaviourDefinitions.post();
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours');
      expect(contract.method).toBe('POST');
    });

    it('should have correct put path', () => {
      const contract = rapContract.behaviourDefinitions.put('ZBDEF_TEST');
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours/zbdef_test');
      expect(contract.method).toBe('PUT');
    });

    it('should have correct delete path', () => {
      const contract = rapContract.behaviourDefinitions.delete('ZBDEF_TEST');
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours/zbdef_test');
      expect(contract.method).toBe('DELETE');
    });

    it('should have correct source get path', () => {
      const contract =
        rapContract.behaviourDefinitions.source.get('ZBDEF_TEST');
      expect(contract.path).toBe(
        '/sap/bc/adt/rap/behaviours/zbdef_test/source/main',
      );
      expect(contract.method).toBe('GET');
    });

    it('should have correct source put path', () => {
      const contract =
        rapContract.behaviourDefinitions.source.put('ZBDEF_TEST');
      expect(contract.path).toBe(
        '/sap/bc/adt/rap/behaviours/zbdef_test/source/main',
      );
      expect(contract.method).toBe('PUT');
    });

    it('should have correct lock path', () => {
      const contract = rapContract.behaviourDefinitions.lock('ZBDEF_TEST');
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours/zbdef_test');
      expect(contract.method).toBe('POST');
    });

    it('should have correct unlock path', () => {
      const contract = rapContract.behaviourDefinitions.unlock('ZBDEF_TEST', {
        lockHandle: 'HANDLE123',
      });
      expect(contract.path).toBe('/sap/bc/adt/rap/behaviours/zbdef_test');
      expect(contract.method).toBe('POST');
    });
  });

  describe('DDLS Contract', () => {
    it('should have correct get path', () => {
      const contract = rapContract.ddls.get('ZDDLS_TEST');
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test');
      expect(contract.method).toBe('GET');
    });

    it('should have correct post path', () => {
      const contract = rapContract.ddls.post();
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls');
      expect(contract.method).toBe('POST');
    });

    it('should have correct put path', () => {
      const contract = rapContract.ddls.put('ZDDLS_TEST');
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test');
      expect(contract.method).toBe('PUT');
    });

    it('should have correct delete path', () => {
      const contract = rapContract.ddls.delete('ZDDLS_TEST');
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test');
      expect(contract.method).toBe('DELETE');
    });

    it('should have correct source get path', () => {
      const contract = rapContract.ddls.source.get('ZDDLS_TEST');
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test/source/main');
      expect(contract.method).toBe('GET');
    });

    it('should have correct source put path with corrNr', () => {
      const contract = rapContract.ddls.source.put('ZDDLS_TEST', {
        corrNr: 'DEVK900001',
      });
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test/source/main');
      expect(contract.method).toBe('PUT');
    });

    it('should have correct parent path', () => {
      const contract = rapContract.ddls.parent.get('ZDDLS_TEST');
      expect(contract.path).toBe('/sap/bc/adt/ddl/ddls/zddls_test/parent');
      expect(contract.method).toBe('GET');
    });
  });

  describe('RAP Generator Contract', () => {
    it('should have correct getWorkspace path', () => {
      const contract = rapContract.rapGenerator.getWorkspace();
      expect(contract.path).toBe('/sap/bc/adt/rap/generator');
      expect(contract.method).toBe('GET');
    });

    it('should have correct create path', () => {
      const contract = rapContract.rapGenerator.create();
      expect(contract.path).toBe('/sap/bc/adt/rap/generator');
      expect(contract.method).toBe('POST');
    });

    it('should have correct create path with corrNr', () => {
      const contract = rapContract.rapGenerator.create({
        corrNr: 'DEVK900001',
      });
      expect(contract.path).toBe('/sap/bc/adt/rap/generator');
      expect(contract.method).toBe('POST');
    });

    it('should have correct delete path', () => {
      const contract = rapContract.rapGenerator.delete('ZWORKSPACE');
      expect(contract.path).toBe('/sap/bc/adt/rap/generator/zworkspace');
      expect(contract.method).toBe('DELETE');
    });

    it('should have correct getTemplate path', () => {
      const contract = rapContract.rapGenerator.getTemplate('TEMPLATE1');
      expect(contract.path).toBe(
        '/sap/bc/adt/rap/generator/templates/TEMPLATE1',
      );
      expect(contract.method).toBe('GET');
    });

    it('should have correct listTemplates path', () => {
      const contract = rapContract.rapGenerator.listTemplates();
      expect(contract.path).toBe('/sap/bc/adt/rap/generator/templates');
      expect(contract.method).toBe('GET');
    });

    it('should have correct generate path', () => {
      const contract = rapContract.rapGenerator.generate('TEMPLATE1');
      expect(contract.path).toBe(
        '/sap/bc/adt/rap/generator/templates/TEMPLATE1/generate',
      );
      expect(contract.method).toBe('POST');
    });
  });
});
