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

## Windows 10：拿系统自己当像素参考

Win10 这套主题不是估的。2026-10-20 在 `ssh box-win`（Windows 10 Enterprise 22H2 / build 19045，
Aero.msstyles，主题字体 Microsoft YaHei UI 9pt，会话实际 96 dpi）上用 uxtheme 的
`DrawThemeBackground` 把每个控件、每个状态离屏渲染成 PNG，`css/theme-win10.css` 的数值逐一取自
这批图。**注意：那台机器不是 Windows 11**，所以这套值只对 Win10 有效，不能搬进 `theme-win11.css`。

### 一条命令

```bash
# 前置：本地静态服务在跑（见 README）
PYTHON=/path/to/python3 bash tools/verify-win10.sh
```

产物是 `shots/verify/win10/{行}-{light,dark}.png`，每张上半是原生矩阵、下半是 CSS 复刻，
按内容包围盒裁齐、2 倍放大。原生图源是 `reference/shots/windows/win10-uxtheme/matrix/`。
复跑原生矩阵本身要用 `tools/win32-render.cs`：ssh 的进程落在 session 0，那里 `OpenThemeData`
返回 NULL，必须用 `schtasks /IT` 投到 Administrator 的交互会话（RDP 断开态也行）再渲染，
命令细节在 `docs/windows-win10-notes.md`。

### 实测值（96 dpi，浅色）

| 控件 | 值 |
| --- | --- |
| 按钮 | 23px 高、方角；填充 `#E1E1E1`、1px `#ADADAD`；悬停 `#E5F1FB` + 蓝边 `#0078D7`；按下 `#CCE4F7` + `#005499`；禁用 `#CCCCCC` + `#BFBFBF`，文字 `#838383` |
| 默认按钮（主按钮） | 灰底不变，2px 蓝边 `#0078D7`（1px 边框 + 1px 内阴影） |
| 输入框 | 白底、1px `#ABADB3` 全边框、方角；聚焦外观不变，只有插入符；禁用底色 `#F0F0F0` |
| 多行输入 | 描边 `#7A7A7A`（原生 EP_EDITBORDER_NOSCROLL，比单行深），悬停 `#171717`，聚焦 `#0078D7`，禁用 `#CCCCCC` |
| 下拉框 | 灰底 `#E1E1E1` + `#ADADAD`，右侧 17px 箭头格 + 1px 分隔线；悬停 / 按下同按钮色系；禁用 `#CCCCCC` 底、`#BFBFBF` 边、箭头 `#8B8B8B` |
| 下拉菜单 | 白底、1px `#7A7A7A`、方角、项高 16px；悬停 / 选中整行 `#0078D7` + 白字 |
| 复选框 / 单选框 | 13×13；白底 1px `#333333`；勾 / 圆点深色 `#333333`（圆点直径 7px）；悬停描边转 `#0078D7`；按下底 `#CCE4F7`、边 `#005499`；禁用底 `#E2E2E2`、边 `#CCCCCC` |
| 滑块 | 轨道 4px（`#E7EAEA` + 1px `#D6D6D6` 边）、方端；滑块 11×19 圆角竖条 `#0078D7`；悬停 thumb `#171717`、按下 / 禁用 `#CCCCCC`；经典 trackbar 没有强调色填充 |
| 开关 | Win32/uxtheme 没有此部件，取 Win10 UWP ToggleSwitch 的深色实测：轨道 44×20（含 2px 描边）、圆角 10、滑块 10×10、行程 24px；开态填充 `#0078D7` + 白滑块，关态透明 + `#CCCCCC` 描边和滑块。浅色态没有实测，按同一套中性值推。详见 `docs/win10-switch-evidence.md` |
| 中性色 | 底色 `#F0F0F0`、文字 `#000`、次要文字 `#6D6D6D`、强调色 `#0078D7` |

暗色（系统只把按钮、输入框、多行输入、下拉框变暗）：按钮 `#333333` / `#454545` / `#666666` + 1px
`#9B9B9B`；输入框 `#383838` 底 + `#9B9B9B` 边，聚焦边 `#FFFFFF`；下拉框 `#333` / `#454` / `#666`
+ `#9B9B9B` 边、禁用边 `#404040`。暗色矩阵里**默认按钮和普通按钮画法一样**（没有蓝圈），主题照抄。
勾选框 / 单选框 / 滑块原生没有暗色变体，矩阵里就是浅色那套，主题也不覆盖，暗色下只让标签文字
跟随前景色变白——真实 Win10 暗色应用就是「浅色控件 + 白标签」这个组合。

### 跑完这一轮的结论

84 张对比图（42 行 × 明暗）全部出图，行序没有错位。对得上的：按钮六态、默认按钮 2px 蓝环、
输入框 `#ABADB3`、多行输入 `#7A7A7A / #0078D7 / #CCCCCC`、下拉框三态、下拉菜单、勾选框 / 单选框
的盒子与状态色、滑块轨道（`#E7EAEA` + 1px `#D6D6D6`）。

