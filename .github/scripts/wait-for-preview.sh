#!/usr/bin/env bash
# GitHub's provider mapping is authoritative; URL shape alone cannot prove immutability.
# Vercel may report ref=SHA: that mapping cannot independently prove branch identity.
set -euo pipefail
fail() { printf '%s\n' "$1" >&2; exit 1; }
api_error='GitHub API failed; check token permissions and deployment integration.'
[[ ${HEAD_SHA:-} =~ ^[a-fA-F0-9]{40}$ ]] || fail 'HEAD_SHA must be the full push SHA.'
[[ ${GITHUB_REF_NAME:-} == dev || ${GITHUB_REF_NAME:-} == staging ]] || fail 'Expected dev or staging push.'
[[ -n ${GITHUB_REPOSITORY:-} && -n ${GH_TOKEN:-} && -n ${GITHUB_OUTPUT:-} ]] || fail 'Missing GitHub repository, token or output configuration.'

for ((attempt=1; attempt<=40; attempt++)); do
  if ! deployments=$(gh api --paginate --slurp "repos/$GITHUB_REPOSITORY/deployments?sha=$HEAD_SHA&per_page=100" 2>/dev/null); then
    fail "$api_error"
  fi
  if ! id=$(printf '%s' "$deployments" | jq -er --arg sha "$HEAD_SHA" --arg ref "$GITHUB_REF_NAME" '
    add | map(select(.sha == $sha and (.ref == $ref or .ref == $sha) and .environment == "Preview" and .production_environment != true))
    | sort_by(.created_at, .id) | last | .id // "missing"
  ' 2>/dev/null); then
    fail "$api_error"
  fi
  if [[ $id != missing ]]; then
    [[ $id =~ ^[0-9]+$ ]] || fail "$api_error"
    if ! statuses=$(gh api "repos/$GITHUB_REPOSITORY/deployments/$id/statuses?per_page=1" 2>/dev/null); then
      fail "$api_error"
    fi
    # GitHub returns statuses newest first. Never search for historical success.
    if ! state=$(printf '%s' "$statuses" | jq -er '.[0].state // "pending"' 2>/dev/null); then
      fail "$api_error"
    fi
    case "$state" in
      success)
        if ! url=$(printf '%s' "$statuses" | node -e '
          const fs = require("node:fs");
          const value = JSON.parse(fs.readFileSync(0, "utf8"))[0].environment_url;
          if (typeof value !== "string" || !/^https:\/\/[a-z0-9]+(?:-[a-z0-9]+)+\.vercel\.app\/?$/i.test(value)
              || /-git-/i.test(value)) process.exit(1);
          process.stdout.write(value);
        ' 2>/dev/null); then
          fail 'Invalid preview URL; require a deployment-specific HTTPS vercel.app URL.'
        fi
        printf 'url=%s\n' "$url" >> "$GITHUB_OUTPUT"
        printf 'Preview ready: %s (%s)\n' "$url" "$HEAD_SHA"
        exit 0
        ;;
      failure|error|inactive)
        fail "Preview deployment $state; inspect GitHub deployment statuses."
        ;;
      pending|queued|in_progress) ;;
      *) fail 'Unknown deployment status; inspect GitHub deployment statuses.' ;;
    esac
  fi
  if ((attempt < 40)); then sleep 15; fi
done
fail 'Preview timeout after 40 attempts; inspect provider deployment for this SHA/ref.'
