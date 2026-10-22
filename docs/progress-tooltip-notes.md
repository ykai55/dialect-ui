# 进度条与提示气泡：六平台依据与实现取舍

外观在 `css/components.css` 的「进度条」「提示气泡」两节，数值在 `css/theme-*.css` 的
`--progress-*` / `--tooltip-*` 令牌里，提示气泡的行为在 `js/tooltip.js`。

依据等级沿用仓库约定：系统本身 > 官方文档 > 上游源码 > 观感估计。这一轮的来源：

- macOS 两代：本机 AppKit 离屏渲染 `NSProgressIndicator`（26.6.1；11–15 用 `vtool` 改 sdk
  走兼容外观）。
- Windows 10：box-win（22H2 / 96dpi）的 uxtheme part dump 和颜色值。
- Windows 11 / GNOME / XP：WinUI 3 模板、libadwaita 1.8、GTK4、Wine comctl32 源码。
- **提示气泡没有像素**：macOS 的 help tag 是系统窗口，不能离屏渲染；Win10 / Win11 的 tooltip
  没做真窗口抓图。所以 tooltip 的视觉值大多只能标估计，行为值有文档 / 源码。

## 进度条

### Windows 11（WinUI 3，源码）

`ProgressBar` 确定态是**一条 3px 高的强调色细条，压在 1px 中性色轨道上**——未填充的部分只露
1px 线，不是 3px 的槽。不确定态没有轨道，是两条 3px pill 在空白里扫。

| 项 | 值 |
| --- | --- |
| 高度 | 3（`ProgressBarMinHeight`） |
| 圆角 / 端头 | 1.5（`ProgressBarCornerRadius`） |
| 边框 | 0（高对比度才 1） |
| 轨道 | 1px：浅色 45% 黑 / 深色 55% 白 |
| 填充 | 强调色：浅 `#005FB8`、深 `#60CDFF` |
| 不确定态 | 40% 与 60% 两条 pill，2s 循环，缓动 `0.4,0,0.6,1` |

实现：`--progress-h: 3px`，轨道用 `--progress-track-image` 的一条 1px 渐变线画；
不确定态简化成一条滑动光带。

### Windows 10（Win32，实测）

桌面控件是 Win32 `msctls_progress32`，Aero 主题下是**绿色方块条**，不是强调色细条。
UWP 的细条是另一套，别混。

| 项 | 值 |
| --- | --- |
| 主题 part 最小尺寸 | `PP_BAR` 19×14、`PP_FILL` 51×14 |
| 轨道 | `#E6E6E6` + 1px `#BCBCBC` 边 |
| 填充 | `#06B025`，直角，无内描边 |
| 实际高度 | part 最小 14，布局常用 16–17（估计） |
| 暗色 | 没有暗色资源，仍是白/绿 |
| 不确定态 | `PBM_SETMARQUEE`：经典实现 5 段 LED、每步 30ms；主题下走高光带 |

实现：16 高、1px `#BCBCBC` 边框、`#E6B025`… 修正为 `#06B025` 填充；不确定态同样简化为滑动光带。

### Windows XP（经典 Win32）

同一个 `msctls_progress32`。经典外观是**凹槽 + 高亮填充**，直角。仓库其它 XP 控件走 classic，
所以这里用 `COLOR_HIGHLIGHT #0A246A` 深蓝，而不是 Luna 的绿色分块。

| 项 | 值 |
| --- | --- |
| 边框 | 1px 凹陷（`WS_EX_STATICEDGE`） |
| 槽 | `COLOR_3DFACE #C0C0C0` |
| 填充 | `COLOR_HIGHLIGHT #0A246A`，LED 分块：块宽约 2/3 高度、间隙 2px |
| 高度 | 仓库沿用 17 |
| 不确定态 | **没有原生不确定态**（`PBM_SETMARQUEE` 要 Vista+），我们的滑动是借来的 |

### macOS 26 / 11–15（实测）

| 项 | macOS 26 | macOS 11–15 |
| --- | --- | --- |
| 高度 | 8（small 6） | 6（small 3） |
| 圆角 | 4（胶囊） | 3（胶囊） |
| 轨道 | `#DEDEDE` / 深 `#373739` | `#DBDBDB` / 深 `#3C3C3C` |
| 填充 | 强调色 `#007AFF`，明暗同值 | 强调色（实测 `#0A82FF`） |
| 不确定态 | 80pt 渐变光带往返，1.9s | 条纹带 ping-pong，2.667s |

实现上填充用主题的强调色令牌（`--ui-accent`），和仓库其它控件一致；PNG 读到的 sRGB 值
与主题里的 raw Generic RGB 值差一个色彩空间，统一色彩空间仍是待办。不确定态用滑动光带代替
渐变 / 条纹。

### GNOME 48

