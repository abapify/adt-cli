/**
 * parseLockResponse unit tests
 *
 * Validates XML parsing of SAP lock response format:
 * - LOCK_HANDLE extraction
 * - CORRNR (transport) extraction
 * - CORRUSER extraction
 * - Error on missing handle
 */

import { describe, it, expect } from 'vitest';
import { parseLockResponse } from '../src/service';

const LOCK_RESPONSE_FULL = `<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
    <DATA>
      <LOCK_HANDLE>XYZABC123456</LOCK_HANDLE>
      <CORRNR>DEVK900001</CORRNR>
      <CORRUSER>DEVELOPER</CORRUSER>
    </DATA>
  </asx:values>
</asx:abap>`;

const LOCK_RESPONSE_HANDLE_ONLY = `<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
    <DATA>
      <LOCK_HANDLE>HANDLE_NO_TR</LOCK_HANDLE>
    </DATA>
  </asx:values>
</asx:abap>`;

const LOCK_RESPONSE_EMPTY = `<?xml version="1.0" encoding="utf-8"?>
<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
    <DATA/>
  </asx:values>
</asx:abap>`;

describe('parseLockResponse', () => {
  it('extracts all fields from full response', () => {
    const result = parseLockResponse(LOCK_RESPONSE_FULL);

    expect(result.handle).toBe('XYZABC123456');
    expect(result.correlationNumber).toBe('DEVK900001');
    expect(result.correlationUser).toBe('DEVELOPER');
  });

  it('extracts handle when CORRNR and CORRUSER are missing', () => {
    const result = parseLockResponse(LOCK_RESPONSE_HANDLE_ONLY);

    expect(result.handle).toBe('HANDLE_NO_TR');
    expect(result.correlationNumber).toBeUndefined();
    expect(result.correlationUser).toBeUndefined();
  });

  it('throws when LOCK_HANDLE is missing', () => {
    expect(() => parseLockResponse(LOCK_RESPONSE_EMPTY)).toThrow(
      'Failed to parse lock handle',
    );
  });

  it('throws on empty string', () => {
    expect(() => parseLockResponse('')).toThrow('Failed to parse lock handle');
  });

  it('handles handles with special characters', () => {
    const xml = '<DATA><LOCK_HANDLE>H+A/N=D_LE</LOCK_HANDLE></DATA>';
    const result = parseLockResponse(xml);
    expect(result.handle).toBe('H+A/N=D_LE');
  });
});
