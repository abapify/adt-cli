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
