import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const cliPackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const cliStartupTimeoutMs = 30_000;
const installedPackageTestTimeoutMs = cliStartupTimeoutMs + 15_000;

/** Stage an installed adt-cli artifact with its direct runtime deps. */
function stageInstalledCli(
  entry: string,
  unique: string,
): { installRoot: string; cliPath: string; cleanup: () => void } {
  const installRoot = join(tmpdir(), `adt-cli-capabilities-${unique}`);
  const nodeModules = join(installRoot, 'node_modules');
  const cliInstallRoot = join(nodeModules, '@abapify', 'adt-cli');

  mkdirSync(cliInstallRoot, { recursive: true });
  cpSync(join(cliPackageRoot, 'dist'), join(cliInstallRoot, 'dist'), {
    recursive: true,
  });
  cpSync(
    join(cliPackageRoot, 'package.json'),
    join(cliInstallRoot, 'package.json'),
  );

  const cliManifest = JSON.parse(
    readFileSync(join(cliPackageRoot, 'package.json'), 'utf8'),
  ) as { dependencies: Record<string, string>; version: string };
  for (const dependency of Object.keys(cliManifest.dependencies)) {
    const workspaceDependency = join(
      cliPackageRoot,
      'node_modules',
      dependency,
    );
    if (!existsSync(workspaceDependency)) {
      throw new Error(`Missing installed dependency ${dependency}`);
    }
    const installedDependency = join(nodeModules, dependency);
    mkdirSync(dirname(installedDependency), { recursive: true });
    symlinkSync(
      realpathSync(workspaceDependency),
      installedDependency,
      'junction',
    );
  }

  return {
    installRoot,
    cliPath: join(cliInstallRoot, `dist/bin/${entry}.mjs`),
    cleanup: () => rmSync(installRoot, { recursive: true, force: true }),
  };
}

function parseReport(stdout: string): {
  schemaVersion: number;
  cli: { name: string; version: string };
  formats: Array<{ format: string; objectTypes: string[] }>;
  runtimeModules: Array<{ name: string; resolved: boolean }>;
} {
  return JSON.parse(stdout) as {
    schemaVersion: number;
    cli: { name: string; version: string };
    formats: Array<{ format: string; objectTypes: string[] }>;
    runtimeModules: Array<{ name: string; resolved: boolean }>;
  };
}

describe('installed ADT CLI capabilities', () => {
  it('reports capabilities from an unrelated working directory', () => {
    const { installRoot, cliPath, cleanup } = stageInstalledCli(
      'adt',
      `unrelated-${process.pid}-${Date.now()}`,
    );
    try {
      const result = spawnSync(process.execPath, [cliPath, 'capabilities'], {
        cwd: installRoot,
        encoding: 'utf8',
        timeout: cliStartupTimeoutMs,
      });
      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const report = parseReport(result.stdout);
      expect(report.schemaVersion).toBe(1);
      expect(report.cli.name).toBe('adt');
      expect(report.cli.version).not.toBe('0.0.0');
      expect(Array.isArray(report.runtimeModules)).toBe(true);
    } finally {
      cleanup();
    }
  });

  it(
    'reports capabilities through a PATH symlink',
    () => {
      const { installRoot, cliPath, cleanup } = stageInstalledCli(
        'adt',
        `symlink-${process.pid}-${Date.now()}`,
      );
      try {
        const binDir = join(installRoot, '.bin');
        mkdirSync(binDir, { recursive: true });
        const shim = join(binDir, 'adt');
        writeFileSync(
          shim,
          `#!/bin/sh\nexec "${process.execPath}" "${cliPath}" "$@"\n`,
        );
        chmodSync(shim, 0o755);

        const unrelatedCwd = tmpdir();
        const result = spawnSync(
          'sh',
          ['-c', 'command -v adt >/dev/null && adt capabilities'],
          {
            cwd: unrelatedCwd,
            encoding: 'utf8',
            timeout: cliStartupTimeoutMs,
            env: {
              ...process.env,
              PATH: `${binDir}${process.env.PATH ? `:${process.env.PATH}` : ''}`,
            },
          },
        );
        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        const report = parseReport(result.stdout);
        expect(report.schemaVersion).toBe(1);
        expect(report.cli.name).toBe('adt');
      } finally {
        cleanup();
      }
    },
    installedPackageTestTimeoutMs,
  );

  it(
    'reports a missing configured module as unresolved without fallback',
    () => {
      const { installRoot, cliPath, cleanup } = stageInstalledCli(
        'adt',
        `missing-${process.pid}-${Date.now()}`,
      );
      try {
        const configPath = join(installRoot, 'missing.config.mjs');
        writeFileSync(
          configPath,
          'export default { commands: ["@abapify/adt-nonexistent-module"] };\n',
        );
        const result = spawnSync(
          process.execPath,
          [cliPath, '--config', configPath, 'capabilities'],
          { cwd: installRoot, encoding: 'utf8', timeout: cliStartupTimeoutMs },
        );
        expect(result.error).toBeUndefined();
        expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
        const report = parseReport(result.stdout);
        expect(report.runtimeModules).toContainEqual({
          name: '@abapify/adt-nonexistent-module',
          resolved: false,
        });
      } finally {
        cleanup();
      }
    },
    installedPackageTestTimeoutMs,
  );
});
