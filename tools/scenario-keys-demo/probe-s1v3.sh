#!/usr/bin/env bash
# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Runs the browser probe of clip S1 v3 (probe-s1-browser.mjs) against a released Klacks on a THROW-AWAY copy of klacks_marketing_security_bern_s3, then stops everything it started.
# Steps: gate (free RAM, KLACKS_MIN_FREE_MB) -> copy klacks_marketing_security_bern_s3_probe_take from the master -> the release API from KLACKS_RELEASE_DIR on https://localhost:5011
# (it serves the release Ui itself) -> probe -> stop (series-stop.ps1 by the probe folder and the private API folder only) -> the copy is dropped.
# Usage:  KLACKS_RELEASE_VERSION=1.0.63 KLACKS_DEMO_USER=... KLACKS_DEMO_PASSWORD=... bash tools/scenario-keys-demo/probe-s1v3.sh <out folder, must not exist> [--no-chat] [--headed]
# Env (optional): KLACKS_PROBE_MASTER (klacks_marketing_security_bern_s3; any klacks_marketing_security_* master)  KLACKS_PROBE_SCRIPT (probe-s1-browser.mjs; probe-s0-rules.mjs for clip S0; several separated by commas run one after the other, each with --out <out>/<name>)
#   KLACKS_RELEASE_DIR (%TEMP%\klacks-release-<version>)  KLACKS_MIN_FREE_MB (4096)  PSQL  PGPASSWORD (default admin)
# Never touched: the master database (only copied), other processes (the stop matches the probe folder and the private API folder only), Git.
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS="$(cd "$HERE/.." && pwd)"
SUPER="$(cd "$TOOLS/../.." && pwd)"
TMPU="$(cygpath -u "${TEMP:-${TMP:-/tmp}}")"
w() { cygpath -w "$1"; }

: "${KLACKS_RELEASE_VERSION:?set KLACKS_RELEASE_VERSION}" "${KLACKS_DEMO_USER:?set KLACKS_DEMO_USER}" "${KLACKS_DEMO_PASSWORD:?set KLACKS_DEMO_PASSWORD}"
OUT="${1:?usage: probe-s1v3.sh <out folder> [--no-chat] [--headed]}"; shift
REL="${KLACKS_RELEASE_DIR:-$TMPU/klacks-release-$KLACKS_RELEASE_VERSION}"
PSQL="${PSQL:-/c/Program Files/PostgreSQL/17/bin/psql.exe}"
export PGPASSWORD="${PGPASSWORD:-admin}"
MASTER="${KLACKS_PROBE_MASTER:-klacks_marketing_security_bern_s3}"
COPY="${MASTER}_probe_take"
PROBE="${KLACKS_PROBE_SCRIPT:-probe-s1-browser.mjs}"
API_DEST="$TMPU/klacks-rec-s1v3-probe"
API_URL="https://localhost:5011"
GROUP_NAME="Bern Objektschutz"

psql_db() { local db="$1" out; shift; out="$(timeout 120 "$PSQL" -h localhost -p 5434 -U postgres -d "$db" -q -tA "$@" < /dev/null)" || return 1; printf '%s\n' "${out//$'\r'/}"; }
die() { echo "ABORT: $*"; exit 1; }
stop_all() {
  timeout 90 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$TOOLS/series-recording/series-stop.ps1")" -Marker "$(w "$OUT")" -Destination "$(w "$API_DEST")" < /dev/null 2>&1 | sed 's/^/stop: /'
  psql_db postgres -c "DROP DATABASE IF EXISTS $COPY" > /dev/null 2>&1 || echo "the copy $COPY could not be dropped"
}

[ ! -e "$OUT" ] || die "$OUT exists already"
[ -f "$REL/app/Klacks.Api.exe" ] && [ -f "$REL/ui/index.html" ] || die "release $KLACKS_RELEASE_VERSION is not unpacked in $(w "$REL")"
grep -q "\"version\":\"$KLACKS_RELEASE_VERSION\"" "$REL/ui/version.json" || die "ui/version.json is not $KLACKS_RELEASE_VERSION"
curl -m 3 -sk -o /dev/null "$API_URL/health" < /dev/null && die "something answers on $API_URL already"
timeout 90 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$TOOLS/series-recording/series-gate.ps1")" -MinFreeMb "${KLACKS_MIN_FREE_MB:-4096}" -MinFreeDiskMb 6144 -TempPath "$(w "$TMPU")" < /dev/null 2>&1 | tr -d '\r' | sed 's/^/gate: /'
[ "${PIPESTATUS[0]}" = 0 ] || die "gate closed"

mkdir -p "$OUT/tmp"
trap stop_all EXIT
[ "$(psql_db postgres -c "select count(*) from pg_stat_activity where datname = '$MASTER'")" = 0 ] || die "the master $MASTER is in use"
psql_db postgres -c "DROP DATABASE IF EXISTS $COPY" || die "cannot drop the old copy"
psql_db postgres -c "CREATE DATABASE $COPY TEMPLATE $MASTER" || die "copy failed"
GROUP_ID="$(psql_db "$COPY" -c "select id from \"group\" where name = '$GROUP_NAME' and not is_deleted")"
case "$MASTER" in klacks_marketing_security_*) ;; *) die "refusing master $MASTER" ;; esac
case "$GROUP_ID" in ????????-????-????-????-????????????) ;; *) die "group id '$GROUP_ID'" ;; esac
echo "copy $COPY, group $GROUP_ID"

(
  export Hosting__UiRoot="$(w "$REL/ui")"
  timeout 180 powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$(w "$TOOLS/grouping-demo/start-recording-api.ps1")" \
    -Source "$(w "$REL/app")" -Destination "$(w "$API_DEST")" -Database "$COPY" -KeysFolder "$(w "$SUPER/Klacks.Api/DataProtection-Keys")" -LogFile "$(w "$OUT")\\api.log"
) < /dev/null
for i in $(seq 1 100); do
  [ "$(curl -m 4 -sk -o /dev/null -w '%{http_code}' "$API_URL/health" < /dev/null)" = 200 ] && break
  sleep 3
done
[ "$(curl -m 4 -sk -o /dev/null -w '%{http_code}' "$API_URL/health" < /dev/null)" = 200 ] || die "API not healthy (api.log)"
echo "API healthy; version.json: $(curl -m 8 -sk "$API_URL/version.json" < /dev/null | head -c 120)"
echo "migrations: $(psql_db "$COPY" -c 'select count(*) || '"' '"' || max(migration_id) from "__EFMigrationsHistory"')"

(
  export KLACKS_API_URL="$API_URL" KLACKS_UI_URL="$API_URL" TEMP="$(w "$OUT")\\tmp" TMP="$(w "$OUT")\\tmp"
  cd "$TOOLS/.." || exit 99
  IFS=',' read -r -a PROBES <<< "$PROBE"
  for one in "${PROBES[@]}"; do
    echo "== $one"
    timeout 900 node "tools/scenario-keys-demo/$one" --out "$(w "$OUT")/${one%.mjs}" --group-id "$GROUP_ID" "$@" || echo "$one exited with $?"
  done
) < /dev/null
echo "probe exited with $?"
