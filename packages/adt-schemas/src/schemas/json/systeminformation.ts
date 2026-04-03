/**
 * System Information JSON Schema
 *
 * Used by: GET /sap/bc/adt/core/http/systeminformation
 * Content-Type: application/json
 *
 * Returns system information including SAP release, client, user details.
 */
import { z } from 'zod';

/**
 * System Information response schema
 */
export const systeminformationSchema = z
  .object({
    systemID: z.string().optional(),
    client: z.string().optional(),
    userName: z.string().optional(),
    userFullName: z.string().optional(),
    language: z.string().optional(),
    release: z.string().optional(),
    sapRelease: z.string().optional(),
  })
  .loose(); // Allow additional properties

export type SystemInformation = z.infer<typeof systeminformationSchema>;

/**
 * JSON schema wrapper with parse/build methods
 * Matches the interface of XML schemas for consistency
 */
export const systeminformation = {
  _infer: {} as SystemInformation,
  parse: (json: string): SystemInformation => {
    return systeminformationSchema.parse(JSON.parse(json));
  },
  build: (data: SystemInformation): string => {
    return JSON.stringify(data);
  },
};

export default systeminformation;