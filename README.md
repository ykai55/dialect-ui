# Platform UI

一套用 HTML + CSS 实现各平台原生观感的 UI 组件库：Windows 11（Fluent）、Windows 10（Aero）、
Windows XP（2000 / XP classic）、macOS（Tahoe）、GNOME（Adwaita）。Windows 10 和 Windows XP
这两套的数值来自原生状态矩阵实测，不是估值（见 `docs/verification.md`）。
目前覆盖按钮、输入框、多行输入、下拉框、滑块、复选框、单选框、开关。
纯静态，没有构建步骤，不依赖任何框架。

同一个组件，换一个 `data-theme` 就换成另一个平台的样子；明暗、强调色、密度都跟着主题走。

在线示例：<https://ykai55.github.io/platform-ui/>

## 跑起来

```bash
cd ~/src/platform-ui
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:4173/index.html>。

> 必须用 HTTP 打开。直接双击 `index.html` 走 `file://` 时，浏览器会因为跨源策略拒绝加载
> `fonts/` 里的 woff2，几个平台会退化成同一个系统字体，平台差异就看不出来了。

页面：

| 页面 | 用途 |
| --- | --- |
| `index.html` | 交互版。切平台、切明暗、全部平台并排；悬停 / 按下 / 焦点是真的，可以直接点。 |
| `harness.html` | 状态矩阵。把 hover / active / focus / disabled 用类名定格，一屏看全。 |
| `compare.html` | 参考图画廊：左边系统原生截图，右边复刻结果。 |
| `verify.html` | 对齐页：和 AppKit 渲染出来的原生控件逐行对齐，给 `tools/verify-macos.sh` 用。 |
| `verify-win10.html` | 对齐页：和 Win32/uxtheme 渲染出来的原生控件逐行对齐，给 `tools/verify-win10.sh` 用。 |
| `verify-winxp.html` | 对齐页：和 XP classic 渲染出来的原生控件逐行对齐，给 `tools/verify-winxp.sh` 用。 |
| `frames.html` | 动效逐帧定格页，给 `tools/frames.sh` 用。 |

生成物：

```bash
bash tools/shoot.sh          # 各平台 × 明暗的整页截图
bash tools/verify-macos.sh   # 原生 vs CSS 的单组件对照图（AppKit）
bash tools/verify-win10.sh   # 原生 vs CSS 的单组件对照图（Win32 / uxtheme）
bash tools/verify-winxp.sh # 原生 vs CSS 的单组件对照图（XP classic）
bash tools/frames.sh         # 动效胶片图（CSS 侧）
bash tools/record-native.sh  # 录原生控件动画（需要屏幕录制权限）
bash tools/test.sh           # 交互测试
```

产物在 `shots/`，2 倍像素密度。

## 结构

```
css/tokens.css        兜底令牌 + 两个 Web 字体（Selawik / Cantarell）
css/components.css    组件结构与状态机，只读令牌，没有任何平台判断
css/theme-win11.css   只声明变量
css/theme-win10.css   只声明变量（数值来自原生状态矩阵实测）
css/theme-winxp.css 只声明变量（XP classic，数值来自原生状态矩阵实测）
css/theme-macos.css   只声明变量
css/theme-gnome.css   只声明变量
css/base.css          演示页外壳（中性，不参与平台主题）
js/app.js             平台识别 + 主题切换
js/harness.js         状态矩阵生成
tools/               截图、原生渲染对照、录制与抽帧
docs/verification.md 对齐方法与实测值
reference/            原生参考图（不入库）与来源清单
```

## 测试

`bash tools/test.sh` 跑所有 `test/*.test.html`。没有测试框架，也没有依赖：
每个测试页在自己的 DOM 上跑断言，把结果写进 `<pre id="result">`，脚本用
`--dump-dom` 读出来，有 `FAIL` 就非零退出。

现在只覆盖下拉框：打开、选值、关闭、`aria-selected`、方向键、回车、Esc。
这部分最容易出现「画得出来但点不动」的问题——之前就漏过一次 `choose` 函数，
页面看起来完全正常。

## 切换是怎么做到的

主题只挂在容器的两个属性上：

```html
<section data-theme="win11" data-mode="dark">…</section>
```

`data-theme` 选平台，`data-mode` 选明暗。所有颜色、圆角、高度、字体都是 CSS 自定义属性，
主题文件只负责给这些属性赋值。所以：