已知差异，按性质分三类：

- **绘制惯例差**：原生按钮 / 输入框 / 下拉在 200×23 的格子里只画 198×21 的墨迹，CSS 用满 23px，
  对比图里每边多 1px；行内居中还带来 0.5–1.5px 的纵向差。
- **形状差**：滑块 thumb 原生是 11×15 方体 + 4px 下尖指针，CSS 是 11×19 圆角竖条，没有指针；
  下拉框箭头原生是 8×4、1px 线，CSS 是 4px 见方、1px 线（很接近，但抗锯齿不同）。
- **焦点框范围**：原生按钮 / 勾选框 / 单选框的焦点点线框住整行，下拉框只框文本区；CSS 统一框在
  控件本体（勾选框是 13×13 的盒子）。焦点颜色见下面的估计说明。
- **字体差**（不算主题 bug）：Selawik 回退让字宽窄 2–3px、基线低 2px，行距也因此略有差别；
  这部分单独归到字体档，不进几何 / 颜色档。

### 依据等级和已知差距

- 颜色、尺寸、描边、状态色、控件高度：**系统本身**（uxtheme 离屏渲染）。
- 焦点框：**估计**。原生焦点框由 `DrawFocusRect` 画，离屏抓出来是近白点线（`#F2F4F3`），
  和真实 Win10 的深色点线不一致，判断为 XOR 采集伪影，所以主题按深色点线做。
- 下拉菜单的暗色、开关的过渡时长：**估计**（原生没有可采样的资源）。
- 勾选框 / 单选框 / 滑块没有暗色变体，主题沿用浅色外观（实测行为，不是估计）。对比页在暗色下把
  这两类标签强制成黑色，因为原生矩阵里那是采集器画的黑色文字、底也是白的；真实应用里标签是白的。
- 原生主题部件在 200×23 的格子里只画出 198×21 的墨迹（外侧 1px 未着色），CSS 用满 23px，
  对比图里会有 2px 左右的高度差，属于绘制惯例差。
- 字体是 Selawik 回退（非 Windows 机器没有 Segoe UI / Microsoft YaHei UI），字宽和基线差异
  单独归到字体档，不进几何 / 颜色档。
- 滑块底部那个小三角缺口没有画；下拉菜单的阴影是估的（原生由 DWM 合成）。

### Windows 11 仍然没有实测

Win11 的 Win32 主题是另一份二进制，Win10 的值不能推过去。WinUI 3 的控件模板在 Windows App SDK
框架包里、理论上 Win10 也能渲染，但这次没跑通（现成 WinUI 3 应用窗口抓不到，自建库卡在
unpackaged 资源解析）。死因和下一步：`docs/windows-winui3-notes.md`；Win11 像素来源评估：
`docs/windows-evidence-options.md`。`theme-win11.css` 里的 Windows 数值仍然只有文档 / 上游源码 /
估计三档。

## Windows XP（2000 / XP classic）：纯 GDI 的 2px 斜面

这套外观没有主题位图，控件是 GDI 按固定规则画的：2px 四色斜面、`#C0C0C0` 对话框底、Tahoma 8pt。
所以它比 Win10 还好复刻——不需要装主题、不依赖 compositor，把系统色切到经典调色板就能让
`DrawFrameControl` / `DrawEdge` 直接画出目标像素。

### 怎么拿的像素

在 `ssh box-win` 的交互会话（session 2）里，保存系统色 → `SetSysColors` 切成经典调色板 →
离屏渲染 → 还原系统色（跑完复查过，`3DFACE` 回到 `#F0F0F0`）。调色板：

| 角色 | 值 | 角色 | 值 |
| --- | --- | --- | --- |
| 3DFACE | `#C0C0C0` | WINDOW | `#FFFFFF` |
| 3DHIGHLIGHT | `#FFFFFF` | BTNTEXT / MENUTEXT | `#000000` |
| 3DLIGHT | `#DFDFDF` | GRAYTEXT | `#808080` |
| 3DSHADOW | `#808080` | HIGHLIGHT | `#0A246A`（XP classic 方案的选中色） |
| 3DDKSHADOW | `#000000` | HIGHLIGHTTEXT | `#FFFFFF` |

产物在 `reference/shots/windows/classic/`，复跑和量值在 `docs/winxp-native-notes.md`。
核对链路：`PYTHON=... bash tools/verify-winxp.sh`，出 `shots/verify/winxp/{row}.png`。

### 实测值

- **斜面**（2px、四边不等）：凸起 = 上/左 外 `#FFFFFF` 内 `#DFDFDF`、下/右 内 `#808080` 外 `#000000`；
  凹陷 = 上/左 外 `#808080` 内 `#000000`、下/右 内 `#DFDFDF` 外 `#FFFFFF`；按下 = 凸起整组反过来。
