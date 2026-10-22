// Win10 原生滚动条取证：在 box-win 的交互会话里显示一个带滚动条的 ListBox，
// 用 PrintWindow(PW_RENDERFULLCONTENT) 抓窗口 / 控件位图。
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

static class N {
    [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT r);
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
}

static class Program {
    static void Shot(IntPtr hwnd, string path) {
        N.RECT r; N.GetWindowRect(hwnd, out r);
        int w = r.R - r.L, h = r.B - r.T;
        using (var b = new Bitmap(w, h)) {
            using (var g = Graphics.FromImage(b)) {
                IntPtr hdc = g.GetHdc();
                N.PrintWindow(hwnd, hdc, 2); // PW_RENDERFULLCONTENT
                g.ReleaseHdc(hdc);
            }
            b.Save(path, ImageFormat.Png);
        }
    }

    [STAThread]
    static void Main(string[] args) {
        string outDir = args.Length > 0 ? args[0] : @"C:\probe\win10-scrollbar\out";
        Directory.CreateDirectory(outDir);
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        var form = new Form {
            Text = "Scrollbar probe",
            Width = 460,
            Height = 330,
            StartPosition = FormStartPosition.Manual,
            Left = 80,
            Top = 80
        };
        var list = new ListBox {
            Dock = DockStyle.Fill,
            IntegralHeight = false,
            BorderStyle = BorderStyle.None,
            Font = new Font("Segoe UI", 9f)
        };
        for (int i = 1; i <= 80; i++) list.Items.Add("List item " + i);
        list.TopIndex = 20; // 让滚动块落在中间
        form.Controls.Add(list);
        form.Show();
        Application.DoEvents();
        System.Threading.Thread.Sleep(700);

        Shot(form.Handle, Path.Combine(outDir, "win10-scrollbar-window.png"));
        Shot(list.Handle, Path.Combine(outDir, "win10-scrollbar-listbox.png"));
        form.Close();
        Application.DoEvents();
    }
}
