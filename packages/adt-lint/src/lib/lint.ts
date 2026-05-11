import {
  ArtifactsRules,
  Config,
  Edits,
  MemoryFile,
  Registry,
  Severity,
} from '@abaplint/core';
import { buildPreset } from './preset';
import type {
  LintDiagnostic,
  LintOptions,
  LintSeverity,
  RuleInfo,
} from './types';

const DEFAULT_FILENAME = 'zlint.prog.abap';

function toSeverity(severity: Severity): LintSeverity {
  switch (severity) {
    case Severity.Warning:
      return 'warning';
    case Severity.Info:
      return 'info';
    default:
      return 'error';
  }
}

function toDiagnostics(registry: Registry): LintDiagnostic[] {
  return registry.findIssues().map((issue) => ({
    key: issue.getKey(),
    message: issue.getMessage(),
    severity: toSeverity(issue.getSeverity()),
    filename: issue.getFilename(),
    start: {
      line: issue.getStart().getRow(),
      column: issue.getStart().getCol(),
    },
    end: {
      line: issue.getEnd().getRow(),
      column: issue.getEnd().getCol(),
    },
  }));
}

function buildConfig(options?: LintOptions): Config {
  const base = buildPreset(options?.systemType ?? 'onpremise') as {
    rules?: Record<string, unknown>;
  };

  if (options?.ruleOverrides) {
    base.rules ??= {};
    base.rules = { ...base.rules, ...options.ruleOverrides };
  }

  return new Config(JSON.stringify(base));
}

function createRegistry(
  source: string,
  options?: LintOptions,
): {
  registry: Registry;
  filename: string;
  config: Config;
} {
  const filename = options?.filename ?? DEFAULT_FILENAME;
  const config = buildConfig(options);
  const registry = new Registry(undefined, config);
  registry.addFile(new MemoryFile(filename, source));
  registry.parse();

  return { registry, filename, config };
}

export function lintSource(
  source: string,
  options?: LintOptions,
): LintDiagnostic[] {
  const { registry } = createRegistry(source, options);
  return toDiagnostics(registry);
}

export function lintAndFix(
  source: string,
  options?: LintOptions,
): {
  source: string;
  remaining: LintDiagnostic[];
} {
  const { registry, filename } = createRegistry(source, options);
  const fixes = registry
    .findIssues()
    .map((issue) => issue.getDefaultFix())
    .filter((fix): fix is NonNullable<typeof fix> => Boolean(fix));

  if (fixes.length > 0) {
    Edits.applyEditList(registry, fixes);
    registry.parse();
  }

  return {
    source: registry.getFileByName(filename)?.getRaw() ?? source,
    remaining: toDiagnostics(registry),
  };
}

export function listRules(options?: LintOptions): RuleInfo[] {
  const config = buildConfig(options);
  const enabled = new Set(
    config.getEnabledRules().map((rule) => rule.getMetadata().key),
  );

  return ArtifactsRules.getRules()
    .map((rule) => {
      const key = rule.getMetadata().key;
      return {
        key,
        enabled: enabled.has(key),
        config: config.readByRule(key),
      } satisfies RuleInfo;
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}
