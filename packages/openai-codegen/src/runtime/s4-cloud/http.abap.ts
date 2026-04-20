/**
 * s4-cloud HTTP runtime snippet.
 *
 * Emits the declaration lines (for PRIVATE SECTION) and matching method
 * implementations for a thin wrapper over `if_web_http_client`. Only uses
 * system classes allowed by the s4-cloud profile.
 */

export const HTTP_RUNTIME_DECL_ABAP = `* --- HTTP runtime (s4-cloud) ---
METHODS _build_client
  IMPORTING iv_destination   TYPE string
  RETURNING VALUE(ro_client) TYPE REF TO if_web_http_client
  RAISING   cx_web_http_client_error
            cx_http_dest_provider_error.

METHODS _send_request
  IMPORTING io_client          TYPE REF TO if_web_http_client
            io_request         TYPE REF TO if_web_http_request
            iv_method          TYPE string
  RETURNING VALUE(ro_response) TYPE REF TO if_web_http_response
  RAISING   cx_web_http_client_error
            cx_web_message_error.
`;

export const HTTP_RUNTIME_IMPL_ABAP = `* --- HTTP runtime (s4-cloud) ---
METHOD _build_client.
  " Resolve the communication arrangement identified by iv_destination
  " and build a web-http client on top of it. Both classes are the only
  " approved entry points on SAP BTP (Steampunk).
  DATA(lo_destination) = cl_http_destination_provider=>create_by_comm_arrangement(
    comm_scenario  = iv_destination
    comm_system_id = ''
    service_id     = '' ).
  ro_client = cl_web_http_client_manager=>create_by_http_destination( lo_destination ).
ENDMETHOD.

METHOD _send_request.
  " The caller has already populated io_request via io_client->get_http_request( ).
  " The HTTP method is passed via iv_method and must be one of the
  " if_web_http_client=>get / =>post / =>put / =>delete / =>patch /
  " =>head / =>options static constants.
  ro_response = io_client->execute( i_method = iv_method ).
ENDMETHOD.
`;
