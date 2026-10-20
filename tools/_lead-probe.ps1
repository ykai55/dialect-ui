# Lead-side quick probe: render Win32 themed controls offscreen via uxtheme DrawThemeBackground.
# Not a project artifact - throwaway verification script (kept out of git by name underscore? no - delete later).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src = @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class UxProbe
{
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }

    [DllImport("uxtheme.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr OpenThemeData(IntPtr hwnd, string classList);
    [DllImport("uxtheme.dll")]
    public static extern int DrawThemeBackground(IntPtr hTheme, IntPtr hdc, int partId, int stateId, ref RECT pRect, IntPtr pClip);
    [DllImport("uxtheme.dll")]
    public static extern int CloseThemeData(IntPtr hTheme);
    [DllImport("uxtheme.dll", CharSet = CharSet.Unicode)]
    public static extern int GetCurrentThemeName(System.Text.StringBuilder name, int len, System.Text.StringBuilder color, int cLen, System.Text.StringBuilder size, int sLen);

    [DllImport("gdi32.dll")] public static extern int SetMapMode(IntPtr hdc, int mode);
    [DllImport("gdi32.dll")] public static extern bool SetWindowExtEx(IntPtr hdc, int x, int y, IntPtr old);
    [DllImport("gdi32.dll")] public static extern bool SetViewportExtEx(IntPtr hdc, int x, int y, IntPtr old);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();

    public static string ThemeName()
    {
        var a = new System.Text.StringBuilder(260);
        var b = new System.Text.StringBuilder(260);
        var c = new System.Text.StringBuilder(260);
        GetCurrentThemeName(a, 260, b, 260, c, 260);
        return a.ToString() + " | " + b.ToString() + " | " + c.ToString();
    }

    public static bool Draw(string cls, int part, int state, int w, int h, int scale, Color bg, string outPath)
    {
        IntPtr theme = OpenThemeData(IntPtr.Zero, cls);
        if (theme == IntPtr.Zero) return false;
        using (var bmp = new Bitmap(w * scale, h * scale, PixelFormat.Format32bppArgb))
        using (var g = Graphics.FromImage(bmp))
        {
            g.Clear(bg);
            IntPtr hdc = g.GetHdc();
            try
            {
                SetMapMode(hdc, 8); // MM_ANISOTROPIC
                SetWindowExtEx(hdc, 1, 1, IntPtr.Zero);
                SetViewportExtEx(hdc, scale, scale, IntPtr.Zero);
                RECT r = new RECT { Left = 0, Top = 0, Right = w, Bottom = h };
                DrawThemeBackground(theme, hdc, part, state, ref r, IntPtr.Zero);
            }
            finally { g.ReleaseHdc(hdc); }
            bmp.Save(outPath, ImageFormat.Png);
        }
        CloseThemeData(theme);
        return true;
    }
}
'@

Add-Type -TypeDefinition $src -ReferencedAssemblies System.Drawing
[UxProbe]::SetProcessDPIAware() | Out-Null

$out = 'C:\probe\lead'
New-Item -ItemType Directory -Force -Path $out | Out-Null

Write-Output ("THEME: " + [UxProbe]::ThemeName())
Write-Output ("DPI: " + (Get-ItemProperty 'HKCU:\Control Panel\Desktop\WindowMetrics' -Name AppliedDPI -ErrorAction SilentlyContinue).AppliedDPI)
Write-Output ("SESSION: " + (Get-Process -Id $PID).SessionId)

$light = [System.Drawing.ColorTranslator]::FromHtml('#F3F3F3')
$dark  = [System.Drawing.ColorTranslator]::FromHtml('#202020')

# class list, part, state, w, h, name
$specs = @(
    @('Button',   1, 1, 96, 32, 'pushbutton-normal'),
    @('Button',   1, 2, 96, 32, 'pushbutton-hot'),
    @('Button',   1, 3, 96, 32, 'pushbutton-pressed'),
    @('Button',   1, 4, 96, 32, 'pushbutton-disabled'),
    @('Button',   3, 1, 20, 20, 'checkbox-unchecked'),
    @('Button',   3, 5, 20, 20, 'checkbox-checked'),
    @('Button',   3, 4, 20, 20, 'checkbox-disabled'),
    @('Button',   2, 1, 20, 20, 'radio-unchecked'),
    @('Button',   2, 5, 20, 20, 'radio-checked'),
    @('Edit',     1, 1, 200, 32, 'edit-normal'),
    @('Edit',     1, 3, 200, 32, 'edit-focused'),
    @('Edit',     1, 4, 200, 32, 'edit-disabled'),
    @('Combobox', 1, 1, 24, 24, 'combo-arrow-normal'),
    @('Combobox', 1, 2, 24, 24, 'combo-arrow-hot'),
    @('Combobox', 1, 3, 24, 24, 'combo-arrow-pressed'),
    @('Trackbar', 3, 1, 21, 21, 'slider-thumb-normal'),
    @('Trackbar', 3, 2, 21, 21, 'slider-thumb-hot'),
    @('Trackbar', 1, 1, 120, 8,  'slider-track')
)

$rows = @()
foreach ($s in $specs) {
    foreach ($mode in @(@('light', $light), @('dark', $dark))) {
        $file = Join-Path $out ("probe-" + $s[5] + "-" + $mode[0] + ".png")
        $ok = [UxProbe]::Draw($s[0], [int]$s[1], [int]$s[2], [int]$s[3], [int]$s[4], 2, $mode[1], $file)
        $rows += [pscustomobject]@{ spec = $s[5]; mode = $mode[0]; ok = $ok; file = $file }
    }
}
$rows | Format-Table -AutoSize
