# macOS 11–15 旧版外观：复跑方式、实测值、已知差距

这套图是给 `data-theme="macos15"` 用的原生像素参考，覆盖 macOS 11 Big Sur – 15 Sequoia
这一代外观（这套外观在 11–15 之间基本冻结）。macOS 26 Tahoe 换成了新外观（灰胶囊按钮、
54×24 开关），两代不合并：`css/theme-macos.css` 是 26 的，`css/theme-macos15.css` 是这代的。

**像素来源是「系统本身」这一级，但走的是兼容外观路径**：本机是 macOS 26.6.1 + Xcode 27.1
（只有 macOS 26/27 SDK），没有 15.x 系统。AppKit 挑外观看的是二进制 `LC_BUILD_VERSION`
里的 `sdk` 字段，不是系统版本；把 sdk 改成 15.0 后，AppKit 会走系统内置的旧版外观路径，
画出来的就是 26 之前那套控件。产物在 `reference/shots/macos15/appkit/`（目录在 .gitignore 里，不入库）。

## 怎么复跑

```bash
# 一条命令：编译 → vtool 改 sdk 15.0 → 渲染 → 采样 metrics.txt
bash tools/render-macos-legacy.sh

# 核对链：原生渲染 + 截 CSS 版本 + 逐控件对照图 / bbox / 颜色报告
PYTHON=/Users/bytedance/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
  bash tools/verify-macos15.sh
```

`render-macos-legacy.sh` 里的关键两步：

```bash
# 1) 正常编译（产物此时是 26 / Tahoe 外观）
cd tools
TMPDIR=/tmp/ak CLANG_MODULE_CACHE_PATH=/tmp/ak/mc \
  swiftc -O -module-cache-path /tmp/ak/mc appkit-render.swift -o /tmp/ak/render

# 2) 只改 LC_BUILD_VERSION 的 sdk，再渲染
#    参数是两个：minos 和 sdk，都写 15.0；只给一个 vtool 会报错。
xcrun vtool -set-build-version macos 15.0 15.0 -replace \
  -output /tmp/ak/render15 /tmp/ak/render
xcrun vtool -show-build /tmp/ak/render15   # 读回 sdk 15.0 再继续，脚本里有断言
/tmp/ak/render15 --legacy --out reference/shots/macos15/appkit
```

同一个二进制、同一份源码，sdk 字段不同，画出来的控件完全两套：

| | sdk 27（Tahoe，现默认） | sdk 15.0（这套） |
| --- | --- | --- |
| 按钮 | 灰胶囊 200×24 | 白底 0.5px 描边，可见 188×21 |
| 复选框 / 单选框 | 16×16 | 14×14 |
| 开关 | 54×24（32×20 胶囊 knob） | 38×22（20 圆 knob） |
| 下拉框 | 灰胶囊 | 白底 + 灰 chevron |

三个必须注意的点：

1. **sdk 11 / 14 / 15 三档要统一用 15.0。** 实测：sdk 14 与 15 逐 PNG 字节完全相同；
   sdk 11 只有滑块不一样（knob 阴影差约 1px），其余全同。所以 11–15 共用一套值，
   统一用 15.0，避免回头纠结小版本。
2. **下拉框必须放进真实 `NSWindow` 的 contentView 再 `cacheDisplay`。** 离屏（不进窗口）时
   legacy `NSPopUpButton` 会画出一块**蓝色强调箭头格**（key/活跃窗口的样式）；进窗口后是
   白底 + 灰色 chevron（非活跃/离屏样式）。
   窗口不用显示、不用 `orderFront`（脚本里建的是 frame 在屏幕外的 borderless 窗口）。
   但**别把所有控件都塞进去**：这个进程不是前台应用（`NSApp.isActive=false`，激活被系统拒绝），
   非活跃窗口里的控件会把强调色画成灰的——主按钮变白、勾选变灰勾、开关 knob 变灰。
   所以离屏渲染（默认按活跃状态画）其它控件，只把 select 放窗口。想吃这个差异时加
   `--host-all` 参数复现，别拿它出参考图。
