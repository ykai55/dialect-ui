# WinUI 3（Fluent 2）控件像素：本机（box-win, Win10 19045）抓取性验证

结论先放前面：**当前配置下拿不到 WinUI 3 控件的真实像素**，但三条路都探到了明确的边界，其中「离线自建
WinUI 3 gallery + RenderTargetBitmap」这条只剩最后一层（unpackaged 资源解析），工程上可解。
本文件记录：走通的命令链、每条的死亡原因、Win10 跑 WinUI 3 与 Win11 原生的差异、以及这批像素能当
什么等级的依据用。

依据等级沿用 `docs/verification.md`：系统本身 > 官方截图 > 上游源码 > 观感估计。**本机目前没有任何
一张「系统本身」级的 WinUI 3 控件像素**（只有一张 UWP/WinUI 2 的窗口图，见证据清单），所以 WinUI 3
控件几何/颜色**不能**以这次产出为依据，只能算「路线已验证/未验证」的工程结论。

---

## 0. 环境事实（实测）

| 项 | 值 |
| --- | --- |
| 远端 | `ssh box-win`（BatchMode 免密），默认 shell PowerShell 7.6.5 |
| OS | Windows 10 Enterprise 22H2 build 19045.5608 x64，Administrator |
| 会话 | ssh 落 **session 0**（无桌、无 UXTheme）；交互会话 **session 2** = Administrator 的 RDP 断开态；session 3 = zcc，未触碰 |
| 显示器 | `GetDpiForSystem()=96`，虚拟屏 `2560×1600`；`Graphics.CopyFromScreen` 在断开态直接抛 Win32Exception（句柄无效） |
| 已装 runtime | `Microsoft.WindowsAppRuntime.1.3/1.4/1.5/1.6/1.7/1.8`（1.8 有 `8000.921.1539.0` 和 `8000.946.1701.0` 两个）、`.2`（`2.3.1.0` / `2.4.0.0`） |
| 缺的东西 | 无 .NET SDK、无 VS/MSBuild、无 dotnet runtime、无 nuget 缓存、**无 DDLM 包**（只有 framework 包） |
| 有的东西 | `csc.exe`（.NET Framework 4.8）、Python 3.12（无 Pillow）、Windows Kits 10.0.20348 |

跑 GUI 的唯一姿势：本地写 `.ps1` → `scp` → `ssh box-win powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\winui3\x.ps1`；
需要桌面时用 `schtasks /Create /SC ONCE /TN <唯一名> /RU Administrator /RL HIGHEST /IT /F + /Run`，
脚本自己写完成标记文件，session 0 侧轮询标记，`/Delete` 收尾。`/TR` 里别写重定向（不经 cmd）。
ssh 命令串里也别写 bash 语法，PS7 会当成自己的语法拆掉。

---

## 1. 路线一：抓现成 WinUI 3 应用 —— 死因：PrintWindow 拿不到合成面

### 1.1 盘点（`tools/winui3/inventory.ps1`，在 `powershell.exe` 5.1 里跑，Appx 模块只在 5.1 可用）

依赖里带 `Microsoft.WindowsAppRuntime.*` 的才是 WinUI 3：

| 包 | 版本 | WinAppRuntime |
| --- | --- | --- |
| Microsoft.DesktopAppInstaller | 1.29.280.0 | 1.8 |
| Microsoft.GetHelp | 10.2409.41132.0 | 1.7（启动后无窗口，放弃） |
| Microsoft.YourPhone | 1.25072.79.0 | 1.7 |
| Microsoft.WindowsAlarms | 11.2606.11.0 | 1.8 |
| Microsoft.Windows.Photos | 2026.11060.2004.0 | 2.3.1 |

**别只看依赖就下结论**：闹钟（`Time.exe`）依赖里有 WindowsAppRuntime，但进程加载的是
`Windows.UI.Xaml.dll`（系统 XAML）+ `Microsoft.UI.Xaml.dll 2.8`，是 **UWP + WinUI 2** 的马甲。
决定性判据是进程加载模块（`tools/winui3/modules_run.ps1`）：

| 进程 | 关键模块 | 判定 |
| --- | --- | --- |
| `Time.exe`（闹钟） | `Windows.UI.Xaml.dll 10.0.19041.4522` + `Microsoft.UI.Xaml.dll 2.8.2501.31001` | UWP + WinUI 2 |
| `Photos.exe` | `Microsoft.UI.Xaml.dll 3.2.0.2511` + `Microsoft.WindowsAppRuntime.dll 2.0` | **WinUI 3** |
| `AppInstaller.exe` | `Microsoft.UI.Xaml.dll 3.1.8.2503` + `WindowsAppRuntime 1.8` | **WinUI 3** |
| `PhoneExperienceHost.exe` | `Microsoft.UI.Xaml.dll 3.1.7.2410` + `WindowsAppRuntime 1.7` | **WinUI 3** |

