/**
 * Content-Type to Schema Name Mapping
 *
 * Used by contract generator to map SAP ADT content types to schema names.
 */

export const contentTypeMapping = {
  mapping: {
    'application/vnd.sap.atc.customizing.v1+xml': 'atc',
    'application/vnd.sap.adt.atc.customizing.v1+xml': 'atc',

    'application/vnd.sap.atc.worklist.v1+xml': 'atcworklist',
    'application/vnd.sap.adt.atc.worklist.v1+xml': 'atcworklist',

    'application/vnd.sap.atc.run.v1+xml': 'atcRun',
    'application/vnd.sap.adt.atc.run.v1+xml': 'atcRun',

    'application/vnd.sap.atc.exemption.v1+xml': 'atcexemption',
    'application/vnd.sap.adt.atc.exemption.v1+xml': 'atcexemption',

    'application/vnd.sap.atc.finding.v1+xml': 'atcfinding',
    'application/vnd.sap.adt.atc.finding.v1+xml': 'atcfinding',

    'application/vnd.sap.atc.info.v1+xml': 'atcinfo',
    'application/vnd.sap.adt.atc.info.v1+xml': 'atcinfo',

    'application/vnd.sap.atc.object.v1+xml': 'atcobject',
    'application/vnd.sap.adt.atc.object.v1+xml': 'atcobject',

    'application/vnd.sap.atc.result.v1+xml': 'atcresult',
    'application/vnd.sap.adt.atc.result.v1+xml': 'atcresult',

    'application/vnd.sap.atc.resultquery.v1+xml': 'atcresultquery',
    'application/vnd.sap.adt.atc.resultquery.v1+xml': 'atcresultquery',

    'application/vnd.sap.adt.chkcv1+xml': 'atc',
    'application/vnd.sap.adt.chkc.v1+xml': 'atc',

    'application/vnd.sap.adt.chkev2+xml': 'atcexemption',
    'application/vnd.sap.adt.chke.v2+xml': 'atcexemption',

    'application/vnd.sap.adt.chkov1+xml': 'atc',
    'application/vnd.sap.adt.chko.v1+xml': 'atc',

    'application/vnd.sap.adt.chkvv4+xml': 'atc',
    'application/vnd.sap.adt.chkv.v4+xml': 'atc',

    'application/vnd.sap.adt.atc.objectreferences.v1+xml': 'atc',
    'application/vnd.sap.adt.atc.autoqf.proposal.v1+xml': 'atc',
    'application/vnd.sap.adt.atc.autoqf.selection.v1+xml': 'atc',
    'application/vnd.sap.adt.atc.genericrefactoring.v1+xml': 'atc',

    'application/vnd.sap.adt.oo.classes.v4+xml': 'classes',
    'application/vnd.sap.adt.oo.classes.v3+xml': 'classes',
    'application/vnd.sap.adt.oo.classes.v2+xml': 'classes',
    'application/vnd.sap.adt.oo.classes+xml': 'classes',

    'application/vnd.sap.adt.oo.interfaces.v2+xml': 'interfaces',
    'application/vnd.sap.adt.oo.interfaces+xml': 'interfaces',

    'application/vnd.sap.adt.packages.v1+xml': 'packagesV1',
    'application/vnd.sap.adt.packages+xml': 'packagesV1',

    'application/vnd.sap.adt.transportmanagement.v1+xml': 'transportmanagment',
    'application/vnd.sap.adt.cts.transportrequests.v1+xml':
      'transportmanagment',
    'application/vnd.sap.adt.cts.transportrequest.v1+xml':
      'transportmanagmentSingle',

    'application/vnd.sap.adt.cts.transportsearch.v1+xml': 'transportfind',

    'application/atomsvc+xml': 'discovery',

    'application/vnd.sap.adt.checkrun.v1+xml': 'checkrun',
    'application/vnd.sap.adt.checklist.v1+xml': 'checklist',

    'application/vnd.sap.adt.configuration.v1+xml': 'configuration',
    'application/vnd.sap.adt.configurations.v1+xml': 'configurations',
  },

  fallbacks: {
    '/atc/worklists': 'atcworklist',
    '/atc/runs': 'atcworklist',
    '/atc/results': 'atcworklist',
    '/atc/exemptions': 'atcexemption',
    '/atc/customizing': 'atc',
    '/atc/': 'atc',
    '/oo/classes': 'classes',
    '/oo/interfaces': 'interfaces',
    '/packages': 'packagesV1',
    '/cts/transportrequests': 'transportmanagment',
  },
} as const;
