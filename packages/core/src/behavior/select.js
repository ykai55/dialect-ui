/* ============================================================
   select.js — 下拉框：一条按钮 + 一个 .menu 展开层

   展开层的行为（打开、定位、键盘、关闭）全部在 menu.js，这里只做
   下拉框自己的事：把选中项写回按钮、维护 aria-selected、给按钮
   挂展开 / 收起的状态类。
   ============================================================ */
import { createMenu } from "./menu.js";

var uid = 0;

export function createSelect(root, options) {
  options = options || {};
  if (root._select) return root._select;
  var button = root.querySelector(".select__button");
  var menu = root.querySelector(".menu");
  if (!button || !menu) return null;

  var id = menu.id || "select-menu-" + ++uid;
  menu.id = id;

  var value = button.querySelector(".select__value");
  var items = menu.querySelectorAll(".menu__item");

  Array.prototype.forEach.call(items, function (item) {
    if (!item.hasAttribute("aria-selected")) item.setAttribute("aria-selected", "false");
  });

  var ctrl = createMenu(menu, {
    role: "listbox",
    anchor: button,
    activeHost: button,
    triggers: [button],
    focusOnOpen: false,
    matchAnchorWidth: true,
    initialActive: "selected",
    onOpen: function () {
      button.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      if (options.onOpenChange) options.onOpenChange(true);
    },
    onClose: function () {
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      if (options.onOpenChange) options.onOpenChange(false);
    },
    onChoose: function (item, index) {
      var all = menu.querySelectorAll(".menu__item");
      Array.prototype.forEach.call(all, function (it, n) {
        it.setAttribute("aria-selected", n === index ? "true" : "false");
      });
      if (value) value.textContent = item.textContent.trim();
      if (options.onChange) options.onChange(valueOf(), index, item);
    }
  });

  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", id);

  // 展开时按下按钮会先把菜单关掉（menu.js 的 pointerdown 处理），
  // 这次 click 不能再把它打开
  function onButtonClick(e) {
    e.preventDefault();
    if (ctrl.consumePointerDismiss()) return;
    if (ctrl.isOpen()) ctrl.close({ restoreFocus: true });
    else ctrl.open({ invoker: button });
  }

  function onButtonKeydown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!ctrl.isOpen()) {
        ctrl.open({ invoker: button });
        return;
      }
      if (e.key === "ArrowDown") ctrl.move(1);
      else if (e.key === "ArrowUp") ctrl.move(-1);
      else ctrl.activate();
    } else if (e.key === "Escape" && ctrl.isOpen()) {
      e.preventDefault();
      ctrl.close({ restoreFocus: true });
    } else if (e.key === "Home" || e.key === "End") {
      // 收起状态按 Home/End：直接选首 / 末项（和原生 combo 一样）；展开时只移高亮
      e.preventDefault();
      var wasOpen = ctrl.isOpen();
      if (!wasOpen) ctrl.open({ invoker: button });
      if (e.key === "Home") ctrl.first();
      else ctrl.last();
      if (!wasOpen) ctrl.activate();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // 收起状态输入字母：跳到前缀匹配项并选中；展开时只移高亮
      var opened = ctrl.isOpen();
      if (!opened) ctrl.open({ invoker: button });
      var hit = ctrl.typeahead(e.key);
      e.preventDefault();
      if (hit < 0) {
        if (!opened) ctrl.close({ restoreFocus: true });
        return;
      }
      if (!opened) ctrl.activate();
    }
  }

  button.addEventListener("click", onButtonClick);
  button.addEventListener("keydown", onButtonKeydown);

  function open(opts) {
    ctrl.open(Object.assign({ invoker: button }, opts || {}));
  }

  function close(opts) {
    ctrl.close(Object.assign({ restoreFocus: true }, opts || {}));
  }

  function isOpen() {
    return ctrl.isOpen();
  }

  function itemList() {
    return Array.prototype.slice.call(menu.querySelectorAll(".menu__item"));
  }

  function selectedIndex() {
    return itemList().findIndex(function (item) {
      return item.getAttribute("aria-selected") === "true";
    });
  }

  function valueOf() {
    var index = selectedIndex();
    if (index < 0) return "";
    var item = itemList()[index];
    return item.getAttribute("data-value") || (item.textContent || "").trim();
  }

  function select(index, opts) {
    opts = opts || {};
    var item = itemList()[index];
    if (!item) return;
    itemList().forEach(function (it, n) {
      it.setAttribute("aria-selected", n === index ? "true" : "false");
    });
    if (value) value.textContent = (item.textContent || "").trim();
    if (opts.silent) return;
    if (options.onChange) options.onChange(valueOf(), index, item);
    if (ctrl.isOpen()) ctrl.close({ restoreFocus: true });
  }

  // 卸载：撤掉按钮上的监听、销毁展开层控制器、清掉元素标记
  function destroy() {
    button.removeEventListener("click", onButtonClick);
    button.removeEventListener("keydown", onButtonKeydown);
    ctrl.destroy();
    button.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    if (root._select === api) root._select = null;
  }

  var api = {
    el: root,
    open: open,
    close: close,
    isOpen: isOpen,
    select: select,
    selectedIndex: selectedIndex,
    value: valueOf,
    destroy: destroy
  };
  root._select = api;
  return api;
}

export function initSelects(root = document) {
  var scope = root || document;
  var roots = Array.prototype.slice.call(scope.querySelectorAll("[data-select]"));
  if (scope.nodeType === 1 && scope.matches("[data-select]")) roots.unshift(scope);
  roots.forEach(function (el) {
    createSelect(el);
  });
}
