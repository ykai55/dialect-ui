# XP classic 原生矩阵：复跑方式、实测值、失败点

这套图是给「Windows 2000 / XP 的 Windows XP外观」用的原生像素参考。和 Win10 那套 uxtheme
管线不同，XP 经典外观不走 msstyles，像素由 GDI 自己画：`DrawFrameControl` / `DrawEdge` 画控件，
`SetSysColors` 把系统色切成 classic 调色板，真实控件（默认按钮、trackbar）用真窗口
`PrintWindow(PW_RENDERFULLCONTENT)` 抓。产物在 `reference/shots/windows/classic/`（目录在 .gitignore 里，不入库）。

**这次的像素来源是「系统本身」这一级**：矩阵由系统 GDI 画，滑块由真 `msctls_trackbar32` 抓，
默认按钮由真 `BS_DEFPUSHBUTTON` 抓。控件尺寸、菜单项高这类布局取值是另一回事，单独标。

## 怎么复跑

本机只放源码，编译和渲染都在 box-win 上做。

```bash
# 0) 远端目录（只用 C:\probe\winxp，不碰 C:\probe\classic / win32 / winui3 / win10switch）
ssh box-win 'powershell.exe -NoProfile -Command "New-Item -ItemType Directory -Force -Path C:\probe\winxp\out\raw | Out-Null"'

# 1) 传源码并在 box-win 上编译（csc 是 .NET Framework 4.x，C# 5 语法）
scp tools/winxp-render.cs tools/winxp-render.ps1 'box-win:C:/probe/classic2/'
ssh box-win 'powershell.exe -NoProfile -Command "& C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe /out:C:\probe\winxp\winxp-render.exe /r:System.Drawing.dll C:\probe\winxp\winxp-render.cs"'

# 2) 投到 Administrator 的 session 2 跑（ssh 落在 session 0，那里 SetSysColors 不生效）
ssh box-win 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\winxp\winxp-render.ps1'

# 3) 换一个全新进程，在 session 2 里复查系统色已还原
ssh box-win 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\winxp\winxp-render.ps1 -Arguments "checkcolors C:\probe\winxp\out"'
# 产物是 C:\probe\winxp\out\syscolor-after.txt

# 4) 拉回本机
scp -r 'box-win:C:/probe/classic2/out/*' reference/shots/windows/classic/
```

`winxp-render.ps1` 只是 schtasks 包装：`/Create /SC ONCE /RL HIGHEST /IT /F` → `/Run` → 等
`out\DONE.txt` → `/Delete`。任务命令行里的 stdout 重定向要包 `cmd /c`，包装脚本已经处理。
程序自己写 `log.txt`、`metrics.txt`、`metrics-raw.txt`，不依赖 stdout。

一次 `all` 的顺序是：保存系统色 → `SetSysColors` 切 classic 调色板并读回校验 → 抓真实控件
（默认按钮、edit、checkbox、radio、combobox、trackbar）→ 渲染矩阵 → `try/finally` 还原系统色 →
逐项读回比对。调色板读回或还原不匹配都会写进日志，渲染也会中止。

## 产物

| 文件 | 内容 |
| --- | --- |
| `{control}-{state}-96dpi.png` | 系统真实 1x 像素（96 dpi，会话里没有原生 2x） |
| `{control}-{state}.png` | 上者的最近邻 2x 放大，只为和 CSS 2x 图并排看，**不是系统 2x 渲染** |
| `default-button.png` | 真窗口里 PUSHBUTTON 与 DEFPUSHBUTTON 的 4x 对比（默认按钮黑边证据） |
| `default-dialog.png` / `-2x.png` | 承载真实控件的非主题窗口全图（对照用） |
| `slider-raw.png` | 真 `msctls_trackbar32` 的 1x 抓图（160×23），矩阵里的滑块就是它按 1:1 贴进格子 |
| `raw/real-*.png` | 逐个真实控件的 PrintWindow 抓图，交叉验证用 |
| `metrics.txt` | 从渲染出的 PNG 采样出的全部实测值（调色板、尺寸、四边斜面、文字色、默认按钮结论、滑块） |
| `metrics-raw.txt` | 采样用的原始像素行（RLE），用来复核 metrics 的每个数 |
| `log.txt` | session/DPI/字体/调色板读回/真实控件尺寸/还原结果 |
| `syscolor-after.txt` | 跑完后在 session 2 用新进程读的 GetSysColor，证明颜色已还原 |

