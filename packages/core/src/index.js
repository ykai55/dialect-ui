/* ============================================================
   @dialect-ui/core — 公共入口

   模块加载阶段不访问 document / window：所有初始化都由显式函数触发，
   这样 Node / SSR 里 import 不会炸。

   声明式初始化（静态站用）：
     import { initAll } from "@dialect-ui/core";
     initAll();            // 整个 document
     initAll(rootElement); // 只扫某个子树
     initAll 顺序：菜单 → 文本框菜单 → 窗口 → 下拉框 → 分段控件 → 标签页 →
     滑块 → 提示气泡。重复调用是幂等的（已经初始化的元素跳过）。

   命令式控制器（框架适配层用）：createXxx(el, options) → { el, …, destroy() }。
   ============================================================ */

import { initMenus } from "./behavior/menu.js";
import { initTextMenus } from "./behavior/text-menu.js";
import { initWindows } from "./behavior/window.js";
import { initSelects } from "./behavior/select.js";
import { initSegmenteds } from "./behavior/segmented.js";
import { initTabs } from "./behavior/tabs.js";
import { initSliders } from "./behavior/slider.js";
import { initTooltips } from "./behavior/tooltip.js";
import { initScrollbars } from "./behavior/scrollbar.js";

export { createMenu, createMenuBox, initMenuBox, initMenus } from "./behavior/menu.js";
export { createTextMenu, initTextMenus } from "./behavior/text-menu.js";
export { createWindow, initWindows } from "./behavior/window.js";
export { createSelect, initSelects } from "./behavior/select.js";
export { createSegmented, initSegmenteds } from "./behavior/segmented.js";
export { createTabs, initTabs } from "./behavior/tabs.js";
export { createSlider, initSliders } from "./behavior/slider.js";
export { createTooltip, initTooltips } from "./behavior/tooltip.js";
export { initScrollbars, destroyScrollbars } from "./behavior/scrollbar.js";

export function initAll(root = document) {
  initMenus(root);
  initTextMenus(root);
  initWindows(root);
  initSelects(root);
  initSegmenteds(root);
  initTabs(root);
  initSliders(root);
  initTooltips(root);
  initScrollbars(root);
}
