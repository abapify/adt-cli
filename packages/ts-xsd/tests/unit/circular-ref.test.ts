/**
 * Test for circular reference handling in type flattening
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateInterfaces } from '../../src/codegen/interface-generator';
import type { Schema } from '../../src/xsd/types';

describe('Circular Reference Handling', () => {
  it('should handle self-referential types without stack overflow', () => {
    // Schema with self-referential type (like a tree node)
    const schema: Schema = {
      $filename: 'tree.xsd',
      targetNamespace: 'http://example.com/tree',
      complexType: [
        {
          name: 'TreeNode',
          sequence: {
            element: [
              { name: 'value', type: 'xs:string' },
              {
                name: 'children',
                type: 'TreeNode',
                minOccurs: '0',
                maxOccurs: 'unbounded',
              },
            ],
          },
        },
      ],
      element: [{ name: 'tree', type: 'TreeNode' }],
    };

    // This should not throw stack overflow
    const { code } = generateInterfaces(schema, { flatten: true });

    assert.ok(code.includes('TreeSchema'), 'Should generate root type');
    assert.ok(code.includes('value'), 'Should have value property');
    // Circular ref should be handled (either as unknown or type reference)
    console.log('Generated code:', code);
  });

  it('should handle mutually recursive types without stack overflow', () => {
    // Schema with mutually recursive types (A references B, B references A)
    const schema: Schema = {
      $filename: 'mutual.xsd',
      targetNamespace: 'http://example.com/mutual',
      complexType: [
        {
          name: 'TypeA',
          sequence: {
            element: [
              { name: 'name', type: 'xs:string' },
              { name: 'refB', type: 'TypeB', minOccurs: '0' },
            ],
          },
        },
        {
          name: 'TypeB',
          sequence: {
            element: [
              { name: 'id', type: 'xs:integer' },
              { name: 'refA', type: 'TypeA', minOccurs: '0' },
            ],
          },
        },
      ],
      element: [{ name: 'root', type: 'TypeA' }],
    };

    // This should not throw stack overflow
    const { code } = generateInterfaces(schema, { flatten: true });

    assert.ok(code.includes('MutualSchema'), 'Should generate root type');
    console.log('Generated code:', code);
  });

  it('should handle deep inheritance chain without stack overflow', () => {
    // Schema with deep inheritance (like SAP ADT schemas)
    const schema: Schema = {
      $filename: 'inheritance.xsd',
      targetNamespace: 'http://example.com/inheritance',
      complexType: [
        {
          name: 'BaseObject',
          sequence: {
            element: [{ name: 'name', type: 'xs:string' }],
          },
          attribute: [{ name: 'type', type: 'xs:string' }],
        },
        {
          name: 'MainObject',
          complexContent: {
            extension: {
              base: 'BaseObject',
              sequence: {
                element: [
                  { name: 'description', type: 'xs:string', minOccurs: '0' },
                ],
              },
            },
          },
        },
        {
          name: 'SourceObject',
          complexContent: {
            extension: {
              base: 'MainObject',
              sequence: {
                element: [
                  { name: 'source', type: 'xs:string', minOccurs: '0' },
                ],
              },
            },
          },
        },
        {
          name: 'ClassObject',
          complexContent: {
            extension: {
              base: 'SourceObject',
              sequence: {
                element: [
                  { name: 'methods', type: 'xs:string', minOccurs: '0' },
                  // Self-reference for nested classes
                  { name: 'nestedClass', type: 'ClassObject', minOccurs: '0' },
                ],
              },
            },
          },
        },
      ],
      element: [{ name: 'class', type: 'ClassObject' }],
    };

    // This should not throw stack overflow
    const { code } = generateInterfaces(schema, { flatten: true });

    assert.ok(code.includes('InheritanceSchema'), 'Should generate root type');
    assert.ok(code.includes('name'), 'Should have inherited name property');
    console.log('Generated code:', code);
  });
});
