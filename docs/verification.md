# 对齐方法：拿系统自己当像素参考

组件库的目标是让 HTML 控件「看起来是那个系统的」。判断像不像，不能靠记忆，也不能靠二手截图——
同一个控件，Apple 自己的 HIG 里就有三种画法（直角的、圆角的、胶囊的），照着任意一张都能得出不同结论。

所以能拿到系统本身的时候，就以系统为准：把原生控件离屏渲染成 PNG，和 CSS 版本按同一尺寸摆在一起比。

## 一条命令

```bash
# 先起静态服务（字体要走 http）
python3 -m http.server 4173 --bind 127.0.0.1 &

PYTHON=/path/to/python3 bash tools/verify-macos.sh
```

`PYTHON` 需要一个装了 Pillow 的解释器；不指定就用 `python3`。
产物是 `shots/verify-macos-light.png` 和 `shots/verify-macos-dark.png`：
左边是 AppKit 画的，右边是 CSS 画的，每行一个控件。

## 第一步：渲染原生控件

`tools/appkit-render.swift` 用 `NSView.cacheDisplay(in:to:)` 把控件画进 bitmap，不需要开窗口，也不打扰桌面。

```bash
cd tools
TMPDIR=/tmp/ak CLANG_MODULE_CACHE_PATH=/tmp/ak/mc \
  swiftc -module-cache-path /tmp/ak/mc appkit-render.swift -o /tmp/ak/render
/tmp/ak/render
```

每个控件画在一个 324×48 的格子里，2 倍像素，输出到
`reference/shots/macos/appkit/native-{light,dark}-{row}.png`。

覆盖的控件（浅色 / 深色各一套）：

- `button`、`button-accent`、`button-disabled`
- `field-placeholder`、`field-value`
- `check-off`、`check-on`、`check-disabled`
- `radio-off`、`radio-on`
- `switch-off`、`switch-on`

三个必须注意的点：

1. **appearance 必须显式设置**。容器和每个控件都要设成 `.aqua` 或 `.darkAqua`，
   否则画出来跟随当前系统，深色那套就白做了。
2. **离屏没有窗口**，`NSColor.windowBackgroundColor` 拿到的是纯白而不是真实的窗口灰。
   所以底色用固定色块（浅色 `#ECECEC`，深色 `#262628`），CSS 那边用同样的底色，比较才公平。
3. **半透明材质不可信**。按钮这类材质在真窗口里会和背后内容混合，离屏渲染没有背后内容，
   颜色只是近似值。所以按钮的读数只当参考，输入框这种不透明的才算准。

## 第二步：截 CSS 版本

`verify.html?mode=light|dark` 按同样的 12 行、同样的单元格尺寸（324×48）画出对应控件，
控件尺寸和原生对齐（按钮宽 200、输入框宽 300）。

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 \
  --window-size=324,576 \
  --screenshot=/tmp/css-light.png \
  "http://127.0.0.1:4173/verify.html?mode=light"
```

`324×576` 就是 12 行 × 48px。行高必须严格一致，否则拼图会错位。

## 第三步：一个组件一张对照图

拼图不拼大图。每个控件单独出一张，`shots/verify/macos/{控件}-{light|dark}.png`：

- 上半是 AppKit 画的，下半是 CSS 画的，各自标了名字；
- 裁剪到内容的包围盒，四周留 14px，再放大 2 倍（源代码是 2 倍图，等于看 4 倍像素）；
- 一张图只看一个控件，避免整页缩略图把 1px 的差别糊掉。

```bash
shots/verify/macos/switch-on-light.png
shots/verify/macos/switch-on-dark.png
shots/verify/macos/check-on-light.png
...
```

缩略的整页对照图不保留：它只适合看排版，不适合判断控件本身。

## 动画：能录了，但程序化切换不触发动画

**CSS 侧逐帧**：`bash tools/frames.sh check macos light 6` 出
`shots/frames/check-macos-light.png`，6 份冻结在 0 / 28 / … / 140ms。无头浏览器的虚拟时间会把
transition 一口气跑完，所以页面里不用真实 transition，而是用 Web Animations API 按组件自己的
`transition-duration` / `timing-function` 造一条等价动画，`pause()` 后设 `currentTime`。

**原生侧录屏**：屏幕录制权限开了之后，`screencapture -v -l <windowid>` 可以录单个窗口（60fps）。
`tools/record-native.sh check light` 会自动开一个 .app（必须是 bundle，裸二进制拿不到 key window，
控件会画成非激活的灰色），录下切换过程，`tools/anim-strip.py` 再找出变化那一帧、报中间帧数量。

跑出来的结果：

| 控件 | 中间帧 | 结论 |
| --- | --- | --- |
| checkbox（程序化切换） | 0 | 不可信，程序化赋值会跳过动画 |
| checkbox（真实点击） | 0 | **系统确实没有勾选动画**，一帧切过去 |

真实点击那一组是手动模式录的：窗口开 20 秒，人在里面点了三下，第 742 帧（12.35s）状态从灰变蓝，
前后帧完全没有中间态。所以 `--check-duration` 现在是 0ms——照系统来，就是不画。

**这个 0 不能理解成「系统没有动画」。** `NSSwitch` 在真机上点击时明显是滑过去的，但程序化改
`state` 会跳过动画。也就是说这条链路测的是「程序化赋值」，不是「用户点击」。

想测点击，得用手动模式：

```bash
PYTHON=/path/to/python3 bash tools/record-native.sh check light manual
# 8 秒窗口里自己点几下，录完再跑：
python3 tools/anim-strip.py /tmp/native-rec check-light
```

合成鼠标事件试过两条路，都不行：`NSApp.postEvent` 缺 tracking 循环，`CGEvent.post(.cghidEventTap)`
需要辅助功能权限，两者都没让控件切换状态。

开关用同样的手动模式录了一次（20 秒窗口里点三下），逐帧量滑块的左边缘：

| 帧 | 时间 | 滑块左边缘 |
| --- | --- | --- |
| #323 | 5383ms | 194 |
| #324 | 5400ms | 162 |
| #326 | 5433ms | 150 |
| #328 | 5467ms | 144 |
| #330 | 5500ms | 140 |
| #331 | 5517ms | 136 |

从 194 滑到 136（像素，2×）用了 8 帧，约 **133ms**，起步快、收尾缓。同一段时间里轨道颜色也从蓝过渡到灰。
所以 `--switch-duration` 从 180ms 改成 140ms。

另外能看按下时滑块会短暂变成淡蓝色（#320–#323），这是玻璃材质在按压下的效果。
我们不复刻材质，所以不追这个 pressed 态，只保留普通的位移 + 颜色过渡。

## 实测出来的值

浅色，底色 `#ECECEC`；深色，底色 `#1D1C1E`（离屏渲染实际落到的窗口灰）。

