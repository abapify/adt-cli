/**
 * Tests for abapgit-to-cds: DD02V/DD03P → CDS DDL builder
 *
 * Uses ground truth fixtures from git_modules/abapgit-examples/src/ddic/
 * to verify the reverse mapping produces valid CDS DDL.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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

const FIXTURES_DIR = join(
  __dirname,
  '../../..',
  'git_modules/abapgit-examples/src/ddic',
);

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

// ============================================
// Unit tests: buildCdsDdl
// ============================================

describe('buildCdsDdl', () => {
  describe('structure (INTTAB)', () => {
    it('should generate define structure for TABCLASS=INTTAB', () => {
      const dd02v: DD02VData = {
        TABNAME: 'ZTEST_STRUCT',
        TABCLASS: 'INTTAB',
        DDTEXT: 'Test structure',
        EXCLASS: '4',
      };

      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'FIELD1',
          POSITION: '0001',
          ADMINFIELD: '0',
          INTTYPE: 'C',
          INTLEN: '000020',
          DATATYPE: 'CHAR',
          LENG: '000010',
          MASK: '  CHAR',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
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
      const dd02v: DD02VData = {
        TABNAME: 'ZTEST',
        TABCLASS: 'INTTAB',
      };

      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'F_INT1',
          POSITION: '0001',
          DATATYPE: 'INT1',
          LENG: '000003',
          INTTYPE: 'X',
        },
        {
          FIELDNAME: 'F_INT2',
          POSITION: '0002',
          DATATYPE: 'INT2',
          LENG: '000005',
          INTTYPE: 'X',
        },
        {
          FIELDNAME: 'F_INT4',
          POSITION: '0003',
          DATATYPE: 'INT4',
          LENG: '000010',
          INTTYPE: 'X',
        },
        {
          FIELDNAME: 'F_INT8',
          POSITION: '0004',
          DATATYPE: 'INT8',
          LENG: '000019',
          INTTYPE: '8',
        },
        {
          FIELDNAME: 'F_DATS',
          POSITION: '0005',
          DATATYPE: 'DATS',
          LENG: '000008',
          INTTYPE: 'D',
        },
        {
          FIELDNAME: 'F_TIMS',
          POSITION: '0006',
          DATATYPE: 'TIMS',
          LENG: '000006',
          INTTYPE: 'T',
        },
        {
          FIELDNAME: 'F_FLTP',
          POSITION: '0007',
          DATATYPE: 'FLTP',
          LENG: '000016',
          DECIMALS: '000016',
          INTTYPE: 'F',
        },
        {
          FIELDNAME: 'F_CLNT',
          POSITION: '0008',
          DATATYPE: 'CLNT',
          LENG: '000003',
          INTTYPE: 'C',
        },
        {
          FIELDNAME: 'F_LANG',
          POSITION: '0009',
          DATATYPE: 'LANG',
          LENG: '000001',
          INTTYPE: 'C',
        },
        {
          FIELDNAME: 'F_UTCL',
          POSITION: '0010',
          DATATYPE: 'UTCL',
          LENG: '000027',
          INTTYPE: 'p',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
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
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'F_CHAR',
          POSITION: '0001',
          DATATYPE: 'CHAR',
          LENG: '000010',
        },
        {
          FIELDNAME: 'F_NUMC',
          POSITION: '0002',
          DATATYPE: 'NUMC',
          LENG: '000005',
        },
        {
          FIELDNAME: 'F_RAW',
          POSITION: '0003',
          DATATYPE: 'RAW',
          LENG: '000016',
        },
        {
          FIELDNAME: 'F_CUKY',
          POSITION: '0004',
          DATATYPE: 'CUKY',
          LENG: '000005',
        },
        {
          FIELDNAME: 'F_UNIT',
          POSITION: '0005',
          DATATYPE: 'UNIT',
          LENG: '000002',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('f_char : abap.char(10)');
      expect(result).toContain('f_numc : abap.numc(5)');
      expect(result).toContain('f_raw  : abap.raw(16)');
      expect(result).toContain('f_cuky : abap.cuky');
      expect(result).toContain('f_unit : abap.unit(2)');
    });

    it('should map decimal types with length and decimals', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'F_DEC',
          POSITION: '0001',
          DATATYPE: 'DEC',
          LENG: '000015',
          DECIMALS: '000002',
        },
        {
          FIELDNAME: 'F_CURR',
          POSITION: '0002',
          DATATYPE: 'CURR',
          LENG: '000015',
          DECIMALS: '000002',
          REFTABLE: 'ZTEST',
          REFFIELD: 'F_CUKY',
        },
        {
          FIELDNAME: 'F_QUAN',
          POSITION: '0003',
          DATATYPE: 'QUAN',
          LENG: '000013',
          DECIMALS: '000003',
          REFTABLE: 'ZTEST',
          REFFIELD: 'F_UNIT',
        },
        {
          FIELDNAME: 'F_CUKY',
          POSITION: '0004',
          DATATYPE: 'CUKY',
          LENG: '000005',
        },
        {
          FIELDNAME: 'F_UNIT',
          POSITION: '0005',
          DATATYPE: 'UNIT',
          LENG: '000003',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('f_dec  : abap.dec(15,2)');
      expect(result).toContain('f_curr : abap.curr(15,2)');
      expect(result).toContain('f_quan : abap.quan(13,3)');
    });

    it('should map variable-length types (string, rawstring)', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        { FIELDNAME: 'F_STRING', POSITION: '0001', DATATYPE: 'STRG' },
        { FIELDNAME: 'F_RSTR', POSITION: '0002', DATATYPE: 'RSTR' },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('f_string : abap.string(0)');
      expect(result).toContain('f_rstr   : abap.rawstring(0)');
    });
  });

  describe('data element references', () => {
    it('should emit data element name for COMPTYPE=E fields', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'COUNTRY_CODE',
          POSITION: '0001',
          ROLLNAME: 'LAND1',
          COMPTYPE: 'E',
        },
        {
          FIELDNAME: 'LANGUAGE',
          POSITION: '0002',
          ROLLNAME: 'SPRAS',
          COMPTYPE: 'E',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('country_code : land1');
      expect(result).toContain('language     : spras');
    });
  });

  describe('currency/quantity annotations', () => {
    it('should emit @Semantics.amount.currencyCode for CURR fields', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'AMOUNT',
          POSITION: '0001',
          DATATYPE: 'CURR',
          LENG: '000015',
          DECIMALS: '000002',
          REFTABLE: 'ZTEST',
          REFFIELD: 'CURRENCY',
        },
        {
          FIELDNAME: 'CURRENCY',
          POSITION: '0002',
          DATATYPE: 'CUKY',
          LENG: '000005',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain(
        "@Semantics.amount.currencyCode : 'ztest.currency'",
      );
      expect(result).toContain('amount   : abap.curr(15,2)');
    });

    it('should emit @Semantics.quantity.unitOfMeasure for QUAN fields', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'QUANTITY',
          POSITION: '0001',
          DATATYPE: 'QUAN',
          LENG: '000013',
          DECIMALS: '000003',
          REFTABLE: 'ZTEST',
          REFFIELD: 'UOM',
        },
        {
          FIELDNAME: 'UOM',
          POSITION: '0002',
          DATATYPE: 'UNIT',
          LENG: '000003',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain(
        "@Semantics.quantity.unitOfMeasure : 'ztest.uom'",
      );
      expect(result).toContain('quantity : abap.quan(13,3)');
    });
  });

  describe('includes', () => {
    it('should emit include directive for .INCLUDE entries', () => {
      const dd02v: DD02VData = { TABNAME: 'ZTEST', TABCLASS: 'INTTAB' };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'FIELD1',
          POSITION: '0001',
          DATATYPE: 'CHAR',
          LENG: '000010',
        },
        {
          FIELDNAME: '.INCLUDE',
          POSITION: '0002',
          PRECFIELD: 'ZOTHER_STRUCT',
          MASK: '      S',
          COMPTYPE: 'S',
        },
        {
          FIELDNAME: '.INCLU-_XX',
          POSITION: '0003',
          PRECFIELD: 'ZOTHER_STRUCT',
          MASK: '      S',
          COMPTYPE: 'S',
        },
        {
          FIELDNAME: 'FIELD2',
          POSITION: '0004',
          DATATYPE: 'NUMC',
          LENG: '000005',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
      expect(result).toContain('field1 : abap.char(10)');
      expect(result).toContain('include zother_struct;');
      expect(result).toContain('field2 : abap.numc(5)');
      // Should NOT contain .INCLU-_XX as a separate line
      expect(result).not.toContain('inclu-');
    });
  });

  describe('key fields and not null', () => {
    it('should emit key keyword and not null for key fields', () => {
      const dd02v: DD02VData = {
        TABNAME: 'ZTEST',
        TABCLASS: 'TRANSP',
        CONTFLAG: 'A',
      };
      const dd03p: DD03PData[] = [
        {
          FIELDNAME: 'KEY1',
          POSITION: '0001',
          KEYFLAG: 'X',
          DATATYPE: 'CHAR',
          LENG: '000010',
          NOTNULL: 'X',
        },
        {
          FIELDNAME: 'DATA1',
          POSITION: '0002',
          DATATYPE: 'CHAR',
          LENG: '000040',
        },
      ];

      const result = buildCdsDdl(dd02v, dd03p);
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
      const dd02v: DD02VData = {
        TABNAME: 'ZTEST',
        TABCLASS: 'INTTAB',
        EXCLASS: exclass,
      };
      const result = buildCdsDdl(dd02v, []);
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
  it('should parse zage_structure.tabl.xml', () => {
    const xml = loadFixture('zage_structure.tabl.xml');
    const { dd02v, dd03p } = parseTablXml(xml);

    expect(dd02v.TABNAME).toBe('ZAGE_STRUCTURE');
    expect(dd02v.TABCLASS).toBe('INTTAB');
    expect(dd02v.DDTEXT).toBe('Simple structure');
    expect(dd02v.EXCLASS).toBe('4');

    expect(dd03p).toBeInstanceOf(Array);
    expect(dd03p.length).toBeGreaterThan(0);

    // Check first field
    expect(dd03p[0].FIELDNAME).toBe('CHAR_FIELD');
    expect(dd03p[0].DATATYPE).toBe('CHAR');
    expect(dd03p[0].LENG).toBe('000010');
  });

  it('should parse zage_tabl.tabl.xml (transparent table)', () => {
    const xml = loadFixture('zage_tabl.tabl.xml');
    const { dd02v, dd03p } = parseTablXml(xml);

    expect(dd02v.TABNAME).toBe('ZAGE_TABL');
    expect(dd02v.TABCLASS).toBe('TRANSP');
    expect(dd02v.CONTFLAG).toBe('A');

    // Has key fields
    const keyFields = dd03p.filter((f) => f.KEYFLAG === 'X');
    expect(keyFields.length).toBe(2);
  });
});

// ============================================
// Integration tests: tablXmlToCdsDdl
// ============================================

describe('tablXmlToCdsDdl', () => {
  it('should convert zage_structure.tabl.xml to CDS DDL', () => {
    const xml = loadFixture('zage_structure.tabl.xml');
    const ddl = tablXmlToCdsDdl(xml);

    // Structure header
    expect(ddl).toContain('define structure zage_structure');
    expect(ddl).toContain("@EndUserText.label : 'Simple structure'");
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #EXTENSIBLE_ANY',
    );

    // Built-in type fields
    expect(ddl).toContain('char_field');
    expect(ddl).toContain('abap.char(10)');
    expect(ddl).toContain('numc_field');
    expect(ddl).toContain('abap.numc(5)');
    expect(ddl).toContain('int1_field');
    expect(ddl).toContain('abap.int1');
    expect(ddl).toContain('int2_field');
    expect(ddl).toContain('abap.int2');
    expect(ddl).toContain('int4_field');
    expect(ddl).toContain('abap.int4');
    expect(ddl).toContain('int8_field');
    expect(ddl).toContain('abap.int8');
    expect(ddl).toContain('fltp_field');
    expect(ddl).toContain('abap.fltp');
    expect(ddl).toContain('dats_field');
    expect(ddl).toContain('abap.dats');
    expect(ddl).toContain('tims_field');
    expect(ddl).toContain('abap.tims');
    expect(ddl).toContain('datn_field');
    expect(ddl).toContain('abap.datn');
    expect(ddl).toContain('timn_field');
    expect(ddl).toContain('abap.timn');
    expect(ddl).toContain('utclong_field');
    expect(ddl).toContain('abap.utclong');
    expect(ddl).toContain('raw_field');
    expect(ddl).toContain('abap.raw(16)');
    expect(ddl).toContain('string_field');
    expect(ddl).toContain('abap.string(0)');
    expect(ddl).toContain('rawstring_field');
    expect(ddl).toContain('abap.rawstring(0)');

    // Decimal types
    expect(ddl).toContain('dec_field');
    expect(ddl).toContain('abap.dec(15,2)');

    // Currency/quantity with annotations
    expect(ddl).toContain(
      "@Semantics.amount.currencyCode : 'zage_structure.currency_code'",
    );
    expect(ddl).toContain('curr_field');
    expect(ddl).toContain('abap.curr(15,2)');
    expect(ddl).toContain(
      "@Semantics.quantity.unitOfMeasure : 'zage_structure.unit_code'",
    );
    expect(ddl).toContain('quan_field');
    expect(ddl).toContain('abap.quan(13,3)');

    // Reference fields
    expect(ddl).toContain('currency_code');
    expect(ddl).toContain('abap.cuky');
    expect(ddl).toContain('unit_code');
    expect(ddl).toContain('abap.unit(2)');

    // Data element fields
    expect(ddl).toContain('country_code');
    expect(ddl).toContain('land1');
    expect(ddl).toContain('language');
    expect(ddl).toContain('spras');
    expect(ddl).toContain('client');
    expect(ddl).toContain('mandt');

    // Include
    expect(ddl).toContain('include zage_structure1');

    // Should NOT have table-specific annotations (it's a structure)
    expect(ddl).not.toContain('@AbapCatalog.tableCategory');
    expect(ddl).not.toContain('@AbapCatalog.deliveryClass');
  });

  it('should convert zage_tabl.tabl.xml to CDS DDL', () => {
    const xml = loadFixture('zage_tabl.tabl.xml');
    const ddl = tablXmlToCdsDdl(xml);

    // Table header
    expect(ddl).toContain('define table zage_tabl');
    expect(ddl).toContain("@EndUserText.label : 'AGE Test Transparent Table'");
    expect(ddl).toContain('@AbapCatalog.tableCategory : #TRANSPARENT');
    expect(ddl).toContain('@AbapCatalog.deliveryClass : #A');
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
    );

    // Key fields
    expect(ddl).toContain('key mandt');
    expect(ddl).toContain('not null');
    expect(ddl).toContain('key key_field');
  });

  it('should convert zage_structure1.tabl.xml to CDS DDL', () => {
    const xml = loadFixture('zage_structure1.tabl.xml');
    const ddl = tablXmlToCdsDdl(xml);

    expect(ddl).toContain('define structure zage_structure1');
    expect(ddl).toContain("@EndUserText.label : 'Simple structure'");
    expect(ddl).toContain(
      '@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE',
    );
    expect(ddl).toContain('component_to_be_changed : abap.string(0)');
  });

  it('should convert zage_value_table.tabl.xml to CDS DDL', () => {
    const xml = loadFixture('zage_value_table.tabl.xml');
    const ddl = tablXmlToCdsDdl(xml);

    expect(ddl).toContain('define table zage_value_table');
    expect(ddl).toContain('@AbapCatalog.tableCategory : #TRANSPARENT');
    expect(ddl).toContain('@AbapCatalog.deliveryClass : #A');

    // Key fields
    expect(ddl).toContain('key client');
    expect(ddl).toContain('abap.clnt');
    expect(ddl).toContain('not null');
    expect(ddl).toContain('key db_key');
    expect(ddl).toContain('zage_dtel_value_table_key');
  });
});
