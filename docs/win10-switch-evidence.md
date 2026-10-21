# Win10 开关（UWP ToggleSwitch）实拍与量值

本文回答一个问题：**Win10 上「开关」这个控件长什么样、几何和颜色是多少，能不能拿去写 CSS。**

结论先放前面：

- **拿到了。** 从 box-win 上真实运行的 Windows 10「设置」应用里，用 `PrintWindow(PW_RENDERFULLCONTENT)`
  抓到了 Win10 UWP ToggleSwitch 的开/关两态像素，深色主题。
- 量值可直接用于 CSS 复刻：轨道 **44×20**、圆角 10（全圆）、**2px 描边**；开态填充 `#0078D7`、
  滑块 10×10 `#FFFFFF`；关态填充透明、描边 `#CCCCCC`、滑块 10×10 `#CCCCCC`；滑块内缩 5px、
  行程 24px；旁边还有「开 / 关」文字标签。**唯一要记住的前提：这是 UWP/系统 XAML 的控件，不是 Win32 控件。**

依据等级：**系统本身**（真机、真实运行的应用、原样像素），但只覆盖深色主题的默认态（normal），
悬停/按下/焦点/禁用和浅色主题**本次没测**（见「未覆盖」）。

---

## 1. 为什么不是 uxtheme

`docs/windows-win10-notes.md` 已实测：Win10 的 Win32/uxtheme（`Aero.msstyles`）里**没有 toggle switch
这个部件**，`tools/win32-render.cs` 的 part×state 矩阵里也没有它。Win10 桌面上的开关形态是
UWP/XAML 的 `ToggleSwitch`（WinUI 2 / `Windows.UI.Xaml`），由「设置」等 UWP 应用绘制，
和 Win32 主题是两套渲染路径。所以本文的像素来自**运行中的 UWP 应用**，不是 uxtheme 离屏渲染。

用这些值时别搞混：

| 能当什么 | 不能当什么 |
| --- | --- |
| Win10 桌面真实开关形态的依据（UWP ToggleSwitch） | Win32/uxtheme 控件依据（根本没这个部件） |
| Win10 主题里「开关」这个组件的几何/颜色 | Win11 Fluent 开关的依据（另一套设计，别搬） |

---

## 2. 取证路径（可重跑）

工具都在 `tools/win10-switch/`：`capture.cs`（PrintWindow 抓图，从 `tools/winui3/capture.cs` 拷贝，
未改动原文件）、`winenum.cs`、`launch.ps1` / `final.ps1`（session 2 里拉起设置并抓图）、
`run2.ps1`（schtasks 包装）、`cleanup.ps1`。

```bash
# 1) 本机（Mac）上传并远端编译
scp tools/win10-switch/{capture.cs,winenum.cs,build.ps1,run2.ps1,final.ps1} box-win:C:/probe/win10switch/
ssh box-win 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\win10switch\build.ps1'

# 2) 投到 Administrator 的交互会话（session 2，RDP 断开态）里跑
ssh box-win "powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\\probe\\win10switch\\run2.ps1 \
  -Name 'w10sw_final' \
  -Cmd 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\win10switch\final.ps1' \
  -Marker 'C:\probe\win10switch\final_done.txt' -TimeoutSec 280"

# 3) 拉回产物
scp -r 'box-win:C:/probe/win10switch/out/final/*' /tmp/win10switch-out/
```

`final.ps1` 对每个页面做的事：

1. `Start-Process ms-settings:<page>`（本次用了 `ms-settings:notifications` 拿开态、
   `ms-settings:easeofaccess-keyboard` 拿关态——前者三个开关默认全开，后者六个默认全关）。
2. 轮询到 `SystemSettings.exe` 的窗口出现，**等 UIAutomation 后代元素数 > 25**（证明页面真的加载完，
   不只看窗口出现）。
3. 找到设置窗口的 `ApplicationFrameWindow`（AFH 外框，标题「设置」），`ShowWindow(SW_MAXIMIZE)`
   让它铺满 2560×1600，**再等 3 秒**让 XAML 重新布局。
4. `capture.exe SystemSettings <out>` → 对 `SystemSettings.exe` 拥有的顶层窗口
   `Windows.UI.Core.CoreWindow` 调 `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT=2)`，存 PNG。

### 踩到的坑（下次别再踩）

- **外框和内容是两个窗口。** `ApplicationFrameHost.exe` 的 `ApplicationFrameWindow` 只是外框：
  对它 `PrintWindow` 只能拿到**启动闪屏**（蓝底齿轮）。设置页真正的 UI 是 `SystemSettings.exe`
  自己拥有的**另一个顶层窗口**，类名 `Windows.UI.Core.CoreWindow`。抓图必须抓后者。
  （同一台机、同一个工具：Calculator / Alarms 的 CoreWindow 都能完整抓出内容，说明 UWP 这条路本身通。）
