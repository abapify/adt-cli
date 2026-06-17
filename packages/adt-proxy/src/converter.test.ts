import { describe, it, expect } from 'vitest';
import {
  jsonToXml,
  xmlToJson,
  detectContentType,
  isJsonContentType,
  isXmlContentType,
} from './converter';

// Mock schema with parse/build methods
const mockSchema = {
  _infer: undefined as unknown as any,
  parse: (_raw: string) => {
    return { result: { value: 'hello' } };
  },
  build: (data: any) => {
    return `<root><value>${data.value}</value></root>`;
  },
};

describe('converter', () => {
  describe('jsonToXml', () => {
    it('should convert JSON to XML using schema.build', () => {
      const json = JSON.stringify({ value: 'hello' });
      const result = jsonToXml(json, mockSchema);
      expect(result).toBe('<root><value>hello</value></root>');
    });

    it('should return original string if JSON parsing fails', () => {
      const result = jsonToXml('not json', mockSchema);
      expect(result).toBe('not json');
    });

    it('should return original string if schema has no build method', () => {
      const schema = { parse: () => ({}), _infer: undefined };
      const json = JSON.stringify({ value: 'hello' });
      const result = jsonToXml(json, schema as any);
      expect(result).toBe(json);
    });
  });

  describe('xmlToJson', () => {
    it('should convert XML to JSON using schema.parse', () => {
      const xml = '<root><value>hello</value></root>';
      const result = xmlToJson(xml, mockSchema);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual({ result: { value: 'hello' } });
    });

    it('should return original string if schema.parse fails', () => {
      const badSchema = {
        parse: () => {
          throw new Error('parse error');
        },
        _infer: undefined,
      };
      const result = xmlToJson('<root/>', badSchema as any);
      expect(result).toBe('<root/>');
    });
  });

  describe('detectContentType', () => {
    it('should detect JSON from content-type header', () => {
      expect(detectContentType('', 'application/json')).toBe('json');
      expect(detectContentType('', 'application/vnd.sap.adt.v1+json')).toBe(
        'json',
      );
    });

    it('should detect XML from content-type header', () => {
      expect(detectContentType('', 'application/xml')).toBe('xml');
      expect(detectContentType('', 'application/vnd.sap.adt.v1+xml')).toBe(
        'xml',
      );
    });

    it('should detect text from content-type header', () => {
      expect(detectContentType('', 'text/plain')).toBe('text');
    });

    it('should detect JSON from content heuristics', () => {
      expect(detectContentType('{"key": "value"}')).toBe('json');
      expect(detectContentType('[1, 2, 3]')).toBe('json');
    });

    it('should detect XML from content heuristics', () => {
      expect(detectContentType('<?xml version="1.0"?>')).toBe('xml');
      expect(detectContentType('<root>')).toBe('xml');
    });

    it('should detect text from content heuristics', () => {
      expect(detectContentType('hello world')).toBe('text');
    });
  });

  describe('isJsonContentType', () => {
    it('should return true for JSON content types', () => {
      expect(isJsonContentType('application/json')).toBe(true);
      expect(isJsonContentType('application/vnd.sap+json')).toBe(true);
      expect(isJsonContentType('text/json')).toBe(true);
    });

    it('should return false for non-JSON content types', () => {
      expect(isJsonContentType('application/xml')).toBe(false);
      expect(isJsonContentType('text/plain')).toBe(false);
    });
  });

  describe('isXmlContentType', () => {
    it('should return true for XML content types', () => {
      expect(isXmlContentType('application/xml')).toBe(true);
      expect(isXmlContentType('application/vnd.sap+xml')).toBe(true);
      expect(isXmlContentType('text/xml')).toBe(true);
    });

    it('should return false for non-XML content types', () => {
      expect(isXmlContentType('application/json')).toBe(false);
      expect(isXmlContentType('text/plain')).toBe(false);
    });
  });
});
