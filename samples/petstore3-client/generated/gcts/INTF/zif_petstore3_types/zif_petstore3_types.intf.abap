"! Generated types for ZCL_PETSTORE3.
INTERFACE ZIF_PETSTORE3_TYPES PUBLIC.
  "! @openapi-schema Order
  TYPES: BEGIN OF order,
    id        TYPE int8,
    pet_id    TYPE int8,
    quantity  TYPE i,
    ship_date TYPE timestampl,
    status    TYPE string,
    complete  TYPE abap_bool,
  END OF order.
  "! @openapi-schema Category
  TYPES: BEGIN OF category,
    id   TYPE int8,
    name TYPE string,
  END OF category.
  "! @openapi-schema User
  TYPES: BEGIN OF user,
    id          TYPE int8,
    username    TYPE string,
    first_name  TYPE string,
    last_name   TYPE string,
    email       TYPE string,
    password    TYPE string,
    phone       TYPE string,
    user_status TYPE i,
  END OF user.
  "! @openapi-schema Tag
  TYPES: BEGIN OF tag,
    id   TYPE int8,
    name TYPE string,
  END OF tag.
  "! @openapi-schema Pet
  TYPES: BEGIN OF pet,
    id         TYPE int8,
    name       TYPE string,
    category   TYPE category,
    photo_urls TYPE STANDARD TABLE OF string WITH EMPTY KEY,
    tags       TYPE STANDARD TABLE OF tag WITH EMPTY KEY,
    status     TYPE string,
  END OF pet.
  "! @openapi-schema ApiResponse
  TYPES: BEGIN OF api_response,
    code    TYPE i,
    type    TYPE string,
    message TYPE string,
  END OF api_response.
ENDINTERFACE.