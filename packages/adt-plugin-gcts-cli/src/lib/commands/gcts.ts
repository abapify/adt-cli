/**
 * `adt gcts` — top-level CLI command plugin.
 *
 * Mirrors sapcli's `sap gcts` surface:
 *   - `adt gcts repo list / create / clone / delete / pull / push / checkout`
 *   - `adt gcts branch list / create / switch / delete`
 *   - `adt gcts commit <rid>`
 *   - `adt gcts log <rid>`
 *   - `adt gcts config <rid> get|set|unset [key] [value]`
 *   - `adt gcts objects <rid>`
 *
 * All commands talk to `/sap/bc/cts_abapvcs/` via the typed contracts in
 * `@abapify/adt-contracts` (accessed as `client.adt.gcts.*`). JSON responses
 * are printed via `console.log` (respects `--json` flag where applicable).
 */

import type { CliCommandPlugin, CliContext } from '@abapify/adt-plugin';
import { getGctsClient } from '../client/gcts-client';

// ── small helpers ──────────────────────────────────────────────────────────

/** Stringify an object with 2-space indent (matches `sap gcts ... -f JSON`). */
function json(x: unknown): string {
  return JSON.stringify(x, null, 2);
}

/** Safely coerce an `args` value to a string. */
function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// ── repo subcommands ───────────────────────────────────────────────────────

const repoList: CliCommandPlugin = {
  name: 'list',
  description: 'List all gCTS repositories (GET /repository)',
  options: [{ flags: '--json', description: 'Output as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const res = await client.adt.gcts.repository.list();
    const repos = res.result ?? [];
    if (args.json) {
      console.log(json(repos));
      return;
    }
    if (repos.length === 0) {
      ctx.logger.info('No gCTS repositories found.');
      return;
    }
    for (const r of repos) {
      console.log(
        `${r.rid}\t${r.status ?? ''}\t${r.branch ?? ''}\t${r.url ?? ''}`,
      );
    }
  },
};

const repoCreate: CliCommandPlugin = {
  name: 'create',
  description: 'Create a new gCTS repository (POST /repository)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    { name: '<url>', description: 'Git URL (https://...)' },
  ],
  options: [
    {
      flags: '--vsid <vsid>',
      description: 'Virtual system ID',
      default: '6IT',
    },
    {
      flags: '--role <role>',
      description: 'Repository role (SOURCE|TARGET)',
      default: 'SOURCE',
    },
    {
      flags: '--type <type>',
      description: 'Repository type (GITHUB|GIT)',
      default: 'GITHUB',
    },
    {
      flags: '--starting-folder <dir>',
      description: 'Repository start dir',
      default: 'src/',
    },
    { flags: '--vcs-token <token>', description: 'VCS authentication token' },
    { flags: '--json', description: 'Output response as JSON' },
  ],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const url = str(args.url);
    const config: Array<{ key: string; value: string }> = [];
    if (args.startingFolder)
      config.push({ key: 'VCS_TARGET_DIR', value: str(args.startingFolder) });
    if (args.vcsToken)
      config.push({ key: 'CLIENT_VCS_AUTH_TOKEN', value: str(args.vcsToken) });

    const body = {
      repository: rid,
      data: {
        rid,
        name: rid,
        vsid: str(args.vsid) || '6IT',
        url,
        role: str(args.role) || 'SOURCE',
        type: str(args.type) || 'GITHUB',
        connection: 'ssl',
        ...(config.length > 0 ? { config } : {}),
      },
    };
    const res = await client.adt.gcts.repository.create(body);
    if (args.json) {
      console.log(json(res));
      return;
    }
    const repo = res.repository ?? res.result;
    ctx.logger.info(`✅ Created repository "${rid}"`);
    if (repo?.status) ctx.logger.info(`   status: ${repo.status}`);
  },
};

const repoClone: CliCommandPlugin = {
  name: 'clone',
  description:
    'Clone repository on target system (POST /repository/<rid>/clone)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.clone(rid);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`✅ Cloned repository "${rid}"`);
  },
};

const repoDelete: CliCommandPlugin = {
  name: 'delete',
  description: 'Delete a gCTS repository (DELETE /repository/<rid>)',
  alias: 'rm',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.delete(rid);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`🗑  Deleted repository "${rid}"`);
  },
};

const repoPull: CliCommandPlugin = {
  name: 'pull',
  description: 'Pull a gCTS repository (GET /repository/<rid>/pullByCommit)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.pull(rid);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`✅ Pulled repository "${rid}"`);
    if (res.fromCommit && res.toCommit) {
      ctx.logger.info(`   ${res.fromCommit} -> ${res.toCommit}`);
    } else if (res.toCommit) {
      ctx.logger.info(`   HEAD = ${res.toCommit}`);
    }
  },
};

const repoPush: CliCommandPlugin = {
  name: 'push',
  description: 'Push a gCTS repository (GET /repository/<rid>/push)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.push(rid);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`✅ Pushed repository "${rid}"`);
  },
};

