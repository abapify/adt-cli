/**
 * s4-cloud JSON runtime snippet.
 *
 * Hand-rolled RFC-8259 tokenizer + minimal writer helpers. This exists
 * because /ui2/cl_json and xco_cp_json are not available on BTP Steampunk,
 * and we want a zero-dependency, deterministic, inline JSON runtime.
 *
 * Correctness-critical features:
 *   - strings with \\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t and \\uXXXX escapes,
 *     including UTF-16 surrogate pair handling for BMP-external code points,
 *   - numbers: optional leading '-', integer/fraction parts, scientific notation,
 *   - true / false / null literals,
 *   - whitespace skipping per RFC-8259 section 2.
 */

export const JSON_RUNTIME_DECL_ABAP = `* --- JSON runtime (s4-cloud, inline, no external JSON class) ---
TYPES: BEGIN OF ty_json_token,
         kind     TYPE string,
         str_val  TYPE string,
         num_val  TYPE decfloat34,
         bool_val TYPE abap_bool,
       END OF ty_json_token,
       ty_json_tokens TYPE STANDARD TABLE OF ty_json_token WITH DEFAULT KEY.

METHODS _json_tokenize
  IMPORTING iv_json          TYPE string
  RETURNING VALUE(rt_tokens) TYPE ty_json_tokens
  RAISING   cx_sy_conversion_no_number.

METHODS _json_escape
  IMPORTING iv_value  TYPE string
  RETURNING VALUE(rv) TYPE string.

METHODS _json_write_string
  IMPORTING iv_value  TYPE string
  CHANGING  ct_parts  TYPE string_table.

METHODS _json_write_number
  IMPORTING iv_value  TYPE decfloat34
  CHANGING  ct_parts  TYPE string_table.

METHODS _json_write_bool
  IMPORTING iv_value  TYPE abap_bool
  CHANGING  ct_parts  TYPE string_table.

METHODS _json_write_null
  CHANGING  ct_parts  TYPE string_table.

METHODS _json_concat
  IMPORTING it_parts  TYPE string_table
  RETURNING VALUE(rv) TYPE string.

METHODS _json_hex_to_int
  IMPORTING iv_hex    TYPE string
  RETURNING VALUE(rv) TYPE i.

METHODS _json_codepoint_to_string
  IMPORTING iv_code   TYPE i
  RETURNING VALUE(rv) TYPE string.
`;

