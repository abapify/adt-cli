CLASS ZCX_PETSTORE3_CLIENT_ERROR DEFINITION PUBLIC CREATE PUBLIC FINAL INHERITING FROM cx_static_check.
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