#!/bin/bash
# Tests for log-tool-calls.sh, print-tool-log.sh, and approve-workflows.sh
# Verifies tool call logging, printing and the approval-retry logic work correctly.
# Exit code 0 = all tests passed; non-zero = failure.

set -euo pipefail

PASS=0
FAIL=0

ok() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1" >&2
  FAIL=$((FAIL + 1))
}

# Use a temp directory so we don't pollute the real tmp/
WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_SCRIPT="$SCRIPT_DIR/log-tool-calls.sh"
PRINT_SCRIPT="$SCRIPT_DIR/print-tool-log.sh"
APPROVE_SCRIPT="$SCRIPT_DIR/approve-workflows.sh"

# ── helper: run log-tool-calls.sh with a given JSON input ──────────────────
run_log() {
  local input="$1"
  # Override tmp dir by running the script from WORKDIR
  (cd "$WORKDIR" && echo "$input" | bash "$LOG_SCRIPT")
}

LOGFILE="$WORKDIR/tmp/tool-calls.jsonl"

# ── Test 1: bash tool call is logged ───────────────────────────────────────
run_log '{"toolName":"bash","toolArgs":"{\"command\":\"echo hello\"}"}'
if [[ -f "$LOGFILE" ]]; then
  ok "bash tool call: log file created"
else
  fail "bash tool call: log file not created"
fi

if grep -q '"toolName":"bash"' "$LOGFILE"; then
  ok "bash tool call: toolName present in log"
else
  fail "bash tool call: toolName missing from log"
fi

if grep -q '"logged_at"' "$LOGFILE"; then
  ok "bash tool call: logged_at timestamp present"
else
  fail "bash tool call: logged_at timestamp missing"
fi

# ── Test 2: push (report_progress) tool call is logged ─────────────────────
run_log '{"toolName":"report_progress","toolArgs":"{\"commitMessage\":\"test push\",\"prDescription\":\"- [x] push\"}"}'

PUSH_LINE=$(grep '"toolName":"report_progress"' "$LOGFILE" || true)
if [[ -n "$PUSH_LINE" ]]; then
  ok "push tool call: report_progress entry logged"
else
  fail "push tool call: report_progress entry not found in log"
fi

if echo "$PUSH_LINE" | grep -q '"logged_at"'; then
  ok "push tool call: logged_at present on report_progress entry"
else
  fail "push tool call: logged_at missing on report_progress entry"
fi

# ── Test 3: invalid JSON is skipped without crashing ───────────────────────
if (cd "$WORKDIR" && echo "NOT_JSON" | bash "$LOG_SCRIPT" 2>/dev/null); then
  ok "invalid JSON: script exits cleanly"
else
  fail "invalid JSON: script exited with non-zero"
fi

LINE_COUNT_BEFORE=$(wc -l < "$LOGFILE")
if (cd "$WORKDIR" && echo "NOT_JSON" | bash "$LOG_SCRIPT" 2>/dev/null); then true; fi
LINE_COUNT_AFTER=$(wc -l < "$LOGFILE")
if [[ "$LINE_COUNT_AFTER" -eq "$LINE_COUNT_BEFORE" ]]; then
  ok "invalid JSON: no extra line appended"
else
  fail "invalid JSON: spurious line appended to log"
fi

# ── Test 4: print-tool-log.sh outputs a valid JSON array ───────────────────
OUTPUT=$(cd "$WORKDIR" && echo "" | bash "$PRINT_SCRIPT")
if echo "$OUTPUT" | jq -e 'type == "array"' > /dev/null 2>&1; then
  ok "print-tool-log: output is a JSON array"
else
  fail "print-tool-log: output is not a JSON array"
fi

# ── Test 5: JSON array length matches logged entries (2 valid calls) ────────
COUNT=$(echo "$OUTPUT" | jq 'length')
if [[ "$COUNT" -eq 2 ]]; then
  ok "print-tool-log: array contains 2 entries (matching logged calls)"
else
  fail "print-tool-log: expected 2 entries, got $COUNT"
fi

# ── Test 6: push entry appears in printed array ─────────────────────────────
if echo "$OUTPUT" | jq -e '[.[].toolName] | contains(["report_progress"])' > /dev/null 2>&1; then
  ok "print-tool-log: push (report_progress) entry present in output array"
else
  fail "print-tool-log: push (report_progress) entry missing from output array"
fi

