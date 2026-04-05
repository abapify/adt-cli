/**
 * BDEF - Behaviour Definition (RAP)
 *
 * ADK object for RAP Behaviour Definitions.
 *
 * RAP Behaviour Definitions define the behavior of a CDS entity in the
 * ABAP RESTful Application Programming model.
 */

import { AdkMainObject } from '../../../base/model';
import { BehaviourDefinition as BehaviourDefinitionKind } from '../../../base/kinds';
import { getGlobalContext } from '../../../base/global-context';
import type { AdkContext } from '../../../base/context';

/**
 * BehaviourDefinition data type
 *
 * Extends the base ADT response with RAP-specific fields.
 * RAP behaviour definitions include: implementationType, draftEnabled,
 * lock, modification, authorization, and field-level behavior.
 */
export interface BehaviourDefinitionXml {
  name: string;
  type: string;
  description?: string;
  language?: string;
  responsible?: string;
  packageRef?: { name?: string; type?: string };
  masterLanguage?: string;
  abapLanguageVersion?: string;
  implementationType?: string;
  draftEnabled?: string;
  entityName?: string;
  generatedImplementationClass?: string;
  baseType?: string;
}

/**
 * ADK Behaviour Definition object
 *
 * Represents a RAP Behaviour Definition (BDEF) object.
 * Behaviour Definitions control the behavior of CDS entities in RAP applications.
 */
export class AdkBehaviourDefinition extends AdkMainObject<
  typeof BehaviourDefinitionKind,
  BehaviourDefinitionXml
> {
  static readonly kind = BehaviourDefinitionKind;
  readonly kind = AdkBehaviourDefinition.kind;

  get objectUri(): string {
    return `/sap/bc/adt/rap/behaviours/${encodeURIComponent(this.name)}`;
  }

  protected override get wrapperKey() {
    return 'behaviourDefinition';
  }

  protected override get crudContract(): any {
    return this.ctx.client.adt.rap.behaviours;
  }

  static async get(
    name: string,
    ctx?: AdkContext,
  ): Promise<AdkBehaviourDefinition> {
    const context = ctx ?? getGlobalContext();
    return new AdkBehaviourDefinition(context, name).load();
  }
}

import { registerObjectType } from '../../../base/registry';
registerObjectType('BDEF', BehaviourDefinitionKind, AdkBehaviourDefinition, {
  endpoint: 'rap/behaviours',
});
