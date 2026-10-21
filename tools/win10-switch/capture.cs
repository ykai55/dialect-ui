// capture.cs - grab top-level windows of a given exe as PNG, in-session (run via schtasks /IT)
// Compile: csc /nologo /out:capture.exe capture.cs
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

class Program
{
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] static extern bool GetClientRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindowDC(IntPtr hWnd);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr hWnd, IntPtr hdc);
    [DllImport("gdi32.dll")] static extern bool BitBlt(IntPtr hdcDest, int x, int y, int w, int h, IntPtr hdcSrc, int sx, int sy, uint rop);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool GetWindowDisplayAffinity(IntPtr hWnd, out uint affinity);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }

    class Win
    {
        public IntPtr Hwnd;
        public string Exe, Class, Title;
        public RECT Rect;
        public bool Visible, Iconic;
    }

    static List<Win> EnumWins(string exeFilter)
    {
        List<Win> list = new List<Win>();
        EnumWindows(delegate(IntPtr h, IntPtr l)
        {
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            string exe = "";
            try { exe = Process.GetProcessById((int)pid).ProcessName; } catch { return true; }
            if (exeFilter.Length > 0 && string.Compare(exe, exeFilter, true) != 0) return true;
            StringBuilder t = new StringBuilder(512); GetWindowText(h, t, 512);
            StringBuilder c = new StringBuilder(256); GetClassName(h, c, 256);
            RECT r; GetWindowRect(h, out r);
            Win w = new Win();
            w.Hwnd = h; w.Exe = exe; w.Class = c.ToString(); w.Title = t.ToString();
            w.Rect = r; w.Visible = IsWindowVisible(h); w.Iconic = IsIconic(h);
            list.Add(w);
            return true;
        }, IntPtr.Zero);
        return list;
    }

    static double MeanLuma(Bitmap b)
    {
        long sum = 0; long n = 0;
        for (int y = 0; y < b.Height; y += 3)
            for (int x = 0; x < b.Width; x += 3)
            {
                Color c = b.GetPixel(x, y);
                sum += (c.R + c.G + c.B); n++;
            }
        if (n == 0) return 0;
        return sum / (double)n / 3.0;
    }

    static Bitmap Grab(IntPtr hwnd, int w, int h, uint flag, out string how)
    {
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            IntPtr hdc = g.GetHdc();
            bool ok = PrintWindow(hwnd, hdc, flag);
            g.ReleaseHdc(hdc);
            if (ok) { how = "PrintWindow(flag=" + flag + ") ok"; return bmp; }
            how = "PrintWindow(flag=" + flag + ") FAILED";
        }
        return null;
    }

    static Bitmap GrabBitBlt(IntPtr hwnd, int w, int h, out string how)
    {
        Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp))
        {
            IntPtr hdc = g.GetHdc();
            IntPtr src = GetWindowDC(hwnd);
            bool ok = BitBlt(hdc, 0, 0, w, h, src, 0, 0, 0x00CC0020);
            ReleaseDC(hwnd, src);
            g.ReleaseHdc(hdc);
            how = "BitBlt ok=" + ok;
            return ok ? bmp : null;
        }
    }

    static void Main(string[] args)
    {
        SetProcessDPIAware();
        string exeFilter = args.Length > 0 ? args[0] : "";
        string outDir = args.Length > 1 ? args[1] : ".";
        int waitMs = args.Length > 2 ? int.Parse(args[2]) : 0;
        bool restore = args.Length > 3 && args[3] == "restore";
        if (waitMs > 0) System.Threading.Thread.Sleep(waitMs);
        Directory.CreateDirectory(outDir);

        if (exeFilter == "--screen")
        {
            int sw = GetSystemMetrics(78), sh = GetSystemMetrics(79); // SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN
            int sx = GetSystemMetrics(76), sy = GetSystemMetrics(77);
            Console.WriteLine("virtual screen " + sw + "x" + sh + " at " + sx + "," + sy);
            Bitmap sb = new Bitmap(sw, sh, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(sb))
            {
                g.CopyFromScreen(sx, sy, 0, 0, new Size(sw, sh), CopyPixelOperation.SourceCopy);
            }
            string sp = Path.Combine(outDir, "screen.png");
            sb.Save(sp, ImageFormat.Png);
            Console.WriteLine("saved " + sp + " meanLuma=" + MeanLuma(sb).ToString("F1"));
            sb.Dispose();
            return;
        }

        List<Win> wins = EnumWins(exeFilter);
        Console.WriteLine("== windows for exe '" + exeFilter + "': " + wins.Count);
        if (wins.Count == 0)
        {
            foreach (Win w in EnumWins("")) Console.WriteLine("   other: " + w.Exe + " | " + w.Class + " | " + w.Title + " | vis=" + w.Visible + " | " + (w.Rect.Right - w.Rect.Left) + "x" + (w.Rect.Bottom - w.Rect.Top));
            return;
        }
        int idx = 0;
        foreach (Win w in wins)
        {
            int cw = w.Rect.Right - w.Rect.Left, ch = w.Rect.Bottom - w.Rect.Top;
            uint dpi = GetDpiForWindow(w.Hwnd);
            Console.WriteLine("[" + idx + "] hwnd=" + w.Hwnd.ToInt64() + " exe=" + w.Exe + " class=" + w.Class + " title='" + w.Title + "' vis=" + w.Visible + " iconic=" + w.Iconic + " rect=" + cw + "x" + ch + " at " + w.Rect.Left + "," + w.Rect.Top + " dpi=" + dpi);
            if (cw <= 0 || ch <= 0 || !w.Visible) { idx++; continue; }
            if (restore)
            {
                ShowWindow(w.Hwnd, 9); // SW_RESTORE
                SetForegroundWindow(w.Hwnd);
                System.Threading.Thread.Sleep(1200);
                GetWindowRect(w.Hwnd, out w.Rect);
                cw = w.Rect.Right - w.Rect.Left; ch = w.Rect.Bottom - w.Rect.Top;
            }
            string how;
            Bitmap b = Grab(w.Hwnd, cw, ch, 2, out how); // PW_RENDERFULLCONTENT
            if (b != null)
            {
                string p = Path.Combine(outDir, idx.ToString("D2") + "_" + w.Exe + "_pw2.png");
                b.Save(p, ImageFormat.Png);
                Console.WriteLine("   saved " + p + " " + how + " meanLuma=" + MeanLuma(b).ToString("F1") + " size=" + b.Width + "x" + b.Height);
                b.Dispose();
            }
            Bitmap b0 = Grab(w.Hwnd, cw, ch, 0, out how);
            if (b0 != null)
            {
                string p = Path.Combine(outDir, idx.ToString("D2") + "_" + w.Exe + "_pw0.png");
                b0.Save(p, ImageFormat.Png);
                Console.WriteLine("   saved " + p + " " + how + " meanLuma=" + MeanLuma(b0).ToString("F1"));
                b0.Dispose();
            }
            Bitmap bb = GrabBitBlt(w.Hwnd, cw, ch, out how);
            if (bb != null)
            {
                string p = Path.Combine(outDir, idx.ToString("D2") + "_" + w.Exe + "_bitblt.png");
                bb.Save(p, ImageFormat.Png);
                Console.WriteLine("   saved " + p + " " + how + " meanLuma=" + MeanLuma(bb).ToString("F1"));
                bb.Dispose();
            }
            idx++;
        }
    }
}
