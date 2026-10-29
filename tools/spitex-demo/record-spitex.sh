#!/usr/bin/env bash
# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Records the two Spitex story takes (takes/spitex-takes.mjs) for the given cultures on throw-away copies of the seeded database.
#   clip A  spitex-orders-tour : copy of klacks_marketing_spitex -> klacks_marketing_spitex_take, recording API on 5011, take recorded.
#   clip B  spitex-tour-finish : needs the database AFTER a publishable clip A. The script saves it (container locks cleared) as
#                                klacks_marketing_spitex_b right after clip A and copies it to klacks_marketing_spitex_take for every attempt
#                                of clip B, so a retry of B never repeats A.
# A take that is publishable is copied to tools/story-video/source-clips/takes/<video>-<culture>.mp4 together with its report
# (<frames>/take-report-<video>-<culture>.json); a failed attempt keeps its report as ...-fail<N>.json. Run it only when the UI (4210)
# and the recording API binaries below match the Spitex branches.
#
# Usage:  record-spitex.sh [a|b|ab] <culture> [<culture> ...]        (default mode ab; b reuses klacks_marketing_spitex_b of the last clip A)
# Needs:  KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD (the demo admin, first name Sandra; never written into this file)
#         KLACKS_API_BIN  folder of a built Klacks.Api (bin/Debug/net10.0) of the branch that has the Spitex skills (P2/P3) and routing profiles
#         KLACKS_UI_URL   UI served from a Klacks.Ui build that has order-review-navigation, the tour map (P4) and the container refresh (P5);
#                         default http://localhost:4210 (the dev UI on 4200 is never used for takes)
# Optional: PSQL (psql.exe), FFMPEG_PATH, KLACKS_VIDEO_FRAMES_DIR, SPITEX_ATTEMPTS (default 2), SPITEX_DB (default klacks_marketing_spitex)
# Date window: the sentences name "Thursday, 5 November" without a year, so the takes refuse to run outside 2026-01-01 .. 2026-11-05 (the
# language model takes the year from today); KLACKS_SPITEX_ANY_DATE=1 overrides and the date checks of the take then fail.
# Prerequisites to check once: the template DB has the Spitex seed (tools/seed-spitex-demo.mjs ran), nothing is connected to it,
# and Slack/Telegram/LLM background services stay off (start-recording-api.ps1 disables them).
set -u

MODE=ab
case "${1:-}" in a|b|ab) MODE="$1"; shift ;; esac
[ "$#" -ge 1 ] || { echo "usage: record-spitex.sh [a|b|ab] <culture> [<culture> ...]"; exit 2; }
: "${KLACKS_DEMO_USER:?set KLACKS_DEMO_USER}" "${KLACKS_DEMO_PASSWORD:?set KLACKS_DEMO_PASSWORD}" "${KLACKS_API_BIN:?set KLACKS_API_BIN to the built Klacks.Api output folder}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL="${PSQL:-/c/Program Files/PostgreSQL/17/bin/psql.exe}"
export PGPASSWORD="${PGPASSWORD:-admin}"
PG=(-h localhost -p 5434 -U postgres)
SEED_DB="${SPITEX_DB:-klacks_marketing_spitex}"
TAKE_DB="${SEED_DB}_take"
AFTER_A_DB="${SEED_DB}_b"
ATTEMPTS="${SPITEX_ATTEMPTS:-2}"
export KLACKS_UI_URL="${KLACKS_UI_URL:-http://localhost:4210}"
export KLACKS_API_URL=https://localhost:5011
export FFMPEG_PATH="${FFMPEG_PATH:-$(cygpath -w "$(which ffmpeg)")}"
TAKES="$ROOT/tools/story-video/source-clips/takes"
FRAMES="${KLACKS_VIDEO_FRAMES_DIR:-$(cygpath -u "$TEMP")/klacks-video-frames}"
API_DEST_NAME="klacks-rec-spitex-api"
A=spitex-orders-tour
B=spitex-tour-finish
mkdir -p "$TAKES" "$FRAMES"

psql_db() { local db="$1"; shift; "$PSQL" "${PG[@]}" -d "$db" -q -tA "$@"; }

