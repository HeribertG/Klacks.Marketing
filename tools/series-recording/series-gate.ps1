# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Read-only gate of tools/record-series.sh: nothing is started, stopped or written. Exit 0 = a take may start, exit 1 = at least one finding (printed one per line).
# Findings: free RAM below -MinFreeMb, free disk below -MinFreeDiskMb on the drive of -TempPath, a listener on 5011/5010/4210 (the recording API binds 5011 and 5010, the UI
# is served by the API itself, 4210 is only checked because the older takes used it), and any process of another recording or build session
# (a Klacks.Api started from a klacks-rec-* folder, node running capture-app-videos / build-weekplan-video / a static UI server / a rehearsal, ffmpeg, dotnet, testhost, MSBuild).
# A dev backend (Klacks.Api.exe outside klacks-rec-*) is not a finding; it only counts through the RAM that it uses.
param(
    [int]$MinFreeMb = 4096,
    [int]$MinFreeDiskMb = 6144,
    [string]$TempPath = $env:TEMP
)

$ErrorActionPreference = 'Stop'
$findings = New-Object System.Collections.Generic.List[string]

$freeMb = [int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1024)
if ($freeMb -lt $MinFreeMb) { $findings.Add("free RAM $freeMb MB is below the required $MinFreeMb MB") }

$drive = (Get-Item -LiteralPath $TempPath).PSDrive
$freeDiskMb = [int]($drive.Free / 1MB)
if ($freeDiskMb -lt $MinFreeDiskMb) { $findings.Add("free disk $freeDiskMb MB on $($drive.Name): is below the required $MinFreeDiskMb MB") }

foreach ($port in 5011, 5010, 4210) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) { $findings.Add("port $port is already in use (pid $($listener.OwningProcess))") }
}

$processes = Get-CimInstance Win32_Process
$sessionMarkers = 'capture-app-videos', 'build-weekplan-video', 'build-story-video', 'build-intro-video', 'static-ui', 'rehearse', 'record-spitex', 'record-series'
foreach ($process in $processes) {
    $name = $process.Name
    $commandLine = [string]$process.CommandLine
    $path = [string]$process.ExecutablePath
    if ($name -eq 'Klacks.Api.exe' -and $path -like '*\klacks-rec-*') { $findings.Add("recording API running: pid $($process.ProcessId) $path"); continue }
    if ($name -eq 'node.exe') {
        foreach ($marker in $sessionMarkers) {
            if ($commandLine -like "*$marker*") { $findings.Add("node of another session: pid $($process.ProcessId) ($marker)"); break }
        }
        continue
    }
    if ($name -in 'ffmpeg.exe', 'dotnet.exe', 'testhost.exe', 'testhost.net.exe', 'MSBuild.exe', 'VBCSCompiler.exe') { $findings.Add("$name is running: pid $($process.ProcessId)") }
}

"free RAM $freeMb MB, free disk $freeDiskMb MB on $($drive.Name):"
foreach ($finding in $findings) { "BLOCKED: $finding" }
if ($findings.Count -gt 0) { exit 1 }
'gate open'
exit 0
