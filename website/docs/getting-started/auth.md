---
title: Authentication
sidebar_position: 2
description: Log in to SAP systems with basic auth, service keys, browser SSO, or cookies.
---

# Authentication

Every command that talks to SAP needs a session. `adt auth` stores credentials and cookies locally so you only authenticate once per system.

See the full command reference at [`adt auth`](../cli/auth.md).

## Where credentials live

| Path                         | Purpose                                                  |
| ---------------------------- | -------------------------------------------------------- |
| `~/.adt/auth.json`           | Registered systems, default SID, per-system auth method. |
| `~/.adt/sessions/<SID>.json` | Cached cookies, CSRF token metadata, expiry.             |
| `./adt.config.ts` (optional) | Project-local destinations picker.                       |

:::warning
Treat `~/.adt/` the same way you treat `~/.ssh/` — it contains credentials. Do not commit it.
:::

## Supported auth methods

| Method                        | Typical target                             | Plugin                                                |
| ----------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Basic** (username/password) | On-premise NetWeaver / S/4HANA on-premise  | Built-in                                              |
| **Service key**               | SAP BTP ABAP Environment (Steampunk)       | Built-in                                              |
| **Browser SSO / OAuth**       | S/4HANA Cloud, BTP, any IdP-fronted system | `@abapify/adt-puppeteer` or `@abapify/adt-playwright` |
| **Cookie**                    | Pre-existing session (debug, CI)           | Built-in                                              |

## Interactive login

```bash
adt auth login
```

Without flags, `adt` walks you through:

1. Destination picker — entries from `adt.config.ts`, or manual URL entry.
2. Method picker — basic auth, service key, or browser SSO depending on the destination.
3. Credential prompts — password input is hidden.

The resulting session is saved and marked as the default if it is the first one.

## Basic authentication

```bash
adt auth login --sid DEV \
  --url https://sap.example.com:44300 \
  --client 100 \
  --user DEVELOPER
# Password prompt follows
```

Or fully non-interactive (CI):

```bash
export ADT_PASSWORD='...'
adt auth login --sid DEV --url https://sap.example.com:44300 --client 100 --user DEVELOPER
```

## Service key (SAP BTP)

Download the service key JSON from BTP cockpit, then:

```bash
adt auth login --sid BTP --service-key ./service-key.json
```

The key is parsed for `url`, `uaa.clientid`, `uaa.clientsecret`, and `uaa.url`. `adt` exchanges them for a bearer token and registers the system.

## Browser SSO / OAuth

For systems fronted by an IdP (SAML, OIDC, corporate SSO):

```bash
# Install a browser plugin once
npm install -g @abapify/adt-puppeteer

adt auth login --sid S4H --url https://my123456.s4hana.cloud.sap
```

The plugin opens a headed browser, you complete SSO, cookies are captured and stored. Use `--redirect-uri` when running inside a devcontainer or Codespace so the OAuth callback can reach the CLI.

:::tip
Use `--insecure` only for local sandboxes with self-signed certificates. Never for production.
:::

## Session management

```bash
# List all registered systems
adt auth list

# Pick the default for subsequent commands
adt auth set-default DEV

# Refresh an expired session (re-runs the plugin)
adt auth refresh --sid DEV

# Inspect current status
adt auth status

# Forget a system
adt auth logout --sid DEV
```

Every command accepts `--sid <SID>` to target a non-default system without changing the default.

## Troubleshooting

### `401 Unauthorized`

- Password changed or locked. Try `adt auth refresh --sid <SID>`.
- Wrong client. `adt auth list` shows the client the session was created for.
- User lacks `S_RFC` / `S_DEVELOP`. Ask basis.

### `403 Forbidden` on writes

Usually a CSRF or security-session issue. `adt` handles the 3-step security session protocol automatically; if it keeps failing:

```bash
adt auth refresh --sid <SID>
```

This clears the cached session and forces a fresh CSRF fetch.

### Corporate proxy blocks ADT

`adt` honors `HTTPS_PROXY` / `HTTP_PROXY` / `NO_PROXY`. If your proxy re-signs TLS, export `NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem`.

### Browser SSO loops

Make sure the callback URL (`--redirect-uri`) is reachable from the browser instance. In Codespaces use the forwarded HTTPS URL, not `http://localhost`.

## Next steps

- [Try your first commands](./first-commands.md)
- [Set up the MCP server](./mcp-setup.md)
- [Full `adt auth` reference](../cli/auth.md)
