/**
 * Tests for abapgit-to-cds: DD02V/DD03P → CDS DDL builder
 *
 * Uses fixtures from @abapify/adt-fixtures (ddic/tabl)
 * to verify the reverse mapping produces valid CDS DDL.
 */

import { describe, it, expect } from 'vitest';
import { fixtures } from '@abapify/adt-fixtures';
import {
  buildCdsDdl,
  tablXmlToCdsDdl,
  parseTablXml,
  type DD02VData,
  type DD03PData,
} from '../src/lib/abapgit-to-cds';

// ============================================
// Fixture helpers
// ============================================

async function loadFixture(
  key: keyof typeof fixtures.ddic.tabl,
): Promise<string> {
  return fixtures.ddic.tabl[key].load();
}

/** Factory for DD02V with sensible defaults (structure) */
function dd02v(overrides?: Partial<DD02VData>): DD02VData {
  return { TABNAME: 'ZTEST', TABCLASS: 'INTTAB', ...overrides };
}

/** Factory for a single DD03P entry */
function dd03p(
  name: string,
  pos: string,
  overrides?: Partial<DD03PData>,
): DD03PData {
  return { FIELDNAME: name, POSITION: pos, ADMINFIELD: '0', ...overrides };
}

// ============================================
// Unit tests: buildCdsDdl
// ============================================

