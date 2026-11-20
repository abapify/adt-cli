#!/usr/bin/env sh
# oss-github-guard.sh — block non-public internal context from reaching public GitHub.
#
# Usage:
#   scripts/oss-github-guard.sh              # scan outgoing commits + branch name (pre-push mode or HEAD)
#   scripts/oss-github-guard.sh --pr <N>     # scan a live PR's title/body/comments/reviews via gh
#   scripts/oss-github-guard.sh --issue <N>  # scan a live issue's title/body/comments via gh
#   scripts/oss-github-guard.sh --file <f>   # scan an arbitrary text file (e.g. a draft PR body)
#
# Exit 0 = clean, exit 1 = forbidden context found, exit 2 = usage/infra error.
# Installed as a pre-push hook it only fires for remotes classified as public.

set -u
set -o pipefail

LABEL='internal / non-public context'
GUARD_DIR="$(dirname "$0")"
PATTERN_FILE="$GUARD_DIR/.oss-guard-local.patterns"
REMOTE_FILE="$GUARD_DIR/.oss-guard-local.remotes"

# Generic fallback pattern safe to publish (placeholder domain). Real
# organization-specific patterns live in .oss-guard-local.patterns (local,
# untracked): one regex fragment per line, OR-joined into the scan. A missing
# pattern file fails closed — a fresh clone must not silently scan with
# generic patterns only. Set OSS_GUARD_ALLOW_MISSING_PATTERNS=1 to downgrade
# that to a warning (explicit opt-out for public contributors).
PATTERNS='@(corp|internal)\.example'
if [ -f "$PATTERN_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ''|\#*) continue ;; esac
    if ! printf 'x\n' | grep -qE "$line" 2>/dev/null; then
      status=$?
      if [ "$status" -ge 2 ]; then
        echo "OSS-GUARD: invalid pattern in $PATTERN_FILE: $line" >&2
        exit 2
      fi
    fi
    PATTERNS="$PATTERNS|$line"
  done < "$PATTERN_FILE"
elif [ "${OSS_GUARD_ALLOW_MISSING_PATTERNS:-0}" = "1" ]; then
  echo "OSS-GUARD: warning: $PATTERN_FILE missing; scanning with generic patterns only." >&2
else
  echo "OSS-GUARD: $PATTERN_FILE is missing; refusing a generic-only scan." >&2
  echo "OSS-GUARD: create it (see .agents/rules/git/oss-isolation.md) or set OSS_GUARD_ALLOW_MISSING_PATTERNS=1." >&2
  exit 2
fi

TMP=$(mktemp) || exit 2
trap 'rm -f "$TMP" "$TMP.out"' EXIT
: > "${TMP:?}"

producer_failed() {
  echo "OSS-GUARD: producer failed for [$1]; refusing to report clean." >&2
  exit 2
}

# check_text <label> — scan the text already collected in $TMP.out.
check_text() {
  if grep -Ein "$PATTERNS" "$TMP.out" >/dev/null 2>&1; then
    echo "OSS-GUARD: forbidden $LABEL detected in [$1]:" >&2
    grep -Ein "$PATTERNS" "$TMP.out" | sed 's/^/  /' >&2
    echo "OSS-GUARD: sanitize the text before publishing to github.com (see .agents/rules/git/oss-isolation.md)." >&2
    exit 1
  fi
}

# scan_append <label> <command...> — append producer output to $TMP.out.
scan_append() {
  label="$1"; shift
  if ! "$@" >> "$TMP.out"; then
    producer_failed "$label"
  fi
}

case "${1:-}" in
  --pr)
    [ -n "${2:-}" ] || { echo "usage: $0 --pr <N>" >&2; exit 2; }
    : > "$TMP.out"
    scan_append "PR $2 title/body" gh pr view "$2" --json title,body --jq '.title, .body'
    scan_append "PR $2 comments" gh pr view "$2" --json comments --jq '.comments[] | .body'
    scan_append "PR $2 reviews" gh pr view "$2" --json reviews --jq '.reviews[] | .body'
    scan_append "PR $2 inline review replies" gh api "repos/{owner}/{repo}/pulls/$2/comments" --jq '.[] | .body'
    check_text "PR $2 text"
    echo "OSS-GUARD: PR $2 clean."
    ;;
  --issue)
    [ -n "${2:-}" ] || { echo "usage: $0 --issue <N>" >&2; exit 2; }
    : > "$TMP.out"
    scan_append "issue $2 title/body" gh issue view "$2" --json title,body --jq '.title, .body'
    scan_append "issue $2 comments" gh issue view "$2" --json comments --jq '.comments[] | .body'
    check_text "issue $2 text"
    echo "OSS-GUARD: issue $2 clean."
    ;;
  --file)
    [ -n "${2:-}" ] || { echo "usage: $0 --file <path>" >&2; exit 2; }
    if ! cat -- "$2" > "$TMP.out" 2>/dev/null; then
      producer_failed "file $2"
    fi
    check_text "file $2"
    echo "OSS-GUARD: $2 clean."
    ;;
  *)
    if [ $# -ge 2 ]; then
      # pre-push hook mode: args "<remote> <url>", stdin lines
      # "<local_ref> <local_sha> <remote_ref> <remote_sha>".
      remote_name="$1"; remote_url="$2"
      lower_url=$(printf '%s' "$remote_url" | tr '[:upper:]' '[:lower:]')
      is_public=0
      case "$lower_url" in
        *github.com*) is_public=1 ;;
        *)
          # Not a known public host: skip only when the local config marks
          # this remote internal; unknown remotes fail closed.
          if [ -f "$REMOTE_FILE" ]; then
            while IFS= read -r entry || [ -n "$entry" ]; do
              case "$entry" in ''|\#*) continue ;; esac
              case "$lower_url" in
                *$(printf '%s' "$entry" | tr '[:upper:]' '[:lower:]')*) exit 0 ;;
              esac
            done < "$REMOTE_FILE"
          fi
          echo "OSS-GUARD: unknown remote [$remote_url]; refusing an unclassified push." >&2
          echo "OSS-GUARD: add it to $REMOTE_FILE (internal) or push to a github.com remote." >&2
          exit 2
          ;;
      esac
      [ "$is_public" = "1" ] || exit 0
      while read -r local_ref local_sha remote_ref remote_sha; do
        zero=0000000000000000000000000000000000000000
        [ "$local_sha" = "$zero" ] && continue
        # A missing remote_sha behaves like a new ref.
        [ -n "$remote_sha" ] || remote_sha=$zero
        case "$local_ref" in
          refs/heads/*)
            ref_name=${local_ref#refs/heads/}
            ;;
          refs/tags/*)
            ref_name=${local_ref#refs/tags/}
            ;;
          *)
            continue
            ;;
        esac
        printf '%s\n' "$ref_name" > "$TMP.out"
        check_text "pushed ref name ($ref_name)"
        if [ "$remote_sha" = "$zero" ]; then
          # New ref: scan every commit reachable from it but from no
          # remote-tracking ref — this also covers untracked ancestors.
          commits=$(git rev-list "$local_sha" --not --remotes 2>/dev/null) || producer_failed "rev-list $ref_name"
        else
          commits=$(git rev-list "$remote_sha..$local_sha" 2>/dev/null) || producer_failed "rev-list $ref_name"
        fi
        : > "$TMP.out"
        for sha in $commits; do
          scan_append "commit $sha -> $remote_name" \
            git log -1 --format='%H%n%B%n%an <%ae>%n%cn <%ce>' "$sha"
          # Scan changed file contents too: the patch text carries every
          # added/removed line of the commit.
          scan_append "patch $sha -> $remote_name" \
            git diff-tree --no-commit-id --patch -r "$sha" --format=
        done
        case "$local_ref" in
          refs/tags/*)
            # Annotated tag objects carry their own message.
            scan_append "tag object $ref_name" git cat-file -p "$local_sha"
            ;;
        esac
        check_text "outgoing commits -> $remote_name ($ref_name)" || exit 1
      done
      echo "OSS-GUARD: push to $remote_name (public) clean."
      exit 0
    fi
    # standalone mode: scan branch name + every commit not on the push base.
    branch=$(git rev-parse --abbrev-ref HEAD)
    printf '%s\n' "$branch" > "$TMP.out"
    check_text "branch name"
    base=$(git rev-parse --abbrev-ref --symbolic-full-name '@{push}' 2>/dev/null | sed 's|/[^/]*$||') || base=origin
    commits=$(git rev-list "${base}/HEAD..HEAD" 2>/dev/null) || producer_failed "rev-list ${base}/HEAD..HEAD"
    : > "$TMP.out"
    for sha in $commits; do
      scan_append "commit $sha" git log -1 --format='%H%n%B%n%an <%ae>%n%cn <%ce>' "$sha"
      scan_append "patch $sha" git diff-tree --no-commit-id --patch -r "$sha" --format=
    done
    check_text "outgoing commits (${base}/HEAD..HEAD)"
    echo "OSS-GUARD: outgoing commits and branch name clean."
    ;;
esac
exit 0
