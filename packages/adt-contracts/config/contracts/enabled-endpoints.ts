/**
 * Enabled Endpoints Configuration
 *
 * Type-safe configuration for contract generation.
 * Supports simple patterns (string/regex) and advanced config objects.
 *
 * @example Simple pattern - generates all methods
 * '/sap/bc/adt/cts/transportrequests/**'
 *
 * @example Advanced config - specific methods only
 * { path: '/sap/bc/adt/atc/runs', methods: ['POST'] }
 */

import type { EndpointDefinition } from '@abapify/adt-codegen';

export const enabledEndpoints: EndpointDefinition[] = [
  // ATC - ABAP Test Cockpit
  // NOTE: /sap/bc/adt/atc/runs POST is not in discovery - add manually if needed
  {
    path: '/sap/bc/adt/atc/worklists',
    methods: ['GET'],
    accept: '*/*', // SAP requires */* instead of application/xml
    description: 'Get ATC worklists',
  },
  {
    path: '/sap/bc/adt/atc/results',
    description: 'ATC check results',
  },

  // CTS - Transport management
  '/sap/bc/adt/cts/transportrequests/**',

  // NOTE: OO classes/interfaces use manual contracts in src/adt/oo/
  // They use the crud() helper which is simpler than code generation

  // Packages
  '/sap/bc/adt/packages',

  // Discovery
  '/sap/bc/adt/discovery',
];
