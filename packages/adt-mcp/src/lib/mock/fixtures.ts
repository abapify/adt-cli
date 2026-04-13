/**
 * Fixture data returned by the mock ADT server.
 *
 * Shapes are kept minimal but realistic enough to exercise
 * the primary response-parsing paths in the MCP tools using
 * simplified JSON representations of typical ADT responses.
 */

export const fixtures = {
  discovery: {
    workspaces: [
      {
        title: 'ADT Core Services',
        collections: [
          { href: '/sap/bc/adt/core', title: 'Core' },
          { href: '/sap/bc/adt/repository', title: 'Repository' },
        ],
      },
      {
        title: 'CTS Services',
        collections: [
          {
            href: '/sap/bc/adt/cts/transportrequests',
            title: 'Transport Requests',
          },
        ],
      },
    ],
  },

  session: {
    session: {
      properties: {
        property: [
          { name: 'com.sap.adt.user', _text: 'DEVELOPER' },
          { name: 'com.sap.adt.language', _text: 'EN' },
          { name: 'com.sap.adt.client', _text: '100' },
        ],
      },
    },
  },

  systemInfo: {
    systemID: 'DEV',
    client: '100',
    userName: 'DEVELOPER',
    language: 'EN',
    release: '756',
    sapRelease: '2023',
  },

  searchResults: {
    objectReference: [
      {
        name: 'ZCL_EXAMPLE',
        type: 'CLAS/OC',
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        description: 'Example class',
        packageName: 'ZPACKAGE',
      },
      {
        name: 'ZIF_EXAMPLE',
        type: 'INTF/OI',
        uri: '/sap/bc/adt/oo/interfaces/zif_example',
        description: 'Example interface',
        packageName: 'ZPACKAGE',
      },
    ],
  },

  transportList: {
    request: [
      {
        trkorr: 'DEVK900001',
        as4text: 'First transport',
        as4user: 'DEVELOPER',
        trstatus: 'D',
        trfunction: 'K',
        tarsystem: 'QAS',
      },
      {
        trkorr: 'DEVK900002',
        as4text: 'Second transport',
        as4user: 'DEVELOPER',
        trstatus: 'D',
        trfunction: 'K',
        tarsystem: 'QAS',
      },
    ],
  },

  transportGet: {
    request: {
      trkorr: 'DEVK900001',
      as4text: 'First transport',
      as4user: 'DEVELOPER',
      trstatus: 'D',
      trfunction: 'K',
      tarsystem: 'QAS',
      task: [{ trkorr: 'DEVK900001_T1', as4user: 'DEVELOPER', trstatus: 'D' }],
    },
  },

  atcRun: {
    worklistId: 'WL_001',
    id: 'RUN_001',
  },

  atcWorklist: {
    objects: [
      {
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        type: 'CLAS',
        name: 'ZCL_EXAMPLE',
        findings: [
          {
            checkId: 'CL_CI_TEST_AMDP_HDB_MIGRATION',
            checkTitle: 'AMDP HDB Migration',
            messageTitle: 'Consider migrating to AMDP',
            priority: 2,
            uri: '/sap/bc/adt/oo/classes/zcl_example/source/main#start=10,0',
          },
        ],
      },
    ],
  },

  // Source code fixture – returned for GET .../source/main
  sourceCode:
    'CLASS zcl_example DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS: do_something.\nENDCLASS.\n',

  // Test classes source – returned for GET .../includes/testclasses
  testClassesSource:
    'CLASS ltc_example DEFINITION FOR TESTING RISK LEVEL HARMLESS DURATION SHORT.\n  PRIVATE SECTION.\n    METHODS: test_something FOR TESTING.\nENDCLASS.\n',

  // Lock handle XML – returned for POST ?_action=LOCK
  lockResponse:
    '<asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0"><asx:values><DATA><LOCK_HANDLE>MOCK_LOCK_HANDLE_001</LOCK_HANDLE><CORRNR>DEVK900001</CORRNR><CORRUSER>DEVELOPER</CORRUSER></DATA></asx:values></asx:abap>',

  // Activation result – returned for POST /sap/bc/adt/activation
  activationResult:
    '<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core"/>',

  // Checkruns result – returned for POST /sap/bc/adt/checkruns
  checkRunsResult:
    '<?xml version="1.0" encoding="UTF-8"?><chkrun:checkRunReports xmlns:chkrun="http://www.sap.com/adt/checkrun"><chkrun:checkReport chkrun:reporter="syntax" chkrun:triggeringUri="/sap/bc/adt/oo/classes/zcl_example" chkrun:status="ok"/></chkrun:checkRunReports>',

  // AUnit test run result
  aunitResult: {
    runResult: {
      program: [
        {
          uri: '/sap/bc/adt/oo/classes/zcl_example',
          type: 'CLAS/OC',
          name: 'ZCL_EXAMPLE',
          testClasses: {
            testClass: [
              {
                name: 'LTC_EXAMPLE',
                uri: '/sap/bc/adt/oo/classes/zcl_example/includes/testclasses',
                riskLevel: 'harmless',
                durationCategory: 'short',
                testMethods: {
                  testMethod: [
                    {
                      name: 'TEST_SOMETHING',
                      uri: '/sap/bc/adt/oo/classes/zcl_example/includes/testclasses',
                      executionTime: '0.001',
                      alerts: { alert: [] },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
};
