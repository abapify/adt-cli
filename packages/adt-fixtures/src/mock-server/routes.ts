/**
 * Route table for the mock ADT HTTP server.
 *
 * Every response body is sourced from `@abapify/adt-fixtures` files —
 * no inline XML/JSON strings here. Fixtures are preloaded at server
 * start via `loadRouteFixtures()` so that `matchRoute` can stay sync.
 */

import { fixtures } from '../fixtures';
import type { LockRegistry } from './lock-registry';

export interface RouteResult {
  status: number;
  body: string;
  contentType: string;
  /** Extra response headers (e.g., for session URL link header). */
  headers?: Record<string, string>;
}

interface XmlAttribute {
  name: string;
  value: string;
}

interface TaskAttribute extends XmlAttribute {
  taskNumber: string;
}

interface NewTransportTask {
  parent: string;
  number: string;
  owner: string;
}

interface DirectTaskResponseInput {
  template: string;
  parentResponse: string;
  taskNumber: string;
}

interface TaskResponsesInput {
  template: string;
  parentResponse: string;
}

function setXmlAttribute(attributes: string, attr: XmlAttribute): string {
  const prefix = `${attr.name}=`;
  const start = attributes.indexOf(prefix);
  if (start !== -1) {
    const quoteStart = start + prefix.length;
    const quote = attributes[quoteStart];
    if (quote === '"' || quote === "'") {
      const valueEnd = attributes.indexOf(quote, quoteStart + 1);
      if (valueEnd !== -1) {
        return (
          attributes.slice(0, start) +
          `${attr.name}="${attr.value}"` +
          attributes.slice(valueEnd + 1)
        );
      }
    }
  }
  return `${attributes} ${attr.name}="${attr.value}"`;
}

function extractXmlAttribute(xml: string, name: string): string | undefined {
  const prefix = `${name}=`;
  const start = xml.indexOf(prefix);
  if (start === -1) return undefined;
  const quote = xml[start + prefix.length];
  if (quote !== '"' && quote !== "'") return undefined;
  const end = xml.indexOf(quote, start + prefix.length + 1);
  if (end === -1) return undefined;
  return xml.slice(start + prefix.length + 1, end);
}

function replaceRequestAttribute(xml: string, attr: XmlAttribute): string {
  return xml.replace(/<tm:request\b([^>]*)>/, (tag, attributes: string) => {
    return `<tm:request${setXmlAttribute(attributes, {
      name: `tm:${attr.name}`,
      value: attr.value,
    })}>`;
  });
}

function replaceTaskAttribute(xml: string, attr: TaskAttribute): string {
  const needle = `tm:number="${attr.taskNumber}"`;
  const numberIdx = xml.indexOf(needle);
  if (numberIdx === -1) return xml;
  const tagStart = xml.lastIndexOf('<tm:task', numberIdx);
  if (tagStart === -1) return xml;
  const tagEnd = xml.indexOf('>', tagStart);
  if (tagEnd === -1) return xml;
  const attributes = xml.slice(tagStart + '<tm:task'.length, tagEnd);
  const newAttributes = setXmlAttribute(attributes, {
    name: `tm:${attr.name}`,
    value: attr.value,
  });
  return (
    xml.slice(0, tagStart) + `<tm:task${newAttributes}>` + xml.slice(tagEnd + 1)
  );
}

function extractTargetUser(requestBody: string): string | undefined {
  return extractXmlAttribute(requestBody, 'tm:targetuser');
}

function extractRequestAttribute(
  xml: string,
  attribute: 'number' | 'status',
): string | undefined {
  const request = /<tm:request\b([^>]*)>/.exec(xml)?.[1];
  return request ? extractXmlAttribute(request, `tm:${attribute}`) : undefined;
}

interface SplitDigits {
  prefix: string;
  digits: string;
}

function splitTrailingDigits(value: string): SplitDigits | undefined {
  let i = value.length - 1;
  while (i >= 0 && value[i] >= '0' && value[i] <= '9') {
    i--;
  }
  if (i === value.length - 1) return undefined;
  return { prefix: value.slice(0, i + 1), digits: value.slice(i + 1) };
}

function nextTransportTaskNumber(xml: string, parent: string): string {
  const parentSplit = splitTrailingDigits(parent);
  if (!parentSplit) return `${parent}_TASK`;

  const { prefix, digits } = parentSplit;
  const numbers = Array.from(xml.matchAll(/\btm:number=["']([^"']+)["']/g))
    .map((match) => splitTrailingDigits(match[1]))
    .filter((split): split is SplitDigits =>
      Boolean(split && split.prefix === prefix),
    )
    .map((split) => Number.parseInt(split.digits, 10));
  const next = Math.max(Number.parseInt(digits, 10), ...numbers) + 1;
  return `${prefix}${String(next).padStart(digits.length, '0')}`;
}

function appendTransportTask(xml: string, task: NewTransportTask): string {
  if (xml.includes(`tm:number="${task.number}"`)) return xml;
  const taskXml = `<tm:task tm:number="${task.number}" tm:parent="${task.parent}" tm:owner="${task.owner}" tm:desc="Incremental task" tm:type="S" tm:status="D" tm:status_text="Modifiable" tm:uri="/sap/bc/adt/cts/transportrequests/${task.number}"><tm:long_desc/></tm:task>`;
  return xml.replace('</tm:request>', `${taskXml}</tm:request>`);
}

function findTaskElement(xml: string, taskNumber: string): string | undefined {
  const needle = `tm:number="${taskNumber}"`;
  const numberIdx = xml.indexOf(needle);
  if (numberIdx === -1) return undefined;
  const tagStart = xml.lastIndexOf('<tm:task', numberIdx);
  if (tagStart === -1) return undefined;
  const tagEnd = xml.indexOf('>', tagStart);
  if (tagEnd === -1) return undefined;
  const closeTag = '</tm:task>';
  const closeIdx = xml.indexOf(closeTag, tagEnd);
  if (closeIdx === -1) return undefined;
  return xml.slice(tagStart, closeIdx + closeTag.length);
}

function createDirectTaskResponse(input: DirectTaskResponseInput): string {
  const templateParent = extractRequestAttribute(input.template, 'number');
  const templateTask = /<tm:task\b[^>]*\btm:number=["']([^"']+)["']/.exec(
    input.template,
  )?.[1];
  const parentNumber = extractRequestAttribute(input.parentResponse, 'number');
  if (!templateParent || !templateTask || !parentNumber) return input.template;

  const response = input.template
    .replaceAll(templateParent, parentNumber)
    .replaceAll(templateTask, input.taskNumber);
  const templateTaskElement = findTaskElement(response, input.taskNumber);
  const actualTaskElement = findTaskElement(
    input.parentResponse,
    input.taskNumber,
  );
  return templateTaskElement && actualTaskElement
    ? response.replace(templateTaskElement, actualTaskElement)
    : response;
}

function createTransportTaskResponses(
  input: TaskResponsesInput,
): Map<string, string> {
  const taskNumbers = Array.from(
    input.parentResponse.matchAll(
      /<tm:task\b[^>]*\btm:number=["']([^"']+)["']/gu,
    ),
    (match) => match[1],
  );
  return new Map(
    taskNumbers.map((taskNumber) => [
      taskNumber,
      createDirectTaskResponse({ ...input, taskNumber }),
    ]),
  );
}

