CLASS zcl_ps3_client_tests DEFINITION PUBLIC FINAL CREATE PUBLIC FOR TESTING RISK LEVEL HARMLESS DURATION SHORT.
  PRIVATE SECTION.
    METHODS test_instantiation FOR TESTING RAISING cx_static_check.
    METHODS test_typed_pet     FOR TESTING RAISING cx_static_check.
    METHODS test_typed_order   FOR TESTING RAISING cx_static_check.
ENDCLASS.

CLASS zcl_ps3_client_tests IMPLEMENTATION.
  METHOD test_instantiation.
    DATA client TYPE REF TO zif_petstore3.
    client = NEW zcl_petstore3( destination = 'PETSTORE' ).
    cl_abap_unit_assert=>assert_bound(
      act = client
      msg = 'zcl_petstore3 constructor should bind a zif_petstore3 reference' ).
  ENDMETHOD.

  METHOD test_typed_pet.
    DATA pet TYPE zif_petstore3_types=>pet.
    pet-name   = |Rex|.
    pet-status = |available|.
    cl_abap_unit_assert=>assert_equals(
      act = pet-name exp = |Rex|
      msg = 'Pet.name must be writable and readable via the typed interface' ).
    cl_abap_unit_assert=>assert_equals(
      act = pet-status exp = |available|
      msg = 'Pet.status must be writable and readable' ).
  ENDMETHOD.

  METHOD test_typed_order.
    DATA order TYPE zif_petstore3_types=>order.
    order-id       = 42.
    order-quantity = 5.
    order-complete = abap_true.
    cl_abap_unit_assert=>assert_equals(
      act = order-id exp = CONV int8( 42 )
      msg = 'Order.id is typed as int8' ).
    cl_abap_unit_assert=>assert_equals(
      act = order-complete exp = abap_true
      msg = 'Order.complete is typed as abap_bool' ).
  ENDMETHOD.
ENDCLASS.
