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

## 测试

- 行为层原测试不动：`bash tools/test.sh` 继续跑 `test/*.test.html`，页面改成 `<script type="module">`
  直接 import core 源码 + 显式 `initAll()`（file:// 下加载 ES module 需要 Chrome 的
  `--allow-file-access-from-files`）。
- 框架包：每个包 `test/fixture/` 下一个 Vite 小应用，用 `createRoot` / `createApp` 挂真组件，
  在 DOM 上跑断言，结果写进 `<pre id="result">`；`tools/test-fixture.sh` 构建后用 headless Chrome
  读 `file://` 页面。
- 验收：`npm run build && npm test` 全绿，且 `npm run test:site` 在改动后仍全绿。

## 迁移阶段

1. **这一轮（已完成）**：core 收编 CSS / 字体 / 行为层，静态站改成 core 的消费者；React / Vue 各做
   Theme + Button + TextField + Select 纵切和浏览器验收。行为逻辑逐字节平移，不改键位。
   验收结果：站点 234 条断言全绿；React 73 条、Vue 62 条浏览器断言全绿。
2. 按同一模子铺完剩下的组件：复选框/单选框/开关、滑块、分段控件、标签页、进度条、提示气泡、
   菜单/右键菜单、窗口。
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