const repoCheckout: CliCommandPlugin = {
  name: 'checkout',
  description:
    'Check out a branch (GET /repository/<rid>/branches/<current>/switch?branch=X)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    { name: '<branch>', description: 'Target branch name' },
    {
      name: '[currentBranch]',
      description:
        'Current branch (optional — inferred from repo if omitted; defaults to "main")',
    },
  ],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const target = str(args.branch);
    let current = str(args.currentBranch);

    if (!current) {
      // Discover current branch — mirrors sapcli's behaviour of reading
      // the repo `branch` property before building the switch URL.
      try {
        const repoRes = await client.adt.gcts.repository.get(rid);
        current = str(repoRes.result?.branch) || 'main';
      } catch {
        current = 'main';
      }
    }

    const res = await client.adt.gcts.repository.checkout(rid, current, target);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`✅ Switched "${rid}" from "${current}" to "${target}"`);
  },
};

const repoGroup: CliCommandPlugin = {
  name: 'repo',
  description: 'Manage gCTS repositories',
  subcommands: [
    repoList,
    repoCreate,
    repoClone,
    repoDelete,
    repoPull,
    repoPush,
    repoCheckout,
  ],
};

// ── branch subcommands ─────────────────────────────────────────────────────

const branchList: CliCommandPlugin = {
  name: 'list',
  description: 'List branches of a repository (GET /branches)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [
    { flags: '-r, --remote', description: 'Show remote branches only' },
    { flags: '-a, --all', description: 'Show all branches (local + remote)' },
    { flags: '--json', description: 'Output as JSON' },
  ],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.branches.list(rid);
    const all = res.branches ?? [];
    const filtered = args.remote
      ? all.filter((b) => b.type === 'remote')
      : args.all
        ? all
        : all.filter((b) => b.type === 'local');

    if (args.json) {
      console.log(json(filtered));
      return;
    }
    for (const b of filtered) {
      console.log(`${b.name}\t${b.type ?? ''}\t${b.ref ?? ''}`);
    }
  },
};

const branchCreate: CliCommandPlugin = {
  name: 'create',
  description: 'Create a new branch (POST /branches)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    { name: '<name>', description: 'Branch name' },
  ],
  options: [
    { flags: '--local-only', description: 'Create a local branch only' },
    { flags: '--symbolic', description: 'Create a symbolic ref' },
    { flags: '--peeled', description: 'Create a peeled ref' },
    { flags: '--json', description: 'Output response as JSON' },
  ],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const name = str(args.name);
    const body = {
      branch: name,
      type: (args.localOnly ? 'local' : 'global') as 'local' | 'global',
      isSymbolic: Boolean(args.symbolic),
      isPeeled: Boolean(args.peeled),
    };
    const res = await client.adt.gcts.branches.create(rid, body);
    if (args.json) {
      console.log(json(res));
      return;
    }
    const branchName = res.branch?.name ?? name;
    ctx.logger.info(`✅ Branch "${branchName}" created in "${rid}"`);
  },
};

const branchDelete: CliCommandPlugin = {
  name: 'delete',
  description: 'Delete a branch (DELETE /branches/<name>)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    { name: '<name>', description: 'Branch name' },
  ],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const name = str(args.name);
    const res = await client.adt.gcts.branches.delete(rid, name);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`🗑  Deleted branch "${name}" in "${rid}"`);
  },
};

const branchSwitch: CliCommandPlugin = {
  name: 'switch',
  description:
    'Switch branches (GET /branches/<current>/switch?branch=<target>)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    { name: '<target>', description: 'Target branch name' },
    { name: '[current]', description: 'Current branch (defaults to "main")' },
  ],
  options: [{ flags: '--json', description: 'Output response as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const target = str(args.target);
    let current = str(args.current);
    if (!current) {
      try {
        const r = await client.adt.gcts.repository.get(rid);
        current = str(r.result?.branch) || 'main';
      } catch {
        current = 'main';
      }
    }
    const res = await client.adt.gcts.branches.switch(rid, current, target);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(`✅ Switched to "${target}" in "${rid}"`);
  },
};

const branchGroup: CliCommandPlugin = {
  name: 'branch',
  description: 'Manage gCTS branches',
  subcommands: [branchList, branchCreate, branchDelete, branchSwitch],
};

// ── top-level `commit` / `log` / `config` / `objects` ──────────────────────

