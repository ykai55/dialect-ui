# 独立弹出菜单 / 右键菜单：六平台原生行为模型

这份文档只管两种菜单：点触发器按钮弹出来的菜单，和右键/上下文菜单。菜单栏（Windows 的 F10 菜单条、
macOS 屏幕顶部的菜单栏）和下拉框的展开层不在范围内，只在需要说明差别时提一句。六个平台分别是
Windows 11（WinUI 3 / MenuFlyout）、Windows 10（Win32 菜单）、Windows XP（经典菜单）、macOS 26
（Tahoe，NSMenu）、macOS 11–15（NSMenu）、GNOME（Adwaita / GTK4 GtkPopoverMenu）。

**依据等级**沿用仓库的约定：系统本身 > 官方文档 > 上游源码 > 观感估计。这份文档没有新的录屏、截图或
离屏渲染，最高只能到官方文档和上游源码；视觉数字除了 Windows XP（仓库以前用 GDI 实测过，S31）之外
全部是估计。句末的标记就是这一条的依据等级，S 编号对应文末清单。**不要把标了「估计」的数字搬进主题文件
当实测值。**

## 两个范式，别混着抄

Windows 10/XP 和 macOS 的菜单是**模态跟踪循环**：菜单打开期间独占键盘和鼠标，滚轮、点外面、Esc 都
由菜单自己处理，窗口在这期间基本不会滚动或缩放。GNOME 是**popover**：有输入 grab，但它是跟着锚点走
的子表面，autohide 关掉，形态更接近浏览器的 popover API。Windows 11 的 WinUI 3 菜单也是轻关闭浮层，
比 Win10 的 Win32 菜单更接近 popover。这决定了「滚动/缩放时关不关」这类问题在原生上往往根本不会发生，
我们只能按 web 的处境另做决定（见「取舍」）。

Windows 11 上同时存在两套菜单：新应用用 WinUI 3 的 MenuFlyout，很多老应用和系统部分界面仍然是
Win32 菜单。下文的「Windows 11」只指前者，Win32 的行为写在 Windows 10 一节，XP 沿用同一套。

一个跨平台的共同点：**指针打开时没有初始高亮**。三个家族都是这样，和我们的观察一致（Windows 有
官方文档的间接支持，macOS 和 GNOME 只有观察/源码线索）。键盘打开则不一样，见各节。

---

## Windows 11（WinUI 3 / MenuFlyout）

### 打开

- 按钮的 `Flyout` 在点击时打开，`ContextFlyout` 在右键时打开（官方文档 S9）。焦点在按钮上时按
  Enter/空格也会触发按钮、打开菜单（估计；文档没写这个键位组合）。
- 键盘的 Shift+F10 和菜单键走 `WM_CONTEXTMENU`，这是 Win32 层的约定，WinUI 的 `ContextFlyout` 沿用
  同一套用户预期（官方文档 S2；WinUI 自己的文档没写这两个键）。
- 初始高亮：指针打开时没有项被选中。官方键盘文档的前提就是「菜单刚打开、用户还没选过项」，这时按
  Down 才把焦点放到第一项，按 Up 放到最后一项（官方文档 S3）。键盘打开时焦点直接在第一项——这条
  没有官方文档，是从 Win32 的习惯推的（估计）。
- 菜单是 light dismiss 控件：打开期间键盘和手柄焦点被关在菜单里，直到关闭（官方文档 S5）。

### 键盘

- Up/Down 在项间移动，**循环**：没选中时 Down→第一项、Up→最后一项；最后一项再 Down→第一项，第一项
  再 Up→最后一项。文档把这条叫 cycling，并建议自定义控件照做（官方文档 S3）。
- Home/End：官方键盘文档只在 ListView/GridView/ScrollView 里讲这两个键，菜单没提（官方文档 S3）。
  按文档理解，菜单里没有作用（估计）。
- Enter 和空格都激活当前项。空格是「调用当前控件的行为」，Enter 是「激活命令控件」，对菜单项两者
  等价（官方文档 S3）。
- Esc 关闭（官方文档 S5）。焦点回到打开它的元素——文档只说轻关闭控件会把焦点关在菜单里，关闭后的
  去向没写（估计）。
- Tab：菜单是 light dismiss 容器，焦点被困在里面（官方文档 S5），所以 Tab 不会跑到菜单外；具体是
  在项之间循环还是停在原处，没有文档（估计）。
- 禁用项不进入标准键盘导航（官方文档 S3 的 Narrator 段）。分隔线不能被选中（Win32 文档的规则，
  WinUI 同样适用，估计）。

### type-ahead