- **时机不对会抓到黑图。** 应用刚启动时它的 CoreWindow 还是 `148×30`，此时不管怎么抓都是黑图/闪屏；
  先等 UIA 树出现，再最大化外框，CoreWindow 会自己变成 `2560×1600`，这时抓才有内容。
- `ssh box-win` 在 session 0，GUI 必须 `schtasks /IT` 投到 session 2（Administrator 的 RDP 断开态）。
  session 3 是 zcc 的，全程没碰。

---

## 3. 截图事实

| 项 | 值 |
| --- | --- |
| 应用 | Windows 10「设置」`SystemSettings.exe`，UWP + 系统 XAML（`Windows.UI.Xaml` / WinUI 2） |
| 页面 | 开态：`ms-settings:notifications`（通知和操作）；关态：`ms-settings:easeofaccess-keyboard`（键盘） |
| OS | Windows 10 Enterprise 22H2 build 19045 x64 |
| 抓图方式 | `PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT=2)`，只含客户区（无标题栏） |
| 截图尺寸 | **2560 × 1600 设备像素**（= 最大化后的整个显示区） |
| DPI / 缩放 | `GetDpiForWindow` = 96、`GetDpiForSystem` = 96，**缩放 100% → DPR = 1** |
| 逻辑像素换算 | **设备像素 = 逻辑像素**，下文数值不再折算 |
| 主题 | 深色（`HKCU\...\Themes\Personalize\AppsUseLightTheme = 0`，全程未改） |
| 页面底色 | 内容区 `#000000`；左侧导航栏 `#1F1F1F`（开关坐在 `#000000` 上） |

> 注意：`HKCU\Control Panel\Desktop\WindowMetrics\AppliedDPI = 192` 是旧值，不可信；
> 会话实际 DPI 96 这一点和 `docs/windows-win10-notes.md` 的实测一致，所以这台机没有原生 2x 栅格。

产物（`reference/shots/win10-switch/`，本地图不入库）：

| 文件 | 内容 |
| --- | --- |
| `win10-switch-on-dark.png` | 开态裁切（86×34，原生 1x 像素，含轨道+滑块+「开」标签） |
| `win10-switch-off-dark.png` | 关态裁切（86×34，原生 1x 像素，含轨道+滑块+「关」标签） |
| `win10-switch-on-dark-8x.png` / `win10-switch-off-dark-8x.png` | 上面两张的 8 倍最近邻放大，**只为人眼看清圆角/描边，不是系统 2x 渲染** |
| `metrics-dark.txt` | 逐项量值（机器可读） |
| `full/win10-settings-notifications-dark-2560x1600.png` | 整窗原图（开态页） |
| `full/win10-settings-easeofaccess-keyboard-dark-2560x1600.png` | 整窗原图（关态页） |

交叉验证：同一次抓取里，UIAutomation 报告的 `ToggleSwitch` 元素状态与截图一致
（notifications 页 3 个全 `On`，easeofaccess-keyboard 页 6 个全 `Off`），元素矩形落在轨道附近，
说明裁到的就是 `ToggleSwitch` 本体，不是别的圆角矩形。

---

## 4. 实测值（深色，normal 态，逻辑 px）

### 4.1 轨道（track）

| 项 | 开态 | 关态 |
| --- | --- | --- |
| 外框尺寸 | **44 × 20** | **44 × 20** |
| 圆角 | 10（左右全圆，胶囊） | 10 |
| 填充 | `#0078D7`（满到边缘） | 透明（露页面底色 `#000000`） |
| 描边 | 2px，颜色与填充同为 `#0078D7`（视觉上分辨不出独立描边） | **2px `#CCCCCC`** |

开态的 `#0078D7` 就是 Win10 默认 accent（`COLOR_HIGHLIGHT`，与 uxtheme 那边量到的 accent 一致）。

### 4.2 滑块（thumb）

| 项 | 开态 | 关态 |
| --- | --- | --- |
| 尺寸 | **10 × 10**（圆形，抗锯齿后有效直径 ≈ 9.9） | **10 × 10** |
| 颜色 | `#FFFFFF` | `#CCCCCC` |
| 位置 | 距轨道右缘、上缘、下缘各 **5px** | 距轨道左缘、上缘、下缘各 **5px** |
| 行程 | 44 − 10 − 10 = **24px** | 同 |

