// winenum.cs - enumerate top-level and child windows with process/class/rect info (run in session 2)
// Compile: csc /nologo /out:winenum.exe winenum.cs
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

class Program
{
    delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")] static extern bool EnumWindows(EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr parent, EnumWindowsProc cb, IntPtr lParam);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr hWnd);
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

    [StructLayout(LayoutKind.Sequential)]
    struct RECT { public int Left, Top, Right, Bottom; }

    static string ExeOf(IntPtr h)
    {
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        try { return Process.GetProcessById((int)pid).ProcessName + ":" + pid; } catch { return "?:" + pid; }
    }

    static string Describe(IntPtr h)
    {
        StringBuilder t = new StringBuilder(512); GetWindowText(h, t, 512);
        StringBuilder c = new StringBuilder(256); GetClassName(h, c, 256);
        RECT r; GetWindowRect(h, out r);
        return "hwnd=" + h.ToInt64() + " exe=" + ExeOf(h) + " class=" + c + " title='" + t + "'"
            + " rect=" + (r.Right - r.Left) + "x" + (r.Bottom - r.Top) + "@" + r.Left + "," + r.Top
            + " vis=" + IsWindowVisible(h) + " iconic=" + IsIconic(h) + " dpi=" + GetDpiForWindow(h);
    }

    static void DumpChildren(IntPtr parent, int depth, string filter)
    {
        EnumChildWindows(parent, delegate(IntPtr h, IntPtr l)
        {
            string line = Describe(h);
            if (filter.Length == 0 || line.ToLower().Contains(filter.ToLower()))
                Console.WriteLine(new string(' ', depth * 2) + "  child " + line);
            if (depth < 3) DumpChildren(h, depth + 1, filter);
            return true;
        }, IntPtr.Zero);
    }

    static void Main(string[] args)
    {
        SetProcessDPIAware();
        string exeFilter = args.Length > 0 ? args[0] : "";
        if (exeFilter == "--all") exeFilter = "";
        bool children = args.Length > 1 && args[1] == "children";
        int n = 0;
        EnumWindows(delegate(IntPtr h, IntPtr l)
        {
            string d = Describe(h);
            bool match = exeFilter.Length == 0 || d.ToLower().Contains(("exe=" + exeFilter.ToLower()).ToLower());
            if (!match) return true;
            Console.WriteLine("top   " + d);
            if (children) DumpChildren(h, 1, "");
            n++;
            return true;
        }, IntPtr.Zero);
        Console.WriteLine("== matched " + n + " top-level windows (filter='" + exeFilter + "')");
    }
}