const commitCmd: CliCommandPlugin = {
  name: 'commit',
  description: 'Commit a package or transport (POST /repository/<rid>/commit)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [
    {
      flags: '-m, --message <text>',
      description: 'Commit message (default: auto-generated)',
    },
    {
      flags: '-d, --devc <pkg>',
      description: 'ABAP package name (defaults to <rid>)',
    },
    {
      flags: '--corrnr <tr>',
      description: 'Transport number (mutually exclusive with --devc)',
    },
    { flags: '--description <text>', description: 'Long commit description' },
    { flags: '--json', description: 'Output response as JSON' },
  ],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const corrnr = str(args.corrnr);

    const objects = corrnr
      ? [{ object: corrnr, type: 'TRANSPORT' }]
      : [
          {
            object: (str(args.devc) || rid).toUpperCase(),
            type: 'FULL_PACKAGE',
          },
        ];

    const defaultMsg = corrnr
      ? `Transport ${corrnr}`
      : `Export package ${(str(args.devc) || rid).toUpperCase()}`;

    const body = {
      message: str(args.message) || defaultMsg,
      autoPush: 'true' as const,
      objects,
      ...(args.description ? { description: str(args.description) } : {}),
    };

    const res = await client.adt.gcts.commits.commit(rid, body);
    if (args.json) {
      console.log(json(res));
      return;
    }
    ctx.logger.info(
      `✅ Committed to "${rid}": ${corrnr ? `transport ${corrnr}` : `package ${objects[0].object}`}`,
    );
  },
};

const logCmd: CliCommandPlugin = {
  name: 'log',
  description:
    'Show repository commit history (GET /repository/<rid>/getCommit)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.log(rid);
    const commits = res.commits ?? [];
    if (args.json) {
      console.log(json(commits));
      return;
    }
    for (const c of commits) {
      console.log(`commit ${c.id ?? ''}`);
      if (c.author) console.log(`Author: ${c.author} <${c.authorMail ?? ''}>`);
      if (c.date) console.log(`Date:   ${c.date}`);
      console.log('');
      console.log(`    ${c.message ?? ''}`);
      console.log('');
    }
  },
};

const objectsCmd: CliCommandPlugin = {
  name: 'objects',
  description: 'List repository objects (GET /repository/<rid>/getObjects)',
  arguments: [{ name: '<rid>', description: 'Repository ID' }],
  options: [{ flags: '--json', description: 'Output as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const res = await client.adt.gcts.repository.objects(rid);
    const objs = res.objects ?? [];
    if (args.json) {
      console.log(json(objs));
      return;
    }
    for (const o of objs) {
      console.log(`${o.pgmid ?? ''}\t${o.type ?? ''}\t${o.object ?? ''}`);
    }
  },
};

const configCmd: CliCommandPlugin = {
  name: 'config',
  description:
    'Manage repository configuration (GET/POST/DELETE /repository/<rid>/config)',
  arguments: [
    { name: '<rid>', description: 'Repository ID' },
    {
      name: '[action]',
      description: 'get | set | unset | list (default: list)',
      default: 'list',
    },
    { name: '[key]', description: 'Config key (for get/set/unset)' },
    { name: '[value]', description: 'Config value (for set)' },
  ],
  options: [{ flags: '--json', description: 'Output as JSON' }],
  async execute(args, ctx) {
    const client = await getGctsClient(ctx);
    const rid = str(args.rid);
    const action = (str(args.action) || 'list').toLowerCase();
    const key = str(args.key);

    if (action === 'list') {
      const repo = await client.adt.gcts.repository.get(rid);
      const cfg = repo.result?.config ?? [];
      if (args.json) {
        console.log(json(cfg));
        return;
      }
      for (const c of cfg) {
        console.log(`${c.key}=${c.value ?? ''}`);
      }
      return;
    }

    if (!key) {
      ctx.logger.error(`❌ "${action}" requires a key argument.`);
      process.exit(1);
    }

    if (action === 'get') {
      const res = await client.adt.gcts.config.get(rid, key);
      if (args.json) {
        console.log(json(res));
        return;
      }
      console.log(`${res.result?.key ?? key}=${res.result?.value ?? ''}`);
      return;
    }

    if (action === 'set') {
      const value = str(args.value);
      if (!value) {
        ctx.logger.error('❌ "set" requires a value argument.');
        process.exit(1);
      }
      const res = await client.adt.gcts.config.set(rid, { key, value });
      if (args.json) {
        console.log(json(res));
        return;
      }
      ctx.logger.info(`✅ ${key}=${value}`);
      return;
    }

    if (action === 'unset' || action === 'delete') {
      const res = await client.adt.gcts.config.delete(rid, key);
      if (args.json) {
        console.log(json(res));
        return;
      }
      ctx.logger.info(`🗑  unset ${key}`);
      return;
    }

    ctx.logger.error(
      `❌ Unknown config action "${action}" (expected: get|set|unset|list)`,
    );
    process.exit(1);
  },
};

// ── root ───────────────────────────────────────────────────────────────────

export const gctsCommand: CliCommandPlugin = {
  name: 'gcts',
  description: 'SAP gCTS (git-enabled CTS) operations (repo/branch/commit/...)',
  subcommands: [
    repoGroup,
    branchGroup,
    commitCmd,
    logCmd,
    objectsCmd,
    configCmd,
  ],
  async execute(
    _args: Record<string, unknown>,
    ctx: CliContext,
  ): Promise<void> {
    // Surfaces help when called without a subcommand.
    ctx.logger.info(
      'Usage: adt gcts <repo|branch|commit|log|objects|config> [...]',
    );
    ctx.logger.info(
      'Run `adt gcts <subcommand> --help` for subcommand-specific options.',
    );
  },
};

export default gctsCommand;
