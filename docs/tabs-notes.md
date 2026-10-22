# 标签页：六平台依据与实现取舍

横向、不可关闭的标签页。外观在 `packages/core/css/components.css` 的「标签页」一节，每个平台的数值在
`packages/core/css/themes/*.css` 的 `--tabs-*` 令牌里，行为在 `packages/core/src/behavior/tabs.js`。

依据等级沿用仓库约定：系统本身 > 官方文档 > 上游源码 > 观感估计。这一轮的像素来源：

- macOS 两代：本机 AppKit 离屏渲染（`NSTabView` 必须放进真实 `NSWindow` 并跑 runloop，
  否则 26 内部那颗 `NSSegmentedControl` 的标签文字不画；11–15 用 `vtool` 改 sdk 走兼容外观）。
- Windows 10：远端 box-win（22H2 / 96dpi / Aero）上的真 `SysTabControl32`，`PrintWindow` 抓图 +
  `TCM_GETITEMRECT` / `TCM_ADJUSTRECT` 量尺寸。
- Windows 11：WinUI 3 的 `TabView.xaml` / `TabView_themeresources.xaml` / `TabView.cpp`。
- GNOME：libadwaita 的 `_tab-view.scss` / `_colors.scss` / `adw-tab-bar.c`。
- Windows XP：没有真 XP 复测，几何借 Win10 关视觉样式的 comctl32 v5（同一段 GDI 代码），
  配色用仓库已有的 XP 调色板实测；标签高度是估计。

## macOS 26（Tahoe）

`NSTabView` 的当代形态是**一条居中胶囊 + 下面一个圆角内容面板**，胶囊压在面板上缘。
26 上这条胶囊条就是一个真的 `NSSegmentedControl` 子视图（219×24，3 段，`.automatic`）。

| 项 | 浅色 | 深色 |
| --- | --- | --- |
| 胶囊条 | 24 高，水平居中，距顶 5pt；单段高 20（上下各缩 1pt） | 同 |
| 圆角 | 条端与 pill 都约 5–6 | 同 |
| 选中 pill | **中性灰 ≈ `#C7C7C7`，不是强调色** | ≈ `#5B5B5D` |
| 未选中文字 | `#252525` | 未采样 |
| 分隔线 | 1px `#CDCDCD`，只在两个都未选中的段之间 | — |
| 面板 | `#E8E8E8`（窗口底 `#ECECEC`，约暗 2%），圆角 5，无实色描边 | `#272729` |
| 相对位置 | 面板左右各缩 7pt、顶距 16pt；胶囊顶距 6pt，压面板上缘约 11pt | 同 |
| 材质 | 胶囊条是半透明材质（alpha 8–20%），合成后约 `#DFDFDF` | — |

实现上用 `.tabs__list` 的 `width: fit-content` + `margin: auto` 做居中胶囊，
`--tabs-list-overlap: -14px` 让面板压到胶囊下面；选中态用中性灰 pill。悬停 / 按下 / 焦点环
离屏拿不到，标估计。

## macOS 11–15（旧版外观）

同一个 `NSTabView`，但标签条由 NSTabView 自绘，子视图里没有 `NSSegmentedControl`，
所以旧版标签条**不可聚焦、没有焦点环**。结构一样，差别在选中态：

| 项 | 值 |
| --- | --- |
| 胶囊条 | 22 高（pill 20），居中，距顶 5pt |
| 选中 pill | **白色 `#FFFFFF`**，0.5pt 描边 + 约 1px 落影 |
| 条壳 / 未选中文字 / 分隔线 | `#E4E4E4` / `#2C2C2C` / 1px `#D1D0D1` |
| 面板 | 同 26：`#E8E8E8`、圆角 5、内缩 7 |

两代最大的差别就是选中态：26 是中性灰实心 pill，11–15 是白色浮起 pill。
`--tabs-selected-bg` 在两个主题里是两套值，不是笔误。

## Windows 11（WinUI 3 TabView）

