/* ============================================================
   menu.js — 弹出菜单的公共行为层

   独立菜单、右键菜单和下拉框展开层共用这一份逻辑：
   打开与定位、键盘模型、关闭后的焦点归属。

   外观不在这里。样式在 packages/core/css/components.css 的「下拉菜单」一节，
   每个平台的数值在 packages/core/css/themes/*.css 的 --menu-* 令牌里。

   声明式用法：
   <div data-menu>
   <button type="button" data-menu-trigger>Actions</button>
   <ul class="menu" popover="manual">
   <li class="menu__item">…</li>
   </ul>
   </div>

   右键区域放在同一个容器里，菜单是整个容器的那个 .menu：
   <div data-menu>
   <div data-menu-context tabindex="0">Right-click here</div>
   <ul class="menu" popover="manual">…</ul>
   </div>

   脚本接口：
   var ctrl = createMenu(menuEl, options);
   options.activeHost          收 aria-activedescendant 的元素，默认菜单本身
   options.anchor              默认锚点
   options.focusOnOpen         打开后是否把焦点移到 activeHost，默认 true
   options.initialActive       "none"（默认）| "first" | "selected"
   options.matchAnchorWidth    菜单最小宽度跟随锚点，下拉框用
   options.role                "menu"（默认）| "listbox"
   options.onOpen / onClose / onChoose(item, index)
   ctrl.open({ anchor, point: {x, y}, invoker })
   ctrl.close({ restoreFocus })  ctrl.move(±1)  ctrl.setActive(i)  ctrl.activate()
   ctrl.destroy()

   模块加载阶段不访问 document / window；声明式绑定走 initMenus(root = document)。
   ============================================================ */
var uid = 0;
var TYPEAHEAD_MS = 600;
var EDGE = 6; // 离视口边缘留的余量

function toArray(list) {
  return Array.prototype.slice.call(list);
}

function isNavigable(item) {
  return (
    item.getAttribute("aria-disabled") !== "true" &&
    !item.hidden &&
    item.getClientRects().length > 0
  );
}

