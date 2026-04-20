import { describe, it, expect } from 'vitest';
import { Registry, MemoryFile } from '@abaplint/core';
import { emitLocalClasses } from '../src/emit/local-classes';
import type { ResolvedNames } from '../src/emit/naming';

const defaultNames: ResolvedNames = {
  typesInterface: 'ZIF_PETSTORE_TYPES',
  operationsInterface: 'ZIF_PETSTORE',
  implementationClass: 'ZCL_PETSTORE',
  exceptionClass: 'ZCX_PETSTORE_ERROR',
  localHttpClass: 'lcl_http',
  localResponseClass: 'lcl_response',
  localJsonClass: 'json',
  localJsonParserClass: 'lcl_json_parser',
};

describe('emitLocalClasses — localsDef', () => {
  it('declares all four local classes', () => {
    const { localsDef } = emitLocalClasses(defaultNames);
    expect(localsDef).toMatch(/CLASS\s+lcl_http\s+DEFINITION\s+FINAL/);
    expect(localsDef).toMatch(
      /CLASS\s+lcl_response\s+DEFINITION\s+FINAL\s+CREATE\s+PRIVATE\s+FRIENDS\s+lcl_http/,
    );
    expect(localsDef).toMatch(/CLASS\s+json\s+DEFINITION\s+FINAL/);
    expect(localsDef).toMatch(
      /CLASS\s+lcl_json_parser\s+DEFINITION\s+FINAL\s+CREATE\s+PRIVATE\s+FRIENDS\s+json/,
    );
  });

  it('declares fetch signature with required parameters', () => {
    const { localsDef } = emitLocalClasses(defaultNames);
    expect(localsDef).toContain('METHODS fetch');
    expect(localsDef).toMatch(/method\s+TYPE\s+string/);
    expect(localsDef).toMatch(/path\s+TYPE\s+string/);
    expect(localsDef).toMatch(/query\s+TYPE\s+kvs/);
    expect(localsDef).toMatch(/headers\s+TYPE\s+kvs/);
    expect(localsDef).toMatch(/body\s+TYPE\s+string/);
    expect(localsDef).toMatch(/binary\s+TYPE\s+xstring/);
    expect(localsDef).toContain('cx_web_http_client_error');
    expect(localsDef).toContain('cx_http_dest_provider_error');
  });
});

describe('emitLocalClasses — localsImp', () => {
  it('uses the expected SAP kernel APIs', () => {
    const { localsImp } = emitLocalClasses(defaultNames);
    expect(localsImp).toContain(
      'cl_http_destination_provider=>create_by_destination',
    );
    expect(localsImp).toContain(
      'cl_web_http_client_manager=>create_by_http_destination',
    );
    expect(localsImp).toContain('/ui2/cl_json=>serialize');
    expect(localsImp).toContain('/ui2/cl_json=>deserialize');
    expect(localsImp).toContain('/ui2/cl_json=>pretty_mode-camel_case');
    expect(localsImp).toContain('cl_abap_conv_codepage=>create_out');
    expect(localsImp).toContain('cl_abap_conv_codepage=>create_in');
    expect(localsImp).toContain('cl_http_utility=>escape_url');
    expect(localsImp).toContain('if_web_http_client=>get');
  });

  it('implements all four local classes', () => {
    const { localsImp } = emitLocalClasses(defaultNames);
    expect(localsImp).toMatch(/CLASS\s+lcl_http\s+IMPLEMENTATION/);
    expect(localsImp).toMatch(/CLASS\s+lcl_response\s+IMPLEMENTATION/);
    expect(localsImp).toMatch(/CLASS\s+json\s+IMPLEMENTATION/);
    expect(localsImp).toMatch(/CLASS\s+lcl_json_parser\s+IMPLEMENTATION/);
  });
});

