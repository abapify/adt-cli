import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { print } from '@abapify/abap-ast';
import { Registry, MemoryFile } from '@abaplint/core';
import { loadSpec } from '../src/oas/index';
import { planTypes } from '../src/types/index';
import { emitOperationsInterface } from '../src/emit/operations-interface';
import { emitLocalClasses } from '../src/emit/local-classes';
import { emitImplementationClass } from '../src/emit/implementation-class';
import type { ResolvedNames } from '../src/emit/naming';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

const names: ResolvedNames = {
  typesInterface: 'ZIF_PETSTORE_TYPES',
  operationsInterface: 'ZIF_PETSTORE',
  implementationClass: 'ZCL_PETSTORE',
  exceptionClass: 'ZCX_PETSTORE_ERROR',
  localHttpClass: 'lcl_http',
  localResponseClass: 'lcl_response',
  localJsonClass: 'json',
  localJsonParserClass: 'lcl_json_parser',
};

async function setup() {
  const spec = await loadSpec(PETSTORE_PATH);
  const plan = planTypes(spec, { typePrefix: '' });
  const opsResult = emitOperationsInterface(spec, plan, {
    name: names.operationsInterface,
    typesInterfaceName: names.typesInterface,
    exceptionClassName: names.exceptionClass,
  });
  const implResult = emitImplementationClass(spec, opsResult.operations, {
    names,
    defaultServer: '/api/v3',
  });
  return { spec, opsResult, implResult };
}

/** Extract the printed source of a single METHOD block by interface-tilde name. */
function extractMethod(printed: string, methodName: string): string {
  const re = new RegExp(
    `^(\\s*)METHOD\\s+${methodName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\.[\\s\\S]*?^\\1ENDMETHOD\\.`,
    'm',
  );
  const m = re.exec(printed);
  if (!m) {
    throw new Error(
      `extractMethod: could not find METHOD ${methodName} in printed source`,
    );
  }
  return m[0];
}

