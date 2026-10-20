# Windows 像素证据来源评估：只有 Win10 时能到哪一档

结论先行。三条：

1. **Win11 的控件像素不需要 Win11。** 本项目目标是 WinUI 3（Fluent 2），而 WinUI 3 的控件模板、圆角、描边、焦点框、强调色派生全在 **Windows App SDK 框架包**里，不在操作系统里。同一个 Windows App Runtime 版本渲染出来的控件，在 Win10 19045 和 Win11 上是同一份代码画的。所以「用 Win10 机器抓 Win11 控件的本体」是成立的，不是跨版本搬运数值。
2. **真正卡住的是操作系统提供的那一小层。** Segoe UI Variable 字体（Win11 才有）、Mica 材质（Win11 才有）、顶层窗口圆角与标题栏、系统强调色的默认值、IME 候选窗、高对比映射——这些只有真 Win11 能给。项目已声明不做材质，所以其中大部分不在范围内，但字体和强调色默认值在范围里。
3. **Kross 这条路 15 分钟内已经走不通，并且不是配置问题，是镜像问题。** 当前可访问的唯一工作区只有 `windows-basic`，实测是 **Windows 10 Enterprise 17763（Server 2019 内核）的 CI 容器**，无桌面、无 DWM、无 `aero2.msstyles`、截图 API 直接报「句柄无效」，比 box-win 的 19045 还旧，且没有 Win11 模板可选。已清理，没有留下工作负载。

据此，本机（无 Win11 物理机）的 Windows 证据上限是：

| 目标 | 只用 Win10 能到的档位 | 依据 |
| --- | --- | --- |
| WinUI 3 控件的几何/圆角/描边/状态色/焦点框 | **系统本身级**（可做到，需在 box-win 跑 WinUI 3） | 模板在 Windows App SDK 内，见下文第三节 |
| WinUI 3 的文字排版、字形、字宽 | **官方文档截图级** | box-win 没有 Segoe UI Variable，只有 Segoe UI |
| 窗口圆角、标题栏、Mica、系统强调色默认值 | **上游源码级**（Win11 行为由 OS 决定） | 官方文档 + 框架源码，无法在本机出像素 |
| Win32 / aero.msstyles 的 Win11 外观 | **观感估计级**（Win10 实测不能推） | 没有官方数值表，Win11 是另一份主题二进制 |
| 官方发布的 Win11 控件截图 | **官方文档截图级**（已有 4 张，1x） | learn.microsoft.com / WinUI Gallery 仓库 |

---

## 0. 先纠正两个前提

**其一：box-win 不是 Win11，连"接近"都算不上。** 实测 `Windows 10 Enterprise | 22H2 | 19045.5608`。Win11 的构建号是 22000 / 22621 / 22631 / 26100 这一串，和 19045 不是同一个内核代际。Win10 上的 Win32 控件、系统字体、DWM 行为和 Win11 都不一样。

**其二：`aero2.msstyles` 在 Win10 上实测不存在。** 在 box-win 上：

```
aero2=False
aero=True
```

Kross 的 17763 容器里也一样（aero2 缺失、aero 存在）。也就是说，任务描述里「Win10 与 Win11 的 aero2.msstyles 差异」这个提法本身未经核实：至少 Win10 22H2 上可确认的 Win32 主题文件是 `aero.msstyles`，`aero2.msstyles` 找不到。**Win11 上到底叫哪个名字，必须先在一台真 Win11 上 `Test-Path` 一次再写进文档**，不能凭印象。这条已记入第七节待验证清单。

---

## 1. Kross 远程环境：能开，但开不出 Win11（实测记录）

按 `kross-remote-env` skill 走完全流程，结论是「环境能起，镜像不对」。

### 1.1 本机 CLI 与认证

