(function () {
  "use strict";

  var uid = 0;

  function initSelect(root) {
    var button = root.querySelector(".select__button");
    var menu = root.querySelector(".menu");
    if (!button || !menu) return;

    var items = Array.prototype.slice.call(menu.querySelectorAll(".menu__item"));
    var active = -1;
    var id = "select-menu-" + ++uid;

    menu.id = id;
    menu.setAttribute("role", "listbox");
    menu.setAttribute("tabindex", "-1");
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", id);
    items.forEach(function (item, i) {
      item.setAttribute("role", "option");
      item.id = id + "-" + i;
      if (item.getAttribute("aria-selected") !== "true") item.setAttribute("aria-selected", "false");
    });

    function isOpen() {
      return menu.matches(":popover-open");
    }

    function setActive(i) {
      if (items[active]) items[active].classList.remove("is-active");
      active = i;
      if (items[active]) {
        items[active].classList.add("is-active");
        button.setAttribute("aria-activedescendant", items[active].id);
        var it = items[active];
        var top = it.offsetTop - menu.clientHeight / 2 + it.offsetHeight / 2;
        menu.scrollTop = Math.max(0, top);
      } else {
        button.removeAttribute("aria-activedescendant");
      }
    }

    function place() {
      var r = button.getBoundingClientRect();
      menu.style.minWidth = r.width + "px";
      menu.style.left = r.left + "px";
      var below = window.innerHeight - r.bottom;
      var up = below < menu.offsetHeight + 12 && r.top > menu.offsetHeight + 12;
      menu.style.top = (up ? r.top - menu.offsetHeight - 4 : r.bottom + 4) + "px";
    }

    function open() {
      if (isOpen()) return;
      menu.showPopover();
      place();
      button.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      var selected = items.findIndex(function (it) {
        return it.getAttribute("aria-selected") === "true";
      });
      setActive(selected >= 0 ? selected : 0);
    }

    function close() {
      if (!isOpen()) return;
      menu.hidePopover();
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      setActive(-1);
    }

    menu.addEventListener("toggle", function (e) {
      // 用户点外部或按 Esc 时浏览器会自己关掉，这里只同步状态
      if (e.newState === "closed") {
        button.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
        setActive(-1);
      }
    });

    button.addEventListener("click", function (e) {
      e.preventDefault();
      isOpen() ? close() : open();
    });

    button.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        if (e.key === "ArrowDown") setActive(Math.min(items.length - 1, active + 1));
        else if (e.key === "ArrowUp") setActive(Math.max(0, active - 1));
        else if (active >= 0) choose(active);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });

    menu.addEventListener("click", function (e) {
      var item = e.target.closest(".menu__item");
      if (item) choose(items.indexOf(item));
    });

    menu.addEventListener("mousemove", function (e) {
      var item = e.target.closest(".menu__item");
      if (item) setActive(items.indexOf(item));
    });

    menu.addEventListener("keydown", function (e) {
      var keys = ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Escape", "Tab"];
      if (keys.indexOf(e.key) === -1) return;
      e.preventDefault();
      if (e.key === "ArrowDown") setActive(Math.min(items.length - 1, active + 1));
      else if (e.key === "ArrowUp") setActive(Math.max(0, active - 1));
      else if (e.key === "Home") setActive(0);
      else if (e.key === "End") setActive(items.length - 1);
      else if (e.key === "Enter") { if (active >= 0) choose(active); }
      else if (e.key === "Escape" || e.key === "Tab") { close(); button.focus(); }
    });

    root._select = { open: open, close: close };
  }

  document.querySelectorAll("[data-select]").forEach(initSelect);

  // 截图用：?open=1 自动展开第一个下拉框
  if (new URLSearchParams(location.search).get("open") === "1") {
    var visible = Array.prototype.slice
      .call(document.querySelectorAll("[data-select]"))
      .filter(function (el) { return el.getBoundingClientRect().width > 0; })[0];
    if (visible && visible._select) visible._select.open();
  }
})();
