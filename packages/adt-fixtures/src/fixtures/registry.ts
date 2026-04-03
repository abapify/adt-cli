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
  },
  atc: {
    customizing: 'atc/customizing.xml',
    worklist: 'atc/worklist.xml',
    runsResponse: 'atc/runs-response.xml',
  },
  aunit: {
    runRequest: 'aunit/run-request.xml',
    runResult: 'aunit/run-result.xml',
  },
  packages: {
    tmp: 'packages/tmp.xml',
  },
  oo: {
    class: 'oo/class.xml',
    interface: 'oo/interface.xml',
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
  },
} as const;
