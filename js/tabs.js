/* ============================================================
   tabs.js — 标签页的行为层

   横向、不可关闭、不分页滚动。外观在 css/components.css 的「标签页」一节，
   每个平台的数值在 css/theme-*.css 的 --tabs-* 令牌里。

   键盘按 web 的 tablist 模式做（WAI-ARIA APG）：
   整条 tablist 一个 Tab 站，左右方向键移动并立即切换，Home / End 到首尾，
   Tab 从选中的标签离开、进入面板。原生六家的键位并不一致（Windows 有
   Ctrl+Tab，GNOME 的 AdwTabBar 另有自己的一套），差异记在 docs/tabs-notes.md。

   声明式用法：
     <div class="tabs" data-tabs>
       <div class="tabs__list" role="tablist" aria-label="Sections">
         <button type="button" class="tabs__tab" role="tab" aria-selected="true"
                 aria-controls="panel-general">General</button>
         <button type="button" class="tabs__tab" role="tab" aria-selected="false"
                 aria-controls="panel-advanced" tabindex="-1">Advanced</button>
       </div>
       <div class="tabs__panel" role="tabpanel" id="panel-general">…</div>
       <div class="tabs__panel" role="tabpanel" id="panel-advanced" hidden>…</div>
     </div>

   切换时在容器上冒泡 "tabs:change"，detail = { tab, panel, index, value }。
   ============================================================ */
