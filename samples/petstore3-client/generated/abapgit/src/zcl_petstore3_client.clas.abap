CLASS ZCL_PETSTORE3_CLIENT DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    CONSTANTS co_server_0 TYPE string VALUE '/api/v3'.
    METHODS constructor
      IMPORTING
        iv_server TYPE string DEFAULT co_server_0
        iv_destination TYPE string OPTIONAL
        iv_api_key_api_key TYPE string OPTIONAL.
    METHODS add_pet
      IMPORTING is_body TYPE ty_ps3pet
      RETURNING VALUE(rv_result) TYPE ty_ps3pet
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS update_pet
      IMPORTING is_body TYPE ty_ps3pet
      RETURNING VALUE(rv_result) TYPE ty_ps3pet
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS find_pets_by_status
      IMPORTING iv_status TYPE string
      RETURNING VALUE(rv_result) TYPE ty_find_pets_by_status_rv_result_tab
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS find_pets_by_tags
      IMPORTING iv_tags TYPE ty_find_pets_by_tags_iv_tags_tab
      RETURNING VALUE(rv_result) TYPE ty_find_pets_by_tags_rv_result_tab
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS get_pet_by_id
      IMPORTING iv_pet_id TYPE int8
      RETURNING VALUE(rv_result) TYPE ty_ps3pet
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS update_pet_with_form
      IMPORTING
        iv_pet_id TYPE int8
        iv_name TYPE string OPTIONAL
        iv_status TYPE string OPTIONAL
      RETURNING VALUE(rv_result) TYPE ty_ps3pet
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS delete_pet
      IMPORTING
        iv_api_key TYPE string OPTIONAL
        iv_pet_id TYPE int8
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS upload_file
      IMPORTING
        iv_pet_id TYPE int8
        iv_additional_metadata TYPE string OPTIONAL
        is_body TYPE xstring OPTIONAL
      RETURNING VALUE(rv_result) TYPE ty_ps3api_response
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS get_inventory
      RETURNING VALUE(rv_result) TYPE string
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS place_order
      IMPORTING is_body TYPE ty_ps3order OPTIONAL
      RETURNING VALUE(rv_result) TYPE ty_ps3order
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS get_order_by_id
      IMPORTING iv_order_id TYPE int8
      RETURNING VALUE(rv_result) TYPE ty_ps3order
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS delete_order
      IMPORTING iv_order_id TYPE int8
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS create_user
      IMPORTING is_body TYPE ty_ps3user OPTIONAL
      RETURNING VALUE(rv_result) TYPE ty_ps3user
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS create_users_with_list_input
      IMPORTING is_body TYPE ty_create_users_with_list_input_body_tab OPTIONAL
      RETURNING VALUE(rv_result) TYPE ty_ps3user
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS login_user
      IMPORTING
        iv_username TYPE string OPTIONAL
        iv_password TYPE string OPTIONAL
      RETURNING VALUE(rv_result) TYPE string
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS logout_user
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS get_user_by_name
      IMPORTING iv_username TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3user
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS update_user
      IMPORTING
        iv_username TYPE string
        is_body TYPE ty_ps3user OPTIONAL
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
    METHODS delete_user
      IMPORTING iv_username TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool
      RAISING ZCX_PETSTORE3_CLIENT_ERROR.
  PROTECTED SECTION.
    DATA mv_server TYPE string.
    DATA mv_destination TYPE string.
    DATA mv_api_key_api_key TYPE string.
    METHODS on_authorize
      IMPORTING io_request TYPE REF TO if_web_http_request.
  PRIVATE SECTION.
    TYPES: BEGIN OF ty_ps3order,
      id        TYPE int8,
      pet_id    TYPE int8,
      quantity  TYPE i,
      ship_date TYPE timestampl,
      status    TYPE string,
      complete  TYPE abap_bool,
    END OF ty_ps3order.
    TYPES: BEGIN OF ty_ps3category,
      id   TYPE int8,
      name TYPE string,
    END OF ty_ps3category.
    TYPES: BEGIN OF ty_ps3user,
      id          TYPE int8,
      username    TYPE string,
      first_name  TYPE string,
      last_name   TYPE string,
      email       TYPE string,
      password    TYPE string,
      phone       TYPE string,
      user_status TYPE i,
    END OF ty_ps3user.
    TYPES: BEGIN OF ty_ps3tag,
      id   TYPE int8,
      name TYPE string,
    END OF ty_ps3tag.
    TYPES ty_ps3pet__photo_urls_tab TYPE STANDARD TABLE OF string WITH DEFAULT KEY.
    TYPES ty_ps3pet__tags_tab TYPE STANDARD TABLE OF ty_ps3tag WITH DEFAULT KEY.
    TYPES: BEGIN OF ty_ps3pet,
      id         TYPE int8,
      name       TYPE string,
      category   TYPE ty_ps3category,
      photo_urls TYPE ty_ps3pet__photo_urls_tab,
      tags       TYPE ty_ps3pet__tags_tab,
      status     TYPE string,
    END OF ty_ps3pet.
    TYPES: BEGIN OF ty_ps3api_response,
      code    TYPE i,
      type    TYPE string,
      message TYPE string,
    END OF ty_ps3api_response.
    TYPES ty_find_pets_by_status_rv_result_tab TYPE STANDARD TABLE OF ty_ps3pet WITH DEFAULT KEY.
    TYPES ty_find_pets_by_tags_iv_tags_tab TYPE STANDARD TABLE OF string WITH DEFAULT KEY.
    TYPES ty_find_pets_by_tags_rv_result_tab TYPE STANDARD TABLE OF ty_ps3pet WITH DEFAULT KEY.
    TYPES ty_create_users_with_list_input_body_tab TYPE STANDARD TABLE OF ty_ps3user WITH DEFAULT KEY.
    METHODS _des_add_pet
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3pet.
    METHODS _ser_add_pet
      IMPORTING is_body TYPE ty_ps3pet
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_update_pet
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3pet.
    METHODS _ser_update_pet
      IMPORTING is_body TYPE ty_ps3pet
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_find_pets_by_status
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_find_pets_by_status_rv_result_tab.
    METHODS _des_find_pets_by_tags
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_find_pets_by_tags_rv_result_tab.
    METHODS _des_get_pet_by_id
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3pet.
    METHODS _des_update_pet_with_form
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3pet.
    METHODS _des_delete_pet
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool.
    METHODS _des_upload_file
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3api_response.
    METHODS _ser_upload_file
      IMPORTING is_body TYPE xstring
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_get_inventory
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE string.
    METHODS _des_place_order
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3order.
    METHODS _ser_place_order
      IMPORTING is_body TYPE ty_ps3order
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_get_order_by_id
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3order.
    METHODS _des_delete_order
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool.
    METHODS _des_create_user
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3user.
    METHODS _ser_create_user
      IMPORTING is_body TYPE ty_ps3user
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_create_users_with_list_input
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3user.
    METHODS _ser_create_users_with_list_input
      IMPORTING is_body TYPE ty_create_users_with_list_input_body_tab
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_login_user
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE string.
    METHODS _des_logout_user
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool.
    METHODS _des_get_user_by_name
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_result) TYPE ty_ps3user.
    METHODS _des_update_user
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool.
    METHODS _ser_update_user
      IMPORTING is_body TYPE ty_ps3user
      RETURNING VALUE(rv_json) TYPE string.
    METHODS _des_delete_user
      IMPORTING iv_payload TYPE string
      RETURNING VALUE(rv_success) TYPE abap_bool.
    METHODS _runtime_stub.
