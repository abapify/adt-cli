/**
 * OO (Object-Oriented) Contract Scenarios
 *
 * Classes and Interfaces CRUD operations.
 */

import {
  classes as classesSchema,
  interfaces as interfacesSchema,
} from '../../src/schemas';
import { ContractScenario, runScenario, type ContractOperation } from './base';
import { ooContract } from '../../src/adt/oo';
import { fixtures } from 'adt-fixtures';

class ClassesScenario extends ContractScenario {
  readonly name = 'OO Classes';

  readonly operations: ContractOperation[] = [
    {
      name: 'get class metadata',
      contract: () => ooContract.classes.get('ZCL_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/classes/zcl_test',
      headers: { Accept: 'application/vnd.sap.adt.oo.classes.v4+xml' },
      response: {
        status: 200,
        schema: classesSchema,
        fixture: fixtures.oo.class,
      },
    },
    {
      name: 'create class',
      contract: () => ooContract.classes.post(),
      method: 'POST',
      path: '/sap/bc/adt/oo/classes',
      headers: {
        Accept: 'application/vnd.sap.adt.oo.classes.v4+xml',
        'Content-Type': 'application/vnd.sap.adt.oo.classes.v4+xml',
      },
      body: { schema: classesSchema },
      response: { status: 200, schema: classesSchema },
    },
    {
      name: 'update class',
      contract: () => ooContract.classes.put('ZCL_TEST'),
      method: 'PUT',
      path: '/sap/bc/adt/oo/classes/zcl_test',
      headers: {
        Accept: 'application/vnd.sap.adt.oo.classes.v4+xml',
        'Content-Type': 'application/vnd.sap.adt.oo.classes.v4+xml',
      },
      body: { schema: classesSchema },
      response: { status: 200, schema: classesSchema },
    },
    {
      name: 'delete class',
      contract: () => ooContract.classes.delete('ZCL_TEST'),
      method: 'DELETE',
      path: '/sap/bc/adt/oo/classes/zcl_test',
      response: { status: 204, schema: undefined },
    },
  ];
}

class ClassSourceScenario extends ContractScenario {
  readonly name = 'OO Class Source';

  readonly operations: ContractOperation[] = [
    {
      name: 'get main source',
      contract: () => ooContract.classes.source.main.get('ZCL_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/classes/zcl_test/source/main',
      headers: { Accept: 'text/plain' },
      // Response is plain text, not XML schema
    },
    {
      name: 'update main source',
      contract: () => ooContract.classes.source.main.put('ZCL_TEST'),
      method: 'PUT',
      path: '/sap/bc/adt/oo/classes/zcl_test/source/main',
      headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
    },
    {
      name: 'get definitions include',
      contract: () => ooContract.classes.includes.definitions.get('ZCL_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/classes/zcl_test/includes/definitions',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'get implementations include',
      contract: () =>
        ooContract.classes.includes.implementations.get('ZCL_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/classes/zcl_test/includes/implementations',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'get macros include',
      contract: () => ooContract.classes.includes.macros.get('ZCL_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/classes/zcl_test/includes/macros',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'update include by type',
      contract: () =>
        ooContract.classes.includes.put('ZCL_TEST', 'definitions'),
      method: 'PUT',
      path: '/sap/bc/adt/oo/classes/zcl_test/includes/definitions',
      headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
    },
  ];
}

class InterfacesScenario extends ContractScenario {
  readonly name = 'OO Interfaces';

  readonly operations: ContractOperation[] = [
    {
      name: 'get interface metadata',
      contract: () => ooContract.interfaces.get('ZIF_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/interfaces/zif_test',
      headers: { Accept: 'application/vnd.sap.adt.oo.interfaces.v5+xml' },
      response: {
        status: 200,
        schema: interfacesSchema,
      },
    },
    {
      name: 'create interface',
      contract: () => ooContract.interfaces.post(),
      method: 'POST',
      path: '/sap/bc/adt/oo/interfaces',
      headers: {
        Accept: 'application/vnd.sap.adt.oo.interfaces.v5+xml',
        'Content-Type': 'application/vnd.sap.adt.oo.interfaces.v5+xml',
      },
      body: { schema: interfacesSchema },
      response: { status: 200, schema: interfacesSchema },
    },
    {
      name: 'update interface',
      contract: () => ooContract.interfaces.put('ZIF_TEST'),
      method: 'PUT',
      path: '/sap/bc/adt/oo/interfaces/zif_test',
      headers: {
        Accept: 'application/vnd.sap.adt.oo.interfaces.v5+xml',
        'Content-Type': 'application/vnd.sap.adt.oo.interfaces.v5+xml',
      },
      body: { schema: interfacesSchema },
      response: { status: 200, schema: interfacesSchema },
    },
    {
      name: 'delete interface',
      contract: () => ooContract.interfaces.delete('ZIF_TEST'),
      method: 'DELETE',
      path: '/sap/bc/adt/oo/interfaces/zif_test',
      response: { status: 204, schema: undefined },
    },
    {
      name: 'get interface source',
      contract: () => ooContract.interfaces.source.main.get('ZIF_TEST'),
      method: 'GET',
      path: '/sap/bc/adt/oo/interfaces/zif_test/source/main',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'update interface source',
      contract: () => ooContract.interfaces.source.main.put('ZIF_TEST'),
      method: 'PUT',
      path: '/sap/bc/adt/oo/interfaces/zif_test/source/main',
      headers: { Accept: 'text/plain', 'Content-Type': 'text/plain' },
    },
  ];
}

class ClassRunScenario extends ContractScenario {
  readonly name = 'OO Class Run';

  readonly operations: ContractOperation[] = [
    {
      name: 'execute class',
      contract: () => ooContract.classrun.post('ZCL_CONSOLE_APP'),
      method: 'POST',
      path: '/sap/bc/adt/oo/classrun/zcl_console_app',
      headers: { Accept: 'text/plain' },
    },
    {
      name: 'execute class with profiler',
      contract: () =>
        ooContract.classrun.post('ZCL_CONSOLE_APP', { profilerId: 'PROF001' }),
      method: 'POST',
      path: '/sap/bc/adt/oo/classrun/zcl_console_app',
      query: { profilerId: 'PROF001' },
    },
  ];
}

// Run scenarios
runScenario(new ClassesScenario());
runScenario(new ClassSourceScenario());
runScenario(new InterfacesScenario());
runScenario(new ClassRunScenario());