- 官方只讲访问键（Alt + 字母）和箭头，没提「按字母跳到对应项」（官方文档 S3）。
- 裸字母是否跳转、有没有前缀缓冲、连按同字母是否轮换，都没有文档。按「没有」处理，但这条需要真机
  验证（估计；WinUI 3 还没跑过真机，见 S33）。

### 子菜单

- `SplitMenuFlyoutItem` 的键盘规则写得很明确：主项上按 Enter/空格执行默认动作，按右方向键进副项；
  副项上按 Enter 或右方向键打开子菜单；子菜单打开时按 Esc 或左方向键关闭（官方文档 S4）。
  普通 `MenuFlyoutSubItem` 按同一模型处理（估计）。
- 悬停打开，延迟约 400ms（估计，照着 Win32 的默认菜单延迟推的；WinUI 文档没写数值）。
- 子菜单打开时父项保持高亮（估计）。

### 关闭

- 点菜单外、Esc、系统返回键、手柄 B 键都会关；点外面那一下会被吞掉，不会传给下面的控件
  （官方文档 S5）。
- 滚动、窗口缩放、切走焦点：文档没写。按 WinUI 的运行方式，切走/失活会关，缩放时浮层跟着锚点
  重定位（估计）。

### 视觉（全是估计）

WinUI 3 的菜单像素我们没拿到过（S33 记录了原因），下面只能当观感参考：外圆角约 8，presenter
内边距 4，项高 32，项圆角 4，分隔线 1px、左右各内缩 4，禁用文字约 38% 黑（`#A0A0A0` 量级），
快捷键文字右对齐、次要灰 `#5D5D5D` 量级，字号 14。

和别处不同的地方：白/近白浮层（不是灰底），项高最大（和 GNOME 一样是 32），分隔线最短（只内缩
4px），圆角和阴影承担了大部分「浮起来」的感觉。

---

## Windows 10（Win32 菜单）

### 打开

- 右键、Shift+F10、菜单键都发 `WM_CONTEXTMENU`；键盘触发时 `lParam` 的坐标是 -1，应用要按当前
  选择的位置弹菜单（官方文档 S2）。
- 初始高亮：指针打开没有高亮（估计，和观察一致）；键盘打开第一项高亮（估计）。Win32 文档里最接近
  的一句是 Enter 会「激活菜单并选中第一项」，但这说的是菜单条/子菜单的 Enter，不是打开时的初始
  状态（官方文档 S1）。
- 菜单跟踪是模态循环：进入菜单时会发 `WM_ENTERMENULOOP`，这期间应用的主消息循环被菜单接管
  （官方文档 S8）。

### 键盘

- Up/Down 选上一项/下一项（官方文档 S1）。
- 不循环：官方键位表里没有「到底回到开头」的规则（官方文档 S1），日常观感也是停在最后一项（估计）。
- Home/End、Tab 都不在官方标准键位表里。表是按「系统提供的标准键盘接口」列的，缺项说明系统没给这两个键
  定义菜单行为（官方文档 S1 + 估计：按了没作用）。
- Enter 执行当前项，或者展开当前项的子菜单（官方文档 S1）。
- 空格不在键位表里，按文档没有作用（估计）。
- Esc 退出菜单模式（官方文档 S1）；焦点回到拥有菜单的窗口/原来的控件（估计）。
- 禁用项和分隔线在方向键导航里跳过（估计；官方文档只说分隔线用户不能选中，S1）。

### type-ahead

- 字母键首先是**访问键**：选中第一个以该字母为访问键的项；如果它是子菜单，就展开并高亮第一项
  （官方文档 S1）。
- 连按同一字母在同类项之间轮换、多字符前缀、缓冲时间，官方都没有写（估计：多字符前缀在 1s 量级
  内有效，是 Windows 的常见观感，但没有可引用的数值）。
- 和 macOS 的区别在这里：Windows 文档说的是助记符（下划线字母）匹配，不是「按 label 前缀搜索」。
  只是实际菜单项大多定义了访问键，所以用起来像 type-ahead。
- 字母键不匹配任何助记符或加速键时，系统会发 `WM_MENUCHAR` 给菜单的宿主窗口，应用可以返回
  「选中某一项」「关闭菜单」或「忽略并响一声」（官方文档 S7）。默认的字母匹配逻辑由系统做，
  文档没写匹配规则和缓冲。

### 子菜单

- 指针指向带子菜单的项，系统就打开子菜单（官方文档 S1）。
- 延迟由 `SPI_GETMENUSHOWDELAY` 决定（官方文档 S6），出厂默认 400ms（估计：注册表 `MenuShowDelay`
  的默认值，文档只定义了参数含义，没给默认数）。
