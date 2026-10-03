# Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only
# Starts a second Klacks backend for the Klacksy grouping takes: copies a built Klacks.Api output to a private folder,
# points it at the grouping demo database and disables every background service that talks to the outside world
# (a database copy carries real bot tokens). The DataProtection keys are copied so encrypted settings (LLM keys) can
# be read; delete <Destination>\DataProtection-Keys after recording.
# Usage: .\start-recording-api.ps1 -Source <Klacks.Api\bin\Debug\net10.0> -Destination <scratch folder>
# Then record with KLACKS_API_URL=https://localhost:5011 (the tools reroute the UI's calls from 5001).

param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [string]$KeysFolder = 'C:\SourceCode\Klacks.Api\DataProtection-Keys',
    [string]$Database = 'klacks_marketing_grouping',
    [string]$Urls = 'https://localhost:5011;http://localhost:5010',
    [string]$LogFile = 'C:\SourceCode\klacks-api-rec.log'
)

$ErrorActionPreference = 'Stop'
if (-not $Database.StartsWith('klacks_marketing_')) { throw "Refusing database '$Database' - only klacks_marketing_* copies are allowed." }

Get-Process Klacks.Api -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$Destination*" } | Stop-Process -Force
Start-Sleep -Seconds 2
if (Test-Path $Destination) { Remove-Item -Recurse -Force $Destination }
robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NP | Out-Null
Copy-Item -Recurse $KeysFolder (Join-Path $Destination 'DataProtection-Keys')

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = $Urls
$env:ConnectionStrings__DefaultConnection = "User ID=postgres;Password=admin;Host=localhost;Port=5434;Database=$Database;Pooling=true;"
$disabled = @(
    'SlackOwnerBridge', 'Wizard4', 'AgentTrigger', 'EmailPolling', 'Embedding', 'RegionPackageUpdate', 'MemoryCleanup',
    'DataRetention', 'LLMModelSync', 'InboundMessagePolling', 'MessageRetention', 'SkillRelationLearning', 'KlacksyLearning',
    'GoalReflection', 'GoalReflectionDelivery', 'GoalReflectionPlanDrafting', 'GoalReflectionExecution', 'EscalationChain',
    'MessengerIntentAnalysis', 'InboundClarificationSweep', 'GroupGeocoding', 'SkillCoverage', 'PendingNoteBroadcastCleanup',
    'ScheduledTask', 'ErpOrderImport', 'AnswerGroundingSentinel', 'AddressGeocoding', 'AgentConditionDigest',
    'GoalPlanExecutionRetry', 'PlanApprovalTimeout', 'RosterPublicationCheck', 'SealOpenOrdersJob', 'UpdateDetection',
    'WizardRunCaptureMeasurement'
)
foreach ($service in $disabled) { Set-Item -Path "env:BackgroundServices__$service" -Value 'false' }

Start-Process -FilePath (Join-Path $Destination 'Klacks.Api.exe') -WorkingDirectory $Destination `
    -RedirectStandardOutput $LogFile -RedirectStandardError "$LogFile.err" -WindowStyle Hidden