3. **位图 rep 要自己建。** 窗口承载时 `bitmapImageRepForCachingDisplay` 会按当前显示器的
   色彩空间建 rep，换一台显示器 PNG 里的颜色值就变了。legacy 模式自己建 2x 的
   `calibratedRGB` rep（PNG 内嵌 Generic RGB profile），采样时用内嵌 profile 转成 sRGB
   再读。不转会明显偏：浅色窗口底 raw `#E7E7E7`、转完 `#ECECEC`；蓝色 raw `#116FFF`
   量级、转完是系统蓝 `#007AFF` 量级。CSS 是 sRGB，所以主题里写的是转换后的值。

## 产物

| 文件 | 内容 |
| --- | --- |
| `reference/shots/macos15/appkit/native-{light,dark}-{row}.png` | 原生渲染，2x（648×96/格），浅色深色各 15 张（14 个控件 + 1 张窗口底色） |
| `reference/shots/macos15/appkit/metrics.txt` | 从 PNG 采样出来的全部实测值（尺寸、可见包围盒、填充/描边/渐变/字色、剖面像素） |
| `shots/verify/macos15/{row}-{light,dark}.png` | 一个控件一张对照图：上原生、下 CSS，按内容包围盒裁齐、2x 放大 |
| `shots/verify/macos15/report.txt` | 逐行 ink bbox（原生 vs CSS）+ 采样点颜色对照 |

矩阵行（每格 324×48，控件从 x=12 或按可见位置贴齐）：`button`、`button-accent`、
`button-disabled`、`field-placeholder`、`field-value`、`check-off`、`check-on`、
`check-disabled`、`radio-off`、`radio-on`、`switch-off`、`switch-on`、`select`、`slider`。

## 每个控件的实测值

先记一个反复出现的概念：**AppKit 的 bezel 比控件 frame 小一圈**。按钮 frame 200×32
（`sizeToFit` 的值）里只画 188×21 的 bezel，左右各内缩 6、上下各剩 5 的空隙；输入框
frame 300×22 画 299×21.5；开关 frame 42×25 画 38×22；下拉框 frame 180×25 画 175×21。
**frame 是布局用的，可见像素才是外观**，所以 `theme-macos15.css` 里的尺寸 token 用可见值
（`--btn-h: 21px`、`--switch-w: 38px`…），对比页也按可见尺寸对齐。

### 按钮

圆角是按左上角的边缘剖面拟合的（`metrics.txt` 里每个控件都有「圆角剖面」一行：
自上而下每 0.5px 记一次左沿 x）；按钮 / 输入框 / 下拉框都是 6px 最接近，复选框是 3.5px。
测试时试过 5 / 5.5 / 6.5，6 和原生的剖面差在 0.5px 以内。

| | 浅色 | 深色 |
| --- | --- | --- |
| 可见尺寸 | 188×21（圆角约 6） | 186×20.5 |
| 填充 | `#FFFFFF` | `#6F6F6F`（≈32% 白叠在窗口灰上） |
| 描边 | 0.5px：上 `#D9D9D9`、左右 `#D2D2D2`、下 `#BFBFBF` | 顶部高光 `#909090`，左右/底 `#2C2C2C` |
| 落影 | 下方约 1.5px：`#D8D8D8` → `#E9E9E9` | 下方约 1.5px，更深 |
| 文字 | `#000`（最暗像素 `#040404`），13pt regular | `#FCFCFC` |

主按钮：可见尺寸和阴影同上，纵向渐变（浅色顶 `#287CFF` → 中 `#116FFF` → 底 `#0065FF`；
深色 `#1768E4` → `#145CCC`），白字，没有独立描边。禁用：浅色填充 `#F5F5F5`、字 `#9A9A9A`、
上边 `#E2E2E2`、下边 `#D6D6D6`；深色填充 `#525252`、字 `#A6A6A6`、顶边 `#646464`。

### 输入框

可见 299×21.5，白底，0.5px 描边（顶/左右 `#CECECE`，底边更深 `#979797`→`#BFBFBF`），
圆角约 6，没有外阴影；占位符 `#CBCBCB`。文字本身是黑色，但 13pt 的笔画在 2x 下抗锯齿
最暗只到 `#323232`，取字色时别把它当灰度值。

深色：填充 `#4D4D4D`，顶/左右描边 `#646464`，**底边是亮边 `#9A9A9A`**（和浅色相反），
占位符 `#A3A3A3`，文字 `#FCFCFC`。

### 复选框 / 单选框

盒子 / 圆都是 14×14，盒子圆角约 3.5。label 距盒子 7px。