- 右方向键前进一列/打开子菜单，左方向键后退/关闭（官方文档 S1）。
- 子菜单打开时父项保持高亮（估计）。

### 关闭

- 点外面、Esc、切到别的窗口（Alt+Tab）都会关（估计；菜单是模态循环，见 S8）。
- 滚动、缩放：菜单跟踪期间滚轮和窗口缩放基本不会发生，所以原生没有「滚动关菜单」这条规则（估计）。

### 视觉（估计）

灰底 `#F0F0F0`，1px 灰边，方角，项高约 22，悬停整行浅蓝 `#CCE4F7`、黑字；分隔线 1px 单线、
左右内缩约 3px；禁用文字 `#6D6D6D` 量级；快捷键右对齐、灰色。

**别把 S32 里的下拉菜单值搬过来。** `docs/verification.md` 量的 `#0078D7` 底白字是下拉框列表，
不是系统菜单；两者在 Win10 里由不同的主题部件画。

---

## Windows XP（经典菜单）

### 打开

- 和 Win10 一样是 Win32：右键、Shift+F10、菜单键都走 `WM_CONTEXTMENU`（官方文档 S2）。
- 初始高亮：指针打开没有（估计，和观察一致）；键盘打开第一项高亮（估计）。

### 键盘

- 官方标准键位表：Up/Down 选上下项，Enter 执行/展开，Esc 退出，左右方向键换列（官方文档 S1）。
- 不循环（估计，文档没写循环）。
- Home/End、Tab 不在键位表里，按文档没有作用（官方文档 S1 + 估计）。
- 禁用项、分隔线跳过（估计）。

### type-ahead

- 字母键是访问键匹配（官方文档 S1）。XP 时代菜单项几乎都带 `&` 下划线，所以字母导航主要走助记符。
- 连按同字母轮换、前缀、缓冲时间没有官方文档（估计）。

### 子菜单

- 指针指向打开（官方文档 S1）；延迟由系统菜单延迟设置决定（官方文档 S6），默认 400ms（估计）。
- 右方向键打开，左方向键关闭/后退（官方文档 S1）；父项高亮（估计）。

### 关闭

- 点外面、Esc、切走（估计；Win32 的菜单是模态循环，S8）。

### 视觉

- 底 `COLOR_MENU` `#C0C0C0`，2px 凸起边框：上/左 `#DFDFDF`/`#FFFFFF`，右/下 `#000000`/`#808080`
  （系统本身，S31）。
- 悬停整行 `COLOR_HIGHLIGHT` `#0A246A`，白字（系统本身，S31）。
- 项高 18px 是**布局取值**，不是系统实测（S31 已注明）。
- 分隔线：两条蚀刻线，深 `#808080` 一条、白 `#FFFFFF` 一条，左右内缩约 2–3px（估计；经典 3D
  分隔线的画法，仓库没抓过真弹出菜单的分隔线）。
- 禁用文字 `#808080`（估计，`COLOR_GRAYTEXT`）；快捷键右对齐、和正文同色，禁用时一起变灰（估计）。

和别处不同的地方：唯一方角、2px 3D 边框、双线分隔；高亮是满行直角，蓝也最深。

---

## macOS 26（Tahoe，NSMenu）

macOS 的菜单栏、右键菜单、pop-up button 的列表用的是同一套 `NSMenu`（官方文档 S14），所以菜单栏
上量到的键盘行为可以类推到右键菜单，但初始高亮这类细节没有文档。

### 打开

- 点按钮、右键、Control+点击都打开；Control+点击是 macOS 的次要点击方式，HIG 明确写了
  （官方文档 S11）。
- 键盘：Ctrl+F2 把焦点移到菜单栏，然后用方向键导航、Return 打开/选中、输入菜单项名称跳转
  （官方文档 S13）。上下文菜单没有系统级的「菜单键」，要走全键盘访问（估计）。
- 初始高亮：指针打开没有（估计，和观察一致）；键盘打开第一项高亮（估计）。

### 键盘

- ↑/↓ 移动，跳过禁用项和分隔线（估计）；不循环，到底停住（估计）。
- Home/End 没有作用（估计）。
- Return 打开菜单或选中项（官方文档 S13）。
- 空格没有作用（估计）。
- Esc 关闭，焦点回到原来的第一响应者（估计；NSMenu 跟踪不改第一响应者）。
- Tab 没有作用（估计）。
- 禁用项可见但变暗，HIG 还专门说 macOS 的右键菜单里 Cut/Copy/Paste 可以是不可用状态
  （官方文档 S11）——也就是说「不可用项仍然占位」是 macOS 的规范，不是遗漏。