/**
 * Preloaded fixture content — populated once at server start.
 * All routes read from this map to avoid async in matchRoute.
 */
export interface LoadedFixtures {
  discovery: string;
  session: string;
  systeminfo: string;
  search: string;
  grep: string;
  transportList: string;
  transportSingle: string;
  transportSingleTask: string;
  transportTaskResponses: Map<string, string>;
  transportCreate: string;
  transportTaskCreate: string;
  taskCreationMode: 'create' | 'noop';
  transportRelease: string;
  transportFind: string;
  searchconfigMetadata: string;
  atcRun: string;
  atcWorklist: string;
  sourceClass: string;
  sourceTestClasses: string;
  lockResponse: string;
  activationResult: string;
  checkRuns: string;
  aunit: string;
  navigationTarget: string;
  usages: string;
  usageReferencesScope: string;
  usageReferencesResult: string;
  callers: string;
  callees: string;
  tableDefinition: string;
  tableContents: string;
  inactiveObjects: string;
  fugrGroup: string;
  fugrModule: string;
  objectStructure: string;
  typeHierarchy: string;
  prettySource: string;
  softwareComponents: string;
  abapgitObjects: string;
  abapgitExport: string;
  // DDIC/CDS + classrun additions
  ddlSource: string;
  dclSource: string;
  domainSingle: string;
  dataElementSingle: string;
  structureSingle: string;
  classrunResponse: string;
  // CTS/packages/users parity additions
  packageMetadata: string;
  usersSingle: string;
  usersSearch: string;
  classMetadata: string;
  interfaceMetadata: string;
  programMetadata: string;
  includeMetadata: string;
  functionGroupMetadata: string;
  // Coverage — sourced from jfilak/sapcli
  coverageMeasurements: string;
  coverageStatements: string;
  // STRUST / system security — TODO-synthetic fixtures
  strustPseList: string;
  strustCertList: string;
  strustCert: string;
  // gCTS (E07) — real shapes from jfilak/sapcli gCTS test fixtures
  gctsRepositories: string;
  gctsRepository: string;
  gctsCreateResponse: string;
  gctsBranches: string;
  gctsCreateBranch: string;
  gctsLog: string;
  gctsPull: string;
  gctsObjects: string;
  gctsConfig: string;
  gctsCommitResponse: string;
  // BDEF (RAP behavior definition)
  bdefSingle: string;
  bdefSource: string;
  // BAdI / Enhancement Implementation (ENHO/XHH)
  badiSingle: string;
  badiSource: string;
  // BAdI / Enhancement Implementation metadata (ENHO/XHB)
  badiInfoSingle: string;
  // vit/wb Basic Object Properties (classic BAdI SXSD/SXCI)
  vitWbSxsdxdSingle: string;
  vitWbSxcixiSingle: string;
  vitWbSxcixiSingleB: string;
  badiImplementationsSearch: string;
  // SRVD (RAP service definition)
  srvdSingle: string;
  srvdSource: string;
  // SRVB (RAP service binding)
  srvbSingle: string;
  // CDS/RAP source types (DDLX, DSFD, DSFI, DTEB, DESD)
  ddlxSingle: string;
  dsfdSingle: string;
  dsfiSource: string;
  dtebSingle: string;
  // FLP (E14) — Page Builder OData
  flpCatalogList: string;
  flpCatalogSingle: string;
  flpGroupList: string;
  flpTileList: string;
  flpTileSingle: string;
}

/**
 * Preload every fixture referenced by the route table.
 * Called once when the mock server starts.
 */
