$ErrorActionPreference = 'Continue'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /out:C:\probe\winui3\capture.exe C:\probe\winui3\capture.cs
Write-Output ("csc exit=" + $LASTEXITCODE + " exists=" + (Test-Path 'C:\probe\winui3\capture.exe'))
$dn = 'C:\Program Files\dotnet\dotnet.exe'
Write-Output ("dotnet=" + (Test-Path $dn))
Write-Output ("nugetcache=" + (Test-Path (Join-Path $env:USERPROFILE '.nuget\packages')))
$fw = Get-AppxPackage -AllUsers -Name 'Microsoft.WindowsAppRuntime.1.8' | Where-Object { $_.Architecture -eq 'X64' } | Select-Object -First 1
Write-Output ("framework path: " + $fw.InstallLocation)
Get-ChildItem $fw.InstallLocation -Filter *.dll | Select-Object -First 60 | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
Write-Output "--- managed projections ---"
Get-ChildItem $fw.InstallLocation -Recurse -Filter 'Microsoft.WinUI.dll' -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("  WINUI DLL: " + $_.FullName + " " + $_.Length) }
Get-ChildItem $fw.InstallLocation -Recurse -Filter '*.winmd' -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { Write-Output ("  WINMD: " + $_.Name) }
Get-ChildItem $fw.InstallLocation -Recurse -Filter '*.exe' -ErrorAction SilentlyContinue | Select-Object -First 10 | ForEach-Object { Write-Output ("  EXE: " + $_.FullName) }
