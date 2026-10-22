/* ============================================================
   tooltip.js — 提示气泡的行为层

   外观在 css/components.css 的「提示气泡」一节，各平台的延迟、底色、
   圆角在 css/theme-*.css 的 --tooltip-* 令牌里。

   用法：在要显示提示的元素上加 data-tooltip="文字"，同一容器里放一个
   提示层；容器建议是带 data-theme 的那一层，这样气泡跟着主题走：

     <div data-theme="win11">
       <button type="button" data-tooltip="保存改动">Save</button>
       <div class="tooltip" role="tooltip" data-tooltip-layer hidden></div>
     </div>

   行为：悬停或键盘聚焦后延迟出现，鼠标离开 / 失焦 / Esc / 滚动 / 缩放时关。
   位置优先在目标上方居中，上方放不下就翻到下方，左右夹在视口内。
   ============================================================ */
(function () {
  "use strict";

  var uid = 0;

  function readMs(el, name, fallback) {
    var raw = getComputedStyle(el).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }

  function readPx(el, name, fallback) {
    var raw = getComputedStyle(el).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }

  function init(layer) {
    if (layer._tooltip) return;
    if (!layer.id) layer.id = "tooltip-" + ++uid;
    layer.setAttribute("role", "tooltip");
    if (!layer.hasAttribute("hidden")) layer.hidden = true;

    var owner = layer.parentElement || document;
    var triggers = Array.prototype.slice.call(owner.querySelectorAll("[data-tooltip]"));
    var showTimer = 0;
    var hideTimer = 0;
    var anchor = null;
    var isOpen = false;

    function showDelay() {
      return readMs(layer, "--tooltip-show-delay", 500);
    }

    function hideDelay() {
      return readMs(layer, "--tooltip-hide-delay", 100);
    }

    function focusShowEnabled() {
      return readPx(layer, "--tooltip-focus-show", 1) !== 0;
    }

    function place(target) {
      var offset = readPx(layer, "--tooltip-offset", 8);
      var r = target.getBoundingClientRect();
      layer.hidden = false;
      layer.removeAttribute("data-open");
      var w = layer.offsetWidth;
      var h = layer.offsetHeight;
      var margin = 6;
      var center = r.left + r.width / 2;
      var left = Math.min(
        Math.max(margin, center - w / 2),
        Math.max(margin, window.innerWidth - w - margin)
      );
      var above = r.top - h - offset;
      var top =
        above >= margin
          ? above
          : Math.min(Math.max(margin, r.bottom + offset), window.innerHeight - h - margin);
      layer.style.left = left + "px";
      layer.style.top = top + "px";
    }

    function reposition() {
      if (!isOpen || !anchor) return;
      place(anchor);
      layer.setAttribute("data-open", "");
    }

    if (window.ResizeObserver) {
      new ResizeObserver(reposition).observe(layer);
    }

    function show(target) {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      anchor = target;
      layer.textContent = target.getAttribute("data-tooltip") || "";
      place(target);
      layer.setAttribute("data-open", "");
      target.setAttribute("aria-describedby", layer.id);
      isOpen = true;
      // 首帧里尺子可能还没稳（字体 / 滚动条 / 布局抖动）：下一拍、下一帧、
      // 字体就绪后各对一次位置；层尺寸变化时由 ResizeObserver 再对一次
      window.setTimeout(reposition, 0);
      window.requestAnimationFrame(reposition);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(reposition).catch(function () {});
      }
    }

    function hide() {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      if (!isOpen) {
        layer.hidden = true;
        return;
      }
      layer.removeAttribute("data-open");
      if (anchor) anchor.removeAttribute("aria-describedby");
      anchor = null;
      isOpen = false;
      layer.hidden = true;
    }

    function scheduleShow(target) {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      showTimer = window.setTimeout(function () {
        show(target);
      }, showDelay());
    }

    function scheduleHide() {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, hideDelay());
    }

    function ownerOf(target) {
      return triggers.indexOf(target) > -1 ? target : target.closest("[data-tooltip]");
    }

    owner.addEventListener("mouseover", function (e) {
      var target = ownerOf(e.target);
      if (target && target !== anchor) scheduleShow(target);
    });

    owner.addEventListener("mouseout", function (e) {
      var target = ownerOf(e.target);
      if (!target) return;
      var to = e.relatedTarget;
      if (to && target.contains(to)) return;
      scheduleHide();
    });

    owner.addEventListener("focusin", function (e) {
      if (!focusShowEnabled()) return;
      var target = ownerOf(e.target);
      if (target) scheduleShow(target);
    });

    owner.addEventListener("focusout", function (e) {
      var target = ownerOf(e.target);
      if (target) scheduleHide();
    });

    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") hide();
    });

    layer._tooltip = { show: show, hide: hide };
  }

  document.querySelectorAll("[data-tooltip-layer]").forEach(init);

  window.Dialect = window.Dialect || {};
  window.Dialect.initTooltip = init;
})();
