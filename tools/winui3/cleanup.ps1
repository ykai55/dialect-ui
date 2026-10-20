$ErrorActionPreference='Continue'
Write-Output "=== schtasks containing WinUI3 ==="
& schtasks.exe /Query /FO CSV 2>$null | Select-String -Pattern 'WinUI3' | ForEach-Object { Write-Output $_.Line }
Write-Output "=== processes to clean ==="
foreach ($n in @('GalleryProbe','dotnet','Photos','AppInstaller','PhoneExperienceHost','Time','GetHelp')) {
  $ps = Get-Process -Name $n -ErrorAction SilentlyContinue
  if ($ps) { Write-Output ("PID " + $n + " = " + (($ps | ForEach-Object { $_.Id + "/s" + $_.SessionId }) -join ',')) }
}
Get-Process -Name GalleryProbe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name Photos,AppInstaller,PhoneExperienceHost,Time,GetHelp -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Output "=== app.log tail ==="
if (Test-Path 'C:\probe\winui3\out\gallery\app.log') { Get-Content 'C:\probe\winui3\out\gallery\app.log' -Encoding UTF8 | Select-Object -Last 12 }