贴边标签。条上方留 8px，标签 32 高，上圆角 8（`OverlayCornerRadius`），下两角 0。
选中是 `SolidBackgroundFillColorTertiary`（`#F9F9F9` / 深色 `#282828`）实底 + 1px 描边，
**没有下划线指示条**。底部还有两段 4×4 的反向「肩膀」圆弧，这一版没做。

| 项 | 值 |
| --- | --- |
| 文字 | 未选中 62% 黑、选中 89% 黑；深色 77% / 100% 白 |
| 悬停 / 按下 | 4% 黑 / 更亮的层；深色 6% 白 |
| 分隔线 | 1px，上下各缩 8，悬停和按下时隐藏 |
| 条下缘线 | 1px |
| 内容面板 | 无边框、无底色，内容直接铺 |
| 标签宽度 | 默认 Equal（等分条宽） |

实现取 `--tabs-h: 32px`、`--tabs-list-pad-top: 8px`、上圆角 8、去掉指示条；`TabViewItem`
默认等分宽度和两段肩膀圆弧没做。

## Windows 10（Win32 SysTabControl32）

没有 UWP TabView，Pivot 也不是「一排标签 + 面板」。实际桌面应用用的是 Win32 标签控件，
这些值是 box-win 真机抓的：

| 项 | 值 |
| --- | --- |
| 标签高 | 18（item rect 54×18 / 60×18 / 48×18，起于 y=2） |
| 左右内边距 | 6（`DEFAULT_PADDING_X`） |
| 圆角 | 0 |
| 未选中 | `#F0F0F0` 面，上/左/右 1px `#D9D9D9`（下边不画） |
| 选中 | `#FFFFFF` 面，四边都不画，与面板连通；比未选中高 2px |
| 分隔 | 靠标签自己的 1px 边框 |
| 面板 | 白底 + 1px `#D9D9D9`；内容区从 y≈21 起、左右各缩 4 |
| 字体 | 9pt（12px 字高） |

**没有悬停态**（只有 `TCS_BUTTONS` 才做 100ms 热跟踪），按下即选中。单个标签不能禁用，
只能整控件禁用。焦点是 1px 点线、内缩 3px，画在单个标签内，鼠标点完也画。

实现上把标签高度收到 18、内边距 6，选中用白底、比未选中高 2px（`--tabs-selected-lift: 2px`
加到高度上，底边仍和面板对齐），底边压住面板上边框 1px，选中项和面板连通；如果只把选中项往上
抬，面板上边框会从下面露出来，看着多一条线。面板白底 1px 边框。标签对齐和 2px 抬高的像素位置
是近似，不是逐像素。

## Windows XP（经典 Win32 tab）

经典 ComCtl32 的标签控件：直角、1px 3D 软边，选中标签与面板同色并连通。

| 项 | 值 |
| --- | --- |
| 标签高 | 18–20（估计；Win10 关样式实测 17） |
| 左右内边距 | 6 |
| 未选中 | 面 `#C0C0C0`，1px 凸起软边（上/左白、下/右 `#808080`） |
| 选中 | 面与面板同色，只留上/左凸起，下边不画；比未选中高 2px |
| 面板 | 1px 凹陷软边，面 `#C0C0C0` |
| 文字 | `#000000`；禁用 `#808080` |
| 状态 | 没有悬停、没有按下（时代行为）；焦点 1px 点线内缩 3px |

没有真 XP 复测，几何来自同版本 comctl32 的抓图，配色来自仓库已有的 XP 调色板实测，
标签高度是估计。

## GNOME 48

GNOME 里「标签页」有三个候选，不能混：`AdwTabBar`（文档标签，headerbar 里，可关可拖）、
`GtkNotebook`（静态标签页 + 面板，选中是 4px 强调色下划线）、`AdwViewSwitcher`（视图切换）。

这一版选 `AdwTabBar` 的 inline 变体，数值来自 libadwaita：

