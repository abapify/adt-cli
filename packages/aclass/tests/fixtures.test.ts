import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parse } from '../src/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstore3Dir = join(
  __dirname,
  '../../../samples/petstore3-client/generated/abapgit/src',
);

function listAbapFiles(): { name: string; path: string; source: string }[] {
  return readdirSync(petstore3Dir)
    .filter((f) => f.endsWith('.abap'))
    .sort()
    .map((f) => ({
      name: f,
      path: join(petstore3Dir, f),
      source: readFileSync(join(petstore3Dir, f), 'utf8'),
    }));
}

describe('petstore3 corpus — parser must accept every file the generator emits', () => {
  const files = listAbapFiles();

  it.each(files)(
    'parses $name with no lex errors and at least one top-level definition',
    ({ source, name }) => {
      const { ast, errors } = parse(source);
      // Lex errors would indicate an unknown character in real output —
      // every real token must be in the lexer's vocabulary.
      const lexErrors = errors.filter((e) =>
        /Unexpected character/.test(e.message),
      );
      expect(lexErrors, `lex errors in ${name}`).toEqual([]);

      // locals_def / locals_imp files contain only local class
      // declarations (CLASS <name> DEFINITION. … ENDCLASS.) — they ARE
      // top-level from the parser's perspective, just without a ZCL_*
      // wrapper. The file with opaque raw content ("method body only")
      // still needs at least one definition.
      expect(
        ast.definitions.length,
        `${name} yielded zero top-level definitions`,
      ).toBeGreaterThan(0);
    },
  );

  it('every file exposes expected top-level kinds', () => {
    const map = new Map<string, string[]>();
    for (const { name, source } of files) {
      const kinds = parse(source).ast.definitions.map((d) => d.kind);
      map.set(name, kinds);
    }
    // Sanity: zcl_petstore3.clas.abap has a DEFINITION and an
    // IMPLEMENTATION; zif_* files have exactly one InterfaceDef; zcx_*
    // has a DEFINITION and an IMPLEMENTATION.
    expect(map.get('zif_petstore3.intf.abap')).toEqual(['InterfaceDef']);
    expect(map.get('zif_petstore3_types.intf.abap')).toEqual(['InterfaceDef']);

    const zcl = map.get('zcl_petstore3.clas.abap') ?? [];
    expect(zcl).toContain('ClassDef');
    expect(zcl).toContain('ClassImpl');

    const zcx = map.get('zcx_petstore3_error.clas.abap') ?? [];
    expect(zcx).toContain('ClassDef');
    expect(zcx).toContain('ClassImpl');
  });
});
