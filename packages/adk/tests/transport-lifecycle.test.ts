import { describe, expect, it, vi } from 'vitest';
import type { AdtClient } from '@abapify/adt-client';
import { AdkTransportRequest } from '../src/objects/cts/transport/transport';

interface TransportState {
  owner: string;
  status: string;
}

interface LifecycleFixtureOptions {
  releaseSucceeds?: boolean;
  releaseThrows?: string;
  applyReassign?: boolean;
  applyAddTask?: boolean;
  addTaskNumber?: string;
  rootStatus?: string;
  parsedTaskRootName?: string;
}

function requestResponse(
  number: string,
  state: TransportState,
  tasks: Array<{ number: string; owner: string; status: string }> = [],
) {
  return {
    root: {
      object_type: 'K',
      name: number,
      type: 'RQRQ',
      request: {
        number,
        owner: state.owner,
        status: state.status,
        status_text: state.status === 'R' ? 'Released' : 'Modifiable',
        task: tasks,
      },
    },
  };
}

function taskResponse(
  number: string,
  parent: string,
  state: TransportState,
  parsedRootName = number,
) {
  return {
    root: {
      object_type: 'T',
      name: parsedRootName,
      type: 'RQTQ',
      request: { number: parent },
      task: [
        {
          number,
          parent,
          owner: state.owner,
          status: state.status,
          status_text: state.status === 'R' ? 'Released' : 'Modifiable',
        },
      ],
    },
  };
}

function createLifecycleFixture(options: LifecycleFixtureOptions = {}) {
  const rootNumber = 'DEVK900001';
  const taskDefinitions = [
    { number: 'DEVK900002', owner: 'OLDUSER', status: 'D' },
    { number: 'DEVK900003', owner: 'OLDUSER', status: 'R' },
    { number: 'DEVK900004', owner: 'OLDUSER', status: 'N' },
  ];
  const states = new Map<string, TransportState>([
    [rootNumber, { owner: 'OLDUSER', status: options.rootStatus ?? 'D' }],
    ...taskDefinitions.map(
      (task) =>
        [task.number, { owner: task.owner, status: task.status }] as const,
    ),
  ]);

  const get = vi.fn(async (number: string) => {
    const state = states.get(number);
    if (!state) throw new Error(`Unexpected transport ${number}`);
    return number === rootNumber
      ? requestResponse(rootNumber, state, taskDefinitions)
      : taskResponse(number, rootNumber, state, options.parsedTaskRootName);
  });
  const release = vi.fn(async (number: string) => {
    // newreleasejobs POST: on success, transition status D -> R.
    // The PR's release() calls client.fetch(`${objectUri}/newreleasejobs`, ...).
    if (options.releaseThrows) throw new Error(options.releaseThrows);
    if (options.releaseSucceeds !== false) {
      const state = states.get(number);
      if (state && state.status !== 'R') state.status = 'R';
    }
    return { ok: true, status: 200, text: async () => '' };
  });
  const fetchFn = vi.fn(
    async (url: string, requestInit?: { method?: string }) => {
      if (url.endsWith('/newreleasejobs') && requestInit?.method === 'POST') {
        return release(url.split('/').slice(-2, -1)[0]);
      }
      throw new Error(
        `Unexpected fetch ${requestInit?.method ?? 'GET'} ${url}`,
      );
    },
  );
  const reassign = vi.fn(
    async (
      number: string,
      _options: { targetUser: string; recursive?: boolean },
      body: { root: { targetuser: string } },
    ) => {
      if (options.applyReassign !== false) {
        const state = states.get(number);
        if (state) state.owner = body.root.targetuser;
      }
      return requestResponse(
        rootNumber,
        states.get(rootNumber)!,
        taskDefinitions,
      );
    },
  );
  const addTask = vi.fn(
    async (
      _number: string,
      _options: { owner: string },
      body: { root: { targetuser: string } },
    ) => {
      if (options.applyAddTask !== false) {
        const created = {
          number: 'DEVK900005',
          owner: body.root.targetuser,
          status: 'D',
        };
        taskDefinitions.push(created);
        states.set(created.number, {
          owner: created.owner,
          status: created.status,
        });
      }
      return {
        root: {
          targetuser: body.root.targetuser,
          useraction: 'tasks',
          number:
            options.addTaskNumber === ''
              ? undefined
              : (options.addTaskNumber ?? 'DEVK900005'),
        },
      };
    },
  );

  const client = {
    fetch: fetchFn,
    adt: {
      cts: {
        transportrequests: {
          get,
          useraction: { reassign, addTask },
        },
      },
    },
  } as unknown as AdtClient;

  return {
    client,
    get,
    fetch: fetchFn,
    release,
    reassign,
    addTask,
    states,
    rootNumber,
  };
}

