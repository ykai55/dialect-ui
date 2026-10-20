$ErrorActionPreference = 'Continue'
$root = 'C:\probe\winui3'
if (-not (Test-Path "$root\dotnet\dotnet.exe")) {
    New-Item -ItemType Directory -Force -Path "$root\dotnet" | Out-Null
    & "$env:WINDIR\System32\tar.exe" -xf "$root\dotnet-sdk.zip" -C "$root\dotnet"
    Write-Output ("untar exit=" + $LASTEXITCODE)
}
if ((Test-Path "$root\winui3-feed") -and -not (Test-Path "$root\feed")) { Move-Item "$root\winui3-feed" "$root\feed" -Force }
Write-Output ("dotnet exists=" + (Test-Path "$root\dotnet\dotnet.exe") + " feed=" + (Test-Path "$root\feed"))
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_NOLOGO = '1'
$env:DOTNET_SKIP_FIRST_TIME_EXPERIENCE = '1'
$env:DOTNET_CLI_HOME = "$root\clihome"
$dn = "$root\dotnet\dotnet.exe"
& $dn --info 2>&1 | Out-String
& $dn restore "$root\gallery\Gallery.csproj" 2>&1 | Out-String
Write-Output ("restore exit=" + $LASTEXITCODE)
& $dn build "$root\gallery\Gallery.csproj" -c Release -o "$root\gallery\bin" -p:WindowsAppSDKSelfContained=true 2>&1 | Out-String
Write-Output ("build exit=" + $LASTEXITCODE)
Get-ChildItem "$root\gallery\bin" -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("  " + $_.Name + " " + $_.Length) }
