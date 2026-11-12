/**
 * Extract the effective `--config <path>` value from raw CLI argv.
 * Shared by the CLI entry point and capability assessment so both honor the
 * same flag forms (`--config <path>` and `--config=<path>`).
 */

function getNonEmptyConfigPathOrThrow(configPath: string | undefined): string {
  if (!configPath) {
    throw new Error("option '--config <path>' argument missing");
  }

  return configPath;
}

function getSeparatedConfigPathOrThrow(configPath: string | undefined): string {
  const resolvedConfigPath = getNonEmptyConfigPathOrThrow(configPath);
  if (resolvedConfigPath.startsWith('-')) {
    throw new Error("option '--config <path>' argument missing");
  }

  return resolvedConfigPath;
}

export function getResolvedConfigPath(argv: string[]): string | undefined {
  const optionTerminatorIndex = argv.indexOf('--');
  const optionArgs =
    optionTerminatorIndex === -1 ? argv : argv.slice(0, optionTerminatorIndex);

  const configArgIndex = optionArgs.indexOf('--config');
  if (configArgIndex !== -1) {
    const configPath = optionArgs[configArgIndex + 1];
    return getSeparatedConfigPathOrThrow(configPath);
  }

  const inlineConfigArg = optionArgs.find((argument) =>
    argument.startsWith('--config='),
  );
  if (inlineConfigArg !== undefined) {
    const configPath = inlineConfigArg.slice('--config='.length);
    return getNonEmptyConfigPathOrThrow(configPath);
  }

  return undefined;
}
