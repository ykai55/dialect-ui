$ErrorActionPreference='Continue'
Write-Output "=== DDLM / runtime packages ==="
Get-AppxPackage -AllUsers | Where-Object { $_.Name -match 'WinAppRuntime|WindowsAppRuntime' } | ForEach-Object {
  Write-Output ("{0} | {1} | {2}" -f $_.Name, $_.Version, $_.Architecture)
}
Write-Output "=== VC runtime ==="
foreach ($f in @('vcruntime140.dll','vcruntime140_1.dll','msvcp140.dll')) {
  Write-Output ("{0} = {1}" -f $f, (Test-Path (Join-Path $env:WINDIR ('System32\' + $f))))
}
Write-Output "=== SDK build output runtimeconfig ==="
Get-Content 'C:\probe\winui3\gallery\bin\GalleryProbe.runtimeconfig.json' -Raw -ErrorAction SilentlyContinue
Write-Output "=== dotnet --list-runtimes (SDK dir) ==="
& 'C:\probe\winui3\dotnet\dotnet.exe' --list-runtimes 2>&1 | Out-String
