#!/bin/bash
# Auto-approve GitHub Actions workflow runs triggered by Copilot coding agent.
# This hook runs on session start and after each tool use to find and approve
# any workflow runs awaiting approval on the current branch.
#
# When called after a report_progress tool use (git commit + push), the approval
# loop is retried several times with short delays because GitHub Actions may take
# a few seconds to register the new workflow run after the push.

# Read stdin to detect which tool just ran (postToolUse passes JSON on stdin;
# sessionStart passes nothing meaningful, so default to empty).
TOOL_INPUT=$(cat)
TOOL_NAME=$(echo "$TOOL_INPUT" | jq -r '.toolName // ""' 2>/dev/null)

# Check that required tools are available
command -v gh >/dev/null 2>&1 || exit 0
command -v git >/dev/null 2>&1 || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [[ -z "$BRANCH" ]] || [[ "$BRANCH" = "HEAD" ]]; then
  exit 0
fi

# Derive repository slug from remote origin URL
REMOTE_URL=$(git remote get-url origin 2>/dev/null)
REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+?)(\.git)?$|\1|')
# Validate that REPO is in owner/repo format (alphanumeric, hyphens, dots, underscores only)
if ! echo "$REPO" | grep -qE '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$'; then
  exit 0
fi

# URL-encode branch name for use in query parameter (handles slashes and special chars)
BRANCH_ENCODED=$(printf '%s' "$BRANCH" | jq -sRr @uri)

# approve_pending: approve all workflow runs currently awaiting approval on BRANCH.
# Returns 0 if at least one run was approved, 1 if none were found.
approve_pending() {
  local found=1
  for STATUS in action_required waiting; do
    while IFS= read -r run_id; do
      [[ -z "$run_id" ]] && continue
      if gh api -X POST "/repos/${REPO}/actions/runs/${run_id}/approve" 2>/dev/null; then
        echo "approve-workflows: approved run ${run_id} (status=${STATUS})" >&2
        found=0
      fi
    done < <(gh api "/repos/${REPO}/actions/runs?branch=${BRANCH_ENCODED}&status=${STATUS}" \
               --jq '.workflow_runs[].id' 2>/dev/null)
  done
  return $found
}

# After a push (report_progress), GitHub may take several seconds to register the
# new workflow run. Retry up to RETRY_COUNT times with RETRY_DELAY_SEC between
# attempts so we don't miss the window.
# Both variables can be overridden via the environment (useful for testing).
: "${RETRY_COUNT:=5}"
: "${RETRY_DELAY_SEC:=5}"

if [[ "$TOOL_NAME" = "report_progress" ]]; then
  for attempt in $(seq 1 "$RETRY_COUNT"); do
    approve_pending && break
    if [[ "$attempt" -lt "$RETRY_COUNT" ]]; then
      echo "approve-workflows: no pending runs yet (attempt ${attempt}/${RETRY_COUNT}), retrying in ${RETRY_DELAY_SEC}s..." >&2
      sleep "$RETRY_DELAY_SEC"
    fi
  done
else
  # Single-pass approval for all other tool calls
  approve_pending || true
fi
