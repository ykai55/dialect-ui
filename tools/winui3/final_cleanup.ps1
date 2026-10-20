$ErrorActionPreference='Continue'
Write-Output "=== tasks matching WinUI3 ==="
& schtasks.exe /Query /FO LIST /V 2>$null | Select-String -Pattern 'WinUI3' | ForEach-Object { Write-Output $_.Line }
$names = @()
& schtasks.exe /Query /FO CSV /NH 2>$null | ForEach-Object { if ($_ -match '"(WinUI3[^"]*)"') { $names += $matches[1] } }
foreach ($n in $names) { & schtasks.exe /Delete /TN $n /F 2>&1 | Out-String | Write-Output }
Write-Output ("deleted tasks: " + ($names -join ','))
Get-Process -Name GalleryProbe -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("kill GalleryProbe pid=" + $_.Id); $_.Kill() }
Start-Sleep -Seconds 1
Get-Process -Name GalleryProbe,dotnet,Photos,AppInstaller,PhoneExperienceHost -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("left: " + $_.ProcessName + " " + $_.Id) }
$s = (Get-ChildItem 'C:\probe\winui3' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum)
Write-Output ("C:\probe\winui3 = " + [math]::Round($s.Sum/1MB,0) + " MB in " + $s.Count + " files")
