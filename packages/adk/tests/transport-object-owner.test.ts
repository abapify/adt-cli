import { describe, expect, it } from 'vitest';
import { resolveClassComponentOwnerName } from '../src/objects/cts/transport-object-owner';

describe('resolveClassComponentOwnerName', () => {
  it.each([
    {
      type: 'CPRI',
      wbtype: 'CLAS/OSI',
      name: 'ZCL_VIM_DI3_UTILS',
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: `${'ZCL_VIM_DI3_UTILS'.padEnd(30)}CCIMP`,
      owner: 'ZCL_VIM_DI3_UTILS',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: 'ZCL_VIM_DI3_WF_BO=============CCIMP',
      owner: 'ZCL_VIM_DI3_WF_BO',
    },
    {
      type: 'CINC',
      wbtype: 'CLAS/OCN',
      name: `${'Z'.repeat(30)}CCIMP`,
      owner: 'Z'.repeat(30),
    },
  ])(
    'resolves URI-less $type/$wbtype owner from CTS identity',
    ({ type, wbtype, name, owner }) => {
      expect(
        resolveClassComponentOwnerName({
          pgmid: 'LIMU',
          type,
          wbtype,
          name,
        }),
      ).toBe(owner);
    },
  );

  it('normalizes interleaved equals and JavaScript whitespace in the 30-character CINC owner field', () => {
    const owner = 'ZCL_VIM_DI3_WF_BO';
    const ownerField = `${owner}${'= \t=\u2003  '.repeat(3)}`.slice(0, 30);

    expect(ownerField).toHaveLength(30);
    expect(
      resolveClassComponentOwnerName({
        pgmid: 'LIMU',
        type: 'CINC',
        wbtype: 'CLAS/OCN',
        name: `${ownerField}CCIMP`,
      }),
    ).toBe(owner);
  });

  it.each(['', `${'= \t\u2003'.repeat(10)}CCIMP`])(
    'returns undefined for an empty or all-padding CINC owner field (%s)',
    (name) => {
      expect(
        resolveClassComponentOwnerName({
          pgmid: 'LIMU',
          type: 'CINC',
          wbtype: 'CLAS/OCN',
          name,
        }),
      ).toBeUndefined();
    },
  );

  it('rejects a CINC workbench subtype that conflicts with its CTS type', () => {
    expect(
      resolveClassComponentOwnerName({
        pgmid: 'LIMU',
        type: 'CINC',
        wbtype: 'CLAS/OSI',
        name: `${'ZCL_VIM_DI3_UTILS'.padEnd(30)}CCIMP`,
      }),
    ).toBeUndefined();
  });
});