`GtkProgressBar`（Adwaita 只给它上样式）：8 高、99px 圆角胶囊、轨道 `currentColor` 15%、
填充强调色。不确定态是 activity 块，由应用 pulse 驱动，没有固定周期；这里用 1200ms 的滑动。

## 提示气泡

### 行为（先分清「系统窗口」还是「应用自绘」）

| 平台 | 类型 | 首现 | 键盘 focus | 点击关闭 | 跟随指针 |
| --- | --- | --- | --- | --- | --- |
| Win11 WinUI | 应用内 XAML | 约 400ms（估计） | 显示 | 否（Ctrl 关） | 是 |
| Win10 Win32 | 系统 `tooltips_class32` | 500ms | 不显示 | 是 | 否 |
| WinXP Win32 | 系统 `tooltips_class32` | 500ms | 不显示 | 是 | 否 |
| macOS 两代 | 系统 help tag | 约 1s（估计） | 不显示 | 是 | 否 |
| GNOME | GTK 自绘 popup | 500ms（`HOVER_TIMEOUT`） | 不显示 | 是 | 否 |

我们的实现：悬停 / 显示延迟按主题令牌；只有 Win11 主题在键盘 focus 时显示
（`--tooltip-focus-show: 1`），其余为 0；按下鼠标、Esc、滚动、窗口缩放都关闭（Esc 是 web 便利，
原生多不处理；Win11 原生用 Ctrl 关）。跟随指针没做。

### 视觉

| 平台 | 底色 / 文字 | 边框 | 圆角 | 内边距 | 依据 |
| --- | --- | --- | --- | --- | --- |
| Win11 | `#F9F9F9` / 89% 黑；深 `#2C2C2C` / 白 | 1px 黑 6% | 4 | 9×6 | 源码 |
| Win10 | `#FFFFFF` / `#575757` | 1px `#767676` | 0 | 4×8 | 实测 |
| WinXP | `#FFFFE1` / 黑 | 1px 黑 | 0 | 3×4 | 系统调色板 + 估计 |
| macOS 26 | 近白 96% / `#1A1A1A` | 1px `#D0D0D0` | 6 | 4×8 | 估计 |
| macOS 11–15 | 近白 / `#1A1A1A` | 1px `#D0D0D0` | 5 | 4×8 | 估计 |
| GNOME | `rgb(0 0 6 / 80%)` / 白 | 1px 白 10% | 9 | 6×10 | 上游 SCSS |

Win10 的系统 tooltip 是**白底 + `#575757` 灰字**，不是淡黄；淡黄 `#FFFFE1` 是 XP 的。

## 已知差距

- 进度条不确定态统一成一条滑动光带：macOS 的渐变光带 / 条纹、Win11 的双 pill、Win10 的
  marquee LED、GNOME 的 activity 块都没做；XP 原生没有不确定态，我们的是借来的。
- Win10 / Win11 的进度条和大部分提示气泡没有逐平台像素对照，视觉值多是源码或估计。
- 提示气泡没有箭头、富文本、跟随指针；Win11 的跟随指针和 Ctrl 关闭没做。
- tooltip 的延迟、阴影是估计；macOS 的系统 help tag 外观本来就不可定制。

## 来源

- WinUI 3 ProgressBar 模板 / 主题资源：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/ProgressBar/ProgressBar.xaml>
- WinUI 3 ProgressBar 主题资源：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/ProgressBar/ProgressBar_themeresources.xaml>
- WinUI 公共色令牌：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml>
- WinUI ToolTip 主题资源：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/ToolTip_themeresources.xaml>
- Win32 Progress Bar：<https://learn.microsoft.com/en-us/windows/win32/controls/progress-bar-control>
- Win32 tooltip 延迟（TTM_SETDELAYTIME）：<https://learn.microsoft.com/en-us/windows/win32/controls/ttm-setdelaytime>
- Wine comctl32 `progress.c`：<https://raw.githubusercontent.com/wine-mirror/wine/master/dlls/comctl32/progress.c>
- Wine comctl32 `tooltips.c`：<https://raw.githubusercontent.com/wine-mirror/wine/master/dlls/comctl32/tooltips.c>
- NSProgressIndicator：<https://developer.apple.com/documentation/appkit/nsprogressindicator>
- Apple HIG — Progress indicators：<https://developer.apple.com/design/human-interface-guidelines/progress-indicators>
- libadwaita `_tooltip.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/widgets/_tooltip.scss>
- libadwaita `_progress-bar.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/1.8.0/src/stylesheet/widgets/_progress-bar.scss>
- GTK4 `gtkprogressbar.c`：<https://gitlab.gnome.org/GNOME/gtk/-/raw/main/gtk/gtkprogressbar.c>
- GTK4 `gtktooltip.c`（HOVER_TIMEOUT 500）：<https://gitlab.gnome.org/GNOME/gtk/-/raw/main/gtk/gtktooltip.c>
