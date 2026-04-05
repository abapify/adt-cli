/**
 * RAP - ABAP RESTful Application Programming Model Objects
 *
 * Contains ADK objects for RAP artifacts:
 * - BehaviourDefinition: RAP behavior definitions (BDEF)
 * - CDSView: CDS Views (DDLS)
 * - CDSEntity: CDS Metadata Extensions (DDLX)
 */

export {
  AdkBehaviourDefinition,
  type BehaviourDefinitionXml,
} from './bdef/bdef.model';
export {
  AdkCDSView,
  AdkCDSEntity,
  type CDSViewXml,
  type CDSEntityXml,
} from './cds';
