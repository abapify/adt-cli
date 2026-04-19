* Mock BAdI / ENHO source payload — TODO-synthetic.
* Real BAdI source lists impl handlers; SAP's exact payload shape
* was not captured because the BTP Trial blocks the endpoint (403).
CLASS lcl_badi_impl IMPLEMENTATION.
  METHOD if_badi_sample~do_something.
    " mock
  ENDMETHOD.
ENDCLASS.