describe('emitLocalClasses — ZERO Z-dependencies', () => {
  it('does not reference any Z-prefixed symbol', () => {
    const { localsDef, localsImp } = emitLocalClasses(defaultNames);
    const zRef = /\b[zZ][a-zA-Z0-9_]*_[a-zA-Z0-9_]+/;
    // allow the header comment mention only; the generator keeps the
    // exception name out of the body entirely, so no Z-token at all.
    expect(localsDef).not.toMatch(zRef);
    expect(localsImp).not.toMatch(zRef);
  });

  it('does not reference legacy or banned APIs', () => {
    const { localsDef, localsImp } = emitLocalClasses(defaultNames);
    const combined = localsDef + '\n' + localsImp;
    expect(combined).not.toContain('/ui2/cl_json=>generate');
    expect(combined).not.toMatch(/\bzcl_abap_case\b/i);
    expect(combined).not.toMatch(/\bzcl_abap_codepage\b/i);
    expect(combined).not.toMatch(/\bcl_http_client\b/);
    expect(combined).not.toContain('xco_cp_json');
    expect(combined).not.toMatch(/\bcl_rest_http_client\b/i);
  });
});

describe('emitLocalClasses — name substitution', () => {
  it('substitutes custom local class names', () => {
    const { localsDef, localsImp } = emitLocalClasses({
      ...defaultNames,
      localHttpClass: 'lcl_http_v2',
      localJsonClass: 'json_api',
    });
    expect(localsDef).toMatch(/CLASS\s+lcl_http_v2\s+DEFINITION/);
    expect(localsDef).toMatch(/CLASS\s+json_api\s+DEFINITION/);
    expect(localsDef).toMatch(/FRIENDS\s+lcl_http_v2/);
    expect(localsDef).toMatch(/FRIENDS\s+json_api/);
    expect(localsDef).not.toMatch(/CLASS\s+lcl_http\s+DEFINITION/);
    expect(localsDef).not.toMatch(/CLASS\s+json\s+DEFINITION/);

    expect(localsImp).toMatch(/CLASS\s+lcl_http_v2\s+IMPLEMENTATION/);
    expect(localsImp).toMatch(/CLASS\s+json_api\s+IMPLEMENTATION/);
    expect(localsImp).not.toMatch(/CLASS\s+lcl_http\s+IMPLEMENTATION/);
    expect(localsImp).not.toMatch(/CLASS\s+json\s+IMPLEMENTATION/);
  });

  it('accepts an exceptionClass name without leaking it into RAISES', () => {
    // fetch only propagates kernel cx-classes; ZCX mapping belongs to the
    // per-operation method generated by Wave 2. The exceptionClass name
    // is accepted for API symmetry and may appear only in the header
    // comment.
    const names: ResolvedNames = {
      ...defaultNames,
      exceptionClass: 'ZCX_CUSTOM_ERROR',
    };
    const { localsDef, localsImp } = emitLocalClasses(names);
    // No RAISING clause references the ZCX
    expect(localsDef).not.toMatch(/RAISING[^.]*ZCX_CUSTOM_ERROR/i);
    expect(localsImp).not.toMatch(/RAISE\s+EXCEPTION\s+TYPE\s+ZCX_/i);
    // The name appears at most in the documentation comment header
    const defZcxMatches = localsDef.match(/ZCX_CUSTOM_ERROR/g) ?? [];
    const impZcxMatches = localsImp.match(/ZCX_CUSTOM_ERROR/g) ?? [];
    expect(defZcxMatches.length).toBeLessThanOrEqual(1);
    expect(impZcxMatches.length).toBe(0);
  });
});

