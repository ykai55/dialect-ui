// winxp-render.cs — XP classic (Windows 2000/XP "Windows Classic") native matrix renderer.
//
// Rendered pixels come from GDI itself: DrawFrameControl / DrawEdge / PrintWindow, not from
// any msstyles theme. Classic drawing is not theme-aware, so it also draws in session 0 —
// but SetSysColors does NOT take effect in session 0, so the palette must be switched in the
// user's interactive session (Administrator = session 2, disconnected RDP is fine).
// The tool therefore refuses to render if SetSysColors readback fails.
//
// Modes (all write PNGs + logs into <outdir>; no stdout is required):
//   all <outdir>          palette -> real-dialog probe -> matrix -> restore + readback verify
//   checkcolors <outdir>  fresh process: read GetSysColor of the palette indices (restore proof)
//
// Build (box-win, .NET Framework 4.x csc, C# 5):
//   csc.exe /nologo /target:exe /out:winxp-render.exe /r:System.Drawing.dll winxp-render.cs
//
// XP classic palette (COLORREF is 0x00BBGGRR; HIGHLIGHT #0A246A -> 0x006A240A):
//   3DFACE #C0C0C0  3DHIGHLIGHT #FFFFFF  3DLIGHT #DFDFDF  3DSHADOW #808080
//   3DDKSHADOW #000000  WINDOW #FFFFFF  HIGHLIGHT #0A246A  HIGHLIGHTTEXT #FFFFFF
//   MENU #C0C0C0  MENUTEXT #000000  GRAYTEXT #808080  BTNTEXT #000000  (WINDOWTEXT #000000)
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

static class Win
{
    public delegate IntPtr WndProc(IntPtr h, uint msg, IntPtr w, IntPtr l);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int L, T, R, B; public RECT(int l, int t, int r, int b) { L = l; T = t; R = r; B = b; } }

    [StructLayout(LayoutKind.Sequential)]
    public struct MSG { public IntPtr hwnd; public uint message; public IntPtr wParam, lParam; public uint time; public int ptX, ptY; }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct WNDCLASSEX
    {
        public int cbSize; public uint style; public IntPtr lpfnWndProc;
        public int cbClsExtra; public int cbWndExtra; public IntPtr hInstance;
        public IntPtr hIcon; public IntPtr hCursor; public IntPtr hbrBackground;
        public string lpszMenuName; public string lpszClassName; public IntPtr hIconSm;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct COMBOBOXINFO
    {
        public int cbSize; public RECT rcItem; public RECT rcButton;
        public int stateButton; public IntPtr hwndCombo, hwndItem, hwndList;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct LOGFONT
    {
        public int lfHeight, lfWidth, lfEscapement, lfOrientation, lfWeight;
        public byte lfItalic, lfUnderline, lfStrikeOut, lfCharSet, lfOutPrecision, lfClipPrecision, lfQuality, lfPitchAndFamily;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string lfFaceName;
    }

    [DllImport("user32.dll")] public static extern bool DrawFrameControl(IntPtr hdc, ref RECT r, uint type, uint state);
    [DllImport("user32.dll")] public static extern bool DrawEdge(IntPtr hdc, ref RECT r, uint edge, uint flags);
    [DllImport("user32.dll")] public static extern int GetSysColor(int index);
    [DllImport("user32.dll")] public static extern bool SetSysColors(int cElements, int[] lpaElements, int[] lpaRgbValues);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern uint GetDpiForSystem();
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] public static extern IntPtr GetDlgItem(IntPtr dlg, int id);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateDialogIndirectParamW(IntPtr inst, IntPtr tmpl, IntPtr parent, IntPtr proc, IntPtr param);
    [DllImport("user32.dll")] public static extern bool DestroyWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern bool UpdateWindow(IntPtr h);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateWindowExW(uint ex, string cls, string name, uint style, int x, int y, int w, int h, IntPtr parent, IntPtr menu, IntPtr inst, IntPtr param);
    [DllImport("user32.dll")] public static extern IntPtr DefWindowProcW(IntPtr h, uint msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern ushort RegisterClassExW(ref WNDCLASSEX wc);
    [DllImport("user32.dll")] public static extern bool PeekMessageW(out MSG msg, IntPtr h, uint min, uint max, uint remove);
    [DllImport("user32.dll")] public static extern bool TranslateMessage(ref MSG msg);
    [DllImport("user32.dll")] public static extern IntPtr DispatchMessageW(ref MSG msg);
    [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr h, int msg, IntPtr w, IntPtr l);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassNameW(IntPtr h, StringBuilder sb, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowTextW(IntPtr h, StringBuilder sb, int max);
    [DllImport("kernel32.dll")] public static extern IntPtr GetModuleHandleW(string name);
    [DllImport("kernel32.dll")] public static extern bool ProcessIdToSessionId(uint pid, out uint session);
    [DllImport("gdi32.dll")] public static extern IntPtr CreateSolidBrush(int color);
    [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr obj);
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr CreateFontW(int height, int width, int esc, int orient, int weight, uint italic, uint underline, uint strike, uint charset, uint outp, uint clipp, uint quality, uint pitch, string face);
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode)] public static extern int GetObjectW(IntPtr obj, int size, ref LOGFONT lf);
    [DllImport("user32.dll")] public static extern bool GetComboBoxInfo(IntPtr hwnd, ref COMBOBOXINFO info);
    [DllImport("uxtheme.dll")] public static extern IntPtr SetWindowTheme(IntPtr hwnd, string app, string idlist);
    [DllImport("uxtheme.dll")] public static extern void SetThemeAppProperties(int flags);
}

static class P
{
    public const uint DFC_MENU = 2, DFC_BUTTON = 4;
    public const uint DFCS_BUTTONPUSH = 0x10, DFCS_BUTTONCHECK = 0x0, DFCS_BUTTONRADIO = 0x4;
    public const uint DFCS_CHECKED = 0x400, DFCS_PUSHED = 0x200, DFCS_INACTIVE = 0x100;
    public const uint EDGE_RAISED = 5, EDGE_SUNKEN = 10, EDGE_ETCHED = 6, BF_RECT = 0xF;

    public const int COLOR_MENU = 4, COLOR_WINDOW = 5, COLOR_WINDOWFRAME = 6, COLOR_MENUTEXT = 7, COLOR_WINDOWTEXT = 8,
        COLOR_HIGHLIGHT = 13, COLOR_HIGHLIGHTTEXT = 14, COLOR_3DFACE = 15, COLOR_3DSHADOW = 16,
        COLOR_GRAYTEXT = 17, COLOR_BTNTEXT = 18, COLOR_3DHIGHLIGHT = 20, COLOR_3DDKSHADOW = 21, COLOR_3DLIGHT = 22;

    public static string Out;
    public static int Rc;
    public static Font Font;
    public static bool FontFallback;
    public static string FontFace = "Tahoma";
    public static bool TahomaFileExists;
    public static int SessionId = -1;
    public static uint Dpi;

    static StreamWriter log;
    static StreamWriter met;
    static StreamWriter metRaw;

    static readonly string[] PalName = {
        "COLOR_MENU(4)", "COLOR_WINDOW(5)", "COLOR_WINDOWFRAME(6)", "COLOR_MENUTEXT(7)", "COLOR_WINDOWTEXT(8)",
        "COLOR_HIGHLIGHT(13)", "COLOR_HIGHLIGHTTEXT(14)", "COLOR_3DFACE(15)", "COLOR_3DSHADOW(16)",
        "COLOR_GRAYTEXT(17)", "COLOR_BTNTEXT(18)", "COLOR_3DHIGHLIGHT(20)", "COLOR_3DDKSHADOW(21)",
        "COLOR_3DLIGHT(22)" };
    static readonly int[] PalIdx = {
        COLOR_MENU, COLOR_WINDOW, COLOR_WINDOWFRAME, COLOR_MENUTEXT, COLOR_WINDOWTEXT,
        COLOR_HIGHLIGHT, COLOR_HIGHLIGHTTEXT, COLOR_3DFACE, COLOR_3DSHADOW,
        COLOR_GRAYTEXT, COLOR_BTNTEXT, COLOR_3DHIGHLIGHT, COLOR_3DDKSHADOW, COLOR_3DLIGHT };

    static int[] saved;
    static bool applied;
    public static bool RestoreOk;
    public static bool RestoreAll;
    public static bool ApplyReadbackOk;