- **组件不认识平台**。加一个平台只是多一个变量文件。
- **同一个页面里可以并存**。`index.html` 的并排模式就是五个容器各带一套属性，互不干扰。
- **桌面壳接管很简单**。Electron 里拿到 `nativeTheme.themeSource` 和系统信息后，改 `<html>`
  上的这两个属性即可；Tauri 同理。组件层一行都不用动。

```js
document.documentElement.dataset.theme = platform; // 'win11' | 'win10' | 'classic' | 'macos' | 'gnome'
document.documentElement.dataset.mode = dark ? 'dark' : 'light';
```

## 平台之间差在哪

这些参数决定「一眼像不像」，比配色更关键：

| | Windows XP | Windows 10 | Windows 11 | macOS | GNOME |
| --- | --- | --- | --- | --- | --- |
| 控件高度 | 23px | 23px | 32px | 24px | 34px |
| 圆角 | 0（方角） | 0（方角） | 4px | 按钮 5px，输入框 6px | 9px |
| 字体 | Tahoma 11px | Segoe UI 12px | Segoe UI Variable 14px | SF Pro 13px | Cantarell 14.67px / bold |
| 按钮底色 | `#C0C0C0` + 2px 四色斜面 | `#E1E1E1` + 1px `#ADADAD` 全描边 | 近白 + 底部 1px 深色内描边 | 灰胶囊（`rgba(0,0,0,.1)`），无描边 | 文字色 10% 半透明，无边框 |
| 焦点 | 1px 点线，内缩 3px | 1px 点线，内缩 2px | 2px 硬描边，外扩 1px | 3.5px 半透明蓝色外发光 | 2px 半透明描边，内缩 2px |
| 按下反馈 | 斜面翻向 | 浅蓝底 `#CCE4F7` | 背景变浅，文字转灰 | 背景压暗 | 填充加深到 30% |
| 输入框聚焦 | 外观不变，只有插入符 | 外观不变，只有插入符 | 只加一条 2px 强调色下划线 | 描边变蓝 + 外发光 | 内侧 2px 强调色描边 |

输入框那条下划线是 Windows 的签名动作，靠一个 `::after` 加 `--field-underline-w` 实现，
其他平台把这个变量设成 0 就自动消失。

## 对齐记录

这些是拿实测值和参考图纠正过的，细节的依据在 `docs/verification.md`：

- **macOS 输入框**：白底、6px 圆角、1px 极淡描边（`rgba(0,0,0,.18)`，在 #ECECEC 上约 #D1D1D1）；
  聚焦时描边变蓝、外加一圈光。
- **macOS 按钮**：5px 圆角的灰胶囊，无描边、无投影；主按钮的蓝实测是 `#0A60FE`。
- **macOS 复选框 / 单选框**：16px，未选中灰实心，选中蓝底白勾；禁用选中是浅蓝底。
- **macOS 开关**：54×24，滑块是 32×20 的胶囊（不是圆），约 140ms 滑到位并同步换色。
- **macOS 的勾没有动画**：录屏逐帧确认，一帧就从灰变蓝，所以 `--check-duration` 是 0ms。
- **GNOME 按钮**：没有边框，底色是「当前文字色 10%」的半透明填充，字重 bold。
- **GNOME 复选框**：14px 可见方块，外加 3px 留白；未选中是一条 2px 内描边。
- **Windows 输入框**：底部内描边要更深，否则整块面板会显得平。
- **Windows 10 的整套数值是实测的**：按钮 `#E1E1E1` + 1px `#ADADAD`、方角、23px 高；输入框白底
  1px `#ABADB3`（聚焦只有插入符，外观不变）；下拉框右侧是 17px 箭头格 + 1px 分隔线；多行输入描边
  用更深的 `#7A7A7A`、聚焦转 `#0078D7`；勾选框 / 单选框 13×13，白底深色勾；滑块轨道 4px、滑块
  11×19 的竖条。暗色下按钮 `#333` / 输入框 `#383838`，只有一部分控件能被系统变暗。
- **Windows 10 的开关是借来的**：Win32/uxtheme 没有开关部件，这一颗取 Win10 UWP 的 ToggleSwitch，
  来源和量值在 `docs/win10-switch-evidence.md`。
