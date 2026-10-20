# Platform UI

一套用 HTML + CSS 实现各平台原生观感的 UI 组件库：Windows 11（Fluent）、macOS（Tahoe）、GNOME（Adwaita）。
纯静态，没有构建步骤，不依赖任何框架。

同一个组件，换一个 `data-theme` 就换成另一个平台的样子；明暗、强调色、密度都跟着主题走。

## 跑起来

```bash
cd ~/src/platform-ui
python3 -m http.server 4173 --bind 127.0.0.1
```

然后打开 <http://127.0.0.1:4173/index.html>。

> 必须用 HTTP 打开。直接双击 `index.html` 走 `file://` 时，浏览器会因为跨源策略拒绝加载
> `fonts/` 里的 woff2，三个平台会退化成同一个系统字体，平台差异就看不出来了。

页面：

| 页面 | 用途 |
| --- | --- |
| `index.html` | 交互版。切平台、切明暗、三平台并排；悬停 / 按下 / 焦点是真的，可以直接点。 |
| `harness.html` | 状态矩阵。把 hover / active / focus / disabled 用类名定格，一屏看全。 |
| `compare.html` | 参考图画廊：左边系统原生截图，右边复刻结果。 |
| `verify.html` | 对齐页：和 AppKit 渲染出来的原生控件逐行对齐，给 `tools/verify-macos.sh` 用。 |
| `frames.html` | 动效逐帧定格页，给 `tools/frames.sh` 用。 |

生成物：

```bash
bash tools/shoot.sh          # 各平台 × 明暗的整页截图
bash tools/verify-macos.sh   # 原生 vs CSS 的单组件对照图
bash tools/frames.sh         # 动效胶片图（CSS 侧）
bash tools/record-native.sh  # 录原生控件动画（需要屏幕录制权限）
```

产物在 `shots/`，2 倍像素密度。

## 结构

```
css/tokens.css        兜底令牌 + 两个 Web 字体（Selawik / Cantarell）
css/components.css    组件结构与状态机，只读令牌，没有任何平台判断
css/theme-win11.css   只声明变量
css/theme-macos.css   只声明变量
css/theme-gnome.css   只声明变量
css/base.css          演示页外壳（中性，不参与平台主题）
js/app.js             平台识别 + 主题切换
js/harness.js         状态矩阵生成
tools/               截图、原生渲染对照、录制与抽帧
docs/verification.md 对齐方法与实测值
reference/            原生参考图（不入库）与来源清单
```

## 切换是怎么做到的

主题只挂在容器的两个属性上：

```html
<section data-theme="win11" data-mode="dark">…</section>
```

`data-theme` 选平台，`data-mode` 选明暗。所有颜色、圆角、高度、字体都是 CSS 自定义属性，
主题文件只负责给这些属性赋值。所以：

- **组件不认识平台**。加第四个平台只是多一个变量文件。
- **同一个页面里可以并存**。`index.html` 的并排模式就是三个容器各带一套属性，互不干扰。
- **桌面壳接管很简单**。Electron 里拿到 `nativeTheme.themeSource` 和系统信息后，改 `<html>`
  上的这两个属性即可；Tauri 同理。组件层一行都不用动。

```js
document.documentElement.dataset.theme = platform; // 'win11' | 'macos' | 'gnome'
document.documentElement.dataset.mode = dark ? 'dark' : 'light';
```

## 平台之间差在哪

这些参数决定「一眼像不像」，比配色更关键：

| | Windows 11 | macOS | GNOME |
| --- | --- | --- | --- |
| 控件高度 | 32px | 24px | 34px |
| 圆角 | 4px | 按钮 5px，输入框 6px | 9px |
| 字体 | Segoe UI Variable 14px | SF Pro 13px | Cantarell 14.67px / bold |
| 按钮底色 | 近白 + 底部 1px 深色内描边 | 灰胶囊（`rgba(0,0,0,.1)`），无描边 | 文字色 10% 半透明，无边框 |
| 焦点 | 2px 硬描边，外扩 1px | 3.5px 半透明蓝色外发光 | 2px 半透明描边，内缩 2px |
| 按下反馈 | 背景变浅，文字转灰 | 背景压暗 | 填充加深到 30% |
| 输入框聚焦 | 只加一条 2px 强调色下划线 | 描边变蓝 + 外发光 | 内侧 2px 强调色描边 |

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

复选框的对勾用 SVG 画在 `viewBox` 里，任何尺寸都居中；描边粗细由 `--check-stroke` 控制。

## 已知差距

当前版本的边界，别指望它和真控件逐像素一致：

- **字体是替代品**。Selawik（微软官方 Segoe 替代，OFL）和 Cantarell（GNOME 默认字体，OFL）
  是为了让非 Windows / 非 GNOME 机器上也能看出平台差异；在真机上会命中系统字体。
  字体渲染（次像素灰度、hinting）没法复刻。
- **只有可见状态**。悬停、按下、焦点、禁用做了；键盘导航、右键菜单、滚动条、文本选择、
  输入法候选框、拖拽都还是浏览器的原生行为。
- **动画只有 macOS 量过**。Windows 的 160ms、GNOME 的 200ms 是估的，没有录制依据。
- **Windows 的 Mica 背景没做**，现在是一条纯色。
- **Linux 只跟了 Adwaita 默认值**。GNOME 换主题色、KDE、XFCE 不在范围内。
- **版本只覆盖一代**。macOS 按 26（Tahoe）做的，GNOME 按 47/48 做的；别的版本要另加一套变量。
- **参考图只有浅色**。深色是照同一套令牌推的，没和真机对过。
- **没有高 DPI 缩放适配**，依赖浏览器自身的缩放。
- **不做材质**。玻璃、半透明模糊这类需要合成层的效果不实现。

## 下一步

1. **行为层**：键盘模型（Alt 助记符 / Cmd / 全键访问）、焦点顺序、右键菜单、按下态。
   这是原生体感的大头，现在只是视觉。
2. **补齐控件**：下拉框、多行输入、分段控件、标签页、菜单。现在的五种只覆盖了最常见的形态。
3. **Windows 与 GNOME 的校准**：这两个平台还没有逐帧和逐像素的依据，目前靠官方截图和上游源码。
4. **抽包**：主题拆成可单独引入的 CSS，组件按需引入，给桌面壳一层薄封装。