export async function loadRouteFixtures(): Promise<LoadedFixtures> {
  const m = fixtures.mcp;
  const [
    discovery,
    session,
    systeminfo,
    search,
    grep,
    transportList,
    transportSingle,
    transportSingleTask,
    transportCreate,
    transportTaskCreate,
    transportRelease,
    transportFind,
    searchconfigMetadata,
    atcRun,
    atcWorklist,
    sourceClass,
    sourceTestClasses,
    lockResponse,
    activationResult,
    checkRuns,
    aunit,
    navigationTarget,
    usages,
    usageReferencesScope,
    usageReferencesResult,
    callers,
    callees,
    tableDefinition,
    tableContents,
    inactiveObjects,
    fugrGroup,
    fugrModule,
    objectStructure,
    typeHierarchy,
    prettySource,
    softwareComponents,
    abapgitObjects,
    abapgitExport,
    ddlSource,
    dclSource,
    domainSingle,
    dataElementSingle,
    structureSingle,
    classrunResponse,
    packageMetadata,
    usersSingle,
    usersSearch,
    classMetadata,
    interfaceMetadata,
    programMetadata,
    includeMetadata,
    functionGroupMetadata,
    coverageMeasurements,
    coverageStatements,
    strustPseList,
    strustCertList,
    strustCert,
    gctsRepositories,
    gctsRepository,
    gctsCreateResponse,
    gctsBranches,
    gctsCreateBranch,
    gctsLog,
    gctsPull,
    gctsObjects,
    gctsConfig,
    gctsCommitResponse,
    bdefSingle,
    bdefSource,
    badiSingle,
    badiSource,
    badiInfoSingle,
    vitWbSxsdxdSingle,
    vitWbSxcixiSingle,
    vitWbSxcixiSingleB,
    badiImplementationsSearch,
    srvdSingle,
    srvdSource,
    srvbSingle,
    ddlxSingle,
    dsfdSingle,
    dsfiSource,
    dtebSingle,
    flpCatalogList,
    flpCatalogSingle,
    flpGroupList,
    flpTileList,
    flpTileSingle,
  ] = await Promise.all([
    m.discovery.load(),
    m.session.load(),
    m.systeminfo.load(),
    m.search.load(),
    m.grep.load(),
    m.transport.list.load(),
    fixtures.transport.single.load(),
    fixtures.transport.singleTask.load(),
    fixtures.transport.createResponse.load(),
    fixtures.transport.taskCreateResponse.load(),
    m.transport.release.load(),
    fixtures.transport.find.load(),
    fixtures.transport.searchconfigMetadata.load(),
    m.atc.run.load(),
    m.atc.worklist.load(),
    m.source.class.load(),
    m.source.testClasses.load(),
    m.lockResponse.load(),
    m.activationResult.load(),
    m.checkRuns.load(),
    m.aunit.load(),
    m.navigationTarget.load(),
    m.usages.load(),
    m.usageReferences.scope.load(),
    m.usageReferences.result.load(),
    m.callers.load(),
    m.callees.load(),
    m.tableDefinition.load(),
    m.tableContents.load(),
    m.inactiveObjects.load(),
    m.fugr.group.load(),
    m.fugr.module.load(),
    m.objectStructure.load(),
    m.typeHierarchy.load(),
    m.prettySource.load(),
    m.softwareComponents.load(),
    m.abapgit.objects.load(),
    m.abapgit.export.load(),
    fixtures.ddic.ddl.source.load(),
    fixtures.ddic.dcl.source.load(),
    fixtures.ddic.domains.single.load(),
    fixtures.ddic.dataelements.single.load(),
    fixtures.ddic.structures.single.load(),
    fixtures.oo.classrunResponse.load(),
    fixtures.packages.tmp.load(),
    fixtures.system.users.single.load(),
    fixtures.system.users.search.load(),
    fixtures.oo.class.load(),
    fixtures.oo.interface.load(),
    fixtures.programs.program.load(),
    fixtures.programs.include.load(),
    fixtures.functions.functionGroup.load(),
    fixtures.aunit.coverageMeasurements.load(),
    fixtures.aunit.coverageStatements.load(),
    fixtures.system.security.pseList.load(),
    fixtures.system.security.certList.load(),
    fixtures.system.security.cert.load(),
    fixtures.gcts.repositories.load(),
    fixtures.gcts.repository.load(),
    fixtures.gcts.createResponse.load(),
    fixtures.gcts.branches.load(),
    fixtures.gcts.createBranch.load(),
    fixtures.gcts.log.load(),
    fixtures.gcts.pull.load(),
    fixtures.gcts.objects.load(),
    fixtures.gcts.config.load(),
    fixtures.gcts.commitResponse.load(),
    fixtures.bo.bdef.single.load(),
    fixtures.bo.bdef.source.load(),
    fixtures.enhancements.enhoxhh.single.load(),
    fixtures.enhancements.enhoxhh.source.load(),
    fixtures.enhancements.enhoxhb.single.load(),
    fixtures.vit.wb.sxsdxdSingle.load(),
    fixtures.vit.wb.sxcixiSingle.load(),
    fixtures.vit.wb.sxcixiSingleB.load(),
    fixtures.badi.implementationsSearch.load(),
    fixtures.ddic.srvd.single.load(),
    fixtures.ddic.srvd.source.load(),
    fixtures.businessservices.bindings.single.load(),
    fixtures.ddic.ddlx.single.load(),
    fixtures.ddic.dsfd.single.load(),
    fixtures.ddic.dsfi.source.load(),
    fixtures.ddic.dteb.single.load(),
    fixtures.flp.catalogList.load(),
    fixtures.flp.catalogSingle.load(),
    fixtures.flp.groupList.load(),
    fixtures.flp.tileList.load(),
    fixtures.flp.tileSingle.load(),
  ]);
  return {
    discovery,
    session,
    systeminfo,
    search,
    grep,
    transportList,
    transportSingle,
    transportSingleTask,
    transportTaskResponses: createTransportTaskResponses({
      parentResponse: transportSingle,
      template: transportSingleTask,
    }),
    transportCreate,
    transportTaskCreate,
    taskCreationMode: 'create',
    transportRelease,
    transportFind,
    searchconfigMetadata,
    atcRun,
    atcWorklist,
    sourceClass,
    sourceTestClasses,
    lockResponse,
    activationResult,
    checkRuns,
    aunit,
    navigationTarget,
    usages,
    usageReferencesScope,
    usageReferencesResult,
    callers,
    callees,
    tableDefinition,
    tableContents,
    inactiveObjects,
    fugrGroup,
    fugrModule,
    objectStructure,
    typeHierarchy,
    prettySource,
    softwareComponents,
    abapgitObjects,
    abapgitExport,
    ddlSource,
    dclSource,
    domainSingle,
    dataElementSingle,
    structureSingle,
    classrunResponse,
    packageMetadata,
    usersSingle,
    usersSearch,
    classMetadata,
    interfaceMetadata,
    programMetadata,
    includeMetadata,
    functionGroupMetadata,
    coverageMeasurements,
    coverageStatements,
    strustPseList,
    strustCertList,
    strustCert,
    gctsRepositories,
    gctsRepository,
    gctsCreateResponse,
    gctsBranches,
    gctsCreateBranch,
    gctsLog,
    gctsPull,
    gctsObjects,
    gctsConfig,
    gctsCommitResponse,
    bdefSingle,
    bdefSource,
    badiSingle,
    badiSource,
    badiInfoSingle,
    vitWbSxsdxdSingle,
    vitWbSxcixiSingle,
    vitWbSxcixiSingleB,
    badiImplementationsSearch,
    srvdSingle,
    srvdSource,
    srvbSingle,
    ddlxSingle,
    dsfdSingle,
    dsfiSource,
    dtebSingle,
    flpCatalogList,
    flpCatalogSingle,
    flpGroupList,
    flpTileList,
    flpTileSingle,
  };
}

function extractObjectUri(url: string): string {
  // strip query string; caller supplies the full pathname+query
  return url.split('?')[0];
}