describe('buildCdsDdl', () => {
  describe('structure (INTTAB)', () => {
    it('should generate define structure for TABCLASS=INTTAB', () => {
      const result = buildCdsDdl(
        dd02v({
          TABNAME: 'ZTEST_STRUCT',
          DDTEXT: 'Test structure',
          EXCLASS: '4',
        }),
        [
          dd03p('FIELD1', '0001', {
            INTTYPE: 'C',
            INTLEN: '000020',
            DATATYPE: 'CHAR',
            LENG: '000010',
            MASK: '  CHAR',
          }),
        ],
      );
      expect(result).toContain('define structure ztest_struct');
      expect(result).toContain("@EndUserText.label : 'Test structure'");
      expect(result).toContain(
        '@AbapCatalog.enhancement.category : #EXTENSIBLE_ANY',
      );
      expect(result).not.toContain('@AbapCatalog.tableCategory');
      expect(result).toContain('field1 : abap.char(10)');
    });
  });

  describe('transparent table (TRANSP)', () => {
    it('should generate define table with table annotations', () => {
      const dd02v: DD02VData = {
        TABNAME: 'ZTEST_TABLE',
        TABCLASS: 'TRANSP',
        DDTEXT: 'Test table',
        CONTFLAG: 'A',
        EXCLASS: '1',
      };

      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'MANDT',
          POSITION: '0001',
          KEYFLAG: 'X',
          ROLLNAME: 'MANDT',
          ADMINFIELD: '0',
          NOTNULL: 'X',
          COMPTYPE: 'E',
        },
        {
          FIELDNAME: 'KEY_FIELD',
          POSITION: '0002',
          KEYFLAG: 'X',
          ADMINFIELD: '0',
          INTTYPE: 'C',
          INTLEN: '000020',
          DATATYPE: 'CHAR',
          LENG: '000010',
          NOTNULL: 'X',
          MASK: '  CHAR',
        },
        {
          FIELDNAME: 'VALUE_FIELD',
          POSITION: '0003',
          ADMINFIELD: '0',
          INTTYPE: 'C',
          INTLEN: '000080',
          DATATYPE: 'CHAR',
          LENG: '000040',
          MASK: '  CHAR',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('define table ztest_table');
      expect(result).toContain('@AbapCatalog.tableCategory : #TRANSPARENT');
      expect(result).toContain('@AbapCatalog.deliveryClass : #A');
      expect(result).toContain(
        '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
      );
      expect(result).toMatch(/key mandt\s+: mandt not null/);
      expect(result).toMatch(/key key_field\s+: abap\.char\(10\) not null/);
      expect(result).toMatch(/value_field\s+: abap\.char\(40\)/);
    });
  });

  describe('builtin types', () => {
    it('should map all fixed-length types without parameters', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('F_INT1', '0001', {
          DATATYPE: 'INT1',
          LENG: '000003',
          INTTYPE: 'X',
        }),
        dd03p('F_INT2', '0002', {
          DATATYPE: 'INT2',
          LENG: '000005',
          INTTYPE: 'X',
        }),
        dd03p('F_INT4', '0003', {
          DATATYPE: 'INT4',
          LENG: '000010',
          INTTYPE: 'X',
        }),
        dd03p('F_INT8', '0004', {
          DATATYPE: 'INT8',
          LENG: '000019',
          INTTYPE: '8',
        }),
        dd03p('F_DATS', '0005', {
          DATATYPE: 'DATS',
          LENG: '000008',
          INTTYPE: 'D',
        }),
        dd03p('F_TIMS', '0006', {
          DATATYPE: 'TIMS',
          LENG: '000006',
          INTTYPE: 'T',
        }),
        dd03p('F_FLTP', '0007', {
          DATATYPE: 'FLTP',
          LENG: '000016',
          DECIMALS: '000016',
          INTTYPE: 'F',
        }),
        dd03p('F_CLNT', '0008', {
          DATATYPE: 'CLNT',
          LENG: '000003',
          INTTYPE: 'C',
        }),
        dd03p('F_LANG', '0009', {
          DATATYPE: 'LANG',
          LENG: '000001',
          INTTYPE: 'C',
        }),
        dd03p('F_UTCL', '0010', {
          DATATYPE: 'UTCL',
          LENG: '000027',
          INTTYPE: 'p',
        }),
      ]);
      expect(result).toContain('f_int1 : abap.int1');
      expect(result).toContain('f_int2 : abap.int2');
      expect(result).toContain('f_int4 : abap.int4');
      expect(result).toContain('f_int8 : abap.int8');
      expect(result).toContain('f_dats : abap.dats');
      expect(result).toContain('f_tims : abap.tims');
      expect(result).toContain('f_fltp : abap.fltp');
      expect(result).toContain('f_clnt : abap.clnt');
      expect(result).toContain('f_lang : abap.lang');
      expect(result).toContain('f_utcl : abap.utclong');
    });

    it('should map types with length', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('F_CHAR', '0001', { DATATYPE: 'CHAR', LENG: '000010' }),
        dd03p('F_NUMC', '0002', { DATATYPE: 'NUMC', LENG: '000005' }),
        dd03p('F_RAW', '0003', { DATATYPE: 'RAW', LENG: '000016' }),
        dd03p('F_CUKY', '0004', { DATATYPE: 'CUKY', LENG: '000005' }),
        dd03p('F_UNIT', '0005', { DATATYPE: 'UNIT', LENG: '000002' }),
      ]);
      expect(result).toContain('f_char : abap.char(10)');
      expect(result).toContain('f_numc : abap.numc(5)');
      expect(result).toContain('f_raw  : abap.raw(16)');
      expect(result).toContain('f_cuky : abap.cuky');
      expect(result).toContain('f_unit : abap.unit(2)');
    });

    it('should map decimal types with length and decimals', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('F_DEC', '0001', {
          DATATYPE: 'DEC',
          LENG: '000015',
          DECIMALS: '000002',
        }),
        dd03p('F_CURR', '0002', {
          DATATYPE: 'CURR',
          LENG: '000015',
          DECIMALS: '000002',
          REFTABLE: 'ZTEST',
          REFFIELD: 'F_CUKY',
        }),
        dd03p('F_QUAN', '0003', {
          DATATYPE: 'QUAN',
          LENG: '000013',
          DECIMALS: '000003',
          REFTABLE: 'ZTEST',
          REFFIELD: 'F_UNIT',
        }),
        dd03p('F_CUKY', '0004', { DATATYPE: 'CUKY', LENG: '000005' }),
        dd03p('F_UNIT', '0005', { DATATYPE: 'UNIT', LENG: '000003' }),
      ]);
      expect(result).toContain('f_dec  : abap.dec(15,2)');
      expect(result).toContain('f_curr : abap.curr(15,2)');
      expect(result).toContain('f_quan : abap.quan(13,3)');
    });

    it('should map variable-length types (string, rawstring)', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('F_STRING', '0001', { DATATYPE: 'STRG' }),
        dd03p('F_RSTR', '0002', { DATATYPE: 'RSTR' }),
      ]);
      expect(result).toContain('f_string : abap.string(0)');
      expect(result).toContain('f_rstr   : abap.rawstring(0)');
    });
  });

  describe('data element references', () => {
    it('should emit data element name for COMPTYPE=E fields', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('COUNTRY_CODE', '0001', { ROLLNAME: 'LAND1', COMPTYPE: 'E' }),
        dd03p('LANGUAGE', '0002', { ROLLNAME: 'SPRAS', COMPTYPE: 'E' }),
      ]);
      expect(result).toContain('country_code : land1');
      expect(result).toContain('language     : spras');
    });
  });

  describe('currency/quantity annotations', () => {
    it('should emit @Semantics.amount.currencyCode for CURR fields', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('AMOUNT', '0001', {
          DATATYPE: 'CURR',
          LENG: '000015',
          DECIMALS: '000002',
          REFTABLE: 'ZTEST',
          REFFIELD: 'CURRENCY',
        }),
        dd03p('CURRENCY', '0002', { DATATYPE: 'CUKY', LENG: '000005' }),
      ]);
      expect(result).toContain(
        "@Semantics.amount.currencyCode : 'ztest.currency'",
      );
      expect(result).toContain('amount   : abap.curr(15,2)');
    });

    it('should emit @Semantics.quantity.unitOfMeasure for QUAN fields', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('QUANTITY', '0001', {
          DATATYPE: 'QUAN',
          LENG: '000013',
          DECIMALS: '000003',
          REFTABLE: 'ZTEST',
          REFFIELD: 'UOM',
        }),
        dd03p('UOM', '0002', { DATATYPE: 'UNIT', LENG: '000003' }),
      ]);
      expect(result).toContain(
        "@Semantics.quantity.unitOfMeasure : 'ztest.uom'",
      );
      expect(result).toContain('quantity : abap.quan(13,3)');
    });
  });

  describe('includes', () => {
    it('should emit include directive for .INCLUDE entries', () => {
      const result = buildCdsDdl(dd02v(), [
        dd03p('FIELD1', '0001', { DATATYPE: 'CHAR', LENG: '000010' }),
        dd03p('.INCLUDE', '0002', {
          PRECFIELD: 'ZOTHER_STRUCT',
          MASK: '      S',
          COMPTYPE: 'S',
        }),
        dd03p('.INCLU-_XX', '0003', {
          PRECFIELD: 'ZOTHER_STRUCT',
          MASK: '      S',
          COMPTYPE: 'S',
        }),
        dd03p('FIELD2', '0004', { DATATYPE: 'NUMC', LENG: '000005' }),
      ]);
      expect(result).toContain('field1 : abap.char(10)');
      expect(result).toContain('include zother_struct;');
      expect(result).toContain('field2 : abap.numc(5)');
      // Should NOT contain .INCLU-_XX as a separate line
      expect(result).not.toContain('inclu-');
    });
  });

  describe('key fields and not null', () => {
    it('should emit key keyword and not null for key fields', () => {
      const result = buildCdsDdl(dd02v({ TABCLASS: 'TRANSP', CONTFLAG: 'A' }), [
        dd03p('KEY1', '0001', {
          KEYFLAG: 'X',
          DATATYPE: 'CHAR',
          LENG: '000010',
          NOTNULL: 'X',
        }),
        dd03p('DATA1', '0002', { DATATYPE: 'CHAR', LENG: '000040' }),
      ]);
      expect(result).toMatch(/key key1\s+: abap\.char\(10\) not null/);
      expect(result).toMatch(/data1\s+: abap\.char\(40\)/);
      expect(result).not.toMatch(/data1\s+: abap\.char\(40\) not null/);
    });
  });

  describe('enhancement category mapping', () => {
    it.each([
      ['0', '#NOT_CLASSIFIED'],
      ['1', '#NOT_EXTENSIBLE'],
      ['2', '#EXTENSIBLE_CHARACTER_NUMERIC'],
      ['3', '#EXTENSIBLE_CHARACTER'],
      ['4', '#EXTENSIBLE_ANY'],
    ])('should map EXCLASS %s to %s', (exclass, expected) => {
      const result = buildCdsDdl(dd02v({ EXCLASS: exclass }), []);
      expect(result).toContain(
        `@AbapCatalog.enhancement.category : ${expected}`,
      );
    });
  });
});

