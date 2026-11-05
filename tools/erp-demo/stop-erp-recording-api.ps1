# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
# Stops the recording backend of start-erp-recording-api.ps1 (only the Klacks.Api.exe inside -Destination), deletes -Destination (it holds a
# copy of the dev key ring) and the recording DataRoot, but the DataRoot only when it carries the marker file written by the start script.
# Usage: .\stop-erp-recording-api.ps1 -Destination <private folder> [-DataRoot C:\ProgramData\Klacks]

param(
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$DataRoot = 'C:\ProgramData\Klacks'
)

$ErrorActionPreference = 'Stop'
$marker = '.klacks-recording-demo'
Get-Process Klacks.Api -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $Destination 'Klacks.Api.exe') } | Stop-Process -Force
Start-Sleep -Seconds 2
if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
if (Test-Path $DataRoot) {
    if (-not (Test-Path (Join-Path $DataRoot $marker))) { throw "$DataRoot has no $marker - not removed." }
    Remove-Item -Recurse -Force $DataRoot
}
Write-Output 'stopped and removed'
