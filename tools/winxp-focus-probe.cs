// winxp-focus-probe.cs — capture the XP classic focus rectangle (DrawFocusRect) on
// checkbox / radio controls, so the CSS focus ring can be compared against real pixels.
//
// Runs in session 2 on box-win, switches to the classic palette, creates real Win32
// buttons (BS_AUTOCHECKBOX / BS_AUTORADIOBUTTON), gives one the keyboard focus, and
// captures it with PrintWindow. Output: PNGs + log.txt under C:\probe\xp-focus\out.
//
// Build: csc.exe /nologo /r:System.Drawing.dll winxp-focus-probe.cs
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

static class P
{
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct WNDCLASS
    {
        public uint style; public IntPtr lpfnWndProc; public int cbClsExtra; public int cbWndExtra;
        public IntPtr hInstance; public IntPtr hIcon; public IntPtr hCursor; public IntPtr hbrBackground;
        public string lpszMenuName; public string lpszClassName;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int left, top, right, bottom; }

    [StructLayout(LayoutKind.Sequential)]
    public struct SIZE { public int cx, cy; }

    public delegate IntPtr WndProc(IntPtr h, uint m, IntPtr w, IntPtr l);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern ushort RegisterClassW(ref WNDCLASS wc);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateWindowExW(uint ex, string cls, string name, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, IntPtr param);
    [DllImport("user32.dll")] public static extern IntPtr DefWindowProcW(IntPtr h, uint m, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern bool DestroyWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr h, uint m, IntPtr w, IntPtr l);
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern int GetSysColor(int i);
    [DllImport("user32.dll")] public static extern bool SetSysColors(int n, int[] idx, int[] val);
    [DllImport("uxtheme.dll")] public static extern bool SetThemeAppProperties(uint props);
    [DllImport("user32.dll")] public static extern IntPtr SetFocus(IntPtr h);
    [DllImport("user32.dll")] public static extern IntPtr GetFocus();
    [DllImport("user32.dll")] public static extern IntPtr SetActiveWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern bool UpdateWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern IntPtr GetDC(IntPtr h);
    [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateFontW(int h, int w, int esc, int orient, int weight, uint italic, uint underline, uint strike, uint charset, uint outprec, uint clipprec, uint quality, uint pitch, string face);
    [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr dc, IntPtr obj);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr o);
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern bool GetTextExtentPoint32W(IntPtr dc, string s, int len, out SIZE sz);

    public const uint WS_POPUP = 0x80000000, WS_VISIBLE = 0x10000000, WS_CHILD = 0x40000000;
    public const uint BS_AUTORADIOBUTTON = 0x9, BS_AUTOCHECKBOX = 0x3;
    public const uint BM_SETCHECK = 0x00F1, BM_SETSTATE = 0x00F3, WM_SETFONT = 0x0030;
    public const int SW_SHOW = 5;

    public static int[] Idx = { 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 20, 21, 22 };
    public static int[] Saved;
    public static WndProc Proc;
    public static IntPtr Font;