ENDCLASS.

CLASS ZCL_PETSTORE3_CLIENT IMPLEMENTATION.
  METHOD constructor.
    me->mv_server = iv_server.
    me->mv_destination = iv_destination.
    me->mv_api_key_api_key = iv_api_key_api_key.
  ENDMETHOD.

  METHOD on_authorize.
    " override me
    RETURN.
  ENDMETHOD.

  METHOD add_pet.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet|.
    lv_body = me->_ser_add_pet( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_add_pet( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD update_pet.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet|.
    lv_body = me->_ser_update_pet( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>put
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_update_pet( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD find_pets_by_status.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/findByStatus|.
    APPEND me->_serialize_query_param(
  iv_name = 'status'
  iv_value = |{ iv_status }|
  iv_style = 'form'
  iv_explode = abap_true
) TO lt_query.
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_find_pets_by_status( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD find_pets_by_tags.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/findByTags|.
    APPEND me->_serialize_query_param(
  iv_name = 'tags'
  iv_value = |{ iv_tags }|
  iv_style = 'form'
  iv_explode = abap_true
) TO lt_query.
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_find_pets_by_tags( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD get_pet_by_id.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/{ me->_encode_path( iv_value = iv_pet_id ) }|.
    lo_req->set_header_field( i_name = 'api_key' i_value = mv_api_key_api_key ).
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_get_pet_by_id( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD update_pet_with_form.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/{ me->_encode_path( iv_value = iv_pet_id ) }|.
    APPEND me->_serialize_query_param(
  iv_name = 'name'
  iv_value = |{ iv_name }|
  iv_style = 'form'
  iv_explode = abap_false
) TO lt_query.
    APPEND me->_serialize_query_param(
  iv_name = 'status'
  iv_value = |{ iv_status }|
  iv_style = 'form'
  iv_explode = abap_false
) TO lt_query.
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_update_pet_with_form( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD delete_pet.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/{ me->_encode_path( iv_value = iv_pet_id ) }|.
    lo_req->set_header_field( i_name = 'api_key' i_value = |{ iv_api_key }| ).
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>delete
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_success = abap_true.
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD upload_file.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/pet/{ me->_encode_path( iv_value = iv_pet_id ) }/uploadImage|.
    APPEND me->_serialize_query_param(
  iv_name = 'additionalMetadata'
  iv_value = |{ iv_additional_metadata }|
  iv_style = 'form'
  iv_explode = abap_false
) TO lt_query.
    lo_req->set_binary( i_data = is_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/octet-stream'
                             ).
    me->on_authorize( io_request = lo_req ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_upload_file( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD get_inventory.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/store/inventory|.
    lo_req->set_header_field( i_name = 'api_key' i_value = mv_api_key_api_key ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_get_inventory( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD place_order.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/store/order|.
    lv_body = me->_ser_place_order( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_place_order( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD get_order_by_id.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/store/order/{ me->_encode_path( iv_value = iv_order_id ) }|.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_get_order_by_id( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD delete_order.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/store/order/{ me->_encode_path( iv_value = iv_order_id ) }|.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>delete
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_success = abap_true.
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD create_user.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user|.
    lv_body = me->_ser_create_user( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_create_user( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD create_users_with_list_input.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/createWithList|.
    lv_body = me->_ser_create_users_with_list_input( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>post
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_create_users_with_list_input( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD login_user.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/login|.
    APPEND me->_serialize_query_param(
  iv_name = 'username'
  iv_value = |{ iv_username }|
  iv_style = 'form'
  iv_explode = abap_false
) TO lt_query.
    APPEND me->_serialize_query_param(
  iv_name = 'password'
  iv_value = |{ iv_password }|
  iv_style = 'form'
  iv_explode = abap_false
) TO lt_query.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_login_user( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD logout_user.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/logout|.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_success = abap_true.
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD get_user_by_name.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/{ me->_encode_path( iv_value = iv_username ) }|.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>get
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_result = me->_des_get_user_by_name( iv_payload = lv_payload ).
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD update_user.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/{ me->_encode_path( iv_value = iv_username ) }|.
    lv_body = me->_ser_update_user( is_body = is_body ).
    lo_req->set_text( i_text = lv_body ).
    lo_req->set_header_field(
                               i_name = 'content-type'
                               i_value = 'application/json'
                             ).
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>put
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_success = abap_true.
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD delete_user.
    DATA lo_client TYPE REF TO if_web_http_client.
    DATA lo_req TYPE REF TO if_web_http_request.
    DATA lo_resp TYPE REF TO if_web_http_response.
    DATA lv_url TYPE string.
    DATA lv_path TYPE string.
    DATA lv_body TYPE string.
    DATA lv_status TYPE i.
    DATA lv_payload TYPE string.
    DATA lt_query TYPE string_table.
    lo_client = me->_build_client( iv_destination = mv_destination ).
    lo_req = lo_client->get_http_request( ).
    lv_path = |/user/{ me->_encode_path( iv_value = iv_username ) }|.
    lv_url = me->_join_url( iv_server = mv_server iv_path = lv_path it_query = lt_query ).
    lo_req->set_uri( i_uri = lv_url ).
    lo_resp = me->_send_request(
  io_client = lo_client
  io_request = lo_req
  iv_method = if_web_http_client=>delete
).
    lv_status = lo_resp->get_status( )-code.
    lv_payload = lo_resp->get_text( ).
    IF lv_status >= 200 AND lv_status < 300.
      rv_success = abap_true.
      RETURN.
    ENDIF.
    RAISE EXCEPTION NEW ZCX_PETSTORE3_CLIENT_ERROR(
                                                     iv_status = lv_status
                                                     iv_payload = lv_payload
                                                   ).
  ENDMETHOD.

  METHOD _des_add_pet.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_add_pet.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_update_pet.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_update_pet.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_find_pets_by_status.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_find_pets_by_tags.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_get_pet_by_id.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_update_pet_with_form.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_delete_pet.
    " TODO: implement JSON → target deserialization if this endpoint ever
    " returns a payload. For now this is an empty-body success: rv_success = abap_true.
    rv_success = abap_true.
    RETURN.
  ENDMETHOD.

  METHOD _des_upload_file.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_upload_file.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_get_inventory.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_place_order.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_place_order.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_get_order_by_id.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_delete_order.
    " TODO: implement JSON → target deserialization if this endpoint ever
    " returns a payload. For now this is an empty-body success: rv_success = abap_true.
    rv_success = abap_true.
    RETURN.
  ENDMETHOD.

  METHOD _des_create_user.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_create_user.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_create_users_with_list_input.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _ser_create_users_with_list_input.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_login_user.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_logout_user.
    " TODO: implement JSON → target deserialization if this endpoint ever
    " returns a payload. For now this is an empty-body success: rv_success = abap_true.
    rv_success = abap_true.
    RETURN.
  ENDMETHOD.

  METHOD _des_get_user_by_name.
    " TODO: implement JSON → target deserialization using private _json_tokenize.
    " For now rv_result is returned with its initial value so the class activates cleanly.
    CLEAR rv_result.
    RETURN.
  ENDMETHOD.

  METHOD _des_update_user.
    " TODO: implement JSON → target deserialization if this endpoint ever
    " returns a payload. For now this is an empty-body success: rv_success = abap_true.
    rv_success = abap_true.
    RETURN.
  ENDMETHOD.

  METHOD _ser_update_user.
    " TODO: implement target → JSON serialization using private _json_write_* helpers.
    " For now rv_json is returned empty so the class activates cleanly.
    CLEAR rv_json.
    RETURN.
  ENDMETHOD.

  METHOD _des_delete_user.
    " TODO: implement JSON → target deserialization if this endpoint ever
    " returns a payload. For now this is an empty-body success: rv_success = abap_true.
    rv_success = abap_true.
    RETURN.
  ENDMETHOD.

  METHOD _runtime_stub.
    " --- HTTP runtime (s4-cloud) ---
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

    " --- URL runtime (s4-cloud) ---
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

    " --- JSON runtime (s4-cloud, inline) ---
    METHOD _json_escape.
      " Escape the characters that MUST be escaped inside a JSON string.
      " Order matters: backslash first, otherwise we'd double-escape the
      " backslashes inserted for quote and whitespace escapes.
      DATA(lv) = iv_value.
      REPLACE ALL OCCURRENCES OF `\\` IN lv WITH `\\\\`.
      REPLACE ALL OCCURRENCES OF `"` IN lv WITH `\\"`.
      REPLACE ALL OCCURRENCES OF cl_abap_char_utilities=>newline        IN lv WITH `\\n`.
      REPLACE ALL OCCURRENCES OF cl_abap_char_utilities=>horizontal_tab IN lv WITH `\\t`.
      rv = lv.
    ENDMETHOD.

    METHOD _json_write_string.
      APPEND |"{ _json_escape( iv_value ) }"| TO ct_parts.
    ENDMETHOD.

    METHOD _json_write_number.
      APPEND |{ iv_value }| TO ct_parts.
    ENDMETHOD.

    METHOD _json_write_bool.
      IF iv_value = abap_true.
        APPEND `true` TO ct_parts.
      ELSE.
        APPEND `false` TO ct_parts.
      ENDIF.
    ENDMETHOD.

    METHOD _json_write_null.
      APPEND `null` TO ct_parts.
    ENDMETHOD.

    METHOD _json_concat.
      rv = concat_lines_of( table = it_parts sep = `` ).
    ENDMETHOD.

    METHOD _json_hex_to_int.
      DATA: lv_i   TYPE i VALUE 0,
            lv_len TYPE i,
            lv_c   TYPE c LENGTH 1,
            lv_v   TYPE i.
      rv = 0.
      lv_len = strlen( iv_hex ).
      WHILE lv_i < lv_len.
        lv_c = iv_hex+lv_i(1).
        IF lv_c CA `0123456789`.
          lv_v = lv_c.
        ELSEIF lv_c = `a` OR lv_c = `A`.
          lv_v = 10.
        ELSEIF lv_c = `b` OR lv_c = `B`.
          lv_v = 11.
        ELSEIF lv_c = `c` OR lv_c = `C`.
          lv_v = 12.
        ELSEIF lv_c = `d` OR lv_c = `D`.
          lv_v = 13.
        ELSEIF lv_c = `e` OR lv_c = `E`.
          lv_v = 14.
        ELSEIF lv_c = `f` OR lv_c = `F`.
          lv_v = 15.
        ENDIF.
        rv = rv * 16 + lv_v.
        lv_i = lv_i + 1.
      ENDWHILE.
    ENDMETHOD.

    METHOD _json_codepoint_to_string.
      " Build the UTF-8 byte sequence for iv_code and convert it to a string
      " via cl_abap_conv_codepage. This is the only approved codepage helper
      " on BTP Steampunk.
      DATA: lv_x    TYPE xstring,
            lv_byte TYPE x LENGTH 1,
            lv_cp   TYPE i.
      lv_cp = iv_code.
      IF lv_cp < 128.
        lv_byte = lv_cp.
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
      ELSEIF lv_cp < 2048.
        lv_byte = 192 + ( lv_cp DIV 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( lv_cp MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
      ELSEIF lv_cp < 65536.
        lv_byte = 224 + ( lv_cp DIV 4096 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( ( lv_cp DIV 64 ) MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( lv_cp MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
      ELSE.
        lv_byte = 240 + ( lv_cp DIV 262144 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( ( lv_cp DIV 4096 ) MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( ( lv_cp DIV 64 ) MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
        lv_byte = 128 + ( lv_cp MOD 64 ).
        CONCATENATE lv_x lv_byte INTO lv_x IN BYTE MODE.
      ENDIF.
      rv = cl_abap_conv_codepage=>create_in( codepage = `UTF-8` )->convert( source = lv_x ).
    ENDMETHOD.

    METHOD _json_tokenize.
      " Single-pass tokenizer. We deliberately avoid regex here: ABAP regex
      " semantics around backtracking in decoder corner cases are subtle, and
      " a hand-written scanner keeps memory bounded to O(n).
      DATA: lv_len       TYPE i,
            lv_pos       TYPE i VALUE 0,
            lv_ch        TYPE c LENGTH 1,
            ls_token     TYPE ty_json_token,
            lv_buf       TYPE string,
            lv_esc       TYPE c LENGTH 1,
            lv_hex       TYPE string,
            lv_code      TYPE i,
            lv_code2     TYPE i,
            lv_char      TYPE string,
            lv_num_start TYPE i,
            lv_num_len   TYPE i,
            lv_num_str   TYPE string,
            lv_num_val   TYPE decfloat34.

      lv_len = strlen( iv_json ).
      WHILE lv_pos < lv_len.
        lv_ch = iv_json+lv_pos(1).

        " Whitespace: space, tab, LF, CR per RFC-8259 section 2.
        IF lv_ch = ` `
           OR lv_ch = cl_abap_char_utilities=>horizontal_tab
           OR lv_ch = cl_abap_char_utilities=>newline
           OR lv_ch = cl_abap_char_utilities=>cr_lf(1).
          lv_pos = lv_pos + 1.
          CONTINUE.
        ENDIF.

        CLEAR ls_token.
        CASE lv_ch.
          WHEN `{`.
            ls_token-kind = `object-start`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.
          WHEN `}`.
            ls_token-kind = `object-end`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.
          WHEN `[`.
            ls_token-kind = `array-start`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.
          WHEN `]`.
            ls_token-kind = `array-end`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.
          WHEN `:`.
            ls_token-kind = `colon`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.
          WHEN `,`.
            ls_token-kind = `comma`.
            APPEND ls_token TO rt_tokens.
            lv_pos = lv_pos + 1.

          WHEN `"`.
            " String literal: scan until the matching (unescaped) double quote.
            lv_pos = lv_pos + 1.
            CLEAR lv_buf.
            WHILE lv_pos < lv_len.
              lv_ch = iv_json+lv_pos(1).
              IF lv_ch = `"`.
                lv_pos = lv_pos + 1.
                EXIT.
              ELSEIF lv_ch = `\\`.
                " String escape loop: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX.
                lv_pos = lv_pos + 1.
                lv_esc = iv_json+lv_pos(1).
                CASE lv_esc.
                  WHEN `"`.
                    lv_buf = lv_buf && `"`.
                  WHEN `\\`.
                    lv_buf = lv_buf && `\\`.
                  WHEN `/`.
                    lv_buf = lv_buf && `/`.
                  WHEN `b`.
                    lv_buf = lv_buf && cl_abap_char_utilities=>backspace.
                  WHEN `f`.
                    lv_buf = lv_buf && cl_abap_char_utilities=>form_feed.
                  WHEN `n`.
                    lv_buf = lv_buf && cl_abap_char_utilities=>newline.
                  WHEN `r`.
                    lv_buf = lv_buf && cl_abap_char_utilities=>cr_lf(1).
                  WHEN `t`.
                    lv_buf = lv_buf && cl_abap_char_utilities=>horizontal_tab.
                  WHEN `u`.
                    " \uXXXX: parse 4 hex digits, decode UTF-16 surrogate pairs
                    " so code points above U+FFFF survive the roundtrip.
                    lv_pos = lv_pos + 1.
                    lv_hex = iv_json+lv_pos(4).
                    lv_code = _json_hex_to_int( lv_hex ).
                    lv_pos = lv_pos + 3.
                    IF lv_code >= 55296 AND lv_code <= 56319.
                      " UTF-16 surrogate pair handling: high surrogate followed
                      " by a low surrogate yields the actual code point.
                      lv_pos = lv_pos + 1.
                      IF iv_json+lv_pos(2) = `\\u`.
                        lv_pos = lv_pos + 2.
                        lv_hex = iv_json+lv_pos(4).
                        lv_code2 = _json_hex_to_int( lv_hex ).
                        lv_pos = lv_pos + 3.
                        lv_code = ( lv_code - 55296 ) * 1024 + ( lv_code2 - 56320 ) + 65536.
                      ELSE.
                        lv_pos = lv_pos - 1.
                      ENDIF.
                    ENDIF.
                    lv_char = _json_codepoint_to_string( lv_code ).
                    lv_buf = lv_buf && lv_char.
                  WHEN OTHERS.
                    lv_buf = lv_buf && lv_esc.
                ENDCASE.
                lv_pos = lv_pos + 1.
              ELSE.
                lv_buf = lv_buf && lv_ch.
                lv_pos = lv_pos + 1.
              ENDIF.
            ENDWHILE.
            ls_token-kind = `string`.
            ls_token-str_val = lv_buf.
            APPEND ls_token TO rt_tokens.

          WHEN `t`.
            IF lv_pos + 4 <= lv_len AND iv_json+lv_pos(4) = `true`.
              ls_token-kind = `bool`.
              ls_token-bool_val = abap_true.
              APPEND ls_token TO rt_tokens.
              lv_pos = lv_pos + 4.
            ELSE.
              lv_pos = lv_pos + 1.
            ENDIF.

          WHEN `f`.
            IF lv_pos + 5 <= lv_len AND iv_json+lv_pos(5) = `false`.
              ls_token-kind = `bool`.
              ls_token-bool_val = abap_false.
              APPEND ls_token TO rt_tokens.
              lv_pos = lv_pos + 5.
            ELSE.
              lv_pos = lv_pos + 1.
            ENDIF.

          WHEN `n`.
            IF lv_pos + 4 <= lv_len AND iv_json+lv_pos(4) = `null`.
              ls_token-kind = `null`.
              APPEND ls_token TO rt_tokens.
              lv_pos = lv_pos + 4.
            ELSE.
              lv_pos = lv_pos + 1.
            ENDIF.

          WHEN OTHERS.
            " Number literal: [-]digits[.digits][eE[+-]digits]. We do exponent
            " parsing in-place by consuming any character that could legally be
            " part of a numeric token; the final conversion validates it.
            lv_num_start = lv_pos.
            IF lv_ch = `-`.
              lv_pos = lv_pos + 1.
            ENDIF.
            WHILE lv_pos < lv_len.
              lv_ch = iv_json+lv_pos(1).
              IF lv_ch CA `0123456789.eE+-`.
                lv_pos = lv_pos + 1.
              ELSE.
                EXIT.
              ENDIF.
            ENDWHILE.
            lv_num_len = lv_pos - lv_num_start.
            lv_num_str = iv_json+lv_num_start(lv_num_len).
            lv_num_val = lv_num_str.
            ls_token-kind = `number`.
            ls_token-num_val = lv_num_val.
            APPEND ls_token TO rt_tokens.
        ENDCASE.
      ENDWHILE.
    ENDMETHOD.

  ENDMETHOD.
ENDCLASS.

CLASS ZCX_PETSTORE3_CLIENT_ERROR DEFINITION FINAL INHERITING FROM cx_static_check.
  PUBLIC SECTION.
    DATA mv_status TYPE i READ-ONLY.
    DATA mv_payload TYPE string READ-ONLY.
    METHODS constructor
      IMPORTING
        iv_status TYPE i
        iv_payload TYPE string.
ENDCLASS.

CLASS ZCX_PETSTORE3_CLIENT_ERROR IMPLEMENTATION.
  METHOD constructor.
    super->constructor( ).
    me->mv_status = iv_status.
    me->mv_payload = iv_payload.
  ENDMETHOD.
ENDCLASS.