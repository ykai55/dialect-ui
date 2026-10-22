/* ============================================================
   slider.js — 滑块的键盘补全

   浏览器原生 range 已经处理方向键，但 Home / End / PageUp / PageDown
   各浏览器不一致，而且 PageUp / PageDown 的步长没有统一。这里按桌面
   滑块的惯例补上：Home / End 到两端，PageUp / PageDown 走量程的 10%
   （至少一个 step）。方向键仍然交给浏览器。

   用法：<input type="range" class="slider">，页面走 initSliders(root = document)；
   也可以 createSlider(el) / destroy() 单独管理。
   ============================================================ */
export function createSlider(el) {
  if (el._sliderKeys) return el._sliderKeys;
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

  function onKeydown(e) {
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
  }

  el.addEventListener("keydown", onKeydown);

  // 卸载：撤掉键盘监听，清掉元素标记
  function destroy() {
    el.removeEventListener("keydown", onKeydown);
    if (el._sliderKeys === ctrl) el._sliderKeys = null;
  }

  var ctrl = { el: el, destroy: destroy };
  el._sliderKeys = ctrl;
  return ctrl;
}

export function initSliders(root = document) {
  var scope = root || document;
  var sliders = Array.prototype.slice.call(scope.querySelectorAll('input[type="range"].slider'));
  if (scope.nodeType === 1 && scope.matches && scope.matches('input[type="range"].slider')) sliders.unshift(scope);
  sliders.forEach(function (el) {
    createSlider(el);
  });
}