function matchCoverageStatements(
  method: string,
  pathname: string,
  requestBody: string,
  f: LoadedFixtures,
): RouteResult | undefined {
  if (
    method !== 'POST' ||
    !/^\/sap\/bc\/adt\/runtime\/traces\/coverage\/results\/[^/]+\/statements/.test(
      pathname,
    )
  ) {
    return;
  }
  if (
    !requestBody.includes('<cov:statementsBulkRequest') ||
    !/<statementsRequest\b[^>]*\bget=(["'])[^"']+\1/.test(requestBody)
  ) {
    return {
      status: 400,
      body: 'Expected cov:statementsBulkRequest',
      contentType: 'text/plain',
    };
  }
  return {
    status: 200,
    body: f.coverageStatements,
    contentType: 'application/xml+scov',
  };
}

function matchCoverageMeasurements(
  method: string,
  pathname: string,
  requestBody: string,
  f: LoadedFixtures,
): RouteResult | undefined {
  if (
    method !== 'POST' ||
    !/^\/sap\/bc\/adt\/runtime\/traces\/coverage\/measurements\/[^/]+/.test(
      pathname,
    )
  ) {
    return;
  }
  if (
    !requestBody.includes('<cov:query') ||
    !/<adtcore:objectReference\b[^>]*\badtcore:uri=(["'])[^"']+\1/.test(
      requestBody,
    )
  ) {
    return {
      status: 400,
      body: 'Expected cov:query',
      contentType: 'text/plain',
    };
  }
  return {
    status: 200,
    body: f.coverageMeasurements,
    contentType: 'application/xml+scov',
  };
}

function matchCoverageRoute(
  method: string,
  pathname: string,
  requestBody: string,
  f: LoadedFixtures,
): RouteResult | undefined {
  return (
    matchCoverageStatements(method, pathname, requestBody, f) ??
    matchCoverageMeasurements(method, pathname, requestBody, f)
  );
}

/**
 * Match a request method + url to a mock response.
 * Returns `undefined` if no route handles the request.
 */
export function matchRoute(
  method: string,
  url: string,
  f: LoadedFixtures,
  locks: LockRegistry,
  _sessionId?: string,
  requestBody = '',
): RouteResult | undefined {
  const m = method.toUpperCase();
  const pathname = url.split('?')[0];
  const coverageRoute = matchCoverageRoute(m, pathname, requestBody, f);
  if (coverageRoute) return coverageRoute;

  // ── ADT security session endpoints (strict-protocol aware) ─────────────
  // When called with x-sap-security-session: create, return an atom feed
  // containing the session link href. Otherwise fall through to the generic
  // JSON session handler below (used by system_info).
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/core/http/sessions/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // Discovery
  if (m === 'GET' && url.startsWith('/sap/bc/adt/discovery')) {
    return {
      status: 200,
      body: f.discovery,
      contentType: 'application/atomsvc+xml',
    };
  }

  // System info
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/core/http/systeminformation')
  ) {
    return { status: 200, body: f.systeminfo, contentType: 'application/json' };
  }

  // Grep / content search (must come before general search)
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/search') &&
    url.includes('userannotation=userwhere')
  ) {
    return { status: 200, body: f.grep, contentType: 'application/json' };
  }

  // Quick search
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/search')
  ) {
    const query =
      new URL(url, 'http://mock').searchParams.get('query')?.toUpperCase() ??
      '';
    if (
      query.includes('MOCK_CTS') ||
      query.includes('CTS_REQUEST') ||
      query.includes('REQUEST_CHECK')
    ) {
      return {
        status: 200,
        body: f.badiImplementationsSearch,
        contentType: 'application/json',
      };
    }
    return { status: 200, body: f.search, contentType: 'application/json' };
  }

  // Usages / references (legacy GET — kept for backwards compatibility)
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/usages')
  ) {
    return { status: 200, body: f.usages, contentType: 'application/json' };
  }

  // Where-used 2-step POST flow
  // Step 1: scope
  if (
    m === 'POST' &&
    url.startsWith(
      '/sap/bc/adt/repository/informationsystem/usageReferences/scope',
    )
  ) {
    return {
      status: 200,
      body: f.usageReferencesScope,
      contentType:
        'application/vnd.sap.adt.repository.usagereferences.scope.response.v1+xml',
    };
  }
  // Step 2: search
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/usageReferences')
  ) {
    return {
      status: 200,
      body: f.usageReferencesResult,
      contentType:
        'application/vnd.sap.adt.repository.usagereferences.result.v1+xml',
    };
  }

  // Callers / callees
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/callers')
  ) {
    return { status: 200, body: f.callers, contentType: 'application/json' };
  }
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/callees')
  ) {
    return { status: 200, body: f.callees, contentType: 'application/json' };
  }

  // Navigation target
  if (m === 'GET' && url.startsWith('/sap/bc/adt/navigation/target')) {
    return {
      status: 200,
      body: f.navigationTarget,
      contentType: 'application/json',
    };
  }

  // Data preview
  if (m === 'POST' && url.startsWith('/sap/bc/adt/datapreview/freestyle')) {
    return {
      status: 200,
      body: f.tableContents,
      contentType: 'application/json',
    };
  }

  // DDIC tables
  if (m === 'GET' && url.startsWith('/sap/bc/adt/ddic/tables/')) {
    return {
      status: 200,
      body: f.tableDefinition,
      contentType: 'application/json',
    };
  }

  // ── DDIC Domains ───────────────────────────────────────────────
  if (m === 'GET' && /^\/sap\/bc\/adt\/ddic\/domains\/[^/?]+/.test(pathname)) {
    return {
      status: 200,
      body: f.domainSingle,
      contentType: 'application/vnd.sap.adt.domains.v2+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/domains') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/domains/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/domains/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── DDIC Data Elements ─────────────────────────────────────────
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/dataelements\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.dataElementSingle,
      contentType: 'application/vnd.sap.adt.dataelements.v2+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/dataelements') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/dataelements/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/dataelements/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── DDIC Structures ────────────────────────────────────────────
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/structures\/[^/?]+\/source\/main/.test(pathname)
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/structures\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.structureSingle,
      contentType: 'application/xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/structures') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/structures/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/structures/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  // DDIC tables POST/DELETE/PUT
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/tables') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/tables/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ── CDS DDL Sources ────────────────────────────────────────────
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/ddl\/sources\/[^/?]+\/source\/main/.test(pathname)
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/ddl\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.ddlSource,
      contentType: 'application/vnd.sap.adt.ddl.source.v2+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/ddl/sources') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/ddl/sources/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/ddl/sources/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── CDS DCL Sources (endpoint is /acm/dcl/sources) ─────────────
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/acm\/dcl\/sources\/[^/?]+\/source\/main/.test(pathname)
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/acm\/dcl\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.dclSource,
      contentType: 'application/vnd.sap.adt.acm.dcl.source.v1+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/acm/dcl/sources') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/acm/dcl/sources/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/acm/dcl/sources/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── BDEF (RAP behavior definition) ─────────────────────────────
  // Endpoint: /sap/bc/adt/bo/behaviordefinitions/{name}
  //           /sap/bc/adt/bo/behaviordefinitions/{name}/source/main
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/bo\/behaviordefinitions\/[^/?]+\/source\/main/.test(
      pathname,
    )
  ) {
    return { status: 200, body: f.bdefSource, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/bo\/behaviordefinitions\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.bdefSingle,
      contentType: 'application/vnd.sap.adt.blues.v1+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/bo/behaviordefinitions') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/bo/behaviordefinitions/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/bo/behaviordefinitions/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ── BAdI / Enhancement Implementation metadata (ENHO/XHB) ──────
  // Endpoint: /sap/bc/adt/enhancements/enhoxhb/{name}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/enhancements\/enhoxhb\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.badiInfoSingle,
      contentType: 'application/vnd.sap.adt.enh.enhoxhb.v4+xml',
    };
  }

  // ── BAdI / Enhancement Implementation (ENHO/XHH) ───────────────
  // Endpoint: /sap/bc/adt/enhancements/enhoxhh/{name}
  //           /sap/bc/adt/enhancements/enhoxhh/{name}/source/main
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/enhancements\/enhoxhh\/[^/?]+\/source\/main/.test(
      pathname,
    )
  ) {
    return { status: 200, body: f.badiSource, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/enhancements\/enhoxhh\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.badiSingle,
      contentType: 'application/vnd.sap.adt.enhancements.enhoxhh.v1+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/enhancements/enhoxhh') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/enhancements/enhoxhh/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/enhancements/enhoxhh/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ── vit/wb Basic Object Properties (classic BAdI SXSD/SXCI) ─────
  // Endpoint: /sap/bc/adt/vit/wb/object_type/{type}/object_name/{name}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/vit\/wb\/object_type\/sxsdxd\/object_name\//.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.vitWbSxsdxdSingle,
      contentType: 'application/vnd.sap.adt.basic.object.properties+xml',
    };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/vit\/wb\/object_type\/sxcixi\/object_name\//.test(
      pathname,
    )
  ) {
    const body = pathname.includes('ze_mock_classic_badi_impl_b')
      ? f.vitWbSxcixiSingleB
      : f.vitWbSxcixiSingle;
    return {
      status: 200,
      body,
      contentType: 'application/vnd.sap.adt.basic.object.properties+xml',
    };
  }

  // ── SRVD (RAP service definition) ──────────────────────────────
  // Endpoint: /sap/bc/adt/ddic/srvd/sources/{name}
  //           /sap/bc/adt/ddic/srvd/sources/{name}/source/main
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/srvd\/sources\/[^/?]+\/source\/main/.test(pathname)
  ) {
    return { status: 200, body: f.srvdSource, contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/srvd\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.srvdSingle,
      contentType: 'application/vnd.sap.adt.ddic.srvd.v1+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/ddic/srvd/sources') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/srvd/sources/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/srvd/sources/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ── SRVB (RAP service binding) ─────────────────────────────────
  // Endpoint: /sap/bc/adt/businessservices/bindings/{name}
  //           /sap/bc/adt/businessservices/bindings/{name}/publishedstates
  if (
    m === 'POST' &&
    /^\/sap\/bc\/adt\/businessservices\/bindings\/[^/?]+\/publishedstates/.test(
      pathname,
    )
  ) {
    // publish
    return {
      status: 200,
      body: '{"status":"published"}',
      contentType: 'application/json',
    };
  }
  if (
    m === 'DELETE' &&
    /^\/sap\/bc\/adt\/businessservices\/bindings\/[^/?]+\/publishedstates/.test(
      pathname,
    )
  ) {
    // unpublish
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/businessservices\/bindings\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.srvbSingle,
      contentType:
        'application/vnd.sap.adt.businessservices.servicebinding.v2+xml',
    };
  }
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/businessservices/bindings') &&
    !url.includes('_action=')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/businessservices/bindings/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (
    m === 'DELETE' &&
    url.startsWith('/sap/bc/adt/businessservices/bindings/')
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // ── CDS/RAP source types (DDLX, DSFD, DTEB) ───────────────────
  // These share the blueSource / ddlxSource metadata envelope and a
  // text/plain source/main endpoint. The generic /source/main catch-all
  // below (line ~1610) already serves the source text; these blocks add
  // the metadata GET so that AdkCdsSourceObject.load() succeeds.
  //
  // Endpoint: /sap/bc/adt/ddic/ddlx/sources/{name}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/ddlx\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.ddlxSingle,
      contentType: 'application/vnd.sap.adt.ddlxSource+xml',
    };
  }
  // Endpoint: /sap/bc/adt/ddic/dsfd/sources/{name}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/dsfd\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.dsfdSingle,
      contentType: 'application/vnd.sap.adt.blues.v1+xml',
    };
  }
  // Endpoint: /sap/bc/adt/ddic/dteb/sources/{name}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/dteb\/sources\/[^/?]+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.dtebSingle,
      contentType: 'application/vnd.sap.adt.blues.v1+xml',
    };
  }

  // ── DSFI (scalar function implementation) ─────────────────────
  // Endpoint: /sap/bc/adt/ddic/dsfi/{name}           — metadata (blueSource XML)
  //           /sap/bc/adt/ddic/dsfi/{name}/source/main — JSON definition
  // The source/main endpoint returns JSON, so it must be matched before the
  // generic text/plain /source/main catch-all.
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/ddic\/dsfi\/[^/?]+\/source\/main/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.dsfiSource,
      contentType: 'application/json',
    };
  }
  if (m === 'GET' && /^\/sap\/bc\/adt\/ddic\/dsfi\/[^/?]+/.test(pathname)) {
    return {
      status: 200,
      body: f.dsfdSingle, // reuse blueSource metadata envelope
      contentType: 'application/vnd.sap.adt.blues.v1+xml',
    };
  }

  // ── DESD (external schema definition) ─────────────────────────
  // Endpoint: GET /sap/bc/adt/ddic/desd/{name} — returns XML directly
  if (m === 'GET' && /^\/sap\/bc\/adt\/ddic\/desd\/[^/?]+/.test(pathname)) {
    return {
      status: 200,
      body: f.dsfiSource, // DESD load() only reads text, content is not parsed
      contentType: 'application/xml',
    };
  }

  // ── Source-only CDS types (DRAS, DRTY, DTDC, DTIX, DTSC) ──────
  // These objects have no metadata endpoint; load() only calls
  // getSource() which hits /sap/bc/adt/ddic/<type>/sources/<name>/source/main.
  // The generic /source/main catch-all below already serves text/plain
  // for any GET .../source/main request, so no dedicated routes are needed.

  // ── OO Classrun (execute console class) ────────────────────────
  if (m === 'POST' && url.startsWith('/sap/bc/adt/oo/classrun/')) {
    return {
      status: 200,
      body: f.classrunResponse,
      contentType: 'text/plain',
    };
  }

  // CTS search – GET /sap/bc/adt/cts/transports?_action=FIND
  if (
    m === 'GET' &&
    pathname === '/sap/bc/adt/cts/transports' &&
    url.includes('_action=FIND')
  ) {
    return {
      status: 200,
      body: f.transportFind,
      contentType: 'application/xml',
    };
  }

  // CTS search configuration metadata (used by ADK to detect current user).
  // Must come BEFORE the generic `/transportrequests/{id}` GET matcher,
  // otherwise `searchconfiguration` is captured as a transport id.
  if (
    m === 'GET' &&
    pathname.startsWith(
      '/sap/bc/adt/cts/transportrequests/searchconfiguration/metadata',
    )
  ) {
    return {
      status: 200,
      body: f.searchconfigMetadata,
      contentType: 'application/vnd.sap.adt.configuration.metadata.v1+xml',
    };
  }

  // CTS create
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/cts/transportrequests') &&
    !/\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.transportCreate,
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // CTS release — SAP starts a release job without a request body. Keep the
  // fixture stateful so the lifecycle service's read-back can verify status R.
  if (
    m === 'POST' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/([^/]+)\/newreleasejobs$/.test(
      pathname,
    )
  ) {
    const requested = decodeURIComponent(
      /\/sap\/bc\/adt\/cts\/transportrequests\/([^/]+)\/newreleasejobs$/.exec(
        pathname,
      )?.[1] ?? '',
    );
    const requestNumber = extractRequestAttribute(f.transportSingle, 'number');
    if (requested === requestNumber) {
      f.transportSingle = replaceRequestAttribute(f.transportSingle, {
        name: 'status',
        value: 'R',
      });
      f.transportSingle = replaceRequestAttribute(f.transportSingle, {
        name: 'status_text',
        value: 'Released',
      });
      const taskNumbers = [...f.transportTaskResponses.keys()];
      for (const taskNumber of taskNumbers) {
        f.transportSingle = replaceTaskAttribute(f.transportSingle, {
          taskNumber,
          name: 'status',
          value: 'R',
        });
        f.transportSingle = replaceTaskAttribute(f.transportSingle, {
          taskNumber,
          name: 'status_text',
          value: 'Released',
        });
      }
      for (const [taskNumber, response] of [...f.transportTaskResponses]) {
        let updated = replaceRequestAttribute(response, {
          name: 'status',
          value: 'R',
        });
        updated = replaceRequestAttribute(updated, {
          name: 'status_text',
          value: 'Released',
        });
        updated = replaceTaskAttribute(updated, {
          taskNumber,
          name: 'status',
          value: 'R',
        });
        updated = replaceTaskAttribute(updated, {
          taskNumber,
          name: 'status_text',
          value: 'Released',
        });
        f.transportTaskResponses.set(taskNumber, updated);
      }
    } else if (f.transportTaskResponses.has(requested)) {
      f.transportSingle = replaceTaskAttribute(
        replaceTaskAttribute(f.transportSingle, {
          taskNumber: requested,
          name: 'status',
          value: 'R',
        }),
        {
          taskNumber: requested,
          name: 'status_text',
          value: 'Released',
        },
      );
      const response = f.transportTaskResponses.get(requested)!;
      f.transportTaskResponses.set(
        requested,
        replaceTaskAttribute(
          replaceTaskAttribute(response, {
            taskNumber: requested,
            name: 'status',
            value: 'R',
          }),
          {
            taskNumber: requested,
            name: 'status_text',
            value: 'Released',
          },
        ),
      );
    } else {
      return { status: 404, body: '', contentType: 'text/plain' };
    }
    return {
      status: 200,
      body: f.transportRelease,
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // CTS new task — POST the hypermedia /{request}/tasks relation, then expose
  // the new modifiable task through the parent request read-back.
  const taskCreateMatch =
    /^\/sap\/bc\/adt\/cts\/transportrequests\/([^/]+)\/tasks$/.exec(pathname);
  if (m === 'POST' && taskCreateMatch) {
    const parent = decodeURIComponent(taskCreateMatch[1]);
    const requestNumber = extractRequestAttribute(f.transportSingle, 'number');
    const requestStatus = extractRequestAttribute(f.transportSingle, 'status');
    if (parent !== requestNumber || requestStatus !== 'D') {
      return { status: 409, body: '', contentType: 'text/plain' };
    }

    const owner = extractTargetUser(requestBody);
    if (!owner) {
      return { status: 400, body: '', contentType: 'text/plain' };
    }
    const task = nextTransportTaskNumber(f.transportSingle, parent);
    if (f.taskCreationMode === 'create') {
      f.transportSingle = appendTransportTask(f.transportSingle, {
        parent,
        number: task,
        owner,
      });
      f.transportTaskResponses.set(
        task,
        createDirectTaskResponse({
          template: f.transportSingleTask,
          parentResponse: f.transportSingle,
          taskNumber: task,
        }),
      );
    }
    return {
      status: 200,
      body: f.transportTaskCreate
        .replaceAll('DEVK900004', task)
        .replaceAll('NEWOWNER', owner),
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // Legacy CTS action — POST on a transport request.
  // (lock/unlock actions are handled further below by the generic _action handler)
  if (
    m === 'POST' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(pathname) &&
    !url.includes('_action=')
  ) {
    return {
      status: 200,
      body: f.transportRelease,
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // CTS list
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/cts/transportrequests') &&
    !/\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.transportList,
      contentType: 'application/json',
    };
  }

  // CTS get request or task. SAP returns a distinct shape for child tasks.
  const transportGetMatch =
    /^\/sap\/bc\/adt\/cts\/transportrequests\/([^/]+)\/?$/.exec(pathname);
  if (m === 'GET' && transportGetMatch) {
    const requested = decodeURIComponent(transportGetMatch[1]);
    const requestNumber = extractRequestAttribute(f.transportSingle, 'number');
    const createdRequestNumber = extractRequestAttribute(
      f.transportCreate,
      'number',
    );
    const body =
      requested === requestNumber
        ? f.transportSingle
        : requested === createdRequestNumber
          ? f.transportCreate
          : f.transportTaskResponses.get(requested);
    if (!body) return { status: 404, body: '', contentType: 'text/plain' };
    return {
      status: 200,
      body,
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // CTS delete
  if (
    m === 'DELETE' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(url)
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // CTS update (PUT on a transport request)
  if (
    m === 'PUT' &&
    /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(pathname)
  ) {
    const targetUser = extractTargetUser(requestBody);
    const requested = pathname.split('/').filter(Boolean).at(-1) ?? '';
    if (targetUser) {
      const requestNumber = extractRequestAttribute(
        f.transportSingle,
        'number',
      );
      if (requested && f.transportTaskResponses.has(requested)) {
        f.transportSingle = replaceTaskAttribute(f.transportSingle, {
          taskNumber: requested,
          name: 'owner',
          value: targetUser,
        });
        f.transportTaskResponses.set(
          requested,
          replaceTaskAttribute(f.transportTaskResponses.get(requested)!, {
            taskNumber: requested,
            name: 'owner',
            value: targetUser,
          }),
        );
      } else if (requested === requestNumber) {
        f.transportSingle = replaceRequestAttribute(f.transportSingle, {
          name: 'owner',
          value: targetUser,
        });
        const taskNumbers = [...f.transportTaskResponses.keys()];
        for (const taskNumber of taskNumbers) {
          f.transportSingle = replaceTaskAttribute(f.transportSingle, {
            taskNumber,
            name: 'owner',
            value: targetUser,
          });
        }
        for (const [taskNumber, response] of [...f.transportTaskResponses]) {
          let updated = replaceRequestAttribute(response, {
            name: 'owner',
            value: targetUser,
          });
          updated = replaceTaskAttribute(updated, {
            taskNumber,
            name: 'owner',
            value: targetUser,
          });
          f.transportTaskResponses.set(taskNumber, updated);
        }
      } else {
        return { status: 404, body: '', contentType: 'text/plain' };
      }
    }
    return {
      status: 200,
      body: f.transportTaskResponses.get(requested) ?? f.transportSingle,
      contentType: 'application/vnd.sap.adt.transportorganizer.v1+xml',
    };
  }

  // Package metadata – GET /sap/bc/adt/packages/{name}
  if (m === 'GET' && /^\/sap\/bc\/adt\/packages\/[^/]+$/.test(pathname)) {
    return {
      status: 200,
      body: f.packageMetadata,
      contentType: 'application/vnd.sap.adt.packages.v2+xml',
    };
  }

  // ── STRUST / system security ───────────────────────────────────
  // Certificate list under a PSE:
  //   GET  /sap/bc/adt/system/security/pses/{ctx}/{applic}/certificates
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/system\/security\/pses\/[^/]+\/[^/]+\/certificates$/.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.strustCertList,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // Single certificate — GET returns PEM text; DELETE removes it.
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/system\/security\/pses\/[^/]+\/[^/]+\/certificates\/[^/]+$/.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.strustCert,
      contentType: 'application/x-pem-file',
    };
  }
  if (
    m === 'DELETE' &&
    /^\/sap\/bc\/adt\/system\/security\/pses\/[^/]+\/[^/]+\/certificates\/[^/]+$/.test(
      pathname,
    )
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // Upload certificate — POST PEM body to /.../certificates
  if (
    m === 'POST' &&
    /^\/sap\/bc\/adt\/system\/security\/pses\/[^/]+\/[^/]+\/certificates$/.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.strustCertList,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // Single PSE metadata: GET /sap/bc/adt/system/security/pses/{ctx}/{applic}
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/system\/security\/pses\/[^/]+\/[^/]+$/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.strustCertList,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // PSE list: GET /sap/bc/adt/system/security/pses
  if (m === 'GET' && pathname === '/sap/bc/adt/system/security/pses') {
    return {
      status: 200,
      body: f.strustPseList,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // System users – exact lookup: GET /sap/bc/adt/system/users/{username}
  if (m === 'GET' && /^\/sap\/bc\/adt\/system\/users\/[^/]+$/.test(pathname)) {
    return {
      status: 200,
      body: f.usersSingle,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // System users – wildcard search: GET /sap/bc/adt/system/users?querystring=…
  if (m === 'GET' && pathname === '/sap/bc/adt/system/users') {
    return {
      status: 200,
      body: f.usersSearch,
      contentType: 'application/atom+xml;type=feed',
    };
  }

  // Session info (catch-all for /core/http/sessions that didn't match above)
  if (m === 'GET' && url.startsWith('/sap/bc/adt/core/http/sessions')) {
    return { status: 200, body: f.session, contentType: 'application/json' };
  }

  // ATC worklist creation must precede a run in the production protocol.
  if (m === 'POST' && pathname === '/sap/bc/adt/atc/worklists') {
    return { status: 200, body: f.atcRun, contentType: 'application/json' };
  }

  // ATC create run
  if (m === 'POST' && url.startsWith('/sap/bc/adt/atc/runs')) {
    return { status: 200, body: f.atcRun, contentType: 'application/json' };
  }

  // ATC worklist
  if (m === 'GET' && url.startsWith('/sap/bc/adt/atc/worklists')) {
    return {
      status: 200,
      body: f.atcWorklist,
      contentType: 'application/json',
    };
  }

  // Test classes include
  if (m === 'GET' && url.includes('/includes/testclasses')) {
    return {
      status: 200,
      body: f.sourceTestClasses,
      contentType: 'text/plain',
    };
  }

  // Source read — GET .../source/main
  if (
    m === 'GET' &&
    url.includes('/source/main') &&
    !url.includes('informationsystem')
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }

  // Lock — POST ?_action=LOCK
  if (m === 'POST' && url.includes('_action=LOCK')) {
    const objectUri = extractObjectUri(url);
    if (locks.get(objectUri)) {
      return {
        status: 409,
        body: `Object ${objectUri} is already locked in request MOCKK900001`,
        contentType: 'text/plain',
      };
    }
    const entry = locks.lock(objectUri);
    // Replace the handle placeholder in the fixture XML with the real handle
    const body = f.lockResponse.replace(
      /<LOCK_HANDLE>[^<]*<\/LOCK_HANDLE>/,
      `<LOCK_HANDLE>${entry.handle}</LOCK_HANDLE>`,
    );
    return { status: 200, body, contentType: 'application/xml' };
  }

  // Unlock — POST ?_action=UNLOCK
  if (m === 'POST' && url.includes('_action=UNLOCK')) {
    const objectUri = extractObjectUri(url);
    const handleMatch = /[?&]lockHandle=([^&]+)/.exec(url);
    const handle = handleMatch ? decodeURIComponent(handleMatch[1]) : undefined;
    const ok = locks.unlock(objectUri, handle);
    if (!ok) {
      return {
        status: 400,
        body: 'Lock handle mismatch',
        contentType: 'text/plain',
      };
    }
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Source write — PUT .../source/main
  if (m === 'PUT' && url.includes('/source/main')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── Object-root GET (CLAS / INTF / PROG / FUGR) ──────────────
  // Serve the object metadata XML. Must come AFTER the source/main GET
  // branch (so that `/source/main` is not swallowed) and after all
  // `/objectstructure`, `/includes/...`, `/fmodules/...` specialisations.
  if (m === 'GET' && /^\/sap\/bc\/adt\/oo\/classes\/[^/?]+$/.test(pathname)) {
    return {
      status: 200,
      body: f.classMetadata,
      contentType: 'application/vnd.sap.adt.oo.classes.v4+xml',
    };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/oo\/interfaces\/[^/?]+$/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.interfaceMetadata,
      contentType: 'application/vnd.sap.adt.oo.interfaces.v3+xml',
    };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/programs\/includes\/[^/?]+$/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.includeMetadata,
      contentType: 'application/vnd.sap.adt.programs.includes.v2+xml',
    };
  }
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/programs\/programs\/[^/?]+$/.test(pathname)
  ) {
    return {
      status: 200,
      body: f.programMetadata,
      contentType: 'application/vnd.sap.adt.programs.programs.v3+xml',
    };
  }
  // Metadata update — PUT to object roots
  if (
    m === 'PUT' &&
    (url.startsWith('/sap/bc/adt/programs/programs/') ||
      url.startsWith('/sap/bc/adt/programs/includes/') ||
      url.startsWith('/sap/bc/adt/oo/classes/') ||
      url.startsWith('/sap/bc/adt/oo/interfaces/') ||
      url.startsWith('/sap/bc/adt/functions/groups/') ||
      url.startsWith('/sap/bc/adt/packages/'))
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Inactive objects
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/activation/inactive_objects')
  ) {
    return {
      status: 200,
      body: f.inactiveObjects,
      contentType: 'application/json',
    };
  }

  // Activation
  if (m === 'POST' && url.startsWith('/sap/bc/adt/activation')) {
    return {
      status: 200,
      body: f.activationResult,
      contentType: 'application/xml',
    };
  }

  // Object create — POST to object-type paths
  if (
    m === 'POST' &&
    (url.startsWith('/sap/bc/adt/programs/programs') ||
      url.startsWith('/sap/bc/adt/programs/includes') ||
      url.startsWith('/sap/bc/adt/oo/classes') ||
      url.startsWith('/sap/bc/adt/oo/interfaces') ||
      url.startsWith('/sap/bc/adt/functions/groups') ||
      url.startsWith('/sap/bc/adt/packages'))
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // Object delete
  if (
    m === 'DELETE' &&
    (url.startsWith('/sap/bc/adt/programs/programs/') ||
      url.startsWith('/sap/bc/adt/programs/includes/') ||
      url.startsWith('/sap/bc/adt/oo/classes/') ||
      url.startsWith('/sap/bc/adt/oo/interfaces/') ||
      url.startsWith('/sap/bc/adt/functions/groups/') ||
      url.startsWith('/sap/bc/adt/packages/'))
  ) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }

  // Syntax check
  if (m === 'POST' && url.startsWith('/sap/bc/adt/checkruns')) {
    return {
      status: 200,
      body: f.checkRuns,
      contentType: 'application/xml',
    };
  }

  // AUnit test run
  if (m === 'POST' && url.startsWith('/sap/bc/adt/abapunit/testruns')) {
    return { status: 200, body: f.aunit, contentType: 'application/json' };
  }

  // Function module source
  if (
    m === 'GET' &&
    url.includes('/fmodules/') &&
    url.includes('/source/main')
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }

  // Function module metadata
  if (m === 'GET' && url.includes('/fmodules/')) {
    return {
      status: 200,
      body: f.fugrModule,
      contentType: 'application/json',
    };
  }

  // Function group source
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/functions/groups/') &&
    url.includes('/source/main')
  ) {
    return { status: 200, body: f.sourceClass, contentType: 'text/plain' };
  }

  // Function group metadata
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/functions/groups/') &&
    !url.includes('/objectstructure') &&
    !url.includes('/source/') &&
    !url.includes('/fmodules/')
  ) {
    return {
      status: 200,
      body: f.fugrGroup,
      contentType: 'application/json',
    };
  }

  // Object structure
  if (m === 'GET' && url.includes('/objectstructure')) {
    return {
      status: 200,
      body: f.objectStructure,
      contentType: 'application/json',
    };
  }

  // Type hierarchy
  if (m === 'GET' && url.startsWith('/sap/bc/adt/oo/typeinfo')) {
    return {
      status: 200,
      body: f.typeHierarchy,
      contentType: 'application/json',
    };
  }

  // Pretty printer
  if (
    m === 'POST' &&
    url.startsWith('/sap/bc/adt/prettyprinter/prettifySource')
  ) {
    return { status: 200, body: f.prettySource, contentType: 'text/plain' };
  }

  // Software components
  if (m === 'GET' && url.startsWith('/sap/bc/adt/system/softwarecomponents')) {
    return {
      status: 200,
      body: f.softwareComponents,
      contentType: 'application/json',
    };
  }

  // Service binding publish
  if (
    (m === 'POST' || m === 'DELETE') &&
    url.includes('/sap/bc/adt/businessservices/bindings/') &&
    url.includes('/publishedstates')
  ) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // abapGit objects
  if (m === 'GET' && url.startsWith('/sap/bc/adt/abapgit/objects')) {
    return {
      status: 200,
      body: f.abapgitObjects,
      contentType: 'application/json',
    };
  }

  // ── gCTS (/sap/bc/cts_abapvcs/) — E07 ──────────────────────────────
  // Order matters: more-specific paths first.
  if (url.startsWith('/sap/bc/cts_abapvcs/repository')) {
    const gctsPath = pathname.replace(
      /^\/sap\/bc\/cts_abapvcs\/repository/,
      '',
    );
    const json = (body: string) =>
      ({ status: 200, body, contentType: 'application/json' }) as RouteResult;

    // /repository (list + create)
    if (gctsPath === '' || gctsPath === '/') {
      if (m === 'GET') return json(f.gctsRepositories);
      if (m === 'POST')
        return {
          status: 201,
          body: f.gctsCreateResponse,
          contentType: 'application/json',
        };
    }

    // /repository/<rid>/...
    const subMatch = /^\/([^/]+)(\/.*)?$/.exec(gctsPath);
    if (subMatch) {
      const sub = subMatch[2] ?? '';

      // Branches: switch (GET /<current>/switch?branch=X)
      if (/^\/branches\/[^/]+\/switch$/.test(sub) && m === 'GET') {
        return json('{"result":"switched"}');
      }
      // Branches: delete / list / create
      if (sub === '/branches') {
        if (m === 'GET') return json(f.gctsBranches);
        if (m === 'POST') return json(f.gctsCreateBranch);
      }
      if (/^\/branches\/[^/]+$/.test(sub) && m === 'DELETE') {
        return json('{}');
      }

      // Config: single key get/delete
      if (/^\/config\/[^/]+$/.test(sub)) {
        if (m === 'GET') return json(f.gctsConfig);
        if (m === 'DELETE') return json('{}');
      }
      if (sub === '/config' && m === 'POST') {
        return json('{"result":{"key":"VCS_TARGET_DIR","value":"src/"}}');
      }

      if (sub === '/clone' && m === 'POST') return json(f.gctsRepository);
      if (sub === '/pullByCommit' && m === 'GET') return json(f.gctsPull);
      if (sub === '/push' && m === 'GET') return json('{}');
      if (sub === '/getCommit' && m === 'GET') return json(f.gctsLog);
      if (sub === '/getObjects' && m === 'GET') return json(f.gctsObjects);
      if (sub === '/commit' && m === 'POST') return json(f.gctsCommitResponse);

      // /<rid> — GET (fetch) / POST (setItem) / DELETE
      if (sub === '') {
        if (m === 'GET') return json(f.gctsRepository);
        if (m === 'POST') return json('{}');
        if (m === 'DELETE') return json('{}');
      }
    }
  }

  // ── FLP — /sap/opu/odata/UI2/PAGE_BUILDER_PERS/ — E14 ──────────────────
  // Order matters: specific entity paths first, then entity-set lists.
  if (url.startsWith('/sap/opu/odata/UI2/PAGE_BUILDER_PERS/')) {
    const json = (body: string) =>
      ({ status: 200, body, contentType: 'application/json' }) as RouteResult;

    // Strip query string so we can use simple endsWith/includes checks
    // (avoids backtracking-prone regexes).
    const path = url.split('?', 1)[0];
    // An entity key like ('some-id') has no '/' inside and is at end.
    const hasEntityKey = (segment: string): boolean => {
      const idx = path.indexOf(`/${segment}('`);
      if (idx === -1) return false;
      const afterOpen = idx + segment.length + 3; // after "/<segment>('"
      const closeIdx = path.indexOf("')", afterOpen);
      if (closeIdx === -1) return false;
      // Nothing (except maybe a trailing sub-path) should follow — here we
      // require the key to terminate the path for single-entity endpoints.
      return closeIdx + 2 === path.length;
    };
    const hasEntityKeySubpath = (segment: string, sub: string): boolean => {
      const idx = path.indexOf(`/${segment}('`);
      if (idx === -1) return false;
      const afterOpen = idx + segment.length + 3;
      const closeIdx = path.indexOf("')", afterOpen);
      if (closeIdx === -1) return false;
      return path.slice(closeIdx + 2) === `/${sub}`;
    };

    // /Chips('<id>') — single tile
    if (m === 'GET' && hasEntityKey('Chips')) {
      return json(f.flpTileSingle);
    }
    // /Catalogs('<id>')/Chips — tiles in a catalog
    if (m === 'GET' && hasEntityKeySubpath('Catalogs', 'Chips')) {
      return json(f.flpTileList);
    }
    // /Catalogs('<id>') — single catalog
    if (m === 'GET' && hasEntityKey('Catalogs')) {
      return json(f.flpCatalogSingle);
    }
    // /Pages('<id>') — single page / group (reuse list fixture's first item)
    if (m === 'GET' && hasEntityKey('Pages')) {
      return json(f.flpGroupList);
    }
    // Entity-set lists
    if (m === 'GET' && path.endsWith('/Catalogs')) {
      return json(f.flpCatalogList);
    }
    if (m === 'GET' && path.endsWith('/Pages')) {
      return json(f.flpGroupList);
    }
    if (m === 'GET' && path.endsWith('/Chips')) {
      return json(f.flpTileList);
    }
  }

  // abapGit export
  if (
    m === 'GET' &&
    url.includes('/sap/bc/adt/abapgit/repos/') &&
    url.includes('/export')
  ) {
    return {
      status: 200,
      body: f.abapgitExport,
      contentType: 'application/json',
    };
  }

  // CSRF token HEAD
  if (m === 'HEAD') {
    return { status: 200, body: '', contentType: 'text/plain' };
  }

  // ── SOAP-RFC (E13) ─────────────────────────────────────────────────────
  // POST /sap/bc/soap/rfc?sap-client=<n> → returns a synthetic
  // STFC_CONNECTION.Response that echoes REQUTEXT=hello (the only
  // fixture we use from mock parity tests).
  if (m === 'POST' && pathname === '/sap/bc/soap/rfc') {
    return {
      status: 200,
      contentType: 'text/xml; charset=utf-8',
      body:
        `<?xml version="1.0" encoding="utf-8"?>` +
        `<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">` +
        `<soap-env:Body>` +
        `<rfc:STFC_CONNECTION.Response xmlns:rfc="urn:sap-com:document:sap:rfc:functions">` +
        `<ECHOTEXT>hello</ECHOTEXT>` +
        `<RESPTEXT>MOCK SAP SYSTEM Sysid: MCK</RESPTEXT>` +
        `</rfc:STFC_CONNECTION.Response>` +
        `</soap-env:Body>` +
        `</soap-env:Envelope>`,
    };
  }

  return undefined;
}
