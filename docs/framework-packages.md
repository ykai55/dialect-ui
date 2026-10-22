# 框架包：@dialect-ui/core / @dialect-ui/react / @dialect-ui/vue

这一轮要把现有的 HTML + CSS + 原生 JS 组件包装成 React 和 Vue 组件，按 npm workspaces
拆成三个包。原则只有一条：**外观和行为仍然只有一份**，框架适配层不做第二套实现。

## 目标与非目标

目标：

- React / Vue 用户能按框架习惯写组件，拿到的是同一套像素级复刻。
- CSS 令牌、平台主题、菜单/下拉框等行为仍然只有一份源码，静态站和框架包吃同一份。
- 按需引入：主题 CSS、组件、行为都能单独 import。
- 行为层的契约（键盘模型、焦点顺序、事件名）和现在完全一致。

非目标（这一轮不做）：

- 不重写行为层、不把三家平台的键位差异塞进框架适配层。
- 不做基础控件之外的组件重设计，组件 API 只是现有 DOM 契约的框架化。
- 不做 Electron / Tauri 桌面壳接入（路线图里排在组件层稳定之后）。
- 不做 SSR 流式渲染、RSC、Server Actions 这些扩展；只保证 import 阶段不碰 `document`。
- 不做按组件拆 CSS（组件 CSS 仍是一个 `components.css`，主题按文件拆）。

## 分层

```
┌───────────────────────────────┐
│ @dialect-ui/react  @dialect-ui/vue │  薄适配：渲染 DOM 契约 + 生命周期挂载控制器
└───────────────┬───────────────┘
                │ import
┌───────────────▼───────────────┐
│        @dialect-ui/core        │  CSS 令牌 + 主题 + 组件样式 + 无框架行为层
│  css/  src/behavior/*.js       │
└───────────────┬───────────────┘
                │ 直接引用
┌───────────────▼───────────────┐
│            静态示例站            │  index.html / demo / test / verify
└───────────────────────────────┘
```

- `@dialect-ui/core` 是唯一的实现层。CSS 文件原样发布，行为层是普通 ESM，没有构建步骤。
- `@dialect-ui/react` / `@dialect-ui/vue` 只做三件事：渲染和静态站一模一样的 DOM、在挂载/卸载时
  调 `createXxx` / `destroy`、把控制器的回调映射成框架事件（`onValueChange` / `emit`）。
- 静态站降级成 core 的又一个消费者：页面里的 `<link>` 指向 `packages/core/css/...`，
  行为层用 `<script type="module">` 直接 import `packages/core/src/index.js`。

## 目录结构

```
package.json                  # 私有 workspaces 根 + 构建/测试脚本
index.html                    # 静态站（GitHub Pages 入口，仍然无构建）
css/base.css                  # 站点专用外壳，不进包
css/corridor.css              # 回忆走廊，站点专用，不进包
js/boot.js                    # 站点引导：import initAll 并执行
js/corridor.js                # 站点专用，经典脚本
js/harness.js                 # 站点专用
packages/
  core/
    package.json              # @dialect-ui/core，type: module，无构建
    css/
      tokens.css              # 令牌默认值 + @font-face
      components.css          # 组件结构与状态
      window.css              # 窗口
      themes/
        win11.css win10.css winxp.css macos.css macos15.css gnome.css
    fonts/                    # woff2，tokens.css 里 ../fonts 引用
    src/
      index.js                # 公共入口：initAll + 所有 create/init
      index.d.ts              # 手写的公共类型
      behavior/
        menu.js select.js segmented.js tabs.js slider.js
        tooltip.js text-menu.js window.js
  react/
    package.json              # @dialect-ui/react，peer react
    tsconfig.json             # tsc 编译到 dist，不打包
    src/                      # index.tsx theme.tsx button.tsx text-field.tsx select.tsx
    test/fixture/             # 浏览器验收页（Vite 构建，headless Chrome 跑）
  vue/
    package.json              # @dialect-ui/vue，peer vue
    tsconfig.json
    src/                      # index.ts theme.ts button.ts text-field.ts select.ts
    test/fixture/
```

## 消费方式

```js
// 应用入口，只引一次
import "@dialect-ui/core/css/tokens.css";
import "@dialect-ui/core/css/components.css";
// 用到窗口组件时再引
import "@dialect-ui/core/css/window.css";
// 主题按需：文件名就是 data-theme 的值
import "@dialect-ui/core/css/themes/win11.css";
```