矩阵清单（每格 324×48；textarea 324×104，菜单 324×112；控件从 12,12 起，底色 `COLOR_3DFACE`）：
`button-normal/pressed/disabled/default`、`field-normal/disabled`、`textarea-normal`、
`checkbox-unchecked/checked/disabled`、`radio-unchecked/checked/disabled`、
`combobox-normal/disabled`、`slider-normal`、`menu-popup`（另加 `menu-popup-hover` 和 `menubar-normal`）。

## 调色板

`SetSysColors` 的参数是 COLORREF，格式 `0x00BBGGRR`，不是 `0x00RRGGBB`。最容易被写成
`0x000A246A` 的是 HIGHLIGHT，正确值是 `0x006A240A`。`metrics.txt` 里每个值都把 COLORREF 打出来了。

| 索引 | 名称 | 值 | COLORREF |
| --- | --- | --- | --- |
| 4 | COLOR_MENU | `#C0C0C0` | `0x00C0C0C0` |
| 5 | COLOR_WINDOW | `#FFFFFF` | `0x00FFFFFF` |
| 6 | COLOR_WINDOWFRAME | `#000000` | `0x00000000` |
| 7 | COLOR_MENUTEXT | `#000000` | `0x00000000` |
| 8 | COLOR_WINDOWTEXT | `#000000` | `0x00000000` |
| 13 | COLOR_HIGHLIGHT | `#0A246A` | `0x006A240A` |
| 14 | COLOR_HIGHLIGHTTEXT | `#FFFFFF` | `0x00FFFFFF` |
| 15 | COLOR_3DFACE | `#C0C0C0` | `0x00C0C0C0` |
| 16 | COLOR_3DSHADOW | `#808080` | `0x00808080` |
| 17 | COLOR_GRAYTEXT | `#808080` | `0x00808080` |
| 18 | COLOR_BTNTEXT | `#000000` | `0x00000000` |
| 20 | COLOR_3DHIGHLIGHT | `#FFFFFF` | `0x00FFFFFF` |
| 21 | COLOR_3DDKSHADOW | `#000000` | `0x00000000` |
| 22 | COLOR_3DLIGHT | `#DFDFDF` | `0x00DFDFDF` |

两个补充点：

- **COLOR_WINDOWFRAME(6) 必须一起设成 `#000000`。** 它不在最初给的 12 个里，但默认按钮那圈
  1px 黑边用的就是它。box-win 上 Win10 的默认值是 `#646464`，第一轮没设它时抓出来的默认按钮
  边是灰的（`#646464`），设上才是 `#000000`。
- **COLOR_WINDOWTEXT(8) 也一起设了。** 值同样是 `#000000`，输入框文字和默认按钮黑边都会用到。

## 字体

box-win 上有 `C:\Windows\Fonts\tahoma.ttf`（939,280 字节），**Tahoma 8pt 可用**，没有退
Microsoft Sans Serif。GDI 里 8pt / 96 dpi 对应 `lfHeight = -11`（`CreateFontW` 实测），
GDI+ 的 `Font("Tahoma", 8f, Point)` 高度是 13px，两者字面一致。

矩阵里的文字用 GDI+ 灰度抗锯齿画（`AntiAliasGridFit`）。真实控件抓图里的文字是系统 GDI 的
ClearType，放大后能看到彩色亚像素边。这是采集路径的差别，归字体档，不算几何或颜色差异。

## 每个控件的实测值

### 按钮

200×23，斜面 2px。值按「外边/内边」写。