### 1.2 截图工具（`tools/winui3/capture.cs`，`csc.exe` 直接编译）

C# P/Invoke：`EnumWindows` 找目标 exe 的顶层窗口 → 依次尝试
`PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT=2)`、`PrintWindow(..., 0)`、`BitBlt(GetWindowDC)`，
各存一张 PNG，打印 mean luma 做黑图判据；另有 `--screen` 模式（`CopyFromScreen`）。
运行方式：schtasks `/IT` 进 session 2，`capture.exe <exe名> <outDir> 0 restore`。

### 1.3 结果

| 目标 | PrintWindow flag=2 | flag=0 / BitBlt | 结论 |
| --- | --- | --- | --- |
| Time（UWP+WinUI2） | **2560×1600，31 种颜色，内容完整** | 全黑 | UWP 能抓 |
| Photos（WinUI3） | 800×640，非黑像素 0.8%，4 种颜色 = 黑图 | 非黑 3.0%（只有窗口外框/标题） | **抓不到内容** |
| AppInstaller（WinUI3） | 666×451，非黑 0.0% | 非黑 2.9% | **抓不到内容** |
| YourPhone（WinUI3） | 非黑 0.7% | 非黑 3.2% | **抓不到内容** |

**死因**：WinUI 3 的内容走 `Microsoft.UI.Composition` 合成面，`PrintWindow` 拿到的重定向表面不含这部分
（连 `PW_RENDERFULLCONTENT` 也不行）；UWP/WinUI 2 走系统 XAML 的合成路径，所以同一台机、同一个会
话、同一个工具，UWP 出图、WinUI 3 出黑图。这不是 RDP 断开导致的（UWP 那张证明会话有真实渲染），也
不是工具写错（UWP 那张就是同一个 `capture.exe` 抓的）。

顺带确认：断开态下 `Graphics.CopyFromScreen` 直接失败（无显示表面），**桌面级 GDI 截图这条路在 session 2
不可用**——要抓 WinUI 3 合成内容只能上 `Windows.Graphics.Capture`（需要 D3D11 直写纹理，csc + .NET
Framework 下要自己做 D3D11/DXGI 互操作，估 0.5–1 天，本次没做）。

证据：`reference/shots/windows/winui3/alarms/win10-uwp-winui2-alarms-pwrenderfullcontent.png`（能抓）、
`reference/shots/windows/winui3/appinstaller/*black*.png`、
`reference/shots/windows/winui3/photos/*black*.png`、
`reference/shots/windows/winui3/yourphone/*black*.png`、
`reference/shots/windows/winui3/modules-evidence.txt`、`printwindow-run-log.txt`。

---

## 2. 路线二：离线自建 unpackaged WinUI 3 gallery —— 通了一半，卡在 unpackaged 资源解析

这是和 AppKit `cacheDisplay` 同构的正解：自己建 XAML 树 → `VisualStateManager.GoToState` 强制
Normal/PointerOver/Pressed/Focused/Disabled → `RenderTargetBitmap.RenderAsync` 存 PNG，完全不需要
桌面，也不需要抓合成面。

### 2.1 工具链怎么搬（已走通）

Mac 有外网，box-win 没有；所以「Mac 下载 → scp → box-win 本地 feed」：