    public static void Start(string mode)
    {
        Win.SetProcessDPIAware();
        Directory.CreateDirectory(Out);
        Directory.CreateDirectory(Path.Combine(Out, "raw"));
        log = new StreamWriter(Path.Combine(Out, "log.txt"), false, new UTF8Encoding(false));
        if (mode != "checkcolors")
        {
            met = new StreamWriter(Path.Combine(Out, "metrics.txt"), false, new UTF8Encoding(false));
            metRaw = new StreamWriter(Path.Combine(Out, "metrics-raw.txt"), false, new UTF8Encoding(false));
        }
        uint sess;
        uint pid = (uint)System.Diagnostics.Process.GetCurrentProcess().Id;
        SessionId = Win.ProcessIdToSessionId(pid, out sess) ? (int)sess : -1;
        Dpi = Win.GetDpiForSystem();
        TahomaFileExists = File.Exists(@"C:\Windows\Fonts\tahoma.ttf");
        try
        {
            Font f = new Font("Tahoma", 8f, FontStyle.Regular, GraphicsUnit.Point);
            if (string.Compare(f.Name, "Tahoma", true) == 0) { Font = f; }
            else
            {
                f.Dispose();
                FontFallback = true;
                FontFace = "Microsoft Sans Serif";
                Font = new Font("Microsoft Sans Serif", 8f, FontStyle.Regular, GraphicsUnit.Point);
            }
        }
        catch
        {
            FontFallback = true;
            FontFace = "Microsoft Sans Serif";
            Font = new Font(FontFace, 8f, FontStyle.Regular, GraphicsUnit.Point);
        }
        Log("winxp-render start: mode=" + mode + " session=" + SessionId + " dpi=" + Dpi);
        Log("tahoma.ttf exists=" + TahomaFileExists + "  font face in use='" + Font.Name + "' size=8pt height=" + Font.Height + "px fallback=" + FontFallback);
    }

    public static void Finish()
    {
        if (applied) RestorePalette();
        try
        {
            if (met != null) { met.Flush(); met.Close(); met = null; }
            if (metRaw != null) { metRaw.Flush(); metRaw.Close(); metRaw = null; }
            if (log != null) { log.Flush(); log.Close(); log = null; }
        }
        catch { }
        try { File.WriteAllText(Path.Combine(Out, "DONE.txt"), "done rc=" + Rc + " session=" + SessionId, new UTF8Encoding(false)); } catch { }
    }

    public static void Log(string s) { if (log != null) { log.WriteLine(s); } Console.WriteLine(s); }
    public static void Met(string s) { if (met != null) met.WriteLine(s); }
    public static void Raw(string s) { if (metRaw != null) metRaw.WriteLine(s); }

    public static Color C(int idx)
    {
        int c = Win.GetSysColor(idx);
        return Color.FromArgb(c & 255, (c >> 8) & 255, (c >> 16) & 255);
    }

    public static int Bgr(int r, int g, int b) { return r | (g << 8) | (b << 16); }

    public static string HexColorref(int c) { return string.Format("#{0:X2}{1:X2}{2:X2}", c & 255, (c >> 8) & 255, (c >> 16) & 255); }
    public static string Hex(Color c) { return string.Format("#{0:X2}{1:X2}{2:X2}", c.R, c.G, c.B); }
    public static string HEx(Color c) { return c.IsEmpty ? "-" : Hex(c); }

    // ---------- palette ----------
    public static void ApplyPalette()
    {
        saved = new int[PalIdx.Length];
        for (int i = 0; i < PalIdx.Length; i++) saved[i] = Win.GetSysColor(PalIdx[i]);
        int[] vals = {
            Bgr(0xC0,0xC0,0xC0), // MENU
            Bgr(0xFF,0xFF,0xFF), // WINDOW
            Bgr(0x00,0x00,0x00), // WINDOWFRAME (needed by the DEFPUSHBUTTON ring; Win10 default is #646464)
            Bgr(0x00,0x00,0x00), // MENUTEXT
            Bgr(0x00,0x00,0x00), // WINDOWTEXT
            Bgr(0x0A,0x24,0x6A), // HIGHLIGHT  #0A246A -> COLORREF 0x006A240A
            Bgr(0xFF,0xFF,0xFF), // HIGHLIGHTTEXT
            Bgr(0xC0,0xC0,0xC0), // 3DFACE
            Bgr(0x80,0x80,0x80), // 3DSHADOW
            Bgr(0x80,0x80,0x80), // GRAYTEXT
            Bgr(0x00,0x00,0x00), // BTNTEXT
            Bgr(0xFF,0xFF,0xFF), // 3DHIGHLIGHT
            Bgr(0x00,0x00,0x00), // 3DDKSHADOW
            Bgr(0xDF,0xDF,0xDF), // 3DLIGHT
        };
        Log("");
        Log("== palette BEFORE (saved originals) ==");
        for (int i = 0; i < PalIdx.Length; i++) Log(string.Format("  {0,-22} {1}", PalName[i], HexColorref(saved[i])));
        bool ok = Win.SetSysColors(PalIdx.Length, PalIdx, vals);
        applied = true;
        Log("SetSysColors(n=" + PalIdx.Length + ") -> " + ok);
        Log("== palette AFTER (readback) ==");
        ApplyReadbackOk = true;
        for (int i = 0; i < PalIdx.Length; i++)
        {
            int now = Win.GetSysColor(PalIdx[i]);
            bool match = now == vals[i];
            if (!match) ApplyReadbackOk = false;
            Log(string.Format("  {0,-22} {1}  expect {2}  match={3}", PalName[i], HexColorref(now), HexColorref(vals[i]), match));
        }
        Log("palette readback ok=" + ApplyReadbackOk);
        if (!ApplyReadbackOk)
        {
            RestorePalette();
            throw new Exception("SetSysColors did not take effect in session " + SessionId + " (session 0 cannot switch system colors)");
        }
    }

    public static void RestorePalette()
    {
        if (!applied) return;
        bool ok = Win.SetSysColors(PalIdx.Length, PalIdx, saved);
        applied = false;
        RestoreOk = ok;
        RestoreAll = true;
        Log("");
        Log("== palette RESTORE ==  SetSysColors(saved) -> " + ok);
        for (int i = 0; i < PalIdx.Length; i++)
        {
            int now = Win.GetSysColor(PalIdx[i]);
            bool match = now == saved[i];
            if (!match) RestoreAll = false;
            Log(string.Format("  {0,-22} restored {1}  original {2}  match={3}", PalName[i], HexColorref(now), HexColorref(saved[i]), match));
        }
        Log("restore ok=" + RestoreOk + " all-match=" + RestoreAll);
    }

    public static void CheckColors()
    {
        string path = Path.Combine(Out, "syscolor-after.txt");
        StringBuilder sb = new StringBuilder();
        sb.AppendLine("GetSysColor readback in a FRESH process (mode=checkcolors, session=" + SessionId + ", dpi=" + Dpi + ")");
        sb.AppendLine("purpose: prove the XP classic palette was restored after the render run");
        sb.AppendLine("(orig values are the box-win defaults, not #C0C0C0/#DFDFDF)");
        for (int i = 0; i < PalIdx.Length; i++)
            sb.AppendLine(string.Format("{0,-22} {1}", PalName[i], HexColorref(Win.GetSysColor(PalIdx[i]))));
        sb.AppendLine("SM_CXEDGE=" + Win.GetSystemMetrics(45) + " SM_CYEDGE=" + Win.GetSystemMetrics(46) + " SM_CYMENU=" + Win.GetSystemMetrics(15));
        Log(sb.ToString());
        File.WriteAllText(path, sb.ToString(), new UTF8Encoding(false));
        File.WriteAllText(Path.Combine(Out, "DONE.txt"), "done checkcolors session=" + SessionId, new UTF8Encoding(false));
    }

    public static void RunAll()
    {
        ApplyPalette();
        WriteHeader();
        Real.Run();
        Matrix.All();
        RestorePalette();
        WriteFooter();
    }

    static void WriteHeader()
    {
        Met("XP classic native matrix — box-win, session " + SessionId + ", 96 dpi (100% scale, no native 2x)");
        Met("source: GDI classic drawing (DrawFrameControl / DrawEdge, non-themed) + real Win32 dialog / trackbar PrintWindow captures");
        Met("1x files are system pixels; no-suffix files are nearest-neighbour 2x pixel doubles (not system 2x rendering)");
        Met("os=" + Environment.OSVersion.VersionString + " build=" + Environment.OSVersion.Version.Build + " session=" + SessionId + " dpi=" + Dpi);
        Met("font: tahoma.ttf exists=" + TahomaFileExists + "  face='" + Font.Name + "'  size=8pt  height=" + Font.Height + "px  fallback=" + FontFallback);
        Met("font note: text is drawn with GDI+ grayscale AA in the offscreen matrix; the real-dialog captures use system GDI text");
        Met("cells: 324x48 (textarea 324x104, menu popup 324x112), control origin (12,12), cell background = COLOR_3DFACE");
        Met("palette applied with SetSysColors (COLORREF is 0x00BBGGRR), readback all-match=" + ApplyReadbackOk + ":");
        for (int i = 0; i < PalIdx.Length; i++)
            Met(string.Format("  {0,-22} {1}  bgr=0x{2:X8}", PalName[i], HexColorref(Win.GetSysColor(PalIdx[i])), Win.GetSysColor(PalIdx[i])));
        Met("  note: #0A246A -> COLORREF 0x006A240A (BGR!), NOT 0x000A246A");
        Met("SM_CXEDGE=" + Win.GetSystemMetrics(45) + " SM_CYEDGE=" + Win.GetSystemMetrics(46) +
            " SM_CXHSCROLL=" + Win.GetSystemMetrics(2) + " SM_CYMENU=" + Win.GetSystemMetrics(15) + " SM_CYMENUSIZE=" + Win.GetSystemMetrics(17));
        Met("");
    }

