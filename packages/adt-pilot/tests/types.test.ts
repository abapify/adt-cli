/**
 * Type validation tests for CodeReviewReport schema
 */

import { randomBytes } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { codeReviewOutputSchema, codeReviewInputSchema } from '../src/index.js';

// Generated per-process; never a real credential.
const TEST_SECRET = randomBytes(8).toString('hex');

describe('codeReviewOutputSchema', () => {
  it('accepts a valid package-mode report', () => {
    const report = {
      mode: 'package',
      target: 'ZPACKAGE',
      objects: ['/sap/bc/adt/oo/classes/zcl_example'],
      findings: [
        {
          objectUri: '/sap/bc/adt/oo/classes/zcl_example',
          priority: '3',
          description: 'Avoid SELECT *',
          checkName: 'CL_CI_TEST_SELECT_STAR',
          location: '/sap/bc/adt/oo/classes/zcl_example/source/main#start=10,0',
        },
      ],
      summary: {
        totalObjects: 1,
        totalFindings: 1,
        bySeverity: { '3': 1 },
      },
    } satisfies z.infer<typeof codeReviewOutputSchema>;

    expect(() => codeReviewOutputSchema.parse(report)).not.toThrow();
  });

  it('accepts a valid transport-mode report', () => {
    const report = {
      mode: 'transport',
      target: 'DEVK900001',
      objects: ['/sap/bc/adt/cts/transportrequests/DEVK900001'],
      findings: [],
      summary: { totalObjects: 1, totalFindings: 0, bySeverity: {} },
    };
    expect(() => codeReviewOutputSchema.parse(report)).not.toThrow();
  });

  it('accepts a report with no findings (empty package)', () => {
    const report = {
      mode: 'package',
      target: 'ZEMPTY',
      objects: [],
      findings: [],
      summary: { totalObjects: 0, totalFindings: 0, bySeverity: {} },
    };
    expect(() => codeReviewOutputSchema.parse(report)).not.toThrow();
  });

  it('accepts a report with an error finding', () => {
    const report = {
      mode: 'package',
      target: 'ZPACKAGE',
      objects: ['/sap/bc/adt/oo/classes/zcl_fail'],
      findings: [
        {
          objectUri: '/sap/bc/adt/oo/classes/zcl_fail',
          priority: 'error',
          description: 'ATC service unavailable',
        },
      ],
      summary: { totalObjects: 1, totalFindings: 1, bySeverity: { error: 1 } },
    };
    expect(() => codeReviewOutputSchema.parse(report)).not.toThrow();
  });

  it('rejects a report missing required fields', () => {
    const incomplete = {
      mode: 'package',
      target: 'ZPACKAGE',
      // missing objects, findings, summary
    };
    expect(() => codeReviewOutputSchema.parse(incomplete)).toThrow(z.ZodError);
  });
});

describe('codeReviewInputSchema', () => {
  it('accepts valid package mode input', () => {
    const input = {
      mode: 'package',
      packageName: 'ZPACKAGE',
      baseUrl: 'https://sap.example.com',
      username: 'DEVELOPER',
      password: TEST_SECRET,
    };
    expect(() => codeReviewInputSchema.parse(input)).not.toThrow();
  });

  it('accepts valid transport mode input with optional client', () => {
    const input = {
      mode: 'transport',
      transportNumber: 'DEVK900001',
      baseUrl: 'https://sap.example.com',
      username: 'DEVELOPER',
      password: TEST_SECRET,
      client: '100',
    };
    expect(() => codeReviewInputSchema.parse(input)).not.toThrow();
  });

  it('rejects input with missing baseUrl', () => {
    const input = {
      mode: 'package',
      packageName: 'ZPACKAGE',
      username: 'DEVELOPER',
      password: TEST_SECRET,
    };
    expect(() => codeReviewInputSchema.parse(input)).toThrow(z.ZodError);
  });

  it('rejects input with invalid mode', () => {
    const input = {
      mode: 'invalid',
      packageName: 'ZPACKAGE',
      baseUrl: 'https://sap.example.com',
      username: 'DEVELOPER',
      password: TEST_SECRET,
    };
    expect(() => codeReviewInputSchema.parse(input)).toThrow(z.ZodError);
  });
});