describe('emitLocalClasses — snapshot (default names)', () => {
  it('matches the default-names output', () => {
    const bundle = emitLocalClasses(defaultNames);
    expect({
      localsDef: bundle.localsDef,
      localsImp: bundle.localsImp,
    }).toMatchInlineSnapshot(`
      {
        "localsDef": "* Generated by @abapify/openai-codegen - local class declarations.
      * ZERO Z-dependencies: these locals wrap SAP kernel APIs only.
      * Per-operation methods map HTTP status codes to the custom exception.

      CLASS lcl_http DEFINITION DEFERRED.
      CLASS lcl_response DEFINITION DEFERRED.
      CLASS lcl_json_parser DEFINITION DEFERRED.
      CLASS json DEFINITION DEFERRED.

      CLASS lcl_http DEFINITION FINAL CREATE PUBLIC.
        PUBLIC SECTION.
          TYPES: BEGIN OF kv,
                   name  TYPE string,
                   value TYPE string,
                 END OF kv.
          TYPES kvs TYPE STANDARD TABLE OF kv WITH DEFAULT KEY.

          METHODS constructor
            IMPORTING destination TYPE string
                      server      TYPE string OPTIONAL.

          METHODS fetch
            IMPORTING method          TYPE string
                      path            TYPE string
                      query           TYPE kvs     OPTIONAL
                      headers         TYPE kvs     OPTIONAL
                      body            TYPE string  OPTIONAL
                      binary          TYPE xstring OPTIONAL
            RETURNING VALUE(response) TYPE REF TO lcl_response
            RAISING   cx_web_http_client_error
                      cx_http_dest_provider_error.

        PRIVATE SECTION.
          DATA destination TYPE string.
          DATA server      TYPE string.

          METHODS build_query_string
            IMPORTING query         TYPE kvs
            RETURNING VALUE(result) TYPE string.
      ENDCLASS.

      CLASS lcl_response DEFINITION FINAL CREATE PRIVATE FRIENDS lcl_http.
        PUBLIC SECTION.
          METHODS status  RETURNING VALUE(result) TYPE i.
          METHODS body    RETURNING VALUE(result) TYPE xstring.
          METHODS text    RETURNING VALUE(result) TYPE string.
          METHODS header
            IMPORTING name          TYPE string
            RETURNING VALUE(result) TYPE string.
          METHODS headers RETURNING VALUE(result) TYPE lcl_http=>kvs.

        PRIVATE SECTION.
          METHODS constructor
            IMPORTING status_code TYPE i
                      body_bytes  TYPE xstring
                      body_text   TYPE string
                      header_list TYPE lcl_http=>kvs.

          DATA status_code TYPE i.
          DATA body_bytes  TYPE xstring.
          DATA body_text   TYPE string.
          DATA header_list TYPE lcl_http=>kvs.
      ENDCLASS.

      CLASS lcl_json_parser DEFINITION FINAL CREATE PRIVATE FRIENDS json.
        PUBLIC SECTION.
          METHODS to
            IMPORTING target TYPE REF TO data.

        PRIVATE SECTION.
          METHODS constructor
            IMPORTING json_text TYPE string.

          DATA json_text TYPE string.
      ENDCLASS.

      CLASS json DEFINITION FINAL CREATE PRIVATE.
        PUBLIC SECTION.
          CLASS-METHODS stringify
            IMPORTING data          TYPE any
            RETURNING VALUE(result) TYPE string.

          CLASS-METHODS render
            IMPORTING data          TYPE any
            RETURNING VALUE(result) TYPE xstring.

          CLASS-METHODS parse
            IMPORTING source        TYPE any
            RETURNING VALUE(result) TYPE REF TO lcl_json_parser.
      ENDCLASS.
      ",
        "localsImp": "* Generated by @abapify/openai-codegen - local class implementations.
      * ZERO Z-dependencies: uses SAP kernel APIs only.

      CLASS lcl_http IMPLEMENTATION.

        METHOD constructor.
          me->destination = destination.
          me->server      = server.
        ENDMETHOD.

        METHOD build_query_string.
          DATA parts TYPE string_table.
          LOOP AT query ASSIGNING FIELD-SYMBOL(<q>).
            DATA(enc_n) = cl_http_utility=>escape_url( <q>-name ).
            DATA(enc_v) = cl_http_utility=>escape_url( <q>-value ).
            APPEND |{ enc_n }={ enc_v }| TO parts.
          ENDLOOP.
          result = concat_lines_of( table = parts sep = \`&\` ).
        ENDMETHOD.

        METHOD fetch.
          DATA full_path TYPE string.
          full_path = path.
          IF query IS NOT INITIAL.
            full_path = |{ path }?{ build_query_string( query ) }|.
          ENDIF.

          DATA dest TYPE REF TO if_http_destination.
          dest = cl_http_destination_provider=>create_by_destination(
            i_name = CONV #( destination ) ).

          DATA client TYPE REF TO if_web_http_client.
          client = cl_web_http_client_manager=>create_by_http_destination(
            i_destination = dest ).

          DATA request TYPE REF TO if_web_http_request.
          request = client->get_http_request( ).
          request->set_uri_path( i_uri_path = full_path ).

          DATA verb TYPE string.
          verb = SWITCH string( method
            WHEN 'GET'     THEN if_web_http_client=>get
            WHEN 'POST'    THEN if_web_http_client=>post
            WHEN 'PUT'     THEN if_web_http_client=>put
            WHEN 'DELETE'  THEN if_web_http_client=>delete
            WHEN 'PATCH'   THEN if_web_http_client=>patch
            WHEN 'HEAD'    THEN if_web_http_client=>head
            WHEN 'OPTIONS' THEN if_web_http_client=>options
            ELSE if_web_http_client=>get ).

          LOOP AT headers ASSIGNING FIELD-SYMBOL(<h>).
            request->set_header_field( i_name  = <h>-name
                                       i_value = <h>-value ).
          ENDLOOP.

          IF binary IS NOT INITIAL.
            request->set_binary_body( i_data = binary ).
          ELSEIF body IS NOT INITIAL.
            request->set_text( i_text = body ).
          ENDIF.

          DATA resp TYPE REF TO if_web_http_response.
          resp = client->execute( i_method = verb ).

          DATA status_code TYPE i.
          status_code = resp->get_status( )-code.

          DATA body_bytes TYPE xstring.
          body_bytes = resp->get_binary( ).

          DATA body_text TYPE string.
          IF body_bytes IS NOT INITIAL.
            body_text = cl_abap_conv_codepage=>create_in( )->convert(
              source = body_bytes ).
          ENDIF.

          DATA raw_headers TYPE tihttpnvp.
          raw_headers = resp->get_header_fields( ).

          DATA header_list TYPE kvs.
          LOOP AT raw_headers ASSIGNING FIELD-SYMBOL(<rh>).
            APPEND VALUE #( name  = <rh>-name
                            value = <rh>-value ) TO header_list.
          ENDLOOP.

          response = NEW lcl_response(
            status_code = status_code
            body_bytes  = body_bytes
            body_text   = body_text
            header_list = header_list ).

          client->close( ).
        ENDMETHOD.

      ENDCLASS.

      CLASS lcl_response IMPLEMENTATION.

        METHOD constructor.
          me->status_code = status_code.
          me->body_bytes  = body_bytes.
          me->body_text   = body_text.
          me->header_list = header_list.
        ENDMETHOD.

        METHOD status.
          result = status_code.
        ENDMETHOD.

        METHOD body.
          result = body_bytes.
        ENDMETHOD.

        METHOD text.
          result = body_text.
        ENDMETHOD.

        METHOD headers.
          result = header_list.
        ENDMETHOD.

        METHOD header.
          DATA needle TYPE string.
          needle = to_lower( name ).
          LOOP AT header_list ASSIGNING FIELD-SYMBOL(<h>).
            IF to_lower( <h>-name ) = needle.
              result = <h>-value.
              RETURN.
            ENDIF.
          ENDLOOP.
        ENDMETHOD.

      ENDCLASS.

      CLASS lcl_json_parser IMPLEMENTATION.

        METHOD constructor.
          me->json_text = json_text.
        ENDMETHOD.

        METHOD to.
          FIELD-SYMBOLS <t> TYPE any.
          ASSIGN target->* TO <t>.
          /ui2/cl_json=>deserialize(
            EXPORTING json        = json_text
                      pretty_name = /ui2/cl_json=>pretty_mode-camel_case
            CHANGING  data        = <t> ).
        ENDMETHOD.

      ENDCLASS.

      CLASS json IMPLEMENTATION.

        METHOD stringify.
          result = /ui2/cl_json=>serialize(
            data        = data
            pretty_name = /ui2/cl_json=>pretty_mode-camel_case
            compress    = abap_true ).
        ENDMETHOD.

        METHOD render.
          DATA text TYPE string.
          text = stringify( data ).
          result = cl_abap_conv_codepage=>create_out( )->convert(
            source = text ).
        ENDMETHOD.

        METHOD parse.
          DATA text TYPE string.
          DATA tk   TYPE c LENGTH 1.
          FIELD-SYMBOLS <s> TYPE any.
          ASSIGN source TO <s>.
          DESCRIBE FIELD <s> TYPE tk.
          IF tk = 'X' OR tk = 'y'.
            DATA bytes TYPE xstring.
            bytes = <s>.
            text = cl_abap_conv_codepage=>create_in( )->convert(
              source = bytes ).
          ELSE.
            text = <s>.
          ENDIF.
          result = NEW lcl_json_parser( json_text = text ).
        ENDMETHOD.

      ENDCLASS.
      ",
      }
    `);
  });
});

