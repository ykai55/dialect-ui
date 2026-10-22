# 分段控件：六平台依据与实现取舍

分段控件是一排互斥的按钮，一次选中一个。外观在 `css/components.css` 的「分段控件」一节，
每个平台的数值在 `css/theme-*.css` 的 `--seg-*` 令牌里，行为在 `js/segmented.js`。

依据等级沿用仓库约定：系统本身 > 官方文档 > 上游源码 > 观感估计。

先说结论：**六个平台里只有 macOS 和 GNOME（48+）有原生的分段控件。** Windows 三代都没有，
所以 Windows 的三套主题是按「最接近的原生组合」拼的，不是复刻，主题注释和下面的表格都写清楚了。

## macOS 26（Tahoe）

原生 `NSSegmentedControl`，`.rounded` 样式。以下是本机（macOS 26.6.1）用
`tools/appkit-render.swift` 离屏渲染的实测值，PNG 在 `reference/shots/macos/appkit/`（生成物）。

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 尺寸 | frame 与可见 ink 都是 159×24pt（26 上 bezel 不再比 frame 小） | 同 |
| 轨道 | `#D5D5D5`，无描边 | `#29292A` |
| 圆角 | 约 5–6pt | 同 |
| 选中段 | 强调色实心块 `#095DF8`，与轨道同高、无内缩 | `#1064FE` |
| 选中文字 | `#FFFFFF` | `#FFFFFF` |
| 未选中文字 | `#212121` | `#DEDEDE` |
| 分隔线 | 1px `#C0C0C0`，只在两个**都未选中**的段之间出现；选中段两侧不画 | 1px `#3E3E3F` |
| 段宽 | 文字宽 + 约 10.5pt × 2 | 同 |
| 字体 | 13pt 系统字体，regular | 同 |

一个影响实现的发现：26 上 `segmentStyle` 基本失效。`.automatic` / `.rounded` / `.texturedSquare` /
`.separated` 等七种取值渲染出的 PNG 字节完全相同，所以 26 主题不需要为 `.separated` 单独做分支。

悬停 / 按下 / 焦点环是估计：离屏渲染没有鼠标状态和第一响应者，focus ring 也由窗口服务另画。
主题里对应令牌都标了「估计」。

## macOS 11–15（旧版外观）

同一个 `NSSegmentedControl`，用 `vtool` 把二进制的 sdk 改成 15.0 后走系统内置的兼容外观路径渲染
（不是真 15.x 机器，caveat 见 `docs/macos15-native-notes.md`）。

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 尺寸 | frame 139×24，可见 ink 135×22.5（bezel 比 frame 小一圈） | 同 |
| 轨道 | `#DBDBDB`，上缘 1px `#D9D9D9` | `#232324` |
| 选中段 | **白色 pill 浮起**（`#FFFFFF` + 0.5pt 描边 + 约 1px 落影），不用强调色 | `#5A5A5B` |
| 选中文字 | `#050505` | `#FAFAFA` |
| 分隔线 | 0.5pt `#C5C5C5`，未选中段之间 | 对应暗色 |

两代最大的差别就在选中态：26 用强调色实心块，11–15 用白色浮起 pill。所以同一个
`--seg-selected-bg` 槽位在两个主题里是两套值，不是笔误。

旧版还有个 `.separated` 样式（Safari 前进/后退那种，独立按钮 + 强调色选中），这一版没做。

## GNOME 48（Adwaita / GTK4）

GNOME 48 起有 `AdwToggleGroup`（libadwaita 1.7）。47 只有 `.linked` 的一组 `GtkToggleButton`。
这一版按 48 的外观做，数值来自上游 SCSS：

| 项 | 值 | 出处 |
| --- | --- | --- |
| 组高 | 34（段 28） | `_toggle-group.scss` |
| 组圆角 / 内边距 | 9 / 3 | `_toggle-group.scss` |
| 段圆角 | 6（9 - 3） | `_toggle-group.scss` |
| 组底色 | `currentColor` 10% 叠在窗口底上 | `_colors.scss` |
| 选中段 | 白色 pill + 双层阴影；深色是 20% 白 | `_toggle-group.scss` |
| 选中文字 | `rgb(0 0 6 / 80%)`；深色白 | `_colors.scss` |
| 分隔线 | 1px，垂直内缩 3px，选中段旁边的隐藏 | `_toggle-group.scss` |
| 悬停 / 按下 | `currentColor` 7% / 16% | `_colors.scss` |
| 焦点环 | 2px，强调色 50%，画在单个段外 | `_drawing.scss` |
| 字重 | bold | `_toggle-group.scss` |

组高 34 也能从官方 `toggle-group.png`（296×34）对上。字号 SCSS 没写，继承 GTK 默认；我们取 14px，
算估计。

## Windows 11

**WinUI 3 / Windows App SDK 没有分段控件。** 最接近的是 `SelectorBar`（文字强调色 + 下方短横，
更接近 tab）和 `RadioButtons`（一行圆圈，不是连体按钮）。

这一版按 CommunityToolkit 的 `Segmented` 扩展控件做，主题注释里写明了它不是系统自带：