(function () {
  "use strict";

  var uid = 0;

  function isEnabled(tab) {
    return !tab.disabled && tab.getAttribute("aria-disabled") !== "true";
  }

  function init(root) {
    if (root._tabs) return;
    var list = root.querySelector(".tabs__list");
    var tabs = Array.prototype.slice.call(root.querySelectorAll(".tabs__tab"));
    if (!list || !tabs.length) return;

    if (!list.getAttribute("role")) list.setAttribute("role", "tablist");
    if (!list.id) list.id = "tabs-list-" + ++uid;

    tabs.forEach(function (tab, i) {
      if (!tab.getAttribute("role")) tab.setAttribute("role", "tab");
      if (!tab.id) tab.id = list.id + "-tab-" + i;
      if (!tab.hasAttribute("aria-selected")) tab.setAttribute("aria-selected", "false");
      if (!tab.hasAttribute("tabindex")) tab.tabIndex = -1;
    });

    // 声明式用法允许不写 id / aria-controls：按顺序把第 i 个面板配给第 i 个标签。
    // 这样同一段 markup 复制到六个主题面板里也不会撞 id。
    var panels = Array.prototype.slice.call(root.querySelectorAll(".tabs__panel"));
    tabs.forEach(function (tab, i) {
      if (!tab.getAttribute("aria-controls") && panels[i]) {
        if (!panels[i].id) panels[i].id = list.id + "-panel-" + i;
        tab.setAttribute("aria-controls", panels[i].id);
      }
      var panel = tab.getAttribute("aria-controls")
        ? document.getElementById(tab.getAttribute("aria-controls"))
        : null;
      if (panel) {
        if (!panel.getAttribute("role")) panel.setAttribute("role", "tabpanel");
        if (!panel.getAttribute("aria-labelledby")) panel.setAttribute("aria-labelledby", tab.id);
      }
    });

    function panelOf(tab) {
      var id = tab.getAttribute("aria-controls");
      return id ? document.getElementById(id) : null;
    }

    function syncTabIndex() {
      var stop = tabs.filter(function (t) {
        return t.getAttribute("aria-selected") === "true" && isEnabled(t);
      })[0] || tabs.filter(isEnabled)[0];
      tabs.forEach(function (t) {
        t.tabIndex = t === stop ? 0 : -1;
      });
      return stop;
    }

    function select(tab, silent) {
      if (!isEnabled(tab)) return false;
      var wasSelected = tab.getAttribute("aria-selected") === "true";
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        var panel = panelOf(t);
        if (panel) panel.hidden = !on;
      });
      syncTabIndex();
      if (!silent && !wasSelected) {
        root.dispatchEvent(
          new CustomEvent("tabs:change", {
            bubbles: true,
            detail: {
              tab: tab,
              panel: panelOf(tab),
              index: tabs.indexOf(tab),
              value: tab.getAttribute("data-value") || (tab.textContent || "").trim()
            }
          })
        );
      }
      return !wasSelected;
    }

    function arrowMode() {
      var raw = getComputedStyle(list).getPropertyValue("--tabs-arrow-mode").trim();
      return raw || "select";
    }

    // 只移焦点、不改选中的版本：Windows 11 的 TabView 就是这样（空格/回车确认）
    function focusStep(dir) {
      var at = tabs.indexOf(document.activeElement);
      if (at < 0) at = tabs.indexOf(syncTabIndex());
      var next = at;
      for (var k = 0; k < tabs.length; k++) {
        next = (next + dir + tabs.length) % tabs.length;
        if (isEnabled(tabs[next])) break;
      }
      if (isEnabled(tabs[next])) tabs[next].focus({ preventScroll: true });
    }

    function focusFirst() {
      var tab = tabs.filter(isEnabled)[0];
      if (tab) tab.focus({ preventScroll: true });
    }

    function focusLast() {
      var enabled = tabs.filter(isEnabled);
      var tab = enabled[enabled.length - 1];
      if (tab) tab.focus({ preventScroll: true });
    }

    function step(dir) {
      var at = tabs.indexOf(document.activeElement);
      if (at < 0) at = tabs.indexOf(syncTabIndex());
      var next = at;
      for (var k = 0; k < tabs.length; k++) {
        next = (next + dir + tabs.length) % tabs.length;
        if (isEnabled(tabs[next])) break;
      }
      if (!isEnabled(tabs[next])) return;
      select(tabs[next]);
      tabs[next].focus({ preventScroll: true });
    }

    function first() {
      var tab = tabs.filter(isEnabled)[0];
      if (tab) {
        select(tab);
        tab.focus({ preventScroll: true });
      }
    }

    function last() {
      var enabled = tabs.filter(isEnabled);
      var tab = enabled[enabled.length - 1];
      if (tab) {
        select(tab);
        tab.focus({ preventScroll: true });
      }
    }

    list.addEventListener("click", function (e) {
      var tab = e.target.closest(".tabs__tab");
      if (!tab || !list.contains(tab)) return;
      e.preventDefault();
      if (!isEnabled(tab)) return;
      select(tab);
      tab.focus({ preventScroll: true });
    });

    list.addEventListener("keydown", function (e) {
      var focused = tabs.indexOf(document.activeElement);
      if (focused < 0) return;
      var mode = arrowMode();
      var handled = true;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowLeft":
        case "Home":
        case "End":
          if (mode === "none") {
            handled = false;
            break;
          }
          if (mode === "focus") {
            if (e.key === "ArrowRight") focusStep(1);
            else if (e.key === "ArrowLeft") focusStep(-1);
            else if (e.key === "Home") focusFirst();
            else focusLast();
          } else if (e.key === "ArrowRight") step(1);
          else if (e.key === "ArrowLeft") step(-1);
          else if (e.key === "Home") first();
          else last();
          break;
        case " ":
        case "Enter":
          select(tabs[focused]);
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    });

    var initial =
      tabs.filter(function (t) {
        return t.getAttribute("aria-selected") === "true" && isEnabled(t);
      })[0] || tabs.filter(isEnabled)[0];
    if (initial) select(initial, true);
    else syncTabIndex();

    root._tabs = { select: select, tabs: tabs };
  }

  document.querySelectorAll("[data-tabs]").forEach(init);

  window.Dialect = window.Dialect || {};
  window.Dialect.initTabs = init;
})();
