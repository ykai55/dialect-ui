param(
    [string]$TargetFile = 'C:\probe\winui3\target.json'
)
# Runs inside session 2 (schtasks /IT). Starts a WinUI3 app, waits, captures its windows.
$ErrorActionPreference = 'Continue'
$log = 'C:\probe\winui3\run.log'
function Log($s) { $s | Out-File -FilePath $log -Append -Encoding utf8; Write-Output $s }
Log ("=== run at " + (Get-Date).ToString('s') + " session=" + (Get-Process -Id $PID).SessionId)
Log ("whoami=" + [Security.Principal.WindowsIdentity]::GetCurrent().Name)

$t = Get-Content $TargetFile -Raw | ConvertFrom-Json
Log ("target app: " + $t.aumid + " exe=" + $t.exe + " out=" + $t.out)

# close previous instances of the same exe to avoid stale windows
Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

try {
    Start-Process ("shell:AppsFolder\" + $t.aumid)
    Log "started via shell:AppsFolder"
} catch {
    Log ("start failed: " + $_.Exception.Message)
}

$deadline = (Get-Date).AddSeconds($t.wait)
$found = $null
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 700
    $p = Get-Process -Name $t.exe -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($p) { $found = $p; break }
}
if ($found) {
    Log ("window appeared: pid=" + $found.Id + " title='" + $found.MainWindowTitle + "'")
} else {
    Log "no main window handle appeared before deadline; dumping processes"
    Get-Process -Name $t.exe -ErrorAction SilentlyContinue | ForEach-Object { Log ("  pid=" + $_.Id + " hwnd=" + $_.MainWindowHandle + " title='" + $_.MainWindowTitle + "' session=" + $_.SessionId) }
}
Start-Sleep -Seconds 3

$outDir = Join-Path 'C:\probe\winui3\out' $t.out
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
& 'C:\probe\winui3\capture.exe' $t.exe $outDir 0 restore *>> $log
Log "capture done -> $outDir"
Get-ChildItem $outDir -File -ErrorAction SilentlyContinue | ForEach-Object { Log ("  " + $_.Name + " " + $_.Length) }
Log "=== end"
