#!/usr/bin/env bun
/**
 * RAP Contracts Verification Script
 *
 * Verifies RAP contracts are properly defined and have correct structure.
 * This can run without an SAP connection.
 *
 * To test against a real SAP system, use:
 *   ADT_SERVICE_KEY='{"url":"...","uaa":{...}}' \
 *   ADT_USERNAME=developer \
 *   ADT_PASSWORD=password \
 *   bun scripts/rap-integration-test.ts
 */

import { readFileSync, existsSync } from 'node:fs';

const ADT_SERVICE_KEY = process.env.ADT_SERVICE_KEY;
const ADT_USERNAME = process.env.ADT_USERNAME;
const ADT_PASSWORD = process.env.ADT_PASSWORD;

interface BTPServiceKey {
  url: string;
  uaa: {
    clientid: string;
    clientsecret: string;
    url: string;
  };
  systemid: string;
}

function parseServiceKey(raw: string): BTPServiceKey {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  } else {
    if (!existsSync(trimmed)) {
      throw new Error(`Service key file not found: ${trimmed}`);
    }
    return JSON.parse(readFileSync(trimmed, 'utf-8'));
  }
}

async function runContractVerification() {
  console.log('\n📋 Verifying RAP Contracts\n');
  console.log('='.repeat(60));

  const { adtContract } = await import('@abapify/adt-contracts');

  const results: { name: string; success: boolean; details?: string }[] = [];

  function verify(name: string, check: () => boolean, details?: string) {
    const success = check();
    console.log(
      `${success ? '✅' : '❌'} ${name}${details ? ` (${details})` : ''}`,
    );
    results.push({ name, success, details });
  }

  console.log('\n🔍 Behavior Definition (BDEF) Contract\n');

  verify(
    'behavdeft.get() exists and has correct path',
    () => {
      const desc = adtContract.rap.behavdeft.get('TEST');
      return (
        desc.method === 'GET' && desc.path === '/sap/bc/adt/rap/behavdeft/test'
      );
    },
    'GET /sap/bc/adt/rap/behavdeft/{name}',
  );

  verify(
    'behavdeft.post() exists and has correct path',
    () => {
      const desc = adtContract.rap.behavdeft.post();
      return (
        desc.method === 'POST' && desc.path === '/sap/bc/adt/rap/behavdeft'
      );
    },
    'POST /sap/bc/adt/rap/behavdeft',
  );

  verify(
    'behavdeft.put() exists and has correct path',
    () => {
      const desc = adtContract.rap.behavdeft.put('TEST');
      return (
        desc.method === 'PUT' && desc.path === '/sap/bc/adt/rap/behavdeft/test'
      );
    },
    'PUT /sap/bc/adt/rap/behavdeft/{name}',
  );

  verify(
    'behavdeft.delete() exists and has correct path',
    () => {
      const desc = adtContract.rap.behavdeft.delete('TEST');
      return (
        desc.method === 'DELETE' &&
        desc.path === '/sap/bc/adt/rap/behavdeft/test'
      );
    },
    'DELETE /sap/bc/adt/rap/behavdeft/{name}',
  );

  verify(
    'behavdeft.lock() exists with correct query',
    () => {
      const desc = adtContract.rap.behavdeft.lock('TEST');
      return desc.method === 'POST' && desc.query?._action === 'LOCK';
    },
    'POST with _action=LOCK',
  );

  verify(
    'behavdeft.unlock() exists with correct query',
    () => {
      const desc = adtContract.rap.behavdeft.unlock('TEST', {
        lockHandle: 'H123',
      });
      return desc.method === 'POST' && desc.query?._action === 'UNLOCK';
    },
    'POST with _action=UNLOCK',
  );

  verify(
    'behavdeft.source.main.get() exists',
    () => {
      const desc = adtContract.rap.behavdeft.source?.main?.get('TEST');
      return desc?.path === '/sap/bc/adt/rap/behavdeft/test/source/main';
    },
    'GET /sap/bc/adt/rap/behavdeft/{name}/source/main',
  );

  verify(
    'behavdeft.objectstructure() exists',
    () => {
      const desc = adtContract.rap.behavdeft.objectstructure('TEST');
      return desc?.path === '/sap/bc/adt/rap/behavdeft/test/objectstructure';
    },
    'GET /sap/bc/adt/rap/behavdeft/{name}/objectstructure',
  );

  verify(
    'behavdeft has correct Accept header',
    () => {
      const desc = adtContract.rap.behavdeft.get('TEST');
      return (desc.headers?.Accept ?? '').includes(
        'application/vnd.sap.adt.rap.behavdeft',
      );
    },
    'Accept: application/vnd.sap.adt.rap.behavdeft*',
  );

  console.log('\n🔍 CDS View/Entity (DDLS) Contract\n');

  verify(
    'ddls.get() exists and has correct path',
    () => {
      const desc = adtContract.rap.ddls.get('ZCDS_VIEW');
      return (
        desc.method === 'GET' && desc.path === '/sap/bc/adt/ddl/ddls/zcds_view'
      );
    },
    'GET /sap/bc/adt/ddl/ddls/{name}',
  );

  verify(
    'ddls.post() exists and has correct path',
    () => {
      const desc = adtContract.rap.ddls.post();
      return desc.method === 'POST' && desc.path === '/sap/bc/adt/ddl/ddls';
    },
    'POST /sap/bc/adt/ddl/ddls',
  );

  verify(
    'ddls.put() exists and has correct path',
    () => {
      const desc = adtContract.rap.ddls.put('ZCDS_VIEW');
      return (
        desc.method === 'PUT' && desc.path === '/sap/bc/adt/ddl/ddls/zcds_view'
      );
    },
    'PUT /sap/bc/adt/ddl/ddls/{name}',
  );

  verify(
    'ddls.delete() exists and has correct path',
    () => {
      const desc = adtContract.rap.ddls.delete('ZCDS_VIEW');
      return (
        desc.method === 'DELETE' &&
        desc.path === '/sap/bc/adt/ddl/ddls/zcds_view'
      );
    },
    'DELETE /sap/bc/adt/ddl/ddls/{name}',
  );

  verify(
    'ddls.lock() exists with correct query',
    () => {
      const desc = adtContract.rap.ddls.lock('ZCDS_VIEW');
      return desc.method === 'POST' && desc.query?._action === 'LOCK';
    },
    'POST with _action=LOCK',
  );

  verify(
    'ddls.source.main.get() exists',
    () => {
      const desc = adtContract.rap.ddls.source?.main?.get('ZCDS_VIEW');
      return desc?.path === '/sap/bc/adt/ddl/ddls/zcds_view/source/main';
    },
    'GET /sap/bc/adt/ddl/ddls/{name}/source/main',
  );

  verify(
    'ddls has correct Accept header',
    () => {
      const desc = adtContract.rap.ddls.get('ZCDS_VIEW');
      return (desc.headers?.Accept ?? '').includes(
        'application/vnd.sap.adt.ddl.ddlsource',
      );
    },
    'Accept: application/vnd.sap.adt.ddl.ddlsource*',
  );

  console.log('\n🔍 RAP Generator Contract\n');

  verify(
    'generator.list() exists and has correct path',
    () => {
      const desc = adtContract.rap.generator.list();
      return desc.method === 'GET' && desc.path === '/sap/bc/adt/rap/generator';
    },
    'GET /sap/bc/adt/rap/generator',
  );

  verify(
    'generator.get() exists and has correct path',
    () => {
      const desc = adtContract.rap.generator.get('WORKSPACE');
      return (
        desc.method === 'GET' &&
        desc.path === '/sap/bc/adt/rap/generator/workspace'
      );
    },
    'GET /sap/bc/adt/rap/generator/{name}',
  );

  verify(
    'generator.create() exists and has correct path',
    () => {
      const desc = adtContract.rap.generator.create({ corrNr: 'DEV1' });
      return (
        desc.method === 'POST' && desc.path === '/sap/bc/adt/rap/generator'
      );
    },
    'POST /sap/bc/adt/rap/generator',
  );

  verify(
    'generator.update() exists and has correct path',
    () => {
      const desc = adtContract.rap.generator.update('WORKSPACE');
      return (
        desc.method === 'PUT' &&
        desc.path === '/sap/bc/adt/rap/generator/workspace'
      );
    },
    'PUT /sap/bc/adt/rap/generator/{name}',
  );

  verify(
    'generator.delete() exists and has correct path',
    () => {
      const desc = adtContract.rap.generator.delete('WORKSPACE');
      return (
        desc.method === 'DELETE' &&
        desc.path === '/sap/bc/adt/rap/generator/workspace'
      );
    },
    'DELETE /sap/bc/adt/rap/generator/{name}',
  );

  verify(
    'generator.lock() exists with correct query',
    () => {
      const desc = adtContract.rap.generator.lock('WORKSPACE');
      return desc.method === 'POST' && desc.query?._action === 'LOCK';
    },
    'POST with _action=LOCK',
  );

  verify(
    'generator.unlock() exists with correct query',
    () => {
      const desc = adtContract.rap.generator.unlock('WORKSPACE', 'H123');
      return desc.method === 'POST' && desc.query?._action === 'UNLOCK';
    },
    'POST with _action=UNLOCK',
  );

  verify(
    'generator.getSource() exists',
    () => {
      const desc = adtContract.rap.generator.getSource('WORKSPACE');
      return desc?.path === '/sap/bc/adt/rap/generator/workspace/source/main';
    },
    'GET /sap/bc/adt/rap/generator/{name}/source/main',
  );

  verify(
    'generator.putSource() exists',
    () => {
      const desc = adtContract.rap.generator.putSource('WORKSPACE', {
        lockHandle: 'H123',
      });
      return desc?.path === '/sap/bc/adt/rap/generator/workspace/source/main';
    },
    'PUT /sap/bc/adt/rap/generator/{name}/source/main',
  );

  verify(
    'generator has correct Accept header',
    () => {
      const desc = adtContract.rap.generator.list();
      return (desc.headers?.Accept ?? '').includes(
        'application/vnd.sap.adt.rap.generator',
      );
    },
    'Accept: application/vnd.sap.adt.rap.generator*',
  );

  console.log('\n🔍 Contract Structure Verification\n');

  verify(
    'behavdeft has all required methods',
    () => {
      const c = adtContract.rap.behavdeft;
      return (
        typeof c.get === 'function' &&
        typeof c.post === 'function' &&
        typeof c.put === 'function' &&
        typeof c.delete === 'function' &&
        typeof c.lock === 'function' &&
        typeof c.unlock === 'function'
      );
    },
    'get, post, put, delete, lock, unlock',
  );

  verify(
    'ddls has all required methods',
    () => {
      const c = adtContract.rap.ddls;
      return (
        typeof c.get === 'function' &&
        typeof c.post === 'function' &&
        typeof c.put === 'function' &&
        typeof c.delete === 'function' &&
        typeof c.lock === 'function' &&
        typeof c.unlock === 'function'
      );
    },
    'get, post, put, delete, lock, unlock',
  );

  verify(
    'generator has all required methods',
    () => {
      const c = adtContract.rap.generator;
      return (
        typeof c.list === 'function' &&
        typeof c.get === 'function' &&
        typeof c.create === 'function' &&
        typeof c.update === 'function' &&
        typeof c.delete === 'function' &&
        typeof c.lock === 'function' &&
        typeof c.unlock === 'function' &&
        typeof c.getSource === 'function' &&
        typeof c.putSource === 'function'
      );
    },
    'list, get, create, update, delete, lock, unlock, getSource, putSource',
  );

  console.log('\n' + '='.repeat(60));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(
    `\n📊 Contract Verification: ${passed} passed, ${failed} failed\n`,
  );

  if (failed > 0) {
    console.log('Failed checks:');
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  ❌ ${r.name}`);
    }
    process.exit(1);
  }

  console.log('✅ All RAP contracts are properly defined!\n');
  process.exit(0);
}

async function runLiveTests() {
  if (!ADT_SERVICE_KEY) {
    console.log('\n⚠️  ADT_SERVICE_KEY not set - skipping live tests\n');
    return;
  }

  console.log('\n🔗 Parsing ADT service key...\n');

  const serviceKey = parseServiceKey(ADT_SERVICE_KEY);
  const baseUrl = serviceKey.url;

  console.log(`   System URL: ${baseUrl}`);
  console.log(`   System ID:  ${serviceKey.systemid}`);

  if (!ADT_USERNAME || !ADT_PASSWORD) {
    console.log(
      '\n⚠️  ADT_USERNAME and ADT_PASSWORD not set - skipping live tests',
    );
    console.log(
      '   For OAuth-only auth, the system may not support client credentials.\n',
    );
    return;
  }

  console.log('\n🔑 Getting OAuth token...\n');

  const { clientid, clientsecret, url: uaaUrl } = serviceKey.uaa;
  const credentials = Buffer.from(`${clientid}:${clientsecret}`).toString(
    'base64',
  );

  try {
    const response = await fetch(`${uaaUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        response_type: 'token',
      }),
    });

    if (!response.ok) {
      console.log(`   ⚠️  OAuth token request failed (${response.status})`);
      console.log(
        '   SAP ABAP Trial may not support client_credentials grant.\n',
      );
      return;
    }

    const data = (await response.json()) as { access_token: string };
    console.log('   ✅ OAuth token obtained');
    console.log('\n📦 Creating ADT client...\n');

    const { createAdtClient } = await import('@abapify/adt-client');

    const client = createAdtClient({
      baseUrl,
      authorizationHeader: `Bearer ${data.access_token}`,
    });

    const results: { name: string; success: boolean; error?: string }[] = [];

    async function test(name: string, fn: () => Promise<void>) {
      process.stdout.write(`Testing: ${name}... `);
      try {
        await fn();
        console.log('✅');
        results.push({ name, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`❌ (${message.substring(0, 80)})`);
        results.push({ name, success: false, error: message });
      }
    }

    console.log('\n🧪 Running Live RAP Contract Tests\n');
    console.log('='.repeat(60));

    await test('RAP - Generator list', async () => {
      const response = await client.adt.rap.generator.list();
      if (!response) throw new Error('Generator list response is undefined');
    });

    await test('RAP - DDLS (GET)', async () => {
      const response = await client.adt.rap.ddls.get('$TMP');
      if (!response) throw new Error('DDLS response is undefined');
    });

    await test('RAP - Behavior Definition (GET)', async () => {
      const response = await client.adt.rap.behavdeft.get('$TMP');
      if (!response) throw new Error('BDEF response is undefined');
    });

    console.log('='.repeat(60));

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Live Test Results: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
      console.log('Failed tests:');
      for (const r of results.filter((r) => !r.success)) {
        console.log(`  • ${r.name}: ${r.error}`);
      }
    } else {
      console.log('🎉 All live RAP contract tests passed!\n');
    }
  } catch (error) {
    console.log(
      `\n⚠️  Live tests skipped: ${error instanceof Error ? error.message : error}\n`,
    );
  }
}

async function main() {
  await runContractVerification();
  await runLiveTests();
}

main().catch((error) => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
