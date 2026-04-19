---
title: Data Preview
description: ABAP SQL freestyle execution.
---

# `client.adt.datapreview`

## Sub-namespaces

### `client.adt.datapreview.freestyle`

| Method | HTTP | Path | Summary |
|--------|------|------|---------|
| `.post(...)` | POST | `/sap/bc/adt/datapreview/freestyle` | Execute ABAP SQL statement |

## Schema

Source: [`adt-contracts/src/adt/datapreview/`](https://github.com/abapify/adt-cli/blob/main/packages/adt-contracts/src/adt/datapreview)
Response types: `DataPreviewFreestyleResponse`, `DataPreviewColumn`,
`DataPreviewColumnMetadata`, `DataPreviewPayload`.

## Example

```ts
const rows = await client.adt.datapreview.freestyle.post({
  query: 'SELECT FROM t000 FIELDS mandt, mtext',
  rowLimit: 100,
});
```
