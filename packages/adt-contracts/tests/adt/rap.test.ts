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
import { behaviourdefinition, ddls, rapgenerator } from '../../src/schemas';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixturesDir = resolve(__dirname, 'fixtures/rap');

function loadFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), 'utf-8');
}

let hasServiceKey = false;
try {
  const raw = process.env['ADT_SERVICE_KEY'];
  hasServiceKey = !!raw?.trim();
} catch {
  hasServiceKey = false;
}

const integration = hasServiceKey ? describe : describe.skip;

describe('RAP Schema Fixture Parsing', () => {
  describe('Behaviour Definition Schema', () => {
    it('should parse behaviour definition fixture', () => {
      const xml = loadFixture('behaviourdefinition.xml');
      const parsed = behaviourdefinition.parse(xml);
      expect(parsed).toBeDefined();
      expect(parsed.adtcore?.name).toBe('ZBDEMO_BEHAVIOR');
      expect(parsed.$baseType).toBe('ZBDEMO');
      expect(parsed.$implementationClass).toBe('ZCL_BD_ZBDEMO_BEHAVIOR');
      expect(parsed.$draftEnabled).toBe('true');
      expect(parsed.behaviorDef?.define?.$for).toBe('ZBDEMO');
    });

    it('should parse behaviour definition define section', () => {
      const xml = loadFixture('behaviourdefinition.xml');
      const parsed = behaviourdefinition.parse(xml);
      expect(parsed.behaviorDef?.define?.class?.$entity).toBe('ZBDEMO');
      expect(parsed.behaviorDef?.define?.association).toHaveLength(1);
      expect(parsed.behaviorDef?.define?.association?.[0].$name).toBe('Items');
      expect(parsed.behaviorDef?.define?.action).toHaveLength(1);
      expect(parsed.behaviorDef?.define?.action?.[0].$name).toBe(
        'CalculateTotal',
      );
      expect(parsed.behaviorDef?.define?.validation).toHaveLength(1);
      expect(parsed.behaviorDef?.define?.validation?.[0].$name).toBe(
        'ValidateData',
      );
    });
  });

  describe('DDLS Schema', () => {
    it('should parse DDLS fixture', () => {
      const xml = loadFixture('ddls.xml');
      const parsed = ddls.parse(xml);
      expect(parsed).toBeDefined();
      expect(parsed.adtcore?.name).toBe('ZBDEMO_VIEW');
      expect(parsed.$ddlType).toBe('VIEW_ENTITY');
      expect(parsed.$draftEnabled).toBe('true');
      expect(parsed.$root).toBe('true');
      expect(parsed.$entityType).toBe('ZBDEMO_VIEW');
    });

    it('should parse DDLS entity definition', () => {
      const xml = loadFixture('ddls.xml');
      const parsed = ddls.parse(xml);
      expect(parsed.ddlSource?.define?.entity?.$name).toBe('ZBDEMO_VIEW');
      expect(parsed.ddlSource?.define?.entity?.draft?.$table).toBe(
        'ZBDEMO_DRAFT',
      );
      expect(parsed.ddlSource?.define?.entity?.draft?.$enable).toBe('true');
      expect(parsed.ddlSource?.define?.entity?.element).toHaveLength(5);
      expect(parsed.ddlSource?.define?.entity?.key?.element).toContain('ID');
    });

    it('should parse DDLS element attributes', () => {
      const xml = loadFixture('ddls.xml');
      const parsed = ddls.parse(xml);
      const elements = parsed.ddlSource?.define?.entity?.element;
      const idElement = elements?.find((e) => e.$name === 'ID');
      expect(idElement?.$type).toBe('SYSUUID');
      expect(idElement?.$key).toBe('true');
      expect(idElement?.$notNull).toBe('true');
    });
  });

  describe('RAP Generator Schema', () => {
    it('should parse RAP generator fixture', () => {
      const xml = loadFixture('rapgenerator.xml');
      const parsed = rapgenerator.parse(xml);
      expect(parsed).toBeDefined();
      expect(parsed.adtcore?.name).toBe('RAP Generator');
      expect(parsed.$workspaceId).toBe('WORKSPACE_001');
      expect(parsed.$templateId).toBe('BUSINESS_OBJECT');
      expect(parsed.$status).toBe('NEW');
    });

    it('should parse RAP generator templates', () => {
      const xml = loadFixture('rapgenerator.xml');
      const parsed = rapgenerator.parse(xml);
      const templates = parsed.workspaceContent?.templates?.template;
      expect(templates).toHaveLength(2);
      expect(templates?.[0].$templateId).toBe('BUSINESS_OBJECT');
      expect(templates?.[0].$templateType).toBe('BUSINESS_OBJECT');
      expect(templates?.[1].$templateId).toBe('CONSUMPTION_VIEW');
    });

    it('should parse RAP generator wizard steps', () => {
      const xml = loadFixture('rapgenerator.xml');
      const parsed = rapgenerator.parse(xml);
      const template = parsed.workspaceContent?.templates?.template?.[0];
      const wizardSteps = template?.templateContent?.wizardStep;
      expect(wizardSteps).toHaveLength(3);
      expect(wizardSteps?.[0].$stepId).toBe('step1');
      expect(wizardSteps?.[0].$title).toBe('Basic Information');
      expect(wizardSteps?.[1].$stepId).toBe('step2');
      expect(wizardSteps?.[2].$stepId).toBe('step3');
    });

    it('should parse RAP generator fields', () => {
      const xml = loadFixture('rapgenerator.xml');
      const parsed = rapgenerator.parse(xml);
      const template = parsed.workspaceContent?.templates?.template?.[0];
      const fields = template?.templateContent?.wizardStep?.[0].field;
      expect(fields).toHaveLength(3);
      expect(fields?.[0].$name).toBe('objectName');
      expect(fields?.[0].$type).toBe('TEXT');
      expect(fields?.[0].$mandatory).toBe('true');
      expect(fields?.[0].$maxLength).toBe(30);
    });
  });
});

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

    it('should use behaviourdefinition schema for responses', () => {
      const contract = rapContract.behaviourDefinitions.get('ZBDEF_TEST');
      expect(contract.responses).toBeDefined();
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

    it('should use ddls schema for responses', () => {
      const contract = rapContract.ddls.get('ZDDLS_TEST');
      expect(contract.responses).toBeDefined();
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

    it('should use rapgenerator schema for responses', () => {
      const contract = rapContract.rapGenerator.getWorkspace();
      expect(contract.responses).toBeDefined();
    });
  });
});
