#!/usr/bin/env bash
# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Records ONE clip of the series Monatsplanung / Szenarien in ONE language against a released Klacks (default 1.0.55) and builds the finished video into Klacks.MediaArchive.
#   clip  m1  Ferienwunsch   monthplan-wishes      master klacks_marketing_security_bern_m1   Monatsplanung
#         m2  Keywords       monthplan-commands    master klacks_marketing_security_bern_m2   Monatsplanung
#         m3  Monat          security-month-plan   master klacks_marketing_security_bern_m3   Monatsplanung
#         s0  Szenarien      scenario-variants     master klacks_marketing_security_bern_s1   Szenarien
#   lang  en | fr | it (de is accepted and stays as it is; KLACKS_ALLOW_DE=1 lifts the refusal)
# Steps: static checks (tools, release, clips, master, archive target) -> lock + run folder + gate -> throw-away copy of the master -> the released API (it serves the released UI itself,
# one origin on https://localhost:5011) on the copy -> take (capture-app-videos --test-take) -> services stopped -> take report must say publishable -> post-processing of the take (m2:
# dark frames and the 1.45 s trim, as in the accepted German cut) -> story build (build-weekplan-video --culture <lang>) -> the mp4 is copied into the archive only when the take was
# publishable AND the build exited 0 AND the target name is still free. One call = one take = one language; there is no loop over clips or languages.
#
# Usage:  record-series.sh <clip> <lang>             full run
#         record-series.sh --dry-run <clip> <lang>   gate and static checks only, nothing is started, written or copied (database reads are read-only)
#         record-series.sh --prepare                 downloads and unpacks the release package into KLACKS_RELEASE_DIR (network and disk only, nothing is started)
# Env (required for a run): KLACKS_DEMO_USER, KLACKS_DEMO_PASSWORD   the demo admin; never written into a file or the log
# Env (optional): KLACKS_RELEASE_VERSION (1.0.55)  KLACKS_RELEASE_DIR (%TEMP%\klacks-release-<version>, contains app\ and ui\)  KLACKS_MEDIA_ARCHIVE (<super repo>\Klacks.MediaArchive)
#   KLACKS_SERIES_WORK (%TEMP%\klacks-series: lock and run folders)  KLACKS_MIN_FREE_MB (4096)  KLACKS_MIN_FREE_DISK_MB (6144)  KLACKS_TAKE_TIMEOUT_S (2700, take AND encoding)
#   KLACKS_BUILD_TIMEOUT_S (1200)  KLACKS_SECURITY_ACCEPT_GAP=1 (m3/m2: a plan with a gap may pass; logged)  KLACKS_DARK_FIX=0|1 (default 1 for m2, else report only)
#   KLACKS_TRIM (default "decide:1.45" for m2, "none" disables; format cue:seconds[,cue:seconds])  KLACKS_NAME_INFIX (default empty; "-vorschau" gives the German pattern)
#   KLACKS_OUT_VERSION (default: the version of the German cut of that clip, as the Spitex clips do; 1 when there is none)  KLACKS_NEW_VERSION=1 (a file of that language exists: write the next version)
#   KLACKS_EXPECTED_LAST_MIGRATION / KLACKS_EXPECTED_MIGRATIONS (migration the release was verified to end with and their count)  KLACKS_ALLOW_MIGRATION_DRIFT=1  PSQL  PGPASSWORD (default admin)
#         record-series.sh --stop                    ends the live run (kill of its pid, trap) and stops what a hard-killed run left behind (API, browser, ffmpeg of that run folder only)
# Detached start and foreground poll (a hard kill of the shell would leave the API running; --stop cleans that up). The caller names the run folder, so the poll cannot see an older run:
#   D="$(cygpath -u "$TEMP")/klacks-series/run-m3-fr-1"; KLACKS_RUN_DIR="$D" nohup bash tools/record-series.sh m3 fr > /dev/null 2>&1 < /dev/null &
#   timeout 590 bash -c 'until [ -f "$0/EXIT" ]; do sleep 10; done; cat "$0/EXIT" "$0/STATUS"' "$D"     (repeat until it prints the exit code; run.log in that folder has everything)
#   KLACKS_RUN_DIR must not exist yet. The pointer file <KLACKS_SERIES_WORK>/current holds the run folder while a run lives and is removed when it ends.
# Output: <KLACKS_SERIES_WORK>\<clip>-<lang>-<yyyymmdd-hhmmss>\ with run.log (everything), STATUS (phase), EXIT (exit code, written last), api.log, capture.log, build.log, frames\, out\, work\.
#   A foreground caller polls for EXIT (never waits by ending its turn); a stuck run is ended by `kill <pid of record-series.sh>`: the trap stops every process of the run.
# Exit codes: 0 done, 2 usage, 3 gate or lock refused, 4 static check failed, 5 take failed or not publishable, 6 build failed, 7 archive target conflict, 130/143 interrupted.
# Never touched: the master databases (only copied), other sessions' processes (the stop works by the run folder and the private API folder only), Git.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
SUPER="$(cd "$ROOT/.." && pwd)"
SCRIPTS="$HERE/series-recording"
TMPU="$(cygpath -u "${TEMP:-${TMP:-/tmp}}")"
w() { cygpath -w "$1"; }

