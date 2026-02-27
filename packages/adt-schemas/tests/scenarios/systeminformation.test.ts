import { describe, it, expect } from 'vitest';
import { fixtures } from 'adt-fixtures';
import {
  systeminformation,
  type SystemInformationJson,
} from '../../src/schemas/index';

/**
 * Test for System Information response - GET /sap/bc/adt/core/http/systeminformation
 *
 * Fixture: Real SAP JSON response with system details
 * Source: GET /sap/bc/adt/core/http/systeminformation
 *
 * Note: This is JSON (not XML), so we test it separately
 */
describe('SystemInformationScenario', () => {
  describe('systeminformation', () => {
    it('parses JSON correctly', async () => {
      const json: string = await fixtures.core.http.systeminformation.load();
      const parsed: SystemInformationJson = systeminformation.parse(json);

      // Validate system identification
      expect(parsed.systemID).toBe('NPL');
      expect(parsed.client).toBe('001');

      // Validate user information
      expect(parsed.userName).toBe('DEVELOPER');
      expect(parsed.userFullName).toBe('Developer User');
      expect(parsed.language).toBe('EN');

      // Validate system version
      expect(parsed.release).toBe('756');
      expect(parsed.sapRelease).toBe('SAP_BASIS 7.56');

      // Type assertions - verify full typing
      const systemID: string | undefined = parsed.systemID;
      const client: string | undefined = parsed.client;
      const userName: string | undefined = parsed.userName;
      const userFullName: string | undefined = parsed.userFullName;
      const language: string | undefined = parsed.language;
      const release: string | undefined = parsed.release;
      const sapRelease: string | undefined = parsed.sapRelease;

      // Suppress unused variable warnings
      void systemID;
      void client;
      void userName;
      void userFullName;
      void language;
      void release;
      void sapRelease;
    });

    it('builds JSON correctly', () => {
      const data: SystemInformationJson = {
        systemID: 'TEST',
        client: '100',
        userName: 'TESTUSER',
        userFullName: 'Test User',
        language: 'DE',
        release: '758',
        sapRelease: 'SAP_BASIS 7.58',
      };

      const json: string = systeminformation.build(data);
      const parsed: SystemInformationJson = JSON.parse(json);

      expect(parsed.systemID).toBe('TEST');
      expect(parsed.client).toBe('100');
      expect(parsed.userName).toBe('TESTUSER');
      expect(parsed.release).toBe('758');
    });

    it('handles optional fields', () => {
      const data: SystemInformationJson = {
        systemID: 'MINIMAL',
      };

      const json: string = systeminformation.build(data);
      const parsed: SystemInformationJson = JSON.parse(json);

      expect(parsed.systemID).toBe('MINIMAL');
      expect(parsed.client).toBeUndefined();
      expect(parsed.userName).toBeUndefined();
    });

    it('handles additional properties', () => {
      const json = `{
        "systemID": "NPL",
        "customField": "customValue"
      }`;

      const parsed: SystemInformationJson = systeminformation.parse(json);

      expect(parsed.systemID).toBe('NPL');
      expect(parsed['customField']).toBe('customValue');
    });
  });
});
