/**
 * XSD Root Element Validation Tests
 *
 * Validates that XSD schemas correctly enforce abapGit as the ONLY valid root element.
 * Uses xs:redefine pattern to ensure object-specific elements (DD01V, etc.) can only
 * appear inside asx:values, not as document roots.
 *
 * Tests both:
 * - Positive: abapGit root element should validate
 * - Negative: Other root elements (like DD01V, DD02V, etc.) should NOT validate
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const xsdDir = join(__dirname, '../../xsd');

/** Check if xmllint is available */
function isXmllintAvailable(): boolean {
  try {
    execSync('xmllint --version 2>&1', { encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

/** Validate XML string against XSD using xmllint */
function validateXmlString(
  xml: string,
  xsdName: string,
): { valid: boolean; error?: string } {
  const xsdPath = join(xsdDir, `${xsdName}.xsd`);

  try {
    execSync(`echo '${xml}' | xmllint --schema "${xsdPath}" - --noout 2>&1`, {
      encoding: 'utf-8',
      shell: '/bin/bash',
    });
    return { valid: true };
  } catch (err) {
    const error = err as { stdout?: string; stderr?: string; message?: string };
    return {
      valid: false,
      error: error.stdout || error.stderr || error.message,
    };
  }
}

/**
 * Test case definition for root element validation
 */
interface RootValidationTestCase {
  /** XSD schema name (without .xsd) */
  xsdName: string;
  /** Valid root element that should be accepted */
  validRoot: {
    /** Child content (inside abapGit > asx:abap > asx:values) */
    content: string;
  };
  /** Invalid root elements that should be rejected */
  invalidRoots: Array<{
    /** Element name that should NOT be valid as root */
    element: string;
    /** Content for the invalid root */
    content: string;
  }>;
}

/**
 * Build valid abapGit XML structure
 */
function buildValidAbapGitXml(content: string): string {
  return `<?xml version="1.0"?><abapGit version="v1" serializer="TEST" serializer_version="v1" xmlns:asx="http://www.sap.com/abapxml"><asx:abap version="1.0"><asx:values>${content}</asx:values></asx:abap></abapGit>`;
}

/**
 * Build XML with arbitrary root element
 */
function buildXmlWithRoot(element: string, content: string): string {
  return `<?xml version="1.0"?><${element}>${content}</${element}>`;
}

/**
 * Run root element validation tests for a schema
 */
function runRootValidationTests(testCase: RootValidationTestCase): void {
  const xmllintAvailable = isXmllintAvailable();

  describe(`${testCase.xsdName}.xsd Root Element Validation`, () => {
    it('should validate abapGit as root element (positive test)', (t) => {
      if (!xmllintAvailable) {
        t.skip('xmllint not available');
        return;
      }

      const xml = buildValidAbapGitXml(testCase.validRoot.content);
      const result = validateXmlString(xml, testCase.xsdName);

      assert.ok(
        result.valid,
        `abapGit root should validate but got: ${result.error}`,
      );
    });

    for (const invalidRoot of testCase.invalidRoots) {
      it(`should REJECT ${invalidRoot.element} as root element (negative test)`, (t) => {
        if (!xmllintAvailable) {
          t.skip('xmllint not available');
          return;
        }

        const xml = buildXmlWithRoot(invalidRoot.element, invalidRoot.content);
        const result = validateXmlString(xml, testCase.xsdName);

        assert.ok(
          !result.valid,
          `${invalidRoot.element} should NOT be valid as root element! Schema allows wrong root.`,
        );
      });
    }
  });
}

// ============================================================================
// Test Cases
// ============================================================================

// DOMA schema test - uses xs:redefine to restrict root element
runRootValidationTests({
  xsdName: 'doma',
  validRoot: {
    content: '<DD01V><DOMNAME>TEST</DOMNAME></DD01V>',
  },
  invalidRoots: [
    {
      element: 'DD01V',
      content: '<DOMNAME>TEST</DOMNAME>',
    },
    {
      element: 'DD07V_TAB',
      content: '<DD07V><DOMNAME>TEST</DOMNAME></DD07V>',
    },
  ],
});