RELEASE_VERSION="${KLACKS_RELEASE_VERSION:-1.0.55}"
REL="${KLACKS_RELEASE_DIR:-$TMPU/klacks-release-$RELEASE_VERSION}"
MEDIA="${KLACKS_MEDIA_ARCHIVE:-$SUPER/Klacks.MediaArchive}"
WORK="${KLACKS_SERIES_WORK:-$TMPU/klacks-series}"
MIN_FREE_MB="${KLACKS_MIN_FREE_MB:-4096}"
MIN_DISK_MB="${KLACKS_MIN_FREE_DISK_MB:-6144}"
TAKE_TIMEOUT="${KLACKS_TAKE_TIMEOUT_S:-2700}"
BUILD_TIMEOUT="${KLACKS_BUILD_TIMEOUT_S:-1200}"
EXPECTED_LAST_MIGRATION="${KLACKS_EXPECTED_LAST_MIGRATION:-20261027091035_AddEvalRunItemMissKindAndToolsetTrace}"
EXPECTED_MIGRATIONS="${KLACKS_EXPECTED_MIGRATIONS:-170}"
PSQL="${PSQL:-/c/Program Files/PostgreSQL/17/bin/psql.exe}"
export PGPASSWORD="${PGPASSWORD:-admin}"
GROUP_NAME="Bern Objektschutz"
API_DEST="$TMPU/klacks-rec-series-run"
API_URL="https://localhost:5011"
LOCKDIR="$WORK/series.lock"
INFIX="${KLACKS_NAME_INFIX:-}"

MODE=run
case "${1:-}" in
  --dry-run) MODE=dry; shift ;;
  --prepare) MODE=prepare; shift ;;
  --stop) MODE=stop; shift ;;
esac

RUN=""; HAVE_FD3=0; LOCK_OWNED=0; RC_NOTE=""

say() {
  local line; line="$(date +%T) $*"
  printf '%s\n' "$line"
  if [ "$HAVE_FD3" = 1 ]; then printf '%s\n' "$line" >&3; fi
}
die() { local code="$1"; shift; say "ABORT($code): $*"; exit "$code"; }
status() { [ -n "$RUN" ] && printf '%s\n' "$1" > "$RUN/STATUS"; say "phase: $1"; }
psql_db() { local db="$1" out; shift; out="$(timeout 120 "$PSQL" -h localhost -p 5434 -U postgres -d "$db" -q -tA "$@" < /dev/null)" || return 1; printf '%s\n' "${out//$'\r'/}"; }