| 状态 | 填充 | 上 | 左 | 右 | 下 | 文字 |
| --- | --- | --- | --- | --- | --- | --- |
| normal | `#C0C0C0` | `#FFFFFF`/`#DFDFDF` | `#FFFFFF`/`#DFDFDF` | `#000000`/`#808080` | `#000000`/`#808080` | `#000000` |
| pressed | `#C0C0C0` | `#000000`/`#808080` | `#000000`/`#808080` | `#FFFFFF`/`#DFDFDF` | `#FFFFFF`/`#DFDFDF` | `#000000`，标签整体 +1,+1 |
| disabled | `#C0C0C0` | `#FFFFFF`/`#DFDFDF` | `#FFFFFF`/`#DFDFDF` | `#000000`/`#808080` | `#000000`/`#808080` | `#808080` |
| default | `#C0C0C0` | `#000000` 外圈后接 `#FFFFFF`/`#DFDFDF` | 同左 | 同右 | 同下 | `#000000` |

**disabled 的斜面颜色和 normal 完全一致**，只有文字变成 `#808080`。这条是拿真窗口里同尺寸的
PUSHBUTTON 和 disabled PUSHBUTTON 抓图逐像素比出来的（`metrics.txt` 里 `disabled button bevel
identical to normal button=True`），不是看出来的。

### 默认按钮：1px 黑边在控件 rect 里边

做法：在 session 2 建一个非主题窗口（`SetThemeAppProperties(0)`），放一个
`BS_DEFPUSHBUTTON` 和一个 `BS_PUSHBUTTON`，各 75×23，`PrintWindow(PW_RENDERFULLCONTENT)` 分别抓。

实测结果：

- 两个控件的窗口尺寸都是 **75×23**，默认按钮没有变大。
- 默认按钮的**第 0 行、第 0 列、最后一行、最后一列全是 `#000000`**（四个方向逐像素确认）。
  普通按钮同一位置是 `#FFFFFF`（上/左）和 `#000000`（右/下）。
- 默认按钮的斜面从 +1 开始：第一行黑边，第二行 `#FFFFFF`，第三行 `#DFDFDF`；面区变成 73×21。
- 默认按钮 rect 之外的相邻像素（左、右、上、下各一格，取自整窗抓图）全是 `#C0C0C0`。

结论：**1px 黑边画在 23px 控件 rect 的内侧，是最外圈那一像素；它不额外占高度，控件总高仍是
23px，被挤掉的是斜面内侧的 1px。** 矩阵里的 `button-default` 就是按「整 rect 填黑，
`DrawFrameControl` 在内缩 1px 的 rect 上画」出的图，和真控件一致。

上一轮探针的结论是「黑边在 rect 之外 1px，bbox 202×24」。那张 202×24 是探针自己画黑框时
放在控件矩形外面造成的，不是系统行为，这次用真控件推翻了。

### 输入框 / 多行输入

| 控件 | 尺寸 | 填充 | 上/左 | 右/下 | 文字 |
| --- | --- | --- | --- | --- | --- |
| field normal | 200×23 | `#FFFFFF` | `#808080`/`#000000` | `#FFFFFF`/`#DFDFDF` | `#000000` |
| field disabled | 200×23 | `#C0C0C0` | `#808080`/`#000000` | `#FFFFFF`/`#DFDFDF` | `#808080` |
| textarea normal | 200×80 | `#FFFFFF` | `#808080`/`#000000` | `#FFFFFF`/`#DFDFDF` | `#000000` |

真控件抓图交叉验证：单行 edit 150×23；disabled edit 边框不变，内部填充 `#C0C0C0`。textarea 只画了
sunken 边框和文字，没有画滚动条（滚动条不在这套矩阵的范围内，CSS 那边也按无滚动条处理）。

### 复选框 / 单选框

盒子按 13×13 画，真控件窗口高 16 时盒子 ink 是 13×13，位置在 (0,1)。盒子的边框是 2px 下沉：
上/左 `#808080`/`#000000`，右/下 `#FFFFFF`/`#DFDFDF`。

| 状态 | 盒内 | 勾/点 | 标签 |
| --- | --- | --- | --- |
| checkbox unchecked | `#FFFFFF` | 无 | `#000000` |
| checkbox checked | `#FFFFFF` | `#000000` | `#000000` |
| checkbox disabled | `#808080` | `#808080` | `#808080` |
| radio unchecked | `#FFFFFF` | 无 | `#000000` |
| radio checked | `#FFFFFF` | `#000000` | `#000000` |
| radio disabled | `#808080` | `#808080` | `#808080` |

