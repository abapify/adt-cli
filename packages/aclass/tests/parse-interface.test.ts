import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser';
import type { InterfaceDef, MethodDecl, TypeDecl } from '../src/ast';

function firstInterface(src: string): InterfaceDef {
  const { ast, errors } = parse(src);
  expect(errors).toEqual([]);
  const def = ast.definitions[0];
  expect(def.kind).toBe('InterfaceDef');
  return def as InterfaceDef;
}

describe('parse — INTERFACE declarations', () => {
  it('parses a public empty interface', () => {
    const i = firstInterface('INTERFACE zif_foo PUBLIC.\nENDINTERFACE.');
    expect(i.name).toBe('zif_foo');
    expect(i.isPublic).toBe(true);
    expect(i.members).toEqual([]);
  });

  it('parses a simple TYPES alias member', () => {
    const i = firstInterface(
      'INTERFACE zif_foo PUBLIC.\n' + '  TYPES id TYPE i.\n' + 'ENDINTERFACE.',
    );
    const td = i.members[0] as TypeDecl;
    expect(td.kind).toBe('TypeDecl');
    expect(td.name).toBe('id');
    expect(td.shape.kind).toBe('alias');
    if (td.shape.kind === 'alias') {
      expect(td.shape.type.kind).toBe('BuiltinTypeRef');
      expect(td.shape.type.source).toBe('i');
    }
  });

  it('parses a STANDARD TABLE OF qualified type', () => {
    const i = firstInterface(
      'INTERFACE zif_foo PUBLIC.\n' +
        '  TYPES pet_list TYPE STANDARD TABLE OF zif_bar=>pet WITH DEFAULT KEY.\n' +
        'ENDINTERFACE.',
    );
    const td = i.members[0] as TypeDecl;
    expect(td.shape.kind).toBe('alias');
    if (td.shape.kind !== 'alias') return;
    expect(td.shape.type.kind).toBe('TableTypeRef');
    if (td.shape.type.kind !== 'TableTypeRef') return;
    expect(td.shape.type.tableKind).toBe('standard');
    expect(td.shape.type.row.source).toBe('zif_bar=>pet');
    expect(td.shape.type.keyClause).toContain('WITH DEFAULT KEY');
  });

  it('parses METHODS with IMPORTING + RETURNING + RAISING', () => {
    const src = [
      'INTERFACE zif_foo PUBLIC.',
      '  METHODS get',
      '    IMPORTING pet_id TYPE int8',
      '    RETURNING VALUE(pet) TYPE zif_bar=>pet',
      '    RAISING zcx_err.',
      'ENDINTERFACE.',
    ].join('\n');
    const i = firstInterface(src);
    const m = i.members[0] as MethodDecl;
    expect(m.kind).toBe('MethodDecl');
    expect(m.name).toBe('get');
    expect(m.importing).toHaveLength(1);
    expect(m.importing[0].name).toBe('pet_id');
    expect(m.importing[0].type.source).toBe('int8');
    expect(m.returning?.name).toBe('pet');
    expect(m.returning?.isValue).toBe(true);
    expect(m.returning?.type.source).toBe('zif_bar=>pet');
    expect(m.raising).toEqual(['zcx_err']);
  });

  it('parses OPTIONAL parameters', () => {
    const src = [
      'INTERFACE zif_foo PUBLIC.',
      '  METHODS del',
      '    IMPORTING',
      '      pet_id TYPE int8',
      '      api_key TYPE string OPTIONAL.',
      'ENDINTERFACE.',
    ].join('\n');
    const i = firstInterface(src);
    const m = i.members[0] as MethodDecl;
    expect(m.importing).toHaveLength(2);
    expect(m.importing[0].isOptional).toBe(false);
    expect(m.importing[1].name).toBe('api_key');
    expect(m.importing[1].isOptional).toBe(true);
  });

  it('captures ABAPDoc on members', () => {
    const src = [
      'INTERFACE zif_foo PUBLIC.',
      '  "! @openapi-operation addPet',
      '  "! Add a new pet.',
      '  METHODS add_pet',
      '    IMPORTING body TYPE string.',
      'ENDINTERFACE.',
    ].join('\n');
    const i = firstInterface(src);
    const m = i.members[0] as MethodDecl;
    expect(m.abapDoc).toEqual(['@openapi-operation addPet', 'Add a new pet.']);
  });

  it('parses BEGIN OF / END OF structure inside interface', () => {
    const src = [
      'INTERFACE zif_t PUBLIC.',
      '  TYPES: BEGIN OF pet,',
      '    id   TYPE int8,',
      '    name TYPE string,',
      '  END OF pet.',
      'ENDINTERFACE.',
    ].join('\n');
    const i = firstInterface(src);
    const td = i.members[0] as TypeDecl;
    expect(td.kind).toBe('TypeDecl');
    expect(td.name).toBe('pet');
    expect(td.shape.kind).toBe('structure');
    if (td.shape.kind !== 'structure') return;
    expect(td.shape.fields).toHaveLength(2);
    expect(td.shape.fields[0].name).toBe('id');
    expect(td.shape.fields[0].type.source).toBe('int8');
    expect(td.shape.fields[1].name).toBe('name');
    expect(td.shape.fields[1].type.source).toBe('string');
  });
});

