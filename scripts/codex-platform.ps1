param([ValidateSet('verify','launch','restore','discover')][string]$Action,[int]$Port=9357,[Parameter(Mandatory=$true)][string]$ArkState)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../vendor/dream-skin/windows/scripts/common-windows.ps1')
Assert-DreamSkinPort -Port $Port
if ($Action -eq 'discover') { $app=Get-DreamSkinCodexInstall; @{version=$app.Version; executable=$app.Executable} | ConvertTo-Json -Compress; exit }
if ($Action -eq 'verify') {
 $verified=Get-DreamSkinVerifiedCdpIdentityForAnyRegistered -Port $Port
 if ($null -eq $verified) { throw 'No verified official Codex loopback endpoint.' }
 @{verified=$true;version=$verified.Codex.Version;browserId=$verified.Identity.BrowserId} | ConvertTo-Json -Compress
 exit
}
$owned=Join-Path $ArkState 'codex-launch.json'
if ($Action -eq 'launch') {
 $app=Get-DreamSkinCodexInstall
 if (@(Get-DreamSkinCodexProcesses -Codex $app).Count -gt 0) { throw 'Close Codex normally before enhanced launch; existing sessions are not interrupted.' }
 if (-not (Test-DreamSkinPortAvailable -Port $Port)) { throw 'Requested debug port is already in use.' }
 New-Item -ItemType Directory -Force $ArkState | Out-Null
 $profile=Join-Path $ArkState 'cdp-profile'
 $result=Start-DreamSkinCodexForDebugging -Codex $app -Port $Port -Arguments @('--remote-debugging-address=127.0.0.1',"--remote-debugging-port=$Port","--user-data-dir=$profile")
 @{port=$Port;executable=$app.Executable;version=$app.Version;profile=$profile} | ConvertTo-Json | Set-Content -LiteralPath $owned -Encoding utf8
 @{launched=$true;profile=$profile;message='Verify login and existing sessions in the independent debug profile.'} | ConvertTo-Json -Compress
} else {
 if (-not (Test-Path -LiteralPath $owned)) { throw 'No project-owned launch record; refusing to stop Codex.' }
 $record=Get-Content -Raw -LiteralPath $owned | ConvertFrom-Json
 if ($record.port -ne $Port) { throw 'Launch record port mismatch.' }
 $verified=Get-DreamSkinVerifiedCdpIdentityForAnyRegistered -Port $Port
 if ($null -eq $verified -or -not (Test-DreamSkinPathEqual -Left $record.executable -Right $verified.Codex.Executable)) { throw 'Cannot verify owned Codex process; close debug app normally and run restore again.' }
 Stop-DreamSkinCodex -Codex $verified.Codex
 if (-not (Test-DreamSkinPortAvailable -Port $Port)) { throw 'Debug port remains open.' }
 $null=Start-DreamSkinCodex -Codex $verified.Codex -Arguments @()
 Remove-Item -LiteralPath $owned
 @{restored=$true;portClosed=$true} | ConvertTo-Json -Compress
}
