import { expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import { Scenario, runScenario, type SchemaType } from './base/scenario';
import {
  transportmanagmentCreate,
  transportmanagmentSingle,
} from '../../src/schemas/index';

/**
 * Test for task response - when fetching a task by number:
 * - object_type="T" indicates this is a task
 * - tm:request contains the PARENT request (NO tasks inside!)
 * - tm:task at root level contains the task itself
 */
class TmTaskScenario extends Scenario<typeof transportmanagmentSingle> {
  readonly schema = transportmanagmentSingle;
  readonly fixtures = [fixtures.transport.singleTask];

  validateParsed(data: SchemaType<typeof transportmanagmentSingle>): void {
    // parse() now returns wrapped format: { elementName: content }
    const root = (data as any).root;
    expect(root).toBeDefined();

    // Root attributes - object_type="T" indicates task
    expect(root.object_type).toBe('T');
    expect(root.name).toBe('DEVK900002'); // Task number in root

    // Parent request is included (NO tasks inside when fetching a task!)
    expect(root.request).toBeDefined();
    expect(root.request?.number).toBe('DEVK900001'); // Parent request number
    // When fetching a task, parent request has no tasks (empty or undefined)
    expect(root.request?.task?.length ?? 0).toBe(0);

    // Task at root level
    expect(root.task).toBeDefined();
    expect(root.task).toHaveLength(1);
    expect(root.task?.[0].number).toBe('DEVK900002');
    expect(root.task?.[0].parent).toBe('DEVK900001');
    expect(root.task?.[0].abap_object).toHaveLength(1);
    expect(root.task?.[0].abap_object?.[0].name).toBe('ZCL_TEST_CLASS');
  }

  override validateBuilt(xml: string): void {
    // Attributes are output without namespace prefix
    expect(xml).toContain('object_type="T"');
    // Elements have namespace prefix
    expect(xml).toContain('<tm:request');
    expect(xml).toContain('<tm:task');
    // Both request and task should be at root level (siblings, not nested)
    // The built XML will have request first, then task - both direct children of root
  }
}

class TmCreateScenario extends Scenario<typeof transportmanagmentCreate> {
  readonly schema = transportmanagmentCreate;
  readonly fixtures = [fixtures.transport.create];

  validateParsed(data: SchemaType<typeof transportmanagmentCreate>): void {
    // parse() now returns wrapped format: { elementName: content }
    const root = (data as any).root;
    expect(root).toBeDefined();

    expect(root.useraction).toBe('newrequest');
    expect(root.request).toBeDefined();
    expect(root.request?.desc).toBe('Test transport description');
    expect(root.request?.type).toBe('K');
    expect(root.request?.target).toBe('LOCAL');
    expect(root.request?.task).toHaveLength(1);
    expect(root.request?.task?.[0].owner).toBe('TESTUSER');
  }

  override validateBuilt(xml: string): void {
    // Attributes are output without namespace prefix (standard XML behavior)
    expect(xml).toContain('useraction="newrequest"');
    expect(xml).toContain('desc=');
    expect(xml).toContain('type="K"');
    expect(xml).toContain('owner=');
  }
}

class TmFullScenario extends Scenario<typeof transportmanagmentSingle> {
  readonly schema = transportmanagmentSingle;
  readonly fixtures = [fixtures.transport.single];

  validateParsed(data: SchemaType<typeof transportmanagmentSingle>): void {
    // parse() now returns wrapped format: { elementName: content }
    const root = (data as any).root;
    expect(root).toBeDefined();

    // Root tm: attributes
    expect(root.object_type).toBe('K');

    // Root adtcore: attributes (inherited from AdtObject)
    expect(root.type).toBe('RQRQ');
    expect(root.name).toBe('DEVK900001');
    // changedAt is parsed as string (ISO format)
    expect(root.changedAt).toBe('2025-11-29T19:31:44Z');
    expect(root.changedBy).toBe('DEVELOPER');
    expect(root.createdBy).toBe('DEVELOPER');

    // Request attributes
    expect(root.request).toBeDefined();
    expect(root.request?.number).toBe('DEVK900001');
    expect(root.request?.owner).toBe('DEVELOPER');
    expect(root.request?.desc).toBe('Test workbench request');
    expect(root.request?.status).toBe('D');
    expect(root.request?.type).toBe('K');
    expect(root.request?.target).toBe('PRD');
    expect(root.request?.uri).toBe(
      '/sap/bc/adt/cts/transportrequests/DEVK900001',
    );

    // Long description
    expect(root.request?.long_desc).toContain('longer description');

    // Multiple tasks (array handling)
    expect(root.request?.task).toHaveLength(2);

    // Task 1: Modifiable, 2 objects
    expect(root.request?.task?.[0].number).toBe('DEVK900002');
    expect(root.request?.task?.[0].owner).toBe('DEVELOPER');
    expect(root.request?.task?.[0].status).toBe('D');
    expect(root.request?.task?.[0].abap_object).toHaveLength(2);
    expect(root.request?.task?.[0].abap_object?.[0].name).toBe(
      'ZCL_TEST_CLASS',
    );
    expect(root.request?.task?.[0].abap_object?.[1].name).toBe(
      'ZTEST_FUNCTION_GROUP',
    );

    // Task 2: Released, 1 object, different owner
    expect(root.request?.task?.[1].number).toBe('DEVK900003');
    expect(root.request?.task?.[1].owner).toBe('DEVELOPER2');
    expect(root.request?.task?.[1].status).toBe('R');
    expect(root.request?.task?.[1].abap_object).toHaveLength(1);
    expect(root.request?.task?.[1].abap_object?.[0].name).toBe('ZTEST_REPORT');
  }

  override validateBuilt(xml: string): void {
    // Root element with namespace
    expect(xml).toContain('xmlns:tm="http://www.sap.com/cts/adt/tm"');

    // Attributes are output without namespace prefix (standard XML behavior)
    expect(xml).toContain('object_type="K"');
    expect(xml).toContain('type="RQRQ"');
    expect(xml).toContain('name="DEVK900001"');
    expect(xml).toContain('changedBy="DEVELOPER"');

    // Request attributes (also without prefix)
    expect(xml).toContain('number="DEVK900001"');
    expect(xml).toContain('owner="DEVELOPER"');
    expect(xml).toContain('status="D"');

    // Nested elements (elements have prefix)
    expect(xml).toContain('<tm:task');
    expect(xml).toContain('<tm:abap_object');
    expect(xml).toContain('<tm:request');
  }
}

// Run all transport management scenarios
runScenario(new TmTaskScenario());
runScenario(new TmCreateScenario());
runScenario(new TmFullScenario());
