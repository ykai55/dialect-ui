
// win32-render.cs (v2) — Win32/uxtheme offscreen control renderer + real-window capture probe.
// Runs ONLY in an interactive session (session 0 has no theme: OpenThemeData returns NULL).
// Build (on box-win, .NET Framework 4.x csc):
//   csc.exe /nologo /target:exe /win32manifest:app.manifest /out:win32render.exe /r:System.Drawing.dll /r:System.Windows.Forms.dll win32-render.cs
// Modes:
//   facts <outdir>                theme/dpi/font/part-size/color dump
//   dump <outdir>                 part x state visual grid per class
//   matrix <outdir> [light|dark]  final state matrix PNGs (1x native + 2x pixel-double)
//   darkprobe <outdir> <A|B|C|D>  dark-mode availability experiments
//   capture <outdir>              real themed window + PrintWindow/CopyFromScreen test
//   dlgmetrics <outdir>           system default control sizes via hidden dialog template
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Windows.Forms;

static class N {
    [DllImport("uxtheme.dll", CharSet=CharSet.Unicode)] public static extern IntPtr OpenThemeData(IntPtr hwnd, string cls);
    [DllImport("uxtheme.dll")] public static extern int CloseThemeData(IntPtr h);
    [DllImport("uxtheme.dll")] public static extern int GetCurrentThemeName(StringBuilder f, int fl, StringBuilder cs, int csl, StringBuilder sz, int szl);
    [DllImport("uxtheme.dll")] public static extern int GetThemeColor(IntPtr h, int part, int state, int prop, out int color);
    [DllImport("uxtheme.dll", CharSet=CharSet.Unicode)] public static extern int GetThemeSysFont(IntPtr h, int prop, ref LOGFONT lf);
    [DllImport("uxtheme.dll")] public static extern int GetThemeFont(IntPtr h, IntPtr hdc, int part, int state, int prop, ref LOGFONT lf);
    [DllImport("uxtheme.dll")] public static extern int GetThemePartSize(IntPtr h, IntPtr hdc, int part, int state, IntPtr rect, int sizeType, out SIZE sz);
    [DllImport("uxtheme.dll")] public static extern int GetThemeTextExtent(IntPtr h, IntPtr hdc, int part, int state, string text, int cch, uint flags, ref RECT bounds, out RECT extent);
    [DllImport("uxtheme.dll")] public static extern int DrawThemeBackground(IntPtr h, IntPtr hdc, int part, int state, ref RECT r, IntPtr clip);
    [DllImport("uxtheme.dll", CharSet=CharSet.Unicode)] public static extern int DrawThemeText(IntPtr h, IntPtr hdc, int part, int state, string text, int cch, uint flags, uint flags2, ref RECT r);
    [DllImport("uxtheme.dll", CharSet=CharSet.Unicode)] public static extern int SetWindowTheme(IntPtr hwnd, string app, string idlist);
    [DllImport("user32.dll")] public static extern bool DrawFocusRect(IntPtr hdc, ref RECT r);
    [DllImport("user32.dll")] public static extern int GetSysColor(int idx);
    [DllImport("user32.dll")] public static extern uint GetDpiForSystem();
    [DllImport("user32.dll")] public static extern uint GetDpiForWindow(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr ctx);
    [DllImport("user32.dll")] public static extern IntPtr GetThreadDpiAwarenessContext();
    [DllImport("user32.dll")] public static extern int GetAwarenessFromDpiAwarenessContext(IntPtr ctx);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int idx);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateWindowExW(uint ex, string cls, string name, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, IntPtr param);
    [DllImport("user32.dll")] public static extern bool DestroyWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr hwnd, out RECT r);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr hwnd);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr CreateDialogIndirectParamW(IntPtr inst, IntPtr template, IntPtr parent, IntPtr proc, IntPtr param);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr dlg, int id);
    [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr h, int msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern bool GetComboBoxInfo(IntPtr hwnd, ref COMBOBOXINFO info);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr GetModuleHandleW(string name);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr LoadLibraryW(string name);
    [DllImport("kernel32.dll", EntryPoint="GetProcAddress")] public static extern IntPtr GetProcAddressOrd(IntPtr mod, IntPtr ordinal);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int w, int h);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
    [DllImport("gdi32.dll", CharSet=CharSet.Unicode)] public static extern int GetObjectW(IntPtr obj, int size, ref LOGFONT lf);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] public delegate int SetPreferredAppModeFn(int mode);
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] public delegate void FlushMenuThemesFn();
    [UnmanagedFunctionPointer(CallingConvention.Winapi)] public delegate void FlushMenuThemesVoidFn();
    public static int SetPreferredAppMode(int mode) {
        IntPtr p = GetProcAddressOrd(LoadLibraryW("uxtheme.dll"), (IntPtr)135);
        if (p == IntPtr.Zero) return -999;
        return ((SetPreferredAppModeFn)Marshal.GetDelegateForFunctionPointer(p, typeof(SetPreferredAppModeFn)))(mode);
    }
    public static void FlushMenuThemes() {
        IntPtr p = GetProcAddressOrd(LoadLibraryW("uxtheme.dll"), (IntPtr)136);
        if (p != IntPtr.Zero) ((FlushMenuThemesFn)Marshal.GetDelegateForFunctionPointer(p, typeof(FlushMenuThemesFn)))();
    }
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; public RECT(int l,int t,int r,int b){L=l;T=t;R=r;B=b;} }
    [StructLayout(LayoutKind.Sequential)] public struct SIZE { public int cx, cy; }
    [StructLayout(LayoutKind.Sequential)] public struct COMBOBOXINFO { public int cbSize; public RECT rcItem; public RECT rcButton; public int stateButton; public IntPtr hwndCombo; public IntPtr hwndItem; public IntPtr hwndList; }
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct LOGFONT { public int lfHeight, lfWidth, lfEscapement, lfOrientation, lfWeight; public byte lfItalic, lfUnderline, lfStrikeOut, lfCharSet, lfOutPrecision, lfClipPrecision, lfQuality, lfPitchAndFamily; [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string lfFaceName; }
}

static class U {
    public static StringBuilder Log = new StringBuilder();
    public static void A(string s) { Log.AppendLine(s); Console.WriteLine(s); }
    public static string Hex(int c) { return string.Format("#{0:X2}{1:X2}{2:X2}", c & 255, (c >> 8) & 255, (c >> 16) & 255); }
    public static string Hex(Color c) { return string.Format("#{0:X2}{1:X2}{2:X2}", c.R, c.G, c.B); }
    public static void Save(Bitmap b, string path) { Directory.CreateDirectory(Path.GetDirectoryName(path)); b.Save(path, ImageFormat.Png); }
}

