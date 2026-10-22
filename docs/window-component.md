# 窗口组件（Window）

`css/window.css` + `js/window.js`。窗口骨架和右键行为都在组件里，宿主只提供内容。

## 结构

```html
<div class="window" data-window data-window-frame="win10">
  <div class="window__bar">
    <div class="window__title">Settings</div>
    <div class="window__controls">
      <button type="button" class="window__caption" data-window-action="minimize">–</button>
      <button type="button" class="window__caption" data-window-action="maximize">□</button>
      <button type="button" class="window__caption window__caption--close" data-window-action="close">✕</button>
    </div>
  </div>
  <div class="window__body">
    <!-- 内容 -->
  </div>
</div>
```

标题栏、标题、窗口按钮、内容区都在组件里，宿主不用再自己拼一遍。`data-window-frame` 控制窗口按钮的
结构档位：`win10` / `win11` / `winxp` / `macos` / `macos15` / `gnome`（macOS 用红绿灯，GNOME 是右上角
圆形关闭）。颜色通过 `--window-*` 令牌给，走廊里由 `.room[data-era]` 提供，独立使用时可以用默认值或
自己的令牌。

## 行为

`data-window` 自动初始化，也可以 `Dialect.createWindow(el, options)`。

- **右键**：窗口内一律不弹浏览器菜单；右键落在 `input` / `textarea` 上时懒创建一个文本菜单
  （Cut / Copy / Paste / Delete / Select All），复用 `js/text-menu.js`；右键落在别处只拦截浏览器菜单。
- **禁用控件**：窗口用捕获阶段监听，禁用按钮上的右键也走同一条路径，不会漏出浏览器菜单。
- **窗口按钮**：悬停有底色，按下有 pressed 态。Windows 10 关闭键悬停 `#E81123`、按下 `#F1707A`；
  Windows 11 悬停 `#C42B1C`、按下 `#B22F22`；XP 按下斜面翻向（内阴影）；GNOME 按下底色加深；
  macOS 26 红绿灯按本机 AppKit 测量：按钮 14pt、首灯中心距窗口左 16pt、中心距 23.25pt
  （间距 9px），颜色红 `#FF5C5F`、黄 `#FAC800`、绿 `#34C759`；符号默认隐藏、悬停整组才显示。
  符号尺寸 X 7pt、横线 8×2pt、双三角 6pt，用 SVG 画，按下整体压暗。macOS 15 保持 12px。
  `test/window.test.html` 里有几何断言：三个符号中心和圆点中心对齐（≤0.5px），
  且绿色三角在左上 / 右下、右上 / 左下留空。
- **事件**：`window:contextmenu`（带 target / 坐标）和 `window:action`（`data-window-action` 按钮点击，
  detail 里有 `action`）。最小化 / 最大化 / 关闭具体做什么由宿主自己处理。
- 窗口外不拦截浏览器菜单。

## 测试

`test/window.test.html`：自动初始化、窗口内右键拦截、文本框懒创建菜单、菜单展开/收起、禁用按钮右键、
窗口外不拦截、窗口按钮派发 `window:action`。