- **Windows XP的整套数值也是实测的**：`#C0C0C0` 底、2px 四色斜面（上/左 `#FFFFFF`+`#DFDFDF`，
  下/右 `#808080`+`#000000`）、按下斜面反向、输入框/勾选框/单选框 2px 凹陷斜面、控件高 23px、
  复选框 13×13、单选框 12×12（点 4×4）、Tahoma 8pt、没有悬停态、也没有勾选动画；按下时盒内白底变面灰。
  下拉框 21px 高、17×17 箭头格嵌在边框里；
  滑块是 4px 凹槽（原生左右缩进 8px，CSS 用满控件宽度）+ 11×21 凸起滑块。菜单是灰底 + 2px 凸起边框，选中项深蓝底白字。
  采样和结构见 `docs/winxp-native-notes.md`。

复选框的对勾用 SVG 画在 `viewBox` 里，任何尺寸都居中；描边粗细由 `--check-stroke` 控制。

## 已知差距

当前版本的边界，别指望它和真控件逐像素一致：

- **字体是替代品**。Selawik（微软官方 Segoe 替代，OFL）和 Cantarell（GNOME 默认字体，OFL）
  是为了让非 Windows / 非 GNOME 机器上也能看出平台差异；在真机上会命中系统字体。
  字体渲染（次像素灰度、hinting）没法复刻。
- **只有可见状态**。悬停、按下、焦点、禁用做了；键盘导航、右键菜单、滚动条、文本选择、
  输入法候选框、拖拽都还是浏览器的原生行为。
- **行为层刚开了个头**。下拉菜单能展开、能键盘选择、点外部或按 Esc 会关，但菜单定位是打开时算一次，
  不跟滚动走；其它控件（标签页、菜单栏）还没有对应行为。
- **动画只有 macOS 量过**。Windows 的 160ms、GNOME 的 200ms 是估的，没有录制依据。
- **Windows 的 Mica 背景没做**，现在是一条纯色。
- **Linux 只跟了 Adwaita 默认值**。GNOME 换主题色、KDE、XFCE 不在范围内。
- **版本只覆盖一代**。macOS 按 26（Tahoe）做的，GNOME 按 47/48 做的，Windows 10 按 22H2 做的；
  别的版本要另加一套变量。
- **Windows 10 的暗色不完整**。原生 Win32 暗色只覆盖按钮、输入框、多行输入、下拉框，所以那几组
  按原生暗色值写；勾选框、单选框、滑块在系统里根本没有暗色变体，主题让它们沿用浅色外观（暗色下
  标签文字变白），跟真实 Win10 暗色应用的行为一致。
- **Windows 10 的滑块底部小缺口没画**。原生 thumb 是圆角竖条 + 底部一个小三角缺口，CSS 只做了
  圆角竖条。
- **Windows XP没有暗色、也没有悬停态**。那个年代就是这样：暗色档沿用浅色令牌，hover 状态等同
  默认态，按下只把 2px 斜面反过来。
- **Windows XP的开关是解释，不是原生**。2000 / XP classic 里没有开关控件，主题按同期 3D 控件
  语言做成「凹槽 + 凸起滑块」，只靠滑块位置表示状态，没有原生像素依据。
- **Windows XP的滑块是近似**。原生是 comctl32 trackbar（立体通道 + 刻度 + 凸起滑块），
  CSS 版通道和滑块按实测值画，但刻度线和 channel 的立体细节没有完全复刻。
- **参考图只有浅色**。深色是照同一套令牌推的，没和真机对过；Win10 和 Windows XP那两套有
  原生截图对照（经典只有浅色，因为它本来就没有暗色）。
- **没有高 DPI 缩放适配**，依赖浏览器自身的缩放。
- **不做材质**。玻璃、半透明模糊这类需要合成层的效果不实现。

## 下一步

1. **行为层**：键盘模型（Alt 助记符 / Cmd / 全键访问）、焦点顺序、右键菜单、按下态。
   这是原生体感的大头，现在只是视觉。
2. **补齐控件**：下拉菜单的展开层、分段控件、标签页、进度条、提示气泡。
3. **Windows 11 的校准**：Win10 和 Windows XP都已经有原生状态矩阵了，Win11 还没有；需要在
   Win11 上跑同一套 uxtheme 管线，或者把 WinUI 3 的离屏渲染跑通。GNOME 仍靠官方截图和上游 SCSS。
4. **抽包**：主题拆成可单独引入的 CSS，组件按需引入，给桌面壳一层薄封装。
