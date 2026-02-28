# @abapify/asjson-parser

[![npm](https://img.shields.io/npm/v/%40abapify%2Fasjson-parser)](https://www.npmjs.com/package/@abapify/asjson-parser)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](../../LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/)

ABAP asJSON (canonical JSON representation) parser.

[asJSON](https://help.sap.com/doc/abapdocu_latest_index_htm/latest/en-US/index.htm?file=abenabap_asjson.htm) - Canonical JSON Representation

General asJSON format is based on `%heap` object delivering values and type metadata

So when we have a code like this:

```abap
REPORT ZTEST_HEAP.

start-of-selection.

types:
  begin of payload_ts,
    i type i,
    i_ref type ref to i,
  end of payload_ts.


  data(payload) = value payload_ts(
    i = 123
    i_ref = new #( 123 )
  ).

  data(json) = cl_sxml_string_writer=>create( if_sxml=>co_xt_json ).

  call transformation id
  source data = payload
        result xml json.

  cl_demo_output=>display_json( json = json->get_output( ) ).
```

the output it generates will be:

```json
{
 "DATA":
 {
  "I":123,
  "I_REF":
  {
   "%ref":"#d1"
  }
 },
 "%heap":
 {
  "d1":
  {
   "%type":"xsd:int",
   "%val":123
  }
 }
```

The following library allows us to parse this payload as if we would deal with a regular ABAP object without data references

The code below

```ts
import { parse } from '@abapify/asjson-parser';
const parser;
console.log(parse(json));
```

would print the object like this:

```json
{
 "DATA":
 {
  "I":123,
  "I_REF": 123
 }
```

## Usage

- as a parser

```ts
import { parse } from '@abapify/asjson-parser';
console.log(parse(json));
```

- as a transformer

```ts
import { transform } from '@abapify/asjson-parser';
const object = JSON.parse(json);
console.log(transform(object));
```

- as a proxy (returns a proxied object)

```ts
import { proxy } from '@abapify/asjson-parser';
const object = JSON.parse(json);
console.log(proxy(object));
```
