export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintDiagnostic {
  key: string;
  message: string;
  severity: LintSeverity;
  filename: string;
  start: {
    line: number;
    column: number;
  };
  end: {
    line: number;
    column: number;
  };
}

export type LintSystemType = 'btp' | 'onpremise';

export interface LintOptions {
  filename?: string;
  systemType?: LintSystemType;
  ruleOverrides?: Record<string, unknown>;
}

export interface RuleInfo {
  key: string;
  enabled: boolean;
  config?: unknown;
}

export interface MethodBoundary {
  startLine: number;
  endLine: number;
}

export interface StripResult {
  source: string;
  fallback: boolean;
}
