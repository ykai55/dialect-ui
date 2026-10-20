$ErrorActionPreference='Continue'
Write-Output "=== .pri in bin ==="
Get-ChildItem 'C:\probe\winui3\gallery\bin' -Filter *.pri | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
$fw = (Get-AppxPackage -AllUsers -Name 'Microsoft.WindowsAppRuntime.1.8' | Where-Object { $_.Architecture -eq 'X64' } | Select-Object -First 1).InstallLocation
Write-Output ("=== .pri in framework package " + $fw + " ===")
Get-ChildItem $fw -Filter *.pri -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
foreach ($f in (Get-ChildItem $fw -Filter *.pri -ErrorAction SilentlyContinue)) {
    Copy-Item $f.FullName (Join-Path 'C:\probe\winui3\gallery\bin' $f.Name) -Force
    Write-Output ("  copied " + $f.Name)
}
# also copy the resource dlls if any *.pri referenced
Write-Output "=== all non-dll/exe files in framework pkg ==="
Get-ChildItem $fw -File | Where-Object { $_.Extension -notin @('.dll','.exe','.winmd') } | Select-Object -First 15 | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
