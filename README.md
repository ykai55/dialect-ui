# Dialect

> Dialect（方言）：同一套组件，各平台各代说自己的方言。

用 HTML + CSS 复刻 Windows、macOS、GNOME 的原生控件。六个平台各一套主题，不合并：Windows 11（Fluent）、
Windows 10（Aero）、Windows XP（classic）、macOS 26（Tahoe）、macOS 11–15、GNOME（Adwaita）。

八种控件：按钮、输入框、多行输入、下拉框（含展开层）、滑块、复选框、单选框、开关。状态有默认、
悬停、按下、焦点、禁用，明暗两套。Windows XP 没有暗色。

纯静态，无构建步骤，无框架依赖。

在线示例：<https://ykai55.github.io/dialect-ui/>

## 快速开始

```bash
cd ~/src/dialect-ui
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/index.html`。需要通过 HTTP 打开：`file://` 下浏览器拒绝加载 `fonts/`
里的 woff2，字体退回系统默认，平台差异就没了。

## 主题切换

```html
<link rel="stylesheet" href="css/tokens.css" />
<link rel="stylesheet" href="css/components.css" />
<link rel="stylesheet" href="css/theme-macos.css" />

<div class="panel" data-theme="macos" data-mode="dark">
  <button class="btn">Save changes</button>
</div>
```

主题挂在容器的 `data-theme` / `data-mode` 上，组件 CSS 不判断平台。新增平台只加一个主题变量文件；
多套主题可以在同一页面共存。

Electron、Tauri 拿到系统信息后改 `<html>` 上的这两个属性：

```js
document.documentElement.dataset.theme = "win11"; // win11 | win10 | winxp | macos | macos15 | gnome
document.documentElement.dataset.mode = "dark";   // light | dark
```

macOS 两代在 Chromium 下按 UA 高熵值的 `platformVersion` 自动选：26 之前 `macos15`，26 及以后
`macos`。Safari、Firefox 拿不到版本号，保持当前选择。

## 页面与工具

| 页面 | 用途 |
| --- | --- |
| `index.html` | 交互版。切换平台、明暗与并排对比；悬停、按下、焦点状态可交互。 |
| `demo/harness.html` | 状态矩阵。以类名固定五种状态，便于整体查看。 |
| `demo/compare.html` | 参考图画廊。左侧为系统原生截图，右侧为 CSS 复刻。 |
| `demo/frames.html` | 动效逐帧定格，供 `tools/frames.sh` 使用。 |
| `verify/verify.html` | macOS 26 对齐页，供 `tools/verify-macos.sh` 使用。 |
| `verify/verify-macos15.html` | macOS 11–15 对齐页，供 `tools/verify-macos15.sh` 使用。 |
| `verify/verify-win10.html` | Windows 10 对齐页，供 `tools/verify-win10.sh` 使用。 |
| `verify/verify-winxp.html` | Windows XP 对齐页，供 `tools/verify-winxp.sh` 使用。 |

截图与核对由 `tools/` 下的脚本完成：

```bash
bash tools/shoot.sh           # 各平台 × 明暗整页截图
bash tools/verify-macos.sh    # macOS 26：原生 vs CSS，逐控件对照
bash tools/verify-macos15.sh  # macOS 11–15：同上
bash tools/verify-win10.sh    # Windows 10：同上
bash tools/verify-winxp.sh    # Windows XP：同上
bash tools/frames.sh          # 动效逐帧定格
bash tools/record-native.sh   # 录制原生控件动画（需要屏幕录制权限）
bash tools/test.sh            # 交互测试
```

产物在 `shots/`，2x。verify 脚本要带 Pillow 的 Python（`PYTHON=/path/to/python3`）。对齐页的行序和
行高必须和 `tools/compare-*.py` 的 `ROWS` 一致，错一行后面全错位。

`bash tools/test.sh` 跑 `test/*.test.html`。没有测试框架：每个测试页在 DOM 上跑断言，结果写进
`<pre id="result">`，脚本用 `--dump-dom` 读，出现 `FAIL` 就非零退出。覆盖下拉框的打开、选值、关闭、
键盘操作和 Esc，以及六个主题下复选框禁用态的悬停、按下不变。

## 数值来源

判断像不像不能靠记忆和二手截图。能拿到系统本身，就以系统为准：把原生控件离屏渲染成 PNG，和 CSS
逐控件摆在一起比。

依据分四级：系统本身（AppKit 离屏渲染、录屏抽帧）> 官方文档截图 > 上游源码（libadwaita 的 SCSS、
Fluent 的 token）> 观感估计。主题文件里估的值都标了。

