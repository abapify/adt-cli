import { Config } from '@abaplint/core';
import type { LintSystemType } from './types';

function cloneDefaultConfig(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(Config.getDefault().get())) as Record<
    string,
    unknown
  >;
}

export function buildPreset(
  systemType: LintSystemType,
): Record<string, unknown> {
  const config = cloneDefaultConfig() as {
    rules?: Record<string, Record<string, unknown>>;
  };

  config.rules ??= {};

  if (systemType === 'btp') {
    config.rules.cloud_types = {
      ...(config.rules.cloud_types ?? {}),
      severity: 'Error',
    };
    config.rules.strict_sql = {
      ...(config.rules.strict_sql ?? {}),
      severity: 'Error',
    };
  } else {
    delete config.rules.cloud_types;
    config.rules.obsolete_statement = {
      ...(config.rules.obsolete_statement ?? {}),
      severity: 'Warning',
    };
  }

  return config;
}
