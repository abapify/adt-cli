import { describe, expect, it } from 'vitest';
import {
  normalizeCtsTransport,
  planCtsScope,
  type NormalizedCtsInventory,
} from './cts-normalization';
import type { Transport } from '@abapify/adt-client';

function releasedRequest(): Transport {
  return {
    number: 'DEVK900001',
    desc: 'Feature one',
    owner: 'PLENKOV',
    status: 'R',
    type: 'K',
    lastChangedTimestamp: '2026-11-12T10:00:00Z',
  };
}

describe('normalizeCtsTransport', () => {
  it('keeps a released task-less request as one request unit', () => {
    const normalized = normalizeCtsTransport(releasedRequest());
    expect(normalized.requestedTransport).toBe('DEVK900001');
    expect(normalized.units).toHaveLength(1);
    expect(normalized.units[0].kind).toBe('request');
    expect(normalized.request?.number).toBe('DEVK900001');
    expect(normalized.tasks).toEqual([]);
  });

  it('keeps missing metadata missing instead of inventing it', () => {
    const normalized = normalizeCtsTransport({ number: 'DEVK900002' });
    const unit = normalized.units[0];
    expect(unit).not.toHaveProperty('description');
    expect(unit).not.toHaveProperty('owner');
    expect(unit).not.toHaveProperty('lastChangedTimestamp');
  });

  it('retains unsupported raw fields with provenance instead of dropping them', () => {
    const raw = {
      ...releasedRequest(),
      ctsReleaseLock: 'X',
      customNote: 'operator note',
    } as Transport;
    const normalized = normalizeCtsTransport(raw);
    expect(normalized.units[0].unsupportedFields).toEqual([
      { field: 'ctsReleaseLock', value: 'X' },
      { field: 'customNote', value: 'operator note' },
    ]);
  });

  it('treats a target system as a known field, not an unsupported one', () => {
    const normalized = normalizeCtsTransport({
      ...releasedRequest(),
      target: 'P01',
    });
    expect(normalized.units[0]).toMatchObject({ target: 'P01' });
    expect(normalized.units[0].unsupportedFields).toEqual([]);
  });

  it('preserves task parent identity from a distinct task number', () => {
    const raw: Transport = {
      ...releasedRequest(),
      tasks: [
        {
          number: 'DEVK900002',
          desc: 'Implementation task',
          owner: 'DEV',
          parent: '',
        },
      ],
    };
    const normalized = normalizeCtsTransport(raw);
    expect(normalized.units).toHaveLength(2);
    expect(normalized.units[1].kind).toBe('task');
    expect(normalized.units[1].parent).toBe('DEVK900001');
    expect(normalized.units[1].number).toBe('DEVK900002');
    expect(normalized.request?.number).toBe('DEVK900001');
  });

  it('normalizes identifiers case-insensitively without mutating the input', () => {
    const raw = {
      number: 'devk900003',
      tasks: [{ number: 'devk900004', parent: 'Devk900003' }],
    } as Transport;
    const before = structuredClone(raw);
    const normalized = normalizeCtsTransport(raw);
    expect(normalized.requestedTransport).toBe('DEVK900003');
    expect(normalized.units[1].number).toBe('DEVK900004');
    expect(normalized.units[1].parent).toBe('DEVK900003');
    expect(raw).toEqual(before);
  });

  it('rejects a payload without a transport number', () => {
    expect(() => normalizeCtsTransport({} as Transport)).toThrow(
      /transport number is required/i,
    );
  });
});

