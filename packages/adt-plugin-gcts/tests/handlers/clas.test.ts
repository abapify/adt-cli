/**
 * CLAS handler AFF alignment tests.
 *
 * Verifies that the gCTS CLAS handler emits JSON matching the AFF
 * clas-v1.json schema shape and that fromMetadata round-trips the
 * fields back to ADK conventions.
 *
 * Uses the exported `classHandler` directly (not the registry) to avoid
 * interference from base.test.ts's __resetRegistry() hook.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { classHandler } from '../../src/lib/handlers/objects/clas.ts';

describe('CLAS handler — AFF clas-v1 alignment', () => {
  it('emits formatVersion "1" at root (not "1.0", not in header)', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test class',
      dataSync: {
        language: 'EN',
        category: 'generalObjectType',
        fixPointArithmetic: true,
      },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(meta.formatVersion, '1');
    assert.ok(
      !('formatVersion' in meta.header),
      'formatVersion must NOT be in header',
    );
  });

  it('emits header with description + originalLanguage (lowercase)', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'My class',
      dataSync: { language: 'EN' },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(meta.header.description, 'My class');
    assert.strictEqual(meta.header.originalLanguage, 'en');
  });

  it('emits category mapped to AFF enum', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test',
      dataSync: { language: 'EN', category: 'testClass' },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(meta.category, 'testclassAbapUnit');
  });

  it('emits fixPointArithmetic when defined', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test',
      dataSync: { language: 'EN', fixPointArithmetic: true },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(meta.fixPointArithmetic, true);
  });

  it('omits abapLanguageVersion when standard', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test',
      dataSync: { language: 'EN', abapLanguageVersion: 'standard' },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.ok(
      !('abapLanguageVersion' in meta.header),
      'standard must be omitted',
    );
  });

  it('emits abapLanguageVersion when non-standard', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test',
      dataSync: { language: 'EN', abapLanguageVersion: 'cloudDevelopment' },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.strictEqual(meta.header.abapLanguageVersion, 'cloudDevelopment');
  });

  it('does NOT emit a "class" wrapper — fields are at root level', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Test',
      dataSync: { language: 'EN', category: 'generalObjectType' },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );
    assert.ok(!('class' in meta), 'must not have a "class" wrapper');
    assert.ok('header' in meta, 'must have header at root');
  });

  it('round-trips: serialize → parse → fromMetadata recovers ADK fields', async () => {
    const files = await classHandler.serialize({
      name: 'ZCL_TEST',
      description: 'Roundtrip class',
      dataSync: {
        language: 'EN',
        category: 'exceptionClass',
        fixPointArithmetic: false,
      },
    } as any);
    const json = files.find((f) => f.path.endsWith('.json'))!.content;
    const meta = JSON.parse(json);

    // fromMetadata should recover the ADK conventions.
    const recovered = classHandler.fromAbapGit!(meta);
    assert.strictEqual(recovered.description, 'Roundtrip class');
    assert.strictEqual(recovered.language, 'EN'); // back to uppercase
    assert.strictEqual(recovered.category, 'exceptionClass'); // back to ADK enum
    assert.strictEqual(recovered.fixPointArithmetic, false);
  });

  it('output matches AFF example shape (z_aff_example_clas)', async () => {
    const files = await classHandler.serialize({
      name: 'Z_AFF_EXAMPLE_CLAS',
      description: 'Example class for ABAP file formats',
      dataSync: {
        language: 'EN',
        fixPointArithmetic: true,
      },
    } as any);
    const meta = JSON.parse(
      files.find((f) => f.path.endsWith('.json'))!.content,
    );

    // Core shape from the AFF example:
    assert.strictEqual(meta.formatVersion, '1');
    assert.strictEqual(
      meta.header.description,
      'Example class for ABAP file formats',
    );
    assert.strictEqual(meta.header.originalLanguage, 'en');
    assert.strictEqual(meta.fixPointArithmetic, true);
  });
});
