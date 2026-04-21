import { describe, it, expect } from 'vitest';
import {
  print,
  // nodes — types
  builtinType,
  namedTypeRef,
  tableType,
  structureType,
  enumType,
  typeDef,
  // nodes — data
  dataDecl,
  constantDecl,
  fieldSymbolDecl,
  // nodes — expressions
  literal,
  identifierExpr,
  constructorExpr,
  methodCallExpr,
  binOp,
  stringTemplate,
  cast,
  // nodes — statements
  assign,
  call,
  raise,
  ifStmt,
  loop,
  returnStmt,
  tryStmt,
  append,
  insert,
  read,
  clear,
  exit,
  continueStmt,
  raw,
  comment,
  // nodes — members
  methodParam,
  methodDef,
  methodImpl,
  eventDef,
  attributeDef,
  // nodes — class / interface
  section,
  classDef,
  localClassDef,
  interfaceDef,
} from '../src';

describe('printer — types', () => {
  it('prints a simple builtin TypeDef', () => {
    const node = typeDef({ name: 'ty_num', type: builtinType({ name: 'i' }) });
    expect(print(node)).toMatchInlineSnapshot(`"TYPES ty_num TYPE i."`);
  });

  it('prints a named-type alias', () => {
    const node = typeDef({
      name: 'ty_key',
      type: namedTypeRef({ name: 'zif_core=>ty_key' }),
    });
    expect(print(node)).toMatchInlineSnapshot(
      `"TYPES ty_key TYPE zif_core=>ty_key."`,
    );
  });

  it('prints a structure TypeDef with aligned fields', () => {
    const node = typeDef({
      name: 'ty_row',
      type: structureType({
        fields: [
          { name: 'id', type: builtinType({ name: 'string' }) },
          { name: 'description', type: builtinType({ name: 'string' }) },
          { name: 'count', type: builtinType({ name: 'i' }) },
        ],
      }),
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "TYPES: BEGIN OF ty_row,
        id          TYPE string,
        description TYPE string,
        count       TYPE i,
      END OF ty_row."
    `);
  });

  it('prints a table TypeDef (standard, default key)', () => {
    const node = typeDef({
      name: 'ty_list',
      type: tableType({ rowType: namedTypeRef({ name: 'ty_row' }) }),
    });
    expect(print(node)).toMatchInlineSnapshot(
      `"TYPES ty_list TYPE STANDARD TABLE OF ty_row WITH DEFAULT KEY."`,
    );
  });

  it('prints a sorted table with unique key', () => {
    const node = typeDef({
      name: 'ty_sorted',
      type: tableType({
        rowType: namedTypeRef({ name: 'ty_row' }),
        tableKind: 'sorted',
        uniqueness: 'unique',
        keyFields: ['id'],
      }),
    });
    expect(print(node)).toMatchInlineSnapshot(
      `"TYPES ty_sorted TYPE SORTED TABLE OF ty_row WITH UNIQUE KEY id."`,
    );
  });

  it('prints an enum TypeDef', () => {
    const node = typeDef({
      name: 'ty_weekday',
      type: enumType({
        baseType: builtinType({ name: 'i' }),
        members: [
          { name: 'monday', value: 1 },
          { name: 'tuesday', value: 2 },
          { name: 'wednesday', value: 3 },
        ],
      }),
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "TYPES: BEGIN OF ENUM ty_weekday BASE TYPE i,
        monday    VALUE 1,
        tuesday   VALUE 2,
        wednesday VALUE 3,
      END OF ENUM ty_weekday."
    `);
  });
});

describe('printer — expressions (as top-level)', () => {
  it('prints a string literal', () => {
    expect(print(literal({ literalKind: 'string', value: "it's" }))).toBe(
      "'it''s'",
    );
  });

  it('prints int / bool / hex literals', () => {
    expect(print(literal({ literalKind: 'int', value: 42 }))).toBe('42');
    expect(print(literal({ literalKind: 'bool', value: true }))).toBe(
      'abap_true',
    );
    expect(print(literal({ literalKind: 'hex', value: '0AFF' }))).toBe(
      "'0AFF'",
    );
  });

  it('prints an identifier expression', () => {
    expect(print(identifierExpr({ name: 'lv_x' }))).toBe('lv_x');
  });

  it('prints a constructor expression', () => {
    const node = constructorExpr({
      type: namedTypeRef({ name: 'zcl_thing' }),
      args: [
        { name: 'iv_x', value: literal({ literalKind: 'int', value: 1 }) },
      ],
    });
    expect(print(node)).toBe('NEW zcl_thing( iv_x = 1 )');
  });

  it('prints a static method call', () => {
    const node = methodCallExpr({
      receiver: identifierExpr({ name: 'cl_foo' }),
      method: 'bar',
      callKind: 'static',
      args: [],
    });
    expect(print(node)).toBe('cl_foo=>bar( )');
  });

  it('prints an instance method call with named args', () => {
    const node = methodCallExpr({
      receiver: identifierExpr({ name: 'ref' }),
      method: 'run',
      callKind: 'instance',
      args: [
        { name: 'iv_a', value: literal({ literalKind: 'int', value: 1 }) },
        { name: 'iv_b', value: literal({ literalKind: 'int', value: 2 }) },
      ],
    });
    expect(print(node)).toBe('ref->run( iv_a = 1 iv_b = 2 )');
  });

  it('prints a binary comparison', () => {
    const node = binOp({
      op: '=',
      left: identifierExpr({ name: 'lv_x' }),
      right: literal({ literalKind: 'int', value: 0 }),
    });
    expect(print(node)).toBe('lv_x = 0');
  });

  it('prints AND/OR with keyword case', () => {
    const node = binOp({
      op: 'AND',
      left: identifierExpr({ name: 'a' }),
      right: identifierExpr({ name: 'b' }),
    });
    expect(print(node)).toBe('a AND b');
  });

  it('prints a string template', () => {
    const node = stringTemplate({
      parts: [
        { partKind: 'text', text: 'Hello, ' },
        { partKind: 'expr', expr: identifierExpr({ name: 'iv_name' }) },
        { partKind: 'text', text: '!' },
      ],
    });
    expect(print(node)).toBe('|Hello, { iv_name }!|');
  });

  it('prints a CAST', () => {
    const node = cast({
      type: namedTypeRef({ name: 'zcl_x' }),
      expr: identifierExpr({ name: 'ref' }),
    });
    expect(print(node)).toBe('CAST zcl_x( ref )');
  });
});

describe('printer — statements', () => {
  it('Assign', () => {
    expect(
      print(
        assign({
          target: identifierExpr({ name: 'lv_x' }),
          value: literal({ literalKind: 'int', value: 1 }),
        }),
      ),
    ).toMatchInlineSnapshot(`"lv_x = 1."`);
  });

  it('Call (static, no args)', () => {
    expect(
      print(
        call({
          receiver: identifierExpr({ name: 'cl_foo' }),
          method: 'run',
          callKind: 'static',
        }),
      ),
    ).toMatchInlineSnapshot(`"cl_foo=>run( )."`);
  });

  it('Call (instance, named args)', () => {
    expect(
      print(
        call({
          receiver: identifierExpr({ name: 'ref' }),
          method: 'do',
          callKind: 'instance',
          args: [
            {
              name: 'iv_a',
              value: literal({ literalKind: 'int', value: 1 }),
            },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`"ref->do( iv_a = 1 )."`);
  });

  it('Raise', () => {
    expect(
      print(
        raise({
          exceptionType: namedTypeRef({ name: 'zcx_bad' }),
          args: [
            {
              name: 'textid',
              value: identifierExpr({ name: 'zcx_bad=>ouch' }),
            },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(
      `"RAISE EXCEPTION NEW zcx_bad( textid = zcx_bad=>ouch )."`,
    );
  });

  it('If / ElseIf / Else', () => {
    const node = ifStmt({
      condition: binOp({
        op: '=',
        left: identifierExpr({ name: 'lv_x' }),
        right: literal({ literalKind: 'int', value: 1 }),
      }),
      thenBody: [
        assign({
          target: identifierExpr({ name: 'lv_y' }),
          value: literal({ literalKind: 'int', value: 10 }),
        }),
      ],
      elseIfs: [
        {
          condition: binOp({
            op: '=',
            left: identifierExpr({ name: 'lv_x' }),
            right: literal({ literalKind: 'int', value: 2 }),
          }),
          body: [
            assign({
              target: identifierExpr({ name: 'lv_y' }),
              value: literal({ literalKind: 'int', value: 20 }),
            }),
          ],
        },
      ],
      else: [
        assign({
          target: identifierExpr({ name: 'lv_y' }),
          value: literal({ literalKind: 'int', value: 0 }),
        }),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "IF lv_x = 1.
        lv_y = 10.
      ELSEIF lv_x = 2.
        lv_y = 20.
      ELSE.
        lv_y = 0.
      ENDIF."
    `);
  });

  it('Loop with Assign inside', () => {
    const node = loop({
      table: identifierExpr({ name: 'lt_rows' }),
      binding: { bindKind: 'assigning', fieldSymbol: '<fs_row>' },
      body: [
        assign({
          target: identifierExpr({ name: '<fs_row>-count' }),
          value: literal({ literalKind: 'int', value: 0 }),
        }),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "LOOP AT lt_rows ASSIGNING <fs_row>.
        <fs_row>-count = 0.
      ENDLOOP."
    `);
  });

  it('Return with value', () => {
    expect(
      print(
        returnStmt({
          value: identifierExpr({ name: 'lv_result' }),
          target: 'rv_result',
        }),
      ),
    ).toMatchInlineSnapshot(`
        "rv_result = lv_result.
        RETURN."
      `);
  });

  it('Return without value', () => {
    expect(print(returnStmt())).toMatchInlineSnapshot(`"RETURN."`);
  });

  it('Try / Catch / Cleanup', () => {
    const node = tryStmt({
      body: [
        call({
          receiver: identifierExpr({ name: 'cl_x' }),
          method: 'run',
          callKind: 'static',
        }),
      ],
      catches: [
        {
          exceptionTypes: [namedTypeRef({ name: 'zcx_bad' })],
          into: 'lx_err',
          body: [
            raise({
              exceptionType: namedTypeRef({ name: 'zcx_bad' }),
              args: [],
            }),
          ],
        },
      ],
      cleanup: [clear({ target: identifierExpr({ name: 'lv_x' }) })],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "TRY.
        cl_x=>run( ).
      CATCH zcx_bad INTO lx_err.
        RAISE EXCEPTION NEW zcx_bad( ).
      CLEANUP.
        CLEAR lv_x.
      ENDTRY."
    `);
  });

  it('Append / Insert', () => {
    expect(
      print(
        append({
          value: identifierExpr({ name: 'ls_row' }),
          table: identifierExpr({ name: 'lt_rows' }),
        }),
      ),
    ).toMatchInlineSnapshot(`"APPEND ls_row TO lt_rows."`);
    expect(
      print(
        insert({
          value: identifierExpr({ name: 'ls_row' }),
          table: identifierExpr({ name: 'lt_rows' }),
        }),
      ),
    ).toMatchInlineSnapshot(`"INSERT ls_row INTO TABLE lt_rows."`);
  });

  it('Read with WITH KEY and INTO', () => {
    const node = read({
      table: identifierExpr({ name: 'lt_rows' }),
      binding: { bindKind: 'into', target: 'ls_row' },
      withKey: [
        { name: 'id', value: literal({ literalKind: 'string', value: 'X' }) },
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(
      `"READ TABLE lt_rows INTO ls_row WITH KEY id = 'X'."`,
    );
  });

  it('Clear / Exit / Continue', () => {
    expect(
      print(clear({ target: identifierExpr({ name: 'lv_x' }) })),
    ).toMatchInlineSnapshot(`"CLEAR lv_x."`);
    expect(print(exit())).toMatchInlineSnapshot(`"EXIT."`);
    expect(print(continueStmt())).toMatchInlineSnapshot(`"CONTINUE."`);
  });

  it('Raw', () => {
    expect(print(raw({ source: 'WRITE / `hello`.' }))).toMatchInlineSnapshot(
      `"WRITE / \`hello\`."`,
    );
  });

  it('Comment (line)', () => {
    expect(print(comment({ text: 'hi', style: 'line' }))).toBe('" hi');
  });

  it('Comment (star)', () => {
    expect(print(comment({ text: 'hi', style: 'star' }))).toMatchInlineSnapshot(
      `"* hi"`,
    );
  });

  it('DataDecl / FieldSymbolDecl', () => {
    expect(
      print(dataDecl({ name: 'lv_x', type: builtinType({ name: 'i' }) })),
    ).toMatchInlineSnapshot(`"DATA lv_x TYPE i."`);
    expect(
      print(
        fieldSymbolDecl({
          name: '<fs_row>',
          type: namedTypeRef({ name: 'ty_row' }),
        }),
      ),
    ).toMatchInlineSnapshot(`"FIELD-SYMBOLS <fs_row> TYPE ty_row."`);
  });

  it('ConstantDecl', () => {
    expect(
      print(
        constantDecl({
          name: 'c_max',
          type: builtinType({ name: 'i' }),
          value: literal({ literalKind: 'int', value: 10 }),
        }),
      ),
    ).toMatchInlineSnapshot(`"CONSTANTS c_max TYPE i VALUE 10."`);
  });
});

describe('printer — members', () => {
  it('AttributeDef (instance)', () => {
    expect(
      print(
        attributeDef({
          name: 'mv_x',
          type: builtinType({ name: 'string' }),
          visibility: 'private',
        }),
      ),
    ).toMatchInlineSnapshot(`"DATA mv_x TYPE string."`);
  });

  it('AttributeDef (class-data, read-only, initial)', () => {
    expect(
      print(
        attributeDef({
          name: 'gv_n',
          type: builtinType({ name: 'i' }),
          visibility: 'public',
          classData: true,
          readOnly: true,
          initial: literal({ literalKind: 'int', value: 0 }),
        }),
      ),
    ).toMatchInlineSnapshot(`"CLASS-DATA gv_n TYPE i READ-ONLY VALUE 0."`);
  });

  it('EventDef', () => {
    expect(
      print(eventDef({ name: 'changed', visibility: 'public' })),
    ).toMatchInlineSnapshot(`"EVENTS changed."`);
  });

  it('MethodDef — no params, no raising', () => {
    expect(
      print(methodDef({ name: 'ping', visibility: 'public' })),
    ).toMatchInlineSnapshot(`"METHODS ping."`);
  });

  it('MethodDef — importing + returning + raising', () => {
    const node = methodDef({
      name: 'greet',
      visibility: 'public',
      params: [
        methodParam({
          paramKind: 'importing',
          name: 'iv_name',
          typeRef: builtinType({ name: 'string' }),
        }),
        methodParam({
          paramKind: 'returning',
          name: 'rv_msg',
          typeRef: builtinType({ name: 'string' }),
        }),
      ],
      raising: [namedTypeRef({ name: 'zcx_greet_error' })],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "METHODS greet
        IMPORTING iv_name TYPE string
        RETURNING VALUE(rv_msg) TYPE string
        RAISING zcx_greet_error."
    `);
  });

  it('MethodImpl', () => {
    const node = methodImpl({
      name: 'greet',
      body: [
        assign({
          target: identifierExpr({ name: 'rv_msg' }),
          value: stringTemplate({
            parts: [
              { partKind: 'text', text: 'Hi, ' },
              { partKind: 'expr', expr: identifierExpr({ name: 'iv_name' }) },
            ],
          }),
        }),
        returnStmt(),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "METHOD greet.
        rv_msg = |Hi, { iv_name }|.
        RETURN.
      ENDMETHOD."
    `);
  });
});

describe('printer — interface', () => {
  it('prints an interface with a method and a type', () => {
    const node = interfaceDef({
      name: 'zif_greeter',
      members: [
        typeDef({ name: 'ty_name', type: builtinType({ name: 'string' }) }),
        methodDef({
          name: 'greet',
          visibility: 'public',
          params: [
            methodParam({
              paramKind: 'importing',
              name: 'iv_name',
              typeRef: namedTypeRef({ name: 'ty_name' }),
            }),
            methodParam({
              paramKind: 'returning',
              name: 'rv_msg',
              typeRef: builtinType({ name: 'string' }),
            }),
          ],
        }),
      ],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "INTERFACE zif_greeter PUBLIC.
        TYPES ty_name TYPE string.
        METHODS greet
          IMPORTING iv_name TYPE ty_name
          RETURNING VALUE(rv_msg) TYPE string.
      ENDINTERFACE."
    `);
  });
});

describe('printer — Section (error)', () => {
  it('throws for Section as top-level', () => {
    const sec = section({ visibility: 'public' });
    expect(() => print(sec)).toThrow(/Section/);
  });

  it('throws for MethodParam as top-level', () => {
    const p = methodParam({
      paramKind: 'importing',
      name: 'iv_x',
      typeRef: builtinType({ name: 'string' }),
    });
    expect(() => print(p)).toThrow(/MethodParam/);
  });

  it('throws for TableType as top-level', () => {
    const tt = tableType({ rowType: namedTypeRef({ name: 'ty_row' }) });
    expect(() => print(tt)).toThrow(/TableType/);
  });
});

describe('printer — LocalClassDef', () => {
  it('prints a local exception class definition', () => {
    const node = localClassDef({
      name: 'lcx_bad',
      superclass: 'cx_static_check',
      isFinal: true,
      sections: [section({ visibility: 'public' })],
    });
    expect(print(node)).toMatchInlineSnapshot(`
      "CLASS lcx_bad DEFINITION FINAL INHERITING FROM cx_static_check.
        PUBLIC SECTION.
      ENDCLASS."
    `);
  });
});

describe('printer — ClassDef (composite)', () => {
  const composite = buildCompositeClass();

  it('prints the composite class snapshot', () => {
    expect(print(composite)).toMatchInlineSnapshot(`
      "CLASS zcl_greeter DEFINITION PUBLIC FINAL CREATE PUBLIC.
        PUBLIC SECTION.
          TYPES: BEGIN OF ty_row,
            id          TYPE string,
            description TYPE string,
            count       TYPE i,
          END OF ty_row.
          TYPES ty_rows TYPE STANDARD TABLE OF ty_row WITH DEFAULT KEY.
          TYPES: BEGIN OF ENUM ty_mode BASE TYPE i,
            quiet VALUE 0,
            loud  VALUE 1,
          END OF ENUM ty_mode.
          DATA mv_prefix TYPE string.
          METHODS greet
            IMPORTING iv_name TYPE string
            RETURNING VALUE(rv_msg) TYPE string
            RAISING zcx_greet_error.
      ENDCLASS.

      CLASS zcl_greeter IMPLEMENTATION.
        METHOD greet.
          DATA lt_rows TYPE ty_rows.
          cl_log=>write( iv_text = iv_name ).
          rv_msg = |Hi, { iv_name }!|.
          IF iv_name = ''.
            RAISE EXCEPTION NEW zcx_greet_error( ).
          ELSE.
            rv_msg = |Hi, { iv_name }!|.
          ENDIF.
          LOOP AT lt_rows ASSIGNING <fs_row>.
            <fs_row>-count = 0.
          ENDLOOP.
          rv_msg = rv_msg.
          RETURN.
        ENDMETHOD.
      ENDCLASS."
    `);
  });

  it('is deterministic across calls', () => {
    const a = print(composite);
    const b = print(composite);
    expect(a).toBe(b);
  });

  it('prints the local exception class', () => {
    const lcx = localClassDef({
      name: 'lcx_greet_error',
      superclass: 'cx_static_check',
      isFinal: true,
      sections: [section({ visibility: 'public' })],
    });
    expect(print(lcx)).toMatchInlineSnapshot(`
      "CLASS lcx_greet_error DEFINITION FINAL INHERITING FROM cx_static_check.
        PUBLIC SECTION.
      ENDCLASS."
    `);
  });
});

describe('printer — keyword case', () => {
  it('lowercases keywords when keywordCase = "lower"', () => {
    const node = typeDef({
      name: 'ty_list',
      type: tableType({ rowType: namedTypeRef({ name: 'ty_row' }) }),
    });
    expect(print(node, { keywordCase: 'lower' })).toMatchInlineSnapshot(
      `"types ty_list type standard table of ty_row with default key."`,
    );
  });

  it('lowercases keywords in a class', () => {
    const node = classDef({
      name: 'zcl_x',
      isFinal: true,
      sections: [
        section({
          visibility: 'public',
          members: [methodDef({ name: 'ping', visibility: 'public' })],
        }),
      ],
      implementations: [methodImpl({ name: 'ping', body: [returnStmt()] })],
    });
    const out = print(node, { keywordCase: 'lower' });
    expect(out).toContain('class zcl_x definition public final create public.');
    expect(out).toContain('public section.');
    expect(out).toContain('methods ping.');
    expect(out).toContain('endclass.');
    expect(out).toContain('method ping.');
    expect(out).toContain('return.');
    expect(out).toContain('endmethod.');
  });
});

function buildCompositeClass() {
  const tyRow = typeDef({
    name: 'ty_row',
    type: structureType({
      fields: [
        { name: 'id', type: builtinType({ name: 'string' }) },
        { name: 'description', type: builtinType({ name: 'string' }) },
        { name: 'count', type: builtinType({ name: 'i' }) },
      ],
    }),
  });
  const tyRows = typeDef({
    name: 'ty_rows',
    type: tableType({ rowType: namedTypeRef({ name: 'ty_row' }) }),
  });
  const tyMode = typeDef({
    name: 'ty_mode',
    type: enumType({
      baseType: builtinType({ name: 'i' }),
      members: [
        { name: 'quiet', value: 0 },
        { name: 'loud', value: 1 },
      ],
    }),
  });
  const attr = attributeDef({
    name: 'mv_prefix',
    type: builtinType({ name: 'string' }),
    visibility: 'public',
  });
  const greet = methodDef({
    name: 'greet',
    visibility: 'public',
    params: [
      methodParam({
        paramKind: 'importing',
        name: 'iv_name',
        typeRef: builtinType({ name: 'string' }),
      }),
      methodParam({
        paramKind: 'returning',
        name: 'rv_msg',
        typeRef: builtinType({ name: 'string' }),
      }),
    ],
    raising: [namedTypeRef({ name: 'zcx_greet_error' })],
  });
  const greetImpl = methodImpl({
    name: 'greet',
    body: [
      dataDecl({ name: 'lt_rows', type: namedTypeRef({ name: 'ty_rows' }) }),
      call({
        receiver: identifierExpr({ name: 'cl_log' }),
        method: 'write',
        callKind: 'static',
        args: [{ name: 'iv_text', value: identifierExpr({ name: 'iv_name' }) }],
      }),
      assign({
        target: identifierExpr({ name: 'rv_msg' }),
        value: stringTemplate({
          parts: [
            { partKind: 'text', text: 'Hi, ' },
            { partKind: 'expr', expr: identifierExpr({ name: 'iv_name' }) },
            { partKind: 'text', text: '!' },
          ],
        }),
      }),
      ifStmt({
        condition: binOp({
          op: '=',
          left: identifierExpr({ name: 'iv_name' }),
          right: literal({ literalKind: 'string', value: '' }),
        }),
        thenBody: [
          raise({
            exceptionType: namedTypeRef({ name: 'zcx_greet_error' }),
            args: [],
          }),
        ],
        else: [
          assign({
            target: identifierExpr({ name: 'rv_msg' }),
            value: stringTemplate({
              parts: [
                { partKind: 'text', text: 'Hi, ' },
                {
                  partKind: 'expr',
                  expr: identifierExpr({ name: 'iv_name' }),
                },
                { partKind: 'text', text: '!' },
              ],
            }),
          }),
        ],
      }),
      loop({
        table: identifierExpr({ name: 'lt_rows' }),
        binding: { bindKind: 'assigning', fieldSymbol: '<fs_row>' },
        body: [
          assign({
            target: identifierExpr({ name: '<fs_row>-count' }),
            value: literal({ literalKind: 'int', value: 0 }),
          }),
        ],
      }),
      returnStmt({
        value: identifierExpr({ name: 'rv_msg' }),
        target: 'rv_msg',
      }),
    ],
  });
  return classDef({
    name: 'zcl_greeter',
    isFinal: true,
    sections: [
      section({
        visibility: 'public',
        members: [tyRow, tyRows, tyMode, attr, greet],
      }),
    ],
    implementations: [greetImpl],
  });
}
