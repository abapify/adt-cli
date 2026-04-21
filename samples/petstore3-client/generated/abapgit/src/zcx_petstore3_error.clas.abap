CLASS ZCX_PETSTORE3_ERROR DEFINITION PUBLIC FINAL INHERITING FROM cx_static_check CREATE PUBLIC.
  PUBLIC SECTION.
    TYPES: BEGIN OF kv,
      k TYPE string,
      v TYPE string,
    END OF kv.
    TYPES kvs TYPE STANDARD TABLE OF kv WITH DEFAULT KEY.
    DATA status TYPE i READ-ONLY.
    DATA description TYPE string READ-ONLY.
    DATA body TYPE xstring READ-ONLY.
    DATA headers TYPE kvs READ-ONLY.
    METHODS constructor
      IMPORTING
        status TYPE i
        description TYPE string OPTIONAL
        body TYPE xstring OPTIONAL
        headers TYPE kvs OPTIONAL.
ENDCLASS.

CLASS ZCX_PETSTORE3_ERROR IMPLEMENTATION.
  METHOD constructor.
    super->constructor( ).
    me->status = status.
    me->description = description.
    me->body = body.
    me->headers = headers.
  ENDMETHOD.
ENDCLASS.