stop_dir() {
  timeout 90 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$SCRIPTS/series-stop.ps1")" -Marker "$(w "$1")" -Destination "$(w "$API_DEST")" < /dev/null 3>&- 2>&1 | sed 's/^/stop: /'
}
stop_all() { [ -n "$RUN" ] || return 0; stop_dir "$RUN"; }

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  if [ -n "$RUN" ]; then
    stop_all
    printf '%s\n' "$rc" > "$RUN/EXIT"
    say "finished with exit $rc (run folder $(w "$RUN"))"
  fi
  if [ -n "$RUN" ] && [ "$(cat "$WORK/current" 2> /dev/null)" = "$RUN" ]; then rm -f "$WORK/current"; fi
  if [ "$LOCK_OWNED" = 1 ]; then rm -f "$LOCKDIR/pid"; rmdir "$LOCKDIR" 2>/dev/null; fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

if [ "$MODE" = prepare ]; then
  command -v powershell.exe > /dev/null || die 2 "powershell.exe not found"
  [ -f "$REL/app/Klacks.Api.exe" ] && die 4 "release already unpacked in $(w "$REL")"
  timeout 900 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$SCRIPTS/series-prepare-release.ps1")" -Version "$RELEASE_VERSION" -Destination "$(w "$REL")" < /dev/null
  exit $?
fi

if [ "$MODE" = stop ]; then
  [ -f "$WORK/current" ] || { echo "no run recorded in $(w "$WORK") (nothing to stop)"; trap - EXIT; exit 0; }
  STOP_RUN="$(cat "$WORK/current")"
  OTHER="$(cat "$LOCKDIR/pid" 2> /dev/null)"
  if [ -n "$OTHER" ] && kill -0 "$OTHER" 2> /dev/null; then
    echo "ending the live run (pid $OTHER); its trap stops the services"
    kill "$OTHER"
    for _ in $(seq 1 30); do kill -0 "$OTHER" 2> /dev/null || break; sleep 2; done
    kill -0 "$OTHER" 2> /dev/null && echo "pid $OTHER is still alive after 60 s"
  fi
  stop_dir "$STOP_RUN"
  if [ -n "$OTHER" ] && ! kill -0 "$OTHER" 2> /dev/null; then rm -f "$LOCKDIR/pid"; rmdir "$LOCKDIR" 2> /dev/null; rm -f "$WORK/current"; fi
  [ -f "$STOP_RUN/EXIT" ] || echo "137" > "$STOP_RUN/EXIT"
  trap - EXIT
  exit 0
fi

[ "$#" -eq 2 ] || { echo "usage: record-series.sh [--dry-run] <m1|m2|m3|s0> <en|fr|it>   |   record-series.sh --prepare   |   record-series.sh --stop" >&2; exit 2; }
CLIP="$(printf '%s' "$1" | tr 'A-Z' 'a-z')"
LANGCODE="$(printf '%s' "$2" | tr 'A-Z' 'a-z')"

case "$CLIP" in
  m1) VIDEO=monthplan-wishes;    MASTER=klacks_marketing_security_bern_m1; RECIPE=monthplan-recipe-m1.mjs;  RAW=gemini_generated_video_3ec1f178.mp4; SERIES=Monatsplanung; STEM=klacks-monatsplanung-m1; DARK_DEFAULT=0; TRIM_DEFAULT=none ;;
  m2) VIDEO=monthplan-commands;  MASTER=klacks_marketing_security_bern_m2; RECIPE=monthplan-recipe-m2.mjs;  RAW=gemini_generated_video_7d4d55e8.mp4; SERIES=Monatsplanung; STEM=klacks-monatsplanung-m2; DARK_DEFAULT=1; TRIM_DEFAULT=decide:1.45 ;;
  m3) VIDEO=security-month-plan; MASTER=klacks_marketing_security_bern_m3; RECIPE=monthplan-recipe-m3.mjs;  RAW=gemini_generated_video_b4401dfc.mp4; SERIES=Monatsplanung; STEM=klacks-monatsplanung-m3; DARK_DEFAULT=0; TRIM_DEFAULT=none ;;
  s0) VIDEO=scenario-variants;   MASTER=klacks_marketing_security_bern_s1; RECIPE=scenario-recipe-s0.mjs;   RAW=gemini_generated_video_7bfe3a94.mp4; SERIES=Szenarien;      STEM=klacks-szenarien-s0;    DARK_DEFAULT=0; TRIM_DEFAULT=none ;;
  *) die 2 "unknown clip '$CLIP' (m1, m2, m3, s0)" ;;
