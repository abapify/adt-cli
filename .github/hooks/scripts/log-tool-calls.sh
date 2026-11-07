#!/bin/bash
# Log each tool call to tmp/tool-calls.jsonl (JSON Lines).
# Called via postToolUse hook; receives the tool call details as JSON on stdin.
# Millisecond-precision timestamps use GNU date (Linux). On BSD/macOS the
# timestamp automatically falls back to second-level precision.

LOG_FILE="tmp/tool-calls.jsonl"

# Read stdin
INPUT=$(cat)

# Ensure the log directory exists
mkdir -p tmp

# Require jq for JSON manipulation; skip silently if unavailable
command -v jq >/dev/null 2>&1 || exit 0

# Attach a UTC timestamp and append as a single JSON line
# %3N (milliseconds) requires GNU date (Linux). On BSD/macOS the specifier is
# emitted literally; detect that and fall back to second-level precision.
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ" 2>/dev/null)
case "$TIMESTAMP" in
  *%*) TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ") ;;
  *) ;;
esac
if ! echo "$INPUT" | jq -c --arg ts "$TIMESTAMP" '. + {logged_at: $ts}' >> "$LOG_FILE" 2>/dev/null; then
  echo "log-tool-calls: failed to parse tool call JSON (skipping entry)" >&2
fi
