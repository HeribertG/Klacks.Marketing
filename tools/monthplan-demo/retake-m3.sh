#!/bin/bash
# Records one take of the M3 month-plan clip (take security-month-plan) on a fresh copy of the M3 master DB.
# usage: KLACKS_DEMO_PASSWORD=... retake-m3.sh <n> [culture] [logdir]
#   n        take number, only used for the log file name
#   culture  de (default), en, fr or it
#   logdir   where take<n>.log goes (default: $TEMP/m3-takes)
# Needs: DB klacks_marketing_security_bern_m3 on localhost:5434, a Debug build of Klacks.Api with ClientAvailabilities,
# the Ui on http://localhost:4210 (ng serve --port 4210), ffmpeg on PATH. The take lands in %TEMP%\klacks-video-frames.
set -u
[ -n "${KLACKS_DEMO_PASSWORD:-}" ] || { echo "set KLACKS_DEMO_PASSWORD (demo admin password)"; exit 1; }
C=${2:-de}
L=${3:-${TEMP:-/tmp}/m3-takes}
mkdir -p "$L"
P="/c/Program Files/PostgreSQL/17/bin/psql.exe"
HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS="$(dirname "$HERE")"
stop_api() { powershell.exe -NoProfile -Command "Get-Process Klacks.Api -ErrorAction SilentlyContinue | Where-Object { \$_.Path -like '*klacks-rec-m3v2*' } | Stop-Process -Force"; }
stop_api
sleep 3
"$P" "postgresql://postgres:admin@localhost:5434/postgres" -q -c "DROP DATABASE IF EXISTS klacks_marketing_security_bern_m3_take WITH (FORCE);" -c "CREATE DATABASE klacks_marketing_security_bern_m3_take TEMPLATE klacks_marketing_security_bern_m3;" || exit 1
"$P" "postgresql://postgres:admin@localhost:5434/klacks_marketing_security_bern_m3_take" -q -v ON_ERROR_STOP=1 -f "$HERE/seed-m3-availability.sql" || exit 1
pwsh -NoProfile -Command "& $TOOLS\grouping-demo\start-recording-api.ps1 -Source C:\SourceCode\Klacks.Api\bin\Debug\net10.0 -Destination \"\$env:TEMP\klacks-rec-m3v2\" -Database klacks_marketing_security_bern_m3_take -LogFile C:\SourceCode\klacks-api-rec-m3v2.log -CorsAdditional 'http://localhost:4210'; for(\$i=0;\$i -lt 60;\$i++){ try { if((Invoke-WebRequest https://localhost:5011/api/Version -SkipCertificateCheck -TimeoutSec 3).StatusCode -eq 200){'api up';break} } catch {}; Start-Sleep 3 }"
for i in 1 2 3 4 5 6; do curl -sk -o /dev/null https://localhost:5011/api/config/languages; curl -sk -o /dev/null https://localhost:5011/api/backend/Playground/Status; sleep 5; done
cd "$TOOLS"
export KLACKS_API_URL=https://localhost:5011 KLACKS_UI_URL=http://localhost:4210 KLACKS_DEMO_USER=admin@test.com FFMPEG_PATH="$(which ffmpeg)" NODE_TLS_REJECT_UNAUTHORIZED=0
timeout 2400 node capture-app-videos.mjs --videos security-month-plan --cultures "$C" --test-take --group-id 0cadbf52-3b5a-43fc-b41d-1237b578b279 > "$L/take$1.log" 2>&1
echo exit $?
stop_api
grep -v "^(node\|^(Use" "$L/take$1.log" | cut -c1-600 | tail -40
