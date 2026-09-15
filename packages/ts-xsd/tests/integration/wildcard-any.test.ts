/**
 * Integration tests for xs:any wildcard parse/build fidelity
 *
 * Wildcards must preserve:
 * - qualified element names (prefixes)
 * - attributes (@name keys)
 * - text content (_text when attributes present)
 * - nested arbitrary content
 * - repeated siblings (arrays)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseXml, buildXml } from '../../src/xml';
import type { SchemaLike } from '../../src/xsd/schema-like';

const schema = {
  element: [{ name: 'doc', type: 'DocType' }],
  complexType: [
    {
      name: 'DocType',
      sequence: {
        element: [{ name: 'id', type: 'xs:string' }],
        any: [
          {
            namespace: '##any',
            processContents: 'lax',
            maxOccurs: 'unbounded',
          },
        ],
      },
    },
  ],
} as const satisfies SchemaLike;

describe('xs:any wildcard roundtrip', () => {
  it('captures undeclared elements with qualified names', () => {
    const xml = `<doc><id>1</id><asx:values xmlns:asx="http://x"><asx:item>v</asx:item></asx:values></doc>`;
    const parsed = parseXml(schema, xml) as { doc: Record<string, unknown> };
    assert.deepStrictEqual(parsed.doc['asx:values'], {
      '@xmlns:asx': 'http://x',
      'asx:item': 'v',
    });
  });

  it('preserves attributes and text on wildcard elements', () => {
    const xml = `<doc><id>1</id><meta lang="en">hello</meta></doc>`;
    const parsed = parseXml(schema, xml) as { doc: Record<string, unknown> };
    assert.deepStrictEqual(parsed.doc.meta, { '@lang': 'en', _text: 'hello' });
  });

  it('preserves repeated wildcard siblings as arrays', () => {
    const xml = `<doc><id>1</id><row>a</row><row>b</row></doc>`;
    const parsed = parseXml(schema, xml) as { doc: Record<string, unknown> };
    assert.deepStrictEqual(parsed.doc.row, ['a', 'b']);
  });

  it('roundtrips attributes, namespaces and nested content', () => {
    const data = {
      doc: {
        id: '42',
        'asx:values': {
          '@xmlns:asx': 'http://www.sap.com/abapxml',
          'asx:item': [{ '@nr': '1', _text: 'a' }, 'b'],
        },
        note: { '@level': 'warn', _text: 'careful' },
      },
    };
    const xml = buildXml(schema, data, { xmlDecl: false });
    const reparsed = parseXml(schema, xml);
    assert.deepStrictEqual(reparsed, data);
  });
});
