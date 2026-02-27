/**
 * Tests for XML builder respecting elementFormDefault
 *
 * The builder behavior for elementFormDefault:
 * - "unqualified": Root element and local elements do NOT get namespace prefix
 *   (This matches the abapGit XML format where <abapGit> has no prefix)
 * - "qualified": Root element and local elements DO get namespace prefix
 *
 * Note: This is a pragmatic interpretation for the abapGit use case.
 * Strict XSD semantics would have global elements always prefixed, but
 * abapGit requires unqualified root elements.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { build } from '../../src/xml/build';

describe('XML builder elementFormDefault handling', () => {
  // Schema with elementFormDefault="unqualified" (the default)
  const unqualifiedSchema = {
    targetNamespace: 'http://www.sap.com/abapxml',
    elementFormDefault: 'unqualified',
    $xmlns: {
      asx: 'http://www.sap.com/abapxml',
    },
    element: [
      {
        name: 'root',
        type: 'asx:RootType',
      },
    ],
    complexType: [
      {
        name: 'RootType',
        sequence: {
          element: [
            { name: 'CHILD1', type: 'xs:string' },
            { name: 'CHILD2', type: 'xs:string' },
          ],
        },
      },
    ],
  } as const;

  // Schema with elementFormDefault="qualified"
  const qualifiedSchema = {
    targetNamespace: 'http://www.sap.com/abapxml',
    elementFormDefault: 'qualified',
    $xmlns: {
      asx: 'http://www.sap.com/abapxml',
    },
    element: [
      {
        name: 'root',
        type: 'asx:RootType',
      },
    ],
    complexType: [
      {
        name: 'RootType',
        sequence: {
          element: [
            { name: 'CHILD1', type: 'xs:string' },
            { name: 'CHILD2', type: 'xs:string' },
          ],
        },
      },
    ],
  } as const;

  it('unqualified schema should NOT prefix root or local elements', () => {
    const data = {
      CHILD1: 'value1',
      CHILD2: 'value2',
    };

    const xml = build(unqualifiedSchema, data, {
      rootElement: 'root',
      pretty: true,
    });
    console.log('Generated XML (unqualified):');
    console.log(xml);

    // Root element should NOT have prefix when elementFormDefault="unqualified"
    // This matches abapGit format where <abapGit> has no prefix
    assert.ok(xml.includes('<root'), 'Root element should exist');
    assert.ok(
      !xml.includes('<asx:root'),
      'Root element should NOT have prefix when unqualified',
    );

    // Local elements should NOT have prefix when elementFormDefault="unqualified"
    const hasUnprefixedChild1 =
      xml.includes('<CHILD1>') || xml.includes('<CHILD1 ');
    const hasPrefixedChild1 = xml.includes('<asx:CHILD1');

    assert.ok(
      hasUnprefixedChild1,
      'Local elements should NOT have prefix when unqualified',
    );
    assert.ok(
      !hasPrefixedChild1,
      'Local elements should NOT have asx: prefix when unqualified',
    );
  });

  it('qualified schema SHOULD prefix all elements', () => {
    const data = {
      CHILD1: 'value1',
      CHILD2: 'value2',
    };

    const xml = build(qualifiedSchema, data, {
      rootElement: 'root',
      pretty: true,
    });
    console.log('Generated XML (qualified):');
    console.log(xml);

    // All elements should have prefix when elementFormDefault="qualified"
    assert.ok(
      xml.includes('<asx:root'),
      'Root element should have prefix when qualified',
    );
    assert.ok(
      xml.includes('<asx:CHILD1'),
      'Local elements should have prefix when qualified',
    );
    assert.ok(
      xml.includes('<asx:CHILD2'),
      'Local elements should have prefix when qualified',
    );
  });
});