```tsx
import { Theme, Button, TextField, Select } from "@dialect-ui/react";

<Theme theme="win11" mode="dark">
  <Button variant="primary">Save changes</Button>
  <TextField label="Email address" placeholder="name@example.com" />
  <Select
    options={[
      { value: "a", label: "Option A" },
      { value: "b", label: "Option B" },
    ]}
    defaultValue="a"
    onValueChange={(value) => console.log(value)}
  />
</Theme>
```

```vue
<script setup lang="ts">
import { Theme, Button, TextField, Select } from "@dialect-ui/vue";
</script>

<template>
  <Theme theme="win11" mode="dark">
    <Button variant="primary">Save changes</Button>
    <TextField v-model="email" label="Email address" placeholder="name@example.com" />
    <Select v-model="choice" :options="options" />
  </Theme>
</template>
```

主题仍然挂在容器的 `data-theme` / `data-mode` 上。`<Theme>` 只负责渲染这两个属性，不强制任何背景；
需要面板底色时自己加 `class="panel"`（或桌面壳里直接改 `<html>` 的 dataset）。

## 核心 API 契约

`@dialect-ui/core` 的公共入口只有 `src/index.js`。模块加载阶段不访问 `document` / `window`，
所有初始化都由显式函数触发，这样 Node / SSR 里 import 不会炸。

### 声明式初始化（静态站用）

```js
import { initAll } from "@dialect-ui/core";

initAll();                 // 整个 document
initAll(rootElement);      // 只扫某个子树
```

`initAll` 按固定顺序扫描并初始化：菜单 → 文本框菜单 → 窗口 → 下拉框 → 分段控件 → 标签页 →
滑块 → 提示气泡。重复调用是幂等的（已经初始化的元素跳过）。单独初始化用同名的
`initMenus` / `initTextMenus` / `initWindows` / `initSelects` / `initSegmenteds` / `initTabs` /
`initSliders` / `initTooltips`，参数都是 `(root = document)`。

### 控制器（框架适配层用）

每个有行为的组件都有一个 `createXxx(el, options)`，返回控制器。控制器是**运行时 DOM 状态的唯一写者**：

```ts
interface MenuController {
  el: HTMLElement;
  open(opts?: { anchor?: Element; point?: { x: number; y: number }; invoker?: Element }): void;
  close(opts?: { restoreFocus?: boolean }): void;
  isOpen(): boolean;
  move(dir: 1 | -1): void;
  first(): void;
  last(): void;
  activate(): void;
  typeahead(key: string): number;
  destroy(): void;
}

interface SelectController {
  el: HTMLElement;
  open(opts?): void;
  close(opts?): void;
  isOpen(): boolean;
  select(index: number, opts?: { silent?: boolean }): void;
  selectedIndex(): number;
  value(): string;
  destroy(): void;
}

interface SegmentedController / TabsController {
  el: HTMLElement;
  select(index: number, opts?: { silent?: boolean }): void;
  selectedIndex(): number;
  value(): string;
  destroy(): void;
}

interface TooltipController { el; show(target); hide(); destroy(): void; }
interface WindowController  { el; destroy(): void; }
interface TextMenuController { el; destroy(): void; }
interface SliderController  { el; destroy(): void; }
```

`destroy()` 必须做到：

- 移除控制器直接挂在元素上的事件监听；
- 关闭还开着的弹层（`hidePopover`）；
- 移除打开弹层期间挂在 `document` / `window` 上的监听；
- 清掉元素上的控制器标记（`_menuCtrl` / `_select` / `_tabs` …），允许同一元素重新 `create`。

框架适配层依赖这条：React StrictMode 的 mount → cleanup → mount，和 Vue 的 keep-alive 都会反复
create / destroy 同一批 DOM。

`createXxx` 的回调选项（框架事件从这些回调转出来）：

- `createMenu(menuEl, { triggers, anchor, activeHost, focusOnOpen, initialActive, matchAnchorWidth,
  role, onOpen, onClose, onChoose(item, index) })` —— 和现有 `createMenu` 一致，只加 `destroy`。
- `createSelect(rootEl, { onChange(value, index, item), onOpenChange(open) })`。
- `createSegmented(rootEl, { onChange(value, index, item) })`。
- `createTabs(rootEl, { onChange(value, index, tab) })`。

