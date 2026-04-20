import { describe, expect, it } from 'vitest';
import {
  AbapAstError,
  append,
  assign,
  attributeDef,
  binOp,
  builtinType,
  call,
  cast,
  classDef,
  clear,
  comment,
  constantDecl,
  constructorExpr,
  continueStmt,
  dataDecl,
  enumType,
  eventDef,
  exit,
  fieldSymbolDecl,
  identifierExpr,
  ifStmt,
  insert,
  interfaceDef,
  literal,
  localClassDef,
  loop,
  methodCallExpr,
  methodDef,
  methodImpl,
  methodParam,
  namedTypeRef,
  raise,
  raw,
  read,
  returnStmt,
  section,
  stringTemplate,
  structureType,
  tableType,
  tryStmt,
  typeDef,
} from '../src/nodes';

describe('base / comment', () => {
  it('builds a line comment by default', () => {
    const c = comment({ text: 'hello' });
    expect(c).toMatchObject({ kind: 'Comment', text: 'hello', style: 'line' });
  });
  it('accepts style star', () => {
    expect(comment({ text: 'x', style: 'star' }).style).toBe('star');
  });
});

describe('types', () => {
  it('builtinType returns tagged node', () => {
    const t = builtinType({ name: 'string' });
    expect(t).toMatchObject({ kind: 'BuiltinType', name: 'string' });
  });
  it('builtinType rejects unknown name', () => {
    expect(() =>
      builtinType({ name: 'nope' as unknown as 'string' }),
    ).toThrowError(AbapAstError);
  });
  it('namedTypeRef requires a name', () => {
    expect(() => namedTypeRef({ name: '' })).toThrowError(/name/);
  });
  it('namedTypeRef builds', () => {
    expect(namedTypeRef({ name: 'zif_foo=>ty' }).name).toBe('zif_foo=>ty');
  });
  it('tableType defaults to standard', () => {
    const t = tableType({ rowType: builtinType({ name: 'i' }) });
    expect(t.tableKind).toBe('standard');
    expect(t.kind).toBe('TableType');
  });
  it('structureType requires at least one field', () => {
    expect(() => structureType({ fields: [] })).toThrowError(
      /at least one field/,
    );
  });
  it('structureType builds', () => {
    const s = structureType({
      fields: [{ name: 'id', type: builtinType({ name: 'i' }) }],
    });
    expect(s.kind).toBe('StructureType');
    expect(s.fields).toHaveLength(1);
  });
  it('enumType requires members', () => {
    expect(() =>
      enumType({ baseType: builtinType({ name: 'i' }), members: [] }),
    ).toThrowError(/at least one member/);
  });
  it('enumType builds', () => {
    const e = enumType({
      baseType: builtinType({ name: 'i' }),
      members: [{ name: 'A', value: 1 }],
    });
    expect(e.kind).toBe('EnumType');
  });
  it('typeDef requires name', () => {
    expect(() =>
      typeDef({ name: '', type: builtinType({ name: 'i' }) }),
    ).toThrowError(/name/);
  });
  it('typeDef builds', () => {
    const td = typeDef({
      name: 'ty_id',
      type: builtinType({ name: 'string' }),
    });
    expect(td).toMatchObject({ kind: 'TypeDef', name: 'ty_id' });
  });
});

describe('data decls', () => {
  it('dataDecl builds', () => {
    const d = dataDecl({
      name: 'lv_x',
      type: builtinType({ name: 'i' }),
    });
    expect(d.kind).toBe('DataDecl');
  });
  it('dataDecl requires name', () => {
    expect(() =>
      dataDecl({ name: '', type: builtinType({ name: 'i' }) }),
    ).toThrowError(/name/);
  });
  it('constantDecl requires value', () => {
    expect(() =>
      constantDecl({
        name: 'c',
        type: builtinType({ name: 'i' }),
        value: undefined as unknown as ReturnType<typeof literal>,
      }),
    ).toThrowError(/value/);
  });
  it('constantDecl builds', () => {
    const c = constantDecl({
      name: 'c_a',
      type: builtinType({ name: 'i' }),
      value: literal({ literalKind: 'int', value: 1 }),
    });
    expect(c.kind).toBe('ConstantDecl');
  });
  it('fieldSymbolDecl requires angle brackets', () => {
    expect(() =>
      fieldSymbolDecl({ name: 'fs_x', type: builtinType({ name: 'i' }) }),
    ).toThrowError(/angle brackets/);
  });
  it('fieldSymbolDecl builds', () => {
    const fs = fieldSymbolDecl({
      name: '<fs_x>',
      type: builtinType({ name: 'i' }),
    });
    expect(fs.kind).toBe('FieldSymbolDecl');
  });
});