stop_api() {
  powershell.exe -NoProfile -Command "Get-Process Klacks.Api -ErrorAction SilentlyContinue | Where-Object { \$_.Path -like \"\$env:TEMP\\$API_DEST_NAME*\" } | Stop-Process -Force"
  sleep 4
}

copy_db() { # <template> <target>
  psql_db postgres -c "DROP DATABASE IF EXISTS $2" -c "CREATE DATABASE $2 TEMPLATE $1"
}

start_api() { # <database>
  powershell.exe -NoProfile -File "$(cygpath -w "$ROOT/tools/grouping-demo/start-recording-api.ps1")" -Source "$(cygpath -w "$KLACKS_API_BIN")" \
    -Destination "$(cygpath -w "$TEMP")\\$API_DEST_NAME" -Database "$1" -CorsAdditional "$KLACKS_UI_URL" || return 1
  for _ in $(seq 1 120); do
    [ "$(curl -sk -o /dev/null -w '%{http_code}' https://localhost:5011/health)" = "200" ] && return 0
    sleep 5
  done
  echo "recording API did not become healthy"; return 1
}

record() { # <video> <culture> <attempt> -> 0 when publishable
  local video="$1" c="$2" attempt="$3" dir="$FRAMES/$1-$2" pub
  (cd "$ROOT" && timeout 900 node tools/capture-app-videos.mjs --videos "$video" --cultures "$c" --test-take 2>&1 | grep "spitex-\|^!\|^x " | cut -c1-400)
  pub=$(grep -o '"publishable": [a-z]*' "$dir/take-report.json" 2>/dev/null)
  echo "$video/$c attempt $attempt: $pub"
  if [ "$pub" = '"publishable": true' ]; then
    cp "$dir/$video-$c.mp4" "$TAKES/" && cp "$dir/take-report.json" "$FRAMES/take-report-$video-$c.json"
    return 0
  fi
  cp "$dir/take-report.json" "$FRAMES/take-report-$video-$c-fail$attempt.json" 2>/dev/null
  return 1
}

seed_ready() {
  [ "$(psql_db "$SEED_DB" -c "select count(*) from shift where abbreviation like 'SX%' and status = 0")" = "8" ]
}

clip_a() { # <culture>
  local c="$1"
  for attempt in $(seq 1 "$ATTEMPTS"); do
    echo "=== $A $c attempt $attempt $(date +%T)"
    stop_api
    copy_db "$SEED_DB" "$TAKE_DB" || { echo "database copy failed"; continue; }
    start_api "$TAKE_DB" || continue
    if record "$A" "$c" "$attempt"; then
      stop_api
      psql_db "$TAKE_DB" -c "delete from container_lock" || return 1
      copy_db "$TAKE_DB" "$AFTER_A_DB" || return 1
      return 0
    fi
  done
  return 1
}

clip_b() { # <culture>
  local c="$1"
  [ "$(psql_db "$AFTER_A_DB" -c "select 1" 2>/dev/null)" = "1" ] || { echo "no database after clip A ($AFTER_A_DB): record clip A first"; return 1; }
  for attempt in $(seq 1 "$ATTEMPTS"); do
    echo "=== $B $c attempt $attempt $(date +%T)"
    stop_api
    copy_db "$AFTER_A_DB" "$TAKE_DB" || { echo "database copy failed"; continue; }
    start_api "$TAKE_DB" || continue
    record "$B" "$c" "$attempt" && return 0
  done
  return 1
}

seed_ready || { echo "$SEED_DB lacks the 8 open Spitex orders - run tools/seed-spitex-demo.mjs on it first"; exit 1; }
status=0
for culture in "$@"; do
  case "$MODE" in
    a) clip_a "$culture" || status=1 ;;
    b) clip_b "$culture" || status=1 ;;
    ab) if clip_a "$culture"; then clip_b "$culture" || status=1; else status=1; fi ;;
  esac
done
stop_api
rm -rf "$(cygpath -u "$TEMP")/$API_DEST_NAME/DataProtection-Keys"
echo "=== done $(date +%T) (exit $status)"
exit "$status"
