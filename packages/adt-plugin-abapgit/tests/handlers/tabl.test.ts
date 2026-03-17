/**
 * Tests for TABL handler
 *
 * Verifies that CDS source is correctly parsed via @abapify/acds
 * and mapped to abapGit DD02V/DD03P XML format.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import handler to trigger registration
import '../../src/lib/handlers/objects/tabl.ts';
import { getHandler } from '../../src/lib/handlers/base.ts';
import {
  buildDD02V,
  buildDD03P,
} from '../../src/lib/handlers/cds-to-abapgit.ts';
import { parse } from '@abapify/acds';

// ============================================
// CDS Source Fixtures
// ============================================

/** Structure with mixed field types (matches zage_structure.tabl.xml) */
const CDS_STRUCTURE = `
@EndUserText.label : 'AGE Test Structure'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define structure zage_structure {
  partner_id  : abap.char(10);
  description : abap.char(40);
  amount      : abap.curr(15,2);
}
`;

/** Transparent table with keys and delivery class (matches zage_transparent_table.tabl.xml) */
const CDS_TRANSPARENT_TABLE = `
@EndUserText.label : 'AGE Test Transparent Table'
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define table zage_transparent_table {
  key mandt       : mandt not null;
  key key_field   : abap.char(10) not null;
      value_field : abap.char(40);
}
`;

/** Structure with ALL builtin field types (matches zage_structure.tabl.xml fixture) */
const CDS_ALL_TYPES = `
@EndUserText.label : 'Simple structure'
@AbapCatalog.enhancement.category : #EXTENSIBLE_ANY
define structure zage_structure {
  char_field       : abap.char(10);
  numc_field       : abap.numc(5);
  string_field     : abap.string;
  int1_field       : abap.int1;
  int2_field       : abap.int2;
  int4_field       : abap.int4;
  int8_field       : abap.int8;
  dec_field        : abap.dec(15,2);
  fltp_field       : abap.fltp;
  dats_field       : abap.dats;
  tims_field       : abap.tims;
  raw_field        : abap.raw(16);
  rawstring_field  : abap.rawstring;
  currency_code    : abap.cuky(5);
  unit_code        : abap.unit(2);
  utclong_field    : abap.utclong;
  country_code     : land1;
  language         : spras;
  client           : mandt;
}
`;

/** Structure with include directives */
const CDS_WITH_INCLUDES = `
@EndUserText.label : 'Structure with includes'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
define structure ztest_with_include {
  field1 : abap.char(10);
  include zage_structure1;
  field2 : abap.numc(5);
}
`;

/** Structure with include + suffix directives */
const CDS_WITH_INCLUDES_SUFFIX = `
@EndUserText.label : 'Structure with includes and suffix'
define structure ztest_include_suffix {
  field1 : abap.char(10);
  include zage_structure1;
  include zage_structure1 with suffix _xx;
  field2 : abap.numc(5);
}
`;

/** Table with data element references */
const CDS_TABLE_DATA_ELEMENTS = `
@EndUserText.label : 'Table with data elements'
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #C
define table ztable_dtel {
  key client : abap.clnt not null;
  key bukrs  : bukrs not null;
      name1  : name1_gp;
}
`;

// ============================================
// Mock Factory
// ============================================

function createMockTable(overrides?: {
  name?: string;
  type?: string;
  description?: string;
  language?: string;
  cdsSource?: string;
}) {
  const name = overrides?.name ?? 'ZTEST_TABLE';
  const type = overrides?.type ?? 'TABL/DT';
  const description = overrides?.description ?? 'Test Table';
  const language = overrides?.language ?? 'EN';
  const cdsSource = overrides?.cdsSource ?? CDS_TRANSPARENT_TABLE;

  return {
    name,
    type,
    kind: 'Table' as const,
    description,
    language,
    masterLanguage: language,
    abapLanguageVersion: '',
    dataSync: { name, type, description, language, masterLanguage: language },
    getSource: async () => cdsSource,
  };
}

// ============================================
// Tests
// ============================================