describe('expressions', () => {
  it('literal int requires number', () => {
    expect(() =>
      literal({ literalKind: 'int', value: 'nope' as unknown as number }),
    ).toThrowError(/number/);
  });
  it('literal bool requires boolean', () => {
    expect(() =>
      literal({ literalKind: 'bool', value: 1 as unknown as boolean }),
    ).toThrowError(/boolean/);
  });
  it('literal string builds', () => {
    expect(literal({ literalKind: 'string', value: 'hi' }).kind).toBe(
      'Literal',
    );
  });
  it('identifierExpr builds', () => {
    expect(identifierExpr({ name: 'lv_x' }).kind).toBe('IdentifierExpr');
  });
  it('constructorExpr builds', () => {
    expect(
      constructorExpr({ type: namedTypeRef({ name: 'zcl_x' }) }).kind,
    ).toBe('ConstructorExpr');
  });
  it('methodCallExpr instance requires receiver', () => {
    expect(() =>
      methodCallExpr({ method: 'm', callKind: 'instance' }),
    ).toThrowError(/receiver/);
  });
  it('methodCallExpr static builds', () => {
    const m = methodCallExpr({ method: 'do', callKind: 'static' });
    expect(m.kind).toBe('MethodCallExpr');
  });
  it('binOp requires all fields', () => {
    expect(() =>
      binOp({
        op: '=',
        left: undefined as unknown as ReturnType<typeof literal>,
        right: literal({ literalKind: 'int', value: 1 }),
      }),
    ).toThrowError(/left/);
  });
  it('binOp builds', () => {
    expect(
      binOp({
        op: '=',
        left: identifierExpr({ name: 'a' }),
        right: literal({ literalKind: 'int', value: 1 }),
      }).kind,
    ).toBe('BinOp');
  });
  it('stringTemplate builds', () => {
    const t = stringTemplate({
      parts: [
        { partKind: 'text', text: 'hi ' },
        { partKind: 'expr', expr: identifierExpr({ name: 'lv' }) },
      ],
    });
    expect(t.kind).toBe('StringTemplate');
  });
  it('cast builds', () => {
    const c = cast({
      type: namedTypeRef({ name: 'zcl_foo' }),
      expr: identifierExpr({ name: 'x' }),
    });
    expect(c.kind).toBe('Cast');
  });
});

describe('statements', () => {
  const idX = identifierExpr({ name: 'lv_x' });
  const n1 = literal({ literalKind: 'int', value: 1 });

  it('assign builds', () => {
    expect(assign({ target: idX, value: n1 }).kind).toBe('Assign');
  });
  it('call static builds', () => {
    expect(call({ method: 'do', callKind: 'static' }).kind).toBe('Call');
  });
  it('call instance requires receiver', () => {
    expect(() => call({ method: 'do', callKind: 'instance' })).toThrowError(
      /receiver/,
    );
  });
  it('raise builds', () => {
    expect(raise({ exceptionType: namedTypeRef({ name: 'zcx_x' }) }).kind).toBe(
      'Raise',
    );
  });
  it('ifStmt builds with elseif/else', () => {
    const s = ifStmt({
      condition: binOp({ op: '=', left: idX, right: n1 }),
      then: [returnStmt()],
      elseIfs: [
        { condition: binOp({ op: '=', left: idX, right: n1 }), body: [exit()] },
      ],
      else: [continueStmt()],
    });
    expect(s.kind).toBe('If');
    expect(s.elseIfs).toHaveLength(1);
  });
  it('loop rejects non-bracket assigning target', () => {
    expect(() =>
      loop({
        table: idX,
        binding: { bindKind: 'assigning', fieldSymbol: 'fs_y' },
        body: [],
      }),
    ).toThrowError(/angle brackets/);
  });
  it('loop builds', () => {
    const l = loop({
      table: idX,
      binding: { bindKind: 'into', target: 'ls_wa' },
      body: [],
    });
    expect(l.kind).toBe('Loop');
  });
  it('returnStmt without value', () => {
    expect(returnStmt().kind).toBe('Return');
  });
  it('try requires at least one catch', () => {
    expect(() => tryStmt({ body: [], catches: [] })).toThrowError(/CATCH/);
  });
  it('try builds', () => {
    const t = tryStmt({
      body: [returnStmt()],
      catches: [
        {
          exceptionTypes: [namedTypeRef({ name: 'zcx_x' })],
          body: [exit()],
        },
      ],
    });
    expect(t.kind).toBe('Try');
  });
  it('append/insert/read/clear/exit/continue/raw build', () => {
    expect(append({ value: idX, table: idX }).kind).toBe('Append');
    expect(insert({ value: idX, table: idX }).kind).toBe('Insert');
    expect(
      read({
        table: idX,
        binding: { bindKind: 'into', target: 'ls_wa' },
      }).kind,
    ).toBe('Read');
    expect(clear({ target: idX }).kind).toBe('Clear');
    expect(exit().kind).toBe('Exit');
    expect(continueStmt().kind).toBe('Continue');
    expect(raw({ source: 'WRITE /.' }).kind).toBe('Raw');
  });
  it('raw rejects empty source', () => {
    expect(() => raw({ source: '' })).toThrowError(/source/);
  });
});

