#!/usr/bin/env bash
# Production must be exactly what staging validated: a PR into main may only
# promote the current staging HEAD, whose staging push CI succeeded, unchanged.
set -euo pipefail
fail() { printf '%s\n' "$1" >&2; exit 1; }
api_error='GitHub API failed; check token permissions.'
tree_error='Could not read the merge or staging tree; promotion refused.'
[[ -n ${GITHUB_REPOSITORY:-} && -n ${GH_TOKEN:-} ]] || fail 'Missing GitHub repository or token configuration.'
[[ ${PR_HEAD_SHA:-} =~ ^[a-f0-9]{40}$ ]] || fail 'PR_HEAD_SHA must be the full PR head SHA.'
[[ ${PR_HEAD_REPO:-} == "$GITHUB_REPOSITORY" && ${PR_HEAD_REF:-} == staging ]] \
  || fail "Release PRs into main must come from this repository's staging branch."

ref=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/staging" 2>/dev/null) || fail "$api_error"
staging_sha=$(printf '%s' "$ref" | jq -er '.object.sha' 2>/dev/null) || fail "$api_error"
[[ $staging_sha == "$PR_HEAD_SHA" ]] || fail 'PR head is not the current staging HEAD; update the PR from staging.'

for ((attempt=1; attempt<=40; attempt++)); do
  runs=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?branch=staging&event=push&head_sha=$PR_HEAD_SHA&per_page=20" 2>/dev/null) \
    || fail "$api_error"
  # Only the newest run for this SHA counts; an older success never outvotes it.
  latest=$(printf '%s' "$runs" | jq -er --arg sha "$PR_HEAD_SHA" '
    .workflow_runs | map(select(.head_sha == $sha)) | sort_by(.created_at, .id) | last
    | if . == null then "missing" else "\(.id) \(.status) \(.conclusion)" end
  ' 2>/dev/null) || fail "$api_error"
  if [[ $latest != missing ]]; then
    read -r run_id run_status conclusion <<< "$latest"
    [[ $run_id =~ ^[0-9]+$ && $conclusion =~ ^[a-z_]+$ ]] || fail "$api_error"
    if [[ $run_status == completed ]]; then
      [[ $conclusion == success ]] || fail "Staging CI for this SHA concluded $conclusion; promotion refused."
      break
    fi
  fi
  if ((attempt == 40)); then fail 'Timed out waiting for staging CI on this SHA.'; fi
  sleep 30
done

merge_tree=$(git rev-parse 'HEAD^{tree}' 2>/dev/null) || fail "$tree_error"
staging_tree=$(git rev-parse "$PR_HEAD_SHA^{tree}" 2>/dev/null) || fail "$tree_error"
[[ $merge_tree =~ ^[a-f0-9]{40}$ ]] || fail "$tree_error"
[[ $merge_tree == "$staging_tree" ]] || fail 'Merge result differs from the validated staging tree; promotion refused.'
printf 'Release gate passed: %s validated by staging CI run %s.\n' "$PR_HEAD_SHA" "$run_id"