    static void Main()
    {
        SetProcessDPIAware();
        string outDir = @"C:\probe\xp-focus\out";
        Directory.CreateDirectory(outDir);
        StreamWriter log = new StreamWriter(Path.Combine(outDir, "log.txt"), false, new UTF8Encoding(false));

        Saved = new int[Idx.Length];
        for (int i = 0; i < Idx.Length; i++) Saved[i] = GetSysColor(Idx[i]);
        int[] vals = { 0xC0C0C0, 0xFFFFFF, 0x000000, 0x000000, 0x000000, 0x800000, 0xFFFFFF, 0xC0C0C0, 0x808080, 0x808080, 0x000000, 0xFFFFFF, 0x000000, 0xDFDFDF };
        bool ok = SetSysColors(Idx.Length, Idx, vals);
        log.WriteLine("palette set=" + ok + " 3DFACE=#" + Hex(GetSysColor(15)) + " HIGHLIGHT=#" + Hex(GetSysColor(13)));
        SetThemeAppProperties(0);

        WNDCLASS wc = new WNDCLASS();
        Proc = delegate (IntPtr h, uint m, IntPtr w, IntPtr l) { return DefWindowProcW(h, m, w, l); };
        wc.lpfnWndProc = Marshal.GetFunctionPointerForDelegate(Proc);
        wc.lpszClassName = "XPFocusHost";
        wc.hbrBackground = (IntPtr)(15 + 1);
        RegisterClassW(ref wc);
        IntPtr host = CreateWindowExW(0, "XPFocusHost", "focus probe", WS_POPUP | WS_VISIBLE, 20, 20, 420, 300, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        ShowWindow(host, SW_SHOW);
        SetActiveWindow(host);
        SetForegroundWindow(host);
        UpdateWindow(host);
        Font = CreateFontW(-11, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma");

        Shot(log, host, outDir, "checkbox-focused-unchecked", BS_AUTOCHECKBOX, 0, false);
        Shot(log, host, outDir, "checkbox-focused-checked", BS_AUTOCHECKBOX, 1, false);
        Shot(log, host, outDir, "radio-focused-checked", BS_AUTORADIOBUTTON, 1, false);
        Shot(log, host, outDir, "checkbox-focused-checked-pressed", BS_AUTOCHECKBOX, 1, true);

        DeleteObject(Font);
        DestroyWindow(host);
        SetSysColors(Idx.Length, Idx, Saved);
        log.WriteLine("palette restored 3DFACE=#" + Hex(GetSysColor(15)));
        log.Close();
        File.WriteAllText(Path.Combine(outDir, "DONE.txt"), "done\n");
    }

    static string Hex(int c) { return string.Format("{0:X2}{1:X2}{2:X2}", c & 255, (c >> 8) & 255, (c >> 16) & 255); }

    static void Shot(StreamWriter log, IntPtr host, string dir, string name, uint cls, int check, bool pressed)
    {
        IntPtr h = CreateWindowExW(0, "Button", "Label", WS_CHILD | WS_VISIBLE | cls, 20, 20, 180, 16, host, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        SendMessageW(h, WM_SETFONT, Font, IntPtr.Zero);
        SendMessageW(h, BM_SETCHECK, (IntPtr)check, IntPtr.Zero);
        if (pressed) SendMessageW(h, BM_SETSTATE, (IntPtr)1, IntPtr.Zero);
        SetFocus(h);
        bool gotFocus = GetFocus() == h;

        RECT rc;
        GetWindowRect(h, out rc);
        IntPtr dc = GetDC(h);
        IntPtr old = SelectObject(dc, Font);
        SIZE sz;
        GetTextExtentPoint32W(dc, "Label", 5, out sz);
        SelectObject(dc, old);
        ReleaseDC(h, dc);

        using (Bitmap b = new Bitmap(180, 16))
        using (Graphics g = Graphics.FromImage(b))
        {
            g.Clear(Color.FromArgb(0xC0, 0xC0, 0xC0));
            IntPtr hdc = g.GetHdc();
            try { PrintWindow(h, hdc, 2); }
            finally { g.ReleaseHdc(hdc); }
            b.Save(Path.Combine(dir, name + ".png"), ImageFormat.Png);
            using (Bitmap big = new Bitmap(180 * 8, 16 * 8))
            using (Graphics gg = Graphics.FromImage(big))
            {
                gg.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.NearestNeighbor;
                gg.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.Half;
                gg.DrawImage(b, 0, 0, 180 * 8, 16 * 8);
                big.Save(Path.Combine(dir, name + "-8x.png"), ImageFormat.Png);
            }
        }
        log.WriteLine(name + " cls=" + cls + " check=" + check + " pressed=" + pressed
            + " focused=" + gotFocus + " win=" + (rc.right - rc.left) + "x" + (rc.bottom - rc.top)
            + " text=" + sz.cx + "x" + sz.cy);
        // dump non-background pixel bbox and unique colors for the focus-rect rows
        using (Bitmap b = new Bitmap(Path.Combine(dir, name + ".png")))
        {
            int x0 = 9999, y0 = 9999, x1 = -1, y1 = -1;
            string colors = "";
            for (int y = 0; y < b.Height; y++)
                for (int x = 0; x < b.Width; x++)
                {
                    Color c = b.GetPixel(x, y);
                    if (c.R == 0xC0 && c.G == 0xC0 && c.B == 0xC0) continue;
                    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
                    string k = Hex(c.ToArgb());
                    if (colors.IndexOf(k) < 0) colors = colors + k + " ";
                }
            log.WriteLine("  ink bbox=" + x0 + "," + y0 + ".." + x1 + "," + y1 + " colors=" + colors);
        }
        DestroyWindow(h);
    }
}
