/**
 * CI gate: every generated `.clas.abap` / `.intf.abap` that the
 * openai-codegen pipeline ships in `samples/petstore3-client` MUST
 * round-trip through `@abapify/aclass` cleanly.
 *
 * This asserts that our emitter output stays *inside* the structural
 * subset of ABAP that `aclass` understands. If someone changes the
 * emitter to produce a shape the parser doesn't recognise, this test
 * flips red — the fix is either to extend the parser's grammar or to
 * revisit the emitter output.
 *
 * Guards two invariants:
 *   1. Zero lex errors (every character the emitter produces is inside
 *      the lexer's vocabulary).
 *   2. Zero unrecognised `RawMember` fallbacks in INTERFACE files.
 *      Class files may legitimately contain `EVENTS` / behaviour-pool
 *      constructs outside MVP scope, but interfaces emitted by this
 *      generator never do.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCleanParse, parse } from '@abapify/aclass';
import type { ClassDef, InterfaceDef } from '@abapify/aclass';
import { Registry, MemoryFile } from '@abaplint/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const petstore3Dir = join(
  __dirname,
  '../../../samples/petstore3-client/generated/abapgit/src',
);

describe('openai-codegen × aclass — parse-gate for petstore3 corpus', () => {
  const files = readdirSync(petstore3Dir)
    .filter((f) => f.endsWith('.abap'))
    .map((f) => ({ f, src: readFileSync(join(petstore3Dir, f), 'utf8') }));

  it.each(files)('$f parses cleanly via aclass', ({ f, src }) => {
    // `assertCleanParse` throws a labelled AclassParseError on any lex
    // or parse error, with file:line pointers in the message.
    expect(() => assertCleanParse(src, f)).not.toThrow();
  });

  it.each(files)(
    '$f parses cleanly via @abaplint/core (no parser_error)',
    ({ f, src }) => {
      // Second opinion: run the same source through abaplint's Registry.
      // Gate ONLY on `parser_error` keys — abaplint's default rule set
      // includes stylistic rules (`description_empty`,
      // `in_statement_indentation`, `global_class` filename check) that
      // aren't relevant to the "does this even parse?" question.
      const reg = new Registry().addFile(new MemoryFile(f, src)).parse();
      const fatals = reg
        .findIssues()
        .filter((i) => i.getKey() === 'parser_error')
        .map((i) => `${i.getKey()}: ${i.getMessage()}`);
      expect(fatals).toEqual([]);
    },
  );

  it.each(files.filter((f) => f.f.endsWith('.intf.abap')))(
    '$f: interface body is fully structured (no RawMember fallbacks)',
    ({ f, src }) => {
      const { ast } = parse(src);
      const iface = ast.definitions.find((d) => d.kind === 'InterfaceDef') as
        | InterfaceDef
        | undefined;
      expect(iface, `${f} has no InterfaceDef`).toBeDefined();
      if (!iface) return;
      const raws = iface.members.filter((m) => m.kind === 'RawMember');
      expect(
        raws.map((r) => ('source' in r ? r.source : '')),
        `unrecognised members in ${f}`,
      ).toEqual([]);
    },
  );

  it('zif_petstore3.intf.abap exposes the generator-promised method count', () => {
    const src = readFileSync(
      join(petstore3Dir, 'zif_petstore3.intf.abap'),
      'utf8',
    );
    const { ast } = parse(src);
    const iface = ast.definitions[0] as InterfaceDef;
    const methods = iface.members.filter((m) => m.kind === 'MethodDecl');
    expect(methods.length).toBe(19);
    for (const m of methods) {
      expect(m.kind === 'MethodDecl' && m.raising.length).toBeGreaterThan(0);
    }
  });

  it('zcl_petstore3.clas.abap has a ClassDef + ClassImpl pair', () => {
    const src = readFileSync(
      join(petstore3Dir, 'zcl_petstore3.clas.abap'),
      'utf8',
    );
    const kinds = parse(src).ast.definitions.map((d) => d.kind);
    expect(kinds).toContain('ClassDef');
    expect(kinds).toContain('ClassImpl');
  });

  it('zcx_petstore3_error.clas.abap inherits cx_static_check', () => {
    const src = readFileSync(
      join(petstore3Dir, 'zcx_petstore3_error.clas.abap'),
      'utf8',
    );
    const def = parse(src).ast.definitions.find(
      (d) => d.kind === 'ClassDef',
    ) as ClassDef;
    expect(def.superClass).toBe('cx_static_check');
    expect(def.isFinal).toBe(true);
  });
});
