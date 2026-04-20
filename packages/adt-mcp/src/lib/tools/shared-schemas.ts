/**
 * Shared Zod schemas for connection parameters reused across tools.
 */

import { z } from 'zod';

/** Connection parameters required by every tool that talks to SAP. */
export const connectionShape = {
  baseUrl: z.string().describe('SAP system base URL (e.g. https://host:8000)'),
  client: z.string().optional().describe('SAP client number'),
  username: z.string().optional().describe('Username for basic auth'),
  password: z.string().optional().describe('Password for basic auth'),
};
