/**
 * Unit tests for Schema Loader
 *
 * Tests loadSchema, linkSchema, defaultLoader, and related functions.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  loadSchema,
  linkSchema,
  defaultLoader,
  parseSchemaContent,
  createSchemaLoader,
  loadAndLinkSchema,
  type XsdLoader,
} from '../../src/xsd/loader';
import { parseXsd } from '../../src/xsd/parse';

describe('Schema Loader', () => {
  describe('defaultLoader', () => {
    it('should return null for non-existent file', () => {
      const result = defaultLoader('non-existent.xsd', '/tmp');
      assert.strictEqual(result, null);
    });
  });

  describe('parseSchemaContent', () => {
    it('should parse XSD content without filename', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="test" type="xs:string"/>
        </xs:schema>`;

      const schema = parseSchemaContent(xsd);
      assert.ok(schema.element);
      assert.strictEqual(schema.element[0].name, 'test');
      assert.ok(!schema.$filename);
    });

    it('should parse XSD content with filename', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="test" type="xs:string"/>
        </xs:schema>`;

      const schema = parseSchemaContent(xsd, 'test.xsd');
      assert.strictEqual(schema.$filename, 'test.xsd');
    });
  });

  describe('createSchemaLoader', () => {
    it('should create a caching schema loader', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="test" type="xs:string"/>
        </xs:schema>`;

      let loadCount = 0;
      const mockLoader: XsdLoader = () => {
        loadCount++;
        return xsd;
      };

      const schemaLoader = createSchemaLoader('/test', mockLoader);

      // First load
      const schema1 = schemaLoader('test.xsd');
      assert.ok(schema1);
      assert.strictEqual(loadCount, 1);

      // Second load - should be cached
      const schema2 = schemaLoader('test.xsd');
      assert.ok(schema2);
      assert.strictEqual(loadCount, 1); // Still 1 - cached

      // Same schema object
      assert.strictEqual(schema1, schema2);
    });

    it('should return null for missing schema', () => {
      const schemaLoader = createSchemaLoader('/test', () => null);
      const result = schemaLoader('missing.xsd');
      assert.strictEqual(result, null);
    });
  });

  describe('loadSchema', () => {
    it('should throw error when schema file not found', () => {
      assert.throws(() => {
        loadSchema('/non-existent/path/schema.xsd');
      }, /Failed to load schema/);
    });

    it('should load schema with custom loader', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="root" type="xs:string"/>
        </xs:schema>`;

      const loader: XsdLoader = (path) => {
        if (path.endsWith('test.xsd')) return xsd;
        return null;
      };

      const schema = loadSchema('test.xsd', { basePath: '/test', loader });
      assert.ok(schema.element);
      assert.strictEqual(schema.element[0].name, 'root');
    });

    it('should set $filename on loaded schema', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>`;

      const schema = loadSchema('my-schema.xsd', {
        basePath: '/test',
        loader: () => xsd,
      });

      assert.strictEqual(schema.$filename, 'my-schema.xsd');
    });

    it('should link schema when autoLink is true', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import schemaLocation="types.xsd"/>
        </xs:schema>`;

      const typesXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="TestType"/>
        </xs:schema>`;

      const loader: XsdLoader = (path) => {
        if (path.endsWith('main.xsd')) return mainXsd;
        if (path === 'types.xsd') return typesXsd;
        return null;
      };

      const schema = loadSchema('main.xsd', {
        basePath: '/test',
        loader,
        autoLink: true,
      });

      assert.ok(schema.$imports);
      assert.strictEqual(schema.$imports.length, 1);
    });

    it('should resolve schema when autoResolve is true', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import schemaLocation="types.xsd"/>
          <xs:complexType name="MainType"/>
        </xs:schema>`;

      const typesXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="ImportedType"/>
        </xs:schema>`;

      const loader: XsdLoader = (path) => {
        if (path.endsWith('main.xsd')) return mainXsd;
        if (path === 'types.xsd') return typesXsd;
        return null;
      };

      const schema = loadSchema('main.xsd', {
        basePath: '/test',
        loader,
        autoResolve: true,
      });

      // autoResolve flattens - no $imports
      assert.ok(!schema.$imports);

      // Both types should be merged
      const typeNames = schema.complexType?.map((ct) => ct.name) ?? [];
      assert.ok(typeNames.includes('MainType'));
      assert.ok(typeNames.includes('ImportedType'));
    });
  });

  describe('linkSchema', () => {
    it('should handle xs:override elements', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:override schemaLocation="base.xsd">
            <xs:complexType name="OverriddenType"/>
          </xs:override>
        </xs:schema>`;

      const baseXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="BaseType"/>
        </xs:schema>`;

      const loader: XsdLoader = (path) => {
        if (path === 'base.xsd') return baseXsd;
        return null;
      };

      const schema = parseXsd(mainXsd);
      linkSchema(schema, { basePath: '/test', loader });

      // Override should have $schema attached
      assert.ok(schema.override);
      const override = schema.override[0] as {
        $schema?: { $filename?: string };
      };
      assert.ok(override.$schema);
      assert.strictEqual(override.$schema.$filename, 'base.xsd');
    });

    it('should skip import without schemaLocation', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import namespace="http://example.com/missing"/>
        </xs:schema>`;

      const schema = parseXsd(xsd);
      linkSchema(schema, { basePath: '/test', loader: () => null });

      // Should not throw, $imports should be empty
      assert.ok(!schema.$imports || schema.$imports.length === 0);
    });

    it('should skip include without schemaLocation', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:include/>
        </xs:schema>`;

      const schema = parseXsd(xsd);
      linkSchema(schema, { basePath: '/test', loader: () => null });

      assert.ok(!schema.$includes || schema.$includes.length === 0);
    });

    it('should skip redefine without schemaLocation', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:redefine>
            <xs:complexType name="RedefinedType"/>
          </xs:redefine>
        </xs:schema>`;

      const schema = parseXsd(xsd);
      linkSchema(schema, { basePath: '/test', loader: () => null });

      // Should not throw
      assert.ok(schema.redefine);
    });

    it('should not throw when throwOnMissing is false', () => {
      const xsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import schemaLocation="missing.xsd"/>
        </xs:schema>`;

      const schema = parseXsd(xsd);

      // Should not throw
      linkSchema(schema, {
        basePath: '/test',
        loader: () => null,
        throwOnMissing: false,
      });
      assert.ok(!schema.$imports || schema.$imports.length === 0);
    });
  });

  describe('loadAndLinkSchema', () => {
    it('should load and link schema in one call', () => {
      const mainXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:import schemaLocation="types.xsd"/>
          <xs:element name="root" type="xs:string"/>
        </xs:schema>`;

      const typesXsd = `<?xml version="1.0"?>
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:complexType name="TestType"/>
        </xs:schema>`;

      const loader: XsdLoader = (path) => {
        if (path.endsWith('main.xsd')) return mainXsd;
        if (path === 'types.xsd') return typesXsd;
        return null;
      };

      const schema = loadAndLinkSchema('main.xsd', { loader });

      assert.ok(schema.element);
      assert.ok(schema.$imports);
      assert.strictEqual(schema.$imports.length, 1);
    });
  });
});
