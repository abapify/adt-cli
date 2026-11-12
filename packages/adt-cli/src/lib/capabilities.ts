export interface CliCapabilityIdentity {
  name: string;
  version: string;
}

export interface FormatCapability {
  format: string;
  objectTypes: string[];
}

export interface RuntimeModuleStatus {
  name: string;
  resolved: boolean;
}

export interface RuntimeCapabilityReport {
  schemaVersion: 1;
  cli: CliCapabilityIdentity;
  formats: FormatCapability[];
  runtimeModules: RuntimeModuleStatus[];
  features: Record<string, boolean>;
}

/** Minimal registry surface the collector needs. */
export interface RegistryLike {
  getAvailableFormats(): string[];
  getPlugin(name: string): { getSupportedObjectTypes(): string[] } | undefined;
}

export interface CapabilityCollectorInput {
  cli: CliCapabilityIdentity;
  registry: RegistryLike;
  /** Configured runtime modules and lazy dependencies to probe. */
  lazyModules: readonly string[];
  /** Pure module-resolution probe over the installed artifact. */
  resolveModule(name: string): boolean;
  /** Diagnostic feature flags reported as facts. */
  features?: Record<string, boolean>;
}

/** Typed failure for a configured module the installed artifact cannot load. */
export class RuntimeModuleMissingError extends Error {
  readonly module: string;

  constructor(module: string) {
    super(
      `Configured runtime module is not available in the installed artifact: ${module}`,
    );
    this.name = 'RuntimeModuleMissingError';
    this.module = module;
  }
}

/**
 * Build the machine-readable capability report from the loaded registry and
 * installed-artifact module probes. Pure with respect to its inputs: formats
 * and modules are sorted deterministically and no caller input is mutated.
 */
export function collectCapabilityReport(
  input: CapabilityCollectorInput,
): RuntimeCapabilityReport {
  const formats = input.registry
    .getAvailableFormats()
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((format) => ({
      format,
      objectTypes: Array.from(
        input.registry.getPlugin(format)?.getSupportedObjectTypes() ?? [],
      ).sort((a, b) => a.localeCompare(b)),
    }));
  const runtimeModules = input.lazyModules
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, resolved: input.resolveModule(name) }));
  return {
    schemaVersion: 1,
    cli: { ...input.cli },
    formats,
    runtimeModules,
    features: { ...input.features },
  };
}

/**
 * Enforce the no-fallback contract: a configured module the installed
 * artifact cannot resolve is a typed failure naming the module.
 */
export function assertRuntimeModules(report: RuntimeCapabilityReport): void {
  const missing = report.runtimeModules.find((module) => !module.resolved);
  if (missing) {
    throw new RuntimeModuleMissingError(missing.name);
  }
}