| | 浅色 | 深色 |
| --- | --- | --- |
| 未选中 | 白底 + 0.5px `#C4C4C4` | 渐变 `#595959`→`#777777` 底 + 0.5px `#2C2C2C` |
| 选中 | 蓝渐变 `#2891FF`→`#017BFF` + 白勾/白点（点径 5–5.5） | 蓝渐变 `#1768E5`→`#165ECD` + `#DCE7FA` 勾/点 |
| 禁用选中 | `#F1F1F1` 底 + `#B9B9B9` 勾 | `#4E4E4E` 底 + `#808080` 勾 |

勾的笔画实测约 2.5px（换算到 `viewBox="0 0 20 20"` 是 `--check-stroke: 3.5`）。

### 开关

可见 38×22 胶囊（`NSSwitch` 的 intrinsic 尺寸就是 38×22，frame 42×25 是加了焦点环余量），
knob 20×20 圆、距轨道边 1px，有约 1.5px 落影。

- 关：轨道浅色 `#D8D8D8`（深色 `#4D4D4D`），knob 浅色白（深色 `#D3D3D3`）。
- 开：轨道蓝渐变，浅色 `#0B7CF8` → `#218DFF`，深色 `#1560D2` → `#1669E3`；
  knob 和关态同色。
- 深色轨道有一圈很淡的浅色收边。

### 下拉框

可见 175×21，白底（深色 `#6F6F6F`），0.5px 描边（浅色上 `#D9D9D9`、下 `#BFBFBF`；
深色上高光 `#909090`、下 `#282828`），圆角约 6，有 1.5px 落影；文字 `#000`
（深色 `#FCFCFC`），右侧是**上下双 chevron**，颜色 `#323232`（深色 `#ECECEC`），
实测两段各 4.5 高、整体约 7×11、笔画约 1px、两端是圆头。CSS 用一张 SVG mask（圆头折线、stroke 1.5px）画整组双箭头，尺寸和间距按这组值拟合。

⚠ 这张图是在**非活跃窗口**里画的（本进程无法成为前台应用，见上）。chevron 和文字
可能比活跃窗口浅一档；离屏画又会出蓝箭头格，两害取其轻。

### 滑块

轨道 4px：浅色 `#E2E2E2`，深色 `#4D4D4D`；左侧填充 `#0A82FF`（深色 `#166AE6`）；
knob 20×20 白色圆 + 约 1.5px 落影；可见宽 216（frame 220 左右各内缩 2）。

### 窗口底色

浅色 `#ECECEC`、深色 `#323232` —— legacy `NSColor.windowBackgroundColor` 的实测值
（26 的深色窗口灰不是这个值，别混）。对比页的页面底色直接用这两个值。

## 依据等级

| 内容 | 等级 |
| --- | --- |
| 所有控件像素、可见尺寸、描边/填充/渐变、禁用态、窗口底色、下拉框 chevron | **系统本身**（AppKit legacy 外观路径 = 二进制 sdk 15.0） |
| 13pt 字号、regular 字重 | **系统本身**（代码里 `NSFont.systemFont(ofSize: 13)`，不是从像素反推） |
| sdk 11/14/15 外观一致性 | 实测（逐 PNG 哈希对比） |
| 「可见尺寸 vs frame」「矩阵里控件的宽度 / 位置」 | **布局取值**（为了和 CSS 组件并排比而选，不是系统常量） |
| hover / pressed / focus 状态 | **估计**（离屏渲染没有鼠标、没有第一响应者，拿不到）；按同类控件和系统惯例推，主题里逐条标了「估计」 |
| 菜单展开层、多行输入 | **估计**（这条链路不渲染展开菜单，只渲染单行输入框） |
| 过渡时长 / 缓动（`--ui-duration`、`--switch-duration`） | **估计**（没有录屏依据） |
| 字宽、基线 | **字体档**（AppKit 字体平滑 vs 浏览器栅格化，不进几何/颜色结论） |

## 已知差距

1. **compat 路径 caveat（最重要）**：这不是真 15.x 系统，是 macOS 26.6.1 的 AppKit 走旧版
   外观。旧版外观路径本身在 11/14/15 三档下逐字节一致（滑块 knob 阴影除外），控件形状/颜色
   可信；但字体栅格化、部分材质仍然由 26 的 AppKit 决定。这套值只在 macOS 上有效，
   也不能反过来当成 26 的值用。
