#!/usr/bin/env sh
# oss-github-guard.sh — block non-public internal context from reaching public GitHub.
#
# Usage:
#   scripts/oss-github-guard.sh              # scan outgoing commits + branch name (pre-push mode or HEAD)
#   scripts/oss-github-guard.sh --pr <N>     # scan a live PR's title/body/comments via gh
#   scripts/oss-github-guard.sh --file <f>   # scan an arbitrary text file (e.g. a draft PR body)
#
# Exit 0 = clean, exit 1 = forbidden context found, exit 2 = usage/infra error.
# Installed as a pre-push hook it only fires for github.com remotes.

set -u

# Generic fallback patterns safe to publish. Organization-specific patterns
# live in scripts/.oss-guard-local.patterns (local, untracked): one regex
# fragment per line, OR-joined into the scan. Without that file only the
# generic patterns apply.
PATTERNS='@(corp|internal)\.example'
LABEL='internal / non-public context'
PATTERN_FILE="$(dirname "$0")/.oss-guard-local.patterns"
if [ -f "$PATTERN_FILE" ]; then
  LOCAL=$(grep -vE '^\s*(#|$)' "$PATTERN_FILE" | paste -sd '|' -)
  [ -n "$LOCAL" ] && PATTERNS="$PATTERNS|$LOCAL"
fi
TMP=$(mktemp) || exit 2
trap 'rm -f "$TMP"' EXIT

die() {
  echo "OSS-GUARD: forbidden $LABEL detected in [$1]:" >&2
  grep -Ein "$PATTERNS" "$TMP" | sed 's/^/  /' >&2
  echo "OSS-GUARD: sanitize the text before publishing to github.com (see .agents/rules/git/oss-isolation.md)." >&2
  exit 1
}

scan() { # scan <label> — text arrives on stdin, kept in $TMP
  cat >"$TMP"
  if grep -Ein "$PATTERNS" "$TMP" >/dev/null 2>&1; then
    die "$1"
  fi
}

case "${1:-}" in
  --pr)
    [ -n "${2:-}" ] || { echo "usage: $0 --pr <N>" >&2; exit 2; }
    gh pr view "$2" --json title,body --jq '.title, .body' 2>/dev/null | scan "PR $2 title/body" || exit 1
    gh pr view "$2" --json comments --jq '.comments[] | .body' 2>/dev/null | scan "PR $2 comments" || exit 1
    echo "OSS-GUARD: PR $2 clean."
    ;;
  --file)
    [ -n "${2:-}" ] || { echo "usage: $0 --file <path>" >&2; exit 2; }
    scan "file $2" <"$2"
    echo "OSS-GUARD: $2 clean."
    ;;
  *)
    if [ $# -ge 2 ]; then
      # pre-push hook mode: args "<remote> <url>", stdin lines "<local_ref> <local_sha> <remote_ref> <remote_sha>"
      remote_name="$1"; remote_url="$2"
      case "$remote_url" in
        *github.com*) : ;;
        *) exit 0 ;;  # internal remotes (GitLab) are out of scope for this guard
      esac
      while read -r local_ref local_sha remote_ref remote_sha; do
        [ "$local_sha" = "0000000000000000000000000000000000000000" ] && continue
        branch=${local_ref#refs/heads/}
        printf '%s\n' "$branch" | scan "branch name ($branch)" || exit 1
        if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
          range="$local_sha"
        else
          range="$remote_sha..$local_sha"
        fi
        git log --format='%H%n%B%n%an <%ae>%n%cn <%ce>' "$range" 2>/dev/null | scan "commits $range -> $remote_name (github.com)" || exit 1
      done
      echo "OSS-GUARD: push to $remote_name (github.com) clean."
      exit 0
    fi
    # standalone mode: scan branch name + commits between upstream and HEAD.
    branch=$(git rev-parse --abbrev-ref HEAD)
    printf '%s\n' "$branch" | scan "branch name" || exit 1
    base=$(git rev-parse --abbrev-ref --symbolic-full-name '@{push}' 2>/dev/null | sed 's|/[^/]*$||') || base=origin
    git log --format='%H%n%B%n%an <%ae>%n%cn <%ce>' "${base}/HEAD..HEAD" 2>/dev/null | scan "commit metadata (${base}/HEAD..HEAD)" || exit 1
    echo "OSS-GUARD: outgoing commits and branch name clean."
    ;;
esac
exit 0
