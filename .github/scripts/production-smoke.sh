#!/usr/bin/env bash
# Non-destructive production smoke (CI/CD plan task 12). GET only: no form,
# no sign-in, no write. Checks run in order and the first one that never
# answers as expected fails the job; nothing after it runs.
#   /api/live    the app serves (no database)
#   /api/health  the database answers through the app
#   /            the home page renders as HTML
set -uo pipefail

base="${SMOKE_BASE_URL:-}"
if [[ ! "$base" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]]; then
  echo "::error::Production smoke needs SMOKE_BASE_URL as an https origin without a path." >&2
  exit 1
fi

attempts=5
pause=15
checks=0

check() {
  local path="$1" want_type="${2:-}" out code type problem attempt
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    out=$(curl --silent --show-error --max-time 20 --output /dev/null \
      --write-out '%{http_code} %{content_type}' "${base}${path}" 2>/dev/null) || true
    code="${out%% *}"
    type="${out#* }"
    if [[ "$code" != 200 ]]; then
      problem="${code:-000}"
    elif [[ -n "$want_type" && "$type" != "$want_type"* ]]; then
      problem="200 ${type}, expected ${want_type}"
    else
      echo "ok ${path} 200"
      checks=$((checks + 1))
      return 0
    fi
    if ((attempt < attempts)); then sleep "$pause"; fi
  done
  echo "::error::Production smoke failed: ${path} answered ${problem} after ${attempts} attempts." >&2
  exit 1
}

check /api/live
check /api/health
check / text/html
echo "Production smoke passed: ${checks} checks against ${base}."