```bash
# 1) .NET SDK 8 win-x64（285,292,840 字节，下载 74s）
curl -L -o dotnet-sdk-8.0.426-win-x64.zip \
  https://builds.dotnet.microsoft.com/dotnet/Sdk/8.0.426/dotnet-sdk-8.0.426-win-x64.zip
scp dotnet-sdk-8.0.426-win-x64.zip box-win:C:/probe/winui3/dotnet-sdk.zip

# 2) NuGet 闭包（api.nuget.org flatcontainer 递归抓 .nuspec 依赖，13 个包共 235 MB）
#    Microsoft.WindowsAppSDK 1.8.250907003（→ Runtime/Base/Foundation/WinUI/InteractiveExperiences/
#    DWrite/Widgets/AI + Microsoft.Windows.SDK.BuildTools 10.0.26100.4654 + ...BuildTools.MSIX +
#    Microsoft.Web.WebView2 + Microsoft.Windows.SDK.NET.Ref 10.0.19041.56）
scp -r winui3-feed box-win:C:/probe/winui3/          # 在 box-win 侧改名成 C:\probe\winui3\feed

# 3) box-win 上解压 SDK（用系统自带 tar.exe，Expand-Archive 对 285MB 太慢）
C:\Windows\System32\tar.exe -xf C:\probe\winui3\dotnet-sdk.zip -C C:\probe\winui3\dotnet

# 4) 离线 restore + build（`tools/winui3/build.ps1`）
#    NuGet.config 里 <clear/> + 本地 flat feed + globalPackagesFolder=C:\probe\winui3\nugetcache
C:\probe\winui3\dotnet\dotnet.exe restore C:\probe\winui3\gallery\Gallery.csproj   # 首次 2.64 分钟
C:\probe\winui3\dotnet\dotnet.exe build   C:\probe\winui3\gallery\Gallery.csproj \
  -c Release -o C:\probe\winui3\gallery\bin -p:WindowsAppSDKSelfContained=true    # 6–8 秒
```

结果：**离线编译 WinUI 3 程序成功**（0 error），self-contained 输出 225 个文件，含
`Microsoft.ui.xaml.dll`、`Microsoft.UI.Xaml.Controls.dll`、`Microsoft.WindowsAppRuntime.dll`、
framework 的 `Microsoft.UI.pri / Microsoft.UI.Xaml.Controls.pri / Microsoft.WindowsAppRuntime.pri`
与 `resources.pri`。也就是说「Mac 备料 + box-win 离线构建 WinUI 3」这件事本身是成立的。

工程源码：`tools/winui3/gallery/`（`Gallery.csproj` / `Program.cs` / `app.manifest` / `NuGet.config`，纯
C# 不放 XAML，9 行控件 + 逐状态 RTB 存 PNG，输出到 `C:\probe\winui3\out\gallery`）。

### 2.2 运行：注意必须用 apphost exe，不能用 `dotnet xxx.dll`

- `dotnet C:\...\GalleryProbe.dll` → 进程直接死在 `Application.Start`：
  `0xC000027B STOWED_EXCEPTION`、faulting module `Microsoft.UI.Xaml.dll`、WER 参数 `80040154`
  = `REGDB_E_CLASSNOTREG`。也就是 WinRT 类没注册（apphost 才会做 app-local undocked reg-free WinRT 初始化）。
- `C:\probe\winui3\gallery\bin\GalleryProbe.exe`（`DOTNET_ROOT=C:\probe\winui3\dotnet`）→
  **`Main` → `Application.Start` 回调 → `OnLaunched` 全部走通，Window 创建 / 设 Content / `Activate()`
  成功（`visible=True`）**。所以 Win10 19045 + WinAppSDK 1.8 self-contained 是能起 WinUI 3 应用的。

### 2.3 剩余死因：unpackaged 应用的 framework 资源解析

起窗口之后、首次布局时抛异常（`reference/shots/windows/winui3/gallery-app-log.txt` 原文）：

```
XamlControlsResources fail COMException: 未指定的错误
Cannot find a resource with the given key: AcrylicBackgroundFillColorDefaultBrush.
step: content set / activated, visible=True
XAML UNHANDLED 找不到元素。 System.Runtime.InteropServices.COMException (0x80070490)
进程 exit code -1073741189 = 0xC000027B (STATUS_STOWED_EXCEPTION)
```

已排查/已排除：

- **不是缺 `XamlControlsResources`**：不 merge 它时同样在第一轮布局抛 `0x80070490`；merge 它时构造
  就抛 `0x80004005`「未指定的错误」，外加找不到 `AcrylicBackgroundFillColorDefaultBrush`（WinUI 的
  主题资源键）。即 framework 的 WinUI 资源没有进 app 的资源图，控件默认样式解析不到。