自定义事件名保持不变（`menu:choose`、`segmented:change`、`tabs:change`、`window:action`、
`window:contextmenu`），静态站和框架包共用。

### DOM 契约

框架组件渲染的 class / role / aria 必须和现有文档、`test/*.test.html`、`data-*` 声明式用法完全一致。
这是唯一的外观契约，CSS 不认识框架。渲染时**不要**带 `data-menu` / `data-select` / `data-tabs`
这类自动初始化标记，否则和显式 `createXxx` 会双绑；框架组件只渲染结构类和 ARIA。

## 状态归属与渲染约定

1. 框架负责：DOM 结构、初始值、受控 props、children/slots、生命周期。
2. 控制器负责：打开/关闭、高亮项、`aria-expanded` / `aria-selected` / `aria-activedescendant`、
   `hidden`、`.is-open` / `.is-active` 类、下拉框按钮文字、焦点归还。
3. 受控 props 的更新走控制器 API，不靠重新渲染覆盖 DOM：

   ```tsx
   useEffect(() => {
     const i = options.findIndex((o) => o.value === value);
     if (i >= 0 && ctrlRef.current) ctrlRef.current.select(i, { silent: true });
   }, [value, options]);
   ```

4. 组件只在挂载时渲染一次初始 ARIA（如 `aria-expanded="false"`、`aria-selected`）。运行时属性由控制器
   改写；React/Fiber 的 diff 在 props 未变时不会碰这些属性，所以不会互相打架。不要把这些属性接成
   `state` 再每帧渲染，那会把控制器的写入覆盖掉。
5. 事件：控制器回调 → 组件回调（React `onValueChange`、Vue `update:modelValue` + `change`）。
   受控/非受控都支持：`value` / `defaultValue`（React）、`v-model` / `modelValue`（Vue）。
6. SSR：控制器只在 effect / `onMounted` 里创建，首屏渲染不碰 `document`。

## 组件 API（v0.1 纵切）

先做四个组件打通链路，其余 10 个组件照同样的模子铺开。

| 组件 | React | Vue | 说明 |
| --- | --- | --- | --- |
| 主题容器 | `<Theme theme mode className>` | `<Theme theme mode>` | 渲染 `data-theme` / `data-mode` 的 div；不传 `mode` 不写 `data-mode`（走浅色兜底） |
| 按钮 | `<Button variant="default"\|"primary">` | 同左 | 原生 button 属性透传，`ref` 转发 |
| 输入框 | `<TextField label multiline rows>` | 同左 | 单行 input / 多行 textarea 共用一个组件；`className` 落在 `.field` 外壳上，原生属性落 input / textarea |
| 下拉框 | `<Select options value defaultValue onValueChange onOpenChange>` | `v-model` + `@change` / `@update:open` | 行为全在 `createSelect`；`aria-label` 落在可聚焦的 `.select__button` 上 |

React 组件统一：`forwardRef`、透传 `className`、其余原生属性展开；Vue 组件统一：`defineComponent` +
render function（不引入 SFC 编译链），`props` / `emits` 显式声明。

### v0.1 已落地的东西

- **React 包**：`packages/react/src/{index.ts,theme.tsx,button.tsx,text-field.tsx,select.tsx}`，
  `tsc` 编到 `dist/`。Select 的选项额外渲染 `data-value`（core 的 `valueOf()` 优先读它，这样
  `onValueChange` 能拿到 option.value 而不只是 label）；它不是自动初始化标记，不会双绑。
- **Vue 包**：`packages/vue/src/{index.ts,theme.ts,button.ts,text-field.ts,select.ts}`，默认导出插件
  `install()` 注册 `DialectTheme/DialectButton/DialectTextField/DialectSelect`；`ariaLabel` 落按钮，
  `id` 与 `className` 落根节点；keep-alive 用 `onActivated/onDeactivated` 重建/销毁控制器。
- **验收页**：`packages/<fw>/test/fixture/`，Vite 构建后 headless Chrome 打开 `file://`。
  React 的 fixture 用 `define: { "process.env.NODE_ENV": "development" }` 保证 StrictMode 真的双执行
  （`vite build` 在读配置前就定了 production，只写 `mode` 不够）。fixture 目录放一个
  `package.json`，避免 npm 11 的 `npx` 把 cwd 切到上层包根。
