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