### type-ahead

- **有**。菜单栏聚焦后「输入菜单项名称就跳到该项」（官方文档 S13 原文：type the menu item's name
  to jump to that item in the selected menu）。
- 缓冲时间、连按同一字母是否轮换、是否只按前缀匹配，Apple 没有写（估计：短缓冲、前缀匹配）。
- 右键菜单里是否同样有效，没有文档；按同一套 `NSMenu` 跟踪推断是（估计）。
- AppKit 的菜单键盘入口是 key equivalent（`performKeyEquivalent(with:)`，管 Cmd+C 这类快捷键，
  官方文档 S12）；字母跳转不在这套 API 里，它是菜单跟踪的一部分，Apple 只在 S13 描述了「输入
  名称跳转」这一件事。

### 子菜单

- HIG 说子菜单和菜单功能完全相同，只是层级不同，右侧用 chevron 表示（官方文档 S10）。
- 右方向键打开、左方向键关闭、悬停短延迟（估计，150–300ms 量级）、父项保持高亮（估计）。

### 关闭

- 点外面、Esc、切到别的 app 会关（估计）。
- 菜单是模态跟踪，滚动不会关（估计；菜单自己太长时在菜单里滚）；跟踪期间窗口不能缩放，所以
  「缩放关菜单」在原生不存在（估计）。

### 视觉（全是估计）

Tahoe 的菜单比上一代更圆、四周留白更多：外圆角约 12，项高约 24，选中行是内缩约 5、圆角约 6 的
色块；分隔线 1px、左右内缩约 10；禁用项约 50% 不透明度；快捷键右对齐、次要灰、字号和正文一样。

这批数没有量过。AppKit 离屏渲染只能画 window 的 contentView，菜单不在里面；仓库的 macOS 11–15
渲染链也把菜单展开层列为估计（S35）。别拿别的控件的实测量来顶。

---

## macOS 11–15（NSMenu）

### 行为

- 和 26 是同一套 AppKit 菜单，交互模型按同一套处理（估计；没有找到 11–15 与 26 在菜单键盘行为上
  有差别的资料）。下面只列和 26 可能不同的地方。
- 老版本没有 Tahoe 的圆润外观，但「点外面关、Esc 关、方向键不循环、Return 选中、Tab 无作用」这些
  按同一套估计。
- 初始高亮同样是指针打开没有、键盘打开第一项（估计）。

### 视觉（全是估计）

外圆角约 6，项高 22，选中行内缩约 5、圆角约 5，分隔线 1px、左右内缩约 10，禁用项约 50%，
快捷键右对齐、次要灰。

和 26 的差别主要在圆角和留白：26 的菜单更大、更圆，选中块的内缩和圆角都更明显。两代别共用一套
菜单视觉令牌，就像按钮和开关已经分开一样。

---

## GNOME（Adwaita / GTK4 GtkPopoverMenu）

### 打开

- `GtkMenuButton` 点击时打开 popover，空格/Enter 作为按钮激活也会打开（官方文档 S19 + 估计）。
  右键菜单由应用自己弹 `GtkPopoverMenu`；键盘用 Shift+F10 或菜单键，F10 打开主/次菜单
  （官方文档 S16）。
- 初始高亮：指针打开没有（观察；估计）。但源码里有两条线索指向「焦点会进第一项」：
  `gtk_popover_show()` 在 autohide 且没有焦点子项时会 `gtk_widget_child_focus(TAB_FORWARD)`
  （上游源码 S22），而菜单项收到焦点就把自己设成 active/selected（上游源码 S21）；上游 issue
  #5036 的复现步骤也提到「打开后立刻 Esc，焦点还留在菜单按钮里」（上游源码 S23）。
  焦点进去之后会不会立刻画出选中底，没有录屏核对，这条标**待验证**。
- 菜单是 popover，不是模态循环：它做输入 grab，但跟着锚点走（官方文档 S18）。

### 键盘

- Up/Down 移动，**循环**；Tab 和 Shift+Tab 也循环——autohide 的 popover 在方向键/Tab 走到头时
  会绕回去（上游源码 S20 的 `gtk_popover_menu_focus`）。
- Home/End 没有绑定：源码里只有箭头、Tab、Return、Space 的绑定（上游源码 S20），按没有作用处理。
- Return 和空格都激活当前项；空格对可勾选项是切换并保持菜单打开（上游源码 S21）；PopoverMenu
  自己把 Return/Space 绑到 `activate-default`（上游源码 S20）。