describe('parse — CLASS declarations', () => {
  it('parses class header with FINAL / INHERITING / CREATE', () => {
    const src = [
      'CLASS zcx_err DEFINITION PUBLIC FINAL INHERITING FROM cx_static_check CREATE PUBLIC.',
      '  PUBLIC SECTION.',
      '    DATA status TYPE i READ-ONLY.',
      'ENDCLASS.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const cls = ast.definitions[0];
    expect(cls.kind).toBe('ClassDef');
    if (cls.kind !== 'ClassDef') return;
    expect(cls.name).toBe('zcx_err');
    expect(cls.isFinal).toBe(true);
    expect(cls.superClass).toBe('cx_static_check');
    expect(cls.createVisibility).toBe('public');
    expect(cls.sections).toHaveLength(1);
    const sec = cls.sections[0];
    expect(sec.visibility).toBe('public');
    const attr = sec.members[0];
    expect(attr.kind).toBe('AttributeDecl');
    if (attr.kind !== 'AttributeDecl') return;
    expect(attr.name).toBe('status');
    expect(attr.isReadOnly).toBe(true);
  });

  it('parses CLASS IMPLEMENTATION with method bodies preserved verbatim', () => {
    const src = [
      'CLASS zcl_foo IMPLEMENTATION.',
      '  METHOD constructor.',
      '    super->constructor( ).',
      '    me->x = 1.',
      '  ENDMETHOD.',
      '  METHOD ping.',
      '    RETURN.',
      '  ENDMETHOD.',
      'ENDCLASS.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const impl = ast.definitions[0];
    expect(impl.kind).toBe('ClassImpl');
    if (impl.kind !== 'ClassImpl') return;
    expect(impl.methods).toHaveLength(2);
    expect(impl.methods[0].name).toBe('constructor');
    expect(impl.methods[0].body).toContain('super->constructor( ).');
    expect(impl.methods[0].body).toContain('me->x = 1.');
    expect(impl.methods[1].name).toBe('ping');
    expect(impl.methods[1].body).toContain('RETURN.');
  });

  it('parses an INTERFACES member statement', () => {
    const src = [
      'CLASS zcl_foo DEFINITION PUBLIC FINAL CREATE PUBLIC.',
      '  PUBLIC SECTION.',
      '    INTERFACES zif_petstore3.',
      'ENDCLASS.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const cls = ast.definitions[0];
    if (cls.kind !== 'ClassDef') return;
    const stmt = cls.sections[0].members[0];
    expect(stmt.kind).toBe('InterfaceStmt');
    if (stmt.kind !== 'InterfaceStmt') return;
    expect(stmt.name).toBe('zif_petstore3');
  });

  it('preserves unrecognised members as RawMember', () => {
    const src = [
      'CLASS zcl_foo DEFINITION PUBLIC FINAL CREATE PUBLIC.',
      '  PUBLIC SECTION.',
      '    EVENTS changed.', // EVENTS not in MVP grammar
      'ENDCLASS.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const cls = ast.definitions[0];
    if (cls.kind !== 'ClassDef') return;
    const raw = cls.sections[0].members[0];
    expect(raw.kind).toBe('RawMember');
    if (raw.kind !== 'RawMember') return;
    expect(raw.source).toContain('EVENTS');
    expect(raw.source).toContain('changed');
  });
});

describe('parse — error handling', () => {
  it('returns errors instead of throwing for unrecognised top-level tokens', () => {
    const { errors } = parse('GARBAGE.');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].severity).toBe('error');
  });

  it('never throws even for empty input', () => {
    const { ast, errors } = parse('');
    expect(ast.definitions).toEqual([]);
    expect(errors).toEqual([]);
  });

  it('is robust against a missing ENDCLASS', () => {
    const { ast, errors } = parse(
      'CLASS zcl_x DEFINITION PUBLIC.\n  PUBLIC SECTION.\n',
    );
    // Should not throw; produces at least the opening ClassDef.
    expect(ast.definitions.length).toBeGreaterThan(0);
    // Errors may or may not include diagnostics — the contract is only
    // "doesn't throw and produces a best-effort AST".
    void errors;
  });
});

describe('parse — ABAP keywords used as names', () => {
  it('accepts a parameter named `data` (keyword-as-name)', () => {
    const src = [
      'INTERFACE zif_x PUBLIC.',
      '  METHODS foo IMPORTING data TYPE i.',
      'ENDINTERFACE.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const iface = ast.definitions[0];
    if (iface.kind !== 'InterfaceDef') throw new Error('expected InterfaceDef');
    const m = iface.members[0];
    if (m.kind !== 'MethodDecl') throw new Error('expected MethodDecl');
    expect(m.importing[0].name).toBe('data');
    expect(m.importing[0].type.source).toBe('i');
  });

  it('accepts REF TO <keyword-named-type>', () => {
    const src = [
      'INTERFACE zif_x PUBLIC.',
      '  TYPES generic_ref TYPE REF TO data.',
      'ENDINTERFACE.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const iface = ast.definitions[0];
    if (iface.kind !== 'InterfaceDef') throw new Error('expected InterfaceDef');
    const td = iface.members[0];
    if (td.kind !== 'TypeDecl') throw new Error('expected TypeDecl');
    if (td.shape.kind !== 'alias') throw new Error('expected alias');
    expect(td.shape.type.kind).toBe('RefToTypeRef');
    if (td.shape.type.kind !== 'RefToTypeRef') return;
    expect(td.shape.type.target.source).toBe('data');
  });

  it('accepts a structure field named after an ABAP keyword', () => {
    const src = [
      'INTERFACE zif_x PUBLIC.',
      '  TYPES: BEGIN OF row,',
      '    type  TYPE string,',
      '    data  TYPE i,',
      '    value TYPE string,',
      '  END OF row.',
      'ENDINTERFACE.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const iface = ast.definitions[0];
    if (iface.kind !== 'InterfaceDef') throw new Error('expected InterfaceDef');
    const td = iface.members[0];
    if (td.kind !== 'TypeDecl') throw new Error('expected TypeDecl');
    if (td.shape.kind !== 'structure') throw new Error('expected structure');
    const fields = td.shape.fields.map((f) => f.name);
    expect(fields).toEqual(['type', 'data', 'value']);
  });

  it('accepts qualified type references where either side is a keyword', () => {
    const src = [
      'INTERFACE zif_x PUBLIC.',
      '  TYPES foo TYPE zif_y=>data.',
      'ENDINTERFACE.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const iface = ast.definitions[0];
    if (iface.kind !== 'InterfaceDef') throw new Error('expected InterfaceDef');
    const td = iface.members[0];
    if (td.kind !== 'TypeDecl' || td.shape.kind !== 'alias') return;
    expect(td.shape.type.source).toBe('zif_y=>data');
  });
});

describe('parse — MethodImpl.bodySpan', () => {
  it('bodySpan.startLine points at the first line of the method body, not at METHOD', () => {
    const src = [
      'CLASS zcl_x IMPLEMENTATION.',
      '  METHOD foo.', // line 2
      '    RETURN.', // line 3 — this is where bodySpan should start
      '  ENDMETHOD.',
      'ENDCLASS.',
    ].join('\n');
    const { ast } = parse(src);
    const impl = ast.definitions.find((d) => d.kind === 'ClassImpl');
    if (impl?.kind !== 'ClassImpl') throw new Error('expected ClassImpl');
    const m = impl.methods[0];
    expect(m.span.startLine).toBe(2); // METHOD keyword line
    expect(m.bodySpan.startLine).toBe(3); // body content line
  });

  it('empty method body still produces a valid bodySpan', () => {
    const src = [
      'CLASS zcl_x IMPLEMENTATION.',
      '  METHOD noop.',
      '  ENDMETHOD.',
      'ENDCLASS.',
    ].join('\n');
    const { ast, errors } = parse(src);
    expect(errors).toEqual([]);
    const impl = ast.definitions.find((d) => d.kind === 'ClassImpl');
    if (impl?.kind !== 'ClassImpl') throw new Error('expected ClassImpl');
    const m = impl.methods[0];
    // Empty body span must still be well-ordered (end >= start - 1 is the
    // degenerate empty-range case; start should never land past end of file).
    expect(m.bodySpan.startOffset).toBeLessThanOrEqual(
      m.bodySpan.endOffset + 1,
    );
    expect(m.body.trim()).toBe('');
  });
});
