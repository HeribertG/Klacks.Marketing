# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Stops exactly what one run of tools/record-series.sh started and nothing else:
#   - every process whose executable lies below -Destination (the private copy of the release API and the optimizer it spawns),
#   - every node, Playwright browser (chrome / headless shell, its crash handler), ffmpeg, ffprobe or timeout process whose command line contains -Marker (the run folder; the
#     browser profile folder lies below the run folder because the run sets TEMP/TMP there), so browser children survive neither a killed node nor a timeout. Shells and every
#     other process name are never matched, even when their command line mentions the run folder.
# Then it deletes the DataProtection key copy below -Destination. A run folder or destination that is empty or short is refused, so a wrong call can never match everything.
# Own process and its parents are never touched. Output: one summary line, the number of processes still found.
param(
    [Parameter(Mandatory = $true)][string]$Marker,
    [Parameter(Mandatory = $true)][string]$Destination
)

$ErrorActionPreference = 'Stop'
$minimumLength = 20
if ($Marker.Length -lt $minimumLength -or $Destination.Length -lt $minimumLength) { throw "Refusing a marker or destination shorter than $minimumLength characters." }

$markerProcessNames = '^(node|chrome|chrome-headless-shell|headless_shell|chrome_crashpad_handler|crashpad_handler|ffmpeg|ffprobe|timeout)\.exe$'

function Get-Targets {
    $protected = New-Object System.Collections.Generic.HashSet[int]
    $cursor = $PID
    $all = Get-CimInstance Win32_Process
    $byId = @{}
    foreach ($process in $all) { $byId[[int]$process.ProcessId] = $process }
    while ($cursor -and $byId.ContainsKey($cursor) -and $protected.Add($cursor)) { $cursor = [int]$byId[$cursor].ParentProcessId }
    $all | Where-Object {
        -not $protected.Contains([int]$_.ProcessId) -and (
            ([string]$_.ExecutablePath -like "$Destination\*") -or
            ($_.Name -match $markerProcessNames -and [string]$_.CommandLine -like "*$Marker*")
        )
    }
}

$stopped = 0
foreach ($attempt in 1..3) {
    $targets = @(Get-Targets)
    if ($targets.Count -eq 0) { break }
    foreach ($target in $targets) {
        Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
        $stopped++
    }
    Start-Sleep -Seconds 2
}
$left = @(Get-Targets).Count
Remove-Item -Recurse -Force (Join-Path $Destination 'DataProtection-Keys') -ErrorAction SilentlyContinue
"stopped $stopped, left $left"
exit ([int]($left -gt 0))
