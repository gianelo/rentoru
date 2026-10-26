#!/usr/bin/env bash
# `--with-deps` downloads apt packages, and a slow mirror has held this step for
# 7-14 minutes when it normally takes 11-28 s. Each attempt is bounded and
# retried once; two failed attempts still fail the step. Playwright's `sudo apt-get`
# runs in its own session, beyond the watchdog, so it is stopped before the retry.
set -euo pipefail
limit=${BROWSER_INSTALL_TIMEOUT_SECONDS:-180}
marker=$(mktemp)
trap 'rm -f "$marker"' EXIT

# Signals apt and dpkg, then waits up to 15 s for all of them to exit.
stop_apt() {
  local name _
  for name in apt-get apt dpkg; do sudo -n pkill "-$1" -x "$name" || true; done
  for _ in {1..15}; do
    pgrep -x apt-get >/dev/null || pgrep -x apt >/dev/null || pgrep -x dpkg >/dev/null || return 0
    sleep 1
  done
  return 1
}

for attempt in 1 2; do
  : > "$marker"
  # Monitor mode puts each background job in its own process group, so the
  # watchdog stops apt and every other child together with the attempt.
  set -m
  pnpm exec playwright install --with-deps chromium &
  pid=$!
  (
    sleep "$limit"
    echo timeout > "$marker"
    kill -TERM -- "-$pid" 2>/dev/null || exit 0
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 1
      kill -0 -- "-$pid" 2>/dev/null || exit 0
    done
    kill -KILL -- "-$pid" 2>/dev/null || true
  ) >/dev/null 2>&1 &
  watchdog=$!
  set +m
  status=0
  # Hides only bash's own "Terminated" job notice; the install keeps its stderr.
  wait "$pid" 2>/dev/null || status=$?
  if [[ -s $marker ]]; then
    wait "$watchdog" || true
    reason="timed out after ${limit}s"
  else
    kill -- "-$watchdog" 2>/dev/null || true
    wait "$watchdog" 2>/dev/null || true
    if ((status == 0)); then exit 0; fi
    reason="exit code $status"
  fi
  echo "::warning::Browser install attempt $attempt of 2 did not finish ($reason)"
  # An interrupted apt can leave dpkg half-configured; repair it only when sudo
  # cannot prompt, and never let the repair decide the outcome.
  if ((attempt < 2)) && command -v sudo >/dev/null && sudo -n true 2>/dev/null; then
    if ! stop_apt TERM && ! stop_apt KILL; then
      echo "::error::apt/dpkg still running after cleanup; browser install not retried"
      exit 1
    fi
    sudo -n dpkg --configure -a || true
  fi
done
echo "::error::Browser install failed after 2 attempts"
exit 1