- Esc 关闭 popover（官方文档 S18）。
- 禁用项不可聚焦，自然跳过；分隔线不是可聚焦控件（源码推断 + 估计）。
- Tab 是六个平台里唯一把 Tab 当菜单内循环导航的（上游源码 S20）。这一条和 Windows/macOS 差得最远。
- 指针悬停会把焦点带到指针下的项，和键盘焦点打架，上游把这条列为已知不一致（上游源码 S24）。
  我们不做 hover 夺焦，这一点更接近 Windows 11 的模型。

### type-ahead

- 没有前缀搜索：`gtkpopovermenu.c` 里没有字母键或搜索绑定（上游源码 S20）。
- 但有访问键：菜单初始化时把助记符的修饰键清成 0，菜单打开后直接按访问键字母就能触发对应项
  （上游源码 S20）。这不是 type-ahead，不组成前缀，也不会连按轮换；而且它要求标签里定义了
  助记符，没定义就没有。是否需要先按 Alt 让助记符可见，没有实测，标待验证。
- 连按同一字母轮换：没有对应逻辑（上游源码 S20）。

### 子菜单

- 悬停 80ms 打开（`#define OPEN_TIMEOUT 80`，上游源码 S21）。当前没有子菜单打开时，指针进入
  子菜单项会立即打开；已经有一个子菜单打开时，移到另一项要等这 80ms 才切换（上游源码 S21）。
- 右方向键打开，左方向键关闭并把焦点还给父项（上游源码 S20/S21）。
- 父项在子菜单打开期间保持 selected（active item 就是父项，libadwaita 给 `:selected` 画底色）
  （上游源码 S20 + S25）。
- 默认是滑动式子菜单：用 stack 换页，不是并排浮层（官方文档 S17；上游源码 S25 的嵌套 popover
  样式也按这个模型写）。HIG 不建议继续嵌套（S15）。

### 关闭

- 点外面（autohide）和 Esc 关闭（官方文档 S18）。
- 焦点移出菜单也会关：`gtkpopovermenu.c` 的 focus-out 回调在焦点落到菜单外时直接 popdown
  （上游源码 S20）。程序切走、窗口失活按同一结果处理（估计）。
- popover 有 grab，外面的点击和滚动先落到它自己身上，不会穿透到下面（官方文档 S18）。
- 窗口缩放：popover 是跟随父控件的子表面，父控件重新分配时它会重新定位；会不会直接关闭没有
  文档（估计：重新定位，不关）。

### 视觉（SCSS 值，不是像素实测）

- 菜单圆角：GNOME 47（libadwaita 1.6）是 6，GNOME 48（1.7）是 9；popover 外圆角分别是 12 和 15
  （上游源码 S27/S28）。47 和 48 别合并。
- popover 内容默认 padding 8；菜单把它改成 0，改由每个 section 的 box 给 6px 边距。菜单项
  `min-height: 32`、左右 padding 12、圆角等于菜单圆角（上游源码 S25/S26）。
- 分隔线 1px、上下 margin 6，左右随菜单项内缩 6（上游源码 S25/S26）。
- 快捷键文字用 `currentColor` 的 55%（`--dim-opacity`），右对齐，左边 margin 12（上游源码
  S25/S29）。
- 禁用项的文字颜色由 GTK 的 insensitive 颜色决定（libadwaita 没在菜单里覆盖它）；菜单里禁用箭头的
  `filter: Opacity()` 用 `--disabled-opacity`，值是 50%（高对比 40%）（上游源码 S25/S29 + 估计）。

和别处不同的地方：项高和 Win11 一样是 32，但圆角更大（9）；分隔线上下留白最大（6+6）；
快捷键文字是「当前文字色的 55%」而不是固定一种灰；子菜单是滑动换页而不是并排。

---

## 六平台速查

每条的依据见上面各节；这张表只用来对照。