- **测试命令**：`tools/test-fixture.sh <fw>` 单包跑，`tools/test-frameworks.sh` 两个包一起跑，
  `npm test` 等于站点测试 + 框架包测试。runner 直接调仓库根的 `node_modules/.bin/vite`，
  并对无头 Chrome 的偶发启动失败做 3 次重试（断言失败不重试）。

## 组件 API（v0.2：剩余组件）

约定不变：只渲染 DOM 契约 + 初始 ARIA，运行时状态由 core 控制器写；不渲染 `data-menu` /
`data-select` / `data-segmented` / `data-tabs` 这类自动初始化标记；`createXxx` / `createXxx` 在
effect / onMounted 里建、卸载时 destroy；受控值变化走 `ctrl.select(index, { silent: true })`。
`className` 一律落根节点（表单控件是外层 `label` / 包裹元素），原生属性落真正可交互的控件。

### 纯 CSS 控件（无控制器）

| 组件 | props（React 同名，Vue 用 kebab-case） | DOM |
| --- | --- | --- |
| `Checkbox` | `label? checked? defaultChecked? onChange? disabled? name? value?`（其余 input 属性透传） | `label.check > input.check__input + span.check__box > svg.check__mark(path) + span.check__label` |
| `Radio` | 同上，`type=radio`、`name` 必填式使用（同组同名） | `label.radio > input.radio__input + span.radio__dot + span.radio__label` |
| `Switch` | `label? checked? defaultChecked? onChange? disabled?` | `label.switch > input.switch__input + span.switch__track > span.switch__knob + span.switch__label` |
| `Progress` | `value? max?=100 indeterminate? aria-label?` | `div.progress[role=progressbar][aria-valuemin=0][aria-valuemax][aria-valuenow?][data-indeterminate?] > div.progress__fill`；确定态 style 写 `--progress-value: pct%` |
| `Slider` | `value? defaultValue? min? max? step? showValue? disabled? onChange?`，ref 到 input | `input.slider[type=range]`；`showValue` 时外面包 `div.slider-row` + `span.slider__value`（显示值跟随输入，受控时用 prop）；挂载时 `createSlider(input)`，卸载 destroy |

Checkbox 的 `svg.check__mark` 固定 `viewBox="0 0 20 20"`，`path d="M5.2 10.3 L8 14 L13.5 5.7"`。

### 有控制器的组件

| 组件 | props / 事件 | DOM 与行为 |
| --- | --- | --- |
| `SegmentedControl` | `options: {value,label,disabled?}[]; value?; defaultValue?; onValueChange?(value, option); disabled?; aria-label?` | `div.segmented[role=radiogroup] > button.segmented__item[role=radio][aria-checked][data-value]`；挂载 `createSegmented(root, { onChange })`，受控值 effect 里 `ctrl.select(index, { silent: true })` |
| `Tabs` | `items: {value?,label,disabled?}[]; value?; defaultValue?; onValueChange?(value, index); aria-label?`；children/默认 slot 按顺序是面板内容 | `div.tabs > div.tabs__list[role=tablist] > button.tabs__tab[role=tab][aria-selected][data-value]`，面板 `div.tabs__panel`（初始选中项以外的加 `hidden`）；挂载 `createTabs(root, { onChange })`，受控值走 `ctrl.select` |
| `TooltipProvider` / `Tooltip` | Provider 无 props；`Tooltip text` 包一个子元素 | Provider 渲染 `div.tooltip-host[style="display:contents"]` + children + `div.tooltip[role=tooltip][data-tooltip-layer][hidden]`，挂载 `createTooltip(layer)`；Tooltip 用 cloneElement/cloneVNode 给唯一子元素加 `data-tooltip` 并转发 ref，不产生额外布局节点。一个主题容器放一个 Provider |
| `Menu` | `trigger: ReactNode/VNode; items: MenuEntry[]; onSelect?(entry, index); role?: "menu"; aria-label?` | `div.menu-box > 触发器 + ul.menu[popover=manual]`；`MenuEntry = { label, value?, shortcut?, disabled? } \| { separator: true }`；挂载 `createMenuBox(box, { menu, triggers: [triggerEl], role, onChoose })`，item 上写 `data-entry-index` 把下标映射回 entry |
| `ContextMenu` | 同 `Menu` 的 items/onSelect，children 是右键区域 | `div.menu-box > div.menu-box__content(children) + ul.menu[popover=manual]`；挂载 `createMenuBox(box, { menu, contextTargets: [contentEl] })` |
| `Window` | `frame: "win10"\|"win11"\|"winxp"\|"macos"\|"macos15"\|"gnome"; title?; controls?: ("minimize"\|"maximize"\|"close")[]; onAction?(action, event); className?` | 复刻 `index.html` 里各 frame 的 `.window` 结构：Windows 用 `.window__controls > .window__caption[data-window-action]`，macOS 用 `.window__traffic > .window__traffic-dot(--close/--min/--zoom) + .window__traffic-glyph > svg`，GNOME 只有关闭按钮；挂载 `createWindow(el)`，监听 `window:action` 映射到 `onAction` |

