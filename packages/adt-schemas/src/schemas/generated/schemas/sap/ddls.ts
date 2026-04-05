/**
 * DDLS Schema
 *
 * CDS View Entity types for SAP ADT.
 * Generated from ddls.xsd
 */
export default {
  $xmlns: {
    ddls: 'http://www.sap.com/adt/ddl/ddls',
    adtcore: 'http://www.sap.com/adt/core',
    xs: 'http://www.w3.org/2001/XMLSchema',
  },
  $imports: [],
  targetNamespace: 'http://www.sap.com/adt/ddl/ddls',
  element: [
    { name: 'ddlsources', type: 'ddls:DdlsSources' },
    { name: 'ddlsource', type: 'ddls:DdlsSource' },
  ],
  complexType: [
    {
      name: 'DdlsSources',
      sequence: { element: [{ name: 'ddlsource', type: 'ddls:DdlsSource', minOccurs: 0 }] },
    },
    {
      name: 'DdlsSource',
      complexContent: {
        extension: {
          base: 'adtcore:AdtObject',
          sequence: {
            element: [{ name: 'ddlSource', type: 'ddls:DdlSourceContent', minOccurs: 0 }],
          },
          attribute: [
            { name: 'ddlType', type: 'xs:string' },
            { name: 'exposed', type: 'xs:boolean' },
            { name: 'draftEnabled', type: 'xs:boolean' },
            { name: 'root', type: 'xs:boolean' },
            { name: 'abstract', type: 'xs:boolean' },
            { name: 'final', type: 'xs:boolean' },
            { name: 'objectType', type: 'xs:string' },
            { name: 'entityType', type: 'xs:string' },
            { name: 'projectType', type: 'xs:string' },
            { name: 'parentType', type: 'xs:string' },
            { name: 'parentName', type: 'xs:string' },
            { name: 'annotationOverload', type: 'xs:boolean' },
            { name: 'implementationType', type: 'xs:string' },
            { name: 'etagMaster', type: 'xs:string' },
          ],
        },
      },
    },
    {
      name: 'DdlSourceContent',
      sequence: {
        element: [
          { name: 'define', type: 'ddls:DdlSourceDefine', minOccurs: 0 },
          { name: 'objectReferences', type: 'adtcore:ObjectReferences', minOccurs: 0 },
        ],
      },
    },
    {
      name: 'DdlSourceDefine',
      sequence: {
        element: [
          { name: 'view', type: 'ddls:DdlSourceView', minOccurs: 0 },
          { name: 'entity', type: 'ddls:DdlSourceEntity', minOccurs: 0 },
          { name: 'tableFunction', type: 'ddls:DdlSourceTableFunction', minOccurs: 0 },
        ],
      },
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'alias', type: 'xs:string' },
        { name: 'extends', type: 'xs:string' },
        { name: 'using', type: 'xs:string' },
      ],
    },
    {
      name: 'DdlSourceView',
      sequence: {
        element: [
          { name: 'projection', type: 'ddls:DdlSourceProjection', minOccurs: 0 },
          { name: 'element', type: 'ddls:DdlSourceElement', minOccurs: 0 },
          { name: 'where', type: 'ddls:DdlSourceWhere', minOccurs: 0 },
          { name: 'groupBy', type: 'ddls:DdlSourceGroupBy', minOccurs: 0 },
          { name: 'having', type: 'ddls:DdlSourceHaving', minOccurs: 0 },
          { name: 'orderBy', type: 'ddls:DdlSourceOrderBy', minOccurs: 0 },
        ],
      },
      attribute: [{ name: 'name', type: 'xs:string' }],
    },
    {
      name: 'DdlSourceEntity',
      sequence: {
        element: [
          { name: 'draft', type: 'ddls:DdlSourceDraft', minOccurs: 0 },
          { name: 'persistent', type: 'ddls:DdlSourcePersistent', minOccurs: 0 },
          { name: 'element', type: 'ddls:DdlSourceElement', minOccurs: 0 },
          { name: 'key', type: 'ddls:DdlSourceKey', minOccurs: 0 },
          { name: 'association', type: 'ddls:DdlSourceAssociation', minOccurs: 0 },
        ],
      },
      attribute: [{ name: 'name', type: 'xs:string' }],
    },
    {
      name: 'DdlSourceTableFunction',
      sequence: {
        element: [
          { name: 'parameter', type: 'ddls:DdlSourceParameter', minOccurs: 0 },
          { name: 'returns', type: 'ddls:DdlSourceReturns', minOccurs: 1 },
          { name: 'implementation', type: 'ddls:DdlSourceImplementation', minOccurs: 1 },
        ],
      },
      attribute: [{ name: 'name', type: 'xs:string' }],
    },
    {
      name: 'DdlSourceProjection',
      sequence: { element: [{ name: 'on', type: 'ddls:DdlSourceOn', minOccurs: 1 }] },
    },
    {
      name: 'DdlSourceElement',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'type', type: 'xs:string' },
        { name: 'alias', type: 'xs:string' },
        { name: 'key', type: 'xs:boolean' },
        { name: 'notNull', type: 'xs:boolean' },
        { name: 'length', type: 'xs:integer' },
        { name: 'decimals', type: 'xs:integer' },
        { name: 'label', type: 'xs:string' },
        { name: 'description', type: 'xs:string' },
      ],
    },
    {
      name: 'DdlSourceWhere',
      simpleContent: { extension: { base: 'xs:string', attribute: [{ name: 'operator', type: 'xs:string' }] } },
    },
    {
      name: 'DdlSourceGroupBy',
      sequence: { element: [{ name: 'element', type: 'xs:string', minOccurs: 0 }] },
    },
    {
      name: 'DdlSourceHaving',
      simpleContent: { extension: { base: 'xs:string' } },
    },
    {
      name: 'DdlSourceOrderBy',
      sequence: { element: [{ name: 'element', type: 'ddls:DdlSourceOrderByElement', minOccurs: 0 }] },
    },
    {
      name: 'DdlSourceOrderByElement',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'direction', type: 'xs:string' },
      ],
    },
    {
      name: 'DdlSourceDraft',
      attribute: [
        { name: 'table', type: 'xs:string' },
        { name: 'enable', type: 'xs:boolean' },
      ],
    },
    {
      name: 'DdlSourcePersistent',
      attribute: [
        { name: 'table', type: 'xs:string' },
        { name: 'action', type: 'xs:string' },
      ],
    },
    {
      name: 'DdlSourceKey',
      sequence: { element: [{ name: 'element', type: 'xs:string', minOccurs: 0 }] },
    },
    {
      name: 'DdlSourceAssociation',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'to', type: 'xs:string' },
        { name: 'cardinality', type: 'xs:string' },
        { name: 'on', type: 'xs:string' },
      ],
    },
    {
      name: 'DdlSourceParameter',
      attribute: [
        { name: 'name', type: 'xs:string' },
        { name: 'type', type: 'xs:string' },
        { name: 'optional', type: 'xs:boolean' },
      ],
    },
    {
      name: 'DdlSourceReturns',
      sequence: { element: [{ name: 'element', type: 'ddls:DdlSourceElement', minOccurs: 0 }] },
    },
    {
      name: 'DdlSourceImplementation',
      attribute: [{ name: 'method', type: 'xs:string' }],
    },
    {
      name: 'DdlSourceOn',
      simpleContent: { extension: { base: 'xs:string' } },
    },
  ],
} as const;
