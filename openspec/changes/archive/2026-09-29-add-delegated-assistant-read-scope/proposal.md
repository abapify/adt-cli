# Add a delegated-assistant read scope

## Why

An interactive assistant needs to discover and call the read tools permitted
to its authenticated principal without duplicating the MCP server's tool
catalogue in every client.

## What changes

- Add one product-neutral `delegated-assistant` signed invocation policy.
- Bind the policy to the authenticated principal, MCP execution, thread, and
  one System/Destination.
- Let the server's operation-class catalogue select all permitted `server`
  and `read` tools at discovery and dispatch.

## Non-goals

- This change adds no product-specific agent name or workflow.
- This change adds no `safe_execute` or `write` authority.
- This change adds no client-provided tool-name allowlist or call-count limit.
- This change does not alter ordinary OAuth, bearer, proxy, or stdio modes.

## Validation

- Invocation tests prove only the exact delegated read policy is accepted.
- HTTP integration proves multiple read tools are advertised.
- Scope tests prove write and `safe_execute` tools remain absent and denied.