class R {
    public string OutDir;
    public bool Dark = false;
    public string Variant = "light";
    public IntPtr Hwnd = IntPtr.Zero;
    public Color Bg = Color.White;
    public R(string outDir) { OutDir = outDir; }
    public string Sub(string s) { string p = Path.Combine(OutDir, s); Directory.CreateDirectory(p); return p; }
    public string Mode() { return Dark ? "dark" : "light"; }
    public void InitDpi() {
        IntPtr prev = N.SetThreadDpiAwarenessContext((IntPtr)(-1)); // render in 96dpi logical space
        U.A(string.Format("thread dpi ctx prev=0x{0:X} awareLevel={1} GetDpiForSystem={2}", prev.ToInt64(),
            N.GetAwarenessFromDpiAwarenessContext(N.GetThreadDpiAwarenessContext()), N.GetDpiForSystem()));
    }
    public void MakeHwnd() {
        Hwnd = N.CreateWindowExW(0, "STATIC", "", 0x80000000, 0, 0, 8, 8, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        U.A("hidden hwnd        : 0x" + Hwnd.ToInt64().ToString("X") + " dpi=" + N.GetDpiForWindow(Hwnd));
    }
    public void SetDarkMode() {
        Dark = true;
        U.A("SetPreferredAppMode(2) -> " + N.SetPreferredAppMode(2));
        N.FlushMenuThemes();
        U.A("SetWindowTheme(hwnd, \"DarkMode_Explorer\") -> " + N.SetWindowTheme(Hwnd, "DarkMode_Explorer", null));
    }
    public string Cls(string c) { return c; }
    public IntPtr Theme(string cls) {
        if (Dark) {
            // Win10 has no documented dark Win32 theme; per-control undocumented theme classes:
            string dc = "DarkMode_Explorer";
            if (cls == "Combobox" || cls == "Edit") dc = "DarkMode_CFD";
            N.SetWindowTheme(Hwnd, dc, null);
        }
        return N.OpenThemeData(Hwnd, Cls(cls));
    }
    public Bitmap NewBmp(int w, int h, Color bg) {
        Bitmap b = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(b)) { g.Clear(bg); }
        return b;
    }
    public Graphics G(Bitmap b) {
        Graphics g = Graphics.FromImage(b);
        g.SmoothingMode = SmoothingMode.None;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        g.PageUnit = GraphicsUnit.Pixel;
        return g;
    }
    public void DrawThemePart(Graphics g, IntPtr th, int part, int state, Rectangle rect) {
        IntPtr hdc = g.GetHdc();
        try {
            N.RECT r = new N.RECT(rect.Left, rect.Top, rect.Right, rect.Bottom);
            N.DrawThemeBackground(th, hdc, part, state, ref r, IntPtr.Zero);
        } finally { g.ReleaseHdc(hdc); }
    }
    public void DrawFocus(Graphics g, Rectangle rect) {
        IntPtr hdc = g.GetHdc();
        try {
            N.RECT r = new N.RECT(rect.Left, rect.Top, rect.Right, rect.Bottom);
            N.DrawFocusRect(hdc, ref r);
        } finally { g.ReleaseHdc(hdc); }
    }
    public Color ThemeTextColor(IntPtr th, int part, int state, Color fallback) {
        int c;
        if (N.GetThemeColor(th, part, state, 3803, out c) == 0) return Color.FromArgb(c & 255, (c >> 8) & 255, (c >> 16) & 255);
        return fallback;
    }
    public N.LOGFONT ThemeFont(IntPtr th, int part, int state) {
        N.LOGFONT lf = new N.LOGFONT();
        int hr = N.GetThemeFont(th, IntPtr.Zero, part, state, 210, ref lf);
        if (hr != 0 || string.IsNullOrEmpty(lf.lfFaceName)) {
            lf = new N.LOGFONT();
            N.GetThemeSysFont(th, 805, ref lf);
        }
        if (string.IsNullOrEmpty(lf.lfFaceName)) { lf.lfFaceName = "Microsoft YaHei UI"; lf.lfHeight = -12; }
        return lf;
    }
    public Font FontFrom(N.LOGFONT lf) {
        int px = Math.Abs(lf.lfHeight);
        if (px < 6) px = 12;
        string face = string.IsNullOrEmpty(lf.lfFaceName) ? "Microsoft YaHei UI" : lf.lfFaceName;
        FontStyle fs = lf.lfWeight >= 700 ? FontStyle.Bold : FontStyle.Regular;
        if (lf.lfItalic != 0) fs = fs | FontStyle.Italic;
        try { return new Font(face, px, fs, GraphicsUnit.Pixel); } catch { return new Font("Segoe UI", px, FontStyle.Regular, GraphicsUnit.Pixel); }
    }
    public void Text(Graphics g, string s, Font f, Color c, RectangleF rect, StringAlignment h, StringAlignment v) {
        using (StringFormat sf = new StringFormat()) {
            sf.Alignment = h; sf.LineAlignment = v; sf.FormatFlags = StringFormatFlags.NoWrap;
            using (SolidBrush br = new SolidBrush(c)) { g.DrawString(s, f, br, rect, sf); }
        }
    }
    public Size PartSize(IntPtr th, int part, int state, Size fallback) {
        N.SIZE sz;
        if (N.GetThemePartSize(th, IntPtr.Zero, part, state, IntPtr.Zero, 1, out sz) == 0 && sz.cx > 0 && sz.cy > 0)
            return new Size(sz.cx, sz.cy);
        return fallback;
    }
    public string Sample(Bitmap b, int x, int y) {
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x >= b.Width) x = b.Width - 1; if (y >= b.Height) y = b.Height - 1;
        return U.Hex(b.GetPixel(x, y));
    }
    public void SavePair(Bitmap oneX, string name) {
        string mode = Mode();
        U.Save(oneX, Path.Combine(Sub("matrix"), string.Format("win10-{0}-{1}-96dpi.png", name, mode)));
        using (Bitmap big = new Bitmap(oneX.Width * 2, oneX.Height * 2, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(big)) {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(oneX, new Rectangle(0, 0, big.Width, big.Height));
            }
            U.Save(big, Path.Combine(Sub("matrix"), string.Format("win10-{0}-{1}.png", name, mode)));
        }
    }
    public void Cleanup() { if (Hwnd != IntPtr.Zero) { N.DestroyWindow(Hwnd); Hwnd = IntPtr.Zero; } }
}

// ===== final state matrix =====
static class Matrix {
    const int CELL_W = 324;
    const int OY = 12;

    public static void All(R r) {
        StreamWriter m = new StreamWriter(Path.Combine(r.Sub("matrix"), "metrics-" + r.Mode() + ".txt"), false, new UTF8Encoding(false));
        try {
            m.WriteLine("mode=" + r.Mode() + "  rendered at 96 dpi native (1x); 2x files are nearest-neighbour pixel doubles");
            if (r.Dark) m.WriteLine("dark setup: SetPreferredAppMode(ForceDark=2) + SetWindowTheme(hwnd, DarkMode_Explorer|DarkMode_CFD) [undocumented]; Win10 only darkens part of the Win32 controls");
            m.WriteLine("bg=#FFFFFF (COLOR_WINDOW)  theme=" + ThemeName() + "  font=" + SysFont());
            m.WriteLine("control widths: button=200 field=200 textarea=200x80 combo=200 slider=160 checkbox/radio=200");
            m.WriteLine("");
            Button(r, m, "normal", 1, false);
            Button(r, m, "hot", 2, false);
            Button(r, m, "pressed", 3, false);
            Button(r, m, "focus", 1, true);
            Button(r, m, "disabled", 4, false);
            Button(r, m, "defaulted", 5, false);
            m.WriteLine("");
            Field(r, m, "normal", 1, "Hello");
            Field(r, m, "hot", 2, "Hello");
            Field(r, m, "focus", 5, "Hello");
            Field(r, m, "disabled", 4, "Hello");
            Field(r, m, "readonly", 6, "Hello");
            m.WriteLine("");
            Textarea(r, m, "normal", 1);
            Textarea(r, m, "hot", 2);
            Textarea(r, m, "focus", 3);
            Textarea(r, m, "disabled", 4);
            m.WriteLine("");
            Combo(r, m, "normal", 1, 1, false);
            Combo(r, m, "hot", 2, 2, false);
            Combo(r, m, "pressed", 3, 3, false);
            Combo(r, m, "focus", 1, 1, true);
            Combo(r, m, "disabled", 4, 4, false);
            ComboOpen(r, m);
            m.WriteLine("");
            Slider(r, m, "normal", 1, false);
            Slider(r, m, "hot", 2, false);
            Slider(r, m, "pressed", 3, false);
            Slider(r, m, "focus", 4, false);
            Slider(r, m, "disabled", 5, false);
            m.WriteLine("");
            Check(r, m, false, "unchecked-normal", 1, false);
            Check(r, m, false, "unchecked-hot", 2, false);
            Check(r, m, false, "unchecked-pressed", 3, false);
            Check(r, m, false, "unchecked-focus", 1, true);
            Check(r, m, false, "unchecked-disabled", 4, false);
            Check(r, m, false, "checked-normal", 5, false);
            Check(r, m, false, "checked-hot", 6, false);
            Check(r, m, false, "checked-pressed", 7, false);
            Check(r, m, false, "checked-focus", 5, true);
            Check(r, m, false, "checked-disabled", 8, false);
            m.WriteLine("");
            Check(r, m, true, "unchecked-normal", 1, false);
            Check(r, m, true, "unchecked-hot", 2, false);
            Check(r, m, true, "unchecked-pressed", 3, false);
            Check(r, m, true, "unchecked-focus", 1, true);
            Check(r, m, true, "unchecked-disabled", 4, false);
            Check(r, m, true, "checked-normal", 5, false);
            Check(r, m, true, "checked-hot", 6, false);
            Check(r, m, true, "checked-pressed", 7, false);
            Check(r, m, true, "checked-focus", 5, true);
            Check(r, m, true, "checked-disabled", 8, false);
            m.WriteLine("");
            m.WriteLine("switch: NO Win32/uxtheme part on Windows 10 -> no PNG. See docs/windows-win10-notes.md.");
        } finally { m.Close(); }
    }

