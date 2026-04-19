/**
 * s4-cloud URL runtime snippet.
 *
 * Percent-encodes path segments, serialises query parameters (style=form)
 * and joins a server + path + query list into a full URL. Uses
 * cl_http_utility=>escape_url for encoding.
 */

export const URL_RUNTIME_DECL_ABAP = `* --- URL runtime (s4-cloud) ---
METHODS _encode_path
  IMPORTING iv_value          TYPE string
  RETURNING VALUE(rv_encoded) TYPE string.

METHODS _serialize_query_param
  IMPORTING iv_name      TYPE string
            iv_value     TYPE string
            iv_style     TYPE string
            iv_explode   TYPE abap_bool
  RETURNING VALUE(rv_qs) TYPE string.

METHODS _join_url
  IMPORTING iv_server     TYPE string
            iv_path       TYPE string
            it_query      TYPE string_table
  RETURNING VALUE(rv_url) TYPE string.
`;

export const URL_RUNTIME_IMPL_ABAP = `* --- URL runtime (s4-cloud) ---
METHOD _encode_path.
  " Percent-encode a single path segment. OpenAPI style=simple with explode
  " toggled off is the only path style we emit, so a flat escape is enough.
  rv_encoded = cl_http_utility=>escape_url( iv_value ).
ENDMETHOD.

METHOD _serialize_query_param.
  " style=form with explode=true/false both collapse to name=value for
  " scalar types; array handling happens in the caller which invokes this
  " helper once per element. iv_style / iv_explode are kept for signature
  " stability across future emitter versions.
  DATA(lv_name)  = cl_http_utility=>escape_url( iv_name ).
  DATA(lv_value) = cl_http_utility=>escape_url( iv_value ).
  rv_qs = |{ lv_name }={ lv_value }|.
ENDMETHOD.

METHOD _join_url.
  " Concatenate server + path and append the query string (if any).
  " Separators are inserted deterministically so callers do not need to
  " know whether a query was already present.
  rv_url = |{ iv_server }{ iv_path }|.
  IF it_query IS NOT INITIAL.
    DATA lv_first TYPE abap_bool VALUE abap_true.
    rv_url = |{ rv_url }?|.
    LOOP AT it_query INTO DATA(lv_q).
      IF lv_first = abap_true.
        rv_url = |{ rv_url }{ lv_q }|.
        lv_first = abap_false.
      ELSE.
        rv_url = |{ rv_url }&{ lv_q }|.
      ENDIF.
    ENDLOOP.
  ENDIF.
ENDMETHOD.
`;
