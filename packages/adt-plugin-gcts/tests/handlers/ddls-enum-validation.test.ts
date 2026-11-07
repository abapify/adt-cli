import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { ddlSourceHandler } from '../../src/lib/handlers/objects/ddls.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function metadata(fields: Record<string, unknown>) {
  const files = await ddlSourceHandler.serialize({
    name: 'ZVIEW',
    ...fields,
  });
  const json = files.find((file) => file.path.endsWith('.json'));
  assert.ok(json);
  const parsed: unknown = JSON.parse(json.content);
  assert.ok(isRecord(parsed));
  return parsed;
}

test('DDLS accepts every AFF enum value', async () => {
  for (const sourceOrigin of [
    'abapDevelopmentTools',
    'customCdsViews',
    'customAnalyticalQueries',
    'customBusinessObject',
    'customCodeList',
    'customCdsViewsVariantConfg',
    'customFields',
    'extensionsForDataSources',
    'customSearchModeler',
    'serviceConsumptionModel',
  ]) {
    assert.equal((await metadata({ sourceOrigin })).sourceOrigin, sourceOrigin);
  }
  for (const sourceType of [
    'ddicBasedView',
    'viewEntity',
    'viewExtend',
    'viewEntityExtend',
    'tableFunction',
    'tableEntity',
    'abstractEntity',
    'customEntity',
    'hierarchy',
    'projectionView',
    'externalEntity',
    'unknown',
  ]) {
    assert.equal((await metadata({ sourceType })).sourceType, sourceType);
  }
  for (const abapLanguageVersion of [
    'standard',
    'keyUser',
    'cloudDevelopment',
  ]) {
    const written = await metadata({ abapLanguageVersion });
    assert.ok(isRecord(written.header));
    assert.equal(written.header.abapLanguageVersion, abapLanguageVersion);
  }
});

test('DDLS keeps defaults for missing enum values', async () => {
  const written = await metadata({});
  assert.equal(written.sourceOrigin, 'abapDevelopmentTools');
  assert.equal(written.sourceType, 'unknown');
  assert.ok(isRecord(written.header));
  assert.equal(Object.hasOwn(written.header, 'abapLanguageVersion'), false);
});

test('DDLS rejects values outside the AFF enums at runtime', async () => {
  for (const [field, pattern] of [
    ['sourceOrigin', /Unsupported AFF DDLS sourceOrigin: invented/],
    ['sourceType', /Unsupported AFF DDLS sourceType: invented/],
    [
      'abapLanguageVersion',
      /Unsupported AFF DDLS abapLanguageVersion: invented/,
    ],
  ] as const) {
    await assert.rejects(metadata({ [field]: 'invented' }), pattern);
  }
  for (const inherited of ['__proto__', 'constructor', 'toString']) {
    await assert.rejects(
      metadata({ sourceType: inherited }),
      /Unsupported AFF DDLS sourceType/,
    );
  }
});

test('DDLS rejects non-strings that coerce to an AFF enum key', async () => {
  await assert.rejects(
    metadata({ sourceType: ['viewEntity'] }),
    /Unsupported AFF DDLS sourceType: array/,
  );
  const disguised = {
    toString() {
      return 'viewEntity';
    },
  };
  await assert.rejects(
    metadata({ sourceType: disguised }),
    /Unsupported AFF DDLS sourceType: object/,
  );
});

test('metadata contract requires a top-level or legacy header version', () => {
  const fixture = fileURLToPath(
    new URL('../type-fixtures/metadata-version.ts', import.meta.url),
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
  // Unused @ts-expect-error directives are diagnostics, so this fails if a
  // versionless shape is ever accepted again.
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
