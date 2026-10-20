param([string]$Name, [string]$Cmd, [string]$Marker)
$ErrorActionPreference = 'Continue'
if (Test-Path $Marker) { Remove-Item $Marker -Force }
schtasks /Create /TN $Name /TR $Cmd /SC ONCE /ST 23:59 /RL HIGHEST /IT /F | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Output ("CREATE_FAIL " + $LASTEXITCODE); exit 1 }
schtasks /Run /TN $Name | Out-Null
$deadline = (Get-Date).AddSeconds(180)
while (-not (Test-Path $Marker)) {
  if ((Get-Date) -gt $deadline) { Write-Output "TIMEOUT"; break }
  Start-Sleep -Milliseconds 300
}
Start-Sleep -Milliseconds 300
schtasks /Delete /TN $Name /F | Out-Null
Write-Output ("RUN2_DONE marker=" + (Test-Path $Marker))
