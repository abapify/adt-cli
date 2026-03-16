// Exported symbols for package mapping
export const local = Symbol('local'); // local(remoteName) -> localName
export const remote = Symbol('remote'); // remote(localName) -> remoteName

export interface ImportContext {
  sourceSystem?: string;
  targetProject?: string;
}

export interface ExportContext {
  targetSystem?: string;
  targetEnv?: string;
  teamPrefix?: string;
}

export interface PackageMapping {
  // Static mappings: localName -> remoteName
  [localPackage: string]: string;

  // Dynamic transform functions
  [local]?: (remotePkg: string, context?: ImportContext) => string;
  [remote]?: (localPkg: string, context?: ExportContext) => string;
}

/**
 * Base configuration object type - extensible by format plugins via adt.config.ts.
 * Format plugins may add their own configuration keys here.
 */
export interface AdtConfig {
  [key: string]: unknown;
}

/** Represents the shape of an adt.config.ts export */
export interface AdtConfigFile {
  default: AdtConfig;
}