describe('members', () => {
  const i = builtinType({ name: 'i' });

  it('methodParam rejects optional RETURNING', () => {
    expect(() =>
      methodParam({
        paramKind: 'returning',
        name: 'rv',
        typeRef: i,
        optional: true,
      }),
    ).toThrowError(/optional/);
  });
  it('methodParam rejects RETURNING with default', () => {
    expect(() =>
      methodParam({
        paramKind: 'returning',
        name: 'rv',
        typeRef: i,
        default: literal({ literalKind: 'int', value: 0 }),
      }),
    ).toThrowError(/default/);
  });
  it('methodParam builds', () => {
    expect(
      methodParam({ paramKind: 'importing', name: 'iv', typeRef: i }).kind,
    ).toBe('MethodParam');
  });
  it('methodDef rejects returning + exporting', () => {
    expect(() =>
      methodDef({
        name: 'm',
        visibility: 'public',
        params: [
          methodParam({ paramKind: 'returning', name: 'rv', typeRef: i }),
          methodParam({ paramKind: 'exporting', name: 'ev', typeRef: i }),
        ],
      }),
    ).toThrowError(/RETURNING/);
  });
  it('methodDef rejects multiple returning', () => {
    expect(() =>
      methodDef({
        name: 'm',
        visibility: 'public',
        params: [
          methodParam({ paramKind: 'returning', name: 'rv1', typeRef: i }),
          methodParam({ paramKind: 'returning', name: 'rv2', typeRef: i }),
        ],
      }),
    ).toThrowError(/at most one RETURNING/);
  });
  it('methodDef builds', () => {
    expect(methodDef({ name: 'm', visibility: 'public' }).kind).toBe(
      'MethodDef',
    );
  });
  it('methodImpl builds', () => {
    expect(methodImpl({ name: 'm', body: [exit()] }).kind).toBe('MethodImpl');
  });
  it('eventDef builds', () => {
    expect(eventDef({ name: 'e', visibility: 'public' }).kind).toBe('EventDef');
  });
  it('attributeDef builds', () => {
    expect(
      attributeDef({ name: 'a', type: i, visibility: 'public' }).kind,
    ).toBe('AttributeDef');
  });
});

describe('class / interface', () => {
  const i = builtinType({ name: 'i' });

  it('section rejects mismatched visibility', () => {
    expect(() =>
      section({
        visibility: 'public',
        members: [methodDef({ name: 'm', visibility: 'private' })],
      }),
    ).toThrowError(/visibility/);
  });
  it('section builds', () => {
    expect(
      section({
        visibility: 'public',
        members: [methodDef({ name: 'm', visibility: 'public' })],
      }).kind,
    ).toBe('Section');
  });
  it('classDef rejects final + abstract', () => {
    expect(() =>
      classDef({ name: 'zcl_x', isFinal: true, isAbstract: true }),
    ).toThrowError(/FINAL and ABSTRACT/);
  });
  it('classDef builds', () => {
    expect(classDef({ name: 'zcl_x' }).kind).toBe('ClassDef');
  });
  it('localClassDef builds with local=true', () => {
    expect(localClassDef({ name: 'lcl_x' }).local).toBe(true);
  });
  it('interfaceDef rejects non-public methods', () => {
    expect(() =>
      interfaceDef({
        name: 'zif',
        members: [methodDef({ name: 'm', visibility: 'private' })],
      }),
    ).toThrowError(/public/);
  });
  it('interfaceDef builds', () => {
    expect(interfaceDef({ name: 'zif' }).kind).toBe('InterfaceDef');
  });

  it('composite: ClassDef with TypeDef + AttributeDef + MethodDef containing LOOP', () => {
    const tyId = typeDef({ name: 'ty_id', type: i });
    const attr = attributeDef({
      name: 'mv_count',
      type: i,
      visibility: 'private',
    });
    const method = methodDef({
      name: 'iterate',
      visibility: 'public',
      params: [
        methodParam({
          paramKind: 'importing',
          name: 'it_items',
          typeRef: tableType({ rowType: i }),
        }),
      ],
    });
    const impl = methodImpl({
      name: 'iterate',
      body: [
        loop({
          table: identifierExpr({ name: 'it_items' }),
          binding: { bindKind: 'assigning', fieldSymbol: '<fs_item>' },
          body: [
            assign({
              target: identifierExpr({ name: 'mv_count' }),
              value: binOp({
                op: '+',
                left: identifierExpr({ name: 'mv_count' }),
                right: literal({ literalKind: 'int', value: 1 }),
              }),
            }),
          ],
        }),
      ],
    });
    const cls = classDef({
      name: 'zcl_foo',
      isFinal: true,
      sections: [
        section({ visibility: 'public', members: [method] }),
        section({ visibility: 'private', members: [tyId, attr] }),
      ],
      implementations: [impl],
    });
    expect(cls.kind).toBe('ClassDef');
    expect(cls.sections).toHaveLength(2);
    expect(cls.implementations[0]?.body[0]?.kind).toBe('Loop');
  });
});
