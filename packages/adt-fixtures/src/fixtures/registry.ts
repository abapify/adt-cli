/**
 * Fixture registry - lives with the fixtures
 *
 * Add new fixtures here as simple path strings.
 * The proxy in src/fixtures.ts will auto-generate loaders.
 */

export const registry = {
  transport: {
    single: 'transport/single.xml',
    singleTask: 'transport/single-task.xml',
    create: 'transport/create.xml',
    createResponse: 'transport/create-response.xml',
    find: 'transport/find.xml',
    searchconfigMetadata: 'transport/searchconfiguration-metadata.xml',
    useractionRelease: 'transport/useraction-release.xml',
    useractionChangeowner: 'transport/useraction-changeowner.xml',
    useractionNewrequest: 'transport/useraction-newrequest.xml',
  },
  atc: {
    customizing: 'atc/customizing.xml',
    worklist: 'atc/worklist.xml',
    runsResponse: 'atc/runs-response.xml',
  },
  aunit: {
    runRequest: 'aunit/run-request.xml',
    runResult: 'aunit/run-result.xml',
    // Sourced from jfilak/sapcli test fixtures (fixtures_adt_acoverage /
    // fixtures_adt_coverage). Real sanitized SAP responses for the
    // /runtime/traces/coverage endpoints.
    coverageMeasurements: 'aunit/coverage-measurements.xml',
    coverageStatements: 'aunit/coverage-statements.xml',
    coverageResults: 'aunit/coverage-results.xml',
  },
  packages: {
    tmp: 'packages/tmp.xml',
  },
  oo: {
    class: 'oo/class.xml',
    interface: 'oo/interface.xml',
    classrunResponse: 'oo/classrun-response.json',
  },
  programs: {
    program: 'programs/program.xml',
  },
  functions: {
    functionGroup: 'functions/functionGroup.xml',
  },
  core: {
    http: {
      session: 'core/http/session.xml',
      systeminformation: 'core/http/systeminformation.json',
    },
  },
  repository: {
    search: {
      quickSearch: 'repository/search/quickSearch.xml',
    },
  },
  system: {
    users: {
      single: 'system/users/single.xml',
      search: 'system/users/search.xml',
    },
  },
  ddic: {
    tabl: {
      structure: 'ddic/tabl/structure.tabl.xml',
      structure1: 'ddic/tabl/structure1.tabl.xml',
      transparent: 'ddic/tabl/transparent.tabl.xml',
      valueTable: 'ddic/tabl/value-table.tabl.xml',
    },
    ddl: {
      source: 'ddic/ddl/source.xml',
    },
    dcl: {
      source: 'ddic/dcl/source.xml',
    },
    domains: {
      single: 'ddic/domains/single.xml',
    },
    dataelements: {
      single: 'ddic/dataelements/single.xml',
    },
    structures: {
      single: 'ddic/structures/single.xml',
    },
  },
  datapreview: {
    freestyle: 'datapreview/freestyle.json',
  },
  /**
   * MCP mock-server fixtures.
   *
   * TODO-synthetic: Most entries below are *fabricated* minimal shapes used
   * to exercise MCP tool parsing paths. They should be replaced with real
   * sanitized SAP responses captured from `adt fetch` per
   * packages/adt-fixtures/AGENTS.md fixture requirements.
   */
  mcp: {
    discovery: 'mcp/discovery/service.xml',
    session: 'mcp/session/session.json',
    systeminfo: 'mcp/systeminfo/systeminfo.json',
    search: 'mcp/search/results.json',
    grep: 'mcp/grep/results.json',
    transport: {
      list: 'mcp/transport/list.json',
      single: 'mcp/transport/single.json',
      create: 'mcp/transport/create.json',
      release: 'mcp/transport/release.xml',
    },
    atc: {
      run: 'mcp/atc/run.json',
      worklist: 'mcp/atc/worklist.json',
    },
    source: {
      class: 'mcp/source/class.abap',
      testClasses: 'mcp/source/testclasses.abap',
    },
    lockResponse: 'mcp/lock/response.xml',
    activationResult: 'mcp/activation/result.xml',
    checkRuns: 'mcp/checkruns/result.xml',
    aunit: 'mcp/aunit/result.json',
    navigationTarget: 'mcp/navigation/target.json',
    usages: 'mcp/usages/result.json',
    callers: 'mcp/callers/result.json',
    callees: 'mcp/callees/result.json',
    tableDefinition: 'mcp/tables/definition.json',
    tableContents: 'mcp/datapreview/contents.json',
    inactiveObjects: 'mcp/inactive/objects.json',
    fugr: {
      group: 'mcp/fugr/group.json',
      module: 'mcp/fugr/module.json',
    },
    objectStructure: 'mcp/objectstructure/class.json',
    typeHierarchy: 'mcp/typehierarchy/result.json',
    prettySource: 'mcp/prettyprinter/pretty.abap',
    softwareComponents: 'mcp/softwarecomponents/list.json',
    abapgit: {
      objects: 'mcp/abapgit/objects.json',
      export: 'mcp/abapgit/export.json',
    },
  },
} as const;