| | Win11 | Win10 | WinXP | macOS 26 | macOS 11–15 | GNOME |
| --- | --- | --- | --- | --- | --- | --- |
| 初始高亮（指针） | 无（官方推断） | 无（估计） | 无（估计） | 无（估计） | 无（估计） | 无（估计） |
| 初始高亮（键盘） | 第一项（估计） | 第一项（估计） | 第一项（估计） | 第一项（估计） | 第一项（估计） | 待验证（源码指向第一项） |
| 方向键循环 | 是（官方） | 否（估计） | 否（估计） | 否（估计） | 否（估计） | 是（源码） |
| Home/End | 无（官方未列） | 无（官方未列） | 无（官方未列） | 无（估计） | 无（估计） | 无（源码） |
| Tab | 困在菜单内（官方+估计） | 无作用（官方未列） | 无作用（官方未列） | 无作用（估计） | 无作用（估计） | 循环（源码） |
| Enter / 空格 | 都激活（官方） | 只有 Enter（官方） | 只有 Enter（官方） | 只有 Return（官方） | 只有 Return（官方） | 都激活（源码） |
| type-ahead | 未确认（估计无） | 访问键为主（官方）+ 前缀（估计） | 同 Win10 | 按名称跳转（官方） | 同 26（估计） | 只有访问键，无前缀（源码） |
| 子菜单悬停延迟 | 约 400ms（估计） | 400ms 默认（官方参数 + 估计默认值） | 同 Win10 | 150–300ms（估计） | 同 26（估计） | 80ms（源码） |
| 点外面 / Esc | 都关（官方） | 都关（估计） | 都关（估计） | 都关（估计） | 都关（估计） | 都关（官方） |
| 分隔线 | 1px，内缩约 4（估计） | 1px，内缩约 3（估计） | 2 条蚀刻线，内缩约 2–3（估计） | 1px，内缩约 10（估计） | 同 26（估计） | 1px，内缩 6（源码） |

---

## 我们这一版的取舍

已经定下的实现，记在这里，不再论证：

1. **菜单元素用 popover API**，点击触发器和右键都打开。原生六家都是锚在触发位置旁边的浮层，形态
   对得上；Windows/macOS 的模态跟踪循环在 web 里做不到，也不该做。
2. **初始无高亮**。和 Windows 指针打开、macOS 指针打开一致；GNOME 存疑（源码线索指向焦点进第一项，
   见上文）。指针打开后按第一次方向键才出现高亮，这是 Windows 文档描述的模型（S3）。从触发器上
   用方向键打开时直接高亮第一/最后一项，落地细节见「实现备注」。
3. **方向键在上一个/下一个可导航项之间循环**。和 WinUI 3、GTK4 一致；Win32 和 macOS 的估计是
   不循环，所以这一条是跨平台统一，不是六家都这样。
4. **Home/End 到首尾**。六个平台里没有一家有明确的 Home/End 支持：Win32 的官方键位表没有（S1），
   WinUI 文档只把它列给 ListView（S3），GNOME 源码没有绑定（S20），macOS 估计没有。这是按
   WAI-ARIA APG 的菜单模式加的（S30），属于 web 便利，不是原生复刻。
5. **type-ahead，缓冲 600ms**。初稿定的是单字符；落地做成了多字符前缀，缓冲 600ms，匹配不到时
   退回单字符，连按同一个字母就轮换（见「实现备注」）。macOS 官方是「输入名称跳转」（S13），
   没有给缓冲时间；Windows 是访问键/助记符优先，前缀匹配没有官方数值；GNOME 只有访问键，没有
   前缀搜索。600ms 是我们自己定的，别在任何地方写成「原生是 600ms」。多字符前缀比初稿更接近
   macOS。
6. **Enter 或空格激活当前项**。WinUI 3 和 GTK 都是两个键都认（S3、S21）；Win32 只认 Enter
   （S1），macOS 只认 Return（S13）。多认一个键，不算错。
7. **Esc 关闭并把焦点还给打开它的元素**。GNOME 文档明确 Esc 关 popover（S18），Windows 的
   light dismiss 也一样（S5）；焦点回到触发器是原生菜单的默认结果（估计）。这一条和原生一致。
8. **点菜单外关闭**。初稿写的是用 popover 的 light dismiss；落地改成 `popover="manual"` 加
   document 的 `pointerdown`（见「实现备注」），因为 auto 的 light dismiss 在「菜单开着时点
   触发器」这条路上会先关再开。行为结果和 Windows 的轻关闭（S5）、GNOME 的 autohide（S18）
   一致；差别是原生 Windows 会把关闭那一下点击吞掉，我们不吞。
9. **滚动或窗口缩放直接关闭**。原生没有这条：Windows/macOS 菜单是模态跟踪，滚动缩放基本不发生；
   GNOME 的 popover 是跟随锚点的子表面，会重新定位而不是关。我们因为菜单位置只在打开时算一次，
   只能关掉（README 的「已知限制」也是这么写的）。这是工程妥协，不是复刻。
10. **暂不支持子菜单和可勾选项（`aria-checked`）**。范围决定。原生六家都有，后续做的时候至少要
    按上文的参数来：悬停延迟 Win32 400ms、GTK 80ms、macOS 估计 150–300ms、WinUI 估计 400ms；
    子菜单打开期间父项保持高亮；左右方向键要接管；可勾选项空格切换且不关菜单（GTK）。
