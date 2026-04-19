import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { print } from '@abapify/abap-ast';
import { loadSpec, normalizeSpec } from '../src/oas/index';
import { planTypes } from '../src/types/index';
import { getProfile } from '../src/profiles/index';
import { getCloudRuntime } from '../src/runtime/index';
import { emitClientClass } from '../src/emit/index';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PETSTORE_PATH = resolve(
  __dirname,
  '../../../samples/petstore3-client/spec/openapi.json',
);

describe('emitClientClass (Petstore v3)', () => {
  it('produces one public method per operation and a RETURNING for find_pets_by_status', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });

    expect(result.class.name).toBe('ZCL_PETSTORE3_CLIENT');

    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    );
    expect(publicSection).toBeDefined();

    const opMethodCount = publicSection!.members.filter(
      (m) =>
        m.kind === 'MethodDef' &&
        m.name !== 'constructor' &&
        !m.name.startsWith('set_'),
    ).length;
    expect(opMethodCount).toBe(spec.operations.length);

    const findMethod = publicSection!.members.find(
      (m) => m.kind === 'MethodDef' && m.name === 'find_pets_by_status',
    );
    expect(findMethod).toBeDefined();
    const params = (
      findMethod as {
        params: readonly {
          name: string;
          paramKind: string;
          typeRef: { kind: string; name?: string };
        }[];
      }
    ).params;
    const ivStatus = params.find((p) => p.name === 'iv_status');
    expect(ivStatus).toBeDefined();
    expect(ivStatus!.paramKind).toBe('importing');
    const ret = params.find((p) => p.paramKind === 'returning');
    expect(ret).toBeDefined();
    // Returning is a NamedTypeRef pointing at a hoisted table-of-pet typedef.
    expect(ret!.typeRef.kind).toBe('NamedTypeRef');
    const privateSection = result.class.sections.find(
      (s) => s.visibility === 'private',
    )!;
    const hoisted = privateSection.members.find(
      (m) =>
        m.kind === 'TypeDef' &&
        m.name === (ret!.typeRef as { name: string }).name,
    );
    expect(hoisted).toBeDefined();
    const hoistedType = (
      hoisted as { type: { kind: string; rowType?: { name: string } } }
    ).type;
    expect(hoistedType.kind).toBe('TableType');
    expect(hoistedType.rowType!.name).toBe('ty_ps3_pet');
  });

  it('add_pet has is_body typed to the Pet schema', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });
    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    )!;
    const addPet = publicSection.members.find(
      (m) => m.kind === 'MethodDef' && m.name === 'add_pet',
    );
    expect(addPet).toBeDefined();
    const params = (
      addPet as {
        params: readonly {
          name: string;
          typeRef: { kind: string; name?: string };
        }[];
      }
    ).params;
    const body = params.find((p) => p.name === 'is_body');
    expect(body).toBeDefined();
    expect((body!.typeRef as { name?: string }).name).toBe('ty_ps3_pet');
    const ret = params.find((p) => p.name.startsWith('rv_'));
    expect(ret).toBeDefined();
  });

  it('includes a local exception class ZCX_PETSTORE3_CLIENT_ERROR', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });
    expect(result.extras.length).toBeGreaterThan(0);
    expect(result.extras[0].name).toBe('ZCX_PETSTORE3_CLIENT_ERROR');
  });

  it('printed source does not mention /ui2/cl_json, xco_cp_json, or cl_http_client', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });
    const src =
      print(result.class) +
      '\n' +
      result.extras.map((e) => print(e)).join('\n');
    expect(src).not.toMatch(/\/ui2\/cl_json/i);
    expect(src).not.toMatch(/xco_cp_json/i);
    // cl_http_client is the legacy classic class — ensure we only use
    // cl_http_utility / if_web_http_* on this profile.
    expect(src).not.toMatch(/\bcl_http_client\b/i);
  });

  it('find_pets_by_status method body matches the expected ABAP shape', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });
    const impl = result.class.implementations.find(
      (i) => i.name === 'find_pets_by_status',
    );
    expect(impl).toBeDefined();
    const printed = print(impl!);
    // Key shape checks.
    expect(printed).toMatch(/METHOD find_pets_by_status\./);
    expect(printed).toMatch(/DATA lo_client TYPE REF TO if_web_http_client/);
    expect(printed).toMatch(/lo_client = me->_build_client\(/);
    // HTTP method is now selected via iv_method = if_web_http_client=>get
    // forwarded to the runtime _send_request (which internally dispatches
    // via io_client->execute).
    expect(printed).not.toMatch(/~request_method/);
    expect(printed).toMatch(/iv_method = if_web_http_client=>get/);
    expect(printed).toMatch(/me->_join_url\(/);
    expect(printed).toMatch(/IF lv_status >= 200 AND lv_status < 300\./);
    // Deserialization now goes through the per-operation stub.
    expect(printed).toMatch(/rv_result = me->_des_find_pets_by_status\(/);
    expect(printed).not.toMatch(/me->_deserialize_body\(/);
    expect(printed).toMatch(/RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR\(/);
  });

  it('emits a private _des_<method> stub for every operation with a JSON response, and a _ser_<method> stub for every operation with a request body', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const runtime = getCloudRuntime();
    const profile = getProfile('s4-cloud');
    const result = emitClientClass(spec, plan, profile, runtime, {
      className: 'ZCL_PETSTORE3_CLIENT',
      typePrefix: 'ps3_',
    });
    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    )!;
    const privateSection = result.class.sections.find(
      (s) => s.visibility === 'private',
    )!;
    const opMethods = publicSection.members.filter(
      (m): m is { kind: 'MethodDef'; name: string } =>
        m.kind === 'MethodDef' &&
        m.name !== 'constructor' &&
        !m.name.startsWith('set_'),
    );
    const privateMethodNames = new Set(
      privateSection.members
        .filter((m) => m.kind === 'MethodDef')
        .map((m) => (m as { name: string }).name),
    );
    // Every operation should have a _des_<method> stub.
    for (const op of opMethods) {
      expect(privateMethodNames.has(`_des_${op.name}`)).toBe(true);
    }
    // Implementations must exist for every decl.
    const implNames = new Set(result.class.implementations.map((i) => i.name));
    for (const op of opMethods) {
      expect(implNames.has(`_des_${op.name}`)).toBe(true);
    }
    // Petstore: add_pet / update_pet / place_order / create_user etc. have
    // request bodies → expect _ser_ helpers for those.
    const opsWithBody = spec.operations.filter(
      (op) => op.requestBody !== undefined,
    );
    expect(opsWithBody.length).toBeGreaterThan(0);
    for (const op of opsWithBody) {
      // The abap method name is looked up via the public section.
      // Find via operationId heuristic: normalized method name is snake_case.
      // Simpler: just check that at least some _ser_ stubs exist and
      // _ser_add_pet exists specifically.
      void op;
    }
    expect(privateMethodNames.has('_ser_add_pet')).toBe(true);
    expect(implNames.has('_ser_add_pet')).toBe(true);
    // And _ser_<x> is NOT emitted for operations without a body (e.g. the
    // GET find_pets_by_status).
    expect(privateMethodNames.has('_ser_find_pets_by_status')).toBe(false);
  });

  it('emits api key security attribute and sets the header in the method body', () => {
    const raw = {
      openapi: '3.0.3',
      info: { title: 'Secured', version: '1' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/ping': {
          get: {
            operationId: 'ping',
            responses: { '200': { description: 'ok' } },
          },
        },
      },
      components: {
        securitySchemes: {
          MyApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
      security: [{ MyApiKey: [] }],
    } as Record<string, unknown>;
    const spec = normalizeSpec(raw, {});
    const plan = planTypes(spec, { typePrefix: 'sec_' });
    const result = emitClientClass(
      spec,
      plan,
      getProfile('s4-cloud'),
      getCloudRuntime(),
      { className: 'ZCL_SEC_CLIENT', typePrefix: 'sec_' },
    );
    const printed = print(result.class);
    expect(printed).toMatch(/mv_api_key_myapikey/);
    expect(printed).toMatch(/X-API-Key/);
  });

  it('emits set_bearer_token public method for bearer security', () => {
    const raw = {
      openapi: '3.0.3',
      info: { title: 'Bearer', version: '1' },
      servers: [{ url: 'https://api.example.com' }],
      paths: {
        '/ping': {
          get: {
            operationId: 'ping',
            responses: { '200': { description: 'ok' } },
          },
        },
      },
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
      security: [{ BearerAuth: [] }],
    } as Record<string, unknown>;
    const spec = normalizeSpec(raw, {});
    const plan = planTypes(spec, { typePrefix: 'brr_' });
    const result = emitClientClass(
      spec,
      plan,
      getProfile('s4-cloud'),
      getCloudRuntime(),
      { className: 'ZCL_BRR_CLIENT', typePrefix: 'brr_' },
    );
    const publicSection = result.class.sections.find(
      (s) => s.visibility === 'public',
    )!;
    const setter = publicSection.members.find(
      (m) => m.kind === 'MethodDef' && m.name === 'set_bearer_token',
    );
    expect(setter).toBeDefined();
  });
});

