/* ============================================================
   segmented.js — 分段控件的行为层

   一排互斥按钮，单选语义。外观全在 packages/core/css/components.css 的「分段控件」一节，
   每个平台的数值在 packages/core/css/themes/*.css 的 --seg-* 令牌里。

   键盘模型是 web 单选组（WAI-ARIA radiogroup）的通行做法：
   整组只占一个 Tab 站，方向键在段之间移动并立即选中，Home / End 到首尾，
   空格或回车确认当前段。原生六家的键盘模型并不一致（macOS 实测方向键不切换，
   GNOME 是 Tab 逐段走），差异记在 docs/segmented-notes.md。

   声明式用法：
   <div class="segmented" data-segmented role="radiogroup" aria-label="Interval">
   <button type="button" class="segmented__item" role="radio" aria-checked="true"
   data-value="day">Day</button>
   <button type="button" class="segmented__item" role="radio" aria-checked="false"
   data-value="week">Week</button>
   </div>

   选中变化时在容器上冒泡一个 "segmented:change" 事件，
   detail = { item, index, value }，value 取 data-value，没有就用文字。
   ============================================================ */
var uid = 0;

function isEnabled(item) {
  return !item.disabled && item.getAttribute("aria-disabled") !== "true";
}

function valueOf(item) {
  return item.getAttribute("data-value") || (item.textContent || "").trim();
}

export function createSegmented(root, options) {
  options = options || {};
  if (root._segmented) return root._segmented;
  var items = Array.prototype.slice.call(root.querySelectorAll(".segmented__item"));
  if (!items.length) return null;

  if (!root.getAttribute("role")) root.setAttribute("role", "radiogroup");
  if (!root.id) root.id = "segmented-" + ++uid;

  items.forEach(function (item, i) {
    if (!item.getAttribute("role")) item.setAttribute("role", "radio");
    if (!item.id) item.id = root.id + "-item-" + i;
    if (!item.hasAttribute("aria-checked")) item.setAttribute("aria-checked", "false");
  });

  function syncTabIndex() {
    // roving tabindex：只有选中的段（或第一个可用段）能 Tab 到
    var stop = items.filter(function (it) {
      return it.getAttribute("aria-checked") === "true" && isEnabled(it);
    })[0] || items.filter(isEnabled)[0];
    items.forEach(function (it) {
      it.tabIndex = it === stop ? 0 : -1;
    });
    return stop;
  }

  function select(item, silent) {
    if (!isEnabled(item)) return false;
    var wasChecked = item.getAttribute("aria-checked") === "true";
    items.forEach(function (it) {
      it.setAttribute("aria-checked", it === item ? "true" : "false");
    });
    syncTabIndex();
    if (!silent && !wasChecked) {
      root.dispatchEvent(
        new CustomEvent("segmented:change", {
          bubbles: true,
          detail: {
            item: item,
            index: items.indexOf(item),
            value: valueOf(item)
          }
        })
      );
      if (options.onChange) options.onChange(valueOf(item), items.indexOf(item), item);
    }
    return !wasChecked;
  }

  function step(dir) {
    var at = items.indexOf(document.activeElement);
    if (at < 0) at = items.indexOf(syncTabIndex());
    var next = at;
    for (var k = 0; k < items.length; k++) {
      next = (next + dir + items.length) % items.length;
      if (isEnabled(items[next])) break;
    }
    if (!isEnabled(items[next])) return;
    select(items[next]);
    items[next].focus({ preventScroll: true });
  }

  function first() {
    var item = items.filter(isEnabled)[0];
    if (item) {
      select(item);
      item.focus({ preventScroll: true });
    }
  }

  function last() {
    var enabled = items.filter(isEnabled);
    var item = enabled[enabled.length - 1];
    if (item) {
      select(item);
      item.focus({ preventScroll: true });
    }
  }

  function onClick(e) {
    var item = e.target.closest(".segmented__item");
    if (!item || !root.contains(item)) return;
    e.preventDefault();
    if (!isEnabled(item)) return;
    select(item);
    item.focus({ preventScroll: true });
  }

  function onKeydown(e) {
    var focused = items.indexOf(document.activeElement);
    if (focused < 0) return;
    var handled = true;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        step(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        step(-1);
        break;
      case "Home":
        first();
        break;
      case "End":
        last();
        break;
      case " ":
      case "Enter":
        select(items[focused]);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  var initial =
    items.filter(function (it) {
      return it.getAttribute("aria-checked") === "true" && isEnabled(it);
    })[0] || items.filter(isEnabled)[0];
  if (initial) select(initial, true);
  else syncTabIndex();

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeydown);

  function selectedItem() {
    return items.filter(function (it) {
      return it.getAttribute("aria-checked") === "true";
    })[0] || null;
  }

  function selectedIndex() {
    return items.indexOf(selectedItem());
  }

  function valueOfSelected() {
    var item = selectedItem();
    return item ? valueOf(item) : "";
  }

  function selectIndex(index, opts) {
    var item = items[index];
    if (!item) return false;
    return select(item, opts && opts.silent);
  }

  // 卸载：撤掉容器上的监听，清掉元素标记
  function destroy() {
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeydown);
    if (root._segmented === api) root._segmented = null;
  }

  var api = {
    el: root,
    select: selectIndex,
    selectedIndex: selectedIndex,
    value: valueOfSelected,
    destroy: destroy
  };
  root._segmented = api;
  return api;
}

export function initSegmenteds(root = document) {
  var scope = root || document;
  var roots = Array.prototype.slice.call(scope.querySelectorAll("[data-segmented]"));
  if (scope.nodeType === 1 && scope.matches("[data-segmented]")) roots.unshift(scope);
  roots.forEach(function (el) {
    createSegmented(el);
  });
}
