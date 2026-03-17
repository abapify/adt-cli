import { describe, it, expect } from 'vitest';
import { parse } from './index';
import type {
  TableDefinition,
  StructureDefinition,
  SimpleTypeDefinition,
  ServiceDefinition,
  MetadataExtension,
  FieldDefinition,
} from './ast';

// ============================================
// Table definitions
// ============================================

describe('table definition', () => {
  it('parses a basic table with key fields', () => {
    const result = parse(`
      define table ztable {
        key field1 : abap.char(10) not null;
        field2 : some_data_element;
      }
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.ast.definitions).toHaveLength(1);

    const table = result.ast.definitions[0] as TableDefinition;
    expect(table.kind).toBe('table');
    expect(table.name).toBe('ztable');
    expect(table.members).toHaveLength(2);

    const f1 = table.members[0] as FieldDefinition;
    expect(f1.name).toBe('field1');
    expect(f1.isKey).toBe(true);
    expect(f1.notNull).toBe(true);
    expect(f1.type).toEqual({
      kind: 'builtin',
      name: 'char',
      length: 10,
      decimals: undefined,
    });

    const f2 = table.members[1] as FieldDefinition;
    expect(f2.name).toBe('field2');
    expect(f2.isKey).toBe(false);
    expect(f2.notNull).toBe(false);
    expect(f2.type).toEqual({ kind: 'named', name: 'some_data_element' });
  });

  it('parses table with annotations', () => {
    const result = parse(`
      @EndUserText.label : 'Test table'
      @AbapCatalog.tableCategory : #TRANSPARENT
      @AbapCatalog.deliveryClass : #A
      @AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
      define table ztable {
        key mandt : abap.clnt not null;
        key field1 : abap.char(10) not null;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const table = result.ast.definitions[0] as TableDefinition;
    expect(table.kind).toBe('table');
    expect(table.name).toBe('ztable');
    expect(table.annotations).toHaveLength(4);

    expect(table.annotations[0].key).toBe('EndUserText.label');
    expect(table.annotations[0].value).toEqual({
      kind: 'string',
      value: 'Test table',
    });

    expect(table.annotations[1].key).toBe('AbapCatalog.tableCategory');
    expect(table.annotations[1].value).toEqual({
      kind: 'enum',
      value: 'TRANSPARENT',
    });

    expect(table.annotations[2].key).toBe('AbapCatalog.deliveryClass');
    expect(table.annotations[2].value).toEqual({ kind: 'enum', value: 'A' });

    expect(table.annotations[3].key).toBe('AbapCatalog.enhancement.category');
    expect(table.annotations[3].value).toEqual({
      kind: 'enum',
      value: 'NOT_EXTENSIBLE',
    });
  });

  it('parses table with decimal type', () => {
    const result = parse(`
      define table ztable {
        amount : abap.dec(11,2);
      }
    `);

    expect(result.errors).toHaveLength(0);

    const table = result.ast.definitions[0] as TableDefinition;
    const field = table.members[0] as FieldDefinition;
    expect(field.type).toEqual({
      kind: 'builtin',
      name: 'dec',
      length: 11,
      decimals: 2,
    });
  });

  it('parses table with include directive', () => {
    const result = parse(`
      define table ztable {
        include some_structure;
        key field1 : abap.char(10) not null;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const table = result.ast.definitions[0] as TableDefinition;
    expect(table.members).toHaveLength(2);
    expect(table.members[0]).toEqual({
      kind: 'include',
      name: 'some_structure',
    });
  });

  it('parses table with builtin types without length', () => {
    const result = parse(`
      define table ztable {
        key mandt : abap.clnt not null;
        date_field : abap.dats;
        time_field : abap.tims;
        int_field : abap.int4;
        str_field : abap.string;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const table = result.ast.definitions[0] as TableDefinition;
    expect(table.members).toHaveLength(5);

    const clnt = (table.members[0] as FieldDefinition).type;
    expect(clnt).toEqual({
      kind: 'builtin',
      name: 'clnt',
      length: undefined,
      decimals: undefined,
    });

    const dats = (table.members[1] as FieldDefinition).type;
    expect(dats).toEqual({
      kind: 'builtin',
      name: 'dats',
      length: undefined,
      decimals: undefined,
    });
  });
});

// ============================================
// Structure definitions
// ============================================

describe('structure definition', () => {
  it('parses a basic structure', () => {
    const result = parse(`
      define structure zstruct {
        field1 : abap.char(20);
        field2 : abap.numc(8);
      }
    `);

    expect(result.errors).toHaveLength(0);

    const struct = result.ast.definitions[0] as StructureDefinition;
    expect(struct.kind).toBe('structure');
    expect(struct.name).toBe('zstruct');
    expect(struct.members).toHaveLength(2);

    const f1 = struct.members[0] as FieldDefinition;
    expect(f1.name).toBe('field1');
    expect(f1.isKey).toBe(false); // structures don't have keys typically
    expect(f1.type).toEqual({
      kind: 'builtin',
      name: 'char',
      length: 20,
      decimals: undefined,
    });
  });

  it('parses structure with annotations', () => {
    const result = parse(`
      @EndUserText.label : 'A structure'
      define structure zstruct {
        field1 : some_element;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const struct = result.ast.definitions[0] as StructureDefinition;
    expect(struct.annotations).toHaveLength(1);
    expect(struct.annotations[0].key).toBe('EndUserText.label');
  });
});

// ============================================
// Simple type definitions (DRTY)
// ============================================

describe('simple type definition', () => {
  it('parses define type with builtin type', () => {
    const result = parse(`
      @EndUserText.label : 'This is a test label simple type'
      @EndUserText.quickInfo : 'This is the quick info for the simple type'
      define type z_aff_example_drty : abap.char(10);
    `);

    expect(result.errors).toHaveLength(0);

    const typeDef = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(typeDef.kind).toBe('simpleType');
    expect(typeDef.name).toBe('z_aff_example_drty');
    expect(typeDef.annotations).toHaveLength(2);
    expect(typeDef.type).toEqual({
      kind: 'builtin',
      name: 'char',
      length: 10,
      decimals: undefined,
    });
  });

  it('parses define type with named type', () => {
    const result = parse(`
      define type zmytype : some_data_element;
    `);

    expect(result.errors).toHaveLength(0);

    const typeDef = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(typeDef.kind).toBe('simpleType');
    expect(typeDef.name).toBe('zmytype');
    expect(typeDef.type).toEqual({ kind: 'named', name: 'some_data_element' });
  });
});

// ============================================
// Service definitions (SRVD)
// ============================================

describe('service definition', () => {
  it('parses service with expose statements', () => {
    const result = parse(`
      @EndUserText.label: 'Example'
      define service z_aff_example_srvd {
        expose z_aff_example_ddls as myEntity;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const svc = result.ast.definitions[0] as ServiceDefinition;
    expect(svc.kind).toBe('service');
    expect(svc.name).toBe('z_aff_example_srvd');
    expect(svc.annotations).toHaveLength(1);
    expect(svc.exposes).toHaveLength(1);
    expect(svc.exposes[0].entity).toBe('z_aff_example_ddls');
    expect(svc.exposes[0].alias).toBe('myEntity');
  });

  it('parses service with multiple exposes', () => {
    const result = parse(`
      define service zsvc {
        expose entity1 as Alias1;
        expose entity2 as Alias2;
        expose entity3 as Alias3;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const svc = result.ast.definitions[0] as ServiceDefinition;
    expect(svc.exposes).toHaveLength(3);
    expect(svc.exposes[0]).toEqual({ entity: 'entity1', alias: 'Alias1' });
    expect(svc.exposes[1]).toEqual({ entity: 'entity2', alias: 'Alias2' });
    expect(svc.exposes[2]).toEqual({ entity: 'entity3', alias: 'Alias3' });
  });

  it('parses expose without alias', () => {
    const result = parse(`
      define service zsvc {
        expose myentity;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const svc = result.ast.definitions[0] as ServiceDefinition;
    expect(svc.exposes[0].entity).toBe('myentity');
    expect(svc.exposes[0].alias).toBeUndefined();
  });
});

// ============================================
// Metadata extension (DDLX)
// ============================================

describe('metadata extension', () => {
  it('parses annotate entity with annotated elements', () => {
    const result = parse(`
      @Metadata.layer: #CORE
      annotate entity Z_AFF_EXAMPLE_DDLX
        with
      {
        @EndUserText.label: 'Carrier ID'
        Carrid;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const ext = result.ast.definitions[0] as MetadataExtension;
    expect(ext.kind).toBe('metadataExtension');
    expect(ext.entity).toBe('Z_AFF_EXAMPLE_DDLX');
    expect(ext.annotations).toHaveLength(1);
    expect(ext.annotations[0].key).toBe('Metadata.layer');
    expect(ext.annotations[0].value).toEqual({ kind: 'enum', value: 'CORE' });

    expect(ext.elements).toHaveLength(1);
    expect(ext.elements[0].name).toBe('Carrid');
    expect(ext.elements[0].annotations).toHaveLength(1);
    expect(ext.elements[0].annotations[0].key).toBe('EndUserText.label');
  });

  it('parses multiple annotated elements', () => {
    const result = parse(`
      @Metadata.layer: #CORE
      annotate entity ZMyView with
      {
        @EndUserText.label: 'Field A'
        FieldA;
        @EndUserText.label: 'Field B'
        @UI.hidden: true
        FieldB;
      }
    `);

    expect(result.errors).toHaveLength(0);

    const ext = result.ast.definitions[0] as MetadataExtension;
    expect(ext.elements).toHaveLength(2);
    expect(ext.elements[0].name).toBe('FieldA');
    expect(ext.elements[0].annotations).toHaveLength(1);
    expect(ext.elements[1].name).toBe('FieldB');
    expect(ext.elements[1].annotations).toHaveLength(2);
    expect(ext.elements[1].annotations[1].key).toBe('UI.hidden');
    expect(ext.elements[1].annotations[1].value).toEqual({
      kind: 'boolean',
      value: true,
    });
  });
});

// ============================================
// Annotation values
// ============================================

describe('annotation values', () => {
  it('parses string literal annotation', () => {
    const result = parse(`
      @EndUserText.label : 'Hello World'
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    const def = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(def.annotations[0].value).toEqual({
      kind: 'string',
      value: 'Hello World',
    });
  });

  it('parses enum annotation', () => {
    const result = parse(`
      @AbapCatalog.tableCategory : #TRANSPARENT
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    const def = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(def.annotations[0].value).toEqual({
      kind: 'enum',
      value: 'TRANSPARENT',
    });
  });

  it('parses boolean annotation', () => {
    const result = parse(`
      @AbapCatalog.entityBuffer.definitionAllowed: true
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    const def = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(def.annotations[0].value).toEqual({ kind: 'boolean', value: true });
  });

  it('parses number annotation', () => {
    const result = parse(`
      @SomeAnnotation.count: 42
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    const def = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(def.annotations[0].value).toEqual({ kind: 'number', value: 42 });
  });

  it('parses array annotation', () => {
    const result = parse(`
      @Scope: [#VIEW, #ENTITY]
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    const def = result.ast.definitions[0] as SimpleTypeDefinition;
    expect(def.annotations[0].value).toEqual({
      kind: 'array',
      items: [
        { kind: 'enum', value: 'VIEW' },
        { kind: 'enum', value: 'ENTITY' },
      ],
    });
  });
});

// ============================================
// Comments
// ============================================

describe('comments', () => {
  it('ignores line comments', () => {
    const result = parse(`
      // This is a comment
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.ast.definitions).toHaveLength(1);
  });

  it('ignores block comments', () => {
    const result = parse(`
      /* Multi-line
         comment */
      define type ztest : abap.char(1);
    `);

    expect(result.errors).toHaveLength(0);
    expect(result.ast.definitions).toHaveLength(1);
  });
});

// ============================================
// Error handling
// ============================================

describe('error handling', () => {
  it('reports errors for invalid input', () => {
    const result = parse('this is not valid CDS');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('reports errors for incomplete input', () => {
    const result = parse('define table ztable {');
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
