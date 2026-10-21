param([string]$Out = 'C:\probe\win10switch\out\final', [string]$Marker = 'C:\probe\win10switch\final_done.txt')
$ErrorActionPreference = 'Continue'
$root = 'C:\probe\win10switch'
$log = Join-Path $root 'final.log'
Remove-Item $Marker, $log -ErrorAction SilentlyContinue
function Log($s) { $line = ((Get-Date).ToString('HH:mm:ss') + ' ' + $s); $line | Out-File -FilePath $log -Append -Encoding utf8 }
New-Item -ItemType Directory -Force -Path $Out | Out-Null
$sess = (Get-Process -Id $PID).SessionId
Log ("=== final session=$sess")
Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class W7 {
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public static string ClassOf(IntPtr h) { StringBuilder c = new StringBuilder(256); GetClassName(h, c, 256); return c.ToString(); }
  public static string TitleOf(IntPtr h) { StringBuilder t = new StringBuilder(512); GetWindowText(h, t, 512); return t.ToString(); }
  public static string ExeOf(IntPtr h) { uint pid; GetWindowThreadProcessId(h, out pid); try { return System.Diagnostics.Process.GetProcessById((int)pid).ProcessName; } catch { return "?"; } }
  public static string RectOf(IntPtr h) { RECT r; GetWindowRect(h, out r); return (r.Right-r.Left) + "x" + (r.Bottom-r.Top) + "@" + r.Left + "," + r.Top; }
  public static System.Collections.Generic.List<IntPtr> All() { var l = new System.Collections.Generic.List<IntPtr>(); EnumWindows(delegate(IntPtr h, IntPtr p) { l.Add(h); return true; }, IntPtr.Zero); return l; }
}
'@ -ErrorAction SilentlyContinue
function FindCore([string]$exe) { foreach ($h in [W7]::All()) { if ([W7]::ClassOf($h) -ne 'Windows.UI.Core.CoreWindow') { continue }; if ([W7]::ExeOf($h) -ne $exe) { continue }; if (-not [W7]::IsWindowVisible($h)) { continue }; return $h } return [IntPtr]::Zero }
function CountUia([IntPtr]$hwnd) { try { $el = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd); if ($null -eq $el) { return 0 }; return $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition).Count } catch { return -1 } }
function DumpToggles([IntPtr]$hwnd, [string]$file) {
    try {
        $el = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
        $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'ToggleSwitch')
        $all = $el.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)
        ("toggles=" + $all.Count) | Out-File $file -Encoding utf8
        foreach ($t in $all) {
            $state = '?'; try { $state = $t.GetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern).Current.ToggleState } catch { }
            $r = $t.Current.BoundingRectangle
            ("name='" + $t.Current.Name + "' id='" + $t.Current.AutomationId + "' class='" + $t.Current.ClassName + "' state=" + $state + " rect=" + [int]$r.X + "," + [int]$r.Y + " " + [int]$r.Width + "x" + [int]$r.Height) | Out-File $file -Append -Encoding utf8
        }
        Log ("toggles written " + $file)
    } catch { Log ("DumpToggles err: " + $_.Exception.Message) }
}

function CapturePage([string]$uri, [string]$tag) {
    Log ("--- page $uri")
    Get-Process SystemSettings -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $sess } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
    try { Start-Process $uri } catch { Log ("start failed: " + $_.Exception.Message); return }
    $core = [IntPtr]::Zero
    $deadline = (Get-Date).AddSeconds(40)
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 1000
        $core = FindCore 'SystemSettings'
        if ($core -eq [IntPtr]::Zero) { continue }
        $n = CountUia $core
        if ($n -gt 25) { Log ("loaded uia=$n core=" + [W7]::RectOf($core)); break }
    }
    if ($core -eq [IntPtr]::Zero) { Log "no core"; return }
    Start-Sleep -Seconds 2
    # maximize the frame that belongs to Settings (title match)
    $frame = [IntPtr]::Zero
    foreach ($h in [W7]::All()) {
        if ([W7]::ClassOf($h) -ne 'ApplicationFrameWindow') { continue }
        if (-not [W7]::IsWindowVisible($h)) { continue }
        if ([W7]::TitleOf($h) -eq '设置') { $frame = $h; break }
        if ($frame -eq [IntPtr]::Zero) { $frame = $h }
    }
    if ($frame -ne [IntPtr]::Zero) {
        [void][W7]::ShowWindow($frame, 3); [void][W7]::SetForegroundWindow($frame)
        Start-Sleep -Seconds 3
        $core = FindCore 'SystemSettings'
        Log ("maximized core=" + [W7]::RectOf($core) + " uia=" + (CountUia $core))
    }
    Start-Sleep -Seconds 2
    $dir = Join-Path $Out $tag
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    & (Join-Path $root 'capture.exe') SystemSettings $dir 0 *>> $log
    DumpToggles $core (Join-Path $dir 'toggles.txt')
    Get-ChildItem $dir -File | ForEach-Object { Log ("file " + $_.Name + " " + $_.Length) }
}

# OFF-heavy page first, then ON page
CapturePage 'ms-settings:easeofaccess-keyboard' 'easeofaccess-keyboard'
CapturePage 'ms-settings:notifications' 'notifications'
# leave settings open? kill to clean
Get-Process SystemSettings -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $sess } | Stop-Process -Force -ErrorAction SilentlyContinue
Log "FINAL_DONE"
New-Item -ItemType File -Force -Path $Marker | Out-Null