esac
case "$LANGCODE" in
  en|fr|it) ;;
  de) [ "${KLACKS_ALLOW_DE:-0}" = 1 ] || die 2 "de is accepted and stays as it is (set KLACKS_ALLOW_DE=1 to record it anyway)" ;;
  *) die 2 "unknown language '$LANGCODE' (en, fr, it)" ;;
esac
DARK_FIX="${KLACKS_DARK_FIX:-$DARK_DEFAULT}"
TRIM="${KLACKS_TRIM:-$TRIM_DEFAULT}"
TAKEDB="${MASTER}_series_${LANGCODE}_take"
RECIPE_FILE="$ROOT/tools/story-video/$RECIPE"
RAW_DIR="$MEDIA/rohmaterial"
ARCHIVE_DIR="$MEDIA/LinkedIn/$SERIES"

check_static() {
  local missing=0 tool clipname
  for tool in node ffmpeg ffprobe curl cygpath powershell.exe timeout; do command -v "$tool" > /dev/null || { say "missing tool: $tool"; missing=1; }; done
  [ -x "$PSQL" ] || { say "missing psql: $PSQL"; missing=1; }
  [ "$missing" = 0 ] || return 1

  [ -f "$REL/app/Klacks.Api.exe" ] && [ -f "$REL/ui/index.html" ] || { say "release $RELEASE_VERSION is not unpacked in $(w "$REL") (record-series.sh --prepare)"; return 1; }
  grep -q "\"version\":\"$RELEASE_VERSION\"" "$REL/ui/version.json" || { say "ui/version.json of the release folder is not $RELEASE_VERSION"; return 1; }
  grep -a -q "$EXPECTED_LAST_MIGRATION" "$REL/app/Klacks.Api.dll" || { say "Klacks.Api.dll does not contain the migration $EXPECTED_LAST_MIGRATION"; return 1; }
  [ -d "$SUPER/Klacks.Api/DataProtection-Keys" ] || { say "key ring folder $(w "$SUPER/Klacks.Api/DataProtection-Keys") is missing (start-recording-api.ps1 copies it)"; return 1; }

  [ -f "$RECIPE_FILE" ] || { say "recipe missing: $RECIPE_FILE"; return 1; }
  grep -q "$RAW" "$RECIPE_FILE" || { say "recipe $RECIPE does not name the raw clip $RAW"; return 1; }
  for clipname in $(grep -oE '"[A-Za-z0-9_-]+\.mp4"' "$RECIPE_FILE" | tr -d '"' | sort -u) "$RAW"; do
    [ -f "$RAW_DIR/$clipname" ] || { say "clip missing in the archive: $RAW_DIR/$clipname"; return 1; }
  done
  OUTPUT_PREFIX="$(sed -n 's/^export const OUTPUT_PREFIX = "\(.*\)";.*/\1/p' "$RECIPE_FILE")"
  [ -n "$OUTPUT_PREFIX" ] || { say "OUTPUT_PREFIX not found in $RECIPE"; return 1; }
  CAPTIONS_FILE="$ROOT/tools/story-video/$(sed -n 's/^export const CAPTIONS_PREFIX = "\(.*\)";.*/\1/p' "$RECIPE_FILE")$LANGCODE.json"
  for clipname in "$CAPTIONS_FILE" "$ROOT/tools/story-video/captions.$LANGCODE.json" "$ROOT/tools/simple-videos.$LANGCODE.json"; do
    [ -f "$clipname" ] || { say "caption file missing: $clipname"; return 1; }
  done
  [ -d "$ARCHIVE_DIR" ] || { say "archive folder missing: $ARCHIVE_DIR"; return 1; }

  say "selftests"
  (cd "$ROOT" && timeout 300 node tools/monthplan-series.selftest.mjs && timeout 120 node tools/series-recording/fix-take.selftest.mjs) < /dev/null 2>&1 | sed 's/^/  /'
  [ "${PIPESTATUS[0]}" = 0 ] || { say "selftest failed"; return 1; }

  if [ "$(psql_db postgres -c "select 1 from pg_database where datname = '$MASTER'")" != 1 ]; then say "master database $MASTER does not exist"; return 1; fi
  local last count
  last="$(psql_db "$MASTER" -c 'select max(migration_id) from "__EFMigrationsHistory"')"
  count="$(psql_db "$MASTER" -c 'select count(*) from "__EFMigrationsHistory"')"
  if [ "$last" != "$EXPECTED_LAST_MIGRATION" ] || [ "$count" != "$EXPECTED_MIGRATIONS" ]; then
    say "master $MASTER ends with migration '$last' ($count) but release $RELEASE_VERSION was verified with '$EXPECTED_LAST_MIGRATION' ($EXPECTED_MIGRATIONS)"
    [ "${KLACKS_ALLOW_MIGRATION_DRIFT:-0}" = 1 ] || return 1
    say "continuing: KLACKS_ALLOW_MIGRATION_DRIFT=1"
  fi
  GROUP_ON_MASTER="$(psql_db "$MASTER" -c "select count(*) from \"group\" where name = '$GROUP_NAME' and not is_deleted")"
  [ "$GROUP_ON_MASTER" = 1 ] || { say "master $MASTER holds $GROUP_ON_MASTER groups named '$GROUP_NAME' (exactly 1 required)"; return 1; }
  return 0
}

