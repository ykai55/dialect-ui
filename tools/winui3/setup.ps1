$ErrorActionPreference = 'Continue'
Write-Output "=== compile ==="
$csc = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $csc /nologo /out:C:\probe\winui3\capture.exe C:\probe\winui3\capture.cs
Write-Output ("csc exit=" + $LASTEXITCODE + " exists=" + (Test-Path C:\probe\winui3\capture.exe))
Write-Output "=== Start menu entries for candidate WinUI3 apps ==="
Get-StartApps | Where-Object { $_.AppID -match 'Photos|Alarms|GetHelp|YourPhone|DesktopAppInstaller|OfficeHub|Terminal' } | ForEach-Object {
    Write-Output ("STARTAPP {0} | {1}" -f $_.Name, $_.AppID)
}
Write-Output "=== installed packages matching ==="
Get-AppxPackage | Where-Object { $_.Name -match 'Photos|Alarms|GetHelp|YourPhone|DesktopAppInstaller|OfficeHub' } | ForEach-Object {
    Write-Output ("PKG {0} | {1} | {2}" -f $_.Name, $_.Version, $_.PackageFamilyName)
}
Write-Output "=== display / dpi / theme ==="
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Screen]::AllScreens | ForEach-Object { Write-Output ("SCREEN " + $_.Bounds.ToString() + " primary=" + $_.Primary) }
$k = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' -ErrorAction SilentlyContinue
Write-Output ("theme AppsUseLightTheme=" + $k.AppsUseLightTheme + " SystemUsesLightTheme=" + $k.SystemUsesLightTheme)
$k2 = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\DWM' -ErrorAction SilentlyContinue
Write-Output ("dwm ColorizationColor=" + $k2.ColorizationColor + " AccentColor=" + (Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Accent' -ErrorAction SilentlyContinue).AccentColorMenu)
Write-Output "=== done ==="