// ============================================
// XML parsing tests
// ============================================

describe('parseTablXml', () => {
  it('should parse structure.tabl.xml', async () => {
    const xml = await loadFixture('structure');
    const { dd02v, dd03p } = parseTablXml(xml);

    expect(dd02v.TABNAME).toBe('ZAGE_STRUCTURE');
    expect(dd02v.TABCLASS).toBe('INTTAB');
    expect(dd02v.DDTEXT).toBe('Simple structure');
    expect(dd02v.EXCLASS).toBe('1');

    expect(dd03p).toBeInstanceOf(Array);
    expect(dd03p.length).toBeGreaterThan(0);

    // Check first field
    expect(dd03p[0].FIELDNAME).toBe('COMPONENT_TO_BE_CHANGED');
    expect(dd03p[0].DATATYPE).toBe('STRG');
  });

  it('should parse transparent.tabl.xml (transparent table)', async () => {
    const xml = await loadFixture('transparent');
    const { dd02v, dd03p } = parseTablXml(xml);

    expect(dd02v.TABNAME).toBe('ZAGE_TABL');
    expect(dd02v.TABCLASS).toBe('TRANSP');
    expect(dd02v.CONTFLAG).toBe('A');

    // Has key fields (CLIENT is the only field)
    const keyFields = dd03p.filter((f) => f.KEYFLAG === 'X');
    expect(keyFields.length).toBe(1);
    expect(keyFields[0].FIELDNAME).toBe('CLIENT');
  });
});

