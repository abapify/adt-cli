/**
 * abapGit Object Handlers
 *
 * Each handler implements the ObjectHandler interface for a specific ABAP object type.
 */

export { classHandler } from './clas';
export { interfaceHandler } from './intf';
export { packageHandler } from './devc';
export { programHandler } from './prog';
export { functionGroupHandler } from './fugr';
export { domainHandler } from './doma';
export { dataElementHandler } from './dtel';
export { tableHandler, structureHandler } from './tabl';
export { tableTypeHandler } from './ttyp';
export { behaviorDefinitionHandler } from './bdef';
export { serviceDefinitionHandler } from './srvd';
export { serviceBindingHandler } from './srvb';
export { dclSourceHandler } from './dcls';
export { ddlSourceHandler } from './ddls';
export { ddlExtensionHandler } from './ddlx';
export { cdsAspectHandler } from './dras';
export { cdsTypeHandler } from './drty';
export { scalarFunctionDefinitionHandler } from './dsfd';
export { scalarFunctionImplementationHandler } from './dsfi';
export { entityBufferHandler } from './dteb';
export { dynamicCacheHandler } from './dtdc';
export { tuningIndexHandler } from './dtix';
export { staticCacheHandler } from './dtsc';
export { externalSchemaHandler } from './desd';

// Phase 2: Legacy XML types
export { messageClassHandler } from './msag';
export { viewHandler } from './view';
export { lockObjectHandler } from './enqu';
export { searchHelpHandler } from './shlp';
export { transactionHandler } from './tran';
export { typeGroupHandler } from './type';
export { transformationHandler } from './xslt';
