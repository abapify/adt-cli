# Design: bounded analysis execution class

## Decision

`safe_execute` is a distinct semantic operation class. It does not imply
`read` or `write` authority.

The first catalogue member is `atc_run`: an ATC execution cannot modify ABAP
repository objects, but it creates a temporary server-side worklist and may
consume meaningful system resources. A read grant therefore must not expose
it.

## Enforcement

The MCP tool catalogue remains the authority on each tool's class. Destination
mode filters both tool discovery and dispatch through that catalogue before a
destination lease or tool handler is reached.

The signed-invocation parser accepts the class so future credentials can have
a stable vocabulary. Dispatch remains denied until a subsequent change defines
and implements one exact policy for target scope, check variant, result cap,
runtime cap, and replay protection. Accepting a claim before enforcing all of
those fields would widen authority.

## Alternatives rejected

- Classify ATC as `read`: rejected because it causes server-side analysis
  state.
- Classify ATC as `write`: rejected because it conflates analysis with ABAP
  repository mutation.
- Enable a generic execution grant now: rejected because a class alone does
  not constrain scope, resources, or replay.