单选框在 13×13 的格子里画出的是 12×12 的圆（真控件 ink 12×12 at (1,1)），2px 下沉圆环，选中时
圆点 `#000000`；禁用态圆环和圆点都是 `#808080`。禁用态统一按「已选中 + 禁用」出图。

### 下拉框

矩阵里的下拉框是 200×21：左边 183px 的字段，右边 17px 的箭头按钮。真实非可编辑 combo 在
8pt Tahoma 下关掉时是 **150×21**，`rcItem` 127×15、`rcButton` 17×17；也就是说真实控件的箭头
按钮是缩在整个 2px 下沉边框里边的，矩阵为了和 200 宽输入框对齐用了全高的箭头按钮，这一处差异
记在下面「已知差异」里。

| 状态 | 字段填充 | 字段上/左 | 字段右/下 | 箭头 | 文字 | 箭头三角 |
| --- | --- | --- | --- | --- | --- | --- |
| normal | `#FFFFFF` | `#808080`/`#000000` | `#FFFFFF`/`#DFDFDF` | 2px 凸起：上/左 `#FFFFFF`/`#DFDFDF`，右/下 `#000000`/`#808080` | `#000000` | `#000000`，6×4 |
| disabled | `#C0C0C0` | `#808080`/`#000000` | `#FFFFFF`/`#DFDFDF` | 同 normal | `#808080` | `#808080`，6×4 |

字段部分的边框和单行输入框完全一样，箭头按钮用的是普通按钮的 2px 斜面。

### 滑块：真 trackbar 抓出来的

矩阵里的 `slider-normal` 不是 `DrawFrameControl` 近似，是创建一个真的 `msctls_trackbar32`
（160×23，`TBS_HORZ|TBS_NOTICKS`，`SetWindowTheme(hwnd,"","")` 关主题），设好
`TBM_SETRANGEMAX=10` / `TBM_SETPOS=4`，在 session 2 里 `PrintWindow(PW_RENDERFULLCONTENT)` 抓的。
原始像素在 `slider-raw.png`，矩阵里 1:1 贴在 (12,12)。

实测值：

- **通道 4px 高**，位于 y=10..13，从上到下是 `#808080`、`#000000`、`#DFDFDF`、`#FFFFFF`。
  通道左右各内缩 8px（x=8..151，宽 144），这是控件本身的行为，不是画错。
- **滑块 11×21**，本轮位置在 x=61..71、y=2..22。滑块有 2px 凸起斜面：上/左 `#FFFFFF`/`#DFDFDF`，
  右 `#000000`/`#808080`，底 `#808080`/`#C0C0C0`（底边只有一层 `#808080` 再回到面色，不是对称
  的上下各两行），面 `#C0C0C0`。
- 没有刻度：`TBS_NOTICKS` 创建，抓图里也没有 tick。
- 真控件里刻度、通道颜色、滑块斜面都和 `DrawFrameControl` 画出来的按钮不完全一样（滑块 21px 高、
  通道 4px、底边只有 1px 阴影），所以这里不能用近似。
- **焦点框没有单独实测**：matrix 里没有 trackbar 的焦点态，主题里沿用按钮那套
  `DrawFocusRect` 1px 点线（`--slider-focus-mouse-outline`，鼠标点完也画，因为 classic 没有
  focus-visible）。这一条是估计，等补抓 trackbar 焦点再改。

### 菜单

| 项 | 值 |
| --- | --- |
| 菜单条高 | 20px（`SM_CYMENU` 实测；矩阵 menubar 按它画） |
| 弹出层 | 200×76，2px 凸起边框：上/左 `#DFDFDF`/`#FFFFFF`，右/下 `#000000`/`#808080` |
| 菜单底 | `COLOR_MENU` `#C0C0C0` |
| 文字 | `COLOR_MENUTEXT` `#000000` |
| 悬停项 | 整行填 `COLOR_HIGHLIGHT` `#0A246A`，文字 `#FFFFFF` |
| 项高 | 18px，**布局取值，不是系统实测**（没有真抓弹出菜单，见已知差异） |

