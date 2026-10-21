// winxp-pressed-probe.cs — 抓 XP classic 勾选 / 单选的按下态（pressed）像素。
//
// 在 session 2 里把系统色切成 classic 调色板，创建关掉主题的真 Win32 控件
// （BS_AUTOCHECKBOX / BS_AUTORADIOBUTTON），用 BM_SETSTATE 制造按下态，
// PrintWindow 抓图，跑完还原系统色。产物在 C:\probe\xp-pressed\out\。
//
// 编译：csc.exe /nologo /r:System.Drawing.dll winxp-pressed-probe.cs
// 已知实测：按下时盒子 / 圆内部的白底变成对话框面灰 #C0C0C0，环、勾、点不变。
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
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateFontW(int h, int w, int esc, int orient, int weight, uint italic, uint underline, uint strike, uint charset, uint outprec, uint clipprec, uint quality, uint pitch, string face);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr o);

    public const uint WS_POPUP = 0x80000000, WS_VISIBLE = 0x10000000, WS_CHILD = 0x40000000;
    public const uint BS_AUTORADIOBUTTON = 0x9, BS_AUTOCHECKBOX = 0x3;
    public const uint BM_SETCHECK = 0x00F1, BM_SETSTATE = 0x00F3;
    public const uint WM_SETFONT = 0x0030, WM_PRINT = 0x0317;
    public const uint PRF_CLIENT = 0x4, PRF_ERASEBKGND = 0x8, PRF_CHILDREN = 0x10;

    public static int[] Idx = { 4, 5, 6, 7, 8, 13, 14, 15, 16, 17, 18, 20, 21, 22 };
    public static int[] Saved;
    public static WndProc Proc;

    static void Main()
    {
        SetProcessDPIAware();
        string outDir = @"C:\probe\xp-pressed\out";
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
        wc.lpszClassName = "XPProbeHost";
        wc.hbrBackground = (IntPtr)(15 + 1);
        RegisterClassW(ref wc);
        IntPtr host = CreateWindowExW(0, "XPProbeHost", "probe", WS_POPUP | WS_VISIBLE, 0, 0, 400, 300, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        IntPtr font = CreateFontW(-11, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma");

        // 4 个控件：radio unchecked / checked / checked+pressed；checkbox checked / checked+pressed / unchecked
        Shot(log, host, font, outDir, "radio-unchecked", BS_AUTORADIOBUTTON, 0, false);
        Shot(log, host, font, outDir, "radio-checked", BS_AUTORADIOBUTTON, 1, false);
        Shot(log, host, font, outDir, "radio-checked-pressed", BS_AUTORADIOBUTTON, 1, true);
        Shot(log, host, font, outDir, "checkbox-unchecked", BS_AUTOCHECKBOX, 0, false);
        Shot(log, host, font, outDir, "checkbox-checked", BS_AUTOCHECKBOX, 1, false);
        Shot(log, host, font, outDir, "checkbox-checked-pressed", BS_AUTOCHECKBOX, 1, true);

        DeleteObject(font);
        DestroyWindow(host);
        SetSysColors(Idx.Length, Idx, Saved);
        log.WriteLine("palette restored 3DFACE=#" + Hex(GetSysColor(15)) + " HIGHLIGHT=#" + Hex(GetSysColor(13)));
        log.Close();
    }

    static string Hex(int c) { return string.Format("{0:X2}{1:X2}{2:X2}", c & 255, (c >> 8) & 255, (c >> 16) & 255); }

    static void Shot(StreamWriter log, IntPtr host, IntPtr font, string dir, string name, uint cls, int check, bool pressed)
    {
        IntPtr h = CreateWindowExW(0, "Button", "Label", WS_CHILD | WS_VISIBLE | cls, 0, 0, 180, 16, host, IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
        SendMessageW(h, WM_SETFONT, font, IntPtr.Zero);
        SendMessageW(h, BM_SETCHECK, (IntPtr)check, IntPtr.Zero);
        if (pressed) SendMessageW(h, BM_SETSTATE, (IntPtr)1, IntPtr.Zero);
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
        log.WriteLine(name + " cls=" + cls + " check=" + check + " pressed=" + pressed);
        DestroyWindow(h);
    }
}