11. **禁用项和分隔线不参与键盘导航**。和原生一致：GTK 里它们不可聚焦（源码），Win32 的分隔线
    不能被选中（S1），其余是估计。

### 实现备注（落地时和上面初稿有出入）

- 弹层用 `popover="manual"`，不是默认的 auto。auto 的 light dismiss 在「菜单开着时点触发器」这条
  路径上会先把菜单关掉，再把同一次 click 交给触发器，结果又打开一遍，看起来像关不掉。改成 manual
  后，点外面由 `js/menu.js` 的 document `pointerdown` 处理，关闭时机和焦点归属都能自己定。
- 点外面那一下没有吞掉。原生 Windows 菜单会把关闭菜单的这次点击吃掉，不做任何事；我们让点击照常
  落到下面的元素上。要吞就得在 `pointerdown` 里 `preventDefault`，容易误伤正常交互，先不做。
- Tab 关闭菜单、焦点继续往后走，跟 Windows / macOS 的估计一致；GNOME 的「Tab 在菜单内循环」没做。
- 方向键循环按统一模型实现，没有按平台拆开。速查表里 Win10 / WinXP / macOS 的「不循环」都是估计，
  不值得为估计值分叉行为。以后要分平台，`createMenu` 加一个 `wrap` 开关即可。
- 初始高亮按「无」实现。用键盘打开（焦点在触发器上按上下键）时高亮第一项 / 最后一项，和速查表
  「键盘打开」那一行一致。

### 需要修正或明确的地方

- **循环不是六家通用**。如果以后按平台做行为差异，`macos`、`macos15`、`win10`、`winxp` 应该在
  首/尾停住（这是估计：只有 WinUI 和 GTK 有文档/源码，Win32 两条没有可引用的依据），只有 `win11`
  和 `gnome` 循环。现在统一循环等于用 WinUI 的模型统一了全部平台，和「每个平台像自己」的原则有
  冲突。
- **Home/End 和 600ms 这个数值要标成 web affordance**。文档、注释、README 里都别写成原生行为；
  type-ahead 已经做了多字符前缀（比初稿的单字符更接近 macOS 的「输入名称」，S13），剩下的
  600ms 仍是我们自己定的。
- **GNOME 的初始高亮要再核一次**。源码线索指向焦点进第一项，如果真是这样，GNOME 主题的菜单
  打开时就该有一行选中底。这件事只能靠录屏或真机确认，别按现在的「全部无高亮」定死。
- **Tab 已经按「关菜单、焦点继续往后走」实现**（见「实现备注」），更接近 Windows/macOS；GNOME
  的「Tab 在菜单内循环」（S20）没做。如果要逐平台复刻 GNOME，这里得单独拦 Tab。
- **滚动/缩放关闭别写成原生行为**。它是 web 侧的位置计算妥协；如果以后要更贴近 GNOME，应该在
  滚动/缩放时重新定位而不是关闭。
- **分隔线的内缩和禁用色全部是估计**，主题文件里如果用了这些数，注释要标估计，等真机量过再改。

---

## 来源清单

### 微软官方文档

- **S1** About Menus（标准键盘接口表、分隔线、指针打开子菜单、访问键）：<https://learn.microsoft.com/en-us/windows/win32/menurc/about-menus>
- **S2** WM_CONTEXTMENU（右键、Shift+F10、菜单键；键盘触发时坐标为 -1）：<https://learn.microsoft.com/en-us/windows/win32/menurc/wm-contextmenu>
- **S3** Keyboard interactions（弹出菜单循环、空格/Enter、焦点被困、禁用项不参与导航）：<https://learn.microsoft.com/en-us/windows/apps/develop/input/keyboard-interactions>
- **S4** Menu flyout and menu bar（SplitMenuFlyoutItem 的左右/Esc 规则、light dismiss）：<https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/menus>
- **S5** Flyouts（轻关闭的四种方式、点外面吞点击、焦点被困）：<https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/dialogs-and-flyouts/flyouts>
- **S6** SystemParametersInfo（`SPI_GETMENUSHOWDELAY` 的定义）：<https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-systemparametersinfoa>
- **S7** WM_MENUCHAR（字母键未匹配助记符/加速键时交给应用处理）：<https://learn.microsoft.com/en-us/windows/win32/menurc/wm-menuchar>
- **S8** Menus（菜单资源总览；`WM_ENTERMENULOOP` 说明菜单有模态循环）：<https://learn.microsoft.com/en-us/windows/win32/menurc/menus>
- **S9** Menus and context menus（菜单 vs 右键菜单的入口）：<https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/menus-and-context-menus>

### Apple 官方

