import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createHandler } from '../../src/lib/handlers/base.ts';
import { devc } from '../../src/schemas/generated/index.ts';

test('handler facades compile while identity and schema violations remain errors', () => {
  const fixture = fileURLToPath(
    new URL('../type-fixtures/handler-facade.ts', import.meta.url),
  );
  const program = ts.createProgram([fixture], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: ['node'],
  });
  const diagnostics = ts.getPreEmitDiagnostics(program).map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      '\n',
    );
    return `${diagnostic.file?.fileName ?? 'compiler'}: TS${diagnostic.code}: ${message}`;
  });
  assert.deepEqual(diagnostics, []);
});

test('string-type handlers serialize facade metadata without ADK storage members', async () => {
  type PackageFacade = { name: string; description: string };
  const handler = createHandler<PackageFacade, typeof devc>('TYPED_FACADE', {
    schema: devc,
    version: 'v1.0.0',
    serializer: 'LCL_OBJECT_DEVC',
    serializer_version: 'v1.0.0',
    toAbapGit: (object) => ({ DEVC: { CTEXT: object.description } }),
  });
  const files = await handler.serialize({
    name: 'ZPACKAGE',
    description: 'Typed facade',
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'zpackage.typed_facade.xml');
  assert.equal(
    devc.parse(files[0].content).abapGit.abap.values.DEVC?.CTEXT,
    'Typed facade',
  );
});