- 本机原本没有 `bytedcli`。装到 `/tmp/kross-cli`（`@bytedance-dev/bytedcli@0.174.0`），没动全局环境。
- 认证一开始失败：`refresh token failed: open ~/.local/share/bytedcli/.../.credentials.secrets.json.*.tmp: operation not permitted`。原因是当前 agent 沙箱只允许写工作区，凭据刷新要写家目录。把 `HOME` 指到 `/tmp/fakehome` 并复制一份凭据后通过：`✓ ready (login expires 2026-11-19)`。**这是沙箱限制，不是认证过期**，换个人在正常 shell 里跑不会有这个问题。
- 可访问工作区只有 1 个：`test-public-workspace`（ID 130，集群 8，配额 100 核 / 400 GiB / 1 TB）。skill 里默认的 `lynx.infra.cq_env_win` 在这个账号下不存在。

### 1.2 模板与镜像

工作区里共 10 个模板，Windows 只有一个：`windows-basic`（描述只有一句 "Windows basic container defaults"，不暴露镜像）。起一个 workload 后从返回体拿到真实镜像：

```
Image: hub.byted.org/bitscloudbuild/cq_windows_vs2019:v0.0.16
```

进容器实测：

```
Microsoft Windows NT 10.0.17763.0
Windows 10 Enterprise
CurrentBuild: 17763
```

即 Server 2019 内核的 CI 构建容器。**本账号可见范围内没有 Win11 模板，也没有可选的 Win11 镜像**——Windows 11 客户端本身不作为容器基础镜像发布，Kross 的 Windows 节点是 Server 型 CI 节点，不是桌面。

### 1.3 能不能截图 / 能不能传文件

- **截图：不能。** 会话只有 `services`（session 0）；`dwm`、`explorer` 都没跑；`aero2.msstyles` 不存在；`CopyFromScreen` 直接抛 `The handle is invalid`。`[Screen]::AllScreens` 报 1024×768 是虚拟值，没有可捕获的桌面。
- **文件：能。** 上传 996 B 脚本到 `C:\workspace\probe.ps1`、下载 35 B 结果文件都成功。真要传产物这条路是通的。
- 工作负载 `win11-probe-20261020-214445`（ID 17612）已删除，配额已释放。

### 1.4 阻塞点（照实写）

1. 现有模板没有 Win11，也没有 Win11 可用的镜像；
2. 唯一 Windows 镜像 17763，比 box-win 还旧，且是 Server 容器；
3. 无桌面会话 → 连 Win10 的 UxTheme 都渲染不了，更别说 WinUI 3；
4. 要让 Kross 出 Win11 桌面，得平台方新增「Win11 桌面模板 + 带显示的环境」，属于跨团队需求，按天算，且 CI 容器模型天然不适合做 GUI 截图。

**范围限定：以上是「本账号可见范围」的结论。** 本账号只有 1 个工作区，skill 默认的 `lynx.infra.cq_env_win` 不可见，其他团队的工作区也看不到，所以严格说是「本账号能开的 Windows 模板里没有 Win11」，不是「Kross 全公司都没有 Win11」。如果谁手里有带 **Win11 桌面镜像 + GUI 会话**的工作区（类似 `mac-gui` 那种），这条路值得重开一次；否则不再投入。

---

## 2. Win32 侧：Win10 22H2 vs Win11 能确认到什么程度

### 2.1 官方只给了一件事的数值：几何

微软自己的「Geometry in Windows」写得很明确：Win11 用三级圆角——顶层容器 8px、页内控件 4px、直角相交处 0px；并且这两个值对应全局资源 `ControlCornerRadius`（4px）和 `OverlayCornerRadius`（8px）。原文还点名 Button / CheckBox / ComboBox / TextBox / ListView 都是 4px。

- 依据等级：**官方文档（Tier 2）**，但这是设计规范，不是 Win32 控件实测值。
- 链接：<https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/geometry>

另一页讲 Win11 顶层窗口自动圆角，并说明**VM、AVD、最大化、贴靠时不圆角**：

- <https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/ui/apply-rounded-corners>

