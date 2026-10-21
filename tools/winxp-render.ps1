# winxp-render.ps1 — run an exe in the Administrator interactive session (session 2) on box-win.
#
# ssh lands in session 0: SetSysColors has no effect there, so the palette switch and the
# classic matrix must run in session 2 (RDP disconnected is fine) via schtasks /IT.
# /TR must be wrapped in cmd /c for output redirection (schtasks runs the string through CreateProcess).
#
# Usage (from the Mac):
#   ssh box-win "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\classic2\winxp-render.ps1"
#   ssh box-win "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\classic2\winxp-render.ps1 -Arguments 'checkcolors C:\probe\classic2\out'"
param(
  [string]$Exe = 'C:\probe\classic2\winxp-render.exe',
  [string]$Arguments = 'all C:\probe\classic2\out',
  [string]$ConsoleLog = 'C:\probe\classic2\console.txt',
  [string]$Marker = 'C:\probe\classic2\out\DONE.txt',
  [string]$TaskName = ''
)
$ErrorActionPreference = 'Continue'
if ([string]::IsNullOrEmpty($TaskName)) {
  $TaskName = 'classic2_' + (Get-Date -Format 'yyyyMMdd_HHmmss')
}
if (Test-Path $Marker) { Remove-Item $Marker -Force }
$cmd = 'cmd /c ' + $Exe + ' ' + $Arguments + ' > ' + $ConsoleLog + ' 2>&1'
Write-Output ('task=' + $TaskName)
Write-Output ('cmd=' + $cmd)
schtasks /Create /TN $TaskName /SC ONCE /ST 23:59 /TR $cmd /RL HIGHEST /IT /F | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Output ('CREATE_FAIL ' + $LASTEXITCODE); exit 1 }
schtasks /Run /TN $TaskName | Out-Null
$deadline = (Get-Date).AddSeconds(180)
while (-not (Test-Path $Marker)) {
  if ((Get-Date) -gt $deadline) { Write-Output 'TIMEOUT'; break }
  Start-Sleep -Milliseconds 300
}
Start-Sleep -Milliseconds 400
schtasks /Delete /TN $TaskName /F | Out-Null
Write-Output ('RUN_DONE marker=' + (Test-Path $Marker) + ' task_deleted=' + ($LASTEXITCODE -eq 0))
if (Test-Path $ConsoleLog) {
  Write-Output '--- console.txt ---'
  Get-Content $ConsoleLog -Tail 40
}