| 控件 | 浅色 | 深色 |
| --- | --- | --- |
| 按钮 | 胶囊，填充 `#D5D5D5`，无描边，文字 `#212121` | 填充比窗口亮一档（`rgba(255,255,255,.07)` 量级），文字 `#DFDFDF` |
| 主按钮 | 填充 `#0A60FE`，文字白 | 填充 `#1064FE` |
| 禁用按钮 | 填充 `#DEDEDE`，文字 `#A5A5A5` | 填充比窗口略亮，文字更暗 |
| 输入框 | 白底，`0.5pt` 描边约 `#D2D2D2`，圆角 6px | 底 `#171717`，描边 `rgba(255,255,255,.12)` |
| 复选框 / 单选框 | 16×16，未选 `#D0D0D0`，选中 `#095DF8`，禁用选中 `#85A9ED` | 未选 `#333234`，选中 `#1064FE`，禁用选中 `#193D81` |
| 开关 | 54×24，滑块是 **32×20 的胶囊**（不是圆），关 `#D0D0D0`，开 `#095DF8`，滑块白 | 关 `#333234`，开 `#1064FE`，滑块关态 `#E1E0E1`、开态 `#DBE8FF` |

这些值都写进了 `css/theme-macos.css`，注释里标了来源。

## 这套方法的边界

- **动画时长只有 macOS 有实测**。Windows 的 160ms、GNOME 的 200ms 都是估的，没有录制依据，
  不要拿 macOS 的 140ms 去「统一」它们——那正好抹掉了平台差异。
- **只管 macOS**。Windows 和 GNOME 在这台机器上没法渲染原生控件，只能靠官方截图和上游源码
  （libadwaita 的 SCSS、Fluent 的 token 表）。两边的可信度不是一个量级。
- **拿不到焦点、悬停、按下**。离屏渲染没有第一响应者，也没有鼠标状态。焦点环目前是按文档和
  肉眼做的，没有像素级依据。
- **颜色空间**。AppKit 画出来的 PNG 可能带 Display P3，取出来的是显示值，和 CSS 的 sRGB 差一点点。
  同一个色块在两边看起来一致，就不追究了。
- **字体渲染**。系统用字体平滑，浏览器不做同样的处理，笔画粗细会差一档。

## 加一个控件时做什么

1. 在 `tools/appkit-render.swift` 的 `specs` 里加一行；
2. 跑 `tools/verify-macos.sh`；
3. 在 `verify.html` 的 `rows` 里加同样的一行（顺序必须一致）；
4. 看 `shots/verify/macos/{控件}-{mode}.png`，差在哪就改 `css/theme-macos.css` 里的令牌；
5. 值有变化的话，回头更新上面那张表。

## Windows 侧：还没有实测值（2026-10-20 调研）

上面「只管 macOS」那条说的就是这件事。2026-10-20 在 `ssh box-win` 上补了一轮可行性验证，
先说前提：**那台机器是 Windows 10 Enterprise 22H2（build 19045），不是 Windows 11**。

- **Win32/uxtheme 离屏管线能跑**：`tools/win32-render.cs` 出了七类控件（开关在 Win32/uxtheme 里
  没有对应部件）× 五状态 × 明暗的状态矩阵。但抓到的是 Win10 Aero 主题——方角、按钮 `#E1E1E1`、
  输入框 `#ABADB3` 全边框、accent `#0078D7`——和 Win11 的代差太大，一个值都不能搬。
- **目标是 WinUI 3（Fluent 2）**：它的控件模板在 Windows App SDK 框架包里，不随 OS 走，所以理论上
  Win10 也能渲染出 Win11 的控件本体。实测：现成 WinUI 3 应用的窗口抓不到（PrintWindow 黑图，
  同一工具抓 UWP/WinUI 2 的窗口正常）；从 Mac 备料搬到 box-win 的离线 WinUI 3 构建成功了，
  但程序卡在 unpackaged 应用的框架资源解析。所以本机目前**没有任何一张「系统本身」级的 WinUI 3
  控件像素**，`theme-win11.css` 里的 Windows 数值仍然只有文档/源码/估计三档。
- **有一台 Win11 主机之后**，上面两条管线都能直接复用，再回填本页的实测表。

细节、死因和复跑命令：`docs/windows-win10-notes.md`（Win32 管线）、
`docs/windows-winui3-notes.md`（WinUI 3 抓取性）、`docs/windows-evidence-options.md`
（Win11 来源与 Win10/11 代差量化）。产物在 `reference/shots/windows/`（不入库）。