export const JSON_RUNTIME_IMPL_ABAP = `* --- JSON runtime (s4-cloud, inline) ---
METHOD _json_escape.
  " Escape the characters that MUST be escaped inside a JSON string.
  " Order matters: backslash first, otherwise we'd double-escape the
  " backslashes inserted for quote and whitespace escapes.
  DATA(lv) = iv_value.
  REPLACE ALL OCCURRENCES OF \`\\\\\` IN lv WITH \`\\\\\\\\\`.
  REPLACE ALL OCCURRENCES OF \`"\` IN lv WITH \`\\\\"\`.
  REPLACE ALL OCCURRENCES OF cl_abap_char_utilities=>newline        IN lv WITH \`\\\\n\`.
  REPLACE ALL OCCURRENCES OF cl_abap_char_utilities=>horizontal_tab IN lv WITH \`\\\\t\`.
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
    APPEND \`true\` TO ct_parts.
  ELSE.
    APPEND \`false\` TO ct_parts.
  ENDIF.
ENDMETHOD.

METHOD _json_write_null.
  APPEND \`null\` TO ct_parts.
ENDMETHOD.

METHOD _json_concat.
  rv = concat_lines_of( table = it_parts sep = \`\` ).
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
    IF lv_c CA \`0123456789\`.
      lv_v = lv_c.
    ELSEIF lv_c = \`a\` OR lv_c = \`A\`.
      lv_v = 10.
    ELSEIF lv_c = \`b\` OR lv_c = \`B\`.
      lv_v = 11.
    ELSEIF lv_c = \`c\` OR lv_c = \`C\`.
      lv_v = 12.
    ELSEIF lv_c = \`d\` OR lv_c = \`D\`.
      lv_v = 13.
    ELSEIF lv_c = \`e\` OR lv_c = \`E\`.
      lv_v = 14.
    ELSEIF lv_c = \`f\` OR lv_c = \`F\`.
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
  rv = cl_abap_conv_codepage=>create_in( codepage = \`UTF-8\` )->convert( source = lv_x ).
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
    IF lv_ch = \` \`
       OR lv_ch = cl_abap_char_utilities=>horizontal_tab
       OR lv_ch = cl_abap_char_utilities=>newline
       OR lv_ch = cl_abap_char_utilities=>cr_lf(1).
      lv_pos = lv_pos + 1.
      CONTINUE.
    ENDIF.

    CLEAR ls_token.
    CASE lv_ch.
      WHEN \`{\`.
        ls_token-kind = \`object-start\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.
      WHEN \`}\`.
        ls_token-kind = \`object-end\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.
      WHEN \`[\`.
        ls_token-kind = \`array-start\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.
      WHEN \`]\`.
        ls_token-kind = \`array-end\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.
      WHEN \`:\`.
        ls_token-kind = \`colon\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.
      WHEN \`,\`.
        ls_token-kind = \`comma\`.
        APPEND ls_token TO rt_tokens.
        lv_pos = lv_pos + 1.

      WHEN \`"\`.
        " String literal: scan until the matching (unescaped) double quote.
        lv_pos = lv_pos + 1.
        CLEAR lv_buf.
        WHILE lv_pos < lv_len.
          lv_ch = iv_json+lv_pos(1).
          IF lv_ch = \`"\`.
            lv_pos = lv_pos + 1.
            EXIT.
          ELSEIF lv_ch = \`\\\\\`.
            " String escape loop: \\", \\\\, \\/, \\b, \\f, \\n, \\r, \\t, \\uXXXX.
            lv_pos = lv_pos + 1.
            lv_esc = iv_json+lv_pos(1).
            CASE lv_esc.
              WHEN \`"\`.
                lv_buf = lv_buf && \`"\`.
              WHEN \`\\\\\`.
                lv_buf = lv_buf && \`\\\\\`.
              WHEN \`/\`.
                lv_buf = lv_buf && \`/\`.
              WHEN \`b\`.
                lv_buf = lv_buf && cl_abap_char_utilities=>backspace.
              WHEN \`f\`.
                lv_buf = lv_buf && cl_abap_char_utilities=>form_feed.
              WHEN \`n\`.
                lv_buf = lv_buf && cl_abap_char_utilities=>newline.
              WHEN \`r\`.
                lv_buf = lv_buf && cl_abap_char_utilities=>cr_lf(1).
              WHEN \`t\`.
                lv_buf = lv_buf && cl_abap_char_utilities=>horizontal_tab.
              WHEN \`u\`.
                " \\uXXXX: parse 4 hex digits, decode UTF-16 surrogate pairs
                " so code points above U+FFFF survive the roundtrip.
                lv_pos = lv_pos + 1.
                lv_hex = iv_json+lv_pos(4).
                lv_code = _json_hex_to_int( lv_hex ).
                lv_pos = lv_pos + 3.
                IF lv_code >= 55296 AND lv_code <= 56319.
                  " UTF-16 surrogate pair handling: high surrogate followed
                  " by a low surrogate yields the actual code point.
                  lv_pos = lv_pos + 1.
                  IF iv_json+lv_pos(2) = \`\\\\u\`.
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
        ls_token-kind = \`string\`.
        ls_token-str_val = lv_buf.
        APPEND ls_token TO rt_tokens.

      WHEN \`t\`.
        IF lv_pos + 4 <= lv_len AND iv_json+lv_pos(4) = \`true\`.
          ls_token-kind = \`bool\`.
          ls_token-bool_val = abap_true.
          APPEND ls_token TO rt_tokens.
          lv_pos = lv_pos + 4.
        ELSE.
          lv_pos = lv_pos + 1.
        ENDIF.

      WHEN \`f\`.
        IF lv_pos + 5 <= lv_len AND iv_json+lv_pos(5) = \`false\`.
          ls_token-kind = \`bool\`.
          ls_token-bool_val = abap_false.
          APPEND ls_token TO rt_tokens.
          lv_pos = lv_pos + 5.
        ELSE.
          lv_pos = lv_pos + 1.
        ENDIF.

      WHEN \`n\`.
        IF lv_pos + 4 <= lv_len AND iv_json+lv_pos(4) = \`null\`.
          ls_token-kind = \`null\`.
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
        IF lv_ch = \`-\`.
          lv_pos = lv_pos + 1.
        ENDIF.
        WHILE lv_pos < lv_len.
          lv_ch = iv_json+lv_pos(1).
          IF lv_ch CA \`0123456789.eE+-\`.
            lv_pos = lv_pos + 1.
          ELSE.
            EXIT.
          ENDIF.
        ENDWHILE.
        lv_num_len = lv_pos - lv_num_start.
        lv_num_str = iv_json+lv_num_start(lv_num_len).
        lv_num_val = lv_num_str.
        ls_token-kind = \`number\`.
        ls_token-num_val = lv_num_val.
        APPEND ls_token TO rt_tokens.
    ENDCASE.
  ENDWHILE.
ENDMETHOD.
`;