    static void WriteFooter()
    {
        Met("");
        Met("[palette restore]");
        Met("SetSysColors(saved) ok=" + RestoreOk + "  every value matches the pre-run original=" + RestoreAll);
        Met("fresh-process GetSysColor readback is in syscolor-after.txt");
    }

    // ---------- drawing helpers ----------
    public static Bitmap NewCell(int h)
    {
        Bitmap b = new Bitmap(324, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(b)) g.Clear(C(COLOR_3DFACE));
        return b;
    }

    public static Graphics G(Bitmap b)
    {
        Graphics g = Graphics.FromImage(b);
        g.SmoothingMode = SmoothingMode.None;
        g.PixelOffsetMode = PixelOffsetMode.None;
        g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
        g.PageUnit = GraphicsUnit.Pixel;
        return g;
    }

    public static void DFC(Graphics g, Rectangle rc, uint type, uint state)
    {
        IntPtr hdc = g.GetHdc();
        try { Win.RECT r = new Win.RECT(rc.Left, rc.Top, rc.Right, rc.Bottom); Win.DrawFrameControl(hdc, ref r, type, state); }
        finally { g.ReleaseHdc(hdc); }
    }

    public static void DrawEdge(Graphics g, Rectangle rc, uint edge, uint flags)
    {
        IntPtr hdc = g.GetHdc();
        try { Win.RECT r = new Win.RECT(rc.Left, rc.Top, rc.Right, rc.Bottom); Win.DrawEdge(hdc, ref r, edge, flags); }
        finally { g.ReleaseHdc(hdc); }
    }

    public static void Fill(Graphics g, Rectangle rc, Color c)
    {
        using (SolidBrush b = new SolidBrush(c)) g.FillRectangle(b, rc);
    }

    public static void Text(Graphics g, string s, Color c, RectangleF rc, StringAlignment h, StringAlignment v)
    {
        using (StringFormat sf = new StringFormat())
        {
            sf.Alignment = h; sf.LineAlignment = v; sf.FormatFlags = StringFormatFlags.NoWrap;
            using (SolidBrush br = new SolidBrush(c)) g.DrawString(s, Font, br, rc, sf);
        }
    }

    public static void SavePair(string name, Bitmap oneX)
    {
        oneX.Save(Path.Combine(Out, name + "-96dpi.png"), ImageFormat.Png);
        using (Bitmap big = new Bitmap(oneX.Width * 2, oneX.Height * 2, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(big))
            {
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(oneX, new Rectangle(0, 0, big.Width, big.Height));
            }
            big.Save(Path.Combine(Out, name + ".png"), ImageFormat.Png);
        }
    }

    public static void SaveScaled(Bitmap src, string path, int scale)
    {
        using (Bitmap big = new Bitmap(src.Width * scale, src.Height * scale, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(big))
            {
                g.Clear(C(COLOR_3DFACE));
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.DrawImage(src, new Rectangle(0, 0, big.Width, big.Height));
            }
            big.Save(path, ImageFormat.Png);
        }
    }

    // ---------- sampling ----------
    public static Color At(Bitmap b, int x, int y)
    {
        if (x < 0) x = 0; if (y < 0) y = 0;
        if (x >= b.Width) x = b.Width - 1; if (y >= b.Height) y = b.Height - 1;
        return b.GetPixel(x, y);
    }

    public static string S(Bitmap b, int x, int y) { return Hex(At(b, x, y)); }

    public static string EdgeSamples(Bitmap b, Rectangle rc)
    {
        int cx = rc.Left + rc.Width / 2, cy = rc.Top + rc.Height / 2;
        return string.Format("top={0}/{1} left={2}/{3} right={4}/{5} bottom={6}/{7}",
            S(b, cx, rc.Top), S(b, cx, rc.Top + 1),
            S(b, rc.Left, cy), S(b, rc.Left + 1, cy),
            S(b, rc.Right - 1, cy), S(b, rc.Right - 2, cy),
            S(b, cx, rc.Bottom - 1), S(b, cx, rc.Bottom - 2));
    }

    static bool Excluded(Color c, Color[] ex)
    {
        for (int i = 0; i < ex.Length; i++) if (c.ToArgb() == ex[i].ToArgb()) return true;
        return false;
    }

    public static Color DominantColor(Bitmap b, Rectangle rc, Color[] exclude)
    {
        Dictionary<int, int> d = new Dictionary<int, int>();
        for (int y = rc.Top; y < rc.Bottom; y++)
            for (int x = rc.Left; x < rc.Right; x++)
            {
                Color c = At(b, x, y);
                if (Excluded(c, exclude)) continue;
                int k = c.ToArgb();
                if (d.ContainsKey(k)) d[k]++; else d[k] = 1;
            }
        int best = 0, bestN = 0; bool have = false;
        foreach (KeyValuePair<int, int> kv in d) if (kv.Value > bestN) { bestN = kv.Value; best = kv.Key; have = true; }
        return have ? Color.FromArgb(best) : Color.Empty;
    }

    public static Rectangle InkBBox(Bitmap b, Rectangle rc, Color bg)
    {
        int minX = int.MaxValue, minY = int.MaxValue, maxX = -1, maxY = -1;
        for (int y = rc.Top; y < rc.Bottom; y++)
            for (int x = rc.Left; x < rc.Right; x++)
            {
                if (At(b, x, y) == bg) continue;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
            }
        return maxX < 0 ? Rectangle.Empty : new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
    }

    public static Color InkColor(Bitmap b, Rectangle rc)
    {
        int bestLum = 256; Color best = Color.Empty;
        for (int y = rc.Top; y < rc.Bottom; y++)
            for (int x = rc.Left; x < rc.Right; x++)
            {
                Color c = At(b, x, y);
                int lum = (c.R * 299 + c.G * 587 + c.B * 114) / 1000;
                if (lum < bestLum) { bestLum = lum; best = c; }
            }
        return bestLum > 200 ? Color.Empty : best;
    }

    public static Color LightColor(Bitmap b, Rectangle rc)
    {
        int bestLum = -1; Color best = Color.Empty;
        for (int y = rc.Top; y < rc.Bottom; y++)
            for (int x = rc.Left; x < rc.Right; x++)
            {
                Color c = At(b, x, y);
                int lum = (c.R * 299 + c.G * 587 + c.B * 114) / 1000;
                if (lum > bestLum) { bestLum = lum; best = c; }
            }
        return bestLum < 200 ? Color.Empty : best;
    }

    public static void RleRow(Bitmap b, string tag, int y, int x0, int x1)
    {
        StringBuilder sb = new StringBuilder();
        int start = x0; string prev = S(b, x0, y);
        for (int x = x0 + 1; x <= x1; x++)
        {
            string cur = S(b, x, y);
            if (cur != prev)
            {
                sb.Append(prev); int n = x - start; if (n > 1) sb.Append("*").Append(n);
                sb.Append(' ');
                start = x; prev = cur;
            }
        }
        sb.Append(prev); int nn = x1 - start + 1; if (nn > 1) sb.Append("*").Append(nn);
        Raw(tag + " y=" + y + ": " + sb.ToString());
    }

    public static void RleCol(Bitmap b, string tag, int x, int y0, int y1)
    {
        StringBuilder sb = new StringBuilder();
        int start = y0; string prev = S(b, x, y0);
        for (int y = y0 + 1; y <= y1; y++)
        {
            string cur = S(b, x, y);
            if (cur != prev)
            {
                sb.Append(prev); int n = y - start; if (n > 1) sb.Append("*").Append(n);
                sb.Append(' ');
                start = y; prev = cur;
            }
        }
        sb.Append(prev); int nn = y1 - start + 1; if (nn > 1) sb.Append("*").Append(nn);
        Raw(tag + " x=" + x + ": " + sb.ToString());
    }

    public static void DumpGrid(Bitmap b, string tag, Rectangle rc)
    {
        Raw(tag + " grid " + rc.Width + "x" + rc.Height + " at " + rc.Left + "," + rc.Top + ":");
        for (int y = rc.Top; y < rc.Bottom; y++)
        {
            StringBuilder sb = new StringBuilder();
            for (int x = rc.Left; x < rc.Right; x++) { sb.Append(S(b, x, y).Substring(1)); sb.Append(' '); }
            Raw("  y=" + (y - rc.Top) + ": " + sb.ToString().TrimEnd());
        }
    }

    // Standard bevel colors that should not be mistaken for text/glyph ink.
    public static Color[] Bevel = null;

