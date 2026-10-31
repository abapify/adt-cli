import {
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
describe('installed ADT CLI package', () => {
  it.each(['adt', 'adt-all'])('loads flow from %s', (entry) => {
    const installRoot = join(
      tmpdir(),
      `adt-cli-flow-install-${process.pid}-${Date.now()}`,
    );
    const nodeModules = join(installRoot, 'node_modules');
    const cliInstallRoot = join(nodeModules, '@abapify', 'adt-cli');

    try {
      const cliManifest = JSON.parse(
        readFileSync(join(cliPackageRoot, 'package.json'), 'utf8'),
      ) as { dependencies: Record<string, string> };
      const flowManifest = JSON.parse(
        readFileSync(
          join(cliPackageRoot, 'node_modules/@abapify/adt-flow/package.json'),
          'utf8',
        ),
      ) as { version: string };
      expect(cliManifest.dependencies['@abapify/adt-flow']).toBe(
        flowManifest.version,
      );

      mkdirSync(cliInstallRoot, { recursive: true });
      cpSync(join(cliPackageRoot, 'dist'), join(cliInstallRoot, 'dist'), {
        recursive: true,
      });
      cpSync(
        join(cliPackageRoot, 'package.json'),
        join(cliInstallRoot, 'package.json'),
      );

      // Stage the CLI's direct runtime dependencies for the registration smoke.
      // Their transitive dependencies retain the workspace's normal resolution.
      // The manifest assertion above prevents hoisting from hiding this edge.
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

      const configPath = join(installRoot, 'flow-smoke.config.mjs');
      writeFileSync(
        configPath,
        'export default { commands: ["@abapify/adt-flow/commands/flow"] };\n',
      );

      const cliPath = join(cliInstallRoot, `dist/bin/${entry}.mjs`);
      const result = spawnSync(
        process.execPath,
        [cliPath, '--config', configPath, 'flow', 'checkout', 'tr', '--help'],
        { cwd: installRoot, encoding: 'utf8', timeout: 30_000 },
      );

      expect(result.error).toBeUndefined();
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      expect(result.stdout).toMatch(/(?:^|[\s,])--partial(?=[\s,]|$)/m);
      expect(result.stdout).toContain('--report <file>');
    } finally {
      rmSync(installRoot, { recursive: true, force: true });
    }
  });
});
