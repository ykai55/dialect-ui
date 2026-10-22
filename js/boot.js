/* ============================================================
   boot.js — 静态站的引导脚本

   静态站是 @dialect-ui/core 的消费者：CSS 从 packages/core/css/ 引，
   行为层直接 import core 源码，再显式 initAll()。corridor.js 是站点
   自己的经典脚本，先执行（它会把控件样本克隆进每个房间），这个模块
   脚本在解析完成后执行，正好接管克隆出来的 DOM。

   另外保留两个截图辅助参数（原来在行为脚本里的加载期钩子）：
     ?menu=1  展开当前可见面板的第一个菜单
     ?open=1  展开第一个可见下拉框
   ============================================================ */

import { initAll } from "../packages/core/src/index.js";

initAll();

const params = new URLSearchParams(location.search);

if (params.get("menu") === "1") {
  /* 截图用：等一帧再开，免得在首次绘制前打开时 headless 截图里拿不到 top layer。 */
  window.setTimeout(function () {
    const visibleBox = Array.prototype.slice
      .call(document.querySelectorAll("[data-menu]"))
      .filter(function (box) {
        return box.getClientRects().length > 0;
      })[0];
    const visibleTrigger = visibleBox && visibleBox.querySelector("[data-menu-trigger]");
    const menuEl = visibleBox && visibleBox.querySelector(".menu");
    if (visibleTrigger && menuEl && menuEl._menuCtrl) {
      menuEl._menuCtrl.open({ anchor: visibleTrigger, invoker: visibleTrigger });
    }
  }, 250);
}

if (params.get("open") === "1") {
  // 截图用：自动展开第一个下拉框
  const visible = Array.prototype.slice
    .call(document.querySelectorAll("[data-select]"))
    .filter(function (el) {
      return el.getBoundingClientRect().width > 0;
    })[0];
  if (visible && visible._select) visible._select.open();
}
