# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
#
# Fetches the Windows release package klacks-<Version>-win-x64.zip of Klacks.Api from GitHub and unpacks it into a new, empty folder: <Destination>\app is the self-contained
# API (Klacks.Api.exe), <Destination>\ui the production Angular build that the API serves itself through Hosting:UiRoot. Nothing from the package is started or built.
# Refuses to run when -Destination exists (a package is never unpacked over another one); the zip is deleted after unpacking. Needs gh (logged in) on the PATH.
# Usage: .\series-prepare-release.ps1 -Version 1.0.55 -Destination C:\...\klacks-release-1.0.55
param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$Repository = 'HeribertG/Klacks.Api'
)

$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "Version '$Version' is not X.Y.Z." }
if (Test-Path -LiteralPath $Destination) { throw "Destination '$Destination' exists; remove it by hand or pick another folder." }

$download = "$Destination.download"
if (Test-Path -LiteralPath $download) { throw "Download folder '$download' exists; remove it by hand." }
New-Item -ItemType Directory -Path $download | Out-Null

$asset = "klacks-$Version-win-x64.zip"
gh release download "v$Version" --repo $Repository --pattern $asset --dir $download
if ($LASTEXITCODE -ne 0) { throw "gh release download failed (exit $LASTEXITCODE)." }
$zip = Join-Path $download $asset
if (-not (Test-Path -LiteralPath $zip) -or (Get-Item -LiteralPath $zip).Length -lt 1MB) { throw "Downloaded package '$zip' is missing or too small." }

Expand-Archive -LiteralPath $zip -DestinationPath $Destination
Remove-Item -Recurse -Force -LiteralPath $download

$uiVersion = (Get-Content -Raw -LiteralPath (Join-Path $Destination 'ui\version.json') | ConvertFrom-Json).version
if ($uiVersion -ne $Version) { throw "ui\version.json says $uiVersion, expected $Version." }
foreach ($required in 'app\Klacks.Api.exe', 'app\Klacks.Api.dll', 'ui\index.html') {
    if (-not (Test-Path -LiteralPath (Join-Path $Destination $required))) { throw "Package lacks $required." }
}
"unpacked $asset into $Destination"