resolve_target() {
  local file base de_version="" same_lang=""
  shopt -s nullglob
  for file in "$ARCHIVE_DIR/$STEM"-*.mp4; do
    base="${file##*/}"
    if [[ "$base" =~ ^${STEM}-de-vorschau-v([0-9]+)\.mp4$ ]]; then
      [ -z "$de_version" ] || [ "${BASH_REMATCH[1]}" -gt "$de_version" ] && de_version="${BASH_REMATCH[1]}"
    elif [[ "$base" =~ ^${STEM}-${LANGCODE}(-[a-z]+)?-v([0-9]+)\.mp4$ ]]; then
      [ -z "$same_lang" ] || [ "${BASH_REMATCH[2]}" -gt "$same_lang" ] && same_lang="${BASH_REMATCH[2]}"
    fi
  done
  shopt -u nullglob
  if [ -n "${KLACKS_OUT_VERSION:-}" ]; then OUT_VERSION="$KLACKS_OUT_VERSION"
  elif [ -n "$same_lang" ]; then
    [ "${KLACKS_NEW_VERSION:-0}" = 1 ] || { say "the archive already holds $STEM-$LANGCODE v$same_lang; KLACKS_NEW_VERSION=1 writes v$((same_lang + 1))"; return 1; }
    OUT_VERSION=$((same_lang + 1))
  else OUT_VERSION="${de_version:-1}"; fi
  TARGET_NAME="$STEM-$LANGCODE$INFIX-v$OUT_VERSION.mp4"
  TARGET="$ARCHIVE_DIR/$TARGET_NAME"
  [ ! -e "$TARGET" ] || { say "archive target exists: $TARGET_NAME"; return 1; }
  return 0
}

run_gate() {
  timeout 90 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$SCRIPTS/series-gate.ps1")" -MinFreeMb "$MIN_FREE_MB" -MinFreeDiskMb "$MIN_DISK_MB" -TempPath "$(w "$TMPU")" < /dev/null 3>&- 2>&1 | tr -d '\r' | sed 's/^/gate: /'
  return "${PIPESTATUS[0]}"
}

