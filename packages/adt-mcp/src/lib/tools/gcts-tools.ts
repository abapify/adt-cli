/**
 * MCP tools for SAP gCTS (git-enabled CTS).
 *
 * Mirrors the CLI subcommands exposed by `@abapify/adt-plugin-gcts-cli` but
 * wraps each contract call in an individual MCP tool. All tools go through
 * `client.adt.gcts.*` (from `@abapify/adt-contracts`) — no manual URLs.
 *
 * One file per tool is the canonical pattern (see `adt-mcp/AGENTS.md`), but
 * the twelve gCTS tools are thin wrappers over single contract calls, so
 * grouping them here keeps the diff small and the pattern obvious. Split
 * into per-file modules once any tool grows non-trivial logic.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolContext } from '../types';
import { connectionShape } from './shared-schemas';

type ToolResult =
  | {
      content: Array<{ type: 'text'; text: string }>;
      isError?: undefined;
    }
  | {
      isError: true;
      content: Array<{ type: 'text'; text: string }>;
    };

function okJson(value: unknown): ToolResult {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

function errMsg(prefix: string, error: unknown): ToolResult {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: `${prefix}: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
  };
}

// ── Individual tool registrations ──────────────────────────────────────────

export function registerGctsListReposTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_list_repos',
    'List gCTS repositories on the SAP system',
    { ...connectionShape },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.list();
        return okJson(res.result ?? []);
      } catch (e) {
        return errMsg('gcts_list_repos failed', e);
      }
    },
  );
}

export function registerGctsGetRepoTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_get_repo',
    'Get a single gCTS repository by RID',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.get(args.rid);
        return okJson(res.result ?? res);
      } catch (e) {
        return errMsg('gcts_get_repo failed', e);
      }
    },
  );
}

export function registerGctsCreateRepoTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_create_repo',
    'Create a new gCTS repository (POST /repository)',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      url: z.string().describe('Git URL (https://...)'),
      vsid: z.string().optional().describe('Virtual system ID (default: 6IT)'),
      role: z
        .enum(['SOURCE', 'TARGET'])
        .optional()
        .describe('Repository role (default: SOURCE)'),
      type: z
        .enum(['GITHUB', 'GIT'])
        .optional()
        .describe('Repository type (default: GITHUB)'),
      startingFolder: z
        .string()
        .optional()
        .describe('Repository start directory (default: src/)'),
      vcsToken: z
        .string()
        .optional()
        .describe('VCS authentication token (if required)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const config: Array<{ key: string; value: string }> = [];
        if (args.startingFolder)
          config.push({ key: 'VCS_TARGET_DIR', value: args.startingFolder });
        if (args.vcsToken)
          config.push({ key: 'CLIENT_VCS_AUTH_TOKEN', value: args.vcsToken });

        const body = {
          repository: args.rid,
          data: {
            rid: args.rid,
            name: args.rid,
            vsid: args.vsid ?? '6IT',
            url: args.url,
            role: args.role ?? 'SOURCE',
            type: args.type ?? 'GITHUB',
            connection: 'ssl',
            ...(config.length > 0 ? { config } : {}),
          },
        };
        const res = await client.adt.gcts.repository.create(body);
        return okJson(res.repository ?? res.result ?? res);
      } catch (e) {
        return errMsg('gcts_create_repo failed', e);
      }
    },
  );
}

export function registerGctsCloneRepoTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_clone_repo',
    'Clone an existing gCTS repository (POST /clone)',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.clone(args.rid);
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_clone_repo failed', e);
      }
    },
  );
}

export function registerGctsDeleteRepoTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_delete_repo',
    'Delete a gCTS repository (DELETE /repository/<rid>)',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.delete(args.rid);
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_delete_repo failed', e);
      }
    },
  );
}

export function registerGctsPullTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_pull',
    'Pull a gCTS repository (GET /pullByCommit)',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.pull(args.rid);
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_pull failed', e);
      }
    },
  );
}

export function registerGctsCheckoutBranchTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_checkout_branch',
    'Check out a branch in a gCTS repository',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      branch: z.string().describe('Target branch'),
      currentBranch: z
        .string()
        .optional()
        .describe('Current branch (auto-detected if omitted)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        let current = args.currentBranch;
        if (!current) {
          try {
            const r = await client.adt.gcts.repository.get(args.rid);
            current = r.result?.branch ?? 'main';
          } catch {
            current = 'main';
          }
        }
        const res = await client.adt.gcts.repository.checkout(
          args.rid,
          current,
          args.branch,
        );
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_checkout_branch failed', e);
      }
    },
  );
}

export function registerGctsListBranchesTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_list_branches',
    'List branches of a gCTS repository',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.branches.list(args.rid);
        return okJson(res.branches ?? []);
      } catch (e) {
        return errMsg('gcts_list_branches failed', e);
      }
    },
  );
}

export function registerGctsCreateBranchTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_create_branch',
    'Create a branch in a gCTS repository',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      name: z.string().describe('New branch name'),
      localOnly: z.boolean().optional().describe('Create a local branch only'),
      symbolic: z.boolean().optional(),
      peeled: z.boolean().optional(),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const body = {
          branch: args.name,
          type: (args.localOnly ? 'local' : 'global') as 'local' | 'global',
          isSymbolic: Boolean(args.symbolic),
          isPeeled: Boolean(args.peeled),
        };
        const res = await client.adt.gcts.branches.create(args.rid, body);
        return okJson(res.branch ?? res);
      } catch (e) {
        return errMsg('gcts_create_branch failed', e);
      }
    },
  );
}

export function registerGctsSwitchBranchTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_switch_branch',
    'Switch branches in a gCTS repository',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      target: z.string().describe('Target branch'),
      currentBranch: z.string().optional(),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        let current = args.currentBranch;
        if (!current) {
          try {
            const r = await client.adt.gcts.repository.get(args.rid);
            current = r.result?.branch ?? 'main';
          } catch {
            current = 'main';
          }
        }
        const res = await client.adt.gcts.branches.switch(
          args.rid,
          current,
          args.target,
        );
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_switch_branch failed', e);
      }
    },
  );
}

export function registerGctsCommitTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_commit',
    'Commit a package or transport into a gCTS repository',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      message: z.string().optional().describe('Commit message'),
      description: z.string().optional().describe('Long description'),
      corrnr: z
        .string()
        .optional()
        .describe('Transport number (mutually exclusive with devc)'),
      devc: z
        .string()
        .optional()
        .describe('ABAP package name (defaults to RID when corrnr is absent)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const objects = args.corrnr
          ? [{ object: args.corrnr, type: 'TRANSPORT' }]
          : [
              {
                object: (args.devc ?? args.rid).toUpperCase(),
                type: 'FULL_PACKAGE',
              },
            ];
        const defaultMsg = args.corrnr
          ? `Transport ${args.corrnr}`
          : `Export package ${(args.devc ?? args.rid).toUpperCase()}`;
        const body = {
          message: args.message ?? defaultMsg,
          autoPush: 'true' as const,
          objects,
          ...(args.description ? { description: args.description } : {}),
        };
        const res = await client.adt.gcts.commits.commit(args.rid, body);
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_commit failed', e);
      }
    },
  );
}

export function registerGctsLogTool(server: McpServer, ctx: ToolContext): void {
  server.tool(
    'gcts_log',
    'Show the commit history of a gCTS repository',
    { ...connectionShape, rid: z.string().describe('Repository ID') },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        const res = await client.adt.gcts.repository.log(args.rid);
        return okJson(res.commits ?? []);
      } catch (e) {
        return errMsg('gcts_log failed', e);
      }
    },
  );
}

export function registerGctsConfigTool(
  server: McpServer,
  ctx: ToolContext,
): void {
  server.tool(
    'gcts_config',
    'Get, set, unset, or list gCTS repository configuration entries',
    {
      ...connectionShape,
      rid: z.string().describe('Repository ID'),
      action: z
        .enum(['get', 'set', 'unset', 'list'])
        .describe('Operation to perform'),
      key: z.string().optional().describe('Config key (for get/set/unset)'),
      value: z.string().optional().describe('Config value (for set)'),
    },
    async (args) => {
      try {
        const client = ctx.getClient(args);
        if (args.action === 'list') {
          const repo = await client.adt.gcts.repository.get(args.rid);
          return okJson(repo.result?.config ?? []);
        }
        if (!args.key) {
          return errMsg(
            'gcts_config failed',
            new Error(`${args.action} requires "key"`),
          );
        }
        if (args.action === 'get') {
          const res = await client.adt.gcts.config.get(args.rid, args.key);
          return okJson(res.result ?? res);
        }
        if (args.action === 'set') {
          if (!args.value) {
            return errMsg(
              'gcts_config failed',
              new Error('set requires "value"'),
            );
          }
          const res = await client.adt.gcts.config.set(args.rid, {
            key: args.key,
            value: args.value,
          });
          return okJson(res);
        }
        // unset
        const res = await client.adt.gcts.config.delete(args.rid, args.key);
        return okJson(res);
      } catch (e) {
        return errMsg('gcts_config failed', e);
      }
    },
  );
}

// ── Aggregate registrar ────────────────────────────────────────────────────

export function registerGctsTools(server: McpServer, ctx: ToolContext): void {
  registerGctsListReposTool(server, ctx);
  registerGctsGetRepoTool(server, ctx);
  registerGctsCreateRepoTool(server, ctx);
  registerGctsCloneRepoTool(server, ctx);
  registerGctsDeleteRepoTool(server, ctx);
  registerGctsPullTool(server, ctx);
  registerGctsCheckoutBranchTool(server, ctx);
  registerGctsListBranchesTool(server, ctx);
  registerGctsCreateBranchTool(server, ctx);
  registerGctsSwitchBranchTool(server, ctx);
  registerGctsCommitTool(server, ctx);
  registerGctsLogTool(server, ctx);
  registerGctsConfigTool(server, ctx);
}