`createMenuBox` 是这一轮给 core 加的唯一新 API（`packages/core/src/behavior/menu.js`）：等价于原来的
`initMenuBox`，但可以显式传 `menu` / `triggers` / `contextTargets`，并返回带 `destroy()` 的控制器。
框架适配层用它，不依赖 `data-menu*` 标记。

### 验收要求

两个包各自把新组件加进 `test/fixture/` 的断言里，跑 `bash tools/test-fixture.sh react` / `vue` 全绿。
除 DOM 契约外至少覆盖：Checkbox/Switch 的受控与非受控切换、Radio 同组互斥；Slider 的 Home/End 键盘
（走 core 的 createSlider）与值回调；Progress 确定/不确定的 ARIA 与 `--progress-value`；Segmented
的点击选择、方向键、受控同步；Tabs 的点击切换、方向键分档、aria-selected/panel hidden；Tooltip 的
悬停出现、Esc/滚动关闭、aria-describedby；Menu 的点击展开、选项回调、Esc 关闭、卸载清理；
ContextMenu 的右键打开；Window 的窗口按钮派发 action、右键拦截。

### v0.2 已落地的东西

- **core 新增 `createMenuBox(box, options)`**：`initMenuBox` 的实现被抽成这个控制器工厂，
  可以显式传 `menu` / `triggers` / `contextTargets`，返回带 `destroy()` 的菜单控制器；
  React / Vue 的 `Menu` / `ContextMenu` 都走它，不依赖 `data-menu*` 标记。
- React 端：`Menu` 用 `trigger` prop（单个元素，组件接管它的 ref / aria），`Tooltip` 用
  `cloneElement` 给唯一子节点加 `data-tooltip`，`Window` 把 `window:action` 映射成
  `onAction(action, event)`。`Slider` 因为 core 的 Home/End 是「写 `input.value` 再派发合成
  input」，会被 React 的 value tracker 吞掉，适配层用原生 `input` 监听桥接用户回调，React 的
  `onChange` 留空避免受控警告。
- Vue 端：表单类统一 `checked/defaultChecked + update:checked`（Checkbox / Radio / Switch），
  其余受控组件用 `v-model`（`modelValue`）；`Menu` 用 `trigger` 具名 slot；`Window` 额外暴露
  `contextmenu(detail, event)`；`Tooltip` 用 `expose({ el })` 转发触发元素。
- 两个框架的组件都不支持动态增删 `options` / `items`（Segmented / Tabs 无 `refresh()`，需要重挂）；
  `TooltipProvider` 是「一个主题容器一个」，Provider 挂载后再加 `Tooltip` 不会被收进触发集合。
- `--slider-pct` 目前没有写入方（静态站和框架包一致，滑块填充不随值变），属于 core 的遗留项，
  适配层不代写样式。

## 构建与发布

- 三个包版本锁步（0.1.0 起步），`@dialect-ui/react` / `@dialect-ui/vue` 的 `dependencies` 里写
  `"@dialect-ui/core": "^0.1.0"`，workspaces 本地自动 link。
- core 不构建：`src/` 是 ESM 源码，`css/` / `fonts/` 原样发布；`package.json` 的 `exports` 提供
  `"."`、`"./css/*"`、`"./fonts/*"`。`sideEffects: ["**/*.css"]` 防止打包器把 CSS import 摇掉。
- react / vue 用 `tsc` 编译到 `dist/`（ESM + `.d.ts`），只发布 `dist/`；不打包、不产 UMD。
  `"sideEffects": false`（没有 CSS import）。
