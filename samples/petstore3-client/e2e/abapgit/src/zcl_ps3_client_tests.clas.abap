CLASS zcl_ps3_client_tests DEFINITION PUBLIC FINAL CREATE PUBLIC FOR TESTING RISK LEVEL HARMLESS DURATION SHORT.
  PRIVATE SECTION.
    METHODS test_instantiation FOR TESTING RAISING cx_static_check.
    METHODS test_typed_pet     FOR TESTING RAISING cx_static_check.
    METHODS test_typed_order   FOR TESTING RAISING cx_static_check.
ENDCLASS.

CLASS zcl_ps3_client_tests IMPLEMENTATION.
  METHOD test_instantiation.
    DATA lo_client TYPE REF TO zcl_petstore3_client.
    lo_client = NEW zcl_petstore3_client( iv_destination = 'PETSTORE' ).
    cl_abap_unit_assert=>assert_bound(
      act = lo_client
      msg = 'zcl_petstore3_client constructor should bind an instance' ).
  ENDMETHOD.

  METHOD test_typed_pet.
    DATA ls_pet TYPE zcl_petstore3_client=>ty_ps3pet.
    ls_pet-name = |Rex|.
    ls_pet-status = |available|.
    cl_abap_unit_assert=>assert_equals(
      act = ls_pet-name
      exp = |Rex|
      msg = 'Pet.name must be writable and readable' ).
    cl_abap_unit_assert=>assert_equals(
      act = ls_pet-status
      exp = |available|
      msg = 'Pet.status must be writable and readable' ).
  ENDMETHOD.

  METHOD test_typed_order.
    DATA ls_order TYPE zcl_petstore3_client=>ty_ps3order.
    ls_order-id = 42.
    ls_order-quantity = 5.
    ls_order-complete = abap_true.
    cl_abap_unit_assert=>assert_equals(
      act = ls_order-id
      exp = CONV int8( 42 )
      msg = 'Order.id typed as int8' ).
    cl_abap_unit_assert=>assert_equals(
      act = ls_order-complete
      exp = abap_true
      msg = 'Order.complete typed as abap_bool' ).
  ENDMETHOD.
ENDCLASS.
