#!/usr/bin/env node

// Set CLI mode before importing any modules
process.env.ADT_CLI_MODE = 'true';

import { main } from '../lib/cli';

try {
  await main();
} catch (error) {
  console.error('❌ CLI Error:', (error as Error).message);
  process.exit(1);
}
