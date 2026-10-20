# Windows 侧：Win32/uxtheme 离屏抓取（box-win，Win10 22H2）

这篇回答一个问题：**能不能像 macOS 的 `tools/appkit-render.swift` 那样，把 Windows 原生控件
离屏渲染成 PNG，当 CSS 复刻的最高等级依据？**

结论：**能，但有条件，而且抓到的不是 Win11。** 管线已经在 box-win 上跑通，
`reference/shots/windows/win10-uxtheme/` 里是产出的状态矩阵。条件是：

1. 进程必须跑在**交互会话**里。`ssh box-win` 的进程在 **session 0**，
   那里 `OpenThemeData` 对所有 class 都返回 `NULL`、`GetCurrentThemeName` 返回
   `0x80070490`，画不出任何主题。必须用 `schtasks /IT` 投到 Administrator 的 session 2（RDP 断开态也行）。
2. 机器是 **Windows 10 Enterprise 22H2 / build 19045 / x64**，不是 Windows 11。
   抓到的是 Win10 的 Aero（aero2）主题，不是 Fluent/Win11。**不能拿这些像素直接当 Win11 依据**，
   能搬和不能搬的见文末对照表。
3. 会话的实际显示 DPI 是 **96 / 缩放 100%**（`AppliedDPI` 注册表里写着 192 是旧值，不可信）。
   所以没有原生 2 倍栅格：`-96dpi.png` 是系统真正画出来的 1x 像素，
   不带后缀的 PNG 是它的最近邻 2 倍像素放大（只为和 CSS 2 倍图并排看，不是"系统 2x 渲染"）。

## 一条命令怎么跑

```bash
# 1) 本机编译（csc 在 box-win 上，不在 Mac）
scp tools/win32-render.cs tools/win32-app.manifest 'box-win:C:/probe/win32/'
ssh box-win 'powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "\
  & C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe \
  /win32manifest:C:\probe\win32\app.manifest /out:C:\probe\win32\win32render.exe \
  /r:System.Drawing.dll /r:System.Windows.Forms.dll C:\probe\win32\win32-render.cs"'

# 2) 投到 session 2 跑（run2.ps1 只是 schtasks 包装：Create /IT -> Run -> 等 DONE 标记 -> Delete）
scp tools/win32-run2.ps1 'box-win:C:/probe/win32/'
ssh box-win "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\probe\\win32\\run2.ps1 \
  -Name w32_$(date +%s) -Cmd 'C:\probe\win32\win32render.exe matrix C:\probe\win32\out light' \
  -Marker 'C:\probe\win32\out\DONE.txt'"

# 3) 拉回（reference/shots 已被 .gitignore 忽略）
scp -r 'box-win:C:/probe/win32/out/*' reference/shots/windows/win10-uxtheme/
```

模式：`facts`（主题/DPI/字体/part 尺寸/颜色表）、`dump`（part×state 视觉网格）、
`matrix`（交付矩阵，`light`/`dark`）、`darkprobe`（暗色可用性实验）、
`rawcapture`（真窗口 + PrintWindow/CopyFromScreen 验证）、`statemap`（单 part 8 状态）、
`dlgmetrics`（隐藏对话框模板量系统默认尺寸）。完整源码见 `tools/win32-render.cs`。

坑：

- ssh 命令串里别用 bash 语法（`| head`、`&` 会被 PowerShell 解释）。复杂逻辑写成 `.ps1`，
  scp 过去后用 `powershell.exe -File` 跑；远程默认 shell 是 PowerShell 7。
- 任务命令行里写 `>` 重定向不生效（直接 CreateProcess），要重定向就包 `cmd /c`。
  本管线不依赖 stdout，程序自己写日志和 `DONE.txt`。
- 只写 `C:\probe\win32`；本管线没有碰 `C:\probe\lead`、没有 reboot、没改主题/DPI。

## 产物清单（`reference/shots/windows/win10-uxtheme/`）