describe('planCtsScope', () => {
  function normalized(
    number: string,
    tasks: string[] = [],
  ): NormalizedCtsInventory {
    return normalizeCtsTransport({
      number,
      tasks: tasks.map((task) => ({ number: task, parent: number })),
    });
  }

  function taskOnly(number: string, parent: string): NormalizedCtsInventory {
    return normalizeCtsTransport({ number, parent });
  }

  it('expands a requested request into its task scope', () => {
    const plan = planCtsScope([
      {
        transport: 'DEVK900001',
        normalized: normalized('DEVK900001', ['DEVK900002']),
      },
    ]);
    expect(plan.roots).toHaveLength(1);
    expect(plan.roots[0].transport).toBe('DEVK900001');
    expect(plan.roots[0].tasks).toEqual(['DEVK900002']);
    expect(plan.roots[0].requestedBy).toEqual(['DEVK900001']);
  });

  it('deduplicates repeated requests while keeping request provenance', () => {
    const plan = planCtsScope([
      { transport: 'DEVK900001', normalized: normalized('DEVK900001') },
      { transport: 'devk900001', normalized: normalized('devk900001') },
    ]);
    expect(plan.roots).toHaveLength(1);
    expect(plan.roots[0].requestedBy).toEqual(['DEVK900001', 'devk900001']);
    expect(plan.requestedCount).toBe(2);
  });

  it('rejects duplicate requests that carry conflicting task scopes', () => {
    expect(() =>
      planCtsScope([
        {
          transport: 'DEVK900001',
          normalized: normalized('DEVK900001', ['DEVK900002']),
        },
        {
          transport: 'devk900001',
          normalized: normalized('devk900001', ['DEVK900009']),
        },
      ]),
    ).toThrow(/conflicting normalized payloads/i);
  });

  it('records a requested task under its requested parent instead of a second root', () => {
    const parent = normalized('DEVK900001', ['DEVK900002']);
    const task = taskOnly('DEVK900002', 'DEVK900001');
    const plan = planCtsScope([
      { transport: 'DEVK900001', normalized: parent },
      { transport: 'DEVK900002', normalized: task },
    ]);
    expect(plan.roots).toHaveLength(1);
    expect(plan.roots[0].transport).toBe('DEVK900001');
    expect(plan.roots[0].tasks).toEqual(['DEVK900002']);
    expect(plan.roots[0].requestedBy).toEqual(['DEVK900001', 'DEVK900002']);
  });

  it('keeps a requested task whose parent is not requested as its own root', () => {
    const plan = planCtsScope([
      {
        transport: 'DEVK900002',
        normalized: taskOnly('DEVK900002', 'DEVK900001'),
      },
    ]);
    expect(plan.roots).toHaveLength(1);
    expect(plan.roots[0].transport).toBe('DEVK900002');
  });

  it('adds a folded task to the parent even when the parent payload omits it', () => {
    const parent = normalized('DEVK900001');
    const plan = planCtsScope([
      { transport: 'DEVK900001', normalized: parent },
      {
        transport: 'DEVK900002',
        normalized: taskOnly('DEVK900002', 'DEVK900001'),
      },
    ]);
    expect(plan.roots).toHaveLength(1);
    expect(plan.roots[0].tasks).toEqual(['DEVK900002']);
  });

  it('keeps the first requested position when folding a task root', () => {
    const plan = planCtsScope([
      {
        transport: 'DEVK900002',
        normalized: taskOnly('DEVK900002', 'DEVK900001'),
      },
      { transport: 'DEVK900010', normalized: normalized('DEVK900010') },
      { transport: 'DEVK900001', normalized: normalized('DEVK900001') },
    ]);
    expect(plan.roots.map((root) => root.transport)).toEqual([
      'DEVK900001',
      'DEVK900010',
    ]);
    expect(plan.roots[0].requestedBy).toEqual(['DEVK900002', 'DEVK900001']);
  });

  it('keeps the same transport in different systems as separate roots', () => {
    const plan = planCtsScope([
      {
        transport: 'DEVK900001',
        system: 'P01',
        normalized: normalized('DEVK900001'),
      },
      {
        transport: 'DEVK900001',
        system: 'Q01',
        normalized: normalized('DEVK900001'),
      },
    ]);
    expect(plan.roots).toHaveLength(2);
    expect(plan.roots.map((root) => root.system)).toEqual(['P01', 'Q01']);
    expect(plan.systems).toEqual(['P01', 'Q01']);
  });

  it('keeps mixed systems per system instead of merging across systems', () => {
    const plan = planCtsScope([
      {
        transport: 'DEVK900001',
        system: 'P01',
        normalized: normalized('DEVK900001'),
      },
      {
        transport: 'DEVK900010',
        system: 'Q01',
        normalized: normalized('DEVK900010'),
      },
    ]);
    expect(plan.systems).toEqual(['P01', 'Q01']);
    expect(plan.roots.map((root) => root.system)).toEqual(['P01', 'Q01']);
  });

  it('sorts root tasks deterministically regardless of payload order', () => {
    const first = planCtsScope([
      {
        transport: 'DEVK900001',
        normalized: normalized('DEVK900001', ['DEVK900005', 'DEVK900003']),
      },
    ]);
    const second = planCtsScope([
      {
        transport: 'DEVK900001',
        normalized: normalized('DEVK900001', ['DEVK900003', 'DEVK900005']),
      },
    ]);
    expect(first).toEqual(second);
    expect(first.roots[0].tasks).toEqual(['DEVK900003', 'DEVK900005']);
  });

  it('is deterministic for equivalent inputs regardless of case or duplicates', () => {
    const plain = planCtsScope([
      {
        transport: 'DEVK900001',
        normalized: normalized('DEVK900001', ['DEVK900005']),
      },
      { transport: 'DEVK900010', normalized: normalized('DEVK900010') },
    ]);
    const noisy = planCtsScope([
      {
        transport: 'devk900001',
        normalized: normalized('devk900001', ['devk900005']),
      },
      {
        transport: 'DEVK900001',
        normalized: normalized('DEVK900001', ['DEVK900005']),
      },
      { transport: 'devk900010', normalized: normalized('devk900010') },
    ]);
    expect(noisy.roots.map((root) => [root.transport, root.tasks])).toEqual(
      plain.roots.map((root) => [root.transport, root.tasks]),
    );
    const input = [
      { transport: 'DEVK900001', normalized: normalized('DEVK900001') },
    ];
    const before = structuredClone(input);
    planCtsScope(input);
    expect(input).toEqual(before);
  });

  it('rejects a payload paired with a different transport identifier', () => {
    expect(() =>
      planCtsScope([
        {
          transport: 'DEVK900001',
          normalized: normalized('DEVK900010'),
        },
      ]),
    ).toThrow(/does not match request/i);
  });

  it('yields an empty plan for an empty request list', () => {
    const plan = planCtsScope([]);
    expect(plan.roots).toEqual([]);
    expect(plan.systems).toEqual([]);
    expect(plan.requestedCount).toBe(0);
  });
});
