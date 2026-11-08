#!/usr/bin/env npx tsx

/**
 * Script to run the e2e transport import test
 * This validates the full CLI functionality with mock client
 */

import { spawn } from 'node:child_process';
import { join } from 'node:path';

async function runE2ETest() {
  console.log('🧪 Running E2E Transport Import Test...');

  const testFile = join(
    process.cwd(),
    'packages/adt-cli/src/lib/testing/e2e-transport-import.test.ts',
  );

  return new Promise<void>((resolve, reject) => {
    const vitest = spawn('npx', ['vitest', 'run', testFile], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    vitest.on('close', (code) => {
      if (code === 0) {
        console.log('✅ E2E tests passed!');
        resolve();
      } else {
        console.error(`❌ E2E tests failed with exit code ${code}`);
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });

    vitest.on('error', (error) => {
      console.error('❌ Failed to run tests:', error);
      reject(error);
    });
  });
}

// Run the test
if (require.main === module) {
  try {
    await runE2ETest();
  } catch (error) {
    console.error(error);
  }
}

export { runE2ETest };
