/**
 * AdkTransport Integration Tests
 *
 * Tests the new simplified transport import functionality:
 * - AdkTransport.get() - Load transport by number
 * - transport.objects - Iterate transport objects
 * - objRef.load() - Load individual ADK objects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the ADT client
// Response must have 'root' wrapper to match TransportmanagmentSingleSchema
const mockTransportResponse = {
  root: {
    object_type: 'K',
    name: 'DEVK900001',
    type: 'RQRQ',
    request: {
      number: 'DEVK900001',
      parent: '',
      owner: 'DEVELOPER',
      desc: 'Test workbench request',
      type: 'K',
      status: 'D',
      status_text: 'Modifiable',
      target: 'PRD',
      target_desc: 'Production System',
      source_client: '100',
      uri: '/sap/bc/adt/cts/transportrequests/DEVK900001',
      task: [
        {
          number: 'DEVK900002',
          parent: 'DEVK900001',
          owner: 'DEVELOPER',
          desc: 'Development task',
          type: 'S',
          status: 'D',
          status_text: 'Modifiable',
          abap_object: [
            {
              pgmid: 'R3TR',
              type: 'CLAS',
              name: 'ZCL_TEST_CLASS',
              wbtype: 'CLAS',
              uri: '/sap/bc/adt/oo/classes/zcl_test_class',
              obj_desc: 'Test Class',
            },
            {
              pgmid: 'R3TR',
              type: 'FUGR',
              name: 'ZTEST_FUNCTION_GROUP',
              wbtype: 'FUGR',
              uri: '/sap/bc/adt/functions/groups/ztest_function_group',
              obj_desc: 'Test Function Group',
            },
          ],
        },
        {
          number: 'DEVK900003',
          parent: 'DEVK900001',
          owner: 'DEVELOPER2',
          desc: 'Second developer task',
          type: 'S',
          status: 'R',
          status_text: 'Released',
          abap_object: {
            pgmid: 'R3TR',
            type: 'PROG',
            name: 'ZTEST_REPORT',
            wbtype: 'PROG',
            uri: '/sap/bc/adt/programs/programs/ztest_report',
            obj_desc: 'Test Report',
          },
        },
      ],
    },
  }, // close root
};

// Create mock client
function createMockClient() {
  return {
    adt: {
      cts: {
        transportrequests: {
          get: vi.fn().mockResolvedValue(mockTransportResponse),
        },
      },
    },
  };
}

describe('AdkTransport', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('AdkTransport.get()', () => {
    it('should load transport by number', async () => {
      const mockClient = createMockClient();

      // Import and initialize ADK with mock client
      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');

      expect(transport).toBeDefined();
      expect(transport.number).toBe('DEVK900001');
      expect(transport.description).toBe('Test workbench request');
      expect(transport.owner).toBe('DEVELOPER');
      expect(transport.status).toBe('D');
      expect(transport.statusText).toBe('Modifiable');
    });

    it('should expose transport properties', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');

      expect(transport.target).toBe('PRD');
      expect(transport.objectType).toBe('K');
    });
  });

  describe('transport.objects', () => {
    it('should collect all objects from all tasks', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');
      const objects = transport.objects;

      // Should have 3 objects total (2 from task 1, 1 from task 2)
      expect(objects).toHaveLength(3);
    });

    it('should expose object properties', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');
      const objects = transport.objects;

      const classObj = objects.find((o) => o.type === 'CLAS');
      expect(classObj).toBeDefined();
      expect(classObj?.name).toBe('ZCL_TEST_CLASS');
      expect(classObj?.pgmid).toBe('R3TR');
      expect(classObj?.uri).toBe('/sap/bc/adt/oo/classes/zcl_test_class');
    });
  });

  describe('transport.tasks', () => {
    it('should expose tasks with their objects', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');
      const tasks = transport.tasks;

      expect(tasks).toHaveLength(2);

      const task1 = tasks.find((t) => t.number === 'DEVK900002');
      expect(task1).toBeDefined();
      expect(task1?.owner).toBe('DEVELOPER');
      expect(task1?.objects).toHaveLength(2);

      const task2 = tasks.find((t) => t.number === 'DEVK900003');
      expect(task2).toBeDefined();
      expect(task2?.owner).toBe('DEVELOPER2');
      expect(task2?.objects).toHaveLength(1);
    });
  });

  describe('transport.getObjectsByType()', () => {
    it('should filter objects by type', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');

      const classes = transport.getObjectsByType('CLAS');
      expect(classes).toHaveLength(1);
      expect(classes[0].name).toBe('ZCL_TEST_CLASS');

      const programs = transport.getObjectsByType('PROG');
      expect(programs).toHaveLength(1);
      expect(programs[0].name).toBe('ZTEST_REPORT');
    });

    it('should filter by multiple types', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');

      const classesAndPrograms = transport.getObjectsByType('CLAS', 'PROG');
      expect(classesAndPrograms).toHaveLength(2);
    });
  });

  describe('transport.getObjectCountByType()', () => {
    it('should return object counts by type', async () => {
      const mockClient = createMockClient();

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');
      const counts = transport.getObjectCountByType();

      expect(counts).toEqual({
        CLAS: 1,
        FUGR: 1,
        PROG: 1,
      });
    });
  });

  describe('object deduplication', () => {
    it('should deduplicate objects across tasks', async () => {
      // Create mock with duplicate object
      const mockWithDuplicates = {
        root: {
          ...mockTransportResponse.root,
          request: {
            ...mockTransportResponse.root.request,
            task: [
              {
                number: 'DEVK900002',
                abap_object: [
                  { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_SHARED' },
                ],
              },
              {
                number: 'DEVK900003',
                abap_object: [
                  { pgmid: 'R3TR', type: 'CLAS', name: 'ZCL_SHARED' }, // Duplicate
                  { pgmid: 'R3TR', type: 'PROG', name: 'ZTEST' },
                ],
              },
            ],
          },
        },
      };

      const mockClient = {
        adt: {
          cts: {
            transportrequests: {
              get: vi.fn().mockResolvedValue(mockWithDuplicates),
            },
          },
        },
      };

      const { initializeAdk, AdkTransport } = await import('../src/index');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initializeAdk(mockClient as any);

      const transport = await AdkTransport.get('DEVK900001');
      const objects = transport.objects;

      // Should have 2 unique objects, not 3 (deduplication happens in collectObjects)
      expect(objects).toHaveLength(2);
    });
  });
});

describe('AdkTransportObjectRef', () => {
  it('should have correct type and name', async () => {
    const mockClient = createMockClient();

    const { initializeAdk, AdkTransport } = await import('../src/index');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initializeAdk(mockClient as any);

    const transport = await AdkTransport.get('DEVK900001');
    const objRef = transport.objects[0];

    expect(objRef.type).toBe('CLAS');
    expect(objRef.name).toBe('ZCL_TEST_CLASS');
    expect(objRef.pgmid).toBe('R3TR');
  });

  // Note: objRef.load() test would require mocking the ADK factory
  // which is more complex - skipping for now as it requires full ADK setup
});

describe('AdkTransportTaskRef', () => {
  it('should expose task properties', async () => {
    const mockClient = createMockClient();

    const { initializeAdk, AdkTransport } = await import('../src/index');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initializeAdk(mockClient as any);

    const transport = await AdkTransport.get('DEVK900001');
    const task = transport.tasks[0];

    expect(task.number).toBe('DEVK900002');
    expect(task.owner).toBe('DEVELOPER');
    expect(task.description).toBe('Development task');
    expect(task.status).toBe('D');
    expect(task.statusText).toBe('Modifiable');
  });

  it('should provide access to task objects', async () => {
    const mockClient = createMockClient();

    const { initializeAdk, AdkTransport } = await import('../src/index');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initializeAdk(mockClient as any);

    const transport = await AdkTransport.get('DEVK900001');
    const task = transport.tasks[0];

    expect(task.objects).toHaveLength(2);
    expect(task.objects[0].type).toBe('CLAS');
    expect(task.objects[1].type).toBe('FUGR');
  });
});
