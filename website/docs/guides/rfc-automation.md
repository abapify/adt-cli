---
title: RFC automation — when to use adt rfc
sidebar_position: 12
description: Choose between adt rfc, adt abap run, and ADT — plus SOAP-RFC setup requirements.
---

# RFC automation

## Goal

Invoke classic RFC-enabled function modules from the CLI — `BAPI_USER_GETLIST`,
`STFC_CONNECTION`, custom `Z_*` RFCs — without a JCo / NWRFC library on the
caller side. Understand when `adt rfc` is the right tool and when ADT or
`adt abap run` is a better fit.

## Prerequisites

- [adt-cli installed and authenticated](/getting-started/installation)
- **SOAP-RFC ICF node enabled server-side** — this is the hard requirement.
  See [Server-side setup](#server-side-setup) below.

## When to use what

| Scenario                                                                   | Pick                                           |
| -------------------------------------------------------------------------- | ---------------------------------------------- |
| Call a standard BAPI (`BAPI_USER_GETLIST`, `BAPI_TRANSACTION_COMMIT`, ...) | **`adt rfc`**                                  |
| Call a custom remote-enabled FM                                            | **`adt rfc`**                                  |
| Run ad-hoc ABAP (not a named FM)                                           | [**`adt abap run`**](/cli/abap-run)            |
| Read/write repository objects                                              | [**`adt class/...`**](/cli/objects) — not RFC  |
| Run `SELECT`s                                                              | [**`adt datapreview osql`**](/cli/datapreview) |

RFC is for **behavior APIs** the system exposes. Don't use it for metadata
manipulation — that's what the ADT REST surface is for.

## Steps

### 1. Ping

```bash
adt rfc STFC_CONNECTION -p REQUTEXT=ping
```

Expected output (pretty JSON, default):

```json
{
  "ECHOTEXT": "ping",
  "RESPTEXT": "SAP System ... — User PPLENKOV",
  "RFCSI": {
    /* ... */
  }
}
```

### 2. Complex payloads via `--json`

```bash
adt rfc BAPI_USER_GETLIST \
  --json '{"MAX_ROWS":10,"WITH_USERNAME":"PPL*"}' \
  -o users.json
```

Mix with `-p` (precedence: `--json` is base, `-p` overrides):

```bash
adt rfc Z_CUSTOMER_READ \
  --json '{"IV_LANG":"E"}' \
  -p IV_CUSTOMER_ID=00042
```

### 3. BAPI-style error handling

Many BAPIs return success as a populated `RETURN` table with `TYPE='E'`.
The default `-x raw` surfaces this as a success response — you have to check
the table yourself. Switch to `bapi` mode to have `adt rfc` raise on errors:

```bash
adt rfc BAPI_USER_EXISTENCE_CHECK -p USERNAME=NOSUCHUSER -x bapi
# exits 1 if RETURN contains an E/A entry
```

### 4. Client routing

```bash
adt rfc RFC_PING --client 100
```

Overrides the `sap-client` query parameter only for this call (auth stays on
the default client).

### 5. Piping into scripts

```bash
adt rfc BAPI_USER_GETLIST --json '{"MAX_ROWS":100}' \
  | jq -r '.USERLIST[].USERNAME'
```

## Server-side setup

`adt rfc` speaks SOAP-over-HTTP against `/sap/bc/soap/rfc`. This ICF node
must be **active** on the target system. Typical required basis steps:

1. `SICF` → tree `/default_host/sap/bc/soap/rfc` → Activate.
2. `/default_host/sap/bc/soap/rfc/wsdl11` active as well (for introspection).
3. Service user has `S_RFC` for the function modules you intend to call
   (restrict to a function-group whitelist in production).
4. If RFC-SSL is enforced: STRUST must have the corporate CA; the CLI uses
   the same trust store as `adt auth login`.

Verify:

```bash
adt fetch /sap/bc/soap/rfc?sap-client=100 -X HEAD
# 200 or 401 = node active; 404 = not active
```

On BTP / S/4 Cloud the SOAP-RFC endpoint is **disabled by design** — use
ADT endpoints or the Cloud-Connector-based RFC destination instead; the
`adt rfc` command will return 404 there and that is expected.

## Troubleshooting

| Error                                        | Cause                                     | Fix                                                                        |
| -------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| `HTTP 404 /sap/bc/soap/rfc`                  | ICF node not activated                    | Ask basis: SICF activate `/sap/bc/soap/rfc`                                |
| `HTTP 401`                                   | `S_RFC` missing for requested FM          | Grant `S_RFC` (ACTVT=16, RFC_TYPE=FUGR, RFC_NAME=&lt;FUGR&gt;)             |
| `Function module X not found in RFC library` | FM isn't remote-enabled                   | Mark the FM as "Remote-Enabled Module" in SE37 attributes                  |
| `Invalid parameter <FOO>`                    | Type mismatch in `-p` values              | Switch to `--json` to preserve types (numbers, booleans, tables)           |
| Hangs for 30 s then times out                | Big `RETURN` / internal table in response | Use `-o file.json` and inspect, or narrow input (`MAX_ROWS`, date filters) |

## See also

- [`adt rfc` reference](/cli/rfc)
- [`adt abap run`](/cli/abap-run)
- [`adt datapreview`](/cli/datapreview)
- [MCP `call_rfc`](/mcp/tools/call_rfc)
- [`@abapify/adt-rfc`](/sdk/packages/adt-rfc) — SDK surface for the same call
