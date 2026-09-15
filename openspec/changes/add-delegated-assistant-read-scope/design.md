# Design: delegated-assistant read scope

## Decision

`delegated-assistant` is a product-neutral signed invocation identity for an
interactive MCP client acting on behalf of one authenticated principal. Its
credential carries the fixed `server` and `read` classes plus one
System/Destination binding. The server's catalogue remains the only
tool-to-class authority.

The exact constraint is:

```ts
{
  kind: 'delegated-assistant-read-v1';
  threadId: string;
  executionId: string;
  systemSid: string;
}
```

`threadId` and `executionId` are UUIDs. Limits are empty because operational
rate limits remain server-owned and do not determine tool admission.

## Destination binding

The claim constraint carries `systemSid` but not a `destinationKey`. The
Destination binding is established at the credential level, not inside the
signed claim: the credential's top-level `destinationKeys` array MUST
contain exactly one key (validated by `parseDelegatedAssistantReadPolicy`
via `claims.destinationKeys.length === 1`). That single destination key is
the deterministic one-to-one mapping for the `systemSid` in the claim —
the credential issuer guarantees they correspond to the same SAP system.
`McpRequestAccess.destinationKeys` is populated from
`invocation.destinationKeys`, so the catalogue and dispatch authorization
enforce the binding without needing a duplicate field inside the claim.

## Enforcement

The invocation verifier accepts only the exact claim shape. HTTP session
identity remains bound to the credential JTI. `tools/list` filters registered
tools through the operation-class catalogue, and dispatch repeats the same
class and Destination checks before acquiring a lease.

The client requests the coarse read envelope by obtaining this credential. It
does not send tool names, Destination keys, or resource-broadening arguments.

## Alternatives rejected

- Product-specific agent IDs: rejected because the public MCP server must
  remain reusable outside one consumer.
- Client-maintained tool allowlists: rejected because they drift from the
  server catalogue.
- Reusing `system-assistant`: rejected because it lacks explicit thread and
  execution binding and is retained only for compatibility.
- Adding `safe_execute`: rejected because checks require a separate exact,
  single-use grant.