function menuOffset(menuEl) {
  var raw = getComputedStyle(menuEl).getPropertyValue("--menu-offset").trim();
  var n = parseFloat(raw);
  return isNaN(n) ? 4 : n;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function createMenu(menuEl, options) {
  options = options || {};
  var role = options.role === "listbox" ? "listbox" : "menu";
  var itemRole = role === "listbox" ? "option" : "menuitem";
  var host = options.activeHost || menuEl;
  var id = menuEl.id || (menuEl.id = "dialect-menu-" + ++uid);

  var items = [];
  var active = -1;
  var invoker = null;
  var restoreFocusOnClose = false;
  var typeahead = "";
  var typeaheadTimer = 0;
  var triggers = options.triggers || [];
  // 菜单开着时按下它自己的触发器：这次 click 不能再把菜单打开
  var pointerDismissed = false;

  if (!menuEl.getAttribute("role")) menuEl.setAttribute("role", role);
  if (!menuEl.hasAttribute("tabindex")) menuEl.setAttribute("tabindex", "-1");

  function collect() {
    items = toArray(menuEl.querySelectorAll(".menu__item"));
    items.forEach(function (item, i) {
      if (!item.id) item.id = id + "-item-" + i;
      if (!item.getAttribute("role")) item.setAttribute("role", itemRole);
    });
  }

  collect();

  function isOpen() {
    return menuEl.matches(":popover-open");
  }

  function navigableIndexes() {
    var out = [];
    items.forEach(function (item, i) {
      if (isNavigable(item)) out.push(i);
    });
    return out;
  }

  function scrollIntoView(item) {
    var top = item.offsetTop - menuEl.clientHeight / 2 + item.offsetHeight / 2;
    menuEl.scrollTop = Math.max(0, top);
  }

  function setActive(i) {
    if (items[active]) items[active].classList.remove("is-active");
    active = i >= 0 && items[i] && isNavigable(items[i]) ? i : -1;
    if (active >= 0) {
      items[active].classList.add("is-active");
      host.setAttribute("aria-activedescendant", items[active].id);
      scrollIntoView(items[active]);
    } else {
      host.removeAttribute("aria-activedescendant");
    }
  }

  function move(dir) {
    var nav = navigableIndexes();
    if (!nav.length) return;
    var pos = nav.indexOf(active);
    var next;
    if (pos === -1) next = dir > 0 ? nav[0] : nav[nav.length - 1];
    else next = nav[(pos + dir + nav.length) % nav.length];
    setActive(next);
  }

  function firstItem() {
    var nav = navigableIndexes();
    if (nav.length) setActive(nav[0]);
  }

  function lastItem() {
    var nav = navigableIndexes();
    if (nav.length) setActive(nav[nav.length - 1]);
  }

  function itemText(item) {
    var clone = item.cloneNode(true);
    toArray(clone.querySelectorAll(".menu__shortcut")).forEach(function (el) {
      el.parentNode.removeChild(el);
    });
    return (clone.textContent || "").trim().toLowerCase();
  }

  function jumpTo(prefix) {
    var nav = navigableIndexes();
    if (!nav.length) return -1;
    var start = active >= 0 ? nav.indexOf(active) + 1 : 0;
    for (var k = 0; k < nav.length; k++) {
      var idx = nav[(start + k + nav.length) % nav.length];
      if (itemText(items[idx]).indexOf(prefix) === 0) {
        setActive(idx);
        return idx;
      }
    }
    // 缓冲里没有能对上的项：连按同一个字母时退化成单字符匹配
    if (prefix.length > 1) return jumpTo(prefix.charAt(prefix.length - 1));
    return -1;
  }

  // 供下拉框在按钮上复用：输入一个字符，返回命中的项下标（没命中 -1）
  function typeaheadInput(key) {
    if (typeof key !== "string" || key.length !== 1 || !/\S/.test(key)) return -1;
    typeahead += key.toLowerCase();
    window.clearTimeout(typeaheadTimer);
    typeaheadTimer = window.setTimeout(function () {
      typeahead = "";
    }, TYPEAHEAD_MS);
    return jumpTo(typeahead);
  }

  function typeaheadKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    if (e.key === " " || e.key === "Enter" || e.key === "Escape" || e.key === "Tab") return false;
    if (e.key.length !== 1 || !/\S/.test(e.key)) return false;
    e.preventDefault();
    typeaheadInput(e.key);
    return true;
  }

  function place(opts) {
    var offset = menuOffset(menuEl);
    var width = menuEl.offsetWidth;
    var height = menuEl.offsetHeight;
    var left;
    var top;

    if (opts.point) {
      menuEl.style.minWidth = "";
      width = menuEl.offsetWidth;
      height = menuEl.offsetHeight;
      left = clamp(opts.point.x, EDGE, Math.max(EDGE, window.innerWidth - width - EDGE));
      top = clamp(opts.point.y, EDGE, Math.max(EDGE, window.innerHeight - height - EDGE));
    } else {
      var anchor = opts.anchor || options.anchor;
      if (!anchor) return;
      var r = anchor.getBoundingClientRect();
      menuEl.style.minWidth = options.matchAnchorWidth ? r.width + "px" : "";
      width = menuEl.offsetWidth;
      height = menuEl.offsetHeight;
      left = clamp(r.left, EDGE, Math.max(EDGE, window.innerWidth - width - EDGE));
      var down = r.bottom + offset;
      var up = r.top - height - offset;
      top =
        down + height > window.innerHeight - EDGE && up > EDGE
          ? up
          : clamp(down, EDGE, Math.max(EDGE, window.innerHeight - height - EDGE));
    }

    menuEl.style.left = left + "px";
    menuEl.style.top = top + "px";
  }

  function open(opts) {
    opts = opts || {};
    if (isOpen()) return;
    collect();
    pointerDismissed = false;
    invoker =
      opts.invoker ||
      (document.activeElement && document.activeElement.nodeType === 1
        ? document.activeElement
        : null) ||
      opts.anchor ||
      options.anchor ||
      null;

    menuEl.showPopover();
    place(opts);

    if (options.initialActive === "selected") {
      var selected = -1;
      items.forEach(function (item, i) {
        if (item.getAttribute("aria-selected") === "true") selected = i;
      });
      setActive(selected);
    } else if (options.initialActive === "first") {
      firstItem();
    } else {
      setActive(-1);
    }

    if (options.focusOnOpen !== false && host.focus) {
      host.focus({ preventScroll: true });
    }

    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    document.addEventListener("pointerdown", onDocPointerDown, true);
    document.addEventListener("focusin", onDocFocusIn, true);
    if (options.onOpen) options.onOpen();
  }

  function close(opts) {
    opts = opts || {};
    if (!isOpen()) return;
    restoreFocusOnClose = opts.restoreFocus !== false;
    menuEl.hidePopover();
  }

  // 滚动或缩放后位置就不准了，直接关掉（和原来的下拉框行为一致）
  function onScrollOrResize() {
    close({ restoreFocus: false });
  }

  // 点菜单外面：自己的触发器要留个标记，其余情况直接关，焦点留给点到的地方
  function onDocPointerDown(e) {
    if (!isOpen()) return;
    if (menuEl.contains(e.target)) return;
    var ownTrigger = triggers.some(function (t) {
      return t === e.target || t.contains(e.target);
    });
    if (ownTrigger) pointerDismissed = true;
    close({ restoreFocus: false });
  }

  // Tab 或别的途径把焦点移出菜单和触发器时也要关（原生下拉框失焦即收起）
  function onDocFocusIn(e) {
    if (!isOpen()) return;
    if (menuEl.contains(e.target)) return;
    var ownTrigger = triggers.some(function (t) {
      return t === e.target || t.contains(e.target);
    });
    if (!ownTrigger) close({ restoreFocus: false });
  }

  function consumePointerDismiss() {
    var v = pointerDismissed;
    pointerDismissed = false;
    return v;
  }

  function choose(item) {
    if (!isNavigable(item)) return;
    var index = items.indexOf(item);
    menuEl.dispatchEvent(
      new CustomEvent("menu:choose", { bubbles: true, detail: { item: item, index: index } })
    );
    if (options.onChoose) options.onChoose(item, index);
    close({ restoreFocus: true });
  }

  function activate() {
    if (active >= 0 && items[active]) choose(items[active]);
  }

  function onToggle(e) {
    if (e.newState === "open") return;
    window.removeEventListener("resize", onScrollOrResize);
    window.removeEventListener("scroll", onScrollOrResize, true);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
    document.removeEventListener("focusin", onDocFocusIn, true);
    setActive(-1);
    if (options.onClose) options.onClose();

    var target = restoreFocusOnClose ? invoker : null;
    restoreFocusOnClose = false;
    invoker = null;
    if (
      target &&
      target !== document.body &&
      target !== document.documentElement &&
      target.isConnected &&
      target.focus
    ) {
      target.focus({ preventScroll: true });
    }
  }

  function onKeydown(e) {
    var handled = true;
    switch (e.key) {
      case "ArrowDown":
        move(1);
        break;
      case "ArrowUp":
        move(-1);
        break;
      case "Home":
        firstItem();
        break;
      case "End":
        lastItem();
        break;
      case "Enter":
      case " ":
        if (active >= 0) activate();
        break;
      case "Escape":
        close({ restoreFocus: true });
        break;
      case "Tab":
        // 焦点继续往后走，不强行还给触发器
        close({ restoreFocus: false });
        handled = false;
        break;
      case "ContextMenu":
        // 菜单里再按一次菜单键不该冒出第二层菜单
        break;
      default:
        handled = typeaheadKey(e);
    }
    if (handled) e.preventDefault();
  }

  function onClick(e) {
    var item = e.target.closest(".menu__item");
    if (!item || !menuEl.contains(item)) return;
    e.preventDefault();
    if (!isNavigable(item)) return;
    choose(item);
  }

  function onMousemove(e) {
    var item = e.target.closest(".menu__item");
    if (item && menuEl.contains(item)) {
      setActive(items.indexOf(item));
    } else if (e.target.closest(".menu__separator")) {
      setActive(-1);
    }
  }

  menuEl.addEventListener("toggle", onToggle);
  menuEl.addEventListener("keydown", onKeydown);
  menuEl.addEventListener("click", onClick);
  menuEl.addEventListener("mousemove", onMousemove);

  // 卸载：撤掉本控制器挂出去的所有监听，关掉还开着的弹层，清掉元素标记。
  // 销毁过程中不回调 onClose（React StrictMode 的清理阶段不该再触发状态更新）。
  function destroy() {
    window.removeEventListener("resize", onScrollOrResize);
    window.removeEventListener("scroll", onScrollOrResize, true);
    document.removeEventListener("pointerdown", onDocPointerDown, true);
    document.removeEventListener("focusin", onDocFocusIn, true);
    window.clearTimeout(typeaheadTimer);
    menuEl.removeEventListener("toggle", onToggle);
    menuEl.removeEventListener("keydown", onKeydown);
    menuEl.removeEventListener("click", onClick);
    menuEl.removeEventListener("mousemove", onMousemove);
    if (isOpen()) {
      restoreFocusOnClose = false;
      menuEl.hidePopover();
    }
    setActive(-1);
    typeahead = "";
    pointerDismissed = false;
    invoker = null;
    restoreFocusOnClose = false;
    if (menuEl._menuCtrl === ctrl) menuEl._menuCtrl = null;
  }

  var ctrl = {
    el: menuEl,
    menu: menuEl,
    open: open,
    close: close,
    isOpen: isOpen,
    setActive: setActive,
    move: move,
    first: firstItem,
    last: lastItem,
    activate: activate,
    typeahead: typeaheadInput,
    consumePointerDismiss: consumePointerDismiss,
    refresh: collect,
    destroy: destroy
  };
  menuEl._menuCtrl = ctrl;
  return ctrl;
}