describe('AdkTransportRequest CTS lifecycle', () => {
  it('prefers the child task number over a parsed parent root name', async () => {
    const fixture = createLifecycleFixture({
      parsedTaskRootName: 'DEVK900001',
    });

    const task = await AdkTransportRequest.get('DEVK900002', {
      client: fixture.client,
    });

    expect(task.number).toBe('DEVK900002');
    await expect(task.release()).resolves.toEqual({ success: true });
    expect(fixture.fetch).toHaveBeenCalledWith(
      '/sap/bc/adt/cts/transportrequests/DEVK900002/newreleasejobs',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('updates cached release state only after a released read-back', async () => {
    const fixture = createLifecycleFixture();
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    const result = await transport.release();

    expect(result).toEqual({ success: true });
    expect(fixture.fetch).toHaveBeenCalledWith(
      `/sap/bc/adt/cts/transportrequests/${fixture.rootNumber}/newreleasejobs`,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fixture.get).toHaveBeenCalledTimes(2);
    expect(transport.status).toBe('R');
    expect(transport.statusText).toBe('Released');
  });

  it('fails release when SAP does not transition to released status', async () => {
    const fixture = createLifecycleFixture({ releaseSucceeds: false });
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    const result = await transport.release();

    expect(result.success).toBe(false);
    expect(result.message).toContain('SAP did not release');
    expect(result.message).toContain('Modifiable');
    expect(transport.status).toBe('D');
  });

  it('reports release failure when reload fails after a successful POST', async () => {
    const fixture = createLifecycleFixture();
    // First get() is the static factory call; the second is this.load() after
    // the release POST. Reject that second call to simulate a reload failure.
    fixture.get.mockResolvedValueOnce(
      requestResponse(
        fixture.rootNumber,
        fixture.states.get(fixture.rootNumber)!,
        [
          { number: 'DEVK900002', owner: 'OLDUSER', status: 'D' },
          { number: 'DEVK900003', owner: 'OLDUSER', status: 'R' },
          { number: 'DEVK900004', owner: 'OLDUSER', status: 'N' },
        ],
      ),
    );
    fixture.get.mockRejectedValueOnce(new Error('Network error during reload'));
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    const result = await transport.release();

    expect(result.success).toBe(false);
    expect(result.message).toContain(
      'Released DEVK900001 but failed to verify',
    );
    expect(result.message).toContain('Network error during reload');
  });

  it('rejects a change-owner response when read-back still has the old owner', async () => {
    const fixture = createLifecycleFixture({ applyReassign: false });
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    await expect(transport.reassign('NEWUSER')).rejects.toThrow(
      'owner verification failed',
    );
    expect(transport.owner).toBe('OLDUSER');
    expect(fixture.get).toHaveBeenCalledTimes(2);
  });

  it('recursively reassigns only modifiable tasks and verifies each owner', async () => {
    const fixture = createLifecycleFixture();
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    await transport.reassign('NEWUSER', true);

    expect(fixture.reassign.mock.calls.map(([number]) => number)).toEqual([
      'DEVK900001',
      'DEVK900002',
    ]);
    expect(fixture.states.get('DEVK900001')?.owner).toBe('NEWUSER');
    expect(fixture.states.get('DEVK900002')?.owner).toBe('NEWUSER');
    expect(fixture.states.get('DEVK900003')?.owner).toBe('OLDUSER');
    expect(fixture.states.get('DEVK900004')?.owner).toBe('OLDUSER');
    expect(transport.owner).toBe('NEWUSER');
  });

  it('creates a task and returns it only after parent read-back verification', async () => {
    const fixture = createLifecycleFixture();
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    const created = await transport.addTask('NEWUSER');

    expect(created.number).toBe('DEVK900005');
    expect(created.owner).toBe('NEWUSER');
    expect(created.status).toBe('D');
    expect(fixture.addTask).toHaveBeenCalledWith(
      fixture.rootNumber,
      { owner: 'NEWUSER' },
      { root: { targetuser: 'NEWUSER' } },
    );
    expect(fixture.get).toHaveBeenCalledTimes(2);
    expect(transport.tasks.map((task) => task.number)).toContain('DEVK900005');

    await expect(transport.releaseAll()).resolves.toEqual({ success: true });
    expect(fixture.fetch.mock.calls.map(([url]) => url).join('\n')).toContain(
      '/sap/bc/adt/cts/transportrequests/DEVK900005/newreleasejobs',
    );
  });

  it('rejects task creation when SAP read-back has no matching new task', async () => {
    const fixture = createLifecycleFixture({ applyAddTask: false });
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    await expect(transport.addTask('NEWUSER')).rejects.toThrow(
      'no new task owned by NEWUSER',
    );
  });

  it('rejects creating a child under a transport task', async () => {
    const fixture = createLifecycleFixture();
    const task = await AdkTransportRequest.get('DEVK900002', {
      client: fixture.client,
    });

    await expect(task.addTask('NEWUSER')).rejects.toThrow(
      'is a task, not a request',
    );
    expect(fixture.addTask).not.toHaveBeenCalled();
  });

  it('rejects task creation for a non-modifiable request', async () => {
    const fixture = createLifecycleFixture({ rootStatus: 'N' });
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    await expect(transport.addTask('NEWUSER')).rejects.toThrow(
      'expected status D, found N',
    );
    expect(fixture.addTask).not.toHaveBeenCalled();
  });

  it('requires SAP to return the created task number', async () => {
    const fixture = createLifecycleFixture({ addTaskNumber: '' });
    const transport = await AdkTransportRequest.get(fixture.rootNumber, {
      client: fixture.client,
    });

    await expect(transport.addTask('NEWUSER')).rejects.toThrow(
      'SAP response did not contain a task number',
    );
    expect(fixture.get).toHaveBeenCalledTimes(1);
  });
});