## 依据等级

| 内容 | 等级 |
| --- | --- |
| 矩阵像素（按钮、输入框、多行输入、勾选、单选、下拉、菜单的 GDI 绘制）、真实控件尺寸、默认按钮黑边位置与颜色、滑块通道/滑块尺寸颜色、字体可用性、调色板读回与还原 | **系统本身**（session 2 里 GDI 绘制 + 真窗口 PrintWindow） |
| 控件的外框尺寸（200 宽、23 高、textarea 200×80）、下拉框宽 200、菜单宽度与 18px 项高、单元格里的控件起点 | **布局取值**（为了和 CSS 组件布局对齐而选，不是系统常量） |
| 2x PNG | 1x 系统像素的最近邻放大，不是系统 2x 渲染 |
| 矩阵文字的抗锯齿方式 | GDI+ 灰度 AA；真控件是系统 GDI（ClearType），两者不逐像素比 |

## 已知差异和失败点

1. **对话框模板的 `DS_SETFONT` 在这台机器上没生效。** 第一版用 `DLGTEMPLATE` + 8pt Tahoma
   建真对话框，子控件全部退回 System 16px（button 120×28、edit 180×28，DLU 基准变成 8×16）。
   项目上一轮的 `dlgmetrics` 也踩过同一个坑。改成不用对话框模板：自建非主题窗口 +
   `CreateWindowExW` 按像素建控件 + `CreateFontW("Tahoma", -11)` + `WM_SETFONT`，才是 75×23。
2. **session 0 里 `SetSysColors` 不生效。** ssh 直接跑的进程画不出 classic 调色板，必须用
   `schtasks /IT` 投到 session 2。程序里会读回 14 个颜色，不匹配就报错退出，不会悄悄出白图。
3. **`PrintWindow` 的 flag 必须用 2（`PW_RENDERFULLCONTENT`）**，flag 0 对子控件会得到黑图。
   `CopyFromScreen` 在断开的 RDP 会话里没有屏幕 DC，这台机器上一直不可用，本轮没有重复测。
4. **矩阵里的下拉框比真控件简化了。** 真实 150×21 的 combo 是整体 2px 下沉边框加一个缩在里边
   的 17×17 箭头按钮；矩阵是字段 183 + 全高 17px 箭头按钮，为了和 200 宽输入框并排时高度对齐。
   颜色（字段边框、箭头斜面、文字、禁用色）都是从真控件和 GDI 上量到的，只是构图不同。
5. **菜单的项高和边框是重建的，没有抓真弹出菜单。** 边框用 `DrawEdge(EDGE_RAISED)` 画，颜色是
   系统色；18px 项高是布局取值。菜单条高 20px 是 `SM_CYMENU` 实测。
6. **真控件抓图里的文字是 ClearType。** 放大后看得到彩色亚像素边，和矩阵的灰度 AA 不同；比色时
   看中间色，不要按边缘像素判。
7. **`Environment.OSVersion` 在不带 manifest 的 exe 里报 6.2.9200**，不是真实 build；真实
   系统版本是 Win10 Enterprise 22H2 19045.5608（沿用 `docs/windows-win10-notes.md` 的实测）。
8. **96 dpi 会话没有原生 2x**，`-96dpi.png` 之外的那套只能是最近邻放大。

## 清理

- 每次渲染结束都会 `schtasks /Delete` 自己的任务；跑完 `schtasks /Query` 里没有 `classic2_*`。
- 系统色在 `try/finally` 里用保存的原值还原；`syscolor-after.txt` 是另一个全新进程在 session 2
  里读的 GetSysColor，值回到 box-win 的默认（`3DFACE #F0F0F0`、`HIGHLIGHT #0078D7`、
  `3DSHADOW #A0A0A0`、`3DLIGHT #E3E3E3`、`WINDOWFRAME #646464`），不是 classic 调色板。