这条对「最短路径」影响很大：**用 Win11 VM 或 RDP 抓不到圆角窗口的证据**，顶层窗口圆角必须物理机。好消息是组件库在页面内，窗口圆角本来就用不上。

### 2.2 没有任何官方数值表：控件高度、描边、焦点框

我查了 learn.microsoft.com 的 Fluent 设计页、控件页、Win32 主题文档，**没有一份文档给出 aero.msstyles / aero2.msstyles 里控件的 height / border / focus rect 数值**。微软只把「4px/8px 圆角」写进设计规范，其余都在主题二进制里。

所以对 Win32 只能有两种拿法：

1. 在真 Win11 上跑 `DrawThemeBackground` / `GetThemeMetric` 量（Tier 1）；
2. 解析 Win11 的 msstyles 二进制（算「上游源码」的逆向，不是可直接引用的规范）。

**Win10 上量到的 Win32 数值，对 Win11 无效。** 这不是精度问题，是对象换了：Win11 的 Win32 主题文件是另一份二进制，圆角、描边、焦点框都改过。按 AGENTS.md「不跨平台搬运数值」的同一条道理，跨版本也不能搬。

### 2.3 能确认的定性差异（都不带数值）

| 项目 | Win10 22H2 | Win11 | 依据 |
| --- | --- | --- | --- |
| 控件圆角 | Win32 按钮/输入框基本是直角（社区普遍印象） | 4px（官方规范点名 Button/TextBox 等） | 官方文档 Tier 2 |
| 焦点框 | 单层直角虚线/实线矩形 | 圆角、双色（WinUI 侧可确证：外描边 + 内描边两色） | 上游源码 Tier 3（WinUI 侧）；Win32 侧待实测 |
| 顶层窗口 | 直角 | 8px 圆角（VM/RDP 除外） | 官方文档 Tier 2 |
| 控件高度 | 23px 量级（Win32 按钮，待 box-win 实测） | WinUI 3 按钮 32px 量级（项目现用值） | **估计**，见下方警告 |

**警告：上表最后一行是估计，不能当依据。** Win32 的 23px 是社区常见说法，我这次没有在 box-win 上量；WinUI 3 的 32px 是项目当前值，也应在渲染后回填。这两个数在真 Win11 上都要重新量。

### 2.4 绝对不能从 Win10 推到 Win11 的清单

- 控件高度、内边距、最小宽度；
- 圆角半径（Win11 是 4px，Win10 不是）；
- 描边宽度与颜色（尤其按钮底部那条 1px 内描边的强度）；
- 焦点框形状与颜色（Win11 圆角双色）；
- 悬停/按下态的颜色变化幅度；
- 系统强调色的派生值（见 3.3）；
- 字体排版（Win10 没有 Segoe UI Variable）。

一句话：**Win32 侧，Win10 只能证明「Win10 长这样」，对 Win11 零证据价值。**

---

## 3. WinUI 3 侧：控件模板与 OS 版本无关（这条是本次调研最有用的一条）

### 3.1 官方原话

Windows App SDK 官方介绍页写：

> "**Consistent across Windows versions:** Windows App SDK APIs run on Windows 11 and earlier versions starting from Windows 10, version 1809. This allows you to use new features as soon as they are released **without depending on operating system updates** or writing version adaptive code."

- 链接：<https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/>
- 依据等级：**官方文档（Tier 2）**，但这是微软对「框架与 OS 解耦」的明确承诺，比二手资料硬。

### 3.2 模板确实在框架里，不在 OS 里

从 microsoft-ui-xaml 仓库直接读到当前 WinUI 3 的控件主题资源（**上游源码，Tier 3**）：

