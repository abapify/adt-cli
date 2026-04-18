/**
 * Unit tests for adtUriToAbapGitPath – the ADT URI → abapGit path mapper.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { adtUriToAbapGitPath } from '../../src/lib/filename/adt-uri-to-path.ts';

describe('adtUriToAbapGitPath', () => {
  const cases: Array<[string, string | null]> = [
    ['/sap/bc/adt/oo/classes/zcl_foo', 'src/zcl_foo.clas.abap'],
    ['/sap/bc/adt/oo/classes/zcl_foo/source/main', 'src/zcl_foo.clas.abap'],
    [
      '/sap/bc/adt/oo/classes/zcl_foo/includes/testclasses',
      'src/zcl_foo.clas.testclasses.abap',
    ],
    [
      '/sap/bc/adt/oo/classes/zcl_foo/includes/definitions',
      'src/zcl_foo.clas.locals_def.abap',
    ],
    [
      '/sap/bc/adt/oo/classes/zcl_foo/includes/implementations',
      'src/zcl_foo.clas.locals_imp.abap',
    ],
    [
      '/sap/bc/adt/oo/classes/zcl_foo/includes/macros',
      'src/zcl_foo.clas.macros.abap',
    ],
    [
      '/sap/bc/adt/oo/classes/zcl_foo/includes/localtypes',
      'src/zcl_foo.clas.locals_types.abap',
    ],

    ['/sap/bc/adt/oo/interfaces/zif_foo', 'src/zif_foo.intf.abap'],
    ['/sap/bc/adt/oo/interfaces/zif_foo/source/main', 'src/zif_foo.intf.abap'],

    ['/sap/bc/adt/programs/programs/zprog', 'src/zprog.prog.abap'],
    ['/sap/bc/adt/programs/programs/zprog/source/main', 'src/zprog.prog.abap'],

    ['/sap/bc/adt/functions/groups/zfoo', 'src/zfoo.fugr.xml'],
    [
      '/sap/bc/adt/functions/groups/zfoo/fmodules/z_my_fm',
      'src/zfoo.fugr.z_my_fm.abap',
    ],
    [
      '/sap/bc/adt/functions/groups/zfoo/includes/LZFOOTOP',
      'src/zfoo.fugr.lzfootop.abap',
    ],

    ['/sap/bc/adt/ddic/ddl/sources/zi_foo', 'src/zi_foo.ddls.asddls'],
    ['/sap/bc/adt/acm/dcl/sources/zi_foo', 'src/zi_foo.dcls.asdcls'],
    ['/sap/bc/adt/bo/behaviordefinitions/zbp_foo', 'src/zbp_foo.bdef.abdl'],
    [
      '/sap/bc/adt/bo/behaviordefinitions/zbp_foo/source/main',
      'src/zbp_foo.bdef.abdl',
    ],
    ['/sap/bc/adt/ddic/srvd/sources/zui_foo', 'src/zui_foo.srvd.asrvd'],
    [
      '/sap/bc/adt/ddic/srvd/sources/zui_foo/source/main',
      'src/zui_foo.srvd.asrvd',
    ],
    ['/sap/bc/adt/businessservices/bindings/zui_foo', 'src/zui_foo.srvb.xml'],
    [
      '/sap/bc/adt/businessservices/bindings/zui_foo/publishedstates',
      'src/zui_foo.srvb.xml',
    ],
    ['/sap/bc/adt/ddic/domains/zd_foo', 'src/zd_foo.doma.xml'],
    ['/sap/bc/adt/ddic/dataelements/zd_foo', 'src/zd_foo.dtel.xml'],
    ['/sap/bc/adt/ddic/structures/zs_foo', 'src/zs_foo.tabl.xml'],
    ['/sap/bc/adt/ddic/tables/zt_foo', 'src/zt_foo.tabl.xml'],

    ['/sap/bc/adt/packages/zmy_pack', 'src/zmy_pack.devc.xml'],

    ['/sap/bc/adt/atc/worklists', null],
    ['', null],
  ];

  for (const [uri, expected] of cases) {
    it(`maps ${uri || '<empty>'} to ${expected ?? 'null'}`, () => {
      assert.strictEqual(adtUriToAbapGitPath(uri), expected);
    });
  }

  it('strips #start= fragment before matching', () => {
    assert.strictEqual(
      adtUriToAbapGitPath(
        '/sap/bc/adt/oo/classes/zcl_foo/source/main#start=25,6',
      ),
      'src/zcl_foo.clas.abap',
    );
  });

  it('handles SAP namespaces – /NMSPC/ZCL_FOO → (nmspc)zcl_foo', () => {
    assert.strictEqual(
      adtUriToAbapGitPath('/sap/bc/adt/oo/classes/%2FNMSPC%2Fzcl_foo'),
      'src/(nmspc)zcl_foo.clas.abap',
    );
  });

  it('lowercases uppercase object names', () => {
    assert.strictEqual(
      adtUriToAbapGitPath('/sap/bc/adt/oo/classes/ZCL_BAR'),
      'src/zcl_bar.clas.abap',
    );
  });
});