if [ "$MODE" = dry ]; then
  say "DRY RUN $CLIP $LANGCODE: nothing is started, written or copied"
  FAIL=0
  check_static || FAIL=1
  [ "$FAIL" = 1 ] || resolve_target || FAIL=1
  [ "$FAIL" = 1 ] || say "target: $TARGET_NAME (version $OUT_VERSION) in $ARCHIVE_DIR"
  say "video $VIDEO, master $MASTER -> copy $TAKEDB, recipe $RECIPE, raw $RAW, dark-frame fix $DARK_FIX, trim $TRIM, accept-gap ${KLACKS_SECURITY_ACCEPT_GAP:-unset}"
  say "credentials: user $([ -n "${KLACKS_DEMO_USER:-}" ] && echo set || echo MISSING), password $([ -n "${KLACKS_DEMO_PASSWORD:-}" ] && echo set || echo MISSING)"
  if [ -z "${KLACKS_DEMO_USER:-}" ] || [ -z "${KLACKS_DEMO_PASSWORD:-}" ]; then say "KLACKS_DEMO_USER / KLACKS_DEMO_PASSWORD are required for a run"; FAIL=1; fi
  run_gate || FAIL=1
  say "dry run result: $([ "$FAIL" = 0 ] && echo 'a take could start' || echo 'a take would be refused')"
  trap - EXIT
  exit "$FAIL"
fi

: "${KLACKS_DEMO_USER:?set KLACKS_DEMO_USER}" "${KLACKS_DEMO_PASSWORD:?set KLACKS_DEMO_PASSWORD}"
mkdir -p "$WORK" || die 4 "cannot create $WORK"
check_static || die 4 "static checks failed"
resolve_target || die 7 "no free archive target"

if mkdir "$LOCKDIR" 2> /dev/null; then LOCK_OWNED=1
else
  other="$(cat "$LOCKDIR/pid" 2> /dev/null)"
  if [ -n "$other" ] && kill -0 "$other" 2> /dev/null; then die 3 "another record-series.sh run is active (pid $other)"; fi
  die 3 "stale lock $LOCKDIR (pid '${other:-?}' is gone): check that nothing of that run is left, then remove the folder"
fi
echo "$$" > "$LOCKDIR/pid"

NEW_RUN="${KLACKS_RUN_DIR:-$WORK/$CLIP-$LANGCODE-$(date +%Y%m%d-%H%M%S)}"
[ ! -e "$NEW_RUN" ] || die 4 "run folder $NEW_RUN exists already"
RUN="$NEW_RUN"
mkdir -p "$RUN/frames" "$RUN/out" "$RUN/work" "$RUN/tmp" || die 4 "cannot create the run folder"
printf '%s
' "$RUN" > "$WORK/current"
exec 3>&1
exec >> "$RUN/run.log" 2>&1
HAVE_FD3=1
say "run folder $(w "$RUN") (pid $$); log run.log, phase file STATUS, exit file EXIT"
[ -z "${KLACKS_SECURITY_ACCEPT_GAP:-}" ] || say "NOTE: KLACKS_SECURITY_ACCEPT_GAP is set, a plan with an open slot may pass"

status gate
run_gate || die 3 "gate closed (see the gate lines above)"

FRAMES="$RUN/frames"
TAKE_DIR="$FRAMES/$VIDEO-$LANGCODE"
RUN_W="$(w "$RUN")"
FF="$(w "$(command -v ffmpeg)")"
FP="$(w "$(command -v ffprobe)")"

