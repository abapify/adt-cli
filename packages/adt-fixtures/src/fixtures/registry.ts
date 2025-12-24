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
  packages: {
    tmp: 'packages/tmp.xml',
  },
  oo: {
    class: 'oo/class.xml',
    interface: 'oo/interface.xml',
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
} as const;
