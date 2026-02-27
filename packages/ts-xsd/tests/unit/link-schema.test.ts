/**
 * Tests for linkSchema - automatic schemaLocation resolution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  parseXsd,
  linkSchema,
  loadSchema,
  type XsdLoader,
} from '../../src/xsd';

describe('linkSchema', () => {
  describe('xs:import resolution', () => {
    it('should resolve import schemaLocation and populate $imports', () => {
      // Main schema with import
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   xmlns:base="http://example.com/base"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/base" schemaLocation="base.xsd"/>
          <xs:element name="main" type="base:BaseType"/>
        </xs:schema>`;

      // Imported schema
      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/base">
          <xs:complexType name="BaseType">
            <xs:sequence>
              <xs:element name="value" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;

      // Mock loader
      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'base.xsd') return baseXsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      // Verify $imports is populated
      assert.ok(schema.$imports, '$imports should be populated');
      assert.strictEqual(schema.$imports.length, 1, 'Should have 1 import');
      assert.strictEqual(
        schema.$imports[0].targetNamespace,
        'http://example.com/base',
      );
      assert.strictEqual(schema.$imports[0].$filename, 'base.xsd');
    });

    it('should handle missing schemaLocation gracefully', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import namespace="http://example.com/missing"/>
        </xs:schema>`;

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader: () => null });

      // Should not throw, $imports should be undefined or empty
      assert.ok(!schema.$imports || schema.$imports.length === 0);
    });

    it('should throw on missing schema when throwOnMissing is true', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import namespace="http://example.com/missing" schemaLocation="missing.xsd"/>
        </xs:schema>`;

      const schema = parseXsd(mainXsd);

      assert.throws(() => {
        linkSchema(schema, {
          basePath: '/test',
          loader: () => null,
          throwOnMissing: true,
        });
      }, /Failed to load schema: missing.xsd/);
    });
  });

  describe('xs:include resolution', () => {
    it('should resolve include schemaLocation and populate $includes', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:include schemaLocation="types.xsd"/>
          <xs:element name="main" type="MainType"/>
        </xs:schema>`;

      const typesXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:complexType name="MainType">
            <xs:sequence>
              <xs:element name="name" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'types.xsd') return typesXsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      assert.ok(schema.$includes, '$includes should be populated');
      assert.strictEqual(schema.$includes.length, 1, 'Should have 1 include');
      assert.strictEqual(schema.$includes[0].$filename, 'types.xsd');
    });
  });

  describe('xs:redefine resolution', () => {
    it('should resolve redefine schemaLocation and add base to $includes', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:redefine schemaLocation="base-types.xsd">
            <xs:complexType name="BaseType">
              <xs:complexContent>
                <xs:extension base="BaseType">
                  <xs:sequence>
                    <xs:element name="extra" type="xs:string"/>
                  </xs:sequence>
                </xs:extension>
              </xs:complexContent>
            </xs:complexType>
          </xs:redefine>
        </xs:schema>`;

      const baseTypesXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:complexType name="BaseType">
            <xs:sequence>
              <xs:element name="value" type="xs:string"/>
            </xs:sequence>
          </xs:complexType>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'base-types.xsd') return baseTypesXsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      // Redefine block should have $schema populated with base schema
      assert.ok(schema.redefine, 'redefine should exist');
      assert.strictEqual(schema.redefine.length, 1);
      assert.ok(
        schema.redefine[0].complexType,
        'redefine should have complexType',
      );

      // Base schema is attached to redefine.$schema (not $includes)
      const redefine = schema.redefine[0] as {
        $schema?: { $filename?: string };
      };
      assert.ok(redefine.$schema, 'redefine should have $schema');
      assert.strictEqual(redefine.$schema.$filename, 'base-types.xsd');
    });
  });

  describe('recursive resolution', () => {
    it('should recursively resolve nested imports', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/level1" schemaLocation="level1.xsd"/>
        </xs:schema>`;

      const level1Xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/level1">
          <xs:import namespace="http://example.com/level2" schemaLocation="level2.xsd"/>
          <xs:complexType name="Level1Type"/>
        </xs:schema>`;

      const level2Xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/level2">
          <xs:complexType name="Level2Type"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'level1.xsd') return level1Xsd;
        if (schemaLocation === 'level2.xsd') return level2Xsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      // Main -> level1
      assert.ok(schema.$imports);
      assert.strictEqual(schema.$imports.length, 1);
      assert.strictEqual(
        schema.$imports[0].targetNamespace,
        'http://example.com/level1',
      );

      // level1 -> level2
      const level1 = schema.$imports[0];
      assert.ok(level1.$imports);
      assert.strictEqual(level1.$imports.length, 1);
      assert.strictEqual(
        level1.$imports[0].targetNamespace,
        'http://example.com/level2',
      );
    });

    it('should handle circular references without infinite loop', () => {
      const schemaA = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/a">
          <xs:import namespace="http://example.com/b" schemaLocation="b.xsd"/>
        </xs:schema>`;

      const schemaB = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/b">
          <xs:import namespace="http://example.com/a" schemaLocation="a.xsd"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'a.xsd') return schemaA;
        if (schemaLocation === 'b.xsd') return schemaB;
        return null;
      };

      const schema = parseXsd(schemaA);

      // Should not hang or throw
      linkSchema(schema, { basePath: '/test', loader });

      assert.ok(schema.$imports);
      assert.strictEqual(schema.$imports.length, 1);
    });
  });

  describe('loadSchema with autoLink option', () => {
    it('should populate $imports when autoLink is true', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   xmlns:base="http://example.com/base"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/base" schemaLocation="base.xsd"/>
        </xs:schema>`;

      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/base">
          <xs:complexType name="BaseType"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'base.xsd') return baseXsd;
        if (schemaLocation.endsWith('main.xsd')) return mainXsd;
        return null;
      };

      const schema = loadSchema('main.xsd', {
        basePath: '/test',
        loader,
        autoLink: true,
      });

      assert.ok(schema.$imports, '$imports should be populated with autoLink');
      assert.strictEqual(schema.$imports.length, 1);
    });
  });

  describe('loadSchema with autoResolve option', () => {
    it('should flatten schema when autoResolve is true', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   xmlns:base="http://example.com/base"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/base" schemaLocation="base.xsd"/>
          <xs:complexType name="MainType"/>
        </xs:schema>`;

      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/base">
          <xs:complexType name="BaseType"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'base.xsd') return baseXsd;
        if (schemaLocation.endsWith('main.xsd')) return mainXsd;
        return null;
      };

      const schema = loadSchema('main.xsd', {
        basePath: '/test',
        loader,
        autoResolve: true,
      });

      // autoResolve flattens - no $imports
      assert.ok(!schema.$imports, '$imports should NOT exist after resolve');

      // Both types should be merged into one schema
      assert.ok(schema.complexType, 'complexType should exist');
      const typeNames = schema.complexType.map(
        (ct: { name: string }) => ct.name,
      );
      assert.ok(typeNames.includes('MainType'), 'Should have MainType');
      assert.ok(
        typeNames.includes('BaseType'),
        'Should have BaseType from import',
      );
    });

    it('should keep $imports with autoLink but not autoResolve', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   xmlns:base="http://example.com/base"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/base" schemaLocation="base.xsd"/>
          <xs:complexType name="MainType"/>
        </xs:schema>`;

      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/base">
          <xs:complexType name="BaseType"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'base.xsd') return baseXsd;
        if (schemaLocation.endsWith('main.xsd')) return mainXsd;
        return null;
      };

      const schema = loadSchema('main.xsd', {
        basePath: '/test',
        loader,
        autoLink: true, // NOT autoResolve
      });

      // autoLink keeps structure - $imports exists
      assert.ok(schema.$imports, '$imports should exist with autoLink');
      assert.strictEqual(schema.$imports.length, 1);

      // Main schema only has its own type
      assert.ok(schema.complexType, 'complexType should exist');
      assert.strictEqual(schema.complexType.length, 1);
      assert.strictEqual(schema.complexType[0].name, 'MainType');

      // BaseType is in $imports, not merged
      assert.strictEqual(schema.$imports![0].complexType![0].name, 'BaseType');
    });
  });

  describe('mixed import/include/redefine', () => {
    it('should handle schema with all composition types', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   xmlns:ext="http://example.com/external"
                   targetNamespace="http://example.com/main">
          <xs:import namespace="http://example.com/external" schemaLocation="external.xsd"/>
          <xs:include schemaLocation="internal.xsd"/>
          <xs:redefine schemaLocation="base.xsd">
            <xs:complexType name="BaseType">
              <xs:complexContent>
                <xs:extension base="BaseType">
                  <xs:attribute name="id" type="xs:string"/>
                </xs:extension>
              </xs:complexContent>
            </xs:complexType>
          </xs:redefine>
        </xs:schema>`;

      const externalXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/external">
          <xs:complexType name="ExternalType"/>
        </xs:schema>`;

      const internalXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:complexType name="InternalType"/>
        </xs:schema>`;

      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                   targetNamespace="http://example.com/main">
          <xs:complexType name="BaseType"/>
        </xs:schema>`;

      const loader: XsdLoader = (schemaLocation: string) => {
        if (schemaLocation === 'external.xsd') return externalXsd;
        if (schemaLocation === 'internal.xsd') return internalXsd;
        if (schemaLocation === 'base.xsd') return baseXsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      // Check imports (external namespace)
      assert.ok(schema.$imports);
      assert.strictEqual(schema.$imports.length, 1);
      assert.strictEqual(
        schema.$imports[0].targetNamespace,
        'http://example.com/external',
      );

      // Check includes (internal only - redefine base goes to redefine.$schema)
      assert.ok(schema.$includes);
      assert.strictEqual(schema.$includes.length, 1);
      assert.strictEqual(schema.$includes[0].$filename, 'internal.xsd');

      // Check redefine.$schema (base schema)
      assert.ok(schema.redefine);
      const redefine = schema.redefine[0] as {
        $schema?: { $filename?: string };
      };
      assert.ok(redefine.$schema, 'redefine should have $schema');
      assert.strictEqual(redefine.$schema.$filename, 'base.xsd');
    });
  });
});