2. **下拉框来自非活跃窗口**：chevron/文字可能比活跃窗口浅一档；这是为了拿到正确的
   「白底 + 灰 chevron」而付的代价（离屏会画蓝箭头格）。
3. **颜色空间**：原生 PNG 是 Generic RGB profile，采样时转 sRGB。转换是必需的，但
   profile 不是 Display P3；和「真机截屏取色」相比可能差 1–2 个色阶。
4. **字体**：AppKit 做字体平滑，笔画比 Chrome 粗一档；同样 13px 的字，CSS 的 label 宽度
   会和原生差 1–3px。check / radio 行 bbox 宽 1px 的差主要来自这里，不是盒子画错。
5. **绘制惯例差**：AppKit bezel 比 frame 小一圈（按钮 −12×−11、输入框 −1、开关 −4×−3、
   下拉 −5×−4）。CSS 的盒子就是可见尺寸，所以 `verify/verify-macos15.html` 按可见尺寸/位置对齐，
   report 里宽度差才能压到 0–2px。这不是主题值，是两套绘制模型的差别。
6. **形状差**：
   - 下拉框 chevron：原生是圆头折线，现在用 SVG mask 画（`--select-chevron-mask`），
     宽度 7、高 11、两段各 4.5、间距 2、圆头；和原生的折角角度差在 1–2°，放大看还略钝。
   - 选中态的复选框 / 单选框：原生的蓝色填充有 1px 抗锯齿外扩，墨迹比 CSS 大 1–2px
     （report 里 check-on / radio-on 高度差 −1.5 ~ −2）。
7. **量不到的**：hover / pressed / focus、菜单展开层、多行输入、动画时长、字体排版细节；
   以及非活跃窗口之外其它控件的强调色状态。
8. **不要跨代搬值**：`theme-macos.css`（26）的灰胶囊按钮、54×24 开关、32px 按钮 frame
   都不能拿来当这代的值；反过来也不行。

## 核对链跑出来的结果

`tools/verify-macos15.sh` 一次跑完，15 行 × 明暗 = **30 张对照图全出**，行序没有错位
（脚本按 15×96px 累加切片，高度对不上会直接报错退出）。`report.txt` 的结论：

- bbox（CSS − 原生，1x）：输入框两行 0/0/0/0；浅色其它行差 0–1px；深色多数 0–2px
  （深色描边和背景反差小，墨迹边界会多认或少认 1px）；勾选 / 单选选中态高 −1.5 ~ −2px
  （原生蓝色 AA 外扩，见上）。
- 颜色：浅色所有采样点 Δ ≤ 4（多数 0–2）；深色多数 Δ ≤ 2，最大是禁用勾选框盒内渐变
  Δ6（原生盒内是很弱的渐变，CSS 用纯色近似）。
- 自检：sdk 15.0 外观（按钮不是 24 高胶囊）、2x 位图、下拉框右侧无蓝色箭头格、
  窗口底色对（浅 `#ECECEC` / 深 `#323232`）——任一不满足脚本直接失败，不会悄悄出白图。

## 加一个控件时做什么

1. 在 `tools/appkit-render.swift` 的 `specs` 里加一行（需要窗口承载的控件在 `render` 调用处
   说明）；
2. 跑 `bash tools/render-macos-legacy.sh`，看 `metrics.txt` 里新控件的可见尺寸和颜色；
3. 在 `verify/verify-macos15.html` 的 `rows` 里按同样顺序加一行，宽度/位置按可见尺寸对齐；
4. 在 `tools/compare-macos15.py` 的 `ROWS`（以及需要的话 `SAMPLE_POINTS`）里同步加；
5. 跑 `bash tools/verify-macos15.sh`，看 `shots/verify/macos15/{row}-{mode}.png`；
6. 差在哪就改 `css/theme-macos15.css` 的令牌，值有变化回头更新上面那张表。

## 清理和确定性

- 渲染是确定性的：同一个二进制重复跑，PNG 哈希一致（`sdk 14` 和 `sdk 15` 两档也一致）。
- 渲染过程不显示窗口、不改系统设置、不写仓库外的文件；临时产物都在
  `/tmp/dialect-ui-macos15-render`、`/tmp/dialect-ui-macos15-verify`，可以直接删。
- `reference/shots/macos15/appkit/` 和 `shots/verify/macos15/` 都是生成物，不入库。
