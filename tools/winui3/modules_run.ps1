$ErrorActionPreference = 'Continue'
$log = 'C:\probe\winui3\mod.log'
Remove-Item $log -ErrorAction SilentlyContinue
function Log($s) { $s | Out-File -FilePath $log -Append -Encoding utf8 }
Log ("start " + (Get-Date).ToString('s') + " session=" + (Get-Process -Id $PID).SessionId)
$targets = @(
    @{ exe = 'Time';                aumid = 'Microsoft.WindowsAlarms_8wekyb3d8bbwe!App' },
    @{ exe = 'GetHelp';             aumid = 'Microsoft.GetHelp_8wekyb3d8bbwe!App' },
    @{ exe = 'Photos';              aumid = 'Microsoft.Windows.Photos_8wekyb3d8bbwe!App' },
    @{ exe = 'AppInstaller';        aumid = 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe!App' },
    @{ exe = 'PhoneExperienceHost'; aumid = 'Microsoft.YourPhone_8wekyb3d8bbwe!App' }
)
foreach ($t in $targets) {
    Log ("### " + $t.exe)
    Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 400
    try { Start-Process ("shell:AppsFolder\" + $t.aumid); Log "  started" } catch { Log ("  start fail: " + $_.Exception.Message) }
    $deadline = (Get-Date).AddSeconds(30); $p = $null
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 500
        $p = Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($p) { break }
    }
    Log ("  windowfound=" + [bool]$p + " pid=" + $(if ($p) { $p.Id } else { 0 }) + " session=" + $(if ($p) { $p.SessionId } else { 0 }))
    if ($p) {
        Start-Sleep -Seconds 4
        $p.Refresh()
        Log ("  hwnd=" + $p.MainWindowHandle + " title='" + $p.MainWindowTitle + "'")
        try {
            $mods = $p.Modules | Where-Object { $_.ModuleName -match 'UI\.Xaml|WindowsAppRuntime|Microsoft\.UI|CoreMessaging|dcompi|WinUIEdit|Windows\.UI|WindowsAppCore' }
            foreach ($m in $mods) { Log ("  MOD " + $m.ModuleName + " | " + $m.FileVersion) }
        } catch { Log ("  modules error: " + $_.Exception.Message) }
        # also list files in package folder indicating winui3
        try {
            $pkg = Get-AppxPackage | Where-Object { $_.Name -eq ($t.aumid -split '_')[0] } | Select-Object -First 1
            if ($pkg) {
                Log ("  pkg=" + $pkg.InstallLocation)
                $x = Join-Path $pkg.InstallLocation 'Microsoft.UI.Xaml.dll'
                Log ("  pkg Microsoft.UI.Xaml.dll present=" + (Test-Path $x))
            }
        } catch { Log ("  pkg error: " + $_.Exception.Message) }
    }
    Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
Log "MOD DONE"
New-Item -ItemType File -Force -Path 'C:\probe\winui3\mod_done.txt' | Out-Null