- **不是缺 PRI 文件**：self-contained 输出里 framework 的 `.pri` 已齐全（见 2.1），从已装 framework 包
  `C:\Program Files\WindowsApps\Microsoft.WindowsAppRuntime.1.8_8000.921.1539.0_x64__8wekyb3d8bbwe\`
  再补拷 `resources.pri` 也无变化。
- **不是缺 DDLM 导致起不来**：机器上原本只有 framework 包、没有 `Microsoft.WinAppRuntime.DDLM.*`。
  从 `Microsoft.WindowsAppSDK.Runtime` nupkg 里取出
  `tools/MSIX/win10-x64/Microsoft.WindowsAppRuntime.DDLM.1.8.msix` 用户级 `Add-AppxPackage` 装上
  （装出来是 `Microsoft.WinAppRuntime.DDLM.8000.616.304.0-x6`），再构建 framework-dependent 版本
  （`bin2`）——报错一模一样。
- **最可能的真实原因：版本没严格对齐**。NuGet `Microsoft.WindowsAppSDK 1.8.250907003` 带的 runtime 是
  **8000.616.304.0**（DDLM 装出来就是它），而机器上装的是 **8000.921.1539.0 / 8000.946.1701.0**
  （更新的 1.8 patch）。framework-dependent 找不到严格匹配的 runtime，self-contained 又绕不开
  ms-appx 资源图——两边都卡在资源解析。

### 2.4 下一步（按性价比）

1. **版本严格对齐（最可能一次成）**：挑一个 runtime 版本号正好是 `8000.946.1701.0`（或 921）的
   `Microsoft.WindowsAppSDK` 1.8.x NuGet（包的 `Runtime` 包里有 `tools/MSIX/win10-x64/*.msix`，解出来
   看 MSIX 版本即可），走 framework-dependent + 已装 DDLM；或反过来，用官方 WindowsAppRuntime
   installer（Mac 预先下载再 scp）把 8000.616.304.0 这一套 framework+DDLM+Main+Singleton 装齐。
2. **改成有 package identity 的 MSIX**（appxmanifest + 自签证书 + sideload）：包身份能修复
   `ms-appx:///` 资源解析，但要先看机器是否允许 sideload（开发者模式/`AllowAllTrustedApps`），
   属于改系统级策略，需单独批准。
3. 换 Win11 机器 / Kross Win11 环境（属于 task-3 那条线）。

工作量估计：1 号修法 20–40 分钟；2 号 1–2 小时；`Windows.Graphics.Capture` 抓现成应用 0.5–1 天。

---

## 3. 路线三：预编译 msixbundle（WinUI Gallery）—— 未实测，评估如下

- 包来源：`github.com/microsoft/WinUI-Gallery` releases 的 `.msixbundle`，Microsoft 签名，可信任；
  box-win 无外网但 **Mac 可以下好再 scp**，所以传输不是问题。
- 依赖：需要对应的 `Microsoft.WindowsAppRuntime.*` framework（机器 1.8/2.x 都在）+ DDLM（本次已补装
  但不匹配）；`Add-AppxPackage` 用户级安装，理论上不需要开发者模式（签名链可信）。
- 关键判断：**装上了也解决不了像素问题**——它是 WinUI 3 应用，内容同样走 `Microsoft.UI.Composition`，
  `PrintWindow` 照样黑图；而 session 2 是断开态，`CopyFromScreen` 直接不可用。要出像素还是得回到
  `Windows.Graphics.Capture`，或者把应用切到有真实桌面的会话。
- 结论：性价比最低，本次只评估不执行。它能解决「有控制可看」，不解决「把像素搬出来」。

---

## 4. Win10 上跑 WinUI 3 与 Win11 原生的差别（写进结论前必读）

WinUI 3（Fluent 2）控件的**形状/颜色/状态资源来自 Windows App SDK 自带的包**，不是 OS 主题
（OS 只提供 accent、明暗、字体、外壳）。所以同一 WinAppSDK 版本在 Win10 22H2 与 Win11 上，控件本体
应当非常接近，可搬的与不可搬的要分开：

**基本可搬（同一 WinAppSDK 版本下）**
- 控件高度、内边距、圆角半径、描边宽度、禁用态颜色、控件模板结构（Button/TextBox/ComboBox/Slider/
  CheckBox/RadioButton/ToggleSwitch 的 Fluent 2 视觉）。
- 明暗两套的 ThemeResource 取值（由 WinAppSDK 主题字典给出，不依赖 OS 版本）。

**必须打折扣 / 不能搬**
- **字体**：WinUI 3 默认字体 `Segoe UI Variable Text` **只在 Win11 有**。Win10 上回退到 `Segoe UI`，
  字形度量（字宽、行高、基线、字重档位）不同 → 由文字撑出来的控件宽高、下拉项高度、按钮内文字位置
  在 Win10 抓的像素里都是「回退字体版」，不能直接当 Win11 的目标值。
- **accent 色板**：Win11 从用户 accent 自动生成色阶，Win10 是固定调色板；accent 按钮 / 开关开态 /
  勾选态 / 焦点框颜色既随机器用户设置变，也随 OS 版本变 → 只能当参考，必须配合 Fluent token 表
  （上游源码级依据）而不是抄某一台机器的像素。
- **外壳层**：Mica / DesktopAcrylic 背景（Win10 上 fallback 成纯色）、Win11 的圆角窗口与窗口边框阴影、
  标题栏视觉、系统明暗联动。这些属于 shell，不属于控件，本项目的「不做玻璃材质」也正好不追。
- **文字渲染**：ClearType 子像素与浏览器灰阶抗锯齿不同，笔画粗细会差一档（和 macOS 那套的经验一致）。
- **状态的可观测性**：`RenderTargetBitmap` 只能给静态状态，拿不到悬停/按下的过渡时长；动画时长仍只能
  靠录屏（而录屏需要真实桌面 + 有显示表面）。

**因此**：即便这条路修通，Win10 上出的是「WinUI 3 控件几何/颜色」的系统级依据，**文字度量与 accent
相关颜色要打折扣**；Mica/圆角外壳不覆盖。

---

## 5. 这批像素能不能当 Win11 目标的「系统本身」级依据？

当前状态：**没有 WinUI 3 控件像素入库**，所以答案是「暂时不能」，只有工程结论：

| 问题 | 回答 |
| --- | --- |
| 有没有 WinUI 3 真实控件像素？ | 没有。只有一张 UWP/WinUI 2（闹钟）窗口图，可证明截图通路/会话可用，**不能**当 WinUI 3 控件依据 |
| PrintWindow 抓现成应用可行吗？ | 不可行。Photos/AppInstaller/YourPhone 三例黑图，UWP 对照能出图 |
| 自建 RTB 路线可行吗？ | **程序能构建、能启动、窗口能创建**；卡在 unpackaged framework 资源解析（0x80070490 / 0x80004005），需版本严格对齐或有包身份的 MSIX |
| 修通后能覆盖什么？ | 8 种控件 × 默认/悬停/按下/焦点/禁用 × 明暗的静态像素，属于「系统本身」级（同 AppKit 离屏渲染）；不能覆盖动画时长、Mica、窗口外壳 |
| 哪些要打折扣？ | 字体度量（Win10 回退 Segoe UI）、accent 色（随机器/OS 变）、外壳层 |

---

## 6. 复跑与清理

复跑：`tools/winui3/` 下依次 `inventory.ps1`（盘点）、`capture.cs` + `compile.ps1`（编译截图器）、
`run_all.ps1` + `probe_task.ps1`（走 schtasks /IT 抓现成应用）、`build.ps1` + `probe_app.ps1`（离线构建
并运行自建 gallery）、`cleanup.ps1`（清理进程/任务并转存日志）。Mac 侧备料是 2.1 的三步。

清理状态：本次自建的 schtasks 全部已删除（`cleanup.ps1` 复查 `schtasks /Query` 无残留）；
Photos/AppInstaller/YourPhone/Time/GalleryProbe 进程已全部结束；session 3（zcc）全程未碰。
对机器的唯一持久改动：**用户级安装了一个 WindowsAppRuntime DDLM 包**
（`Microsoft.WinAppRuntime.DDLM.8000.616.304.0-x6`，108 KB，从 nupkg 的 MSIX 直接 `Add-AppxPackage`），
不需要时可 `Remove-AppxPackage Microsoft.WinAppRuntime.DDLM.8000.616.304.0-x6` 卸载。
`C:\probe\winui3` 下留了 **2366 MB / 7753 个文件**（SDK zip 285 MB + 解压的 dotnet 目录、feed 235 MB、
gallery 的 bin/bin2 自包含输出、out、日志），方便下次复跑；不需要时整目录删除即可。
`C:\probe\winui3` 只归这条线使用，未触碰 `C:\probe\lead` / `C:\probe\win32`。

## 7. 证据清单（本地，`reference/shots/` 不入库）

- `alarms/win10-uwp-winui2-alarms-pwrenderfullcontent.png` — UWP/WinUI2 窗口，2560×1600，PW_RENDERFULLCONTENT 能抓（对照）
- `appinstaller/` — WinUI3 黑图：`...pwrenderfullcontent-black.png` + `...printwindow-flag0.png`（只有窗口框）
- `photos/win10-winui3-photos-pwrenderfullcontent-black.png`、`yourphone/win10-winui3-yourphone-pwrenderfullcontent-black.png` — 另两例
- `gallery/app.log` — 自建 gallery 的完整启动日志与死因（0x80070490 / 0x80004005 / 0xC000027B），`gallery/app.log.txt` 为同一份转存
- `modules-evidence.txt` — 进程加载模块（UWP vs WinUI3 判定依据）
- `printwindow-run-log.txt` — 4 个应用的窗口枚举/尺寸/三种抓法结果
