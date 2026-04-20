INTERFACE zif_petstore3 PUBLIC.
  TYPES pet_list TYPE STANDARD TABLE OF zif_petstore3_types=>pet WITH DEFAULT KEY.
  TYPES string_list TYPE STANDARD TABLE OF string WITH DEFAULT KEY.
  TYPES user_list TYPE STANDARD TABLE OF zif_petstore3_types=>user WITH DEFAULT KEY.
  "! @openapi-operation addPet
  "! @openapi-path POST /pet
  "! Add a new pet to the store.
  METHODS add_pet
    IMPORTING body TYPE zif_petstore3_types=>pet
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
  "! @openapi-operation updatePet
  "! @openapi-path PUT /pet
  "! Update an existing pet.
  METHODS update_pet
    IMPORTING body TYPE zif_petstore3_types=>pet
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
  "! @openapi-operation findPetsByStatus
  "! @openapi-path GET /pet/findByStatus
  "! Finds Pets by status.
  METHODS find_pets_by_status
    IMPORTING status TYPE string
    RETURNING VALUE(pets) TYPE zif_petstore3=>pet_list
    RAISING zcx_petstore3_error.
  "! @openapi-operation findPetsByTags
  "! @openapi-path GET /pet/findByTags
  "! Finds Pets by tags.
  METHODS find_pets_by_tags
    IMPORTING tags TYPE zif_petstore3=>string_list
    RETURNING VALUE(pets) TYPE zif_petstore3=>pet_list
    RAISING zcx_petstore3_error.
  "! @openapi-operation getPetById
  "! @openapi-path GET /pet/{petId}
  "! Find pet by ID.
  METHODS get_pet_by_id
    IMPORTING pet_id TYPE int8
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
  "! @openapi-operation updatePetWithForm
  "! @openapi-path POST /pet/{petId}
  "! Updates a pet in the store with form data.
  METHODS update_pet_with_form
    IMPORTING
      pet_id TYPE int8
      name TYPE string OPTIONAL
      status TYPE string OPTIONAL
    RETURNING VALUE(pet) TYPE zif_petstore3_types=>pet
    RAISING zcx_petstore3_error.
  "! @openapi-operation deletePet
  "! @openapi-path DELETE /pet/{petId}
  "! Deletes a pet.
  METHODS delete_pet
    IMPORTING
      pet_id TYPE int8
      api_key TYPE string OPTIONAL
    RETURNING VALUE(success) TYPE abap_bool
    RAISING zcx_petstore3_error.
  "! @openapi-operation uploadFile
  "! @openapi-path POST /pet/{petId}/uploadImage
  "! Uploads an image.
  METHODS upload_file
    IMPORTING
      pet_id TYPE int8
      additional_metadata TYPE string OPTIONAL
      body TYPE xstring OPTIONAL
    RETURNING VALUE(api_response) TYPE zif_petstore3_types=>api_response
    RAISING zcx_petstore3_error.
  "! @openapi-operation getInventory
  "! @openapi-path GET /store/inventory
  "! Returns pet inventories by status.
  METHODS get_inventory
    RETURNING VALUE(result) TYPE string
    RAISING zcx_petstore3_error.
  "! @openapi-operation placeOrder
  "! @openapi-path POST /store/order
  "! Place an order for a pet.
  METHODS place_order
    IMPORTING body TYPE zif_petstore3_types=>order OPTIONAL
    RETURNING VALUE(order) TYPE zif_petstore3_types=>order
    RAISING zcx_petstore3_error.
  "! @openapi-operation getOrderById
  "! @openapi-path GET /store/order/{orderId}
  "! Find purchase order by ID.
  METHODS get_order_by_id
    IMPORTING order_id TYPE int8
    RETURNING VALUE(order) TYPE zif_petstore3_types=>order
    RAISING zcx_petstore3_error.
  "! @openapi-operation deleteOrder
  "! @openapi-path DELETE /store/order/{orderId}
  "! Delete purchase order by identifier.
  METHODS delete_order
    IMPORTING order_id TYPE int8
    RETURNING VALUE(success) TYPE abap_bool
    RAISING zcx_petstore3_error.
  "! @openapi-operation createUser
  "! @openapi-path POST /user
  "! Create user.
  METHODS create_user
    IMPORTING body TYPE zif_petstore3_types=>user OPTIONAL
    RETURNING VALUE(user) TYPE zif_petstore3_types=>user
    RAISING zcx_petstore3_error.
  "! @openapi-operation createUsersWithListInput
  "! @openapi-path POST /user/createWithList
  "! Creates list of users with given input array.
  METHODS create_users_with_list_input
    IMPORTING body TYPE zif_petstore3=>user_list OPTIONAL
    RETURNING VALUE(user) TYPE zif_petstore3_types=>user
    RAISING zcx_petstore3_error.
  "! @openapi-operation loginUser
  "! @openapi-path GET /user/login
  "! Logs user into the system.
  METHODS login_user
    IMPORTING
      username TYPE string OPTIONAL
      password TYPE string OPTIONAL
    RETURNING VALUE(result) TYPE string
    RAISING zcx_petstore3_error.
  "! @openapi-operation logoutUser
  "! @openapi-path GET /user/logout
  "! Logs out current logged in user session.
  METHODS logout_user
    RETURNING VALUE(success) TYPE abap_bool
    RAISING zcx_petstore3_error.
  "! @openapi-operation getUserByName
  "! @openapi-path GET /user/{username}
  "! Get user by user name.
  METHODS get_user_by_name
    IMPORTING username TYPE string
    RETURNING VALUE(user) TYPE zif_petstore3_types=>user
    RAISING zcx_petstore3_error.
  "! @openapi-operation updateUser
  "! @openapi-path PUT /user/{username}
  "! Update user resource.
  METHODS update_user
    IMPORTING
      username TYPE string
      body TYPE zif_petstore3_types=>user OPTIONAL
    RETURNING VALUE(success) TYPE abap_bool
    RAISING zcx_petstore3_error.
  "! @openapi-operation deleteUser
  "! @openapi-path DELETE /user/{username}
  "! Delete user resource.
  METHODS delete_user
    IMPORTING username TYPE string
    RETURNING VALUE(success) TYPE abap_bool
    RAISING zcx_petstore3_error.
ENDINTERFACE.