/* ---------- 声明式绑定：data-menu / data-menu-trigger / data-menu-context ---------- */

export function createMenuBox(box, options) {
  options = options || {};
  var menuEl = options.menu || box.querySelector(".menu");
  if (!menuEl) return null;
  if (menuEl._menuBoxCtrl) return menuEl._menuBoxCtrl;

  var triggers = options.triggers || toArray(box.querySelectorAll("[data-menu-trigger]"));
  var contextTargets =
    options.contextTargets || toArray(box.querySelectorAll("[data-menu-context]"));
  var disposers = [];
  var userOnOpen = options.onOpen;
  var userOnClose = options.onClose;

  var ctrl = createMenu(menuEl, {
    role: options.role,
    anchor: options.anchor,
    activeHost: options.activeHost,
    focusOnOpen: options.focusOnOpen,
    initialActive: options.initialActive,
    matchAnchorWidth: options.matchAnchorWidth,
    onChoose: options.onChoose,
    triggers: triggers,
    onOpen: function () {
      triggers.forEach(function (t) {
        t.setAttribute("aria-expanded", "true");
      });
      if (userOnOpen) userOnOpen();
    },
    onClose: function () {
      triggers.forEach(function (t) {
        t.setAttribute("aria-expanded", "false");
      });
      if (userOnClose) userOnClose();
    }
  });

  // 包装 destroy：除了菜单自己的监听，还要撤掉触发器 / 右键目标上的监听
  var destroyMenu = ctrl.destroy;
  ctrl.destroy = function () {
    destroyMenu();
    disposers.forEach(function (fn) {
      fn();
    });
    disposers.length = 0;
    if (menuEl._menuBoxCtrl === ctrl) menuEl._menuBoxCtrl = null;
  };
  menuEl._menuBoxCtrl = ctrl;

  triggers.forEach(function (trigger) {
    trigger.setAttribute("aria-haspopup", "menu");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menuEl.id);

    // 菜单开着时按下触发器，onDocPointerDown 已经把菜单关掉了，
    // 这次 click 不能再把它打开（看起来像关不掉）
    function onTriggerClick(e) {
      e.preventDefault();
      if (ctrl.consumePointerDismiss()) return;
      if (ctrl.isOpen()) ctrl.close({ restoreFocus: true });
      else ctrl.open({ anchor: trigger, invoker: trigger });
    }

    function onTriggerKeydown(e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (!ctrl.isOpen()) ctrl.open({ anchor: trigger, invoker: trigger });
      ctrl.move(e.key === "ArrowDown" ? 1 : -1);
    }

    trigger.addEventListener("click", onTriggerClick);
    trigger.addEventListener("keydown", onTriggerKeydown);
    disposers.push(function () {
      trigger.removeEventListener("click", onTriggerClick);
      trigger.removeEventListener("keydown", onTriggerKeydown);
    });
  });

  contextTargets.forEach(function (target) {
    function openAt(x, y) {
      ctrl.open({
        point: { x: x, y: y },
        invoker:
          document.activeElement && document.activeElement.nodeType === 1
            ? document.activeElement
            : null
      });
    }

    function onContextMenu(e) {
      e.preventDefault();
      // 原生右键会把焦点落到目标上，关菜单后焦点也回到这里。
      // 目标不可聚焦时（普通 div）就留给当前焦点。
      if (target.tabIndex >= 0) target.focus({ preventScroll: true });
      openAt(e.clientX, e.clientY);
    }

    // 键盘的菜单键 / Shift+F10：在目标左上角附近展开
    function onContextKeydown(e) {
      if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
      e.preventDefault();
      var r = target.getBoundingClientRect();
      openAt(r.left + 8, r.top + 8);
    }

    target.addEventListener("contextmenu", onContextMenu);
    target.addEventListener("keydown", onContextKeydown);
    disposers.push(function () {
      target.removeEventListener("contextmenu", onContextMenu);
      target.removeEventListener("keydown", onContextKeydown);
    });
  });

  return ctrl;
}

// 声明式用法：在 [data-menu] 盒子里找 .menu、（可选）[data-menu-trigger] /
// [data-menu-context]，和 createMenuBox 是同一份实现。
export function initMenuBox(box) {
  createMenuBox(box);
}

export function initMenus(root = document) {
  var scope = root || document;
  var boxes = Array.prototype.slice.call(scope.querySelectorAll("[data-menu]"));
  if (scope.nodeType === 1 && scope.matches("[data-menu]")) boxes.unshift(scope);
  boxes.forEach(initMenuBox);
}