status database
case "$TAKEDB" in klacks_marketing_security_*_take) ;; *) die 4 "refusing take database name $TAKEDB" ;; esac
[ "$TAKEDB" != "$MASTER" ] || die 4 "take database equals the master"
active="$(psql_db postgres -c "select count(*) from pg_stat_activity where datname = '$MASTER'")"
[ "$active" = 0 ] || die 4 "$active connection(s) to the master $MASTER: a template cannot be copied while it is in use"
psql_db postgres -c "DROP DATABASE IF EXISTS $TAKEDB" || die 4 "cannot drop the old take copy $TAKEDB (in use?)"
psql_db postgres -c "CREATE DATABASE $TAKEDB TEMPLATE $MASTER" || die 4 "copy of $MASTER failed"
GROUP_ID="$(psql_db "$TAKEDB" -c "select id from \"group\" where name = '$GROUP_NAME' and not is_deleted")"
case "$GROUP_ID" in
  ????????-????-????-????-????????????) ;;
  *) die 4 "group id of '$GROUP_NAME' in $TAKEDB is not a single uuid: '$GROUP_ID'" ;;
esac
say "take database $TAKEDB, group $GROUP_ID"

status api
(
  export Hosting__UiRoot="$(w "$REL/ui")"
  timeout 180 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$ROOT/tools/grouping-demo/start-recording-api.ps1")" \
    -Source "$(w "$REL/app")" -Destination "$(w "$API_DEST")" -Database "$TAKEDB" -KeysFolder "$(w "$SUPER/Klacks.Api/DataProtection-Keys")" -LogFile "$RUN_W\\api.log"
) < /dev/null 3>&-
HEALTHY=0
for i in $(seq 1 100); do
  [ "$(curl -m 4 -sk -o /dev/null -w '%{http_code}' "$API_URL/health" < /dev/null)" = 200 ] && { HEALTHY=1; break; }
  sleep 3
done
[ "$HEALTHY" = 1 ] || die 5 "the API did not become healthy within 300 s (api.log, api.log.err)"
say "API healthy after about $((i * 3)) s"
UI_VERSION="$(curl -m 8 -sk "$API_URL/version.json" < /dev/null)"
case "$UI_VERSION" in *"\"version\":\"$RELEASE_VERSION\""*) say "UI served by the API: $RELEASE_VERSION" ;; *) die 5 "the API does not serve the release UI (version.json: ${UI_VERSION:0:120})" ;; esac
say "API Version endpoint: $(curl -m 8 -sk "$API_URL/api/backend/Version" < /dev/null | head -c 120)"

status take
(
  export KLACKS_API_URL="$API_URL" KLACKS_UI_URL="$API_URL" KLACKS_VIDEO_MAX_MB=12 KLACKS_VIDEO_FRAMES_DIR="$(w "$FRAMES")" FFMPEG_PATH="$FF"
  export TEMP="$RUN_W\\tmp" TMP="$RUN_W\\tmp"
  cd "$ROOT" || exit 99
  exec timeout "$TAKE_TIMEOUT" node tools/capture-app-videos.mjs --videos "$VIDEO" --cultures "$LANGCODE" --group-id "$GROUP_ID" --test-take --encode-publishable-only --frames-dir "$(w "$FRAMES")" --ffmpeg "$FF"
) > "$RUN/capture.log" 2>&1 < /dev/null 3>&- &
CAPTURE_PID=$!
wait "$CAPTURE_PID"
CAPTURE_RC=$?
say "capture exited with $CAPTURE_RC"
status services-stop
stop_all

REPORT="$TAKE_DIR/take-report.json"
TAKE_MP4="$TAKE_DIR/$VIDEO-$LANGCODE.mp4"
grep -q "skipping $LANGCODE: not installed" "$RUN/capture.log" && die 5 "language $LANGCODE is not installed in the released API (capture.log)"
[ -f "$REPORT" ] || die 5 "no take report at $REPORT (capture.log)"
PUBLISHABLE="$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(r.publishable===true)' "$(w "$REPORT")" < /dev/null)"
if [ "$PUBLISHABLE" != true ]; then
  say "take failure: $(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(String(r.failure??"none recorded").slice(0,500))' "$(w "$REPORT")" < /dev/null)"
  die 5 "take is not publishable; frames and report stay in $TAKE_DIR"
