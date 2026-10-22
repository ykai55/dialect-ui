/* ============================================================
   window.js — 窗口组件（行为层）

   声明式：<div class="window" data-window> … </div> 自动接管窗口内的右键：
   - 窗口内一律不弹浏览器菜单；
   - 右键落在文本框 / 多行输入上时，懒创建一个原生风格的文本菜单
     （Cut / Copy / Paste / Delete / Select All），并交给 text-menu.js；
   - 其余位置只拦截浏览器菜单，和原生窗口的客户区一致；
   - 禁用控件上的右键也走同一条捕获路径，不会漏出浏览器菜单。

   也提供命令式 API：Dialect.createWindow(el, options)。
   窗口按钮：带 [data-window-action] 的按钮会派发 window:action 事件，
   宿主自己决定最小化 / 最大化 / 关闭要做什么。
   ============================================================ */
(function () {
  "use strict";

  var TEXT_ACTIONS = [
    ["cut", "Cut"],
    ["copy", "Copy"],
    ["paste", "Paste"],
    ["-", ""],
    ["delete", "Delete"],
    ["selectall", "Select All"]
  ];

  function defaultTextMenu() {
    var menu = document.createElement("ul");
    menu.className = "menu";
    menu.setAttribute("data-text-menu", "");
    menu.setAttribute("popover", "manual");
    TEXT_ACTIONS.forEach(function (pair) {
      if (pair[0] === "-") {
        var sep = document.createElement("li");
        sep.className = "menu__separator";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
        return;
      }
      var item = document.createElement("li");
      item.className = "menu__item";
      item.setAttribute("data-action", pair[0]);
      item.textContent = pair[1];
      menu.appendChild(item);
    });
    return menu;
  }

  function init(el, options) {
    if (!el || el._window) return el && el._window;
    options = options || {};
    el._window = { options: options };
    el.setAttribute("data-window-ready", "");

    function body() {
      return el.querySelector(
        ".window__body, [data-window-body]"
      ) || el;
    }

    function ensureTextMenu() {
      if (el._window.textMenu) return el._window.textMenu;
      var menu = el.querySelector("[data-text-menu]");
      if (!menu) {
        menu = defaultTextMenu();
        body().appendChild(menu);
      }
      if (window.Dialect && Dialect.initTextMenu) Dialect.initTextMenu(menu);
      el._window.textMenu = menu;
      return menu;
    }

    el.addEventListener(
      "contextmenu",
      function (e) {
        e.preventDefault();
        var field = e.target.closest && e.target.closest("input, textarea");
        if (field && !field.disabled) ensureTextMenu();
        el.dispatchEvent(
          new CustomEvent("window:contextmenu", {
            bubbles: true,
            detail: {
              target: e.target,
              x: e.clientX,
              y: e.clientY,
              prevented: true
            }
          })
        );
      },
      true
    );

    el.addEventListener("click", function (e) {
      var btn = e.target.closest && e.target.closest("[data-window-action]");
      if (!btn || btn.disabled) return;
      el.dispatchEvent(
        new CustomEvent("window:action", {
          bubbles: true,
          detail: { action: btn.getAttribute("data-window-action"), button: btn }
        })
      );
    });

    return el._window;
  }

  document.querySelectorAll("[data-window]").forEach(function (el) {
    init(el);
  });

  window.Dialect = window.Dialect || {};
  window.Dialect.createWindow = init;
})();