| 目录 | 内容 |
| --- | --- |
| `matrix/` | 交付矩阵：8 类控件 × 5 状态，明/暗各一套；`win10-{control}-{state}-{light\|dark}.png`（2x 像素放大）+ `...-96dpi.png`（1x 系统真实像素）；`metrics-{light,dark}.txt` 是逐图采样值 |
| `dump/` | 每个 theme class 的 `part 1..12 × state 1..8` 网格，图上标了 part/state 和 min size。用来确认"哪个 part 是哪个部件"，不用于比对 |
| `statemap/` | Edit part1/part6、Combobox part1/4/5、Trackbar part3/4/5 的 8 状态放大图，用来定 state 语义 |
| `rawcapture/` | 自建原生 Win32 窗口（无 WinForms）逐控件 `PrintWindow(PW_RENDERFULLCONTENT)` 的 PNG + 日志，用于交叉验证 matrix 的 part 选择 |
| `capture/` | WinForms 真窗口 + PrintWindow/CopyFromScreen/DrawToBitmap 验证图（含 `window-edit-focus.png`、`window-button-focus.png`） |
| `darkprobe/` | 暗色实验的 5 个变体（A 无操作 / B 只 ForceDark / C ForceDark+DarkMode_Explorer / D 只 DarkMode_Explorer / E ForceDark+DarkMode_CFD）的 PNG 与日志 |
| `logs/` | `log-facts-light.txt`（part 尺寸、theme color、字体、SysColor 全表）、`sessinfo.txt`（session/theme 文件名）、`dpicheck.txt`（DPI 实测）、各模式日志 |

## 主题 / DPI / 字体 实测事实

| 项 | 值 | 来源 |
| --- | --- | --- |
| OS | Windows 10 Enterprise 22H2, build 19045.5608, x64 | 注册表 |
| 主题文件 | `C:\Windows\resources\themes\Aero\Aero.msstyles`，scheme `NormalColor`，size `NormalSize` | session 2 里 `GetCurrentThemeName`（PowerShell） |
| uxtheme.dll | 10.0.19041.4522 | 文件版本 |
| 会话显示 DPI | **96 / 100%**（`GetDpiForSystem`=96，`GetDpiForMonitor`=96，ScaleFactor=100） | `dpicheck.txt` |
| `HKCU\Control Panel\Desktop\WindowMetrics\AppliedDPI` | 192（**旧值，与实际不符**） | 同上 |
| 主题字体 | **Microsoft YaHei UI 9pt**（`GetThemeSysFont(TMT_MSGBOXFONT)` 返回 h=-12） | `log-facts-light.txt` |
| SysColor | WINDOW `#FFFFFF`、BTNFACE `#F0F0F0`、WINDOWTEXT `#000000`、GRAYTEXT `#6D6D6D`、HIGHLIGHT `#0078D7`、3DSHADOW `#A0A0A0`、3DLIGHT `#E3E3E3`、HOTLIGHT `#0066CC` | 同上 |
| 控件尺寸 | **不是系统常量**：由 app / 对话框模板决定。`dlgmetrics` 的模板字体回退成了 System 16px（换算成 button 100x28），不能当 9pt 现代对话框的默认值；矩阵里的 200×23（按钮/单行输入/下拉框）、160×21（滑块）、13×13（勾选框）是**布局取值**，标为估计而非实测 | `log-dlgmetrics-light.txt` |

uxtheme part 的原始事实（可直接引用）：Button push part1 min 13×11；Checkbox/Radio part2/3 13×13；
Edit part1 min 3×3、part6（EP_EDITBORDER_NOSCROLL）min 5×5；ComboBox 箭头按钮宽 17、
下拉项高度 **16px**（`CB_GETITEMHEIGHT`）、弹出列表 1px `#7A7A7A` 边框；
Trackbar 滑块 **11×19**（part4/THUMBBOTTOM 画出来就是 11×19，part3/TKP_THUMB 的 min size 是 6×22，和真控件不符）、
轨道高 4px（外两行 `#D6D6D6`、内两行 `#E7EAEA`）。

矩阵采样出的关键色（96dpi，浅色，详见 `matrix/metrics-light.txt`）：

- 按钮：normal 填充 `#E1E1E1`、1px 边 `#ADADAD`、方角；hot `#E5F1FB`；pressed `#CCE4F7`；
  disabled 填充 `#CCCCCC`、文字 `#838383`（原生 `rawcapture/button-disabled.png` 同色，交叉验证通过）。
- 输入框：白底、1px 边 `#ABADB3`；**focus 和 normal 的边框/填充一样**（Win10 经典输入框没有 accent 焦点边，
  焦点只靠插入符）；readonly 同样是白底；disabled 是 `#F0F0F0` 底 + 灰字（= 主题 normal 框 + EP_BACKGROUND 的 disabled 底色）。
- 多行输入：`EP_EDITBORDER_NOSCROLL` 边框 normal `#7A7A7A`、hot `#171717`、focused `#0078D7`、disabled `#CCCCCC`。
- 下拉框（收起态，非可编辑）：CP_READONLY 画整条字段 + 右侧 17px 箭头按钮：
  填充 `#E1E1E1`、边 `#ADADAD`，hot `#E5F1FB` + 边 `#0078D7`，pressed `#CCE4F7` + 边 `#005499`，disabled `#CCCCCC` + 边 `#BFBFBF`。
  展开层：1px `#7A7A7A` 边框、白底、项高 16px、高亮项 `#0078D7` + 白字。
