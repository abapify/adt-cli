#!/usr/bin/env node
/**
 * adt-mcp – stdio entry-point
 *
 * Start with:  npx adt-mcp
 * Or pipe via: echo '{}' | adt-mcp
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from '../lib/server';

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