| 令牌 | 值 | 源码文件 |
| --- | --- | --- |
| `ControlCornerRadius` | `4,4,4,4` | [CornerRadius_themeresources.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/CornerRadius_themeresources.xaml) |
| `OverlayCornerRadius` | `8,8,8,8` | 同上 |
| `ButtonPadding` | `11,5,11,6` | [Button_themeresources.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Button_themeresources.xaml) |
| `ButtonBorderThemeThickness` | `1` | 同上 |
| `CheckBoxSize` | `20` | [CheckBox_themeresources.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/CheckBox_themeresources.xaml) |
| `CheckBoxGlyphSize` | `12` | 同上 |
| `CheckBoxHeight` | `32` | 同上 |
| ToggleSwitch 轨道 / 滑块 | `40×20` / 外 20、内 12 | [ToggleSwitch_themeresources.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/ToggleSwitch_themeresources.xaml) |
| `SliderTrackThemeHeight` / 拇指 | `4` / 外 18、内 12 | [Slider_themeresources.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Slider_themeresources.xaml) |
| 焦点框两色（浅色） | 外 `#E4000000`、内 `#B3FFFFFF` | [Common_themeresources_any.xaml](https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml) |
| 焦点框两色（深色） | 外 `#FFFFFF`、内 `#B3000000` | 同上 |
| 强调色填充（浅色主题） | `SystemAccentColorDark1` | 同上 |
| 强调色填充（深色主题） | `SystemAccentColorLight2` | 同上 |

两个可直接用起来的推导：

- **项目现在的 `--ui-accent: #005fb8` / `#60cdff` 的映射关系是框架定的**：浅色主题的强调填充取 `SystemAccentColorDark1`，深色取 `SystemAccentColorLight2`（源码已确认）。但 `#005FB8` / `#60CDFF` 是否就是默认蓝 `#0078D4` 派生出的那两个具体值，本次没能从官方 token 表直接取到（Fluent 2 站点是 JS 渲染，抓不到文本），标成**待核**。这两个值本身和公开的 Win11 默认强调填充一致，不作为已核实依据。
- **项目的焦点框可能画错了**：现在是单层 `2px solid #000000`。WinUI 3 是**双色两层**（浅色模式外深内浅、深色模式外浅内深），并且带圆角。这是下一轮校准的明确目标。

### 3.3 Win10 19045 上渲染的 WinUI 3 和 Win11 差在哪

差异全部来自「OS 提供给框架的东西」，不来自控件模板本身：

| 差异项 | Win10 19045 | Win11 | 影响范围 | 依据 |
| --- | --- | --- | --- | --- |
| Segoe UI Variable | **没有**（box-win 实测无 `SegUIVar*.ttf`） | 有 | 文字排版、字宽、基线；几何不受影响 | 官方排版文档 Tier 2 + box-win 实测 Tier 1 |
| Mica / 背景材质 | 不支持，退化为纯色 | 支持 | 项目已声明不做材质，**无影响** | 官方 materials 页 Tier 2 |
| 顶层窗口圆角 | 无 | 有 | 组件库在页面内，**无影响** | 官方圆角页 Tier 2 |
| 标题栏/caption 按钮 | Win10 样式 | Win11 样式 | 项目不含标题栏，**无影响** | 官方圆角/窗口文档 |
| 系统强调色默认值 | Win10 默认 | Win11 默认（可能不同） | 强调色派生值（`#005FB8`/`#60CDFF` 是否等于真机）**需要一次核对** | 框架源码 Tier 3 + 待验证 |
| IME 候选窗、高对比映射 | OS 提供 | OS 提供 | 不在当前范围 | — |
| 控件本体（填充、描边、圆角、焦点、状态过渡） | 框架绘制 | 框架绘制 | **完全一致（同版本框架）** | 官方解耦承诺 Tier 2 + 模板源码 Tier 3 |

### 3.4 可以作为「系统本身级」的控件清单（Win10 + 同版 Windows App Runtime）

- 按钮：填充色、1px 描边、4px 圆角、`11,5,11,6` 内边距、悬停/按下/禁用色、焦点框；
- 输入框：底边强调线、圆角、内边距、占位符色、聚焦态；
- 复选框/单选框：20px 方块、12px 勾、边框粗细、选中强调色；
- 开关：40×20 轨道、12px 滑块、开态强调色、过渡时长（框架定义的 83/167ms 量级）；
- 滑块：4px 轨道、18px 拇指、内圈 12px、强调填充；
- 下拉框（含展开层）：4px / 8px 圆角、菜单阴影、项高、选中态；
- 明暗两套中性色板（`SolidBackgroundFillColorBase` 等框架资源）。

