/* ============================================================
   slider.js — 滑块的键盘补全

   浏览器原生 range 已经处理方向键，但 Home / End / PageUp / PageDown
   各浏览器不一致，而且 PageUp / PageDown 的步长没有统一。这里按桌面
   滑块的惯例补上：Home / End 到两端，PageUp / PageDown 走量程的 10%
   （至少一个 step）。方向键仍然交给浏览器。

   用法：<input type="range" class="slider"> 自动绑定。
   ============================================================ */
(function () {
  "use strict";

  function init(el) {
    if (el._sliderKeys) return;
    el._sliderKeys = true;

    function num(name, fallback) {
      var v = parseFloat(el[name]);
      return isNaN(v) ? fallback : v;
    }

    function step() {
      var s = num("step", 1);
      return s > 0 ? s : 1;
    }

    function setValue(v) {
      var min = num("min", 0);
      var max = num("max", 100);
      var s = step();
      var snapped = Math.round((v - min) / s) * s + min;
      snapped = Math.min(max, Math.max(min, snapped));
      if (Number(el.value) === snapped) return;
      el.value = String(snapped);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }

    el.addEventListener("keydown", function (e) {
      var min = num("min", 0);
      var max = num("max", 100);
      var page = Math.max(step(), (max - min) / 10);
      var current = num("value", min);

      if (e.key === "Home") {
        e.preventDefault();
        setValue(min);
      } else if (e.key === "End") {
        e.preventDefault();
        setValue(max);
      } else if (e.key === "PageUp") {
        e.preventDefault();
        setValue(current + page);
      } else if (e.key === "PageDown") {
        e.preventDefault();
        setValue(current - page);
      }
    });
  }

  document.querySelectorAll('input[type="range"].slider').forEach(init);

  window.Dialect = window.Dialect || {};
  window.Dialect.initSlider = init;
})();