| 项 | 值 |
| --- | --- |
| 标签高 | 34（`min-height: 26` + `padding: 4`） |
| 圆角 | 9（`$button_radius`） |
| 选中底 | `currentColor` 10%；悬停 / 按下 7% / 16% |
| 选中悬停 / 按下 | 13% / 19% |
| 分隔线 | 1px，上下各缩 3px，贴选中标签时隐藏 |
| 条与面板 | inline 变体无边框、无底色 |
| 焦点环 | 2px，强调色 50%，画在单个标签外 |
| 过渡 | `background 150ms ease-in-out` |

GNOME 48 的 `AdwTabBar` 标签条本身是 46 高（34 + 上下各 6）；我们用的是内容区里的
inline 形态，所以只保留 34 的标签高。`GtkNotebook` 的 4px 下划线没有做。

## 键盘

`packages/core/src/behavior/tabs.js` 按主题令牌 `--tabs-arrow-mode` 分三档：

| 主题 | 模式 | 行为 |
| --- | --- | --- |
| Win10 / WinXP / GNOME | `select` | 方向键直接切换并选中；Home / End 到首尾 |
| Win11 | `focus` | 方向键只移焦点、不改选中；空格 / 回车确认 |
| macOS 两代 | `none` | 方向键不动；只能鼠标点 |

这三档来自实测和上游源码。Home / End 原生在这一组控件里基本没有（Win11 官方键位表没有，
Win10/XP 源码不处理，macOS 实测不响应），保留它属于 web 便利。Ctrl+Tab / Ctrl+PageUp 这类
切换快捷键没有做。Tab 进入标签条后的焦点归属：统一落在选中的标签上。

## 验证链路

标签页没有进 macOS 和 Windows 的「原生 vs CSS」对照链：

- macOS 的 `NSTabView` 要放进真实 `NSWindow` 跑 runloop 才画标签文字，现有渲染器是离屏 +
  单行 324×48 的格子，装不下一个带内容面板的 tab view；
- Windows 10 的 tab 控件尺寸（420×200）也不适合按行塞进 324×48 的对照格。

要做的话需要给渲染器加一个「整块控件」的行类型，属于后续工作。

## 已知差距

- Win11 的底部两段 4×4 反向肩膀圆弧没做。
- macOS 两代的悬停 / 按下 / 焦点环是估计；焦点环由系统在整条胶囊外画，没实现。
- Win10 的选中标签抬高 2px、标签与面板的像素对齐是近似。
- XP 没有真机复测，标签高度是估计。
- GNOME 只做 `AdwTabBar` 观感，`GtkNotebook` 的下划线样式没做。
- Ctrl+Tab、Ctrl+PageUp、Alt+数字、可关闭、可拖拽、溢出滚动、垂直标签都没做。
- 没有图标、徽标。

## 来源

- WinUI TabView 文档（键盘、等宽、静态标签）：<https://learn.microsoft.com/en-us/windows/apps/design/controls/tab-view>
- WinUI TabView 模板：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/TabView/TabView.xaml>
- WinUI TabView 主题资源：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/TabView/TabView_themeresources.xaml>
- WinUI 键盘实现：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/TabView/TabView.cpp>
- Win32 标签控件总览：<https://learn.microsoft.com/en-us/windows/win32/controls/tab-controls>
- Wine comctl32 `tab.c`（经典绘制、`SELECTED_TAB_OFFSET = 2`、`DEFAULT_PADDING_X = 6`）：<https://raw.githubusercontent.com/wine-mirror/wine/master/dlls/comctl32/tab.c>
- Apple HIG — Tab views：<https://developer.apple.com/design/human-interface-guidelines/tab-views>
- NSTabView：<https://developer.apple.com/documentation/appkit/nstabview>
- libadwaita `_tab-view.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/widgets/_tab-view.scss>
- libadwaita `_colors.scss`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/stylesheet/_colors.scss>
- libadwaita `adw-tab-bar.c`：<https://gitlab.gnome.org/GNOME/libadwaita/-/raw/main/src/adw-tab-bar.c>
- AdwTabBar 文档：<https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.TabBar.html>
- GtkNotebook 文档：<https://docs.gtk.org/gtk4/class.Notebook.html>