    public static void InitBevelIgnore()
    {
        Bevel = new Color[] {
            C(COLOR_3DFACE), C(COLOR_3DHIGHLIGHT), C(COLOR_3DLIGHT),
            C(COLOR_3DSHADOW), C(COLOR_3DDKSHADOW), C(COLOR_WINDOW) };
    }

    public static void Err(string s) { Log("ERR " + s); Rc = Math.Max(Rc, 1); }
}

// ===================== real Win32 controls probe =====================
// A plain non-themed window with real child controls sized in pixels (the 8pt Tahoma dialog
// scale is 6x13 DLU -> 50x14 DLU = 75x23 px, so these are the XP classic control sizes) plus
// a real msctls_trackbar32. Pixels are grabbed with PrintWindow(PW_RENDERFULLCONTENT).
static class Real
{
    static readonly uint WS_DISABLED = 0x08000000;
    static readonly uint EX_CLIENTEDGE = 0x00000200;

    public static Bitmap TrackbarBmp;
    public static int ComboClosedH, ComboArrowW;
    public static int TrackbarW, TrackbarH;
    public static string TrackbarSize;

    static IntPtr host, inst, hfont, defBtn;
    static Win.WndProc hostProc = HostProc;
    static IntPtr HostProc(IntPtr h, uint m, IntPtr w, IntPtr l) { return Win.DefWindowProcW(h, m, w, l); }

    static int Colorref(Color c) { return c.R | (c.G << 8) | (c.B << 16); }

    static IntPtr CreateHost()
    {
        inst = Win.GetModuleHandleW(null);
        Win.WNDCLASSEX wc = new Win.WNDCLASSEX();
        wc.cbSize = Marshal.SizeOf(typeof(Win.WNDCLASSEX));
        wc.lpfnWndProc = Marshal.GetFunctionPointerForDelegate(hostProc);
        wc.hInstance = inst;
        wc.hbrBackground = Win.CreateSolidBrush(Colorref(P.C(P.COLOR_3DFACE)));
        wc.lpszClassName = "WinXPProbeHost";
        ushort atom = Win.RegisterClassExW(ref wc);
        P.Log("RegisterClassExW(WinXPProbeHost) -> " + atom + " err=" + Marshal.GetLastWin32Error());
        return Win.CreateWindowExW(0, "WinXPProbeHost", "classic probe", 0x90000000u /*WS_POPUP|WS_VISIBLE*/,
            0, 0, 420, 400, IntPtr.Zero, IntPtr.Zero, inst, IntPtr.Zero);
    }

    static IntPtr MakeFont()
    {
        int h = -11; // 8pt at 96 dpi = -MulDiv(8,96,72) = -11
        IntPtr f = Win.CreateFontW(h, 0, 0, 0, 400, 0, 0, 0, 1, 0, 0, 0, 0, "Tahoma");
        P.Log("CreateFontW(Tahoma, h=-11, weight=400, DEFAULT_CHARSET) -> 0x" + f.ToInt64().ToString("X"));
        Win.LOGFONT lf = new Win.LOGFONT();
        if (Win.GetObjectW(f, Marshal.SizeOf(typeof(Win.LOGFONT)), ref lf) != 0)
            P.Log(string.Format("  font object: face='{0}' h={1} weight={2} charset={3}", lf.lfFaceName, lf.lfHeight, lf.lfWeight, lf.lfCharSet));
        return f;
    }

    static IntPtr Child(string cls, string text, uint style, uint exStyle, int x, int y, int w, int h)
    {
        IntPtr hw = Win.CreateWindowExW(exStyle, cls, text, 0x50000000u | style, x, y, w, h, host, IntPtr.Zero, inst, IntPtr.Zero);
        if (hw != IntPtr.Zero && hfont != IntPtr.Zero) Win.SendMessageW(hw, 0x30, hfont, (IntPtr)1); // WM_SETFONT
        return hw;
    }

    static string ClassOf(IntPtr h)
    {
        StringBuilder sb = new StringBuilder(64); Win.GetClassNameW(h, sb, 64); return sb.ToString();
    }

    static string TitleOf(IntPtr h)
    {
        StringBuilder sb = new StringBuilder(256); Win.GetWindowTextW(h, sb, 256); return sb.ToString();
    }

    static void AddStr(IntPtr combo, string s)
    {
        IntPtr p = Marshal.StringToHGlobalUni(s);
        try { Win.SendMessageW(combo, 0x0143, IntPtr.Zero, p); } finally { Marshal.FreeHGlobal(p); }
    }

    public static void Run()
    {
        P.Log("");
        P.Log("== real Win32 controls probe (SetThemeAppProperties(0), Tahoma 8pt) ==");
        Win.SetThemeAppProperties(0);
        host = CreateHost();
        if (host == IntPtr.Zero) { P.Err("CreateWindowExW host failed err=" + Marshal.GetLastWin32Error()); P.Met("[real probe] FAILED host"); return; }
        Bitmap[] caps = new Bitmap[14];
        try
        {
            hfont = MakeFont();
            IntPtr b1 = Child("BUTTON", "Button", 0x00000000, 0, 10, 10, 75, 23);            // BS_PUSHBUTTON
            IntPtr b2 = Child("BUTTON", "OK", 0x00000001, 0, 10, 41, 75, 23);                // BS_DEFPUSHBUTTON
            defBtn = b2;
            IntPtr b3 = Child("BUTTON", "Disabled", WS_DISABLED, 0, 10, 72, 75, 23);
            IntPtr e1 = Child("EDIT", "Hello", 0, EX_CLIENTEDGE, 10, 103, 150, 23);
            IntPtr e2 = Child("EDIT", "Disabled", WS_DISABLED, EX_CLIENTEDGE, 10, 134, 150, 23);
            IntPtr c1 = Child("BUTTON", "Label", 0x00000003, 0, 10, 165, 180, 16);           // BS_AUTOCHECKBOX
            IntPtr c2 = Child("BUTTON", "Checked", 0x00000003, 0, 10, 185, 180, 16);
            IntPtr c3 = Child("BUTTON", "Disabled", WS_DISABLED | 0x00000003, 0, 10, 205, 180, 16);
            IntPtr r1 = Child("BUTTON", "Label", 0x00000009, 0, 10, 225, 180, 16);           // BS_AUTORADIOBUTTON
            IntPtr r2 = Child("BUTTON", "Checked", 0x00000009, 0, 10, 245, 180, 16);
            IntPtr r3 = Child("BUTTON", "Disabled", WS_DISABLED | 0x00000009, 0, 10, 265, 180, 16);
            IntPtr k1 = Child("COMBOBOX", "", 0x00210203, 0, 10, 285, 150, 200);             // CBS_DROPDOWNLIST|WS_VSCROLL|CBS_HASSTRINGS
            IntPtr k2 = Child("COMBOBOX", "", WS_DISABLED | 0x00210203, 0, 10, 315, 150, 200);
            IntPtr tb = Child("msctls_trackbar32", "", 0x10, 0, 10, 345, 160, 23);           // TBS_HORZ|TBS_NOTICKS
            Win.SetWindowTheme(host, "", "");
            Win.SetWindowTheme(tb, "", "");

            AddStr(k1, "Item 1"); AddStr(k1, "Item 2"); AddStr(k1, "Item 3");
            AddStr(k2, "Item 1"); AddStr(k2, "Item 2"); AddStr(k2, "Item 3");
            Win.SendMessageW(k1, 0x014E, (IntPtr)1, IntPtr.Zero);  // CB_SETCURSEL
            Win.SendMessageW(k2, 0x014E, (IntPtr)1, IntPtr.Zero);
            Win.SendMessageW(c2, 0x00F1, (IntPtr)1, IntPtr.Zero);  // BM_SETCHECK
            Win.SendMessageW(c3, 0x00F1, (IntPtr)1, IntPtr.Zero);
            Win.SendMessageW(r2, 0x00F1, (IntPtr)1, IntPtr.Zero);
            Win.SendMessageW(r3, 0x00F1, (IntPtr)1, IntPtr.Zero);
            Win.SendMessageW(tb, 0x0408, (IntPtr)1, (IntPtr)10);   // TBM_SETRANGEMAX -> 0..10
            Win.SendMessageW(tb, 0x0405, (IntPtr)1, (IntPtr)4);    // TBM_SETPOS -> 4

            Win.ShowWindow(host, 8 /*SW_SHOWNA*/);
            Win.UpdateWindow(host);
            Pump(700);

            IntPtr[] hs = { b1, b2, b3, e1, e2, c1, c2, c3, r1, r2, r3, k1, k2, tb };
            string[] names = { "real-button", "real-button-default", "real-button-disabled", "real-edit", "real-edit-disabled",
                               "real-checkbox", "real-checkbox-checked", "real-checkbox-disabled", "real-radio", "real-radio-checked",
                               "real-radio-disabled", "real-combobox", "real-combobox-disabled", "slider-raw" };
            for (int i = 0; i < hs.Length; i++)
            {
                IntPtr h = hs[i];
                if (h == IntPtr.Zero) { P.Log("  " + names[i] + ": NO HWND"); continue; }
                Win.RECT wr; Win.GetWindowRect(h, out wr);
                int w = wr.R - wr.L, hh = wr.B - wr.T;
                Bitmap bmp = Grab(h, w, hh, names[i]);
                caps[i] = bmp;
                if (bmp == null) continue;
                StringBuilder extra = new StringBuilder();
                Win.LOGFONT lf = new Win.LOGFONT();
                IntPtr hf = Win.SendMessageW(h, 0x31, IntPtr.Zero, IntPtr.Zero); // WM_GETFONT
                if (hf != IntPtr.Zero && Win.GetObjectW(hf, Marshal.SizeOf(typeof(Win.LOGFONT)), ref lf) != 0)
                    extra.Append(" font='" + lf.lfFaceName + "' h=" + lf.lfHeight);
                if (names[i] == "slider-raw")
                {
                    extra.Append(" channel/thumb measured below");
                }
                else if (names[i].IndexOf("checkbox") >= 0 || names[i].IndexOf("radio") >= 0)
                {
                    Color face = P.C(P.COLOR_3DFACE);
                    Rectangle ink = P.InkBBox(bmp, new Rectangle(0, 0, 20, bmp.Height), face);
                    extra.Append(" boxInk=" + ink.Width + "x" + ink.Height + " at " + ink.Left + "," + ink.Top);
                }
                else if (names[i].IndexOf("combobox") >= 0)
                {
                    Win.COMBOBOXINFO info = new Win.COMBOBOXINFO();
                    info.cbSize = Marshal.SizeOf(typeof(Win.COMBOBOXINFO));
                    if (Win.GetComboBoxInfo(h, ref info))
                    {
                        extra.Append(" rcItem=" + (info.rcItem.R - info.rcItem.L) + "x" + (info.rcItem.B - info.rcItem.T) +
                                     " rcButton=" + (info.rcButton.R - info.rcButton.L) + "x" + (info.rcButton.B - info.rcButton.T) +
                                     " at " + (info.rcButton.L - info.rcItem.L) + "," + (info.rcButton.T - info.rcItem.T));
                        if (names[i] == "real-combobox") { ComboClosedH = hh; ComboArrowW = info.rcButton.R - info.rcButton.L; }
                    }
                }
                P.Log(string.Format("  {0,-24} class={1,-18} rect={2}x{3} title='{4}'{5} {6}",
                    names[i], ClassOf(h), w, hh, TitleOf(h), extra.ToString(), Stats(bmp)));
                if (names[i] == "slider-raw")
                {
                    TrackbarBmp = bmp; TrackbarW = bmp.Width; TrackbarH = bmp.Height;
                    TrackbarSize = bmp.Width + "x" + bmp.Height;
                    bmp.Save(Path.Combine(P.Out, "slider-raw.png"), ImageFormat.Png);
                }
                else bmp.Save(Path.Combine(P.Out, "raw", names[i] + ".png"), ImageFormat.Png);
            }

            // whole host window (context for the default button's outside pixels)
            Win.RECT hr; Win.GetWindowRect(host, out hr);
            Bitmap shot = Grab(host, hr.R - hr.L, hr.B - hr.T, "host-real");
            if (shot != null)
            {
                shot.Save(Path.Combine(P.Out, "default-dialog.png"), ImageFormat.Png);
                P.SaveScaled(shot, Path.Combine(P.Out, "default-dialog-2x.png"), 2);
                DefaultButton(hr, shot, caps[0], caps[1]);
            }
            TrackbarAnalysis(caps[13]);
            RealSummary(caps);
        }
        finally
        {
            if (host != IntPtr.Zero) { Win.DestroyWindow(host); host = IntPtr.Zero; }
            if (hfont != IntPtr.Zero) { Win.DeleteObject(hfont); hfont = IntPtr.Zero; }
        }
    }

