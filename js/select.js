/* ============================================================
   select.js — 下拉框：一条按钮 + 一个 .menu 展开层

   展开层的行为（打开、定位、键盘、关闭）全部在 menu.js，这里只做
   下拉框自己的事：把选中项写回按钮、维护 aria-selected、给按钮
   挂展开 / 收起的状态类。
   ============================================================ */
(function () {
  "use strict";

  var uid = 0;

  function initSelect(root) {
    var button = root.querySelector(".select__button");
    var menu = root.querySelector(".menu");
    if (!button || !menu || !window.Dialect || !Dialect.createMenu) return;

    var id = menu.id || "select-menu-" + ++uid;
    menu.id = id;

    var value = button.querySelector(".select__value");
    var items = menu.querySelectorAll(".menu__item");

    Array.prototype.forEach.call(items, function (item) {
      if (!item.hasAttribute("aria-selected")) item.setAttribute("aria-selected", "false");
    });

    var ctrl = Dialect.createMenu(menu, {
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
      },
      onClose: function () {
        button.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
      },
      onChoose: function (item, index) {
        var all = menu.querySelectorAll(".menu__item");
        Array.prototype.forEach.call(all, function (it, n) {
          it.setAttribute("aria-selected", n === index ? "true" : "false");
        });
        if (value) value.textContent = item.textContent.trim();
      }
    });

    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);

    // 展开时按下按钮会先把菜单关掉（menu.js 的 pointerdown 处理），
    // 这次 click 不能再把它打开
    button.addEventListener("click", function (e) {
      e.preventDefault();
      if (ctrl.consumePointerDismiss()) return;
      if (ctrl.isOpen()) ctrl.close({ restoreFocus: true });
      else ctrl.open({ invoker: button });
    });

    button.addEventListener("keydown", function (e) {
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
    });

    root._select = {
      open: function () {
        ctrl.open({ invoker: button });
      },
      close: function () {
        ctrl.close({ restoreFocus: true });
      }
    };
  }

  document.querySelectorAll("[data-select]").forEach(initSelect);

  // 截图用：?open=1 自动展开第一个下拉框
  if (new URLSearchParams(location.search).get("open") === "1") {
    var visible = Array.prototype.slice
      .call(document.querySelectorAll("[data-select]"))
      .filter(function (el) {
        return el.getBoundingClientRect().width > 0;
      })[0];
    if (visible && visible._select) visible._select.open();
  }
})();
