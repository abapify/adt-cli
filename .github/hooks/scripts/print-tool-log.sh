#!/bin/bash
# Print the accumulated tool call log as a JSON array at session end.
# Called via sessionEnd hook.

# Discard stdin (not needed)
cat > /dev/null

LOG_FILE="tmp/tool-calls.jsonl"

if [[ ! -f "$LOG_FILE" ]]; then
  echo "[]"
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "print-tool-log: jq not found; cannot format tool call log" >&2
  exit 0
fi

# Convert JSON Lines to a JSON array and pretty-print
jq -s '.' "$LOG_FILE"