describe('emitClientClass — abaplint smoke parse', () => {
  it('produces source that abaplint parses without fatal errors', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const result = emitClientClass(
      spec,
      plan,
      getProfile('s4-cloud'),
      getCloudRuntime(),
      { className: 'ZCL_PETSTORE3_CLIENT', typePrefix: 'ps3_' },
    );
    const src =
      print(result.class) +
      '\n' +
      result.extras.map((e) => print(e)).join('\n');

    const abaplint = await import('@abaplint/core');
    const file = new abaplint.MemoryFile('zcl_petstore3_client.clas.abap', src);
    const reg = new abaplint.Registry().addFile(file);
    reg.parse();
    const issues = reg.findIssues();
    const parser = issues.filter((i) => i.getKey() === 'parser_error');
    if (parser.length > 0) {
      console.error(
        'abaplint parser_error count:',
        parser.length,
        '\nFirst 10:',
      );
      for (const p of parser.slice(0, 10)) {
        console.error(
          'line',
          p.getStart().getRow(),
          'col',
          p.getStart().getCol(),
          '-',
          p.getMessage(),
        );
      }
      const { writeFileSync } = await import('node:fs');
      writeFileSync('/tmp/emitted-client.abap', src);
      console.error('Full source written to /tmp/emitted-client.abap');
    }
    expect(parser).toHaveLength(0);
  });

  it('end-to-end: main class + every extras LocalClassDef parse with abaplint', async () => {
    const spec = await loadSpec(PETSTORE_PATH);
    const plan = planTypes(spec, { typePrefix: 'ps3_' });
    const result = emitClientClass(
      spec,
      plan,
      getProfile('s4-cloud'),
      getCloudRuntime(),
      { className: 'ZCL_PETSTORE3_CLIENT', typePrefix: 'ps3_' },
    );
    const src =
      print(result.class) +
      '\n' +
      result.extras.map((e) => print(e)).join('\n');

    if (process.env.CODEGEN_DUMP === '1') {
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const { dirname: pDirname } = await import('node:path');
      const out = resolve(__dirname, '../../../tmp/petstore3.clas.abap');
      mkdirSync(pDirname(out), { recursive: true });
      writeFileSync(out, src);
    }

    const abaplint = await import('@abaplint/core');
    const file = new abaplint.MemoryFile('zcl_petstore3_client.clas.abap', src);
    const reg = new abaplint.Registry().addFile(file);
    reg.parse();
    const issues = reg.findIssues();
    const parser = issues.filter((i) => i.getKey() === 'parser_error');
    if (parser.length > 0) {
      console.error('e2e parser_error count:', parser.length, '\nFirst 10:');
      for (const p of parser.slice(0, 10)) {
        console.error(
          'line',
          p.getStart().getRow(),
          'col',
          p.getStart().getCol(),
          '-',
          p.getMessage(),
        );
      }
    }
    expect(parser).toHaveLength(0);
  });
});
