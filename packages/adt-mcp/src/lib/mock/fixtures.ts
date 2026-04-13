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

  // Transport create response – returned for POST /sap/bc/adt/cts/transportrequests
  transportCreate: {
    root: {
      request: {
        trkorr: 'DEVK900099',
        as4text: 'New transport',
        as4user: 'DEVELOPER',
        trstatus: 'D',
        trfunction: 'K',
      },
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

  // Grep / content search results – returned for GET .../informationsystem/search?userannotation=userwhere
  grepResults: {
    objectReference: [
      {
        name: 'ZCL_EXAMPLE',
        type: 'CLAS/OC',
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        description: 'Example class',
        packageName: 'ZPACKAGE',
      },
    ],
  },

  // DDIC table definition – returned for GET /sap/bc/adt/ddic/tables/{name}
  tableDefinition: {
    blueSource: {
      name: 'MARA',
      description: 'General Material Data',
      type: 'TABL/DT',
      element: [
        { name: 'MANDT', type: 'CLNT', length: '3', description: 'Client' },
        {
          name: 'MATNR',
          type: 'CHAR',
          length: '18',
          description: 'Material Number',
        },
        {
          name: 'MBRSH',
          type: 'CHAR',
          length: '1',
          description: 'Industry Sector',
        },
      ],
    },
  },

  // Data preview result – returned for POST /sap/bc/adt/datapreview/freestyle
  tableContents: {
    columns: {
      column: [
        { name: 'MANDT', type: 'C', length: '3' },
        { name: 'MATNR', type: 'C', length: '18' },
        { name: 'MBRSH', type: 'C', length: '1' },
      ],
    },
    rows: {
      row: [
        {
          cell: [
            { _text: '100' },
            { _text: 'Z_EXAMPLE_MATERIAL' },
            { _text: 'A' },
          ],
        },
      ],
    },
  },

  // Navigation target – returned for GET /sap/bc/adt/navigation/target
  navigationTarget: {
    objectReference: {
      uri: '/sap/bc/adt/oo/classes/zcl_example',
      type: 'CLAS/OC',
      name: 'ZCL_EXAMPLE',
      description: 'Example class',
    },
  },

  // Usages / references – returned for GET .../informationsystem/usages
  usagesResult: {
    usages: {
      usage: [
        {
          uri: '/sap/bc/adt/programs/programs/zprog_example',
          name: 'ZPROG_EXAMPLE',
          type: 'PROG',
          location: 'line 42',
        },
      ],
    },
  },

  // Call hierarchy callers – returned for GET .../informationsystem/callers
  callersResult: {
    callers: {
      caller: [
        {
          uri: '/sap/bc/adt/programs/programs/zprog_main',
          name: 'ZPROG_MAIN',
          type: 'PROG',
        },
      ],
    },
  },

  // Call hierarchy callees – returned for GET .../informationsystem/callees
  calleesResult: {
    callees: {
      callee: [
        {
          uri: '/sap/bc/adt/functions/groups/zfugr_util',
          name: 'ZFUGR_UTIL',
          type: 'FUGR',
        },
      ],
    },
  },

  // Inactive objects – returned for GET /sap/bc/adt/activation/inactive_objects
  inactiveObjects: {
    objectReference: [
      {
        name: 'ZCL_EXAMPLE',
        type: 'CLAS/OC',
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        description: 'Example class',
      },
    ],
  },

  // Function group metadata – returned for GET /sap/bc/adt/functions/groups/{name}
  functionGroup: {
    abapFunctionGroup: {
      name: 'ZFUGR_UTIL',
      type: 'FUGR',
      description: 'Utility function group',
      language: 'EN',
      masterLanguage: 'EN',
      packageRef: { uri: '/sap/bc/adt/packages/zpackage' },
    },
  },

  // Function module metadata – returned for GET /sap/bc/adt/functions/groups/{g}/fmodules/{fm}
  functionModule: {
    abapFunctionModule: {
      name: 'Z_MY_FUNCTION',
      type: 'FUGR/FF',
      description: 'My utility function module',
      processingType: 'normal',
      remoteEnabledMode: 'notRemoteEnabled',
      parameters: {
        importParameters: {
          parameter: [
            {
              name: 'IV_INPUT',
              type: 'TYPE',
              associatedType: 'STRING',
              optional: true,
            },
          ],
        },
        exportParameters: {
          parameter: [
            {
              name: 'EV_OUTPUT',
              type: 'TYPE',
              associatedType: 'STRING',
            },
          ],
        },
      },
    },
  },

  // Object structure – returned for GET {objectUri}/objectstructure
  objectStructure: {
    objectStructure: {
      objectReference: {
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        type: 'CLAS/OC',
        name: 'ZCL_EXAMPLE',
        description: 'Example class',
      },
      includes: {
        include: [
          {
            uri: '/sap/bc/adt/oo/classes/zcl_example/includes/definitions',
            type: 'CLAS/OC/D',
            name: 'ZCL_EXAMPLE',
          },
          {
            uri: '/sap/bc/adt/oo/classes/zcl_example/includes/implementations',
            type: 'CLAS/OC/M',
            name: 'ZCL_EXAMPLE',
          },
        ],
      },
    },
  },

  // Type hierarchy – returned for GET /sap/bc/adt/oo/typeinfo
  typeHierarchy: {
    typeInfo: {
      objectReference: {
        uri: '/sap/bc/adt/oo/classes/zcl_example',
        type: 'CLAS/OC',
        name: 'ZCL_EXAMPLE',
      },
      superClasses: {
        superClass: [
          {
            uri: '/sap/bc/adt/oo/classes/object',
            type: 'CLAS/OC',
            name: 'OBJECT',
          },
        ],
      },
      interfaces: {
        interface: [],
      },
    },
  },

  // Pretty-printed source – returned for POST /sap/bc/adt/prettyprinter/prettifySource
  prettySource:
    'CLASS zcl_example DEFINITION PUBLIC FINAL CREATE PUBLIC.\n  PUBLIC SECTION.\n    METHODS: do_something.\nENDCLASS.\n',

  // Installed software components – GET /sap/bc/adt/system/softwarecomponents
  softwareComponents: {
    softwareComponents: {
      softwareComponent: [
        {
          name: 'SAP_BASIS',
          release: '756',
          patchLevel: '0012',
          description: 'SAP Basis Component',
        },
        {
          name: 'SAP_ABA',
          release: '756',
          patchLevel: '0012',
          description: 'Cross-Application Component',
        },
      ],
    },
  },

  // abapGit exportable objects – GET /sap/bc/adt/abapgit/objects
  gitObjects: {
    abapgitObjects: {
      object: [
        {
          name: 'ZCL_EXAMPLE',
          type: 'CLAS',
          uri: '/sap/bc/adt/oo/classes/zcl_example',
        },
        {
          name: 'ZPROG_EXAMPLE',
          type: 'PROG',
          uri: '/sap/bc/adt/programs/programs/zprog_example',
        },
      ],
    },
  },

  // abapGit export – GET /sap/bc/adt/abapgit/repos/{name}/export
  gitExport: {
    files: [
      {
        path: 'src/zcl_example.clas.abap',
        content:
          'CLASS zcl_example DEFINITION PUBLIC FINAL CREATE PUBLIC.\nENDCLASS.',
      },
      {
        path: 'src/zcl_example.clas.xml',
        content:
          '<?xml version="1.0" ?><abapGit version="v1.0.0"><asx:abap></asx:abap></abapGit>',
      },
    ],
  },
};