滑块在 20px 高的轨道里垂直居中（上下各 5px），所以视觉上「悬浮」在轨道中。

### 4.3 状态文字标签

| 项 | 值 |
| --- | --- |
| 文字 | 开态「开」，关态「关」 |
| 颜色 | `#FFFFFF`（两种状态都是白色） |
| 字号 | 约 12px（字形墨迹盒 14×12） |
| 距离 | 字形左缘距轨道右缘约 13px（控件内的间隔约 4–8px + 字形自身留白） |

Win10 的 ToggleSwitch 把 on/off 文字放在**轨道外侧右边**，不在轨道里（这点和 Win11 不同，别照搬）。

### 4.4 一句话对照

```
开态：  [ #0078D7 胶囊 44×20 ]  ○ #FFFFFF 10×10 靠右    开
关态：  [ 透明 + 2px #CCCCCC  ]  ○ #CCCCCC 10×10 靠左    关
```

---

## 5. 这些值能不能用于 CSS 复刻

**能，而且够写。** 几何和两态颜色都是实测，不含估计；组件结构也对得上（胶囊轨道 + 圆形滑块 + 右侧文字）。

需要注意的点：

- **必须显式写 2px 描边并用 `box-sizing: border-box`**：关态 44×20 是**含描边**的外框，
  写 `width:44px; height:20px; border:2px solid #CCCCCC; box-sizing:border-box` 才能对上；
  开态同理（描边与填充同色）。
- 滑块用绝对定位更省事：`left/top:5px`（关）/ `right/top:5px`（开）——5px 是从**外框边缘**量的，
  不是从内容盒量的。
- 开态颜色是**系统 accent**：Win10 默认 `#0078D7`，用户改主题色会变。项目做主题时应提成 token，
  默认值取 `#0078D7` 并标「系统 accent」。
- 深色下关态描边/滑块都是 `#CCCCCC`；如果实现时想用一个白+透明度的笔刷近似，注意实测值是实色
  （页面底色 `#000000` 上量到 204/204/204，看起来像 80% 白，但本次无法区分「实色 #CCCCCC」和
  「#FFFFFF @ 80% 叠在黑上」，建议直接写 `#CCCCCC` 并在浅色态另行实测后再定）。
- 开态滑块是 `#FFFFFF`、关态滑块是 `#CCCCCC`——**两态滑块颜色不一样**，不是一个白圆点换个背景。

建议的 token（只给本次实测覆盖的深色 normal 态）：

```css
/* win10 dark, measured @100% scale */
--win10-switch-track-w: 44px;
--win10-switch-track-h: 20px;
--win10-switch-track-radius: 10px;
--win10-switch-stroke: 2px;
--win10-switch-on-fill: #0078D7;      /* system accent */
--win10-switch-off-stroke: #CCCCCC;
--win10-switch-thumb: 10px;
--win10-switch-thumb-inset: 5px;
--win10-switch-on-thumb: #FFFFFF;
--win10-switch-off-thumb: #CCCCCC;
--win10-switch-label: #FFFFFF;        /* 开/关 */
--win10-switch-label-size: 12px;
```

---

## 6. 未覆盖 / 限制（用的时候要标等级）

| 项 | 状态 |
| --- | --- |
| 深色 normal 态开/关 | **已实测**（本文） |
| 浅色主题 | **未抓**。只拿到深色就如实只给深色；没有切换系统主题（`AppsUseLightTheme` 全程保持 0，未改注册表），所以浅色值目前**没有** Win10 实测依据 |
| 悬停 / 按下 / 焦点 / 禁用 | **未测**（需要 UIA 或键鼠注入制造状态，本次时间窗内没做） |
| 用户自定义 accent | 未测；开态填充会随 accent 变 |
| 平滑动画时长/曲线 | 未测（本任务只做像素与量值） |
| 高分屏（150%/200%） | 本机会话是 100%，2x 下的像素取整行为未测 |

## 7. 清理记录

- `schtasks` 任务：每次跑完由 `run2.ps1` 的 `/Delete` 删除；收尾时 `cleanup.ps1` 复查，
  无 `w10sw*` 残留。
- 进程：杀掉本次在 session 2 拉起的 `SystemSettings`、`CalculatorApp`、`SecHealthUI`、`Time`、
  `ApplicationFrameHost`（都是本任务拉起的；session 3 是 zcc 的，全程没碰）。
- 只写了 `C:\probe\win10switch`；没碰 `C:\probe\win32`、`C:\probe\winui3`；没 reboot、没改系统策略、
  没改主题/DPI。清理后确认 `AppsUseLightTheme = 0`、`SystemUsesLightTheme = 0`（与开工前一致）。