    static string ThemeName() {
        StringBuilder f = new StringBuilder(512), c = new StringBuilder(512), z = new StringBuilder(512);
        int hr = N.GetCurrentThemeName(f, 512, c, 512, z, 512);
        return string.Format("hr=0x{0:X8} file='{1}' scheme='{2}' size='{3}'", hr, f.ToString(), c.ToString(), z.ToString());
    }
    static string SysFont() {
        IntPtr th = N.OpenThemeData(IntPtr.Zero, "Button");
        if (th == IntPtr.Zero) return "n/a";
        N.LOGFONT lf = new N.LOGFONT();
        N.GetThemeSysFont(th, 805, ref lf);
        N.CloseThemeData(th);
        return string.Format("{0} h={1} weight={2}", lf.lfFaceName, lf.lfHeight, lf.lfWeight);
    }

    static void Button(R r, StreamWriter m, string stateName, int state, bool focus) {
        int w = 200, h = 23, ox = 12;
        string name = "button-" + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 48, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Button");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                r.DrawThemePart(g, th, 1, state, new Rectangle(ox, OY, w, h));
                Color tc = r.ThemeTextColor(th, 1, state, Color.Black);
                Font f = r.FontFrom(r.ThemeFont(th, 1, state));
                r.Text(g, "Button", f, tc, new RectangleF(ox, OY, w, h), StringAlignment.Center, StringAlignment.Center);
                f.Dispose();
                if (focus) r.DrawFocus(g, new Rectangle(ox + 3, OY + 3, w - 6, h - 6));
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=200x23 fill={1} top={2} left={3} text={4}", name,
                    r.Sample(b, ox + w - 10, OY + h / 2), r.Sample(b, ox + w / 2, OY), r.Sample(b, ox, OY + h / 2), U.Hex(tc)));
            }
            r.SavePair(b, name);
        }
    }

    static void Field(R r, StreamWriter m, string stateName, int state, string text) {
        int w = 200, h = 23, ox = 12;
        string name = "field-" + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 48, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Edit");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                int part = r.Dark ? 6 : 1; // part1 has no dark variant in aero2; EP_EDITBORDER(6) does
                int pstate = state;
                if (r.Dark && state == 5) pstate = 3; // focused
                if (r.Dark && state == 6) pstate = 1; // readonly -> normal in dark
                r.DrawThemePart(g, th, part, pstate, new Rectangle(ox, OY, w, h));
                if (string.Equals(stateName, "disabled") && !r.Dark) {
                    // native disabled edit: COLOR_3DFACE fill inside the normal themed frame
                    IntPtr bg = r.Theme("Edit");
                    r.DrawThemePart(g, bg, 3, 3, new Rectangle(ox + 1, OY + 1, w - 2, h - 2)); // EP_BACKGROUND EBS_DISABLED
                    N.CloseThemeData(bg);
                }
                Color tc = r.ThemeTextColor(th, part, pstate, Color.Black);
                if (r.Dark) tc = string.Equals(stateName, "disabled") ? Color.FromArgb(0x9B, 0x9B, 0x9B) : Color.FromArgb(0xE1, 0xE1, 0xE1);
                if (string.Equals(stateName, "disabled")) tc = r.Dark ? Color.FromArgb(0x9B, 0x9B, 0x9B) : Color.FromArgb(0x6D, 0x6D, 0x6D);
                Font f = r.FontFrom(r.ThemeFont(th, 1, state));
                r.Text(g, text, f, tc, new RectangleF(ox + 3, OY, w - 6, h), StringAlignment.Near, StringAlignment.Center);
                if (string.Equals(stateName, "focus")) {
                    // steady caret: native caret is drawn by the control, not a theme part
                    float tw = g.MeasureString(text, f).Width;
                    using (Pen p = new Pen(Color.Black, 1)) g.DrawLine(p, ox + 3 + tw + 1, OY + 4, ox + 3 + tw + 1, OY + h - 5);
                }
                f.Dispose();
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=200x23 fill={1} border={2}", name,
                    r.Sample(b, ox + w - 10, OY + h / 2), r.Sample(b, ox, OY + h / 2)));
            }
            r.SavePair(b, name);
        }
    }

    static void Textarea(R r, StreamWriter m, string stateName, int state) {
        int w = 200, h = 80, ox = 12, oy = 12;
        string name = "textarea-" + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 120, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Edit");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                r.DrawThemePart(g, th, 6, state, new Rectangle(ox, oy, w, h)); // EP_EDITBORDER_NOSCROLL
                if (string.Equals(stateName, "disabled") && !r.Dark) {
                    IntPtr bg = r.Theme("Edit");
                    r.DrawThemePart(g, bg, 3, 3, new Rectangle(ox + 1, oy + 1, w - 2, h - 2));
                    N.CloseThemeData(bg);
                }
                Color tc = r.ThemeTextColor(th, 6, state, Color.Black);
                if (r.Dark) tc = string.Equals(stateName, "disabled") ? Color.FromArgb(0x9B, 0x9B, 0x9B) : Color.FromArgb(0xE1, 0xE1, 0xE1);
                if (string.Equals(stateName, "disabled")) tc = r.Dark ? Color.FromArgb(0x9B, 0x9B, 0x9B) : Color.FromArgb(0x6D, 0x6D, 0x6D);
                Font f = r.FontFrom(r.ThemeFont(th, 6, state));
                r.Text(g, "Line one\r\nLine two", f, tc, new RectangleF(ox + 4, oy + 3, w - 8, h - 6), StringAlignment.Near, StringAlignment.Near);
                f.Dispose();
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=200x80 fill={1} border={2}", name,
                    r.Sample(b, ox + w - 10, oy + h / 2), r.Sample(b, ox, oy + h / 2)));
            }
            r.SavePair(b, name);
        }
    }

    static void Combo(R r, StreamWriter m, string stateName, int fieldState, int arrowState, bool focus) {
        int w = 200, h = 23, ox = 12;
        string name = "combobox-" + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 48, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Combobox");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                // dropdownlist (non-editable) closed combo = CP_READONLY field + CP_DROPDOWNBUTTON arrow
                r.DrawThemePart(g, th, 5, fieldState, new Rectangle(ox, OY, w, h));            // CP_READONLY
                int aw = 17;
                r.DrawThemePart(g, th, 1, arrowState, new Rectangle(ox + w - aw, OY, aw, h)); // CP_DROPDOWNBUTTON
                Color tc = r.ThemeTextColor(th, 5, fieldState, Color.Black);
                Font f = r.FontFrom(r.ThemeFont(th, 5, fieldState));
                r.Text(g, "Item 2", f, tc, new RectangleF(ox + 4, OY, w - aw - 6, h), StringAlignment.Near, StringAlignment.Center);
                f.Dispose();
                if (focus) r.DrawFocus(g, new Rectangle(ox + 1, OY + 2, w - aw - 2, h - 4));
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=200x23 arrowW={1} fill={2} border={3}", name, aw,
                    r.Sample(b, ox + w - aw - 10, OY + h / 2), r.Sample(b, ox, OY + h / 2)));
            }
            r.SavePair(b, name);
        }
    }

    static void ComboOpen(R r, StreamWriter m) {
        int w = 200, hc = 23, ox = 12, oy = 12, itemH = 16, pad = 1;
        int popH = itemH * 4 + pad * 2;
        int cellH = oy + hc + popH + 12;
        using (Bitmap b = r.NewBmp(CELL_W, cellH, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Combobox");
                if (th == IntPtr.Zero) { m.WriteLine("combobox-open SKIPPED no-theme"); return; }
                r.DrawThemePart(g, th, 5, 1, new Rectangle(ox, oy, w, hc)); // CP_READONLY normal
                int aw = 17;
                r.DrawThemePart(g, th, 1, 1, new Rectangle(ox + w - aw, oy, aw, hc));
                Font f = r.FontFrom(r.ThemeFont(th, 5, 1));
                r.Text(g, "Item 2", f, r.ThemeTextColor(th, 5, 1, Color.Black), new RectangleF(ox + 4, oy, w - aw - 6, hc), StringAlignment.Near, StringAlignment.Center);
                f.Dispose();
                int py = oy + hc;
                IntPtr lb = r.Theme("Listbox");
                if (lb != IntPtr.Zero) {
                    r.DrawThemePart(g, lb, 3, 1, new Rectangle(ox, py, w, popH)); // LBCP_BORDER_NOSCROLL
                    N.CloseThemeData(lb);
                } else {
                    using (Pen p = new Pen(Color.FromArgb(0x7A, 0x7A, 0x7A), 1)) g.DrawRectangle(p, ox, py, w - 1, popH - 1);
                }
                if (!r.Dark) { using (SolidBrush white = new SolidBrush(Color.White)) g.FillRectangle(white, ox + 1, py + 1, w - 2, popH - 2); }
                string[] labels = { "Item 1", "Item 2 (hot)", "Item 3", "Item 4" };
                for (int i = 0; i < 4; i++) {
                    if (i == 1) r.DrawThemePart(g, th, 9, 2, new Rectangle(ox + 1, py + pad + i * itemH, w - 2, itemH)); // CBDI_HIGHLIGHTED
                    Color tc = (i == 1) ? Color.White : (r.Dark ? Color.FromArgb(0xE1, 0xE1, 0xE1) : Color.Black);
                    Font ff = r.FontFrom(r.ThemeFont(th, 5, 1));
                    r.Text(g, labels[i], ff, tc, new RectangleF(ox + 5, py + pad + i * itemH, w - 10, itemH), StringAlignment.Near, StringAlignment.Center);
                    ff.Dispose();
                }
                N.CloseThemeData(th);
                m.WriteLine(string.Format("combobox-open          chip=200x{0} itemH={1} item_hot_fill={2} popup_border={3}",
                    hc + popH, itemH, r.Sample(b, ox + 30, py + pad + itemH + itemH / 2), r.Sample(b, ox, py + pad)));
            }
            r.SavePair(b, "combobox-open");
        }
    }

    static void Slider(R r, StreamWriter m, string stateName, int thumbState, bool focus) {
        int w = 160, h = 21, ox = 12;
        string name = "slider-" + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 48, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Trackbar");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                r.DrawThemePart(g, th, 1, 1, new Rectangle(ox, OY + (h - 4) / 2, w, 4)); // TKP_TRACK, native channel is 4px
                int tx = ox + 66;
                r.DrawThemePart(g, th, 4, thumbState, new Rectangle(tx, OY + (h - 19) / 2, 11, 19)); // TKP_THUMBBOTTOM 11x19
                if (focus) r.DrawFocus(g, new Rectangle(tx - 1, OY + (h - 19) / 2 - 1, 11 + 2, 19 + 2));
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=160x21 trackH=4 thumb=11x19 channel={1} thumbCenter={2}", name,
                    r.Sample(b, ox + 8, OY + h / 2), r.Sample(b, tx + 5, OY + h / 2)));
            }
            r.SavePair(b, name);
        }
    }

    static void Check(R r, StreamWriter m, bool radio, string stateName, int state, bool focus) {
        int w = 200, h = 23, ox = 12;
        int part = radio ? 2 : 3;
        string name = (radio ? "radio-" : "checkbox-") + stateName;
        using (Bitmap b = r.NewBmp(CELL_W, 48, r.Bg)) {
            using (Graphics g = r.G(b)) {
                IntPtr th = r.Theme("Button");
                if (th == IntPtr.Zero) { m.WriteLine(name + " SKIPPED no-theme"); return; }
                Size box = r.PartSize(th, part, state, new Size(13, 13));
                int by = OY + (h - box.Height) / 2;
                r.DrawThemePart(g, th, part, state, new Rectangle(ox, by, box.Width, box.Height));
                Color tc = r.ThemeTextColor(th, part, state, Color.Black);
                if (stateName.EndsWith("disabled")) tc = Color.FromArgb(0x6D, 0x6D, 0x6D);
                Font f = r.FontFrom(r.ThemeFont(th, part, state));
                r.Text(g, "Label", f, tc, new RectangleF(ox + box.Width + 4, OY, w - box.Width - 4, h), StringAlignment.Near, StringAlignment.Center);
                f.Dispose();
                if (focus) r.DrawFocus(g, new Rectangle(ox, OY + 1, w, h - 2));
                N.CloseThemeData(th);
                m.WriteLine(string.Format("{0,-22} chip=200x23 box={1}x{2} boxCenter={3} boxBorder={4} text={5}", name, box.Width, box.Height,
                    r.Sample(b, ox + box.Width / 2, by + box.Height / 2), r.Sample(b, ox, by + box.Height / 2), U.Hex(tc)));
            }
            r.SavePair(b, name);
        }
    }
}

