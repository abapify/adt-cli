/**
 * RAP Generator Schema
 *
 * RAP Generator workspace types for SAP ADT.
 * Generated from rapgenerator.xsd
 */
export default {
  $xmlns: {
    rap: 'http://www.sap.com/adt/rap/generator',
    adtcore: 'http://www.sap.com/adt/core',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  $imports: [],
  targetNamespace: 'http://www.sap.com/adt/rap/generator',
  element: [{ name: 'workspace', type: 'rap:GeneratorWorkspace' }],
  complexType: [
    {
      name: 'GeneratorWorkspace',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: {
            element: [{ name: 'workspaceContent', type: 'rap:GeneratorWorkspaceContent', minOccurs: 0 }],
          },
          attribute: [
            { name: 'workspaceId', type: 'xs:string' },
            { name: 'templateId', type: 'xs:string' },
            { name: 'status', type: 'xs:string' },
          ],
        },
      },
    },
    {
      name: 'GeneratorWorkspaceContent',
      sequence: {
        element: [
          { name: 'templates', type: 'rap:Templates', minOccurs: 0 },
          { name: 'generatedObjects', type: 'rap:GeneratedObjects', minOccurs: 0 },
          { name: 'templateParameters', type: 'rap:TemplateParameters', minOccurs: 0 },
        ],
      },
    },
    {
      name: 'Templates',
      sequence: { element: [{ name: 'template', type: 'rap:GeneratorTemplate', minOccurs: 0 }] },
    },
    {
      name: 'GeneratorTemplate',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: {
            element: [
              { name: 'templateContent', type: 'rap:TemplateContent', minOccurs: 0 },
              { name: 'parameter', type: 'rap:TemplateParameter', minOccurs: 0 },
            ],
          },
          attribute: [
            { name: 'templateId', type: 'xs:string' },
            { name: 'templateType', type: 'xs:string' },
            { name: 'category', type: 'xs:string' },
            { name: 'description', type: 'xs:string' },
            { name: 'icon', type: 'xs:string' },
          ],
        },
      },
    },
    {
      name: 'TemplateContent',
      sequence: {
        element: [
          { name: 'wizardStep', type: 'rap:WizardStep', minOccurs: 0 },
          { name: 'preview', type: 'rap:TemplatePreview', minOccurs: 0 },
        ],
      },
      attribute: [{ name: 'objectType', type: 'xs:string' }],
    },
    {
      name: 'WizardStep',
      sequence: {
        element: [
          { name: 'field', type: 'rap:TemplateField', minOccurs: 0 },
          { name: 'info', type: 'rap:WizardStepInfo', minOccurs: 0 },
        ],
      },
      attribute: [
        { name: 'stepId', type: 'xs:string' },
        { name: 'title', type: 'xs:string' },
        { name: 'description', type: 'xs:string' },
        { name: 'sequence', type: 'xs:integer' },
        { name: 'mandatory', type: 'xs:boolean' },
      ],
    },
    {
      name: 'TemplateField',
      sequence: {
        element: [
          { name: 'value', type: 'xs:string', minOccurs: 0 },
          { name: 'enumValue', type: 'rap:FieldEnumValue', minOccurs: 0 },
          { name: 'validation', type: 'rap:FieldValidation', minOccurs: 0 },
        ],
      },
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'label', type: 'xs:string' },
        { name: 'type', type: 'xs:string' },
        { name: 'mandatory', type: 'xs:boolean' },
        { name: 'readonly', type: 'xs:boolean' },
        { name: 'maxLength', type: 'xs:integer' },
        { name: 'defaultValue', type: 'xs:string' },
        { name: 'placeholder', type: 'xs:string' },
        { name: 'helpId', type: 'xs:string' },
      ],
    },
    {
      name: 'FieldEnumValue',
      attribute: [
        { name: 'value', type: 'xs:string' },
        { name: 'label', type: 'xs:string' },
        { name: 'selected', type: 'xs:boolean' },
      ],
    },
    {
      name: 'FieldValidation',
      attribute: [
        { name: 'type', type: 'xs:string' },
        { name: 'parameter', type: 'xs:string' },
        { name: 'errorMessage', type: 'xs:string' },
      ],
    },
    {
      name: 'WizardStepInfo',
      simpleContent: { extension: { base: 'xs:string', attribute: [{ name: 'type', type: 'xs:string' }] } },
    },
    {
      name: 'TemplatePreview',
      sequence: { element: [{ name: 'objectPreview', type: 'rap:ObjectPreview', minOccurs: 0 }] },
      attribute: [
        { name: 'objectType', type: 'xs:string' },
        { name: 'package', type: 'xs:string' },
      ],
    },
    {
      name: 'ObjectPreview',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: { element: [{ name: 'objectContent', type: 'rap:ObjectContent', minOccurs: 0 }] },
        },
      },
    },
    {
      name: 'ObjectContent',
      sequence: { element: [{ name: 'any', type: 'xs:anyType', minOccurs: 0 }] },
    },
    {
      name: 'TemplateParameter',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'value', type: 'xs:string' },
        { name: 'type', type: 'xs:string' },
      ],
    },
    {
      name: 'TemplateParameters',
      sequence: { element: [{ name: 'parameter', type: 'rap:TemplateParameter', minOccurs: 0 }] },
    },
    {
      name: 'GeneratedObjects',
      sequence: {
        element: [
          { name: 'objectReferences', type: 'adtcore:ObjectReferences', minOccurs: 0 },
          { name: 'generatedObject', type: 'rap:GeneratedObject', minOccurs: 0 },
        ],
      },
    },
    {
      name: 'GeneratedObject',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: { element: [{ name: 'objectStatus', type: 'rap:ObjectStatus', minOccurs: 0 }] },
          attribute: [
            { name: 'generatedType', type: 'xs:string' },
            { name: 'generatedFrom', type: 'xs:string' },
          ],
        },
      },
    },
    {
      name: 'ObjectStatus',
      attribute: [
        { name: 'state', type: 'xs:string' },
        { name: 'message', type: 'xs:string' },
        { name: 'timestamp', type: 'xs:dateTime' },
      ],
    },
  ],
} as const;