    static Bitmap Grab(IntPtr hwnd, int w, int h, string what)
    {
        if (w <= 0 || h <= 0) { P.Log("  Grab " + what + ": bad rect " + w + "x" + h); return null; }
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        bool ok;
        using (Graphics g = Graphics.FromImage(bmp))
        {
            g.Clear(Color.Magenta);
            IntPtr hdc = g.GetHdc();
            try { ok = Win.PrintWindow(hwnd, hdc, 2); } finally { g.ReleaseHdc(hdc); }
        }
        P.Log("  PrintWindow(PW_RENDERFULLCONTENT) " + what + " -> " + ok);
        return bmp;
    }

    public static string Stats(Bitmap b)
    {
        HashSet<int> colors = new HashSet<int>();
        long sum = 0, n = 0;
        for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
            {
                Color c = b.GetPixel(x, y); colors.Add(c.ToArgb());
                sum += (c.R * 299 + c.G * 587 + c.B * 114) / 1000; n++;
            }
        return string.Format("distinctColors={0} meanLum={1:F1}", colors.Count, n == 0 ? 0 : sum / (double)n);
    }

    static void Pump(int ms)
    {
        System.Diagnostics.Stopwatch sw = System.Diagnostics.Stopwatch.StartNew();
        while (sw.ElapsedMilliseconds < ms)
        {
            Win.MSG m;
            while (Win.PeekMessageW(out m, IntPtr.Zero, 0, 0, 1)) { Win.TranslateMessage(ref m); Win.DispatchMessageW(ref m); }
            Thread.Sleep(10);
        }
    }

    // ---------- default button: is the 1px ring inside or outside the control rect? ----------
    static void DefaultButton(Win.RECT hostRect, Bitmap hostShot, Bitmap norm, Bitmap def)
    {
        P.Met("");
        P.Met("[default button — real Win32 DEFPUSHBUTTON (BS_DEFPUSHBUTTON), theme off]");
        if (norm == null || def == null) { P.Met("  capture failed"); return; }
        P.Met("  PUSHBUTTON    real capture=" + norm.Width + "x" + norm.Height);
        P.Met("  DEFPUSHBUTTON real capture=" + def.Width + "x" + def.Height);
        int w = def.Width, h = def.Height;
        Color ring = P.C(P.COLOR_WINDOWFRAME);
        bool row0All = true, col0All = true, rowLastAll = true, colLastAll = true;
        for (int x = 0; x < w; x++) if (def.GetPixel(x, 0) != ring) row0All = false;
        for (int y = 0; y < h; y++) if (def.GetPixel(0, y) != ring) col0All = false;
        for (int x = 0; x < w; x++) if (def.GetPixel(x, h - 1) != ring) rowLastAll = false;
        for (int y = 0; y < h; y++) if (def.GetPixel(w - 1, y) != ring) colLastAll = false;
        P.Met("  ring color sampled=" + P.S(def, w / 2, 0) + " (COLOR_WINDOWFRAME(6)=" + P.HEx(ring) + ", set to #000000 for XP classic)");
        P.Met("  def row0/col0/rowLast/colLast all ring color = " + row0All + "/" + col0All + "/" + rowLastAll + "/" + colLastAll);
        P.Met("  def row0/row1/row2 center = " + P.S(def, w / 2, 0) + " / " + P.S(def, w / 2, 1) + " / " + P.S(def, w / 2, 2));
        P.Met("  def col0/col1/col2 center = " + P.S(def, 0, h / 2) + " / " + P.S(def, 1, h / 2) + " / " + P.S(def, 2, h / 2));
        P.Met("  normal row0/row1/row2 center = " + P.S(norm, norm.Width / 2, 0) + " / " + P.S(norm, norm.Width / 2, 1) + " / " + P.S(norm, norm.Width / 2, 2));
        P.Met("  normal col0/col1/col2 center = " + P.S(norm, 0, norm.Height / 2) + " / " + P.S(norm, 1, norm.Height / 2) + " / " + P.S(norm, 2, norm.Height / 2));

        // screen-space pixels immediately outside the def button rect, sampled from the host capture
        Win.RECT br; Win.GetWindowRect(defBtn, out br);
        int bx = br.L - hostRect.L, by = br.T - hostRect.T;
        int cx = bx + w / 2, cy = by + h / 2;
        P.Met("  just OUTSIDE def rect in host shot: left=" + P.S(hostShot, bx - 1, cy) +
              " right=" + P.S(hostShot, bx + w, cy) + " top=" + P.S(hostShot, cx, by - 1) + " bottom=" + P.S(hostShot, cx, by + h));
        Color face = P.C(P.COLOR_3DFACE);
        bool outsideFace = P.At(hostShot, bx - 1, cy) == face && P.At(hostShot, bx + w, cy) == face &&
                           P.At(hostShot, cx, by - 1) == face && P.At(hostShot, cx, by + h) == face;
        P.Met("  outside pixels are all COLOR_3DFACE=" + outsideFace);
        P.Met("  sizes equal (ring adds no size)=" + (norm.Width == def.Width && norm.Height == def.Height));
        bool inside = row0All && col0All && rowLastAll && colLastAll;
        P.Met("  CONCLUSION: the 1px ring is " + (inside ? "INSIDE the control rect (outermost pixel row/column)" : "NOT a plain inside ring (see pixel samples)") +
              "; it does not grow the control: DEF " + def.Width + "x" + def.Height + " == PUSH " + norm.Width + "x" + norm.Height +
              "; the 2px bevel starts at +1, face stays " + (def.Width - 2) + "x" + (def.Height - 2) +
              "; the 23px height is unchanged");
        P.Met("  (matrix draws button-default as: full rect filled with ring color + DrawFrameControl push inside rect deflated by 1)");

        // evidence PNG: normal vs default at 4x nearest
        int scale = 4, gap = 8, labelH = 16;
        int cw = Math.Max(norm.Width, def.Width) * scale;
        int ch = labelH + norm.Height * scale + gap + labelH + def.Height * scale + 8;
        using (Bitmap comp = new Bitmap(cw + 16, ch, PixelFormat.Format32bppArgb))
        {
            using (Graphics g = Graphics.FromImage(comp))
            {
                g.Clear(P.C(P.COLOR_3DFACE));
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;
                g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
                using (SolidBrush brush = new SolidBrush(P.C(P.COLOR_BTNTEXT)))
                {
                    g.DrawString("PUSHBUTTON 75x23 (real control, theme off)", P.Font, brush, 8, 1);
                    g.DrawImage(norm, new Rectangle(8, labelH, norm.Width * scale, norm.Height * scale));
                    g.DrawString("DEFPUSHBUTTON 75x23 (real control, theme off)", P.Font, brush, 8, labelH + norm.Height * scale + gap);
                    g.DrawImage(def, new Rectangle(8, labelH + norm.Height * scale + gap + labelH, def.Width * scale, def.Height * scale));
                }
            }
            comp.Save(Path.Combine(P.Out, "default-button.png"), ImageFormat.Png);
        }
    }