// ============================================
// Integration tests: tablXmlToCdsDdl
// ============================================

describe('tablXmlToCdsDdl', () => {
  it('should convert structure.tabl.xml to CDS DDL', async () => {
    const xml = await loadFixture('structure');
    const ddl = tablXmlToCdsDdl(xml);

    // Structure header
    expect(ddl).toContain('define structure zage_structure');
    expect(ddl).toContain("@EndUserText.label : 'Simple structure'");
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
    );

    // Single field
    expect(ddl).toContain('component_to_be_changed');
    expect(ddl).toContain('abap.string(0)');

    // Should NOT have table-specific annotations (it's a structure)
    expect(ddl).not.toContain('@AbapCatalog.tableCategory');
    expect(ddl).not.toContain('@AbapCatalog.deliveryClass');
  });

  it('should convert transparent.tabl.xml to CDS DDL', async () => {
    const xml = await loadFixture('transparent');
    const ddl = tablXmlToCdsDdl(xml);

    // Table header
    expect(ddl).toContain('define table zage_tabl');
    expect(ddl).toContain("@EndUserText.label : 'AGE Test Transparent Table'");
    expect(ddl).toContain('@AbapCatalog.tableCategory : #TRANSPARENT');
    expect(ddl).toContain('@AbapCatalog.deliveryClass : #A');
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
    );

    // Key fields (CLIENT is the only field, builtin CLNT type)
    expect(ddl).toContain('key client');
    expect(ddl).toContain('abap.clnt');
    expect(ddl).toContain('not null');
  });

  it('should convert structure1.tabl.xml to CDS DDL', async () => {
    const xml = await loadFixture('structure1');
    const ddl = tablXmlToCdsDdl(xml);

    expect(ddl).toContain('define structure zage_structure1');
    expect(ddl).toContain("@EndUserText.label : 'Simple structure'");
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
    );
    expect(ddl).toContain('component_to_be_changed : abap.string(0)');
  });

  it('should convert value-table.tabl.xml to CDS DDL', async () => {
    const xml = await loadFixture('valueTable');
    const ddl = tablXmlToCdsDdl(xml);

    expect(ddl).toContain('define table zage_value_table');
    expect(ddl).toContain('@AbapCatalog.tableCategory : #TRANSPARENT');
    expect(ddl).toContain('@AbapCatalog.deliveryClass : #A');

    // Key fields
    expect(ddl).toContain('key client');
    expect(ddl).toContain('abap.clnt');
    expect(ddl).toContain('not null');
  });
});
