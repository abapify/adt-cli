/**
 * Behaviour Definition Schema
 *
 * RAP Behavior Definition types for SAP ADT.
 * Generated from behaviourdefinition.xsd
 */
export default {
  $xmlns: {
    bdef: 'http://www.sap.com/adt/rap/behaviours',
    adtcore: 'http://www.sap.com/adt/core',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  $imports: [],
  targetNamespace: 'http://www.sap.com/adt/rap/behaviours',
  element: [
    { name: 'behaviours', type: 'bdef:BehaviourDefinitions' },
    { name: 'behaviour', type: 'bdef:BehaviourDefinition' },
  ],
  complexType: [
    {
      name: 'BehaviourDefinitions',
      sequence: { element: [{ name: 'behaviour', type: 'bdef:BehaviourDefinition', minOccurs: 0 }] },
    },
    {
      name: 'BehaviourDefinition',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: {
            element: [
              { name: 'behaviorDef', type: 'bdef:BehaviorDefContent', minOccurs: 0 },
              { name: 'objectReferences', type: 'adtcore:ObjectReferences', minOccurs: 0 },
            ],
          },
          attribute: [
            { name: 'baseType', type: 'xs:string' },
            { name: 'implementationClass', type: 'xs:string' },
            { name: 'projectType', type: 'xs:string' },
            { name: 'draftEnabled', type: 'xs:string' },
            { name: 'unmanagedPersistence', type: 'xs:string' },
            { name: 'withLock', type: 'xs:string' },
            { name: 'withFeatures', type: 'xs:string' },
            { name: 'authorization', type: 'xs:string' },
          ],
        },
      },
    },
    {
      name: 'BehaviorDefContent',
      sequence: { element: [{ name: 'define', type: 'bdef:BehaviorDefDefine', minOccurs: 0 }] },
    },
    {
      name: 'BehaviorDefDefine',
      sequence: {
        element: [
          { name: 'class', type: 'bdef:BehaviorDefClass', minOccurs: 0 },
          { name: 'association', type: 'bdef:BehaviorDefAssociation', minOccurs: 0 },
          { name: 'action', type: 'bdef:BehaviorDefAction', minOccurs: 0 },
          { name: 'validation', type: 'bdef:BehaviorDefValidation', minOccurs: 0 },
          { name: 'internal', type: 'bdef:BehaviorDefInternal', minOccurs: 0 },
        ],
      },
      attribute: [
        { name: 'for', type: 'xs:string' },
        { name: 'with', type: 'xs:string' },
        { name: 'create', type: 'xs:string' },
        { name: 'update', type: 'xs:string' },
        { name: 'delete', type: 'xs:string' },
      ],
    },
    {
      name: 'BehaviorDefClass',
      attribute: [
        { name: 'entity', type: 'xs:string' },
        { name: 'implementation', type: 'xs:string' },
        { name: 'persistent', type: 'xs:string' },
        { name: 'table', type: 'xs:string' },
        { name: 'create', type: 'xs:string' },
        { name: 'modify', type: 'xs:string' },
        { name: 'delete', type: 'xs:string' },
      ],
    },
    {
      name: 'BehaviorDefAssociation',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'to', type: 'xs:string' },
        { name: 'cardinality', type: 'xs:string' },
        { name: 'on', type: 'xs:string' },
      ],
    },
    {
      name: 'BehaviorDefAction',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'for', type: 'xs:string' },
        { name: 'implementation', type: 'xs:string' },
        { name: 'result', type: 'xs:string' },
      ],
    },
    {
      name: 'BehaviorDefValidation',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'for', type: 'xs:string' },
        { name: 'implementation', type: 'xs:string' },
      ],
    },
    {
      name: 'BehaviorDefInternal',
      sequence: { element: [{ name: 'any', type: 'xs:anyType', minOccurs: 0 }] },
    },
  ],
} as const;
