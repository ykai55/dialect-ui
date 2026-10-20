// GalleryProbe - minimal WinUI 3 (Windows App SDK 1.8) unpackaged app that renders
// Fluent 2 controls into PNGs via RenderTargetBitmap, for each forced visual state
// (Normal / PointerOver / Pressed or Focused / Disabled) in light and dark theme.
//
// Pure C#: no XAML files, no UWP packaging, no interactive desktop interaction.
using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.UI.Dispatching;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Microsoft.UI.Xaml.Media.Imaging;
using Windows.Graphics.Imaging;
using Windows.Storage;

namespace GalleryProbe
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
                Log("FATAL " + e.ExceptionObject);
            File.AppendAllText(@"C:\probe\winui3\main.log", DateTime.Now.ToString("HH:mm:ss.fff") + " Main enter" + Environment.NewLine);
            try
            {
                WinRT.ComWrappersSupport.InitializeComWrappers();
                File.AppendAllText(@"C:\probe\winui3\main.log", DateTime.Now.ToString("HH:mm:ss.fff") + " com wrappers ok" + Environment.NewLine);
                Application.Start(p =>
                {
                    var context = new DispatcherQueueSynchronizationContext(DispatcherQueue.GetForCurrentThread());
                    SynchronizationContext.SetSynchronizationContext(context);
                    File.AppendAllText(@"C:\probe\winui3\main.log", DateTime.Now.ToString("HH:mm:ss.fff") + " in Application.Start callback" + Environment.NewLine);
                    new GalleryApp();
                });
            }
            catch (Exception ex)
            {
                Log("FATAL start " + ex);
            }
        }

        public static void Log(string s)
        {
            try
            {
                Directory.CreateDirectory(OutDir);
                File.AppendAllText(Path.Combine(OutDir, "app.log"), DateTime.Now.ToString("HH:mm:ss.fff") + " " + s + Environment.NewLine);
            }
            catch { }
        }

        public static readonly string OutDir = @"C:\probe\winui3\out\gallery";
    }

    sealed class StateSpec
    {
        public string Key;
        public string Vsm;
        public bool Enabled = true;
        public bool? Checked;
        public bool? On;
    }

    sealed class RowSpec
    {
        public string Name;
        public Control Control;
        public Border Host;
        public readonly List<StateSpec> States = new List<StateSpec>();
    }

    public sealed class GalleryApp : Application
    {
        Grid _root;
        StackPanel _panel;
        readonly List<RowSpec> _rows = new List<RowSpec>();
        static SolidColorBrush _pageBrush;

        protected override void OnLaunched(LaunchActivatedEventArgs args)
        {
            File.AppendAllText(@"C:\probe\winui3\main.log", DateTime.Now.ToString("HH:mm:ss.fff") + " OnLaunched" + Environment.NewLine);
            Program.Log("OnLaunched");
            UnhandledException += (s, e) => { Program.Log("XAML UNHANDLED " + e.Message + " " + e.Exception); };

            _panel = new StackPanel { Spacing = 0 };
            _root = new Grid { RequestedTheme = ElementTheme.Light };
            _pageBrush = new SolidColorBrush(Microsoft.UI.ColorHelper.FromArgb(255, 0xF3, 0xF3, 0xF3));
            _root.Background = _pageBrush;
            _root.Children.Add(_panel);
            try { BuildRows(); }
            catch (Exception ex) { Program.Log("BuildRows fail " + ex.GetType().Name + ": " + ex.Message); }

            Program.Log("step: creating window");
            Window win = null;
            try { win = new Window { Title = "WinUI3 Fluent 2 probe" }; Program.Log("step: window created"); }
            catch (Exception ex) { Program.Log("window create fail " + ex.GetType().Name + ": " + ex.Message); }
            if (win != null)
            {
                try { win.Content = _root; Program.Log("step: content set"); }
                catch (Exception ex) { Program.Log("content fail " + ex.GetType().Name + ": " + ex.Message); }
                try { win.Activate(); Program.Log("step: activated, visible=" + win.Visible); }
                catch (Exception ex) { Program.Log("activate fail " + ex.GetType().Name + ": " + ex.Message); }
                try { win.AppWindow.Resize(new Windows.Graphics.SizeInt32(1100, 1500)); }
                catch (Exception ex) { Program.Log("resize fail " + ex.GetType().Name + ": " + ex.Message); }
            }

            win.DispatcherQueue.TryEnqueue(DispatcherQueuePriority.Low, () => { _ = RunAsync(); });
        }

        SolidColorBrush MakeButtonBackground() { return null; }

        void BuildRows()
        {
            // 1. Push button
            AddSafe("button", () => AddPageButton("button", false));
            AddSafe("button-accent", () => AddPageButton("button-accent", true));
            AddSafe("textbox", () => AddTextBox("textbox", false));
            AddSafe("textbox-multiline", () => AddTextBox("textbox-multiline", true));
            AddSafe("combobox", AddComboBox);
            AddSafe("slider", AddSlider);
            AddSafe("checkbox", AddCheckBox);
            AddSafe("radio", AddRadioButton);
            AddSafe("switch", AddToggleSwitch);
        }

        void AddSafe(string name, Action a)
        {
            try { a(); }
            catch (Exception ex) { Program.Log("row fail " + name + " " + ex.GetType().Name + ": " + ex.Message); }
        }

        void AddPageButton(string name, bool accent)
        {
            var b = new Button { Content = accent ? "Accent" : "Button", MinWidth = 160 };
            if (accent) {
                try { b.Style = (Style)Application.Current.Resources["AccentButtonStyle"]; }
                catch (Exception ex) { Program.Log("AccentButtonStyle missing: " + ex.Message); }
            }
            var row = AddRow(name, b);
            row.States.Add(new StateSpec { Key = "default", Vsm = "Normal" });
            row.States.Add(new StateSpec { Key = "pointerover", Vsm = "PointerOver" });
            row.States.Add(new StateSpec { Key = "pressed", Vsm = "Pressed" });
            row.States.Add(new StateSpec { Key = "disabled", Vsm = "Normal", Enabled = false });
        }

        void AddTextBox(string name, bool multiline)
        {
            TextBox t;
            if (multiline)
                t = new TextBox { PlaceholderText = "Multi-line placeholder", TextWrapping = TextWrapping.Wrap, AcceptsReturn = true, Height = 96, Width = 320 };
            else
                t = new TextBox { PlaceholderText = "Placeholder text", Width = 320 };
            var row = AddRow(name, t);
            row.States.Add(new StateSpec { Key = "default", Vsm = "Normal" });
            row.States.Add(new StateSpec { Key = "pointerover", Vsm = "PointerOver" });
            row.States.Add(new StateSpec { Key = "focused", Vsm = "Focused" });
            row.States.Add(new StateSpec { Key = "disabled", Vsm = "Normal", Enabled = false });
        }

        void AddComboBox()
        {
            var c = new ComboBox { Width = 240, PlaceholderText = "Pick one" };
            c.Items.Add("Item A");
            c.Items.Add("Item B");
            c.Items.Add("Item C");
            c.SelectedIndex = 0;
            var row = AddRow("combobox", c);
            row.States.Add(new StateSpec { Key = "default", Vsm = "Normal" });
            row.States.Add(new StateSpec { Key = "pointerover", Vsm = "PointerOver" });
            row.States.Add(new StateSpec { Key = "pressed", Vsm = "Pressed" });
            row.States.Add(new StateSpec { Key = "focused", Vsm = "Focused" });
            row.States.Add(new StateSpec { Key = "disabled", Vsm = "Normal", Enabled = false });
        }

        void AddSlider()
        {
            var s = new Slider { Width = 280, Minimum = 0, Maximum = 100, Value = 35, StepFrequency = 1 };
            var row = AddRow("slider", s);
            row.States.Add(new StateSpec { Key = "default", Vsm = "Normal" });
            row.States.Add(new StateSpec { Key = "pointerover", Vsm = "PointerOver" });
            row.States.Add(new StateSpec { Key = "pressed", Vsm = "Pressed" });
            row.States.Add(new StateSpec { Key = "disabled", Vsm = "Normal", Enabled = false });
        }

        void AddCheckBox()
        {
            var c = new CheckBox { Content = "Checkbox" };
            var row = AddRow("checkbox", c);
            foreach (var on in new[] { false, true })
            {
                string suffix = on ? "on" : "off";
                row.States.Add(new StateSpec { Key = "default-" + suffix, Vsm = "Normal", Checked = on });
                row.States.Add(new StateSpec { Key = "pointerover-" + suffix, Vsm = "PointerOver", Checked = on });
                row.States.Add(new StateSpec { Key = "pressed-" + suffix, Vsm = "Pressed", Checked = on });
            }
            row.States.Add(new StateSpec { Key = "disabled-off", Vsm = "Normal", Enabled = false, Checked = false });
            row.States.Add(new StateSpec { Key = "disabled-on", Vsm = "Normal", Enabled = false, Checked = true });
        }

        void AddRadioButton()
        {
            var r = new RadioButton { Content = "Radio" };
            var row = AddRow("radio", r);
            foreach (var on in new[] { false, true })
            {
                string suffix = on ? "on" : "off";
                row.States.Add(new StateSpec { Key = "default-" + suffix, Vsm = "Normal", Checked = on });
                row.States.Add(new StateSpec { Key = "pointerover-" + suffix, Vsm = "PointerOver", Checked = on });
                row.States.Add(new StateSpec { Key = "pressed-" + suffix, Vsm = "Pressed", Checked = on });
            }
            row.States.Add(new StateSpec { Key = "disabled-off", Vsm = "Normal", Enabled = false, Checked = false });
            row.States.Add(new StateSpec { Key = "disabled-on", Vsm = "Normal", Enabled = false, Checked = true });
        }

        void AddToggleSwitch()
        {
            var t = new ToggleSwitch { OnContent = "On", OffContent = "Off" };
            var row = AddRow("switch", t);
            foreach (var on in new[] { false, true })
            {
                string suffix = on ? "on" : "off";
                row.States.Add(new StateSpec { Key = "default-" + suffix, Vsm = "Normal", On = on });
                row.States.Add(new StateSpec { Key = "pointerover-" + suffix, Vsm = "PointerOver", On = on });
                row.States.Add(new StateSpec { Key = "pressed-" + suffix, Vsm = "Pressed", On = on });
            }
            row.States.Add(new StateSpec { Key = "disabled-off", Vsm = "Normal", Enabled = false, On = false });
            row.States.Add(new StateSpec { Key = "disabled-on", Vsm = "Normal", Enabled = false, On = true });
        }

        RowSpec AddRow(string name, Control control)
        {
            var label = new TextBlock
            {
                Text = name,
                Width = 200,
                VerticalAlignment = VerticalAlignment.Center,
                FontSize = 12
            };
            var line = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 12 };
            line.Children.Add(label);
            line.Children.Add(control);
            var host = new Border
            {
                Background = _pageBrush,
                Padding = new Thickness(10, 8, 24, 8),
                Child = line
            };
            _panel.Children.Add(host);
            var row = new RowSpec { Name = name, Control = control, Host = host };
            _rows.Add(row);
            return row;
        }

        void Apply(RowSpec row, StateSpec st)
        {
            var c = row.Control;
            c.IsEnabled = st.Enabled;
            if (st.Checked.HasValue)
            {
                if (c is CheckBox cb) cb.IsChecked = st.Checked.Value;
                if (c is RadioButton rb) rb.IsChecked = st.Checked.Value;
            }
            if (st.On.HasValue && c is ToggleSwitch ts) ts.IsOn = st.On.Value;
            c.ApplyTemplate();
            if (!string.IsNullOrEmpty(st.Vsm))
                VisualStateManager.GoToState(c, st.Vsm, false);
        }

        async Task RunAsync()
        {
            try
            {
                Directory.CreateDirectory(Program.OutDir);
                Program.Log("RunAsync begin");
                await Task.Delay(1800);
                Program.Log("xamlRoot=" + (_root.XamlRoot != null) + " loaded=" + _root.IsLoaded);
                Program.Log("rasterizationScale=" + (_root.XamlRoot == null ? -1 : _root.XamlRoot.RasterizationScale) + " rootSize=" + _root.ActualWidth + "x" + _root.ActualHeight);

                foreach (var theme in new[] { "light", "dark" })
                {
                    bool light = theme == "light";
                    _root.RequestedTheme = light ? ElementTheme.Light : ElementTheme.Dark;
                    _pageBrush.Color = light ? Microsoft.UI.ColorHelper.FromArgb(255, 0xF3, 0xF3, 0xF3)
                                             : Microsoft.UI.ColorHelper.FromArgb(255, 0x20, 0x20, 0x20);
                    await Task.Delay(800);
                    _root.UpdateLayout();
                    await RenderAsync(_root, Path.Combine(Program.OutDir, "page-" + theme + ".png"), "page-" + theme);

                    foreach (var row in _rows)
                    {
                        foreach (var st in row.States)
                        {
                            try
                            {
                                Apply(row, st);
                                _root.UpdateLayout();
                                await Task.Delay(70);
                                string fn = row.Name + "-" + st.Key + "-" + theme + ".png";
                                await RenderAsync(row.Host, Path.Combine(Program.OutDir, fn), fn);
                            }
                            catch (Exception ex)
                            {
                                Program.Log("state fail " + row.Name + "/" + st.Key + " " + ex.Message);
                            }
                        }
                        // reset for next row
                        row.Control.IsEnabled = true;
                        if (row.Control is CheckBox c2) c2.IsChecked = false;
                        if (row.Control is RadioButton r2) r2.IsChecked = false;
                        if (row.Control is ToggleSwitch t2) t2.IsOn = false;
                    }
                }
                Program.Log("ALL CAPTURES DONE");
                File.WriteAllText(@"C:\probe\winui3\gallery_done.txt", "done");
            }
            catch (Exception ex)
            {
                Program.Log("RUN FAIL " + ex);
            }
            finally
            {
                try { Exit(); } catch { Environment.Exit(0); }
            }
        }

        async Task RenderAsync(UIElement el, string path, string tag)
        {
            try
            {
                var rtb = new RenderTargetBitmap();
                await rtb.RenderAsync(el);
                var buf = await rtb.GetPixelsAsync();
                byte[] pixels = new byte[buf.Length];
                using (var dr = Windows.Storage.Streams.DataReader.FromBuffer(buf))
                {
                    dr.ReadBytes(pixels);
                }
                if (File.Exists(path)) File.Delete(path);
                File.WriteAllBytes(path, new byte[0]);
                var file = await StorageFile.GetFileFromPathAsync(path);
                using (var stream = await file.OpenAsync(FileAccessMode.ReadWrite))
                {
                    var enc = await BitmapEncoder.CreateAsync(BitmapEncoder.PngEncoderId, stream);
                    enc.SetPixelData(BitmapPixelFormat.Bgra8, BitmapAlphaMode.Premultiplied,
                        (uint)rtb.PixelWidth, (uint)rtb.PixelHeight, 96, 96, pixels);
                    await enc.FlushAsync();
                }
                Program.Log("OK " + tag + " " + rtb.PixelWidth + "x" + rtb.PixelHeight + " bytes=" + pixels.Length);
            }
            catch (Exception ex)
            {
                Program.Log("RENDER FAIL " + tag + " " + ex.GetType().Name + ": " + ex.Message);
            }
        }
    }
}