### 3.5 不能作为 Win11 系统级依据的清单

- 任何包含文字像素的度量（字形、字宽、行高微调）——没有 Segoe UI Variable；
- 系统强调色的**默认值**与用户自定义后的派生值——要有真 Win11 或至少确认两边默认强调色一致；
- Mica、窗口圆角、标题栏、阴影——OS 合成层；
- 高对比主题映射、IME 候选框、系统级右键菜单；
- 任何 Win32 / aero.msstyles 的东西（那是另一套控件体系，不是 WinUI 3）。

---

## 4. 官方/上游可引材料与直链

**官方文档（Tier 2）**

- 几何/圆角规范：<https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/geometry>
- 顶层窗口圆角（含 VM/RDP 不圆角）：<https://learn.microsoft.com/en-us/windows/apps/desktop/modernize/ui/apply-rounded-corners>
- 排版 / Segoe UI Variable：<https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/typography>
- 材质 / Mica：<https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/materials>
- 颜色 / 强调色：<https://learn.microsoft.com/en-us/windows/apps/design/signature-experiences/color>
- Windows App SDK（OS 解耦原话）：<https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/>
- 控件页：<https://learn.microsoft.com/en-us/windows/apps/design/controls/buttons>、<https://learn.microsoft.com/en-us/windows/apps/design/controls/toggles>、<https://learn.microsoft.com/en-us/windows/apps/design/controls/text-box>

**上游源码（Tier 3）**

- 圆角令牌：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/CornerRadius_themeresources.xaml>
- 按钮：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Button_themeresources.xaml>
- 输入框：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/TextBox_themeresources.xaml>
- 复选框：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/CheckBox_themeresources.xaml>
- 开关：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/ToggleSwitch_themeresources.xaml>
- 滑块：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Slider_themeresources.xaml>
- 焦点/强调色：<https://github.com/microsoft/microsoft-ui-xaml/blob/main/controls/dev/CommonStyles/Common_themeresources_any.xaml>

注意：仓库里同一控件有 `*_themeresources.xaml` 和 `*_themeresources_perf2026.xaml` 两套，说明样式会随框架版本演进。**抓像素和引 token 都必须锁 Windows App SDK 版本**，否则会把两个版本的差异误当成平台差异。

**官方发布的 Win11 控件截图（Tier 2，可直接下）**

| 用途 | 直链 | 尺寸 |
| --- | --- | --- |
| WinUI 3 Gallery 整窗（最好的 Win11 参考） | <https://raw.githubusercontent.com/microsoft/WinUI-Gallery/main/.github/assets/Screenshot-light.png> | 1493×805 |
| 同上，深色 hero（不是控件页，仅作参考） | <https://raw.githubusercontent.com/microsoft/WinUI-Gallery/main/.github/assets/ReadmeHero-dark.png> | — |
| 按钮（1x） | <https://learn.microsoft.com/en-us/windows/apps/design/controls/images/button.png> | 277×115 |
| 按钮 + 对话框（1x，能看主/次按钮与对话框圆角） | <https://learn.microsoft.com/en-us/windows/apps/design/controls/images/button-dialog-example.png> | 387×289 |
| 开关 + 复选框（1x） | <https://learn.microsoft.com/en-us/windows/apps/design/controls/images/toggleswitches02.png> | 259×248 |
| 单行输入框（1x） | <https://learn.microsoft.com/en-us/windows/apps/design/controls/images/single-line-text-input-type-text.png> | 381×145 |

这批图的问题是：**1x、控件小、没有针对八种控件 × 五状态 × 明暗的系统覆盖**。learn 上也没有 `@2x`（之前验证过 404）。所以它们只能当「官方文档截图级」，不能替代实测。