| 平台 | 依据 | 细节 |
| --- | --- | --- |
| macOS 26 | 系统本身（AppKit 离屏渲染） | [docs/verification.md](docs/verification.md) |
| macOS 11–15 | 系统本身（AppKit 兼容外观路径，不是真 15.x 机器） | [docs/macos15-native-notes.md](docs/macos15-native-notes.md) |
| Windows 10 | 系统本身（uxtheme 离屏 + 原生状态矩阵） | [docs/windows-win10-notes.md](docs/windows-win10-notes.md) |
| Windows XP | 系统本身（GDI 实测） | [docs/winxp-native-notes.md](docs/winxp-native-notes.md) |
| Windows 11 | 上游源码 + 官方截图，尚未实测 | [docs/windows-winui3-notes.md](docs/windows-winui3-notes.md) |
| GNOME | 上游 SCSS + 官方截图 | [docs/verification.md](docs/verification.md) |

Windows 11 还没真机跑过，这组值来自上游源码和官方截图。macOS 26 的强调色是 PNG 里直接读的 raw
Generic RGB，和 macos15 的 sRGB 值数值不同，不是笔误，统一色彩空间还没做。macOS 勾选没有动画，
录屏逐帧确认过，一帧灰变蓝，所以 `--check-duration` 是 0ms。Windows 10 的开关取自 Win10 UWP 的
ToggleSwitch（[docs/win10-switch-evidence.md](docs/win10-switch-evidence.md)）；Windows XP 没有开关
控件，`.switch` 复用复选框外观。

## 平台差异

控件高度、圆角、字体与焦点样式对观感影响最大：

| | Windows XP | Windows 10 | Windows 11 | macOS | GNOME |
| --- | --- | --- | --- | --- | --- |
| 控件高度 | 23px | 23px | 32px | 24px | 34px |
| 圆角 | 0（方角） | 0（方角） | 4px | 按钮 5px / 输入框 6px | 9px |
| 字体 | Tahoma 11px | Segoe UI 12px | Segoe UI Variable 14px | SF Pro 13px | Cantarell 14.67px / bold |
| 按钮 | `#C0C0C0` + 2px 四色斜面 | `#E1E1E1` + 1px `#ADADAD` 描边 | 近白 + 底部 1px 内描边 | 灰胶囊，无描边 | 文字色 10% 半透明，无边框 |
| 焦点 | 1px 点线，内缩 3px | 1px 点线，内缩 2px | 2px 硬描边，外扩 1px | 3.5px 蓝色外发光 | 2px 半透明描边，内缩 2px |
| 按下 | 2px 斜面翻向 | 浅蓝底 `#CCE4F7` | 背景变浅，文字转灰 | 背景压暗 | 填充加深到 30% |
| 输入框聚焦 | 外观不变，只有插入符 | 外观不变，只有插入符 | 2px 强调色下划线 | 描边变蓝 + 外发光 | 内侧 2px 强调色描边 |

Windows 输入框底下那条强调色下划线是它的标志，用 `::after` 和 `--field-underline-w` 做，别的平台
把变量设成 0 就关掉。

macOS 两代差得多，所以是两个主题文件：26 按钮是灰胶囊、开关 54×24、复选框 16px；11–15 白底加描边、
开关 38×22、复选框 14px、主按钮纵向渐变。数值在两个主题文件的注释里。

## 已知限制

字体是替代品。Selawik 是微软官方的 Segoe 替代，Cantarell 是 GNOME 默认字体，用来在别的系统上看平台
差异；真机上还是系统字体。字体渲染（次像素灰度、hinting）复刻不了。

行为层只做了下拉框：能展开、能用键盘选、点外面或 Esc 关。菜单位置只在打开时算一次，滚动或缩放会
关掉。其他控件还是浏览器原生行为。

动画时长只有 macOS 实测过，Windows 160ms、GNOME 200ms 是估的。高 DPI 缩放没做。Mica、玻璃、模糊
这类材质不做。

覆盖的版本是定的：Windows 10 22H2、GNOME 47/48、macOS 26 和 11–15。参考图只有浅色，深色按同一套
令牌推的，没和真机逐项对过。各平台细节差异见 `docs/*-notes.md`。

## 路线图

先做行为层：键盘模型、焦点顺序、右键菜单、按下态。这些比配色更影响体感，现在只有视觉。然后补下拉
展开层、分段控件、标签页、进度条、提示气泡。

Windows 11 要上真机跑 uxtheme 管线，或把 WinUI 3 离屏渲染跑通。GNOME 目前靠官方截图和上游 SCSS。

最后拆包：主题按需引入，组件按需引，给桌面壳留一层封装。

## 工程约定

主题文件只声明自定义属性；组件 CSS 不出现平台名，只读令牌。各平台各做各的，不合并，也不跨平台搬
数值。

参考图放本地 `reference/shots/<平台>/`，不入库，来源记在 `reference/MANIFEST.md`。更细的约定见
`AGENTS.md`。