describe('emitLocalClasses — abaplint parse', () => {
  it('parses cleanly with no parser_error fatal issues', () => {
    const { localsDef, localsImp } = emitLocalClasses(defaultNames);

    // Minimal CLAS envelope so abaplint recognises the includes.
    const mainClas = `CLASS zcl_test DEFINITION PUBLIC FINAL CREATE PUBLIC.
  PUBLIC SECTION.
    METHODS probe.
ENDCLASS.

CLASS zcl_test IMPLEMENTATION.
  METHOD probe.
  ENDMETHOD.
ENDCLASS.
`;
    const clasXml = `<?xml version="1.0" encoding="utf-8"?>
<abapGit version="v1.0.0" serializer="LCL_OBJECT_CLAS" serializer_version="v1.0.0">
 <asx:abap xmlns:asx="http://www.sap.com/abapxml" version="1.0">
  <asx:values>
   <VSEOCLASS>
    <CLSNAME>ZCL_TEST</CLSNAME>
    <LANGU>E</LANGU>
    <DESCRIPT>test</DESCRIPT>
    <STATE>1</STATE>
    <CLSCCINCL>X</CLSCCINCL>
    <FIXPT>X</FIXPT>
    <UNICODE>X</UNICODE>
   </VSEOCLASS>
  </asx:values>
 </asx:abap>
</abapGit>
`;
    const reg = new Registry();
    reg.addFile(new MemoryFile('zcl_test.clas.abap', mainClas));
    reg.addFile(new MemoryFile('zcl_test.clas.xml', clasXml));
    reg.addFile(new MemoryFile('zcl_test.clas.locals_def.abap', localsDef));
    reg.addFile(new MemoryFile('zcl_test.clas.locals_imp.abap', localsImp));
    reg.parse();

    const parserErrors = reg
      .findIssues()
      .filter((i) => i.getKey() === 'parser_error');

    if (parserErrors.length > 0) {
      const msgs = parserErrors
        .map(
          (i) =>
            `${i.getFilename()}:${i.getStart().getRow()} ${i.getMessage()}`,
        )
        .join('\n');
      throw new Error(`abaplint reported parser_error issues:\n${msgs}`);
    }
    expect(parserErrors).toHaveLength(0);
  });
});
