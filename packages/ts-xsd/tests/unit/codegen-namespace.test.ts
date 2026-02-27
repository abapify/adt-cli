/**
 * Tests for namespace handling in codegen/resolve
 *
 * Specifically tests the abapGit pattern where:
 * - Root element (abapGit) is in NO namespace (from abapgit.xsd with no targetNamespace)
 * - Child elements (asx:abap, asx:values) are in asx namespace (from asx.xsd)
 * - Data elements (DEVC, CTEXT) are unqualified (no namespace prefix)
 *
 * The issue: When resolveSchema merges schemas, it assigns the root schema's
 * targetNamespace to ALL elements, even those from imported schemas that have
 * different (or no) targetNamespace.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolveSchema } from '../../src/xsd/resolve';
import type { Schema } from '../../src/xsd/types';

describe('Multi-namespace schema handling (abapGit pattern)', () => {
  /**
   * abapGit XML format structure:
   *
   * <abapGit version="v1.0.0" serializer="LCL_OBJECT_DEVC" serializer_version="v1.0.0">
   *   <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
   *     <asx:values>
   *       <DEVC>
   *         <CTEXT>Package description</CTEXT>
   *       </DEVC>
   *     </asx:values>
   *   </asx:abap>
   * </abapGit>
   *
   * Key characteristics:
   * 1. <abapGit> - NO namespace (root element from schema without targetNamespace)
   * 2. <asx:abap> - asx namespace, xmlns:asx declared HERE
   * 3. <asx:values> - asx namespace (prefix)
   * 4. <DEVC>, <CTEXT> - NO namespace prefix (unqualified local elements)
   */

  describe('resolveSchema namespace handling', () => {
    // Simulates asx.xsd - has targetNamespace
    const asxSchema: Schema = {
      targetNamespace: 'http://www.sap.com/abapxml',
      elementFormDefault: 'qualified',
      $xmlns: {
        asx: 'http://www.sap.com/abapxml',
      },
      element: [{ name: 'abap', type: 'asx:AbapType' }],
      complexType: [
        {
          name: 'AbapType',
          sequence: {
            element: [{ name: 'values', type: 'asx:AbapValuesType' }],
          },
          attribute: [{ name: 'version', type: 'xs:string', default: '1.0' }],
        },
        {
          name: 'AbapValuesType',
          sequence: {
            element: [{ name: 'DEVC', type: 'asx:DevcType', minOccurs: '0' }],
          },
        },
        {
          name: 'DevcType',
          sequence: {
            element: [{ name: 'CTEXT', type: 'xs:string' }],
          },
        },
      ],
    };

    // Simulates abapgit.xsd - NO targetNamespace, imports asx
    const abapgitSchema: Schema = {
      // NO targetNamespace - abapGit element should be in no namespace
      $xmlns: {
        asx: 'http://www.sap.com/abapxml',
      },
      element: [
        {
          name: 'abapGit',
          complexType: {
            sequence: {
              element: [{ ref: 'asx:abap' }],
            },
            attribute: [
              { name: 'version', type: 'xs:string', use: 'required' },
              { name: 'serializer', type: 'xs:string', use: 'required' },
              {
                name: 'serializer_version',
                type: 'xs:string',
                use: 'required',
              },
            ],
          },
        },
      ],
      $imports: [asxSchema],
    };

    // Simulates devc.xsd - HAS targetNamespace, imports abapgit
    const devcSchema: Schema = {
      targetNamespace: 'http://www.sap.com/abapxml',
      elementFormDefault: 'unqualified',
      $xmlns: {
        asx: 'http://www.sap.com/abapxml',
      },
      // No elements - just imports abapgit which has the root element
      $imports: [abapgitSchema],
    };

    it('should preserve undefined targetNamespace for schemas without one', () => {
      // When we resolve abapgitSchema (which has NO targetNamespace),
      // the resolved schema should also have NO targetNamespace
      const resolved = resolveSchema(abapgitSchema);

      assert.strictEqual(
        resolved.targetNamespace,
        undefined,
        `Resolved schema should have undefined targetNamespace, got: ${resolved.targetNamespace}`,
      );
    });

    it('should NOT inherit targetNamespace from imported schemas', () => {
      // abapgitSchema has no targetNamespace but imports asxSchema which has one
      // The resolved schema should NOT inherit the imported schema's targetNamespace
      const resolved = resolveSchema(abapgitSchema);

      assert.strictEqual(
        resolved.targetNamespace,
        undefined,
        `Should not inherit targetNamespace from $imports. Got: ${resolved.targetNamespace}`,
      );
    });

    it('should merge elements from chameleon schemas (no targetNamespace)', () => {
      // Chameleon schemas (no targetNamespace) adopt the importing schema's namespace
      // This is standard XSD behavior - elements from schemas without targetNamespace
      // are merged into the importing schema's namespace

      const resolved = resolveSchema(devcSchema);

      // devc schema's targetNamespace should be preserved
      assert.strictEqual(
        resolved.targetNamespace,
        'http://www.sap.com/abapxml',
        'devc schema targetNamespace should be preserved',
      );

      // The abapGit element SHOULD be merged because abapgit.xsd has NO targetNamespace
      // (chameleon schema - adopts importing schema's namespace)
      const abapGitElement = resolved.element?.find(
        (e) => e.name === 'abapGit',
      );
      assert.ok(
        abapGitElement,
        'abapGit element should be merged (chameleon schema)',
      );

      // Types ARE merged (needed for extension resolution)
      assert.ok(
        resolved.complexType?.some((ct) => ct.name === 'AbapType'),
        'Types should still be merged',
      );
    });

    it('should preserve $xmlns from all merged schemas', () => {
      const resolved = resolveSchema(devcSchema);

      // $xmlns should be preserved
      assert.ok(resolved.$xmlns, 'Resolved schema should have $xmlns');
      assert.strictEqual(
        resolved.$xmlns?.asx,
        'http://www.sap.com/abapxml',
        'Should preserve asx namespace mapping',
      );
    });
  });
});