| 项 | 值 |
| --- | --- |
| 高 / 圆角 | 32 / 4 |
| 内边距 | 3 |
| 选中段 | 强调色填充 `#005FB8`，白字；深色 `#60CDFF`，深字 |
| 悬停 / 按下 | 4% / 6% 黑（深色是 6% / 8% 白） |
| 动效 | 167ms，`cubic-bezier(0, 0, 0, 1)` |
| 焦点 | 2px 描边画在单个段内 3px 处 |

这些是扩展控件的值，不是系统原生像素。写进主题时不能当成「Windows 11 原生分段控件就是这样」。

## Windows 10

没有原生分段控件。按 Win32 工具栏按钮组（`BTNS_GROUP` + `BTNS_CHECKGROUP`）拼：

- 高 23、方角、`#E1E1E1` 底 + 1px `#ADADAD` 边框（仓库 Win10 按钮实测值）。
- 选中沿用按钮按下色 `#CCE4F7` + `#005499` 内描边。**选中态没有原生像素可对**，是估计。
- 悬停 `#E5F1FB`（按钮实测值），禁用文字 `#838383`（按钮实测值）。
- 焦点是 1px 点线，框住单个段。

## Windows XP

没有原生分段控件。最接近的是 `TCS_BUTTONS` 页签和 `BTNS_CHECKGROUP` 按钮组：

- 高 23、面 `#C0C0C0`，1px 软边（凸起：上/左白、下/右 `#808080`）。
- 选中画成凹陷（软边反向）。原生 flat 变体选中项还会叠 50% 网点填充，这里用面灰代替，
  属于有意的简化。
- 没有悬停态，这是时代行为。禁用文字 `#808080`（`COLOR_GRAYTEXT`）。
- 焦点 1px 点线，框住文字，鼠标点完也画。

## 键盘模型

实现用的是 web 单选组（WAI-ARIA radiogroup）的通行做法：整组一个 Tab 站，方向键在段之间移动并
立即选中，Home / End 到首尾，空格 / 回车确认。这一套不是六家通用的，原生的差异是：

| | 键盘行为 | 依据 |
| --- | --- | --- |
| Windows（SelectorBar / RadioButtons） | 方向键在组内切换并选中 | 官方文档 |
| Windows（Toolkit Segmented） | Tab 在组内逐项走 + 方向键 | 上游源码 |
| macOS | 整组一个 Tab 站，空格选中；方向键和 Home/End 不改变 `selectedSegment` | 有限实测（合成 keyDown，未在真实 key window 下复验） |
| GNOME | 每个段都是 Tab 站，逐段走；没有方向键处理 | 上游源码 |

也就是说 mac 和 GNOME 的原生键盘模型都不是「方向键切换」。这一版为了可用性和 web 惯例统一成了
radiogroup，属于 web affordance，后面要按平台分叉时在 `js/segmented.js` 里按主题加开关。

## 验证链路

`verify/verify.html` 和 `verify/verify-macos15.html` 都加了 segmented 行，
`tools/compare-appkit.py` / `tools/compare-macos15.py` 的 `ROWS` 同步，跑：

```bash
bash tools/verify-macos.sh     # macOS 26：原生 vs CSS
bash tools/verify-macos15.sh   # macOS 11–15：同上
```

产物在 `shots/verify/macos/segmented-*.png` 和 `shots/verify/macos15/segmented-*.png`。

Windows 10 / XP 的 verify 页没有加这一行：原生没有分段控件，没有可对照的像素；它们的主题值来自
按钮实测 + 组合推断，不能走「原生 vs CSS」这条通道。

## 已知差距

- 悬停、按下、焦点环在 macOS 两代都是估计。
- 禁用态只用「降不透明度 + 文字转灰」处理，没有逐平台核对。
- GNOME 47（`.linked` toggle）没做，只有 48 的 ToggleGroup 外观。
- macOS 11–15 的 `.separated` 样式没做。
- 没有图标段、多选、可滚动分段。
- Windows 三代的分段控件都是组合出来的，不是原生控件。

## 来源

- NSSegmentedControl.Style（8 个取值）：<https://developer.apple.com/documentation/appkit/nssegmentedcontrol/style>
- Apple HIG — Segmented controls：<https://developer.apple.com/design/human-interface-guidelines/segmented-controls>
- SelectorBar（WinUI）：<https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/selector-bar>
- RadioButtons 键盘模型：<https://learn.microsoft.com/en-us/windows/apps/design/controls/radio-button>
- Community Toolkit Segmented：<https://learn.microsoft.com/en-us/dotnet/communitytoolkit/windows/segmented>
- Win32 Toolbar button styles（BTNS_CHECKGROUP / BTNS_GROUP）：<https://learn.microsoft.com/en-us/windows/win32/controls/toolbar-control-and-button-styles>
- Win32 Tab control styles（TCS_BUTTONS / TCS_FLATBUTTONS）：<https://learn.microsoft.com/en-us/windows/win32/controls/tab-control-styles>
- Wine comctl32 `tab.c`（TCS_BUTTONS 的绘制规则）：<https://raw.githubusercontent.com/wine-mirror/wine/master/dlls/comctl32/tab.c>
- Adw.ToggleGroup：<https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.ToggleGroup.html>
- libadwaita `_toggle-group.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/widgets/_toggle-group.scss>
- libadwaita `_colors.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/_colors.scss>
- libadwaita `_drawing.scss`（focus-ring）：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/_drawing.scss>
- libadwaita `adw-toggle-group.c`（没有方向键处理）：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-toggle-group.c>