// ===== discovery / diagnostics =====
static class Modes {
    public static void Facts(R r) {
        U.A("== session ==");
        U.A("session id         : " + System.Diagnostics.Process.GetCurrentProcess().SessionId);
        U.A("GetDpiForSystem    : " + N.GetDpiForSystem());
        U.A("GetDpiForWindow    : " + N.GetDpiForWindow(r.Hwnd));
        U.A("SysColor WINDOW    : " + U.Hex(N.GetSysColor(5)));
        U.A("SysColor WINDOWTEXT: " + U.Hex(N.GetSysColor(8)));
        U.A("SysColor BTNFACE   : " + U.Hex(N.GetSysColor(15)));
        U.A("SysColor BTNTEXT   : " + U.Hex(N.GetSysColor(18)));
        U.A("SysColor GRAYTEXT  : " + U.Hex(N.GetSysColor(17)));
        U.A("SysColor HIGHLIGHT : " + U.Hex(N.GetSysColor(13)));
        U.A("SysColor 3DSHADOW  : " + U.Hex(N.GetSysColor(16)));
        U.A("SysColor 3DLIGHT   : " + U.Hex(N.GetSysColor(22)));
        U.A("SysColor HOTLIGHT  : " + U.Hex(N.GetSysColor(26)));
        StringBuilder f = new StringBuilder(512), c = new StringBuilder(512), z = new StringBuilder(512);
        int hr = N.GetCurrentThemeName(f, 512, c, 512, z, 512);
        U.A(string.Format("GetCurrentThemeName: hr=0x{0:X8} file='{1}' scheme='{2}' size='{3}'", hr, f.ToString(), c.ToString(), z.ToString()));

        string[] classes = { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar", "Spin", "Header", "Scrollbar", "Window", "TaskDialog", "Toolbar", "Explorer" };
        U.A("");
        U.A("== theme handles / fonts ==");
        foreach (string cls in classes) {
            IntPtr th = N.OpenThemeData(r.Hwnd, cls);
            U.A(string.Format("handle {0,-12}: 0x{1:X}", cls, th.ToInt64()));
            if (th == IntPtr.Zero) continue;
            N.LOGFONT lf = new N.LOGFONT();
            int fr = N.GetThemeFont(th, IntPtr.Zero, 1, 1, 210, ref lf);
            U.A(string.Format("  GetThemeFont(1,1,210) hr={0} face='{1}' h={2} weight={3}", fr, lf.lfFaceName, lf.lfHeight, lf.lfWeight));
            N.LOGFONT sys = new N.LOGFONT();
            int sr = N.GetThemeSysFont(th, 805, ref sys);
            U.A(string.Format("  GetThemeSysFont(805)  hr={0} face='{1}' h={2} weight={3}", sr, sys.lfFaceName, sys.lfHeight, sys.lfWeight));
            N.CloseThemeData(th);
        }

        U.A("");
        U.A("== part sizes (device px = logical px @96dpi) ==");
        string[] pclasses = { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar", "Spin" };
        foreach (string cls in pclasses) {
            IntPtr th = N.OpenThemeData(r.Hwnd, cls);
            if (th == IntPtr.Zero) continue;
            U.A("class " + cls);
            for (int part = 1; part <= 12; part++) {
                StringBuilder sb = new StringBuilder();
                int found = 0;
                for (int st = 1; st <= 8; st++) {
                    N.SIZE sz;
                    int rh = N.GetThemePartSize(th, IntPtr.Zero, part, st, IntPtr.Zero, 1, out sz);
                    if (rh == 0 && sz.cx > 0 && sz.cy > 0) { sb.Append(string.Format(" s{0}={1}x{2}", st, sz.cx, sz.cy)); found++; }
                }
                if (found > 0) U.A("  part" + part + ":" + sb.ToString());
            }
            N.CloseThemeData(th);
        }

        U.A("");
        U.A("== theme colors: TEXTCOLOR=3803 FILLCOLOR=3802 BORDERCOLOR=3801 ==");
        string[] cclasses = { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar" };
        foreach (string cls in cclasses) {
            IntPtr th = N.OpenThemeData(r.Hwnd, cls);
            if (th == IntPtr.Zero) continue;
            U.A("class " + cls);
            for (int part = 1; part <= 12; part++) {
                for (int st = 1; st <= 8; st++) {
                    int tc, fc, bc;
                    int a = N.GetThemeColor(th, part, st, 3803, out tc);
                    int b = N.GetThemeColor(th, part, st, 3802, out fc);
                    int cc = N.GetThemeColor(th, part, st, 3801, out bc);
                    if (a == 0 || b == 0 || cc == 0)
                        U.A(string.Format("  p{0}s{1}: text={2} fill={3} border={4}", part, st,
                            a == 0 ? U.Hex(tc) : "-", b == 0 ? U.Hex(fc) : "-", cc == 0 ? U.Hex(bc) : "-"));
                }
            }
            N.CloseThemeData(th);
        }
    }

    public static void Dump(R r) {
        string[] classes = r.Dark
            ? new string[] { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar", "DarkMode_Explorer", "DarkMode_CFD" }
            : new string[] { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar", "Spin" };
        foreach (string cls in classes) {
            IntPtr th = r.Theme(cls);
            if (th == IntPtr.Zero) { U.A("dump " + cls + ": NO THEME"); continue; }
            int cw = 92, ch = 34;
            using (Bitmap b = r.NewBmp(cw * 8, ch * 12, Color.FromArgb(0xF0, 0xF0, 0xF0))) {
                using (Graphics g = r.G(b)) {
                    using (Font small = new Font("Consolas", 7, FontStyle.Regular, GraphicsUnit.Pixel))
                    using (SolidBrush black = new SolidBrush(Color.Black))
                    using (Pen pen = new Pen(Color.FromArgb(0xC0, 0xC0, 0xC0), 1)) {
                        for (int part = 1; part <= 12; part++) {
                            for (int st = 1; st <= 8; st++) {
                                int cx = (st - 1) * cw, cy = (part - 1) * ch;
                                g.DrawRectangle(pen, cx, cy, cw - 1, ch - 1);
                                N.SIZE sz;
                                int rh = N.GetThemePartSize(th, IntPtr.Zero, part, st, IntPtr.Zero, 1, out sz);
                                g.DrawString("p" + part + "s" + st + (rh == 0 ? " " + sz.cx + "x" + sz.cy : ""), small, black, cx + 2, cy + 1);
                                if (rh == 0) r.DrawThemePart(g, th, part, st, new Rectangle(cx + 2, cy + 9, Math.Max(4, cw - 4), Math.Max(4, ch - 10)));
                            }
                        }
                    }
                }
                string name = "dump-" + cls + (r.Dark ? "-dark" : "");
                U.Save(b, Path.Combine(r.Sub("dump"), name + ".png"));
            }
            N.CloseThemeData(th);
        }
    }

    public static void DarkProbe(R r, string variant) {
        U.A("variant " + variant);
        if (variant == "B" || variant == "C" || variant == "E") U.A("SetPreferredAppMode(2) -> " + N.SetPreferredAppMode(2));
        if (variant == "C" || variant == "D") U.A("SetWindowTheme(DarkMode_Explorer) -> " + N.SetWindowTheme(r.Hwnd, "DarkMode_Explorer", null));
        if (variant == "E") U.A("SetWindowTheme(DarkMode_CFD) -> " + N.SetWindowTheme(r.Hwnd, "DarkMode_CFD", null));
        string[] classes = { "Button", "Edit", "Combobox", "Listbox", "Listview", "Trackbar", "DarkMode_Explorer", "DarkMode_CFD", "DarkMode_ItemsView", "DarkMode_ListView", "TaskDialog" };
        foreach (string cls in classes) {
            IntPtr thNull = N.OpenThemeData(IntPtr.Zero, cls);
            IntPtr thHwnd = N.OpenThemeData(r.Hwnd, cls);
            U.A(string.Format("class {0,-20}: NULL=0x{1:X} HWND=0x{2:X}", cls, thNull.ToInt64(), thHwnd.ToInt64()));
            IntPtr th = thHwnd != IntPtr.Zero ? thHwnd : thNull;
            if (th != IntPtr.Zero) {
                int part = cls == "Listview" ? 1 : (cls == "Trackbar" ? 3 : (cls == "Combobox" ? 4 : 1));
                int state = 1;
                N.SIZE sz;
                N.GetThemePartSize(th, IntPtr.Zero, part, state, IntPtr.Zero, 1, out sz);
                using (Bitmap b = r.NewBmp(120, 34, Color.FromArgb(0xF0, 0xF0, 0xF0))) {
                    using (Graphics g = r.G(b)) { r.DrawThemePart(g, th, part, state, new Rectangle(4, 4, 100, 26)); }
                    U.A(string.Format("   p{0}s{1} size={2}x{3} center={4} edge={5}", part, state, sz.cx, sz.cy, U.Hex(b.GetPixel(50, 17)), U.Hex(b.GetPixel(4, 17))));
                    U.Save(b, Path.Combine(r.Sub("darkprobe"), string.Format("variant-{0}-{1}.png", variant, cls)));
                }
            }
            if (thNull != IntPtr.Zero) N.CloseThemeData(thNull);
            if (thHwnd != IntPtr.Zero) N.CloseThemeData(thHwnd);
        }
        // try undocumented ordinal candidates for AllowDarkModeForWindow
        U.A("");
        U.A("== uxtheme ordinal scan (non-null exports) ==");
        IntPtr mod = N.LoadLibraryW("uxtheme.dll");
        for (int ord = 100; ord <= 200; ord++) {
            IntPtr p = N.GetProcAddressOrd(mod, (IntPtr)ord);
            if (p != IntPtr.Zero) U.A("  ordinal " + ord + " -> non-null");
        }
    }
}

// ===== real themed window capture =====
static class CaptureTest {
    public static void Run(R r) {
        U.A("== capture test ==");
        U.A("session            : " + System.Diagnostics.Process.GetCurrentProcess().SessionId);
        U.A("UserInteractive    : " + Environment.UserInteractive);
        U.A("RenderWithVisualStyles: " + Application.RenderWithVisualStyles);
        Form form = new Form();
        form.Text = "win32 capture probe";
        form.FormBorderStyle = FormBorderStyle.FixedSingle;
        form.StartPosition = FormStartPosition.Manual;
        form.Location = new Point(0, 0);
        form.ClientSize = new Size(460, 340);
        form.ShowInTaskbar = false;
        form.BackColor = Color.White;
        Button btn = new Button(); btn.Text = "OK"; btn.SetBounds(20, 20, 90, 26);
        Button btnDis = new Button(); btnDis.Text = "Disabled"; btnDis.SetBounds(120, 20, 90, 26); btnDis.Enabled = false;
        TextBox tb = new TextBox(); tb.Text = "Hello"; tb.SetBounds(20, 60, 200, 24);
        TextBox tbRo = new TextBox(); tbRo.Text = "Readonly"; tbRo.ReadOnly = true; tbRo.SetBounds(230, 60, 180, 24);
        TextBox tbDis = new TextBox(); tbDis.Text = "Disabled"; tbDis.Enabled = false; tbDis.SetBounds(20, 90, 200, 24);
        TextBox ml = new TextBox(); ml.Multiline = true; ml.Text = "Line one\r\nLine two"; ml.SetBounds(20, 120, 200, 70);
        ComboBox cb = new ComboBox(); cb.Items.Add("Item 1"); cb.Items.Add("Item 2"); cb.SelectedIndex = 1; cb.SetBounds(20, 200, 200, 24);
        CheckBox chk1 = new CheckBox(); chk1.Text = "Checkbox"; chk1.SetBounds(20, 232, 100, 24);
        CheckBox chk2 = new CheckBox(); chk2.Text = "Checked"; chk2.Checked = true; chk2.SetBounds(125, 232, 100, 24);
        RadioButton rb1 = new RadioButton(); rb1.Text = "Radio"; rb1.SetBounds(20, 262, 100, 24);
        RadioButton rb2 = new RadioButton(); rb2.Text = "Radio2"; rb2.Checked = true; rb2.SetBounds(125, 262, 100, 24);
        TrackBar tr = new TrackBar(); tr.SetBounds(20, 292, 160, 30); tr.Minimum = 0; tr.Maximum = 100; tr.Value = 40;
        form.Controls.Add(btn); form.Controls.Add(btnDis); form.Controls.Add(tb); form.Controls.Add(tbRo);
        form.Controls.Add(tbDis); form.Controls.Add(ml); form.Controls.Add(cb);
        form.Controls.Add(chk1); form.Controls.Add(chk2); form.Controls.Add(rb1); form.Controls.Add(rb2); form.Controls.Add(tr);
        form.Show();
        Pump(1200);
        // log control screen rects
        Control[] cs = { btn, btnDis, tb, tbRo, tbDis, ml, cb, chk1, chk2, rb1, rb2, tr };
        string[] names = { "button", "button-disabled", "field", "field-readonly", "field-disabled", "textarea", "combobox", "checkbox", "checkbox-checked", "radio", "radio-checked", "slider" };
        for (int i = 0; i < cs.Length; i++) {
            Rectangle b = cs[i].RectangleToScreen(cs[i].ClientRectangle);
            U.A(string.Format("control {0,-18} screenrect=({1},{2}) size={3}x{4}", names[i], b.Left, b.Top, b.Width, b.Height));
        }
        string dir = r.Sub("capture");
        // capture 1: text field focused
        tb.Focus(); Pump(400);
        U.A("focus1             : " + Desc(form.ActiveControl));
        Shot(form, dir, "window-edit-focus", 2);
        // capture 2: button focused
        btn.Focus(); Pump(400);
        U.A("focus2             : " + Desc(form.ActiveControl));
        Shot(form, dir, "window-button-focus", 2);
        // combo dropped down: capture popup list window
        try {
            cb.DroppedDown = true; Pump(600);
            N.COMBOBOXINFO ci = new N.COMBOBOXINFO();
            ci.cbSize = Marshal.SizeOf(typeof(N.COMBOBOXINFO));
            bool ok = N.GetComboBoxInfo(cb.Handle, ref ci);
            U.A(string.Format("GetComboBoxInfo  ok={0} hwndList=0x{1:X} rcItem={2}x{3}", ok, ci.hwndList.ToInt64(), ci.rcItem.R - ci.rcItem.L, ci.rcItem.B - ci.rcItem.T));
            if (ci.hwndList != IntPtr.Zero) Shot(ci.hwndList, dir, "combobox-popup", 2);
            cb.DroppedDown = false; Pump(300);
        } catch (Exception ex) { U.A("dropdown capture FAILED: " + ex.Message); }
        // PrintWindow basic flag too
        Shot(form, dir, "window-printwindow-basic", 0);
        try {
            using (Bitmap b = new Bitmap(600, 420)) {
                using (Graphics g = Graphics.FromImage(b)) g.CopyFromScreen(0, 0, 0, 0, new Size(600, 420));
                U.A("CopyFromScreen: " + Stats(b));
                U.Save(b, Path.Combine(dir, "copyfromscreen.png"));
            }
        } catch (Exception ex) { U.A("CopyFromScreen FAILED: " + ex.GetType().Name + ": " + ex.Message); }
        try {
            using (Bitmap b = new Bitmap(form.Width, form.Height)) {
                form.DrawToBitmap(b, new Rectangle(0, 0, form.Width, form.Height));
                U.A("DrawToBitmap: " + Stats(b));
                U.Save(b, Path.Combine(dir, "drawtobitmap.png"));
            }
        } catch (Exception ex) { U.A("DrawToBitmap FAILED: " + ex.GetType().Name + ": " + ex.Message); }
        form.Close();
        Application.DoEvents();
    }
    static string Desc(Control c) { return c == null ? "null" : c.GetType().Name + " '" + c.Text + "'"; }
    static void Pump(int ms) {
        int n = Math.Max(1, ms / 40);
        for (int i = 0; i < n; i++) { Application.DoEvents(); System.Threading.Thread.Sleep(40); }
    }
    static void Shot(Form f, string dir, string name, uint flags) { Shot(f.Handle, dir, name, flags); }
    static void AddStr(IntPtr combo, string s) {
        IntPtr p = Marshal.StringToHGlobalUni(s);
        N.SendMessageW(combo, 0x0143 /*CB_ADDSTRING*/, IntPtr.Zero, p);
        Marshal.FreeHGlobal(p);
    }
    static void Shot(IntPtr hwnd, string dir, string name, uint flags) {
        N.RECT wr;
        N.GetWindowRect(hwnd, out wr);
        int w = wr.R - wr.L, h = wr.B - wr.T;
        if (w <= 0 || h <= 0) { U.A("Shot " + name + ": bad rect"); return; }
        try {
            using (Bitmap b = new Bitmap(w, h)) {
                bool ok;
                using (Graphics g = Graphics.FromImage(b)) {
                    IntPtr hdc = g.GetHdc();
                    ok = N.PrintWindow(hwnd, hdc, flags);
                    g.ReleaseHdc(hdc);
                }
                U.A(string.Format("PrintWindow({0}) flags={1} ok={2} {3}", name, flags, ok, Stats(b)));
                U.Save(b, Path.Combine(dir, name + ".png"));
            }
        } catch (Exception ex) { U.A("PrintWindow " + name + " FAILED: " + ex.GetType().Name + ": " + ex.Message); }
    }
    public static string Stats(Bitmap b) {
        long n = 0, black = 0, white = 0, sum = 0;
        HashSet<int> colors = new HashSet<int>();
        for (int y = 0; y < b.Height; y += 2) {
            for (int x = 0; x < b.Width; x += 2) {
                Color c = b.GetPixel(x, y);
                n++;
                int lum = (c.R * 299 + c.G * 587 + c.B * 114) / 1000;
                sum += lum;
                if (lum < 8) black++;
                if (lum > 250) white++;
                if (colors.Count < 50000) colors.Add(c.ToArgb());
            }
        }
        return string.Format("size={0}x{1} distinctColors={2} meanLum={3} blackFrac={4:F3} whiteFrac={5:F3}",
            b.Width, b.Height, colors.Count, n == 0 ? 0 : sum / n, n == 0 ? 0 : (double)black / n, n == 0 ? 0 : (double)white / n);
    }
}

// ===== system default control sizes via hidden dialog template =====
static class DlgMetrics {
    static void WriteSz(BinaryWriter w, string s) { w.Write(Encoding.Unicode.GetBytes(s + "\0")); }
    static void Align4(MemoryStream ms) { while (ms.Position % 4 != 0) ms.WriteByte(0); }
    static void Item(MemoryStream ms, BinaryWriter w, uint style, short x, short y, short cx, short cy, ushort id, bool atom, ushort atomVal, string cls, string title) {
        Align4(ms);
        w.Write(style);          // DWORD style
        w.Write((uint)0);        // DWORD exstyle
        w.Write(x); w.Write(y); w.Write(cx); w.Write(cy);
        w.Write(id);
        if (atom) { w.Write((ushort)0xFFFF); w.Write(atomVal); }
        else { WriteSz(w, cls); }
        WriteSz(w, title);
        w.Write((ushort)0);      // extra count
        ms.Flush();
    }
    public static void Run(R r) {
        U.A("== native default control sizes (hidden dialog, DS_SETFONT MS Shell Dlg 9pt) ==");
        const uint dlgStyle = 0x80000040; // WS_POPUP | DS_SETFONT, hidden
        MemoryStream ms = new MemoryStream(); BinaryWriter w = new BinaryWriter(ms);
        w.Write(dlgStyle); w.Write((uint)0); w.Write((ushort)7);
        w.Write((short)0); w.Write((short)0); w.Write((short)240); w.Write((short)240);
        w.Write((ushort)0); w.Write((ushort)0);
        WriteSz(w, "probe");
        // DS_SETFONT: pointsize(2) weight(2) italic(1) charset(1) facename
        w.Write((ushort)9); w.Write((ushort)400); w.Write((byte)0); w.Write((byte)1);
        WriteSz(w, "Microsoft YaHei UI");
        ms.Flush();
        const uint CHILD_VIS = 0x50000000; // WS_CHILD|WS_VISIBLE
        const uint TAB = 0x00010000;
        const uint DIS = 0x08000000;
        Item(ms, w, CHILD_VIS | TAB, 0, 0, 50, 14, 1001, true, 0x0080, null, "OK");                  // button 50x14 DLU
        Item(ms, w, CHILD_VIS | DIS, 60, 0, 50, 14, 1002, true, 0x0080, null, "Disabled");
        Item(ms, w, CHILD_VIS | TAB | 0x00800000u, 0, 20, 100, 14, 1003, true, 0x0081, null, "Hello"); // edit 100x14
        Item(ms, w, CHILD_VIS | TAB | 0x00200000u | 0x0003u, 0, 40, 100, 14, 1004, true, 0x0085, null, ""); // combo 100x14
        Item(ms, w, CHILD_VIS | TAB | 0x0003u, 0, 60, 60, 10, 1005, true, 0x0080, null, "Check");      // auto checkbox 60x10
        Item(ms, w, CHILD_VIS | TAB | 0x0009u, 80, 60, 60, 10, 1006, true, 0x0080, null, "Radio");     // auto radio
        Item(ms, w, CHILD_VIS | TAB, 0, 80, 100, 20, 1007, false, 0, "msctls_trackbar32", "");          // trackbar 100x20
        byte[] data = ms.ToArray();
        IntPtr buf = Marshal.AllocHGlobal(data.Length);
        Marshal.Copy(data, 0, buf, data.Length);
        IntPtr dlg = N.CreateDialogIndirectParamW(N.GetModuleHandleW(null), buf, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        U.A("CreateDialogIndirectParam -> 0x" + dlg.ToInt64().ToString("X") + " err=" + Marshal.GetLastWin32Error());
        if (dlg != IntPtr.Zero) {
            int[] ids = { 1001, 1002, 1003, 1004, 1005, 1006, 1007 };
            string[] names = { "button-50x14dlu", "button-disabled", "edit-100x14dlu", "combobox-100x14dlu", "checkbox-60x10dlu", "radio-60x10dlu", "trackbar-100x20dlu" };
            for (int i = 0; i < ids.Length; i++) {
                IntPtr h = N.GetDlgItem(dlg, ids[i]);
                if (h == IntPtr.Zero) { U.A(names[i] + ": no hwnd"); continue; }
                N.RECT rc;
                N.GetWindowRect(h, out rc);
                IntPtr hf = N.SendMessageW(h, 0x31, IntPtr.Zero, IntPtr.Zero); // WM_GETFONT
                N.LOGFONT lf = new N.LOGFONT();
                if (hf != IntPtr.Zero) N.GetObjectW(hf, Marshal.SizeOf(typeof(N.LOGFONT)), ref lf);
                U.A(string.Format("{0,-22} px={1}x{2}  font='{3}' h={4} weight={5}", names[i], rc.R - rc.L, rc.B - rc.T, lf.lfFaceName, lf.lfHeight, lf.lfWeight));
            }
            N.DestroyWindow(dlg);
        }
        Marshal.FreeHGlobal(buf);
    }
}

static class Program {
    static int Main(string[] args) {
        string mode = args.Length > 0 ? args[0] : "facts";
        string outDir = args.Length > 1 ? args[1] : "C:\\probe\\win32\\out";
        string variant = args.Length > 2 ? args[2] : "light";
        Directory.CreateDirectory(outDir);
        R r = new R(outDir);
        r.Variant = variant;
        int rc = 0;
        try {
            r.InitDpi();
            if (mode == "capture") {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                CaptureTest.Run(r);
            } else if (mode == "dlgmetrics") {
                DlgMetrics.Run(r);
            } else {
                r.MakeHwnd();
                if (mode == "facts") Modes.Facts(r);
                else if (mode == "dump") Modes.Dump(r);
                else if (mode == "darkprobe") Modes.DarkProbe(r, variant);
                else if (mode == "matrix") {
                    if (variant == "dark") r.SetDarkMode();
                    Matrix.All(r);
                } else if (mode == "rawcapture") {
                    RawCapture.Run(r);
                } else if (mode == "statemap") {
                    StateMap.Run(r, args.Length > 3 ? args[3] : "Edit", args.Length > 4 ? int.Parse(args[4]) : 1, args.Length > 5 ? int.Parse(args[5]) : 200, args.Length > 6 ? int.Parse(args[6]) : 23);
                } else { U.A("unknown mode " + mode); rc = 2; }
            }
        } catch (Exception ex) {
            U.A("FATAL: " + ex.ToString());
            rc = 1;
        } finally {
            r.Cleanup();
            try { File.WriteAllText(Path.Combine(outDir, string.Format("log-{0}-{1}.txt", mode, variant)), U.Log.ToString(), new UTF8Encoding(false)); } catch { }
            try { File.WriteAllText(Path.Combine(outDir, "DONE.txt"), "done " + mode + " " + variant + " rc=" + rc, new UTF8Encoding(false)); } catch { }
        }
        return rc;
    }
}

// ===== raw Win32 controls (no WinForms) for true native pixels =====
static class RawCapture {
    delegate IntPtr WndProc(IntPtr h, uint msg, IntPtr w, IntPtr l);
    static WndProc proc = DefProc;
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern ushort RegisterClassExW(ref WNDCLASSEX wc);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern IntPtr CreateWindowExW(uint ex, string cls, string name, uint st, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, IntPtr param);
    [DllImport("user32.dll")] static extern IntPtr DefWindowProcW(IntPtr h, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] static extern bool UpdateWindow(IntPtr h);
    [DllImport("user32.dll")] static extern bool PeekMessageW(out MSG msg, IntPtr h, uint min, uint max, uint remove);
    [DllImport("user32.dll")] static extern bool TranslateMessage(ref MSG msg);
    [DllImport("user32.dll")] static extern IntPtr DispatchMessageW(ref MSG msg);
    [DllImport("user32.dll")] static extern bool DestroyWindow(IntPtr h);
    [DllImport("gdi32.dll")] static extern IntPtr CreateSolidBrush(int color);
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct WNDCLASSEX { public int cbSize; public uint style; public IntPtr lpfnWndProc; public int cbClsExtra; public int cbWndExtra; public IntPtr hInstance; public IntPtr hIcon; public IntPtr hCursor; public IntPtr hbrBackground; public string lpszMenuName; public string lpszClassName; public IntPtr hIconSm; }
    [StructLayout(LayoutKind.Sequential)] struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam; public IntPtr lParam; public uint time; public int ptX; public int ptY; }
    static IntPtr DefProc(IntPtr h, uint msg, IntPtr w, IntPtr l) { return DefWindowProcW(h, msg, w, l); }
    static void Pump(int ms) {
        System.Diagnostics.Stopwatch sw = System.Diagnostics.Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < ms) {
            MSG m;
            while (PeekMessageW(out m, IntPtr.Zero, 0, 0, 1)) { TranslateMessage(ref m); DispatchMessageW(ref m); }
            System.Threading.Thread.Sleep(10);
        }
    }
    public static void Run(R r) {
        U.A("== raw Win32 control capture ==");
        U.A("VisualStyleState: " + Application.VisualStyleState);
        IntPtr inst = N.GetModuleHandleW(null);
        WNDCLASSEX wc = new WNDCLASSEX();
        wc.cbSize = Marshal.SizeOf(typeof(WNDCLASSEX));
        wc.lpfnWndProc = Marshal.GetFunctionPointerForDelegate(proc);
        wc.hInstance = inst;
        wc.hbrBackground = CreateSolidBrush(0xFFFFFF);
        wc.lpszClassName = "ProbeHost32";
        ushort atom = RegisterClassExW(ref wc);
        U.A("RegisterClassEx: " + atom + " err=" + Marshal.GetLastWin32Error());
        IntPtr host = CreateWindowExW(0, "ProbeHost32", "probe", 0x80000000u | 0x10000000u /*WS_POPUP|WS_VISIBLE*/, 0, 0, 460, 320, IntPtr.Zero, IntPtr.Zero, inst, IntPtr.Zero);
        U.A("host hwnd: 0x" + host.ToInt64().ToString("X"));
        if (host == IntPtr.Zero) return;
        uint C = 0x40000000u | 0x10000000u; // WS_CHILD | WS_VISIBLE
        IntPtr btn = CreateWindowExW(0, "BUTTON", "OK", C, 20, 20, 90, 26, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr edit = CreateWindowExW(0, "EDIT", "Hello", C | 0x00800000u /*WS_BORDER*/, 20, 60, 200, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr editDis = CreateWindowExW(0, "EDIT", "Disabled", C | 0x00800000u | 0x08000000u /*WS_DISABLED*/, 20, 90, 200, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr editRo = CreateWindowExW(0, "EDIT", "Readonly", C | 0x00800000u | 0x00000800u /*ES_READONLY*/, 20, 120, 200, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr ml = CreateWindowExW(0, "EDIT", "Line one\r\nLine two", C | 0x00800000u | 0x00000004u /*ES_MULTILINE*/, 20, 150, 200, 60, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr chk = CreateWindowExW(0, "BUTTON", "Checkbox", C | 0x00000003u /*BS_AUTOCHECKBOX*/, 20, 220, 120, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr chkOn = CreateWindowExW(0, "BUTTON", "Checked", C | 0x00000003u, 150, 220, 120, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        N.SendMessageW(chkOn, 0x00F1, (IntPtr)1, IntPtr.Zero); // BM_SETCHECK BST_CHECKED
        IntPtr rb = CreateWindowExW(0, "BUTTON", "Radio", C | 0x00000009u /*BS_AUTORADIOBUTTON*/, 20, 250, 120, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr combo = CreateWindowExW(0, "COMBOBOX", "", C | 0x00000003u /*CBS_DROPDOWNLIST*/ | 0x00200000u /*WS_VSCROLL*/, 20, 280, 200, 200, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr trk = CreateWindowExW(0, "msctls_trackbar32", "", C | 0x00010000u /*WS_TABSTOP*/, 240, 20, 160, 30, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr btnDis = CreateWindowExW(0, "BUTTON", "Disabled", C | 0x08000000u /*WS_DISABLED*/, 240, 95, 90, 26, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr editCe = CreateWindowExW(0, "EDIT", "Hello", C | 0x00000200u /*WS_EX_CLIENTEDGE*/, 240, 130, 200, 24, host, IntPtr.Zero, inst, IntPtr.Zero);
        IntPtr combo2 = CreateWindowExW(0, "COMBOBOX", "", C | 0x00000003u | 0x00200000u, 240, 170, 200, 200, host, IntPtr.Zero, inst, IntPtr.Zero);
        AddStr(combo2, "Item 1"); AddStr(combo2, "Item 2"); AddStr(combo2, "Item 3"); AddStr(combo2, "Item 4");
        N.SendMessageW(combo2, 0x014E /*CB_SETCURSEL*/, (IntPtr)1, IntPtr.Zero);
        U.A("combo2 CB_GETITEMHEIGHT = " + N.SendMessageW(combo2, 0x0154, IntPtr.Zero, IntPtr.Zero).ToInt64());
        N.SendMessageW(combo2, 0x014F /*CB_SHOWDROPDOWN*/, (IntPtr)1, IntPtr.Zero);
        Pump(600);
        N.COMBOBOXINFO ci = new N.COMBOBOXINFO();
        ci.cbSize = Marshal.SizeOf(typeof(N.COMBOBOXINFO));
        bool ciok = N.GetComboBoxInfo(combo2, ref ci);
        U.A(string.Format("combo2 GetComboBoxInfo ok={0} hwndList=0x{1:X} rcItem={2}x{3}", ciok, ci.hwndList.ToInt64(), ci.rcItem.R - ci.rcItem.L, ci.rcItem.B - ci.rcItem.T));
        if (ci.hwndList != IntPtr.Zero) Shot(ci.hwndList, r.Sub("rawcapture"), "combobox-popup", 2);
        N.SendMessageW(combo2, 0x014F, IntPtr.Zero, IntPtr.Zero);
        ShowWindow(host, 4 /*SW_SHOWNOACTIVATE*/);
        UpdateWindow(host);
        Pump(900);
        U.A("controls created; now PrintWindow each");
        string dir = r.Sub("rawcapture");
        Shot(host, dir, "host-window", 2);
        Shot(host, dir, "host-window-basic", 0);
        IntPtr[] hs = { btn, edit, editDis, editRo, ml, chk, chkOn, rb, combo, trk, btnDis, editCe, combo2 };
        string[] names = { "button", "field", "field-disabled", "field-readonly", "textarea", "checkbox", "checkbox-checked", "radio", "combobox", "slider", "button-disabled", "field-clienteedge", "combobox-withitems" };
        for (int i = 0; i < hs.Length; i++) {
            Shot(hs[i], dir, names[i], 2);
            Shot(hs[i], dir, names[i] + "-basic", 0);
        }
        DestroyWindow(host);
    }
    static void AddStr(IntPtr combo, string s) {
        IntPtr p = Marshal.StringToHGlobalUni(s);
        N.SendMessageW(combo, 0x0143 /*CB_ADDSTRING*/, IntPtr.Zero, p);
        Marshal.FreeHGlobal(p);
    }
    static void Shot(IntPtr hwnd, string dir, string name, uint flags) {
        N.RECT wr;
        N.GetWindowRect(hwnd, out wr);
        int w = wr.R - wr.L, h = wr.B - wr.T;
        if (w <= 0 || h <= 0) { U.A("Shot " + name + ": bad rect"); return; }
        try {
            using (Bitmap b = new Bitmap(w, h)) {
                bool ok;
                using (Graphics g = Graphics.FromImage(b)) {
                    IntPtr hdc = g.GetHdc();
                    ok = N.PrintWindow(hwnd, hdc, flags);
                    g.ReleaseHdc(hdc);
                }
                U.A(string.Format("PrintWindow {0,-22} {1}x{2} flags={3} ok={4} {5}", name, w, h, flags, ok, CaptureTest.Stats(b)));
                U.Save(b, Path.Combine(dir, name + (flags == 2 ? "" : "-basic") + ".png"));
            }
        } catch (Exception ex) { U.A("PrintWindow " + name + " FAILED: " + ex.Message); }
    }
}

// ===== one part, 8 states, labelled, for mapping state ids =====
static class StateMap {
    public static void Run(R r, string cls, int part, int w, int h) {
        IntPtr th = r.Theme(cls);
        if (th == IntPtr.Zero) { U.A("statemap " + cls + ": NO THEME"); return; }
        int cellW = Math.Max(120, w + 20), cellH = h + 22;
        using (Bitmap b = r.NewBmp(cellW * 8, cellH, Color.FromArgb(0xF0, 0xF0, 0xF0))) {
            using (Graphics g = r.G(b)) {
                using (Font small = new Font("Consolas", 8, FontStyle.Regular, GraphicsUnit.Pixel))
                using (SolidBrush black = new SolidBrush(Color.Black)) {
                    for (int st = 1; st <= 8; st++) {
                        int cx = (st - 1) * cellW;
                        r.DrawThemePart(g, th, part, st, new Rectangle(cx + 10, 18, w, h));
                        g.DrawString("s" + st, small, black, cx + 2, 2);
                    }
                }
            }
            U.Save(b, Path.Combine(r.Sub("statemap"), string.Format("statemap-{0}-p{1}-{2}x{3}-{4}.png", cls, part, w, h, r.Mode())));
        }
        N.CloseThemeData(th);
    }
}
