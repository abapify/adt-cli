import type { AdtClient } from '@abapify/adt-client';

export const DEFAULT_CHECK_SOURCE_VERSION = 'inactive';

export type CheckSourceVersion =
  | ''
  | 'active'
  | 'inactive'
  | 'workingArea'
  | 'new'
  | 'partlyActive'
  | 'activeWithInactiveVersion';

export type CheckMessage = {
  uri?: string;
  type?: unknown;
  shortText?: string;
  category?: string;
  code?: string;
};

export type CheckReport = {
  checkMessageList?: {
    checkMessage?: CheckMessage[];
  };
  reporter?: string;
  triggeringUri?: string;
  status?: string;
  statusText?: string;
};

export interface CheckServiceInput {
  objects: Array<{ uri: string }>;
  sourceVersion?: CheckSourceVersion;
}

export interface CheckResult {
  reports: CheckReport[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

function buildCheckObjectList(
  objects: Array<{ uri: string }>,
  sourceVersion: CheckSourceVersion,
) {
  return {
    checkObjectList: {
      checkObject: objects.map((object) => ({
        uri: object.uri,
        version: sourceVersion,
      })),
    },
  };
}

function normalizeCheckMessages(
  rawMessages: unknown,
): CheckMessage[] | undefined {
  if (!rawMessages) return undefined;
  return Array.isArray(rawMessages)
    ? rawMessages
    : [rawMessages as CheckMessage];
}

function normalizeReport(entry: unknown): CheckReport {
  const report = (entry ?? {}) as Record<string, unknown>;
  const messageList = report.checkMessageList as
    { checkMessage?: CheckMessage | CheckMessage[] } | undefined;
  const messages = normalizeCheckMessages(messageList?.checkMessage);

  return {
    reporter: report.reporter as string | undefined,
    triggeringUri: report.triggeringUri as string | undefined,
    status: report.status as string | undefined,
    statusText: report.statusText as string | undefined,
    checkMessageList: messages ? { checkMessage: messages } : undefined,
  };
}

function detectSeverities(
  reports: CheckReport[],
): Pick<CheckResult, 'hasErrors' | 'hasWarnings'> {
  let hasErrors = false;
  let hasWarnings = false;
  for (const report of reports) {
    for (const message of report.checkMessageList?.checkMessage ?? []) {
      const severity =
        typeof message.type === 'string' ? message.type : message.category;
      if (severity === 'E' || severity === 'A') hasErrors = true;
      if (severity === 'W') hasWarnings = true;
    }
  }
  return { hasErrors, hasWarnings };
}

function extractReports(response: unknown): CheckResult {
  const root = (response ?? {}) as Record<string, unknown>;
  const reportsBlock = (root.checkRunReports ?? root) as Record<
    string,
    unknown
  >;
  const rawReports = reportsBlock.checkReport;
  const singleReport = rawReports ? [rawReports] : [];
  const reportEntries = Array.isArray(rawReports) ? rawReports : singleReport;

  const reports = reportEntries.map(normalizeReport);
  return { reports, ...detectSeverities(reports) };
}

export class CheckService {
  constructor(private readonly client: AdtClient) {}

  async run(input: CheckServiceInput): Promise<CheckResult> {
    const sourceVersion = input.sourceVersion ?? DEFAULT_CHECK_SOURCE_VERSION;
    const body = buildCheckObjectList(input.objects, sourceVersion);
    const endpoint = this.client.adt.checkruns.checkObjects;
    // The runtime endpoint accepts the schema body, while the generated
    // contract currently exposes the descriptor factory's zero-argument
    // signature. Keep that typing mismatch isolated at this boundary.
    const post = endpoint.post as unknown as (
      request: typeof body,
    ) => Promise<unknown>;
    const response = await post.call(endpoint, body);
    return extractReports(response);
  }
}