- peer 依赖：`react >= 18`、`vue ^3.4`。react 包不依赖 `react-dom`（组件本身不渲染到额外根）。
- 许可证 MIT：仓库根和三个包目录各放一份 `LICENSE`，包 `package.json` 写 `"license": "MIT"`；
  每个包声明 `publishConfig: { "access": "public" }`（scoped 包默认私有，必须显式公开）。
- 发布前检查 `npm pack --dry-run -w <包>` 的内容：core 应含 `css/`、`fonts/`、`src/`、`LICENSE`；
  react / vue 应只含 `dist/`、`LICENSE`。
- 发布顺序 core → react → vue，且要发到公网 npm（本机默认 registry 是公司内部源）：
  `npm publish -w @dialect-ui/core --registry https://registry.npmjs.org/`
  （`publishConfig.access` 已写入，不用再带 `--access public`）。
- 前提：执行发布的账号在公网 npm 上拥有 `@dialect-ui` 这个 scope（用户名或组织）。没有的话要么在
  npmjs.com 建同名组织，要么改成不带 scope 的包名。
- 首次发布时 npm 会先返回 `202 Accepted` 并提示「being processed」，几分钟后版本才可读；
  这期间 `npm view` / registry packument 可能 404，重复 publish 会报
  `409 Cannot publish over previously staged version`（npm 已知问题，见 npm/cli#9889）。
  遇到时等几分钟或直接 bump 一个新版本，不要反复重发同一版本。
- `0.1.2` 已发布为 `latest`（2026-10）。npm 上还留有首轮发布产生的 `0.1.0` 和占位版本
  `0.0.0-stage`；bypass-2FA 的 granular token 不允许 unpublish（npm 已限制），要清理只能用网页端
  登录后删版本。

## 测试

- 行为层原测试不动：`bash tools/test.sh` 继续跑 `test/*.test.html`，页面改成 `<script type="module">`
  直接 import core 源码 + 显式 `initAll()`（file:// 下加载 ES module 需要 Chrome 的
  `--allow-file-access-from-files`）。
- 框架包：每个包 `test/fixture/` 下一个 Vite 小应用，用 `createRoot` / `createApp` 挂真组件，
  在 DOM 上跑断言，结果写进 `<pre id="result">`；`tools/test-fixture.sh` 构建后用 headless Chrome
  读 `file://` 页面。
- 验收：`npm run build && npm test` 全绿，且 `npm run test:site` 在改动后仍全绿。

## 迁移阶段

1. **第一轮（已完成）**：core 收编 CSS / 字体 / 行为层，静态站改成 core 的消费者；React / Vue 各做
   Theme + Button + TextField + Select 纵切和浏览器验收。行为逻辑逐字节平移，不改键位。
2. **第二轮（已完成）**：按同一模子铺完剩余组件——Checkbox、Radio、Switch、Slider、Progress、
   SegmentedControl、Tabs、Tooltip / TooltipProvider、Menu、ContextMenu、Window。
   验收结果：站点 234 条断言全绿；React 176 条、Vue 171 条浏览器断言全绿。
3. 按组件拆 `components.css`（或提供每组件入口），做到真正的按需 CSS。
4. 桌面壳（Electron / Tauri）接入层另起目录，负责系统信息 → `data-theme` / `data-mode`。

## 风险与未决

- **行为漂移**：适配层只能调 core，不能重新实现。任何"框架里顺手改一下键盘"的改动都要先回 core。
- **受控状态和控制器抢写**：按上面的状态归属约定办；如果以后要接 React 并发渲染，再评估是否把
  controller 状态提升成 store。
- **ID 生成**：控制器在客户端生成 `menu-*` / `tab-*` 这类 id，SSR 首屏没有这些属性，hydration
  之后才补，不算 mismatch；要稳定 id 再暴露 `idPrefix` 选项。
- **动态选项**：纵切只保证 `options` 引用稳定的场景；增删选项需要接 `ctrl.refresh()`，下一轮补。
- **字体体积**：core 目前带 4 个 woff2，后续可考虑子集化或让消费方自备字体。
- **npm scope 归属**：包名是 `@dialect-ui/*`，公网发布要求账号拥有这个 scope；首版发布前先确认，
  否则要换包名。
