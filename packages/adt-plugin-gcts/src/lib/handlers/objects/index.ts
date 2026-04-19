/**
 * Barrel — importing this module triggers every handler to register itself
 * with the gCTS handler registry (side-effect import pattern, same as the
 * abapGit plugin).
 */

export { classHandler } from './clas';
export { interfaceHandler } from './intf';
export { programHandler } from './prog';
export { packageHandler } from './devc';
export { domainHandler } from './doma';
export { dataElementHandler } from './dtel';
export { tableHandler } from './tabl';
export { tableTypeHandler } from './ttyp';
export { functionGroupHandler } from './fugr';
