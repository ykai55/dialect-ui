# Dialect

> Dialect（方言）：同一套组件，各平台各代说自己的方言。

用 HTML + CSS 复刻 Windows、macOS、GNOME 的原生控件。六个平台各一套主题，不合并：Windows 11（Fluent）、
Windows 10（Aero）、Windows XP（classic）、macOS 26（Tahoe）、macOS 11–15、GNOME（Adwaita）。

八种控件：按钮、输入框、多行输入、下拉框（含展开层）、滑块、复选框、单选框、开关。状态有默认、
悬停、按下、焦点、禁用，明暗两套。Windows XP 没有暗色。另有六个扩展组件：独立菜单与右键菜单（见下文「菜单」）、窗口（见下文「窗口」）、分段控件、标签页、进度条和提示气泡。

站点本身纯静态，无构建步骤，无框架依赖。框架包（`@dialect-ui/react`、`@dialect-ui/vue`）在
`packages/` 下用 npm workspaces 管理，见[框架包](#框架包)。

在线示例：<https://ykai55.github.io/dialect-ui/>

## 快速开始

```bash
cd ~/src/dialect-ui
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/index.html`——回忆走廊，一屏一个系统。需要通过 HTTP 打开：
`file://` 下浏览器拒绝加载 `fonts/` 里的 woff2，字体退回系统默认，平台差异就没了。

## 主题切换

```html
<link rel="stylesheet" href="packages/core/css/tokens.css" />
<link rel="stylesheet" href="packages/core/css/components.css" />
<link rel="stylesheet" href="packages/core/css/window.css" />
<link rel="stylesheet" href="packages/core/css/themes/macos.css" />

<div class="panel" data-theme="macos" data-mode="dark">
  <button class="btn">Save changes</button>
</div>
```

用 npm 包时同样的 CSS 走子路径导出：`@dialect-ui/core/css/tokens.css`、
`@dialect-ui/core/css/components.css`、`@dialect-ui/core/css/window.css`、
`@dialect-ui/core/css/themes/macos.css`。

主题挂在容器的 `data-theme` / `data-mode` 上，组件 CSS 不判断平台。新增平台只加一个主题变量文件；
多套主题可以在同一页面共存。

Electron、Tauri 拿到系统信息后改 `<html>` 上的这两个属性：

```js
document.documentElement.dataset.theme = "win11"; // win11 | win10 | winxp | macos | macos15 | gnome
document.documentElement.dataset.mode = "dark";   // light | dark
```

macOS 两代在 Chromium 下按 UA 高熵值的 `platformVersion` 自动选：26 之前 `macos15`，26 及以后
`macos`。Safari、Firefox 拿不到版本号，保持当前选择。

## 框架包

同一套 CSS 和行为层现在拆成三个 npm 包（npm workspaces）：

| 包 | 内容 |
| --- | --- |
| `@dialect-ui/core` | 设计令牌、六个平台主题、组件 CSS、无框架行为层（`initAll` / `createXxx`） |
| `@dialect-ui/react` | React 适配层，peer `react >= 18` |
| `@dialect-ui/vue` | Vue 3 适配层，peer `vue ^3.4` |

已发布到公共 npm（MIT，当前 `0.1.2`）：

- [@dialect-ui/core](https://www.npmjs.com/package/@dialect-ui/core)
- [@dialect-ui/react](https://www.npmjs.com/package/@dialect-ui/react)
- [@dialect-ui/vue](https://www.npmjs.com/package/@dialect-ui/vue)

```bash
npm install @dialect-ui/core @dialect-ui/react   # React
npm install @dialect-ui/core @dialect-ui/vue     # Vue 3
```

适配层只渲染和静态站一模一样的 DOM 契约，行为（打开、定位、键盘、焦点）全部交给 core 的控制器，
不存在第二套实现。组件已覆盖：Theme、Button、TextField（单行 / 多行）、Select、Checkbox、Radio、
Switch、Slider、Progress、SegmentedControl、Tabs、Tooltip（TooltipProvider）、Menu、ContextMenu、
Window。组件 API 和状态约定见 [docs/framework-packages.md](docs/framework-packages.md)。

```bash
npm install
npm run build        # 构建两个框架包
npm test             # 站点行为测试 + 框架包浏览器验收
```

```tsx
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
import "@dialect-ui/core/css/themes/win11.css";
import { Theme, Button, TextField, Select } from "@dialect-ui/react";

<Theme theme="win11" mode="dark">
  <Button variant="primary">Save changes</Button>
  <TextField label="Email address" placeholder="name@example.com" />
  <Select options={options} defaultValue="a" onValueChange={console.log} />
</Theme>
```

Vue 3 用 `v-model` 直接绑值：

```ts
import { Theme, Button, TextField, Select } from "@dialect-ui/vue";
```

```html
<Theme theme="win11" mode="dark">
  <Button variant="primary">Save changes</Button>
  <TextField v-model="email" label="Email address" />
  <Select v-model="choice" :options="options" />
</Theme>
```

包结构、状态归属约定、构建/测试方式和后续迁移步骤写在
[docs/framework-packages.md](docs/framework-packages.md)。

## 页面与工具

| 页面 | 用途 |
| --- | --- |
| `index.html` | 回忆走廊（默认页）。一屏一个系统，整页换成那个时代的桌面、窗口框和任务栏 / Dock；顶部 HUD 里是时代进度和明暗切换，滚动或方向键切换。 |
| `demo/harness.html` | 状态矩阵。以类名固定五种状态，便于整体查看。 |
| `demo/compare.html` | 参考图画廊。左侧为系统原生截图，右侧为 CSS 复刻。 |
| `demo/frames.html` | 动效逐帧定格，供 `tools/frames.sh` 使用。 |
| `verify/verify.html` | macOS 26 对齐页，供 `tools/verify-macos.sh` 使用。 |
| `verify/verify-macos15.html` | macOS 11–15 对齐页，供 `tools/verify-macos15.sh` 使用。 |
| `verify/verify-win10.html` | Windows 10 对齐页，供 `tools/verify-win10.sh` 使用。 |
| `verify/verify-winxp.html` | Windows XP 对齐页，供 `tools/verify-winxp.sh` 使用。 |

走廊里的鼠标指针是开源复刻资源，来源、许可和转换方式见
[assets/cursors/SOURCES.md](assets/cursors/SOURCES.md)。

截图与核对由 `tools/` 下的脚本完成：

```bash
bash tools/shoot.sh           # 各平台 × 明暗整页截图
bash tools/verify-macos.sh    # macOS 26：原生 vs CSS，逐控件对照
bash tools/verify-macos15.sh  # macOS 11–15：同上
bash tools/verify-win10.sh    # Windows 10：同上
bash tools/verify-winxp.sh    # Windows XP：同上
bash tools/frames.sh          # 动效逐帧定格
bash tools/record-native.sh   # 录制原生控件动画（需要屏幕录制权限）
bash tools/test.sh            # 站点行为测试
npm run build                 # 构建 @dialect-ui/react / @dialect-ui/vue
bash tools/test-frameworks.sh # 框架包浏览器验收
```

产物在 `shots/`，2x。verify 脚本要带 Pillow 的 Python（`PYTHON=/path/to/python3`）。对齐页的行序和
行高必须和 `tools/compare-*.py` 的 `ROWS` 一致，错一行后面全错位。

`bash tools/test.sh` 跑 `test/*.test.html`。没有测试框架：每个测试页在 DOM 上跑断言，结果写进
`<pre id="result">`，脚本用 `--dump-dom` 读，出现 `FAIL` 就非零退出。覆盖下拉框的打开、选值、关闭、
键盘操作和 Esc，菜单的打开、方向键循环、Home / End、type-ahead、右键与 ContextMenu 键、视口夹取、
滚动缩放关闭、焦点归还，文本框右键菜单的选区 / 只读 / 禁用分支，分段控件的单选语义、roving tabindex、
方向键循环与禁用段跳过，标签页的 tablist / tabpanel 关联、roving tabindex、方向键分档（Win11 只移焦点、macOS 不动）
与面板显隐，下拉框的 Home/End 与 type-ahead，滑块的 Home/End/PageUp/PageDown，进度条的确定 / 不确定态
与六平台高度差异，提示气泡的延迟出现、翻转、Esc / 滚动关闭，以及六个主题下复选框禁用态的悬停、按下不变
和焦点框可见性。键盘模型和焦点顺序的完整说明见 [docs/keyboard-notes.md](docs/keyboard-notes.md)。

根 `index.html`（走廊）带 `?era=winxp&mode=dark` 可直接进某个时代、固定明暗，方便截图。

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

## 菜单

菜单是行为层组件，不算八种控件里的一个。`.menu` 的外观令牌六个主题都有，独立菜单、右键菜单和
下拉框展开层共用 `packages/core/src/behavior/menu.js` 的行为。

```html
<div data-menu>
  <button type="button" class="btn" data-menu-trigger>Actions</button>
  <ul class="menu" popover="manual">
    <li class="menu__item">New window</li>
    <li class="menu__item" aria-disabled="true">Duplicate</li>
    <li class="menu__separator" role="separator"></li>
    <li class="menu__item">Rename<span class="menu__shortcut">F2</span></li>
  </ul>
</div>
```

右键区域放在同一个 `[data-menu]` 容器里，加 `data-menu-context`；也可以直接用脚本
`createMenu(menuEl, options)`（从 `@dialect-ui/core` 导入，或静态站里用 `initAll()` 自动初始化）
控制打开位置和选中回调，参数写在 `packages/core/src/behavior/menu.js` 开头。

键盘模型按原生菜单的通用做法：上下键在可导航项之间循环，Home / End 到首尾，Enter 或空格激活，
Esc 关闭并把焦点还给打开它的元素，Tab 关闭后焦点继续往后走，输入字母按前缀跳转（600ms 内的输入
算一次前缀）。禁用项和分隔线不参与导航。子菜单和可勾选项还没做。

这套键位是三家原生的并集，不是逐平台复刻：Home/End 和 600ms 的 type-ahead 缓冲是 web 便利，
Win10 / WinXP / macOS 的「方向键不循环」只是估计，没有为估计值拆行为。六平台的键位对照、子菜单
参数和分隔线内缩的估计值都在 [docs/menu-behavior.md](docs/menu-behavior.md)。

弹层用 `popover="manual"`，关不关由脚本判断：点菜单外、滚动、窗口缩放都直接关，位置只在打开时算
一次。贴着视口边缘打开会夹回可视区，盖住触发器时翻到上方。

独立菜单不接管浏览器默认右键菜单；窗口组件会在窗口内统一接管，见下文「窗口」。

输入框和多行输入接了自己的右键菜单：[packages/core/src/behavior/text-menu.js](packages/core/src/behavior/text-menu.js) 复用 `.menu` 外观，右键时按
选区状态决定哪些项可用。Cut / Copy / Paste / Delete / Select All 五项，没选中时前三项变灰，只读字段
只留 Copy 和 Select All，禁用字段不弹。Paste 要读剪贴板，浏览器没授权时这一项也是灰的，不是菜单坏了。

```html
<ul class="menu" popover="manual" data-text-menu>
  <li class="menu__item" data-action="cut">Cut</li>
  …
</ul>
```

同一个容器里的 `.field__input` 会自动绑定，菜单跟着容器的 `data-theme` 走。

## 窗口

窗口组件把标题栏、窗口按钮和内容区放在一起，也接管窗口内的右键。`data-window` 自动初始化，
`data-window-frame` 选窗口按钮档位（`win10` / `win11` / `winxp` / `macos` / `macos15` / `gnome`）。

```html
<div class="window" data-window data-window-frame="win11">
  <div class="window__bar">
    <div class="window__title">Settings</div>
    <div class="window__controls">
      <button type="button" class="window__caption" data-window-action="minimize">–</button>
      <button type="button" class="window__caption window__caption--close" data-window-action="close">✕</button>
    </div>
  </div>
  <div class="window__body">…</div>
</div>
```

窗口内不弹浏览器右键；文本框右键会自动生成 Cut / Copy / Paste / Delete / Select All 菜单；禁用控件上的
右键也不会漏出浏览器菜单。`window:action` 由宿主处理最小化 / 关闭。细节见
[docs/window-component.md](docs/window-component.md)。

## 分段控件

一排互斥按钮，一次选一个。六个平台里只有 macOS 和 GNOME（48+）有原生分段控件，Windows 三代的取值
来自最接近的原生组合或扩展控件，依据逐条记在 [docs/segmented-notes.md](docs/segmented-notes.md)。

```html
<div class="segmented" data-segmented role="radiogroup" aria-label="Interval">
  <button type="button" class="segmented__item" role="radio" aria-checked="true"
          data-value="day">Day</button>
  <button type="button" class="segmented__item" role="radio" aria-checked="false"
          data-value="week">Week</button>
  <button type="button" class="segmented__item" role="radio" aria-checked="false"
          data-value="month">Month</button>
</div>
```

选中变化时容器上冒泡 `segmented:change`，`detail` 是 `{ item, index, value }`。键盘按 web 单选组
（WAI-ARIA radiogroup）做：整组一个 Tab 站，方向键移动并立即选中，Home / End 到首尾，空格 / 回车
确认。这套不是六家通用：macOS 实测方向键不切换，GNOME 是 Tab 逐段走，差异写在
[docs/segmented-notes.md](docs/segmented-notes.md) 的键盘一节。

macOS 两代的选中态完全不同，是两个主题文件里的两套值：26 是强调色实心块 + 白字，11–15 是白色
pill 浮起 + 黑字。这两套都跑过「原生 vs CSS」逐控件对照，产物在 `shots/verify/macos/segmented-*.png`
和 `shots/verify/macos15/segmented-*.png`。

## 标签页

横向、不可关闭的标签页。六个平台的形态差得很远：macOS 两代是「居中胶囊压在圆角面板上」，
Win11 是顶圆角 8 的贴边标签、实底 + 1px 描边，Win10 / XP 是 Win32 标签控件（白标签连面板、
或经典 3D 软边），GNOME 是 AdwTabBar 的圆角块。每个平台的取值和依据等级记在
[docs/tabs-notes.md](docs/tabs-notes.md)。

```html
<div class="tabs" data-tabs>
  <div class="tabs__list" role="tablist" aria-label="Sections">
    <button type="button" class="tabs__tab" role="tab" aria-selected="true">General</button>
    <button type="button" class="tabs__tab" role="tab" aria-selected="false">Advanced</button>
  </div>
  <div class="tabs__panel"><p>General settings live here.</p></div>
  <div class="tabs__panel" hidden><p>Advanced settings live here.</p></div>
</div>
```

标签和面板按顺序配对，所以不用手写 `id` / `aria-controls`；同一段 markup 复制到六个主题面板里
也不会撞 id。切换时容器上冒泡 `tabs:change`，`detail` 是 `{ tab, panel, index, value }`。

键盘分三档，由主题令牌 `--tabs-arrow-mode` 控制：Win10 / XP / GNOME 方向键直接切换并选中，
Win11 方向键只移焦点、空格或回车确认，macOS 两代方向键不动、只能鼠标点。这三档来自实测和
上游源码；Home / End 是 web 便利，原生基本没有。Ctrl+Tab、Ctrl+PageUp 这类切换快捷键没做。

标签页没有进「原生 vs CSS」对照链：macOS 的 `NSTabView` 要放进真实 `NSWindow` 跑 runloop
才画标签文字，现有渲染器是离屏 + 324×48 单行格子，装不下带内容面板的 tab view；Win10 的
标签控件也是 420×200 的整块。要做需要给渲染器加「整块控件」的行类型。

## 进度条

确定进度靠 `--progress-value`，不确定态加 `data-indeterminate`。六个平台的形态差别很大：
macOS 是 8pt / 6pt 的胶囊细条，Win11 是 3px 强调色细条压在 1px 轨道上，Win10 是 16px 高的绿色
方块条（`#06B025` + `#BCBCBC` 边），XP 是 17px 凹槽加 `#0A246A` 分段填充，GNOME 是 8px 胶囊。
数值和依据等级在 [docs/progress-tooltip-notes.md](docs/progress-tooltip-notes.md)。

```html
<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100"
     aria-valuenow="40" style="--progress-value: 40%">
  <div class="progress__fill"></div>
</div>
```

macOS 26 和 11–15 的确定进度是 `NSProgressIndicator` 离屏渲染实测的（26 是 8 高、轨道
`#DEDEDE`；11–15 是 6 高、轨道 `#DBDBDB`）。不确定态统一用滑动的光带，macOS 的渐变光带 /
条纹、Win11 的双 pill 这些原生动画没做。

## 提示气泡

`data-tooltip` 的元素自动绑定，同一主题容器里放一个 `[data-tooltip-layer]`：

```html
<div data-theme="win11">
  <button type="button" data-tooltip="Saves your changes">Save</button>
  <div class="tooltip" role="tooltip" data-tooltip-layer hidden></div>
</div>
```

悬停后延迟出现（只有 Win11 主题在键盘聚焦时也显示），离开 / 失焦 / Esc / 滚动 / 缩放 /
按下鼠标时关闭；上方放不下翻到下方，左右夹在视口内；显示时给触发元素加 `aria-describedby`。
延迟和外观按平台给：macOS 浅色浮层、约 1s 延迟；GNOME 深色 80% 黑、圆角 9（上游 SCSS 值）；
Win10 是白底灰字直角气泡，XP 是淡黄底黑边。

## 已知限制

字体是替代品。Selawik 是微软官方的 Segoe 替代，Cantarell 是 GNOME 默认字体，用来在别的系统上看平台
差异；真机上还是系统字体。字体渲染（次像素灰度、hinting）复刻不了。

行为层覆盖了菜单、下拉框、文本框右键菜单、分段控件、标签页、滑块键盘补全和提示气泡；焦点顺序按
DOM 顺序，分段控件和标签页用 roving tabindex，菜单用活动项描述，细节见
[docs/keyboard-notes.md](docs/keyboard-notes.md)。

动画时长只有 macOS 实测过，Windows 160ms、GNOME 200ms 是估的。高 DPI 缩放没做。Mica、玻璃、模糊
这类材质不做。

菜单的分隔线内缩、禁用项文字色、快捷键颜色没有单独对过原生图，主题文件里逐项标了「估计」；只有
Windows XP 的 `#808080` 是 `COLOR_GRAYTEXT` 系统常量。深色主题的这几项也是按浅色推的。

分段控件里 Windows 三代都不是原生控件：Win11 用的是 CommunityToolkit 扩展控件的值，Win10 / XP 是
按按钮组拼的，选中态没有原生像素可对。macOS 两代的悬停、按下、焦点环也是估计，离屏渲染拿不到这些
状态。GNOME 47 的 `.linked` 外观和 macOS 11–15 的 `.separated` 样式都还没做。

标签页的 macOS 两代没有原生对照，悬停 / 按下 / 焦点环是估计；Win11 的底部两段 4×4 反向肩膀
圆弧没做；Win10 的选中标签抬高 2px 是近似；XP 没在真机复测，标签高度是估计；GNOME 只做
AdwTabBar 观感，GtkNotebook 的下划线样式没做。可关闭标签、拖拽排序、溢出滚动、垂直标签都没做。

进度条的不确定态统一成一条滑动光带，原生各家不同的动画没做；Win11 的进度条是源码值、
Win10 是 uxtheme 实测色但尺寸是估计，XP 的分块宽和高度是估计。提示气泡只有 Win10 和 GNOME
有实测 / 源码依据，其余平台的底色、圆角和延迟都是估计；没有箭头、跟随指针和多行富文本。

覆盖的版本是定的：Windows 10 22H2、GNOME 47/48、macOS 26 和 11–15。参考图只有浅色，深色按同一套
令牌推的，没和真机逐项对过。各平台细节差异见 `docs/*-notes.md`。

## 路线图

这一轮路线图上的组件都落地了：独立菜单与右键菜单、分段控件、标签页、进度条、提示气泡，
行为层的焦点顺序与键盘也补齐了。接下来是收尾：

1. 给标签页补「整块控件」的 verify 行类型，让 macOS / Win10 的标签页也能进原生对照链。
2. Windows 11 要上真机跑 uxtheme 管线，或把 WinUI 3 离屏渲染跑通。GNOME 目前靠官方截图和上游 SCSS。
3. 拆包已开工：`@dialect-ui/core` 收编了 CSS、字体和行为层，React / Vue 的 Theme / Button /
   TextField / Select 纵切落地；剩余组件按 [docs/framework-packages.md](docs/framework-packages.md)
   的模子铺开。桌面壳接入留到组件层稳定之后。

## 工程约定

主题文件只声明自定义属性；组件 CSS 不出现平台名，只读令牌。各平台各做各的，不合并，也不跨平台搬
数值。

代码分三层：`packages/core` 是 CSS + 无框架行为层的唯一实现；`packages/react`、`packages/vue` 是
只渲染 DOM 契约、挂载 core 控制器的薄适配层；根目录的 `css/`、`js/` 只剩站点自己的壳（走廊、
harness）。参考图放本地 `reference/shots/<平台>/`，不入库，来源记在 `reference/MANIFEST.md`。
更细的约定见 `AGENTS.md`。

## 许可

MIT，见 [LICENSE](LICENSE)。仓库和三个框架包（`@dialect-ui/core`、`@dialect-ui/react`、
`@dialect-ui/vue`）都按这个许可证发布。
