import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createHandler } from '../../src/lib/handlers/base.ts';

test('AFF handler facades compile without requiring legacy header versions', () => {
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
  assert.deepEqual(
    ts
      .getPreEmitDiagnostics(program)
      .map(
        (diagnostic) =>
          `TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
      ),
    [],
  );
});

test('AFF facade serialization retains the top-level version and header', async () => {
  const handler = createHandler('TYPED_AFF', {
    toMetadata: (object: { name: string; description: string }) => ({
      formatVersion: '1',
      header: { description: object.description, originalLanguage: 'en' },
    }),
  });
  const files = await handler.serialize({
    name: 'ZBEHAVIOR',
    description: 'Typed source',
  });
  assert.equal(files.length, 1);
  assert.equal(files[0].path, 'zbehavior.typed_aff.json');
  assert.deepEqual(JSON.parse(files[0].content), {
    formatVersion: '1',
    header: { description: 'Typed source', originalLanguage: 'en' },
  });
});