# ── Test 7: print-tool-log.sh emits empty array when no log file exists ────
OUTPUT_EMPTY=$(cd "$WORKDIR" && rm -f tmp/tool-calls.jsonl && echo "" | bash "$PRINT_SCRIPT")
if [[ "$OUTPUT_EMPTY" = "[]" ]]; then
  ok "print-tool-log: returns [] when log file absent"
else
  fail "print-tool-log: expected '[]' when no log file, got: $OUTPUT_EMPTY"
fi

# ── Tests for approve-workflows.sh ─────────────────────────────────────────
# These tests verify behavioural logic without requiring real GitHub credentials.
# We stub 'gh' and 'git' so the script runs to completion in any environment
# (including GitHub Actions, which uses a detached HEAD checkout where
# `git rev-parse --abbrev-ref HEAD` returns "HEAD", causing the script to exit
# early before the retry logic is ever reached).
#
# PATH must be set as a prefix of the bash invocation (right-hand side of the
# pipe), NOT of the echo command (left-hand side), so that bash inherits the
# stub directory.

mkdir -p "$WORKDIR/bin"

# Stub gh: always succeed but emit no output (simulates no pending workflow runs)
cat > "$WORKDIR/bin/gh" << 'EOF'
#!/bin/bash
exit 0
EOF
chmod +x "$WORKDIR/bin/gh"

# Stub git: return a predictable branch name and remote URL so the script does
# not exit early (GitHub Actions runs in detached HEAD, returning "HEAD" for
# `git rev-parse --abbrev-ref HEAD`, which causes the script's early-exit guard
# to fire before any retry logic is exercised).
# Only the two subcommands used by approve-workflows.sh are overridden; all
# other subcommands fall through to the real git binary.
cat > "$WORKDIR/bin/git" << 'EOF'
#!/bin/bash
case "$1" in
  "rev-parse") echo "main" ;;
  "remote")    echo "https://github.com/test-owner/test-repo.git" ;;
  *)           command git "$@" ;;
esac
EOF
chmod +x "$WORKDIR/bin/git"

# run_approve: helper that invokes approve-workflows.sh with the stub PATH
# applied to bash (not to echo) and captures all output including stderr.
# Any extra KEY=VAL arguments are forwarded via `env` so they are visible to
# the script as environment variables.
run_approve() {
  local input="$1"
  shift
  echo "$input" | env PATH="$WORKDIR/bin:$PATH" "$@" bash "$APPROVE_SCRIPT" 2>&1
}

# ── Test 8: regular tool call — approve-workflows exits cleanly ─────────────
APPROVE_OUT=$(run_approve '{"toolName":"bash","toolArgs":"{}"}')
APPROVE_EC=$?
if [[ "$APPROVE_EC" -eq 0 ]]; then
  ok "approve-workflows: exits 0 for regular tool call"
else
  fail "approve-workflows: non-zero exit for regular tool call (got $APPROVE_EC)"
fi

# Regular tool call must NOT produce retry messages
if echo "$APPROVE_OUT" | grep -q "retrying"; then
  fail "approve-workflows: unexpected retry messages for regular tool call"
else
  ok "approve-workflows: no retry messages for regular tool call"
fi

# ── Test 9: report_progress — approve-workflows retries ────────────────────
# RETRY_DELAY_SEC=0 speeds up the test; RETRY_COUNT defaults to 5.
APPROVE_OUT=$(run_approve '{"toolName":"report_progress","toolArgs":"{}"}' RETRY_DELAY_SEC=0)
APPROVE_EC=$?
if [[ "$APPROVE_EC" -eq 0 ]]; then
  ok "approve-workflows: exits 0 for report_progress tool call"
else
  fail "approve-workflows: non-zero exit for report_progress tool call (got $APPROVE_EC)"
fi

# report_progress path must print retry messages (stub gh returns no runs → retries)
if echo "$APPROVE_OUT" | grep -q "retrying"; then
  ok "approve-workflows: retry messages emitted after report_progress"
else
  fail "approve-workflows: expected retry messages after report_progress, got: $APPROVE_OUT"
fi

# ── Test 10: sessionStart (empty stdin) — exits cleanly ────────────────────
APPROVE_OUT=$(run_approve "")
APPROVE_EC=$?
if [[ "$APPROVE_EC" -eq 0 ]]; then
  ok "approve-workflows: exits 0 for empty stdin (sessionStart)"
else
  fail "approve-workflows: non-zero exit for empty stdin (got $APPROVE_EC)"
fi

if echo "$APPROVE_OUT" | grep -q "retrying"; then
  fail "approve-workflows: unexpected retry messages for empty stdin"
else
  ok "approve-workflows: no retry messages for empty stdin"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
