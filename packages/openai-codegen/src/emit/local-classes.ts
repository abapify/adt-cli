/**
 * Local-class bundle emitter for generated implementation classes.
 *
 * The generated ZCL_<name> class bundles four local helper classes inside
 * its abapGit `locals_def.abap` / `locals_imp.abap` includes. These locals
 * wrap SAP kernel APIs (cl_web_http_client_manager,
 * cl_http_destination_provider, cl_http_utility, /ui2/cl_json,
 * cl_abap_conv_codepage) and expose a fetch-like + JSON-like API.
 *
 * This module is a thin orchestrator over the two template files.
 */
import type { ResolvedNames } from './naming';
import { buildLocalsDef } from './templates/locals-def.abap';
import { buildLocalsImp } from './templates/locals-imp.abap';

export interface LocalClassesBundle {
  /** Content for <cls>.clas.locals_def.abap. */
  localsDef: string;
  /** Content for <cls>.clas.locals_imp.abap. */
  localsImp: string;
}

export function emitLocalClasses(names: ResolvedNames): LocalClassesBundle {
  const templateNames = {
    exceptionClass: names.exceptionClass,
    localJsonClass: names.localJsonClass,
    localJsonParserClass: names.localJsonParserClass,
    localResponseClass: names.localResponseClass,
    localHttpClass: names.localHttpClass,
  };
  return {
    localsDef: buildLocalsDef(templateNames),
    localsImp: buildLocalsImp(templateNames),
  };
}