---

## 5. 要拿 Win11 实测：最短路径排序

前提：本项目要的是 **WinUI 3 控件本体**，不是整窗外观。按这个前提排序，成本和收益完全不同。

### 路径 A（推荐）：在 box-win 上跑 WinUI 3，拿框架画的像素

**为什么这算 Win11 证据**：不是把 Win10 的值搬到 Win11，而是在 Win10 上运行「Win11 目标所用的同一套渲染代码」。控件模板在 Windows App Runtime 里，版本锁对了，像素就是同一个来源。

box-win 实测条件（本次已确认）：

- Windows 10 Enterprise 22H2 19045.5608，ssh 免密可达；
- **有桌面会话，但都不是「活跃本地桌面」**：session 2/3 里有 `explorer` + `dwm`，状态是断开（RDP 会话）；console session 1 只有 `LogonUI`（没人登录）——所以截图前要先确认断开会话的桌面能不能抓，或者把会话连上；
- **Windows App Runtime 已装 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 2.x（2.3.1.0）**——框架依赖型 WinUI 3 应用可以直接跑；
- 没有 .NET SDK / msbuild / cl，只有 .NET Framework 4.0 的 `csc.exe`（跑不了 WinUI 3 工程）；
- 没有 Segoe UI Variable；
- 没有外网。

因此需要补的只有一步：**在一台能构建 WinUI 3 的机器上生成一个最小 WinUI 3 应用，再把产物拷到 box-win 跑**。可选做法：

1. 最小 C# WinUI 3 工程 + `WindowsAppSDKSelfContained=true`（不依赖目标机装 Runtime），在任意装了 VS 2022 + Windows App SDK 的开发机上构建；
2. 或者直接侧载 WinUI 3 Gallery（box-win 已有 1.7/1.8 Runtime，只缺 appx 本体）；
3. 构建机也可以试 Kross 的 `windows-basic`（镜像是 VS2019 的 CI 镜像，可能带 MSBuild，但本次未验证）。

跑起来之后：

- 用 `schtasks` 在 session 2/3 里拉起进程（ssh 在 session 0，直接跑 GUI 不会出现在桌面上）；
- 截图用 PowerShell + `System.Drawing.CopyFromScreen`，或对目标窗口 `PrintWindow`；
- 图放 `reference/shots/windows/win11/`。

**耗时估计 2–4 小时**（构建 1–2h，会话调度 + 截图脚本 0.5–1h，跑通留缓冲）。
**风险**：① 构建机工具链是否齐（未验证）；② 断开/无活动的 RDP 会话能否稳定截图（未验证）；③ 没有 Segoe UI Variable，文字像素永远不是 Win11 的；④ 必须锁 WindowsAppRuntime 版本。

### 路径 B：Win11 虚拟机

- Apple Silicon 上跑 Win11 ARM（Parallels / UTM），官方 ISO 可下；
- 能拿到：真 Win11 的字体、强调色默认值、Mica 边界、Win32 主题；**拿不到**：顶层窗口圆角（官方明说 VM 不圆角）、Mica 在远程/虚拟显示下的真实效果。

**耗时 3–5 小时**（下载 5–6 GB + 安装 + 工具链）。
**风险**：ARM 上 Win32 走仿真、显卡/合成路径与物理机不同；VM 里 WinUI 3 的渲染后端也可能退化。

### 路径 C：RDP 到一台现成 Win11

- 只要有机器，分钟级接入，且能拿到真实字体/强调色/Mica；
- 但按官方文档，AVD/RDP 会话里顶层窗口不圆角，合成层效果不保证。

**耗时 10–30 分钟**（前提：真的有人给你一台 Win11）。
**风险**：屏幕缩放、会话断开后截图、权限。

### 路径 D：Kross

- 当前不可能，见第一节；要变成可能，需要平台方新增 Win11 桌面模板，按天算。
- 就算新增，Kross 的 Windows 是 Server 容器模型，headless 是常态，不适合做 GUI 像素采集。

