import { describe, it, expect } from 'vitest';
import {
  parseAbapFilename,
  detectObjectTypeFromFilename,
  filenameToObjectUri,
  filenameToSourceUri,
  objectInfoToUri,
  getSourcePath,
} from './object-uri';

describe('object-uri utilities', () => {
  describe('parseAbapFilename', () => {
    it('should parse basic ABAP filename', () => {
      const result = parseAbapFilename('zcl_example.clas.abap');
      expect(result).toEqual({
        name: 'zcl_example',
        type: 'clas',
        section: undefined,
      });
    });

    it('should parse ABAP filename with section', () => {
      const result = parseAbapFilename('zcl_example.clas.definitions.abap');
      expect(result).toEqual({
        name: 'zcl_example',
        type: 'clas',
        section: 'definitions',
      });
    });

    it('should parse filename with multi-part section', () => {
      const result = parseAbapFilename('zcl_example.clas.test.classes.abap');
      expect(result).toEqual({
        name: 'zcl_example',
        type: 'clas',
        section: 'test.classes',
      });
    });

    it('should return null for non-ABAP files', () => {
      const result = parseAbapFilename('example.txt');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = parseAbapFilename('invalid.abap');
      expect(result).toBeNull();
    });
  });

  describe('detectObjectTypeFromFilename', () => {
    it('should detect interface from standard naming', () => {
      const result = detectObjectTypeFromFilename('zif_petstore.intf.abap');
      expect(result).toEqual({
        type: 'INTF',
        name: 'ZIF_PETSTORE',
        endpoint: 'oo/interfaces',
        description: 'Interface',
        section: undefined,
      });
    });

    it('should detect class from standard naming', () => {
      const result = detectObjectTypeFromFilename('zcl_test_impl.clas.abap');
      expect(result).toEqual({
        type: 'CLAS',
        name: 'ZCL_TEST_IMPL',
        endpoint: 'oo/classes',
        description: 'Class',
        section: undefined,
      });
    });

    it('should detect class with section', () => {
      const result = detectObjectTypeFromFilename(
        'zcl_test.clas.definitions.abap',
      );
      expect(result).toEqual({
        type: 'CLAS',
        name: 'ZCL_TEST',
        endpoint: 'oo/classes',
        description: 'Class',
        section: 'definitions',
      });
    });

    it('should return null for unrecognized patterns', () => {
      const result = detectObjectTypeFromFilename('unknown_file.txt');
      expect(result).toBeNull();
    });
  });

  describe('objectInfoToUri', () => {
    it('should convert object info to ADT URI', () => {
      const objectInfo = {
        type: 'INTF',
        name: 'ZIF_PETSTORE',
        endpoint: 'oo/interfaces',
        description: 'Interface',
      };

      const uri = objectInfoToUri(objectInfo);
      expect(uri).toBe('/sap/bc/adt/oo/interfaces/zif_petstore/');
    });
  });

  describe('filenameToObjectUri', () => {
    it('should convert filename directly to object URI', () => {
      const uri = filenameToObjectUri('zif_petstore.intf.abap');
      expect(uri).toBe('/sap/bc/adt/oo/interfaces/zif_petstore/');
    });

    it('should return null for unrecognized files', () => {
      const uri = filenameToObjectUri('unknown.txt');
      expect(uri).toBeNull();
    });
  });

  describe('getSourcePath', () => {
    it('should return inactive source path by default', () => {
      const objectInfo = {
        type: 'INTF',
        name: 'ZIF_TEST',
        endpoint: 'oo/interfaces',
        description: 'Interface',
      };

      const sourcePath = getSourcePath(objectInfo);
      expect(sourcePath).toBe('source/main?version=inactive');
    });

    it('should return active source path when specified', () => {
      const objectInfo = {
        type: 'INTF',
        name: 'ZIF_TEST',
        endpoint: 'oo/interfaces',
        description: 'Interface',
      };

      const sourcePath = getSourcePath(objectInfo, 'active');
      expect(sourcePath).toBe('source/main?version=active');
    });
  });

  describe('filenameToSourceUri', () => {
    it('should return complete URI info for deployment', () => {
      const result = filenameToSourceUri('zif_petstore.intf.abap');
      expect(result).toEqual({
        objectUri: '/sap/bc/adt/oo/interfaces/zif_petstore/',
        sourcePath: 'source/main?version=inactive',
      });
    });

    it('should support active version', () => {
      const result = filenameToSourceUri('zcl_test.clas.abap', 'active');
      expect(result).toEqual({
        objectUri: '/sap/bc/adt/oo/classes/zcl_test/',
        sourcePath: 'source/main?version=active',
      });
    });

    it('should return null for unrecognized files', () => {
      const result = filenameToSourceUri('unknown.txt');
      expect(result).toBeNull();
    });
  });
});
