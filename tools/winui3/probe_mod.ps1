# Orchestrator, runs from ssh (session 0): creates task, runs it in session 2, waits for marker, dumps log.
$ErrorActionPreference = 'Continue'
$tn = 'WinUI3Probe_' + (Get-Random)
$marker = 'C:\probe\winui3\mod_done.txt'
Remove-Item $marker -ErrorAction SilentlyContinue
$tr = 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\winui3\modules_run.ps1'
& schtasks.exe /Create /SC ONCE /ST 23:59 /TN $tn /RU Administrator /RL HIGHEST /IT /F /TR $tr 2>&1 | Out-String
Write-Output ("create exit=" + $LASTEXITCODE)
& schtasks.exe /Run /TN $tn 2>&1 | Out-String
Write-Output ("run exit=" + $LASTEXITCODE)
$deadline = (Get-Date).AddSeconds(300)
while ((Get-Date) -lt $deadline) {
    if (Test-Path $marker) { break }
    Start-Sleep -Seconds 2
}
Write-Output ("marker=" + (Test-Path $marker))
& schtasks.exe /Delete /TN $tn /F 2>&1 | Out-String
Write-Output ("delete exit=" + $LASTEXITCODE)
Write-Output "=== mod.log ==="
if (Test-Path 'C:\probe\winui3\mod.log') { Get-Content 'C:\probe\winui3\mod.log' -Encoding UTF8 }
