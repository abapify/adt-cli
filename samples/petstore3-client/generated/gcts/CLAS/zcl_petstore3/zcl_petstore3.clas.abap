CLASS ZCL_PETSTORE3 DEFINITION PUBLIC CREATE PUBLIC.
  PUBLIC SECTION.
    INTERFACES zif_petstore3.
    METHODS constructor
      IMPORTING
        destination TYPE string
        server TYPE string DEFAULT '/api/v3'.
  PRIVATE SECTION.
    DATA client TYPE REF TO lcl_http.
ENDCLASS.

CLASS ZCL_PETSTORE3 IMPLEMENTATION.
  METHOD constructor.
    client = NEW lcl_http( destination = destination server = server ).
  ENDMETHOD.

  METHOD zif_petstore3~add_pet.
    TRY.
    DATA(response) = client->fetch(
      method  = 'POST'
      path    = '/pet'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pet ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid input'
          body        = response->body( ) ).
      WHEN 422.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 422
          description = 'Validation exception'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~update_pet.
    TRY.
    DATA(response) = client->fetch(
      method  = 'PUT'
      path    = '/pet'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pet ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid ID supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'Pet not found'
          body        = response->body( ) ).
      WHEN 422.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 422
          description = 'Validation exception'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~find_pets_by_status.
    TRY.
    DATA(response) = client->fetch(
      method = 'GET'
      path   = '/pet/findByStatus'
      query  = VALUE #( ( name = 'status' value = status ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pets ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid status value'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~find_pets_by_tags.
    TRY.
    DATA(response) = client->fetch(
      method = 'GET'
      path   = '/pet/findByTags'
      query  = VALUE #( FOR _tags IN tags ( name = 'tags' value = _tags ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pets ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid tag value'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~get_pet_by_id.
    TRY.
    DATA(response) = client->fetch( method = 'GET' path = |/pet/{ pet_id }| ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pet ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid ID supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'Pet not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~update_pet_with_form.
    TRY.
    DATA(response) = client->fetch(
      method = 'POST'
      path   = |/pet/{ pet_id }|
      query  = VALUE #( ( name = 'name' value = name ) ( name = 'status' value = status ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( pet ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid input'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~delete_pet.
    TRY.
    DATA(response) = client->fetch(
      method  = 'DELETE'
      path    = |/pet/{ pet_id }|
      headers = VALUE #( ( name = 'api_key' value = api_key ) ) ).
    CASE response->status( ).
      WHEN 200.
        success = abap_true.
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid pet value'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~upload_file.
    TRY.
    DATA(response) = client->fetch(
      method = 'POST'
      path   = |/pet/{ pet_id }/uploadImage|
      query  = VALUE #( ( name = 'additionalMetadata' value = additional_metadata ) )
      binary = body ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( api_response ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'No file uploaded'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'Pet not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~get_inventory.
    TRY.
    DATA(response) = client->fetch( method = 'GET' path = '/store/inventory' ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( result ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~place_order.
    TRY.
    DATA(response) = client->fetch(
      method  = 'POST'
      path    = '/store/order'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( order ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid input'
          body        = response->body( ) ).
      WHEN 422.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 422
          description = 'Validation exception'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~get_order_by_id.
    TRY.
    DATA(response) = client->fetch( method = 'GET' path = |/store/order/{ order_id }| ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( order ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid ID supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'Order not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~delete_order.
    TRY.
    DATA(response) = client->fetch( method = 'DELETE' path = |/store/order/{ order_id }| ).
    CASE response->status( ).
      WHEN 200.
        success = abap_true.
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid ID supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'Order not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~create_user.
    TRY.
    DATA(response) = client->fetch(
      method  = 'POST'
      path    = '/user'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( user ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~create_users_with_list_input.
    TRY.
    DATA(response) = client->fetch(
      method  = 'POST'
      path    = '/user/createWithList'
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( user ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~login_user.
    TRY.
    DATA(response) = client->fetch(
      method = 'GET'
      path   = '/user/login'
      query  = VALUE #( ( name = 'username' value = username ) ( name = 'password' value = password ) ) ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( result ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid username/password supplied'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~logout_user.
    TRY.
    DATA(response) = client->fetch( method = 'GET' path = '/user/logout' ).
    CASE response->status( ).
      WHEN 200.
        success = abap_true.
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~get_user_by_name.
    TRY.
    DATA(response) = client->fetch( method = 'GET' path = |/user/{ username }| ).
    CASE response->status( ).
      WHEN 200.
        json=>parse( response->body( ) )->to( REF #( user ) ).
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid username supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'User not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~update_user.
    TRY.
    DATA(response) = client->fetch(
      method  = 'PUT'
      path    = |/user/{ username }|
      body    = json=>stringify( body )
      headers = VALUE #( ( name = 'Content-Type' value = 'application/json' ) ) ).
    CASE response->status( ).
      WHEN 200.
        success = abap_true.
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'bad request'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'user not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.

  METHOD zif_petstore3~delete_user.
    TRY.
    DATA(response) = client->fetch( method = 'DELETE' path = |/user/{ username }| ).
    CASE response->status( ).
      WHEN 200.
        success = abap_true.
      WHEN 400.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 400
          description = 'Invalid username supplied'
          body        = response->body( ) ).
      WHEN 404.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 404
          description = 'User not found'
          body        = response->body( ) ).
      WHEN OTHERS.
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = response->status( )
          description = 'Unexpected error'
          body        = response->body( ) ).
    ENDCASE.
      CATCH cx_web_http_client_error cx_http_dest_provider_error INTO DATA(_http_err).
        RAISE EXCEPTION NEW zcx_petstore3_error(
          status      = 0
          description = _http_err->get_text( ) ).
    ENDTRY.
  ENDMETHOD.
ENDCLASS.