describe('emitImplementationClass (Petstore v3)', () => {
  it('produces a global ClassDef with the expected name and shape', async () => {
    const { implResult } = await setup();
    expect(implResult.class.kind).toBe('ClassDef');
    expect(implResult.class.name).toBe('ZCL_PETSTORE');
    expect(implResult.class.interfaces).toEqual(['zif_petstore']);
    expect(implResult.class.superclass).toBeUndefined();
  });

  it('declares only a constructor in PUBLIC SECTION (no other methods, no attributes)', async () => {
    const { implResult } = await setup();
    const pub = implResult.class.sections.find(
      (s) => s.visibility === 'public',
    );
    expect(pub).toBeDefined();
    const methods = pub!.members.filter((m) => m.kind === 'MethodDef');
    expect(methods).toHaveLength(1);
    expect((methods[0] as { name: string }).name).toBe('constructor');
    const attrs = pub!.members.filter((m) => m.kind === 'AttributeDef');
    expect(attrs).toHaveLength(0);
  });

  it('declares exactly one private attribute `client TYPE REF TO lcl_http`', async () => {
    const { implResult } = await setup();
    const priv = implResult.class.sections.find(
      (s) => s.visibility === 'private',
    );
    expect(priv).toBeDefined();
    const attrs = priv!.members.filter((m) => m.kind === 'AttributeDef');
    expect(attrs).toHaveLength(1);
    const a = attrs[0] as { name: string; type: { name?: string } };
    expect(a.name).toBe('client');
    expect(a.type.name).toBe('REF TO lcl_http');
    const privMethods = priv!.members.filter((m) => m.kind === 'MethodDef');
    expect(privMethods).toHaveLength(0);
  });

  it('emits one implementation per operation plus the constructor', async () => {
    const { spec, implResult } = await setup();
    expect(implResult.class.implementations).toHaveLength(
      spec.operations.length + 1,
    );
    const names = implResult.class.implementations.map((m) => m.name);
    expect(names[0]).toBe('constructor');
    for (let i = 1; i < names.length; i++) {
      expect(names[i].startsWith('zif_petstore~')).toBe(true);
    }
  });

  it('getPetById: method = GET, path uses a `|...{ pet_id }|` template', async () => {
    const { implResult } = await setup();
    const source = print(implResult.class);
    const body = extractMethod(source, 'zif_petstore~get_pet_by_id');
    expect(body).toContain('client->fetch(');
    expect(body).toMatch(/method\s*=\s*'GET'/);
    expect(body).toContain('path = |/pet/{ pet_id }|');
  });

  it('addPet: sends JSON body and Content-Type header', async () => {
    const { implResult } = await setup();
    const source = print(implResult.class);
    const body = extractMethod(source, 'zif_petstore~add_pet');
    expect(body).toContain('body');
    expect(body).toMatch(/body\s*=\s*json=>stringify\(\s*body\s*\)/);
    expect(body).toMatch(/headers\s*=\s*VALUE\s+#\(/);
    expect(body).toContain(
      `( name = 'Content-Type' value = 'application/json' )`,
    );
  });

  it('findPetsByStatus: emits query = VALUE #( ... ) with the status field', async () => {
    const { implResult } = await setup();
    const source = print(implResult.class);
    const body = extractMethod(source, 'zif_petstore~find_pets_by_status');
    expect(body).toMatch(
      /query\s+=\s+VALUE #\(\s+\(\s+name\s+=\s+'status'\s+value\s+=\s+status\s+\)\s+\)/,
    );
  });

  it('deletePet: method = DELETE and CASE maps success to abap_true', async () => {
    const { implResult } = await setup();
    const source = print(implResult.class);
    const body = extractMethod(source, 'zif_petstore~delete_pet');
    expect(body).toMatch(/method\s*=\s*'DELETE'/);
    expect(body).toMatch(/success\s*=\s*abap_true\./);
  });

  it('abaplint parses the full .clas.abap bundle without parser_error issues', async () => {
    const { implResult } = await setup();
    const mainSource = print(implResult.class);
    const { localsDef, localsImp } = emitLocalClasses(names);

    const clasXml = `<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>ZCL_PETSTORE</CLSNAME>
    <LANGU>E</LANGU>
    <DESCRIPT>petstore</DESCRIPT>
    <STATE>1</STATE>
    <CLSCCINCL>X</CLSCCINCL>
    <FIXPT>X</FIXPT>
    <UNICODE>X</UNICODE>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
`;

    const reg = new Registry();
    reg.addFile(new MemoryFile('zcl_petstore.clas.abap', mainSource));
    reg.addFile(new MemoryFile('zcl_petstore.clas.xml', clasXml));
    reg.addFile(new MemoryFile('zcl_petstore.clas.locals_def.abap', localsDef));
    reg.addFile(new MemoryFile('zcl_petstore.clas.locals_imp.abap', localsImp));
    reg.parse();

    const parserErrors = reg
      .findIssues()
      .filter((i) => i.getKey() === 'parser_error')
      .map(
        (i) => `${i.getFilename()}:${i.getStart().getRow()} ${i.getMessage()}`,
      );
    expect(parserErrors).toEqual([]);
  });

  it('snapshots the printed get_pet_by_id method', async () => {
    const { implResult } = await setup();
    const source = print(implResult.class);
    const body = extractMethod(source, 'zif_petstore~get_pet_by_id');
    expect(body).toMatchInlineSnapshot(`
      "  METHOD zif_petstore~get_pet_by_id.
          TRY.
          DATA(response) = client->fetch( method = 'GET' path = |/pet/{ pet_id }| ).
          CASE response->status( ).
            WHEN 200.
              json=>parse( response->body( ) )->to( REF #( pet ) ).
            WHEN 400.
              RAISE EXCEPTION NEW zcx_petstore_error(
                status      = 400
                description = 'Invalid ID supplied'
                body        = response->body( ) ).
            WHEN 404.
              RAISE EXCEPTION NEW zcx_petstore_error(
                status      = 404
                description = 'Pet not found'
                body        = response->body( ) ).
            WHEN OTHERS.
              RAISE EXCEPTION NEW zcx_petstore_error(
                status      = response->status( )
                description = 'Unexpected error'
                body        = response->body( ) ).
          ENDCASE.
            CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
              RAISE EXCEPTION NEW zcx_petstore_error(
                status      = 0
                description = _http_err->get_text( ) ).
          ENDTRY.
        ENDMETHOD."
    `);
  });
});
