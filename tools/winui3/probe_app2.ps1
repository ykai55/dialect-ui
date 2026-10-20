$ErrorActionPreference = 'Continue'
$tn = 'WinUI3Gallery_' + (Get-Random)
$marker = 'C:\probe\winui3\gallery_task_done2.txt'
Remove-Item $marker -ErrorAction SilentlyContinue
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\winui3\run_app2.ps1'
& schtasks.exe /Create /SC ONCE /ST 23:59 /TN $tn /RU Administrator /RL HIGHEST /IT /F /TR $tr 2>&1 | Out-String
Write-Output ("create exit=" + $LASTEXITCODE)
& schtasks.exe /Run /TN $tn 2>&1 | Out-String
Write-Output ("run exit=" + $LASTEXITCODE)
$deadline = (Get-Date).AddSeconds(280)
while ((Get-Date) -lt $deadline) { if (Test-Path $marker) { break }; Start-Sleep -Seconds 2 }
Write-Output ("marker=" + (Test-Path $marker))
& schtasks.exe /Delete /TN $tn /F 2>&1 | Out-String
Write-Output ("delete exit=" + $LASTEXITCODE)
Write-Output "=== gallery_run.log ==="
if (Test-Path 'C:\probe\winui3\gallery_run.log') { Get-Content 'C:\probe\winui3\gallery_run.log' -Encoding UTF8 }
Write-Output "=== app.log (tail) ==="
if (Test-Path 'C:\probe\winui3\out\gallery\app.log') { Get-Content 'C:\probe\winui3\out\gallery\app.log' -Encoding UTF8 | Select-Object -Last 40 }