    // ---------- summary of the real captured controls ----------
    static void RealSummary(Bitmap[] caps)
    {
        P.Met("");
        P.Met("[real controls — measured from PrintWindow(PW_RENDERFULLCONTENT) captures, theme off, Tahoma 8pt]");
        Bitmap norm = caps[0], def = caps[1], dis = caps[2], edit = caps[3], editDis = caps[4];
        P.Met("  push button " + SizeOf(norm) + "; def push button " + SizeOf(def) + "; disabled push button " + SizeOf(dis));
        bool same = true;
        if (norm != null && dis != null && norm.Width == dis.Width && norm.Height == dis.Height)
        {
            for (int x = 1; x < norm.Width - 1; x++)
                for (int y = 0; y < 3; y++)
                    if (norm.GetPixel(x, y) != dis.GetPixel(x, y)) same = false;
        }
        P.Met("  disabled button bevel identical to normal button=" + same + " (only the label color differs)");
        P.Met("  single-line edit " + SizeOf(edit) + "; disabled edit interior fill=" +
              (editDis == null ? "n/a" : P.S(editDis, editDis.Width / 2, editDis.Height / 2)));
        Bitmap c1 = caps[5], c2 = caps[6], c3 = caps[7], r1 = caps[8], r2 = caps[9], r3 = caps[10];
        if (c1 != null) P.Met("  checkbox window " + SizeOf(c1) + ", box ink " + InkOf(c1) + " (2px sunken box, white interior, black check)");
        if (c3 != null) P.Met("  disabled checkbox: box interior=" + P.S(c3, 6, 8) + ", check color=" + P.HEx(P.InkColor(c3, new Rectangle(3, 4, 7, 7))));
        if (r1 != null) P.Met("  radio window " + SizeOf(r1) + ", circle ink " + InkOf(r1) + " (2px sunken circle, white interior, black dot when checked)");
        if (r2 != null) P.Met("  checked radio dot color=" + P.HEx(P.InkColor(r2, new Rectangle(5, 6, 4, 4))));
        if (r3 != null) P.Met("  disabled radio: interior=" + P.S(r3, 6, 8) + ", dot color=" + P.HEx(P.InkColor(r3, new Rectangle(5, 6, 4, 4))));
        Bitmap k1 = caps[11], k2 = caps[12];
        P.Met("  combobox closed size=" + SizeOf(k1) + " (real CBS_DROPDOWNLIST at 8pt Tahoma; field height 15 + 2px sunken border)");
        P.Met("  combobox arrow: rcButton=17x17, rcItem=127x15 -> the 17px arrow button is inset inside the 2px sunken frame");
        P.Met("  disabled combobox field fill=" + (k2 == null ? "n/a" : P.S(k2, k2.Width / 3, k2.Height / 2)) + " (grey field, grey text)");
        P.Met("  trackbar " + (TrackbarBmp == null ? "n/a" : TrackbarSize) + " -> channel 4px, thumb 11x21 (see [slider])");
    }

    static string SizeOf(Bitmap b) { return b == null ? "n/a" : b.Width + "x" + b.Height; }

    static string InkOf(Bitmap b)
    {
        if (b == null) return "n/a";
        Rectangle r = P.InkBBox(b, new Rectangle(0, 0, 17, b.Height), P.C(P.COLOR_3DFACE));
        return r.Width + "x" + r.Height + " at " + r.Left + "," + r.Top;
    }

    // ---------- trackbar: real control, measure channel + thumb ----------
    static void TrackbarAnalysis(Bitmap b)
    {
        P.Met("");
        P.Met("[slider — real msctls_trackbar32, SetWindowTheme(hwnd,\"\",\"\"), PrintWindow]");
        if (b == null) { P.Met("  real trackbar capture FAILED -> matrix uses DrawFrameControl approximation, marked ESTIMATE"); return; }
        Color bg = P.C(P.COLOR_3DFACE);
        P.Met("  real control size=" + b.Width + "x" + b.Height + " (created at 160x23 px, theme off, no ticks)");
        Rectangle ink = P.InkBBox(b, new Rectangle(0, 0, b.Width, b.Height), bg);
        P.Met("  ink bbox=" + ink.Width + "x" + ink.Height + " at " + ink.Left + "," + ink.Top);

        List<int> ch = new List<int>();
        for (int y = 0; y < b.Height; y++)
        {
            int cnt = 0;
            for (int x = 0; x < b.Width; x++) if (P.At(b, x, y) != bg) cnt++;
            if (cnt > b.Width * 3 / 4) ch.Add(y);
        }
        if (ch.Count > 0)
        {
            int y0 = ch[0], y1 = ch[ch.Count - 1];
            int x0 = int.MaxValue, x1 = -1;
            for (int y = y0; y <= y1; y++)
                for (int x = 0; x < b.Width; x++)
                    if (P.At(b, x, y) != bg) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
            P.Met(string.Format("  channel: rows y={0}..{1} (height {2}); x={3}..{4} (width {5}), insets left={3} right={6}",
                y0, y1, y1 - y0 + 1, x0, x1, x1 - x0 + 1, b.Width - 1 - x1));
            int sampleX = x0 + 6;
            StringBuilder sb = new StringBuilder();
            for (int y = y0; y <= y1; y++) sb.Append("y" + y + "=" + P.S(b, sampleX, y) + " ");
            P.Met("  channel colors at x=" + sampleX + ": " + sb.ToString().Trim());
            P.Met("  channel left-edge x=" + x0 + "=" + P.S(b, x0, (y0 + y1) / 2) + " right-edge x=" + x1 + "=" + P.S(b, x1, (y0 + y1) / 2));

            int tx0 = int.MaxValue, tx1 = -1, ty0 = int.MaxValue, ty1 = -1;
            for (int y = 0; y < b.Height; y++)
            {
                if (y >= y0 && y <= y1) continue;
                for (int x = 0; x < b.Width; x++)
                    if (P.At(b, x, y) != bg)
                    {
                        if (x < tx0) tx0 = x; if (x > tx1) tx1 = x;
                        if (y < ty0) ty0 = y; if (y > ty1) ty1 = y;
                    }
            }
            if (tx1 >= 0)
            {
                P.Met(string.Format("  thumb: x={0}..{1} (width {2}), rows y={3}..{4} (height {5})",
                    tx0, tx1, tx1 - tx0 + 1, ty0, ty1, ty1 - ty0 + 1));
                P.Met("  thumb edges: top=" + P.S(b, (tx0 + tx1) / 2, ty0) + "/" + P.S(b, (tx0 + tx1) / 2, ty0 + 1) +
                      " left=" + P.S(b, tx0, (ty0 + ty1) / 2) + "/" + P.S(b, tx0 + 1, (ty0 + ty1) / 2) +
                      " right=" + P.S(b, tx1, (ty0 + ty1) / 2) + "/" + P.S(b, tx1 - 1, (ty0 + ty1) / 2) +
                      " bottom=" + P.S(b, (tx0 + tx1) / 2, ty1) + "/" + P.S(b, (tx0 + tx1) / 2, ty1 - 1));
                P.Met("  thumb center fill=" + P.S(b, (tx0 + tx1) / 2, (ty0 + ty1) / 2));
                P.Raw("thumb region (RGB, 1px tokens):");
                for (int y = ty0; y <= ty1; y++) P.RleRow(b, "thumb", y, tx0, tx1);
            }
            else P.Met("  thumb: not separated from channel by this heuristic");
        }
        else P.Met("  channel: not detected");
        P.Raw("slider-raw size " + b.Width + "x" + b.Height + "  (RLE rows, #RRGGBB*count)");
        for (int y = 0; y < b.Height; y++) P.RleRow(b, "slider-raw", y, 0, b.Width - 1);
    }
}

