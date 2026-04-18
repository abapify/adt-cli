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
  transportCreate: string;
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
  // SRVD (RAP service definition)
  srvdSingle: string;
  srvdSource: string;
  // SRVB (RAP service binding)
  srvbSingle: string;
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
    transportCreate,
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
    srvdSingle,
    srvdSource,
    srvbSingle,
  ] = await Promise.all([
    m.discovery.load(),
    m.session.load(),
    m.systeminfo.load(),
    m.search.load(),
    m.grep.load(),
    m.transport.list.load(),
    fixtures.transport.single.load(),
    fixtures.transport.createResponse.load(),
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
    fixtures.ddic.srvd.single.load(),
    fixtures.ddic.srvd.source.load(),
    fixtures.businessservices.bindings.single.load(),
  ]);
  return {
    discovery,
    session,
    systeminfo,
    search,
    grep,
    transportList,
    transportSingle,
    transportCreate,
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
    srvdSingle,
    srvdSource,
    srvbSingle,
  };
}

function extractObjectUri(url: string): string {
  // strip query string; caller supplies the full pathname+query
  return url.split('?')[0];
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
): RouteResult | undefined {
  const m = method.toUpperCase();
  const pathname = url.split('?')[0];

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
    return { status: 200, body: f.search, contentType: 'application/json' };
  }

  // Usages / references
  if (
    m === 'GET' &&
    url.startsWith('/sap/bc/adt/repository/informationsystem/usages')
  ) {
    return { status: 200, body: f.usages, contentType: 'application/json' };
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
  if (m === 'POST' && url.startsWith('/sap/bc/adt/ddic/domains')) {
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
  if (m === 'POST' && url.startsWith('/sap/bc/adt/ddic/dataelements')) {
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
  if (m === 'POST' && url.startsWith('/sap/bc/adt/ddic/structures')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  if (m === 'DELETE' && url.startsWith('/sap/bc/adt/ddic/structures/')) {
    return { status: 204, body: '', contentType: 'text/plain' };
  }
  if (m === 'PUT' && url.startsWith('/sap/bc/adt/ddic/structures/')) {
    return { status: 200, body: '', contentType: 'text/plain' };
  }
  // DDIC tables POST/DELETE/PUT
  if (m === 'POST' && url.startsWith('/sap/bc/adt/ddic/tables')) {
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
  if (m === 'POST' && url.startsWith('/sap/bc/adt/ddic/ddl/sources')) {
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
  if (m === 'POST' && url.startsWith('/sap/bc/adt/acm/dcl/sources')) {
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
        'application/vnd.sap.adt.businessservices.servicebinding.v1+xml',
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

  // CTS release / reassign / action — POST on a transport request
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

  // CTS get single
  if (m === 'GET' && /\/sap\/bc\/adt\/cts\/transportrequests\/\w+/.test(url)) {
    return {
      status: 200,
      body: f.transportSingle,
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
    return {
      status: 200,
      body: f.transportSingle,
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
    const handleMatch = url.match(/[?&]lockHandle=([^&]+)/);
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

  // ABAP Coverage — statements bulk response
  // GET /sap/bc/adt/runtime/traces/coverage/results/{id}/statements
  if (
    m === 'GET' &&
    /^\/sap\/bc\/adt\/runtime\/traces\/coverage\/results\/[^/]+\/statements/.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.coverageStatements,
      contentType: 'application/xml+scov',
    };
  }

  // ABAP Coverage — measurement tree
  // POST /sap/bc/adt/runtime/traces/coverage/measurements/{id}
  if (
    m === 'POST' &&
    /^\/sap\/bc\/adt\/runtime\/traces\/coverage\/measurements\/[^/]+/.test(
      pathname,
    )
  ) {
    return {
      status: 200,
      body: f.coverageMeasurements,
      contentType: 'application/xml+scov',
    };
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

  return undefined;
}