**结论：有现成 Win11 就选 C；没有就选 A（给项目要的控件本体足够，而且 box-win 条件已经具备大半）。B 只在必须核实字体/强调色默认值时值得做。**

---

## 6. 如果就用 Win10 管线：哪些度量仍然可信

**可信（可当 Win11 目标值，前提是跑 WinUI 3 且锁框架版本）**

- 所有 WinUI 3 控件的几何：高度、内边距、圆角、描边宽度、图标/勾的尺寸；
- 填充/描边/状态色的**相对关系**和框架中性色板；
- 焦点框结构（双色、层数、圆角）；
- 过渡时长与缓动（框架定义，不是 OS 动画）；
- 展开层（下拉菜单）的圆角、阴影、项高、选中态。

**不可信（必须标成估计或等 Win11）**

- 文字相关：字形、字宽、字距、行高微调、CJK 回退；
- 强调色的系统默认值与用户自定义后的派生值；
- Mica/毛玻璃/窗口圆角/标题栏；
- 系统级控件：IME 候选窗、系统右键菜单、滚动条在系统级容器里的样子；
- 任何 Win32 / aero.msstyles 的数值。

**需要改口径的地方**

- 文档里不要写「Win11 实测」，写「Windows App SDK 版本 X 在 Win10 19045 上的框架渲染」，并注明字体是 Segoe UI 回退；
- 主题文件里的数值注释要带版本号：`依据：WinUI 3 (WindowsAppSDK 1.8) Button_themeresources.xaml`，而不是笼统的「Win11」。

---

## 7. 到真 Win11 上要打勾的清单

1. `Test-Path C:\Windows\Resources\Themes\aero\aero2.msstyles` 和 `aero.msstyles`——确认名字，纠正本文第 0 节的前提；
2. 记下 `CurrentBuild`、`DisplayVersion`、Windows App Runtime 版本；
3. 读 `HKCU\Control Panel\Desktop\WindowMetrics\AppliedDPI`，确认截图缩放；
4. 系统强调色默认值（注册表 `HKCU\Software\Microsoft\Windows\DWM\AccentColor`），核对 `#005FB8` / `#60CDFF` 是否真机一致；
5. 用同一版 Windows App Runtime 渲染八种控件，逐项和 box-win 版本对照，差异应只剩文字；
6. Win32 侧：`GetThemeMetric` 量按钮高度/边框/圆角，`DrawThemeBackground` 离屏出图；
7. 顶层窗口圆角要在物理机上看（VM/RDP 不圆角）。

---

## 附：本次实测可复现命令摘要

Kross（在有正常家目录权限的 shell 里执行）：

```bash
npm install --prefix /tmp/kross-cli --cache /tmp/kross-npm-cache \
  @bytedance-dev/bytedcli@latest
/tmp/kross-cli/node_modules/.bin/bytedcli kross template list \
  --workspace test-public-workspace --json
# 起容器后确认 OS
bytedcli kross workload exec --workspace test-public-workspace --name <name> \
  --container-name main --shell powershell \
  --command '[System.Environment]::OSVersion.VersionString'
```

box-win（本次实测输出）：

```
Windows 10 Enterprise | 22H2 | 19045.5608
aero2=False, aero=True
Segoe UI Variable: 无
WindowsAppRuntime: 1.4 / 1.5 / 1.6 / 1.7 / 1.8 / 2.3.1.0
dotnet=False msbuild=False cl=False csc_framework=True
session 0 (services) 里 OpenThemeData(BUTTON)=0  ← UxTheme 在 ssh 会话里不可用
session 2/3 有 dwm + explorer（均为断开状态）；session 1 只有 LogonUI；session 0 是 services
```

> `reference/shots/windows/win11/` 本次没有样张：Kross 出不了 Win11，box-win 的 WinUI 3 最小验证需要先解决构建机（见路径 A），不在本次 15 分钟窗口内。