- **按钮**：23px 高、方角、`#C0C0C0` 面；没有悬停态；按下时斜面反向；禁用时斜面不变、文字 `#808080`。
- **默认按钮**（CSS 里的 `.btn--primary`）：1px 黑边画在控件 rect 内侧（真 `DEFPUSHBUTTON` 抓图确认：
  黑边占最外 1px，控件总尺寸不变，斜面从 +1 开始往里画）。
- **输入框 / 多行输入**：白底 + 2px 凹陷斜面；聚焦外观不变（只有插入符）；禁用是 `#C0C0C0` 底 + `#808080` 字。
- **复选框 / 单选框**：复选框 13×13、单选框圆 ink 12×12（放在 13×13 的格子里，从 (13,17) 起）；
  勾 `#000000`、圆点 4×4 `#000000`；禁用时盒内变对话框灰 `#C0C0C0`、勾 / 点变 `#808080`。
  圆环不能用 offset 阴影画（在圆上会变成厚的月牙，看着像椭圆），用 1px 外边框
  （上/左 `#808080`、下/右 `#FFFFFF`）+ 1px 内圈伪元素（上/左 `#000000`、下/右 `#DFDFDF`）做。
- **按下态**：勾选框 / 单选框被按下时，盒内 / 圆内的白底变对话框灰 `#C0C0C0`，环、勾、点都不动
  （真控件 `BM_SETSTATE` 抓图实测）。单选框没有出现动画，一帧到位。
- **下拉框**：实测高 21px（字段 15px + 上下 2px 凹陷边框），右侧是 17×17 的凸起箭头格、嵌在 2px 边框里面；
  菜单是灰底 2px 凸起边框、项高 18（布局取值）、选中项 `#0A246A` 底白字。
- **滑块**：真 `msctls_trackbar32` 抓图实测：控件 160×23，通道 4px、左右各缩进 8px、通道上暗下亮（凹槽），
  滑块 11×21、凸起斜面。CSS 按这组值画，刻度线没有复刻。
- **字体**：Tahoma 8pt（11px）。非 Windows 机器用 Tahoma / 回退字体，GDI 的 ClearType 彩边复刻不了，
  字宽差 2–4px，归字体档。

### 依据等级和已知差距

- 颜色、斜面结构、控件尺寸、禁用/按下状态：**系统本身**（GDI 离屏渲染 + 色板手动设定）。
- 选中色 `#0A246A`：XP classic 方案的公开值，不是本机量出来的（本机是 Win10，没有 XP 的方案表）。
- 焦点框的采集和 Win10 一样有 `DrawFocusRect` 的 XOR 问题，主题按 1px 深色点线画（**估计**）。
- 开关在这个年代不存在，主题按同期 3D 控件语言做了「凹槽 + 凸起滑块」的解释（**估计**，无原生依据）。
- 滑块刻度线、菜单阴影、滚动条、标题栏没有做。
- 没有暗色、没有悬停态：这是时代本身的行为，不是没做。

### 跑完这一轮的结论（20 行对照）

`shots/verify/winxp/` 20 行（18 个控件行 + 菜单两行）全出图，其中新增了勾选框 / 单选框的
按下态两行（真控件抓图，按下时内部白底变面灰）。**几何逐像素对齐的**：按钮四态
（normal / pressed / disabled / default）、输入框两态、多行输入、下拉框两态、菜单两行——12 行 ink
bbox 和原生完全一致；颜色结构（四边斜面、凹陷边框、默认按钮内黑环、禁用灰、菜单悬停 `#0A246A`、
滑块通道四行色）全部一致，没有发现主题写错的颜色。

已知差异（都已归类，部分不改）：

- **绘制惯例差**：按下按钮时原生文字整体 +1,+1，CSS 不位移；勾选 / 单选 0.5px 的半像素取整；
  字体基线差 0.5–2px（GDI 与浏览器行盒不同）；单选框的 2px 环在 GDI 里是硬像素、在 CSS 里带抗锯齿，
  放大后边缘会软一点。这些不改。
- **形状差**：滑块 thumb 原生底部有 4px 三角收口、CSS 是直边；下拉箭头原生是 6×4 实心三角、
  CSS 是 4px V 形折线。
- **组件限制**：原生通道左右各缩进 8px，CSS 里改不了 track 的宽度——Chrome 对
  `::-webkit-slider-runnable-track` 的 width 不生效，Firefox 又把滑块左右拆成
  `::-moz-range-progress` 和 `::-moz-range-track` 两段（两段都要单独给斜面，否则左边那段没有立体边，
  看起来只剩半截）。所以经典滑块的通道用满控件宽度（160 vs 原生 144），这条先记着。
- **矩阵构图差**：原生矩阵里 combo 的箭头格画成 17×21 全高，真控件是 17×17 内缩在边框里；
  CSS 跟真控件一致，不算主题错。