- 滑块：轨道 4px、滑块 11×19、`#0078D7`（hot/pressed/focus/disabled 有各自状态色）；原生 trackbar 默认还画刻度，本矩阵没画（`rawcapture/slider.png` 能看到刻度）。
- 复选框 / 单选框：盒 13×13；unchecked 白底 + `#333333` 边；checked 蓝勾；hot 边 `#0078D7`；
  pressed 底 `#CCE4F7`；disabled 边 `#CCCCCC`、文字 `#6D6D6D`。
- **开关（toggle switch）：Win10 的 Win32/uxtheme 没有这个部件。** 没有 PNG，标为缺件。
  Win10 的开关是 UWP/XAML 的 ToggleSwitch，不属于 uxtheme，无法用这条管线抓。

## 暗色：Win10 没有完整的 Win32 暗色，别当成 Win11 暗色依据

`darkprobe` 四个变体的实测（`darkprobe/`、`logs/log-darkprobe-*.txt`）：

- A/B（什么都不做 / 只 `SetPreferredAppMode(ForceDark=2)`）：所有 part 仍按浅色画。
- C（ForceDark + `SetWindowTheme(hwnd, "DarkMode_Explorer")`）：**只有 Button class 真的变暗**——
  normal `#333333`、hot `#454545`、pressed `#666666`、文字变白。
- E（ForceDark + `SetWindowTheme(hwnd, "DarkMode_CFD")`）：ComboBox 有深色变体（part4 边 `#9B9B9B`），
  Edit 的 part1 仍是浅色；但 **Edit 的 part6（EP_EDITBORDER）有深色变体**（底 `#383838`、边 `#9B9B9B`），
  所以暗色矩阵里单行输入/多行输入改用 part6 画。
- checkbox/radio/slider 在 A–E 里都没有深色变体，暗色图里仍是浅色——这是系统行为，不是漏画。

结论：Win10 的 Win32 暗色依赖未公开 API（`SetPreferredAppMode` ordinal 135、`SetWindowTheme("DarkMode_*")`、
以及 Win10 19045 上不存在命名的 `AllowDarkModeForWindow` 导出），官方不支持、只覆盖部分控件。
**Win11 目标不要从这套暗色图取数**；Win11 的 Fluent 暗色需要另找 Win11 依据。

## PrintWindow / CopyFromScreen：交互会话（session 2）里真窗口抓取结论

用 `capture`/`rawcapture` 两套自建窗口在 session 2（RDP 断开态）实测：

- **`PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT=2)` 可用。** 会话断开、没有真实显示输出时，
  仍能抓到窗口内容（标题栏、文字、控件、焦点态）。产物见 `capture/window-edit-focus.png`、
  `capture/window-button-focus.png`、`rawcapture/host-window.png`。
- **`Graphics.CopyFromScreen` 不可用**：抛 `Win32Exception: 句柄无效`（断开的 RDP 会话没有屏幕 DC）。
- `PrintWindow` 的**普通 flags=0** 对子控件会得到全黑图；只有 `PW_RENDERFULLCONTENT` 稳定。
- **保真度有限，不能当像素依据**：
  - 同一颗按钮，uxtheme 离屏画出来是 `#E1E1E1` 填充（与原生 `rawcapture/button.png` 一致），
    但 `PrintWindow` 抓 WinForms 窗口时中间区域是白色、只有边/内侧两圈 `#E1E1E1`——重绘路径不是像素级忠实。
  - WinForms `TextBox` 默认 `BorderStyle.Fixed3D`，抓到的是经典 3D 边框，不是主题的 1px `#ABADB3`。
  - 结论：**抓"有没有内容、状态对不对"可以用 PrintWindow；抓像素值仍用 uxtheme 离屏渲染。**
    抓真实系统 UI（别的进程的窗口）没验证，UWP/DirectComposition 窗口大概率抓不到，不要假定可行。

## Win10 值 → Win11 目标：哪些能搬、哪些不能

