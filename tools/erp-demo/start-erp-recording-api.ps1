# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
# Starts a recording backend for the ERP clip (takes/erp-takes.mjs) that behaves like a native Windows office PC: Hosting__DataRoot is set,
# so the installation identity is "native", the ERP drop point folder resolves to <DataRoot>\ErpImport\erp\orders and Klacksy gives the native
# advice. The API serves the built UI itself (Hosting__UiRoot), one origin as on an office PC.
# DataRoot also relocates other writable paths; this script pins them so only the ERP folder and the key ring copy land below DataRoot:
#   Images, Documents, PayrollExports -> absolute paths in <Destination>;  KnowledgeIndex:ModelsRoot -> <Destination>\Cache\Models (the copied models);
#   the file key ring <DataRoot>\DataProtection-Keys cannot be moved (DataRootPaths.Resolve), so a COPY of the dev keys goes there (encrypted LLM keys).
# Safety: DataRoot must not exist, or must carry the marker file of an earlier recording; a real installation (no marker, or a Windows service
# "Klacks") makes the script stop. The DataRoot is restricted to the current user, SYSTEM and Administrators. Remove it afterwards with
# stop-erp-recording-api.ps1 (it deletes DataRoot only when the marker is there).
# Unlike grouping-demo/start-recording-api.ps1 the background service ErpOrderImport stays ON ("Jetzt importieren" only moves the next-run marker,
# the minute tick imports); SealOpenOrdersJob stays off so nothing seals the imported drafts.
# Usage: .\start-erp-recording-api.ps1 -Source <Klacks.Api build output> -UiRoot <built UI browser folder> -Destination <private folder> -Database klacks_marketing_*

param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$UiRoot,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][string]$Database,
    [string]$DataRoot = 'C:\ProgramData\Klacks',
    [string]$KeysFolder = 'C:\SourceCode\Klacks.Api\DataProtection-Keys',
    [string]$Urls = 'https://localhost:5031;http://localhost:5030',
    [string]$LogFile = 'C:\SourceCode\klacks-api-rec-erp.log'
)

$ErrorActionPreference = 'Stop'
$marker = '.klacks-recording-demo'
if (-not $Database.StartsWith('klacks_marketing_')) { throw "Refusing database '$Database' - only klacks_marketing_* copies are allowed." }
if (Get-Service -Name 'Klacks' -ErrorAction SilentlyContinue) { throw 'A Windows service "Klacks" exists: this PC has a real native installation. Stop.' }
if ((Test-Path $DataRoot) -and -not (Test-Path (Join-Path $DataRoot $marker))) { throw "$DataRoot exists and is not a recording DataRoot (no $marker). Stop." }
if (-not (Test-Path (Join-Path $UiRoot 'index.html'))) { throw "No index.html in $UiRoot" }

Get-Process Klacks.Api -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq (Join-Path $Destination 'Klacks.Api.exe') } | Stop-Process -Force
Start-Sleep -Seconds 2
if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
robocopy $UiRoot (Join-Path $Destination 'ui') /E /NFL /NDL /NJH /NJS /NP | Out-Null

New-Item -ItemType Directory -Force $DataRoot | Out-Null
New-Item -ItemType File -Force (Join-Path $DataRoot $marker) | Out-Null
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
icacls $DataRoot /inheritance:r /grant:r "${me}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null
$keysTarget = Join-Path $DataRoot 'DataProtection-Keys'
if (Test-Path $keysTarget) { Remove-Item -Recurse -Force $keysTarget }
Copy-Item -Recurse $KeysFolder $keysTarget

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = $Urls
$env:ConnectionStrings__DefaultConnection = "User ID=postgres;Password=admin;Host=localhost;Port=5434;Database=$Database;Pooling=true;"
$env:Hosting__DataRoot = $DataRoot
$env:Hosting__UiRoot = (Join-Path $Destination 'ui')
$env:CurrentPaths__Images = (Join-Path $Destination 'Images')
$env:CurrentPaths__Documents = (Join-Path $Destination 'Documents')
$env:PayrollObjectStorage__RootPath = (Join-Path $Destination 'PayrollExports')
$env:KnowledgeIndex__ModelsRoot = (Join-Path $Destination 'Cache\Models')
$disabled = @(
    'SlackOwnerBridge', 'Wizard4', 'AgentTrigger', 'EmailPolling', 'Embedding', 'RegionPackageUpdate', 'MemoryCleanup',
    'DataRetention', 'LLMModelSync', 'InboundMessagePolling', 'MessageRetention', 'SkillRelationLearning', 'KlacksyLearning',
    'GoalReflection', 'GoalReflectionDelivery', 'GoalReflectionPlanDrafting', 'GoalReflectionExecution', 'EscalationChain',
    'MessengerIntentAnalysis', 'InboundClarificationSweep', 'GroupGeocoding', 'SkillCoverage', 'PendingNoteBroadcastCleanup',
    'ScheduledTask', 'AnswerGroundingSentinel', 'AddressGeocoding', 'AgentConditionDigest',
    'GoalPlanExecutionRetry', 'PlanApprovalTimeout', 'RosterPublicationCheck', 'SealOpenOrdersJob', 'UpdateDetection',
    'WizardRunCaptureMeasurement'
)
foreach ($service in $disabled) { Set-Item -Path "env:BackgroundServices__$service" -Value 'false' }

$process = Start-Process -FilePath (Join-Path $Destination 'Klacks.Api.exe') -WorkingDirectory $Destination `
    -RedirectStandardOutput $LogFile -RedirectStandardError "$LogFile.err" -WindowStyle Hidden -PassThru
Write-Output "Klacks.Api pid $($process.Id)"