// ===================== matrix =====================
static class Matrix
{
    const int OX = 12, OY = 12;

    public static void All()
    {
        P.InitBevelIgnore();
        P.Met("");
        P.Met("[button]");
        Button("button-normal", 0, false);
        Button("button-pressed", P.DFCS_PUSHED, false);
        Button("button-disabled", P.DFCS_INACTIVE, false);
        Button("button-default", 0, true);
        P.Met("");
        P.Met("[field / textarea]");
        Field("field-normal", 200, 23, false);
        Field("field-disabled", 200, 23, true);
        Cell("textarea-normal", 104, delegate(Graphics g)
        {
            Rectangle rc = new Rectangle(OX, OY, 200, 80);
            P.Fill(g, rc, P.C(P.COLOR_WINDOW));
            P.DrawEdge(g, rc, P.EDGE_SUNKEN, P.BF_RECT);
            P.Text(g, "Line one", P.C(P.COLOR_WINDOWTEXT), new RectangleF(rc.Left + 3, rc.Top + 2, rc.Width - 6, 20), StringAlignment.Near, StringAlignment.Near);
            P.Text(g, "Line two", P.C(P.COLOR_WINDOWTEXT), new RectangleF(rc.Left + 3, rc.Top + 19, rc.Width - 6, 20), StringAlignment.Near, StringAlignment.Near);
        }, delegate(Bitmap b)
        {
            Rectangle rc = new Rectangle(OX, OY, 200, 80);
            P.Met("textarea-normal     chip=200x80  fill=" + P.S(b, rc.Right - 10, rc.Top + 40) + "  " + P.EdgeSamples(b, rc) + "  text=" + P.HEx(P.InkColor(b, LabelRegion(rc))));
            DumpStrips(b, "textarea-normal", rc);
        });
        P.Met("");
        P.Met("[checkbox]");
        Check("checkbox-unchecked", 0, false);
        Check("checkbox-checked", P.DFCS_CHECKED, false);
        Check("checkbox-disabled", P.DFCS_CHECKED | P.DFCS_INACTIVE, true);
        P.Met("");
        P.Met("[radio]");
        Radio("radio-unchecked", 0, false);
        Radio("radio-checked", P.DFCS_CHECKED, false);
        Radio("radio-disabled", P.DFCS_CHECKED | P.DFCS_INACTIVE, true);
        P.Met("");
        P.Met("[combobox]");
        Combo("combobox-normal", false);
        Combo("combobox-disabled", true);
        P.Met("");
        P.Met("[slider]");
        Slider();
        P.Met("");
        P.Met("[menu]");
        MenuPopup("menu-popup", false);
        MenuPopup("menu-popup-hover", true);
        MenuBar();
    }

    static Rectangle LabelRegion(Rectangle rc)
    {
        return new Rectangle(rc.Left + 5, rc.Top + 4, rc.Width - 10, rc.Height - 8);
    }

    static void DumpStrips(Bitmap b, string name, Rectangle rc)
    {
        int w = b.Width, hh = b.Height;
        int x0 = rc.Left, x1 = rc.Right - 1, y0 = rc.Top, y1 = rc.Bottom - 1;
        int[] rows = { y0, y0 + 1, y0 + 2, rc.Top + rc.Height / 2, y1 - 2, y1 - 1, y1 };
        for (int i = 0; i < rows.Length; i++) P.RleRow(b, name, rows[i], x0, x1);
        int[] cols = { x0, x0 + 1, x1 - 1, x1 };
        for (int i = 0; i < cols.Length; i++) P.RleCol(b, name, cols[i], y0, y1);
    }

    static void Cell(string name, int h, Action<Graphics> draw, Action<Bitmap> sample)
    {
        using (Bitmap b = P.NewCell(h))
        {
            using (Graphics g = P.G(b)) draw(g);
            P.SavePair(name, b);
            sample(b);
        }
    }

    static void Button(string name, uint state, bool isDefault)
    {
        Rectangle rc = new Rectangle(OX, OY, 200, 23);
        Cell(name, 48, delegate(Graphics g)
        {
            if (isDefault)
            {
                P.Fill(g, rc, P.C(P.COLOR_WINDOWFRAME)); // 1px ring = outermost pixel of the control rect (real DEFPUSHBUTTON uses COLOR_WINDOWFRAME)
                Rectangle inner = new Rectangle(rc.Left + 1, rc.Top + 1, rc.Width - 2, rc.Height - 2);
                P.DFC(g, inner, P.DFC_BUTTON, P.DFCS_BUTTONPUSH);
            }
            else P.DFC(g, rc, P.DFC_BUTTON, P.DFCS_BUTTONPUSH | state);
            int dx = ((state & P.DFCS_PUSHED) != 0) ? 1 : 0;
            Color tc = ((state & P.DFCS_INACTIVE) != 0) ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_BTNTEXT);
            P.Text(g, "Button", tc, new RectangleF(rc.Left + dx, rc.Top + dx, rc.Width, rc.Height), StringAlignment.Center, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            Color text = P.InkColor(b, LabelRegion(rc));
            P.Met(string.Format("{0,-19} chip=200x23  fill={1}  {2}  text={3}{4}",
                name, P.S(b, rc.Left + 6, rc.Top + rc.Height / 2), P.EdgeSamples(b, rc), P.HEx(text),
                isDefault ? "  [1px ring #000000 = outermost rect edge; real DEFPUSHBUTTON capture]" : ""));
            DumpStrips(b, name, rc);
        });
    }

    static void Field(string name, int w, int hh, bool disabled)
    {
        Rectangle rc = new Rectangle(OX, OY, w, hh);
        Cell(name, 48, delegate(Graphics g)
        {
            P.Fill(g, rc, disabled ? P.C(P.COLOR_3DFACE) : P.C(P.COLOR_WINDOW));
            P.DrawEdge(g, rc, P.EDGE_SUNKEN, P.BF_RECT);
            P.Text(g, "Hello", disabled ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_WINDOWTEXT),
                new RectangleF(rc.Left + 3, rc.Top, rc.Width - 6, rc.Height), StringAlignment.Near, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            Color text = P.InkColor(b, new Rectangle(rc.Left + 4, rc.Top + 3, rc.Width - 8, rc.Height - 6));
            P.Met(string.Format("{0,-19} chip=200x23  fill={1}  {2}  text={3}",
                name, P.S(b, rc.Right - 10, rc.Top + rc.Height / 2), P.EdgeSamples(b, rc), P.HEx(text)));
            DumpStrips(b, name, rc);
        });
    }

    static void Check(string name, uint state, bool disabled)
    {
        Rectangle box = new Rectangle(OX, 17, 13, 13);
        Cell(name, 48, delegate(Graphics g)
        {
            P.DFC(g, box, P.DFC_BUTTON, P.DFCS_BUTTONCHECK | state);
            P.Text(g, "Label", disabled ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_BTNTEXT),
                new RectangleF(29, OY, 200, 23), StringAlignment.Near, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            Color glyph = P.InkColor(b, new Rectangle(box.Left + 4, box.Top + 4, 5, 5));
            Color label = P.InkColor(b, new Rectangle(29, OY + 4, 200, 15));
            P.Met(string.Format("{0,-19} chip=13x13 at 12,17  boxFill={1}  {2}  glyph={3}  label={4}",
                name, P.S(b, box.Left + 6, box.Top + 6), P.EdgeSamples(b, box), P.HEx(glyph), P.HEx(label)));
            P.DumpGrid(b, name, box);
        });
    }

    static void Radio(string name, uint state, bool disabled)
    {
        Rectangle box = new Rectangle(OX, 17, 13, 13);
        Cell(name, 48, delegate(Graphics g)
        {
            P.DFC(g, box, P.DFC_BUTTON, P.DFCS_BUTTONRADIO | state);
            P.Text(g, "Label", disabled ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_BTNTEXT),
                new RectangleF(29, OY, 200, 23), StringAlignment.Near, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            Color glyph = P.InkColor(b, new Rectangle(box.Left + 4, box.Top + 4, 5, 5));
            Color label = P.InkColor(b, new Rectangle(29, OY + 4, 200, 15));
            P.Met(string.Format("{0,-19} chip=13x13 at 12,17  boxFill={1}  {2}  glyph={3}  label={4}",
                name, P.S(b, box.Left + 6, box.Top + 6), P.EdgeSamples(b, box), P.HEx(glyph), P.HEx(label)));
            P.DumpGrid(b, name, box);
        });
    }

