import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMcpToolAllowed,
  isMcpToolListed,
  MCP_TOOL_SCOPE_CATALOGUE,
  type McpRequestAccess,
} from '../src/lib/tools/scope-catalogue.js';

const access: McpRequestAccess = {
  classes: ['server', 'read'],
  destinationKeys: ['dev'],
};

test('delegated read envelope projects the complete server-owned read catalogue', () => {
  const listed = Object.keys(MCP_TOOL_SCOPE_CATALOGUE)
    .filter((name) => isMcpToolListed(access, name))
    .sort();

  assert.ok(listed.length > 10);
  for (const readTool of [
    'system_info',
    'get_object',
    'find_references',
    'cts_get_transport',
  ]) {
    assert.ok(listed.includes(readTool), `missing read tool ${readTool}`);
  }
  // atc_run and run_unit_tests require safe_execute, not ordinary read.
  assert.ok(!listed.includes('atc_run'));
  assert.ok(!listed.includes('run_unit_tests'));
  assert.ok(!listed.includes('lock_object'));
});

test('delegated read envelope permits review checks but denies mutation', () => {
  assert.strictEqual(
    isMcpToolAllowed(access, 'get_object', {
      destination: 'dev',
      objectName: 'ZCL_SCOPE_TEST',
    }),
    true,
  );
  assert.strictEqual(
    isMcpToolAllowed(access, 'lock_object', {
      destination: 'dev',
      objectName: 'ZCL_SCOPE_TEST',
    }),
    false,
  );
  // atc_run and run_unit_tests require safe_execute class, not read.
  assert.strictEqual(
    isMcpToolAllowed(access, 'atc_run', {
      destination: 'dev',
      scope: { kind: 'transport_request', trkorr: 'DEVK900001' },
    }),
    false,
  );
  assert.strictEqual(
    isMcpToolAllowed(access, 'run_unit_tests', {
      destination: 'dev',
      objectType: 'CLAS',
      objectName: 'ZCL_SCOPE_TEST',
      withCoverage: true,
      coverageFormat: 'sonar-generic',
    }),
    false,
  );
  assert.strictEqual(isMcpToolAllowed(access, 'unknown_tool'), false);
});