- **S10** HIG — Menus（子菜单、分隔线、不可用项仍显示）：<https://developer.apple.com/design/human-interface-guidelines/menus>
- **S11** HIG — Context menus（Control+点击、macOS 右键菜单保留不可用的 Cut/Copy/Paste）：<https://developer.apple.com/design/human-interface-guidelines/context-menus>
- **S12** AppKit — NSMenu（API 与 `performKeyEquivalent`、`popUp` 等入口）：<https://developer.apple.com/documentation/appkit/nsmenu>
- **S13** Apple 支持 — Mac 键盘快捷键（Control+F2、Return、输入菜单项名称跳转）：<https://support.apple.com/en-us/102650>
- **S14** Application Menu and Pop-up List Programming Topics（NSMenu 覆盖菜单栏/右键/pop-up 的说明）：<https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/MenuList/MenuList.html>

### GNOME / GTK / libadwaita

- **S15** GNOME HIG — Menus（菜单项、访问键、子菜单尺寸）：<https://developer.gnome.org/hig/patterns/controls/menus.html>
- **S16** GNOME HIG — Keyboard（F10、Shift+F10/菜单键、Return、Space、Esc）：<https://developer.gnome.org/hig/guidelines/keyboard.html>
- **S17** GTK4 — GtkPopoverMenu（菜单模型、Space/默认控件、滑动子菜单）：<https://docs.gtk.org/gtk4/class.PopoverMenu.html>
- **S18** GTK4 — GtkPopover（autohide、Esc、输入 grab）：<https://docs.gtk.org/gtk4/class.Popover.html>
- **S19** GTK4 — GtkMenuButton（点击/键盘打开）：<https://docs.gtk.org/gtk4/class.MenuButton.html>
- **S20** GTK 源码 `gtkpopovermenu.c`（Up/Down/Tab 循环、左右方向键、助记符修饰键清 0、无 Home/End 绑定）：<https://gitlab.gnome.org/GNOME/gtk/-/blob/main/gtk/gtkpopovermenu.c>
- **S21** GTK 源码 `gtkmodelbutton.c`（聚焦即选中、Return/Space 激活、80ms 子菜单延迟）：<https://gitlab.gnome.org/GNOME/gtk/-/blob/main/gtk/gtkmodelbutton.c>
- **S22** GTK 源码 `gtkpopover.c`（popover show 时 child_focus）：<https://gitlab.gnome.org/GNOME/gtk/-/blob/main/gtk/gtkpopover.c>
- **S23** GTK issue #5036（打开后立刻 Esc，焦点留在菜单项里）：<https://gitlab.gnome.org/GNOME/gtk/-/issues/5036>
- **S24** GTK issue #6706（悬停夺焦的已知不一致）：<https://gitlab.gnome.org/GNOME/gtk/-/issues/6706>
- **S25** libadwaita `_menus.scss`（项高 32、padding、分隔线 margin、快捷键颜色）：<https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/stylesheet/widgets/_menus.scss>
- **S26** libadwaita `_popovers.scss`（popover padding 8、圆角、阴影）：<https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/stylesheet/widgets/_popovers.scss>
- **S27** libadwaita `_common.scss`（main：menu_radius 9、popover_radius 15）：<https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/stylesheet/_common.scss>
- **S28** libadwaita `_common.scss`（1.6.10：menu_radius 6、popover_radius 12）：<https://gitlab.gnome.org/GNOME/libadwaita/-/blob/1.6.10/src/stylesheet/_common.scss>
- **S29** libadwaita `_colors.scss`（`--dim-opacity` 55%、`--disabled-opacity` 50%）：<https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/stylesheet/_colors.scss>

### WAI-ARIA 与仓库内记录

- **S30** WAI-ARIA APG — Menu and Menubar Pattern（打开后焦点在第一项、Home/End、循环、可打印字符跳转）：<https://www.w3.org/WAI/ARIA/apg/patterns/menubar/>
- **S31** 仓库 `docs/winxp-native-notes.md`（XP 菜单的 GDI 实测颜色/边框、18px 项高是布局取值）：<./winxp-native-notes.md>
- **S32** 仓库 `docs/verification.md`（Win10 下拉框列表的实测，别当系统菜单用）：<./verification.md>
- **S33** 仓库 `docs/windows-winui3-notes.md`（WinUI 3 像素还没拿到，视觉只能估计）：<./windows-winui3-notes.md>
- **S34** 仓库 `README.md`（菜单位置只算一次、滚动/缩放关闭的既有说明）：<../README.md>
- **S35** 仓库 `docs/macos15-native-notes.md`（AppKit 渲染链的覆盖范围；菜单展开层是估计）：<./macos15-native-notes.md>