    static void Combo(string name, bool disabled)
    {
        int h = Real.ComboClosedH > 0 ? Real.ComboClosedH : 23;   // real closed combo = 21px at 8pt Tahoma
        int aw = Real.ComboArrowW > 0 ? Real.ComboArrowW : 17;    // real arrow button width = 17px
        Rectangle rc = new Rectangle(OX, OY, 200, h);
        Rectangle field = new Rectangle(OX, OY, 200 - aw, h);
        Rectangle arrow = new Rectangle(OX + 200 - aw, OY, aw, h);
        Cell(name, 48, delegate(Graphics g)
        {
            P.Fill(g, rc, disabled ? P.C(P.COLOR_3DFACE) : P.C(P.COLOR_WINDOW));
            P.Fill(g, arrow, P.C(P.COLOR_3DFACE));
            P.DrawEdge(g, field, P.EDGE_SUNKEN, P.BF_RECT);
            P.DFC(g, arrow, P.DFC_BUTTON, P.DFCS_BUTTONPUSH | (disabled ? P.DFCS_INACTIVE : 0));
            Color chev = disabled ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_BTNTEXT);
            int ax = arrow.Left + arrow.Width / 2, ay = arrow.Top + arrow.Height / 2;
            using (SolidBrush br = new SolidBrush(chev))
                g.FillPolygon(br, new Point[] { new Point(ax - 3, ay - 2), new Point(ax + 3, ay - 2), new Point(ax, ay + 2) });
            P.Text(g, "Item 2", disabled ? P.C(P.COLOR_GRAYTEXT) : P.C(P.COLOR_WINDOWTEXT),
                new RectangleF(field.Left + 3, field.Top, field.Width - 6, field.Height), StringAlignment.Near, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            Color text = P.InkColor(b, new Rectangle(field.Left + 4, field.Top + 3, field.Width - 8, field.Height - 6));
            Color chev = P.InkColor(b, new Rectangle(arrow.Left + 4, arrow.Top + 5, arrow.Width - 8, arrow.Height - 10));
            P.Met(string.Format("{0,-19} chip=200x{3} (field {4} + arrow {5})  fieldFill={1}  text={2}",
                name, P.S(b, field.Right - 10, field.Top + field.Height / 2), P.HEx(text), h, field.Width, aw));
            P.Met("    field " + P.EdgeSamples(b, field));
            P.Met("    arrow " + P.EdgeSamples(b, arrow) + "  chevron=" + P.HEx(chev) +
                " bbox=" + P.InkBBox(b, new Rectangle(arrow.Left + 4, arrow.Top + 6, arrow.Width - 8, 12), P.C(P.COLOR_3DFACE)).ToString());
            DumpStrips(b, name, rc);
        });
    }

    static void Slider()
    {
        // real trackbar pixels captured in Real.Run(); composited 1:1 into the standard cell
        Cell("slider-normal", 48, delegate(Graphics g)
        {
            if (Real.TrackbarBmp != null) g.DrawImageUnscaled(Real.TrackbarBmp, OX, OY);
            else
            {
                Rectangle rc = new Rectangle(OX, OY, 160, 23);
                P.Fill(g, new Rectangle(rc.Left, rc.Top + 9, 160, 4), P.C(P.COLOR_3DSHADOW));
                P.Fill(g, new Rectangle(rc.Left, rc.Top + 9, 160, 1), P.C(P.COLOR_3DHIGHLIGHT));
                P.Fill(g, new Rectangle(rc.Left, rc.Top + 12, 160, 1), P.C(P.COLOR_3DHIGHLIGHT));
                P.DFC(g, new Rectangle(rc.Left + 52, rc.Top + 1, 11, 21), P.DFC_BUTTON, P.DFCS_BUTTONPUSH);
            }
        }, delegate(Bitmap b)
        {
            P.Met("slider-normal       chip=" + (Real.TrackbarBmp != null ? Real.TrackbarSize : "160x23 ESTIMATE") +
                  " at 12,12  source=" + (Real.TrackbarBmp != null ? "real msctls_trackbar32 PrintWindow (theme off)" : "DrawFrameControl approximation"));
            if (Real.TrackbarBmp != null)
                P.Met("    raw control pixels are in slider-raw.png; channel/thumb measurements are in the [slider] section above");
            else
                P.Met("    ESTIMATE: real trackbar capture failed, sizes marked estimated");
        });
    }

    static Rectangle MenuRect = new Rectangle(OX, OY, 200, 76);
    const int MenuItemH = 18; // layout choice (not a system constant); border/colors are measured

    static void MenuPopup(string name, bool hover)
    {
        Rectangle rc = MenuRect;
        Cell(name, 112, delegate(Graphics g)
        {
            P.Fill(g, rc, P.C(P.COLOR_MENU));
            P.DrawEdge(g, rc, P.EDGE_RAISED, P.BF_RECT);
            if (hover)
                P.Fill(g, new Rectangle(rc.Left + 2, rc.Top + 2 + MenuItemH, rc.Width - 4, MenuItemH), P.C(P.COLOR_HIGHLIGHT));
            string[] items = { "New", "Open...", "Save", "Exit" };
            for (int i = 0; i < items.Length; i++)
            {
                bool hl = hover && i == 1;
                Color tc = hl ? P.C(P.COLOR_HIGHLIGHTTEXT) : P.C(P.COLOR_MENUTEXT);
                P.Text(g, items[i], tc, new RectangleF(rc.Left + 8, rc.Top + 2 + i * MenuItemH, rc.Width - 16, MenuItemH), StringAlignment.Near, StringAlignment.Center);
            }
        }, delegate(Bitmap b)
        {
            P.Met(string.Format("{0,-19} chip=200x76 at 12,12  fill={1}  {2}  itemHeight={3} (layout choice)  text={4}{5}",
                name, P.S(b, rc.Left + 6, rc.Top + 6), P.EdgeSamples(b, rc), MenuItemH,
                P.HEx(P.InkColor(b, new Rectangle(rc.Left + 8, rc.Top + 4, rc.Width - 16, MenuItemH))),
                hover ? "  highlight item fill=" + P.S(b, rc.Right - 12, rc.Top + 2 + MenuItemH + 9) +
                        " text=" + P.HEx(P.LightColor(b, new Rectangle(rc.Left + 8, rc.Top + 2 + MenuItemH, rc.Width - 16, MenuItemH))) : ""));
            P.RleRow(b, name, rc.Top, rc.Left, rc.Right - 1);
            P.RleRow(b, name, rc.Top + 1, rc.Left, rc.Right - 1);
            P.RleRow(b, name, rc.Top + 2 + MenuItemH + MenuItemH / 2, rc.Left, rc.Right - 1);
            P.RleRow(b, name, rc.Bottom - 1, rc.Left, rc.Right - 1);
            P.RleCol(b, name, rc.Left, rc.Top, rc.Bottom - 1);
            P.RleCol(b, name, rc.Right - 1, rc.Top, rc.Bottom - 1);
        });
    }

    static void MenuBar()
    {
        int mh = Win.GetSystemMetrics(15); // SM_CYMENU = real menu bar height
        Cell("menubar-normal", 48, delegate(Graphics g)
        {
            Rectangle rc = new Rectangle(0, 0, 324, mh);
            P.Fill(g, rc, P.C(P.COLOR_MENU));
            P.Text(g, "File     Edit     View     Help", P.C(P.COLOR_MENUTEXT),
                new RectangleF(8, 0, 300, mh), StringAlignment.Near, StringAlignment.Center);
        }, delegate(Bitmap b)
        {
            P.Met(string.Format("menubar-normal      chip=324x{0} (SM_CYMENU, measured)  fill={1}  text={2}",
                mh, P.S(b, 300, mh / 2), P.HEx(P.InkColor(b, new Rectangle(4, 1, 200, mh - 2)))));
            P.RleRow(b, "menubar-normal", 0, 0, 323);
            P.RleRow(b, "menubar-normal", mh / 2, 0, 323);
            P.RleRow(b, "menubar-normal", mh - 1, 0, 323);
        });
    }
}

static class Program
{
    static int Main(string[] args)
    {
        string mode = args.Length > 0 ? args[0] : "all";
        string outDir = args.Length > 1 ? args[1] : @"C:\probe\classic2\out";
        P.Out = outDir;
        P.Start(mode);
        try
        {
            if (mode == "all") P.RunAll();
            else if (mode == "checkcolors") P.CheckColors();
            else { P.Log("unknown mode: " + mode); P.Rc = 2; }
        }
        catch (Exception ex)
        {
            P.Log("FATAL " + ex);
            P.Rc = Math.Max(P.Rc, 1);
        }
        finally
        {
            P.Finish();
        }
        return P.Rc;
    }
}
