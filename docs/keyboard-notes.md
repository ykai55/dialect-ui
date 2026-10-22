# 焦点顺序与键盘模型

这份文档记两件事：Tab 焦点是怎么排的，每个组件键盘上能做什么。视觉焦点框的实现
在各主题的 `--focus-*` / 组件自己的焦点令牌里，不在这里重复。

## 焦点顺序

- 默认按 DOM 顺序走，没有正 tabindex 改写顺序。
- 分段控件和标签页用 roving tabindex：整组只留一个 Tab 站（选中项或第一个可用项），
  组内用方向键移动；Tab 从组里直接离开。
- 菜单打开后焦点进菜单本身，靠 `aria-activedescendant` 指当前项；Tab 关闭菜单并把焦点
  交给下一个元素。下拉框相反：焦点一直留在按钮上，`aria-activedescendant` 也挂在按钮上，
  和原生 combo 一致。
- 提示气泡不接收焦点，`pointer-events: none`，不会打断 Tab 顺序；显示时给触发元素挂
  `aria-describedby`，消失时摘掉。
- 标签面板本身不是 Tab 站，面板里的可聚焦元素按正常顺序排。
- 禁用控件用原生 `disabled`，自然不进 Tab 顺序；分段控件里被 `aria-disabled` 标记的段
  也会被脚本跳过。

## 各组件键盘

| 组件 | 键盘 |
| --- | --- |
| 按钮 / 输入框 / 多行输入 | 原生行为，Tab 进入、空格/回车触发、输入框内方向键移动插入符 |
| 复选框 / 单选框 / 开关 | 原生 `input`：空格切换；单选框同组方向键切换（依赖原生 radio group，每个主题面板里的 name 各自独立） |
| 下拉框 | 上/下方向键打开并移动、Home/End 到首尾、Enter/空格确认、Esc 关闭；收起状态输入字母直接跳到前缀匹配项并选中 |
| 滑块 | 方向键交给浏览器原生；新增 Home/End 到两端、PageUp/PageDown 走量程 10%（至少一个 step），改值会发 `input` 和 `change` |
| 菜单 | 上/下循环、Home/End、Enter/空格激活、Esc 关闭并还焦点、Tab 关闭放行焦点、字母前缀跳转（600ms 缓冲）；右键菜单支持菜单键和 Shift+F10 |
| 分段控件 | radiogroup 语义：方向键移动并选中、Home/End、空格/回车确认；禁用段跳过 |
| 标签页 | 三档，由 `--tabs-arrow-mode` 决定：`select` 方向键直接切页（Win10/WinXP/GNOME）、`focus` 只移焦点空格确认（Win11）、`none` 方向键不动（macOS） |
| 提示气泡 | 悬停或（仅 Win11 主题）键盘聚焦后延迟出现；Esc/滚动/缩放/按下鼠标关闭 |

## 依据与偏差

方向键、Home/End、空格这些键位尽量按平台原生来，但有些地方是 web 便利，不是原生：

- 下拉框的字母前缀跳转：原生 combo 是访问键优先，前缀匹配的缓冲时间没有官方数值，
  这里的 600ms 是统一的。
- 滑块 PageUp/PageDown 的 10% 步长是惯例估计；原生步长由控件按量程算，各平台不完全一致。
- 标签页的 Home/End 在原生里基本没有，保留是 web 便利；Win11 的 `focus` 档没有实现
  Ctrl+Tab / Ctrl+Shift+Tab。
- 菜单的 Home/End 在原生 Win32 / macOS 都没有明确支持，按 WAI-ARIA 菜单模式补的。
- 经典外观（Win10 / WinXP）没有 `focus-visible` 概念，鼠标点完也会画焦点框；其余平台
  走 `:focus-visible`。
- 提示气泡的键盘聚焦显示只有 Win11 原生支持，其余平台按原生不显示；Esc 关闭是 web 便利
  （原生 Win11 用 Ctrl 关）。

## 测试覆盖

- `test/select.test.html`：方向键、Home/End、type-ahead、Esc、焦点移出关闭。
- `test/slider.test.html`：六平台焦点样式 + Home/End/PageUp/PageDown。
- `test/menu.test.html`：方向键循环、Home/End、type-ahead、Enter、Esc、Tab、右键键。
- `test/tabs.test.html`：三档方向键模式。
- `test/segmented.test.html`：radiogroup、roving tabindex、禁用段。
- `test/checkbox.test.html`：六个主题 × 明暗的焦点框可见性、禁用态悬停/按下不变。
- `test/tooltip.test.html`：延迟、翻转、Esc、按下关闭、Win11 与 macOS 的聚焦差异。

## 还没做

- Ctrl+Tab、Ctrl+PageUp、Alt+数字这些标签页/窗口级快捷键。
- 菜单的 PageUp/PageDown、子菜单的左右方向键。
- 屏幕阅读器和无鼠标完整走查没有单独做过，只按 ARIA 语义写了属性和测试。
- 焦点环在深色模式下的对比度没有逐平台量过。