fi
[ "$CAPTURE_RC" = 0 ] || die 5 "capture exited with $CAPTURE_RC although the report says publishable"
[ -s "$TAKE_MP4" ] || die 5 "publishable, but the encoded take is missing: $TAKE_MP4"
say "take publishable: $TAKE_MP4"

FIX_ARGS=(--frames-dir "$(w "$TAKE_DIR")" --ffmpeg "$FF")
if [ "$DARK_FIX" = 1 ]; then FIX_ARGS+=(--dark); fi
if [ "$TRIM" != none ]; then
  IFS=',' read -r -a TRIMS <<< "$TRIM"
  for t in "${TRIMS[@]}"; do FIX_ARGS+=(--trim "$t"); done
fi
if [ "$DARK_FIX" = 1 ] || [ "$TRIM" != none ]; then
  status fix-take
  (cd "$ROOT" && export TEMP="$RUN_W\\tmp" TMP="$RUN_W\\tmp" KLACKS_VIDEO_MAX_MB=12 && timeout 1800 node tools/series-recording/fix-take.mjs "${FIX_ARGS[@]}") > "$RUN/fix-take.log" 2>&1 < /dev/null 3>&- &
  wait $!
  FIX_RC=$?
  say "fix-take exited with $FIX_RC: $(tail -c 300 "$RUN/fix-take.log" | tr '\n' ' ')"
  [ "$FIX_RC" = 0 ] || die 5 "post-processing of the take failed (fix-take.log)"
else
  (cd "$ROOT" && timeout 600 node tools/series-recording/fix-take.mjs --frames-dir "$(w "$TAKE_DIR")" --ffmpeg "$FF" --dark --dry-run) > "$RUN/dark-report.log" 2>&1 < /dev/null 3>&-
  say "dark-frame report (advisory: the measured area is the grid of m2; KLACKS_DARK_FIX=1 would replace the frames): $(tr -d ' \n' < "$RUN/dark-report.log" | head -c 300)"
fi

status build
BUILT="$RUN/out/$OUTPUT_PREFIX$LANGCODE.mp4"
(
  export TEMP="$RUN_W\\tmp" TMP="$RUN_W\\tmp"
  cd "$ROOT/tools/story-video" || exit 99
  exec timeout "$BUILD_TIMEOUT" node build-weekplan-video.mjs --culture "$LANGCODE" --raw "$(w "$RAW_DIR/$RAW")" --out-dir "$(w "$RUN/out")" --recipe "./$RECIPE" \
    --take "$(w "$TAKE_MP4")" --work-dir "$(w "$RUN/work")" --ffmpeg "$FF" --ffprobe "$FP"
) > "$RUN/build.log" 2>&1 < /dev/null 3>&- &
wait $!
BUILD_RC=$?
say "build exited with $BUILD_RC: $(grep -E "^monthplan|^scenario|standard\)" "$RUN/build.log" | tail -1)"
[ "$BUILD_RC" = 0 ] || die 6 "build failed or its checks failed (build.log); the video, if any, stays in $(w "$RUN/out") and is NOT copied"
[ -s "$BUILT" ] || die 6 "build exited 0 but $BUILT is missing"

status archive
resolve_target || die 7 "archive target changed during the run"
cp -n "$BUILT" "$TARGET" || die 7 "copy into the archive failed"
cmp -s "$BUILT" "$TARGET" || die 7 "the archived copy differs from the built video"
DURATION="$(timeout 60 ffprobe -v error -show_entries format=duration -of csv=p=0 "$(w "$TARGET")" < /dev/null | tr -d '\r')"
printf '%s\n' "clip=$CLIP lang=$LANGCODE video=$VIDEO target=$TARGET_NAME seconds=$DURATION take=$(w "$TAKE_MP4") release=$RELEASE_VERSION" > "$RUN/RESULT"
say "DONE: $TARGET_NAME, $DURATION s, in $(w "$ARCHIVE_DIR")"
status done
exit 0