- 自建窗口 `DestroyWindow`、字体 `DeleteObject`，不留进程；只写 `C:\probe\winxp`。

## 补充：勾选 / 单选的按下态（pressed）

矩阵里的勾选 / 单选只有常态和禁用态，按下态是后来用真控件补抓的
（`tools/winxp-pressed-probe.cs`，session 2 + classic 调色板 + `BM_SETSTATE` + PrintWindow）：

- 按下时**盒内 / 圆内的白底变对话框面灰 `#C0C0C0`**，2px 环、勾、圆点都不变。
- 单选框圆 ink 12×12（不是 13×13），黑点 4×4；复选框盒 ink 13×13。
- 单选框没有出现动画，一帧到位。

抓图和 8x 放大在 `reference/shots/windows/classic/raw/`（`radio-checked-pressed*.png`、
`checkbox-checked-pressed*.png`）。核对矩阵里 `radio-checked-pressed` / `checkbox-checked-pressed`
两行是把真控件的盒子 / 圆像素贴回原格子的结果（标签沿用原矩阵），这样对比页能逐像素看按下态。

## 补充：开关没有原生图，按复选框外观映射

XP classic 没有开关控件，原生矩阵里也没有 switch 项，所以没有开关的原生图可对。主题里的
`.switch` 在 XP 下直接套复选框外观：13×13 凹陷盒 + 黑勾，几何和颜色全部复用 `--check-*`
的实测值，`.switch` 的 API 不变。

核对方法是把 `.switch` 和 `.check` 的同状态并排渲染、2x 截图逐像素比：off / on 两态完全一致，
pressed / disabled 有 11 个像素差 1/255（mask 画勾和 SVG stroke 的抗锯齿舍入不同）。

## 补充：焦点框（focus）

矩阵里没有焦点态，焦点框是后来用真控件补抓的（`tools/winxp-focus-probe.cs`，session 2 + classic
调色板 + 真 `BS_AUTOCHECKBOX` / `BS_AUTORADIOBUTTON` + `SetFocus` + PrintWindow）：

- 焦点框只框**标签文字**，不包复选框盒子；勾选 / 未选中 / 单选都有。
- 1px 黑白棋盘格：顶、底各一行，左、右各一列，黑白交替。
- 实测：控件 180×16，Tahoma 8pt 文字 extent 25×13，焦点框 27×16，从文字起点开始。
- classic 没有 focus-visible：焦点框由焦点决定，鼠标点一下和键盘 Tab 到都会出现。

抓图和 8x 放大在 `reference/shots/windows/classic/raw-focus/`。**这些图里的文字和未选中态的盒子没有
画出来**（PrintWindow 的已知伪影），所以只能拿它们核对焦点框的位置和图案，不能拿来核对文字和盒子。

CSS 侧：`.check__label` / `.radio__label` / `.switch__label` 上画 `1px dotted`，offset 0（标签外 1px）；
除焦点态 token 外另给了 `-mouse` 变体，覆盖 `:focus` 但不在 `:focus-visible` 里的鼠标点击。图案在
2x 下是 2px 实 / 2px 空，和原生 1px 棋盘格放大后一致；框高 15px，原生 16px，差 1px 记在已知差距里。

复跑：

```bash
ssh box-win 'powershell.exe -NoProfile -Command "New-Item -ItemType Directory -Force -Path C:\probe\xp-focus\out | Out-Null"'
scp tools/winxp-focus-probe.cs tools/winxp-render.ps1 'box-win:C:/probe/xp-focus/'
ssh box-win 'powershell.exe -NoProfile -Command "& C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:exe /out:C:\probe\xp-focus\winxp-focus-probe.exe /r:System.Drawing.dll C:\probe\xp-focus\winxp-focus-probe.cs"'
ssh box-win 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\probe\xp-focus\winxp-render.ps1 -Exe C:\probe\xp-focus\winxp-focus-probe.exe -Arguments focus -ConsoleLog C:\probe\xp-focus\console.txt -Marker C:\probe\xp-focus\out\DONE.txt'
scp -r 'box-win:C:/probe/xp-focus/out/*' reference/shots/windows/classic/raw-focus/
```
