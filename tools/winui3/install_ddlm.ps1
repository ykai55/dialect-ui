$ErrorActionPreference='Continue'
$tmp='C:\probe\winui3\runtime-msix'
New-Item -ItemType Directory -Force $tmp | Out-Null
Copy-Item 'C:\probe\winui3\feed\microsoft.windowsappsdk.runtime.1.8.250907003.nupkg' "$tmp\rt.zip" -Force
if (-not (Test-Path "$tmp\x\tools\MSIX\win10-x64")) { Expand-Archive "$tmp\rt.zip" "$tmp\x" -Force }
$dir = "$tmp\x\tools\MSIX\win10-x64"
Get-ChildItem $dir -Filter *.msix | ForEach-Object { Write-Output ("msix: " + $_.Name) }
$ddlm = Get-ChildItem $dir -Filter '*DDLM*.msix' | Select-Object -First 1
try { Add-AppxPackage -Path $ddlm.FullName -ErrorAction Stop; Write-Output "DDLM installed" } catch { Write-Output ("DDLM add fail: " + $_.Exception.Message) }
Get-AppxPackage | Where-Object { $_.Name -like '*DDLM*' } | ForEach-Object { Write-Output ("REG " + $_.Name + " | " + $_.Version) }