| 项 | Win10 实测（本文档，一级依据） | 能否用于 Win11 | 说明 |
| --- | --- | --- | --- |
| 主题文件名 / 字体名 | Aero.msstyles / Microsoft YaHei UI | ❌ | Win11 用 Fluent（msstyles/`Segoe UI Variable`），且中文环境字体也不同 |
| 圆角 | 方角（按钮/输入框/下拉框 0px） | ❌ | Win11 按钮/输入框 4px 级圆角；这是最显眼的代差，矩阵里全是方角 |
| 按钮填充 | `#E1E1E1`，边 `#ADADAD`，hot `#E5F1FB`，pressed `#CCE4F7`，disabled `#CCCCCC`/`#838383` | ❌ | Win11 按钮是更亮的填充（项目 `theme-win11.css` 里估值 `#FBFBFB` + 半透明描边），不能直接替换 |
| 输入框 | 白底 + 1px `#ABADB3`，focus 无 accent 边框 | ❌ | Win11 输入框有底部 accent 内描边/圆角；focus 表现不同 |
| 下拉框 | 非可编辑字段 `#E1E1E1` + 边 `#ADADAD`，项高 16 | ❌ 做 Win11 外观 | Win11 combo 字段是白底圆角；但"项高/箭头 17px"是 Win32 通例，可作参考 |
| 复选框/单选框 | 13×13，`#333333` 边，勾选 `#0078D7` | ⚠️ 尺寸/结构可参考，颜色不能 | Win11 方框尺寸接近，但 accent 色与圆角不同 |
| 滑块 | 轨道 4px、滑块 11×19、`#0078D7`；无 tick 版本 | ⚠️ 结构可参考，颜色不能 | Win11 slider 尺寸接近但 accent 不同；**能搬的只有"轨道 4px / 滑块 11×19"这类几何** |
| accent 色 | `#0078D7`（`COLOR_HIGHLIGHT`） | ❌ | Win11 accent 默认不是这个值，必须另测 |
| 焦点框 | 按钮/勾选框/单选框是 1px 黑色点线（`DrawFocusRect`），输入框无焦点边 | ❌ | Win11 用 2px 外描边/focus ring，机制不同 |
| 暗色 | 只有 Button（以及 part6 画的输入框）能变暗，其余不变 | ❌ | Win10 暗色不完整且未公开；Win11 必须另找依据 |
| 开关 | **缺件**（Win32 无 toggle switch） | ❌ | Win11 目标需要用 Fluent 资料另行确认，别用 Win10 里不存在的东西凑 |
| 控件高度 23px | 本项目布局取值（**估计**，非系统常量） | ⚠️ | 别当"Win10 实测"引用；Win11 高度另有值 |
| `msstyles` part/state 语义 | 本次 dump/statemap 的一手映射 | ✅ 概念可用 | part/state 机制相同，但 Win11 的 msstyles 资源是另一套，索引别照抄 |

一句话：**Win10 这套矩阵解决的是"管线能不能跑、Win32 主题本身长什么样、以及 Win10 与 Win11 代差有多大"，不是 Win11 的目标像素。**
项目里 Win11 的数值目前仍然只有文档/上游源码/估值等级，本文档不给任何未经实测的 Win11 数字。

## 依据等级标注

| 内容 | 等级 |
| --- | --- |
| 主题文件、DPI、SysColor、part 尺寸、theme color、字体、暗色可用性、PrintWindow/CopyFromScreen 行为 | **系统本身**（session 2 实测；uxtheme 离屏 + 原生窗口抓取） |
| 矩阵里的控件宽度/高度、焦点框合成、暗色文字色、暗色输入框用 part6、复选框文字间距 4px | **观感/惯例估计**（已在 metrics 与本文档标注） |
| 2x PNG | 1x 系统像素的最近邻放大（**不是**系统 2x 渲染） |
| Win11 的任何数值 | 未实测，本文档不给 |

## 已知失败点

1. session 0 里 `OpenThemeData` 全 NULL，`GetCurrentThemeName` 失败——必须投 session 2。
2. 本会话实际 DPI 96（`AppliedDPI=192` 是旧值），拿不到原生 2x；`GetDpiForSystem`/`MonitorFromPoint` 都验过。
3. C# 里 `GetCurrentThemeName` 只返回首字符（`'C'/'N'/'N'`），同一声明在 PowerShell 里正常；本文档用 PowerShell 的结果。
4. `dlgmetrics` 隐藏对话框模板的字体回退成 System 16px，没拿到 9pt 现代对话框的默认控件尺寸。
5. 暗色只走通 Button class + CFD 下的输入框/下拉框部分；checkbox/radio/slider 无暗色变体。
6. 开关无 Win32 部件，缺件。
7. `PrintWindow(PW_RENDERFULLCONTENT)` 能出内容但重绘不忠实；`CopyFromScreen` 在断开会话直接抛异常。
