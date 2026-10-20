$ErrorActionPreference = 'Continue'
Remove-Item 'C:\probe\winui3\gallery_done.txt' -ErrorAction SilentlyContinue
Remove-Item 'C:\probe\winui3\main.log' -ErrorAction SilentlyContinue
$log = 'C:\probe\winui3\gallery_run.log'
("=== " + (Get-Date).ToString('s') + " session=" + (Get-Process -Id $PID).SessionId) | Out-File $log -Encoding utf8
$env:DOTNET_ROOT = 'C:\probe\winui3\dotnet'
$env:PATH = 'C:\probe\winui3\dotnet;' + $env:PATH
$exe = 'C:\probe\winui3\gallery\bin\GalleryProbe.exe'
$p = Start-Process $exe -PassThru -WorkingDirectory 'C:\probe\winui3\gallery\bin'
("pid=" + $p.Id + " exe=" + $exe) | Out-File $log -Append -Encoding utf8
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    if (Test-Path 'C:\probe\winui3\gallery_done.txt') { break }
    if ($p.HasExited) { break }
    Start-Sleep -Milliseconds 700
}
$ec = -1
try { $p.Refresh(); if ($p.HasExited) { $ec = $p.ExitCode } } catch { }
("exited=" + $p.HasExited + " exitcode=" + $ec) | Out-File $log -Append -Encoding utf8
if (-not $p.HasExited) { try { $p.Kill() } catch { } }
if (Test-Path 'C:\probe\winui3\main.log') { Get-Content 'C:\probe\winui3\main.log' | Out-File $log -Append -Encoding utf8 }
$out = 'C:\probe\winui3\out\gallery'
if (Test-Path $out) { ("pngs=" + (Get-ChildItem $out -Filter *.png).Count) | Out-File $log -Append -Encoding utf8 }
New-Item -ItemType File -Force -Path 'C:\probe\winui3\gallery_task_done.txt' | Out-Null
