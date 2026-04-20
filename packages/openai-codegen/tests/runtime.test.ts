import { describe, expect, it, test } from 'vitest';
import {
  getCloudRuntime,
  getClassicRuntime,
  getModernRuntime,
} from '../src/runtime/index.js';

const runtime = getCloudRuntime();
const combined = runtime.declarations + '\n' + runtime.implementations;

describe('getCloudRuntime: declarations', () => {
  const required = [
    '_build_client',
    '_send_request',
    '_encode_path',
    '_serialize_query_param',
    '_join_url',
    '_json_tokenize',
    '_json_escape',
    '_json_write_string',
    '_json_write_number',
    '_json_write_bool',
    '_json_write_null',
    '_json_concat',
  ];

  it.each(required)('declares %s', (name) => {
    expect(runtime.declarations).toContain(name);
  });
});

describe('getCloudRuntime: implementations', () => {
  const required = [
    '_build_client',
    '_send_request',
    '_encode_path',
    '_serialize_query_param',
    '_join_url',
    '_json_tokenize',
    '_json_escape',
    '_json_write_string',
    '_json_write_number',
    '_json_write_bool',
    '_json_write_null',
    '_json_concat',
  ];

  it.each(required)('has a matching METHOD/ENDMETHOD block for %s', (name) => {
    const re = new RegExp(`METHOD\\s+${name}\\.[\\s\\S]*?ENDMETHOD\\.`, 'i');
    expect(runtime.implementations).toMatch(re);
  });
});

describe('getCloudRuntime: whitelist', () => {
  it('only references whitelisted system classes/interfaces', () => {
    const allowed = new Set(
      runtime.allowedClassReferences.map((s) => s.toLowerCase()),
    );
    const re = /cl_[a-z0-9_]+|if_[a-z0-9_]+|\/[a-z0-9_]+\/[a-z0-9_]+/gi;
    const matches = combined.match(re) ?? [];
    const distinct = new Set(matches.map((m) => m.toLowerCase()));
    const disallowed = [...distinct].filter((m) => !allowed.has(m));
    expect(disallowed).toEqual([]);
  });

  it('does not reference /ui2/cl_json', () => {
    expect(combined.toLowerCase()).not.toContain('/ui2/cl_json');
  });

  it('does not reference xco_cp_json', () => {
    expect(combined.toLowerCase()).not.toContain('xco_cp_json');
  });

  it('does not reference cl_http_client (classic)', () => {
    // Must not contain cl_http_client as a word boundary; cl_http_client_manager
    // isn't on the whitelist either (cl_web_http_client_manager is), so a plain
    // substring check is enough.
    expect(combined.toLowerCase()).not.toMatch(/\bcl_http_client\b/);
  });
});

describe('getCloudRuntime: correctness-critical substrings', () => {
  it('_send_request takes iv_method and dispatches via if_web_http_client execute', () => {
    // The method is now selected at the call site via a static constant
    // (if_web_http_client=>get, =>post, …) rather than the old
    // ~request_method header hack.
    expect(runtime.declarations).toMatch(/iv_method\s+TYPE\s+string/i);
    expect(runtime.implementations).toContain(
      'io_client->execute( i_method = iv_method )',
    );
    expect(runtime.implementations).not.toMatch(/~request_method/);
  });

  it('contains the UTF-16 surrogate pair branch in the string escape loop', () => {
    expect(runtime.implementations).toMatch(
      /lv_code\s*>=\s*55296\s*AND\s*lv_code\s*<=\s*56319/,
    );
    expect(runtime.implementations).toContain('( lv_code - 55296 ) * 1024');
    expect(runtime.implementations).toContain('( lv_code2 - 56320 )');
  });

  it('contains exponent-capable number scan', () => {
    expect(runtime.implementations).toContain('0123456789.eE+-');
  });

  it('contains the string-escape CASE with \\uXXXX branch', () => {
    expect(runtime.implementations).toMatch(/WHEN\s+`u`\./);
    expect(runtime.implementations).toContain('_json_hex_to_int');
  });

  it('escapes backslash before quote in _json_escape', () => {
    const impl = runtime.implementations;
    const bs = impl.indexOf('REPLACE ALL OCCURRENCES OF `\\\\`');
    const qu = impl.indexOf('REPLACE ALL OCCURRENCES OF `"`');
    expect(bs).toBeGreaterThan(-1);
    expect(qu).toBeGreaterThan(bs);
  });
});

describe('placeholders', () => {
  it('getClassicRuntime throws the expected error', () => {
    expect(() => getClassicRuntime()).toThrow(/not implemented in v1/);
  });
  it('getModernRuntime throws the expected error', () => {
    expect(() => getModernRuntime()).toThrow(/not implemented in v1/);
  });
});

// --------------------------------------------------------------------------
// abaplint parse check
// --------------------------------------------------------------------------
// We wrap the runtime snippets in a minimal synthetic class and ask abaplint
// to parse it. We only check for *fatal* parse errors (structure/statement
// recognition), not for semantic warnings, because abaplint cannot resolve
// SAP system classes in a vacuum.
// --------------------------------------------------------------------------
let abaplint: typeof import('@abaplint/core') | undefined;
try {
  abaplint = await import('@abaplint/core');
} catch {
  abaplint = undefined;
}

const synthetic = `CLASS zcl_runtime_probe DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS run.
  PRIVATE SECTION.
${runtime.declarations}
ENDCLASS.

CLASS zcl_runtime_probe IMPLEMENTATION.
  METHOD run.
  ENDMETHOD.
${runtime.implementations}
ENDCLASS.
`;

const abaplintTest = abaplint ? test : test.skip;
abaplintTest(
  'abaplint can parse the synthetic class that embeds the runtime',
  // TODO(openai-codegen #4): if @abaplint/core is unavailable, this test is
  // skipped. Re-enable once the devDependency installs in all environments.
  async () => {
    // Non-null here: test only runs when abaplint is defined.
    const a = abaplint!;
    const file = new a.MemoryFile('zcl_runtime_probe.clas.abap', synthetic);
    const reg = new a.Registry().addFile(file).parse();
    const issues = reg
      .findIssues()
      .filter((i) => i.getKey() === 'parser_error');
    if (issues.length > 0) {
      // Surface the first few so failures are debuggable.
      const previews = issues
        .slice(0, 5)
        .map(
          (i) =>
            `${i.getKey()} @ ${i.getStart().getRow()}:${i.getStart().getCol()} ${i.getMessage()}`,
        )
        .join('\n');
      throw new Error(`abaplint parser errors:\n${previews}`);
    }
    expect(issues.length).toBe(0);
  },
);
