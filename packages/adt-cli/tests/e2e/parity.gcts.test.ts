/**
 * CLI + MCP parity tests for gCTS (E07).
 *
 * Each test drives the same logical operation through the CLI
 * (`adt gcts …`) and the MCP tool (`gcts_…`). Both paths hit the shared
 * in-process mock ADT server (`/sap/bc/cts_abapvcs/` routes) configured in
 * `@abapify/adt-fixtures/mock-server`.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  startAdtHarness,
  runCliCommand,
  callMcpTool,
  type AdtHarness,
  type CliRunResult,
} from './index';

function extractJson<T = unknown>(cli: CliRunResult): T | undefined {
  if (cli.json !== undefined) return cli.json as T;
  const text = cli.stdout;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '[' && ch !== '{') continue;
    try {
      return JSON.parse(text.slice(i)) as T;
    } catch {
      /* keep scanning */
    }
  }
  return undefined;
}

const RID = 'example-repo';

describe('parity: gcts', () => {
  let harness: AdtHarness;

  beforeAll(async () => {
    harness = await startAdtHarness();
  }, 30_000);

  afterAll(async () => {
    if (harness) await harness.stop();
  });

  it('list repos: CLI `gcts repo list --json` and MCP `gcts_list_repos`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'repo',
      'list',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliRepos = extractJson<Array<{ rid: string }>>(cli);
    expect(Array.isArray(cliRepos)).toBe(true);
    expect(cliRepos!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<Array<{ rid: string }>>(
      harness,
      'gcts_list_repos',
      {},
    );
    expect(mcp.isError).toBe(false);
    const cliRids = cliRepos!.map((r) => r.rid).sort();
    const mcpRids = mcp.json.map((r) => r.rid).sort();
    expect(cliRids).toEqual(mcpRids);
  });

  it('get repo: CLI `gcts config <rid> list --json` and MCP `gcts_get_repo`', async () => {
    // CLI has no direct `repo get`; `config list` fetches full repo metadata.
    const cli = await runCliCommand(harness, [
      'gcts',
      'config',
      RID,
      'list',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliConfig = extractJson<Array<{ key: string }>>(cli);
    expect(Array.isArray(cliConfig)).toBe(true);

    const mcp = await callMcpTool<{ rid: string; config?: unknown[] }>(
      harness,
      'gcts_get_repo',
      { rid: RID },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.rid).toBe(RID);
  });

  it('create repo: CLI `gcts repo create` and MCP `gcts_create_repo`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'repo',
      'create',
      'new-repo',
      'https://example.com/git/new-repo',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ rid?: string }>(
      harness,
      'gcts_create_repo',
      { rid: 'new-repo', url: 'https://example.com/git/new-repo' },
    );
    expect(mcp.isError).toBe(false);
    // Mock returns the canned "example-repo" envelope regardless of
    // request body, but both paths must succeed and produce JSON with a
    // repository id.
    expect(JSON.stringify(mcp.json)).toMatch(/example-repo|new-repo/);
  });

  it('pull repo: CLI `gcts repo pull` and MCP `gcts_pull`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'repo',
      'pull',
      RID,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliJson = extractJson<{ fromCommit?: string; toCommit?: string }>(
      cli,
    );
    expect(cliJson?.toCommit).toBeTruthy();

    const mcp = await callMcpTool<{ fromCommit?: string; toCommit?: string }>(
      harness,
      'gcts_pull',
      { rid: RID },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.toCommit).toBe(cliJson!.toCommit);
  });

  it('list branches: CLI `gcts branch list --json -a` and MCP `gcts_list_branches`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'branch',
      'list',
      RID,
      '-a',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliBranches = extractJson<Array<{ name: string }>>(cli);
    expect(Array.isArray(cliBranches)).toBe(true);

    const mcp = await callMcpTool<Array<{ name: string }>>(
      harness,
      'gcts_list_branches',
      { rid: RID },
    );
    expect(mcp.isError).toBe(false);
    // MCP returns full list; CLI filtered by -a (all) returns the same.
    expect(mcp.json.length).toBe(cliBranches!.length);
  });

  it('create branch: CLI `gcts branch create` and MCP `gcts_create_branch`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'branch',
      'create',
      RID,
      'feature/cli',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ name?: string }>(
      harness,
      'gcts_create_branch',
      { rid: RID, name: 'feature/mcp' },
    );
    expect(mcp.isError).toBe(false);
    expect(typeof mcp.json.name).toBe('string');
  });

  it('commit: CLI `gcts commit <rid> -d PKG` and MCP `gcts_commit`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'commit',
      RID,
      '-d',
      'ZMOCK_PKG',
      '-m',
      'Commit from CLI',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<Record<string, unknown>>(
      harness,
      'gcts_commit',
      { rid: RID, devc: 'ZMOCK_PKG', message: 'Commit from MCP' },
    );
    expect(mcp.isError).toBe(false);
    // The mock echoes the commit response fixture; both paths should parse.
    expect(JSON.stringify(mcp.json)).toMatch(/trkorr|toCommit|fromCommit/);
  });

  it('log: CLI `gcts log <rid> --json` and MCP `gcts_log`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'log',
      RID,
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);
    const cliCommits = extractJson<Array<{ id: string }>>(cli);
    expect(Array.isArray(cliCommits)).toBe(true);
    expect(cliCommits!.length).toBeGreaterThan(0);

    const mcp = await callMcpTool<Array<{ id: string }>>(
      harness,
      'gcts_log',
      { rid: RID },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.map((c) => c.id)).toEqual(cliCommits!.map((c) => c.id));
  });

  it('config get: CLI `gcts config get VCS_TARGET_DIR` and MCP `gcts_config action=get`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'config',
      RID,
      'get',
      'VCS_TARGET_DIR',
      '--json',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<{ key?: string; value?: string }>(
      harness,
      'gcts_config',
      { rid: RID, action: 'get', key: 'VCS_TARGET_DIR' },
    );
    expect(mcp.isError).toBe(false);
    expect(mcp.json.key).toBe('VCS_TARGET_DIR');
  });

  it('config set: CLI `gcts config set KEY VALUE` and MCP `gcts_config action=set`', async () => {
    const cli = await runCliCommand(harness, [
      'gcts',
      'config',
      RID,
      'set',
      'MY_KEY',
      'my-value',
    ]);
    expect(cli.exitCode, cli.stderr || cli.stdout).toBe(0);

    const mcp = await callMcpTool<Record<string, unknown>>(
      harness,
      'gcts_config',
      { rid: RID, action: 'set', key: 'MY_KEY', value: 'my-value' },
    );
    expect(mcp.isError).toBe(false);
  });
});
