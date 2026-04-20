import { describe, it, expect } from 'vitest';
import {
  ALL_PROFILES,
  WhitelistViolationError,
  assertClassAllowed,
  getProfile,
} from '../src/profiles';

describe('target profiles', () => {
  it('s4-cloud uses /ui2/cl_json as JSON strategy (released for ABAP Cloud per SAP Note 2931335)', () => {
    const json = getProfile('s4-cloud').json;
    expect(json.kind).toBe('ui2_cl_json');
    expect('helperClass' in json ? json.helperClass : undefined).toBe(
      '/ui2/cl_json',
    );
  });

  it('s4-cloud whitelist contains web client manager and /ui2/cl_json but not cl_http_client', () => {
    const profile = getProfile('s4-cloud');
    const lower = new Set(
      [...profile.allowedClasses].map((c) => c.toLowerCase()),
    );
    expect(lower.has('cl_web_http_client_manager')).toBe(true);
    expect(lower.has('/ui2/cl_json')).toBe(true);
    expect(lower.has('cl_http_client')).toBe(false);
  });

  it('assertClassAllowed accepts whitelisted classes case-insensitively', () => {
    const profile = getProfile('s4-cloud');
    expect(() =>
      assertClassAllowed(profile, 'CL_WEB_HTTP_CLIENT_MANAGER'),
    ).not.toThrow();
    expect(() =>
      assertClassAllowed(profile, 'cl_http_destination_provider'),
    ).not.toThrow();
  });

  it('assertClassAllowed throws WhitelistViolationError for disallowed class', () => {
    const profile = getProfile('s4-cloud');
    let caught: unknown;
    try {
      // cl_http_client is a classic-only class — disallowed on cloud profile.
      assertClassAllowed(profile, 'cl_http_client');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(WhitelistViolationError);
    const err = caught as WhitelistViolationError;
    expect(err.message).toContain('cl_http_client');
    expect(err.message).toContain('s4-cloud');
    expect(err.className).toBe('cl_http_client');
    expect(err.profileId).toBe('s4-cloud');
  });

  it('ALL_PROFILES contains all three profile ids', () => {
    expect([...ALL_PROFILES].sort((a, b) => a.localeCompare(b))).toEqual(
      ['on-prem-classic', 's4-cloud', 's4-onprem-modern'].sort((a, b) =>
        a.localeCompare(b),
      ),
    );
  });
});