describe('TABL handler', () => {
  const handler = getHandler('TABL');

  it('handler is registered', () => {
    assert.ok(handler, 'TABL handler should be registered');
    assert.strictEqual(handler!.type, 'TABL');
  });

  describe('serialize — structure', () => {
    it('produces DD02V with TABCLASS=INTTAB', async () => {
      const mock = createMockTable({
        name: 'ZAGE_STRUCTURE',
        type: 'TABL/DS',
        description: 'AGE Test Structure',
        cdsSource: CDS_STRUCTURE,
      });

      const files = await handler!.serialize(mock as any);
      assert.strictEqual(files.length, 1);

      const xml = files[0].content;
      assert.ok(xml.includes('<TABNAME>ZAGE_STRUCTURE</TABNAME>'));
      assert.ok(xml.includes('<TABCLASS>INTTAB</TABCLASS>'));
      assert.ok(xml.includes('<DDTEXT>AGE Test Structure</DDTEXT>'));
      assert.ok(xml.includes('<EXCLASS>1</EXCLASS>'));
    });

    it('produces DD03P entries for all fields', async () => {
      const mock = createMockTable({
        name: 'ZAGE_STRUCTURE',
        type: 'TABL/DS',
        description: 'AGE Test Structure',
        cdsSource: CDS_STRUCTURE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      // PARTNER_ID — abap.char(10)
      assert.ok(xml.includes('<FIELDNAME>PARTNER_ID</FIELDNAME>'));
      assert.ok(xml.includes('<DATATYPE>CHAR</DATATYPE>'));

      // DESCRIPTION — abap.char(40)
      assert.ok(xml.includes('<FIELDNAME>DESCRIPTION</FIELDNAME>'));

      // AMOUNT — abap.curr(15,2)
      assert.ok(xml.includes('<FIELDNAME>AMOUNT</FIELDNAME>'));
      assert.ok(xml.includes('<DATATYPE>CURR</DATATYPE>'));
      assert.ok(xml.includes('<INTTYPE>P</INTTYPE>'));
    });

    it('sets POSITION for fields', async () => {
      const mock = createMockTable({
        name: 'ZAGE_STRUCTURE',
        type: 'TABL/DS',
        description: 'AGE Test Structure',
        cdsSource: CDS_STRUCTURE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      // All fields should have POSITION
      assert.ok(xml.includes('<POSITION>0001</POSITION>'));
      assert.ok(xml.includes('<POSITION>0002</POSITION>'));
      assert.ok(xml.includes('<POSITION>0003</POSITION>'));
    });
  });

  describe('serialize — transparent table', () => {
    it('produces DD02V with TABCLASS=TRANSP and CONTFLAG', async () => {
      const mock = createMockTable({
        name: 'ZAGE_TRANSPARENT_TABLE',
        description: 'AGE Test Transparent Table',
        cdsSource: CDS_TRANSPARENT_TABLE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      assert.ok(xml.includes('<TABCLASS>TRANSP</TABCLASS>'));
      assert.ok(xml.includes('<CONTFLAG>A</CONTFLAG>'));
      assert.ok(xml.includes('<EXCLASS>1</EXCLASS>'));
    });

    it('marks key fields with KEYFLAG', async () => {
      const mock = createMockTable({
        name: 'ZAGE_TRANSPARENT_TABLE',
        description: 'AGE Test Transparent Table',
        cdsSource: CDS_TRANSPARENT_TABLE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      // Should have KEYFLAG for key fields
      assert.ok(xml.includes('<KEYFLAG>X</KEYFLAG>'));
    });

    it('marks not null fields with NOTNULL', async () => {
      const mock = createMockTable({
        name: 'ZAGE_TRANSPARENT_TABLE',
        description: 'AGE Test Transparent Table',
        cdsSource: CDS_TRANSPARENT_TABLE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      assert.ok(xml.includes('<NOTNULL>X</NOTNULL>'));
    });

    it('handles data element reference (mandt)', async () => {
      const mock = createMockTable({
        name: 'ZAGE_TRANSPARENT_TABLE',
        description: 'AGE Test Transparent Table',
        cdsSource: CDS_TRANSPARENT_TABLE,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      // MANDT field references data element
      assert.ok(xml.includes('<ROLLNAME>MANDT</ROLLNAME>'));
      assert.ok(xml.includes('<COMPTYPE>E</COMPTYPE>'));
    });

    it('detects client-dependent table', async () => {
      const mock = createMockTable({
        name: 'ZTABLE_DTEL',
        description: 'Table with data elements',
        cdsSource: CDS_TABLE_DATA_ELEMENTS,
      });

      const files = await handler!.serialize(mock as any);
      const xml = files[0].content;

      assert.ok(xml.includes('<CLIDEP>X</CLIDEP>'));
    });
  });

  describe('serialize — fallback', () => {
    it('falls back to minimal DD02V when getSource fails', async () => {
      const mock = createMockTable({
        name: 'ZFAIL_TABLE',
        description: 'Fallback Table',
      });
      mock.getSource = async () => {
        throw new Error('Source not available');
      };

      const files = await handler!.serialize(mock as any);
      assert.strictEqual(files.length, 1);
      const xml = files[0].content;
      assert.ok(xml.includes('<TABNAME>ZFAIL_TABLE</TABNAME>'));
    });

    it('falls back when CDS source is unparseable', async () => {
      const mock = createMockTable({
        name: 'ZBAD_TABLE',
        description: 'Bad Source',
        cdsSource: 'not valid CDS at all {{{{',
      });

      const files = await handler!.serialize(mock as any);
      assert.strictEqual(files.length, 1);
      const xml = files[0].content;
      assert.ok(xml.includes('<TABNAME>ZBAD_TABLE</TABNAME>'));
    });
  });

  describe('fromAbapGit', () => {
    it('maps DD02V to ADK data for transparent table', () => {
      const result = handler!.fromAbapGit!({
        DD02V: {
          TABNAME: 'ZTESTTABLE',
          TABCLASS: 'TRANSP',
          DDTEXT: 'Test Table',
          DDLANGUAGE: 'E',
        },
      });

      assert.strictEqual(result.name, 'ZTESTTABLE');
      assert.strictEqual(result.type, 'TABL/DT');
      assert.strictEqual(result.description, 'Test Table');
    });

    it('maps DD02V to ADK data for structure', () => {
      const result = handler!.fromAbapGit!({
        DD02V: {
          TABNAME: 'ZTESTSTRUCT',
          TABCLASS: 'INTTAB',
          DDTEXT: 'Test Structure',
          DDLANGUAGE: 'D',
        },
      });

      assert.strictEqual(result.name, 'ZTESTSTRUCT');
      assert.strictEqual(result.type, 'TABL/DS');
    });
  });
});

describe('CDS-to-abapGit mapping', () => {
  it('buildDD02V maps structure annotations correctly', () => {
    const { ast } = parse(CDS_STRUCTURE);
    const def = ast.definitions[0] as any;
    const dd02v = buildDD02V(def, 'E', 'AGE Test Structure');

    assert.strictEqual(dd02v.TABNAME, 'ZAGE_STRUCTURE');
    assert.strictEqual(dd02v.TABCLASS, 'INTTAB');
    assert.strictEqual(dd02v.EXCLASS, '1');
    assert.strictEqual(dd02v.DDLANGUAGE, 'E');
    assert.strictEqual(dd02v.MASTERLANG, 'E');
  });

  it('buildDD02V maps transparent table annotations', () => {
    const { ast } = parse(CDS_TRANSPARENT_TABLE);
    const def = ast.definitions[0] as any;
    const dd02v = buildDD02V(def, 'E', 'AGE Test Transparent Table');

    assert.strictEqual(dd02v.TABCLASS, 'TRANSP');
    assert.strictEqual(dd02v.CONTFLAG, 'A');
    assert.strictEqual(dd02v.EXCLASS, '1');
  });

  it('buildDD03P maps builtin type fields', () => {
    const { ast } = parse(CDS_STRUCTURE);
    const def = ast.definitions[0] as any;
    const entries = buildDD03P(def.members);

    assert.strictEqual(entries.length, 3);

    // PARTNER_ID: abap.char(10)
    assert.strictEqual(entries[0].FIELDNAME, 'PARTNER_ID');
    assert.strictEqual(entries[0].INTTYPE, 'C');
    assert.strictEqual(entries[0].DATATYPE, 'CHAR');
    assert.strictEqual(entries[0].LENG, '000010');
    assert.strictEqual(entries[0].POSITION, '0001');

    // AMOUNT: abap.curr(15,2)
    assert.strictEqual(entries[2].FIELDNAME, 'AMOUNT');
    assert.strictEqual(entries[2].INTTYPE, 'P');
    assert.strictEqual(entries[2].DATATYPE, 'CURR');
    assert.strictEqual(entries[2].LENG, '000015');
    assert.strictEqual(entries[2].DECIMALS, '000002');
  });

  it('buildDD03P maps data element references', () => {
    const { ast } = parse(CDS_TRANSPARENT_TABLE);
    const def = ast.definitions[0] as any;
    const entries = buildDD03P(def.members);

    // MANDT — data element reference
    const mandt = entries[0];
    assert.strictEqual(mandt.FIELDNAME, 'MANDT');
    assert.strictEqual(mandt.ROLLNAME, 'MANDT');
    assert.strictEqual(mandt.COMPTYPE, 'E');
    assert.strictEqual(mandt.KEYFLAG, 'X');
    assert.strictEqual(mandt.NOTNULL, 'X');
  });

  it('buildDD03P maps key and not null flags', () => {
    const { ast } = parse(CDS_TRANSPARENT_TABLE);
    const def = ast.definitions[0] as any;
    const entries = buildDD03P(def.members);

    // key_field: key, not null, builtin
    const keyField = entries[1];
    assert.strictEqual(keyField.KEYFLAG, 'X');
    assert.strictEqual(keyField.NOTNULL, 'X');

    // value_field: not key, nullable
    const valueField = entries[2];
    assert.strictEqual(keyField.FIELDNAME, 'KEY_FIELD');
    assert.strictEqual(valueField.KEYFLAG, undefined);
    assert.strictEqual(valueField.NOTNULL, undefined);
  });
});

describe('CDS-to-abapGit field type mapping (all builtin types)', () => {
  // Parse once, reuse for all type-specific tests
  const { ast } = parse(CDS_ALL_TYPES);
  const def = ast.definitions[0] as any;
  const entries = buildDD03P(def.members, 'ZAGE_STRUCTURE');

  /** Helper to find entry by field name */
  function field(name: string) {
    const entry = entries.find((e) => e.FIELDNAME === name);
    assert.ok(entry, `Field ${name} should exist in DD03P entries`);
    return entry!;
  }

  it('char(10): INTTYPE=C, INTLEN=000020, DATATYPE=CHAR, LENG=000010', () => {
    const f = field('CHAR_FIELD');
    assert.strictEqual(f.INTTYPE, 'C');
    assert.strictEqual(f.INTLEN, '000020');
    assert.strictEqual(f.DATATYPE, 'CHAR');
    assert.strictEqual(f.LENG, '000010');
    assert.strictEqual(f.MASK, '  CHAR');
    assert.strictEqual(f.POSITION, '0001');
  });

  it('numc(5): INTTYPE=N, INTLEN=000010, DATATYPE=NUMC, LENG=000005', () => {
    const f = field('NUMC_FIELD');
    assert.strictEqual(f.INTTYPE, 'N');
    assert.strictEqual(f.INTLEN, '000010');
    assert.strictEqual(f.DATATYPE, 'NUMC');
    assert.strictEqual(f.LENG, '000005');
    assert.strictEqual(f.MASK, '  NUMC');
  });

  it('string: INTTYPE=g, INTLEN=000008, DATATYPE=STRG, no LENG', () => {
    const f = field('STRING_FIELD');
    assert.strictEqual(f.INTTYPE, 'g');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'STRG');
    assert.strictEqual(f.LENG, undefined, 'string should not have LENG');
    assert.strictEqual(f.MASK, '  STRG');
  });

  it('int1: INTTYPE=X, INTLEN=000001, DATATYPE=INT1, LENG=000003', () => {
    const f = field('INT1_FIELD');
    assert.strictEqual(f.INTTYPE, 'X');
    assert.strictEqual(f.INTLEN, '000001');
    assert.strictEqual(f.DATATYPE, 'INT1');
    assert.strictEqual(f.LENG, '000003');
    assert.strictEqual(f.MASK, '  INT1');
  });

  it('int2: INTTYPE=X, INTLEN=000002, DATATYPE=INT2, LENG=000005', () => {
    const f = field('INT2_FIELD');
    assert.strictEqual(f.INTTYPE, 'X');
    assert.strictEqual(f.INTLEN, '000002');
    assert.strictEqual(f.DATATYPE, 'INT2');
    assert.strictEqual(f.LENG, '000005');
    assert.strictEqual(f.MASK, '  INT2');
  });

  it('int4: INTTYPE=X, INTLEN=000004, DATATYPE=INT4, LENG=000010', () => {
    const f = field('INT4_FIELD');
    assert.strictEqual(f.INTTYPE, 'X');
    assert.strictEqual(f.INTLEN, '000004');
    assert.strictEqual(f.DATATYPE, 'INT4');
    assert.strictEqual(f.LENG, '000010');
    assert.strictEqual(f.MASK, '  INT4');
  });

  it('int8: INTTYPE=8, INTLEN=000008, DATATYPE=INT8, LENG=000019', () => {
    const f = field('INT8_FIELD');
    assert.strictEqual(f.INTTYPE, '8');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'INT8');
    assert.strictEqual(f.LENG, '000019');
    assert.strictEqual(f.MASK, '  INT8');
  });

  it('dec(15,2): INTTYPE=P, INTLEN=000008, DATATYPE=DEC, LENG=000015, DECIMALS=000002', () => {
    const f = field('DEC_FIELD');
    assert.strictEqual(f.INTTYPE, 'P');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'DEC');
    assert.strictEqual(f.LENG, '000015');
    assert.strictEqual(f.DECIMALS, '000002');
    assert.strictEqual(f.MASK, '  DEC');
  });

  it('fltp: INTTYPE=F, INTLEN=000008, DATATYPE=FLTP, LENG=000016, DECIMALS=000016', () => {
    const f = field('FLTP_FIELD');
    assert.strictEqual(f.INTTYPE, 'F');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'FLTP');
    assert.strictEqual(f.LENG, '000016');
    assert.strictEqual(f.DECIMALS, '000016');
    assert.strictEqual(f.MASK, '  FLTP');
  });

  it('dats: INTTYPE=D, INTLEN=000016, DATATYPE=DATS, LENG=000008, SHLPORIGIN=T', () => {
    const f = field('DATS_FIELD');
    assert.strictEqual(f.INTTYPE, 'D');
    assert.strictEqual(f.INTLEN, '000016');
    assert.strictEqual(f.DATATYPE, 'DATS');
    assert.strictEqual(f.LENG, '000008');
    assert.strictEqual(f.SHLPORIGIN, 'T');
    assert.strictEqual(f.MASK, '  DATS');
  });

  it('tims: INTTYPE=T, INTLEN=000012, DATATYPE=TIMS, LENG=000006, SHLPORIGIN=T', () => {
    const f = field('TIMS_FIELD');
    assert.strictEqual(f.INTTYPE, 'T');
    assert.strictEqual(f.INTLEN, '000012');
    assert.strictEqual(f.DATATYPE, 'TIMS');
    assert.strictEqual(f.LENG, '000006');
    assert.strictEqual(f.SHLPORIGIN, 'T');
    assert.strictEqual(f.MASK, '  TIMS');
  });

  it('raw(16): INTTYPE=X, INTLEN=000016, DATATYPE=RAW, LENG=000016', () => {
    const f = field('RAW_FIELD');
    assert.strictEqual(f.INTTYPE, 'X');
    assert.strictEqual(f.INTLEN, '000016');
    assert.strictEqual(f.DATATYPE, 'RAW');
    assert.strictEqual(f.LENG, '000016');
    assert.strictEqual(f.MASK, '  RAW');
  });

  it('rawstring: INTTYPE=y, INTLEN=000008, DATATYPE=RSTR, no LENG', () => {
    const f = field('RAWSTRING_FIELD');
    assert.strictEqual(f.INTTYPE, 'y');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'RSTR');
    assert.strictEqual(f.LENG, undefined, 'rawstring should not have LENG');
    assert.strictEqual(f.MASK, '  RSTR');
  });

  it('cuky(5): INTTYPE=C, INTLEN=000010, DATATYPE=CUKY, LENG=000005', () => {
    const f = field('CURRENCY_CODE');
    assert.strictEqual(f.INTTYPE, 'C');
    assert.strictEqual(f.INTLEN, '000010');
    assert.strictEqual(f.DATATYPE, 'CUKY');
    assert.strictEqual(f.LENG, '000005');
    assert.strictEqual(f.MASK, '  CUKY');
  });

  it('unit(2): INTTYPE=C, INTLEN=000004, DATATYPE=UNIT, LENG=000002', () => {
    const f = field('UNIT_CODE');
    assert.strictEqual(f.INTTYPE, 'C');
    assert.strictEqual(f.INTLEN, '000004');
    assert.strictEqual(f.DATATYPE, 'UNIT');
    assert.strictEqual(f.LENG, '000002');
    assert.strictEqual(f.MASK, '  UNIT');
  });

  it('utclong: INTTYPE=p, INTLEN=000008, DATATYPE=UTCL, LENG=000027', () => {
    const f = field('UTCLONG_FIELD');
    assert.strictEqual(f.INTTYPE, 'p');
    assert.strictEqual(f.INTLEN, '000008');
    assert.strictEqual(f.DATATYPE, 'UTCL');
    assert.strictEqual(f.LENG, '000027');
    assert.strictEqual(f.MASK, '  UTCL');
  });

  it('named type (data element): ROLLNAME, COMPTYPE=E, no INTTYPE/DATATYPE', () => {
    const f = field('COUNTRY_CODE');
    assert.strictEqual(f.ROLLNAME, 'LAND1');
    assert.strictEqual(f.COMPTYPE, 'E');
    assert.strictEqual(f.INTTYPE, undefined);
    assert.strictEqual(f.DATATYPE, undefined);
    assert.strictEqual(f.LENG, undefined);
  });

  it('all fields have consecutive POSITION values', () => {
    for (let i = 0; i < entries.length; i++) {
      const expected = String(i + 1).padStart(4, '0');
      assert.strictEqual(
        entries[i].POSITION,
        expected,
        `Field ${entries[i].FIELDNAME} should have POSITION=${expected}`,
      );
    }
  });

  it('all fields have ADMINFIELD=0', () => {
    for (const entry of entries) {
      assert.strictEqual(
        entry.ADMINFIELD,
        '0',
        `Field ${entry.FIELDNAME} should have ADMINFIELD=0`,
      );
    }
  });
});

describe('CDS-to-abapGit DD02V LANGDEP', () => {
  it('buildDD02V includes LANGDEP=X', () => {
    const { ast } = parse(CDS_STRUCTURE);
    const def = ast.definitions[0] as any;
    const dd02v = buildDD02V(def, 'E', 'AGE Test Structure');
    assert.strictEqual(dd02v.LANGDEP, 'X');
  });
});

describe('CDS-to-abapGit include directives', () => {
  it('generates .INCLUDE entry for plain include', () => {
    const { ast } = parse(CDS_WITH_INCLUDES);
    const def = ast.definitions[0] as any;
    const entries = buildDD03P(def.members);

    // field1 at position 1
    assert.strictEqual(entries[0].FIELDNAME, 'FIELD1');
    assert.strictEqual(entries[0].POSITION, '0001');

    // .INCLUDE at position 2
    assert.strictEqual(entries[1].FIELDNAME, '.INCLUDE');
    assert.strictEqual(entries[1].POSITION, '0002');
    assert.strictEqual(entries[1].PRECFIELD, 'ZAGE_STRUCTURE1');
    assert.strictEqual(entries[1].MASK, '      S');
    assert.strictEqual(entries[1].COMPTYPE, 'S');

    // field2 at position 3
    assert.strictEqual(entries[2].FIELDNAME, 'FIELD2');
    assert.strictEqual(entries[2].POSITION, '0003');

    assert.strictEqual(entries.length, 3);
  });

  it('generates .INCLUDE and .INCLU-<SUFFIX> for include with suffix', () => {
    const { ast } = parse(CDS_WITH_INCLUDES_SUFFIX);
    const def = ast.definitions[0] as any;
    const entries = buildDD03P(def.members);

    // field1 at position 1
    assert.strictEqual(entries[0].FIELDNAME, 'FIELD1');
    assert.strictEqual(entries[0].POSITION, '0001');

    // .INCLUDE at position 2 (plain include)
    assert.strictEqual(entries[1].FIELDNAME, '.INCLUDE');
    assert.strictEqual(entries[1].POSITION, '0002');
    assert.strictEqual(entries[1].PRECFIELD, 'ZAGE_STRUCTURE1');

    // .INCLU-_XX at position 3 (include with suffix _xx)
    assert.strictEqual(entries[2].FIELDNAME, '.INCLU-_XX');
    assert.strictEqual(entries[2].POSITION, '0003');
    assert.strictEqual(entries[2].PRECFIELD, 'ZAGE_STRUCTURE1');
    assert.strictEqual(entries[2].COMPTYPE, 'S');

    // field2 at position 4
    assert.strictEqual(entries[3].FIELDNAME, 'FIELD2');
    assert.strictEqual(entries[3].POSITION, '0004');

    assert.strictEqual(entries.length, 4);
  });
});
