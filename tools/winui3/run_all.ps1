$ErrorActionPreference = 'Continue'
$log = 'C:\probe\winui3\run.log'
Remove-Item $log -ErrorAction SilentlyContinue
function Log($s) { $s | Out-File -FilePath $log -Append -Encoding utf8 }
Log ("start " + (Get-Date).ToString('s') + " session=" + (Get-Process -Id $PID).SessionId)

$targets = @(
    @{ exe = 'Time';                aumid = 'Microsoft.WindowsAlarms_8wekyb3d8bbwe!App';      out = 'alarms';      wait = 35 },
    @{ exe = 'GetHelp';             aumid = 'Microsoft.GetHelp_8wekyb3d8bbwe!App';            out = 'gethelp';     wait = 35 },
    @{ exe = 'Photos';              aumid = 'Microsoft.Windows.Photos_8wekyb3d8bbwe!App';      out = 'photos';      wait = 45 },
    @{ exe = 'PhoneExperienceHost'; aumid = 'Microsoft.YourPhone_8wekyb3d8bbwe!App';           out = 'yourphone';   wait = 40 },
    @{ exe = 'AppInstaller';        aumid = 'Microsoft.DesktopAppInstaller_8wekyb3d8bbwe!App'; out = 'appinstaller'; wait = 30 }
)

foreach ($t in $targets) {
    Log ("### target " + $t.out + " " + $t.aumid)
    Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 400
    try {
        Start-Process ("shell:AppsFolder\" + $t.aumid)
        Log "  started via shell:AppsFolder"
    } catch {
        Log ("  start failed: " + $_.Exception.Message)
    }
    $deadline = (Get-Date).AddSeconds($t.wait)
    $p = $null
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 700
        $p = Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
        if ($p) { break }
    }
    Log ("  window=" + [bool]$p + " pid=" + $(if ($p) { $p.Id } else { 0 }) + " title='" + $(if ($p) { $p.MainWindowTitle } else { '' }) + "'")
    Start-Sleep -Seconds 3
    $outDir = Join-Path 'C:\probe\winui3\out' $t.out
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
    & 'C:\probe\winui3\capture.exe' $t.exe $outDir 0 restore *>> $log
    & 'C:\probe\winui3\capture.exe' --screen $outDir 0 *>> $log
    Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}
Log "ALL DONE"
New-Item -ItemType File -Force -Path 'C:\probe\winui3\done.txt' | Out-Null
