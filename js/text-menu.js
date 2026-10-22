/* ============================================================
   text-menu.js — 文本框 / 多行输入的右键菜单

   复用 menu.js 的弹层和键盘模型，只补三件事：
   右键时按选区状态更新可用项、执行编辑动作、把焦点还给输入框。

   Cut / Copy / Paste 走剪贴板 API。Copy、Cut 用户点菜单项时算用户手势，
   写剪贴板没问题；Paste 要读剪贴板，浏览器会按权限拦截，读不到时这一项
   会被置灰（Safari 和没授权的 Chromium 都属于这种）。

   声明式用法：同一个容器里放一个 [data-text-menu] 的 .menu，容器里的
   .field__input（input / textarea）自动绑定：
     <div class="panel">
       <input class="field__input" type="text" />
       <ul class="menu" popover="manual" data-text-menu>
         <li class="menu__item" data-action="cut">Cut</li>
         …
       </ul>
     </div>
   ============================================================ */
(function () {
  "use strict";

  var uid = 0;

  function copyFallback(text) {
    // 没有 Clipboard API 时的兜底：临时 textarea + execCommand。
    // 会短暂抢焦点，做完把焦点还回去。
    var active = document.activeElement;
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(ta);
    if (active && active.focus) active.focus({ preventScroll: true });
    return ok;
  }

  function writeClipboard(text) {
    if (!text) return Promise.resolve(false);
    var pending;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        pending = navigator.clipboard.writeText(text);
      }
    } catch (e) {
      pending = null;
    }
    if (pending && pending.then) {
      return pending.then(
        function () { return true; },
        function () { return copyFallback(text); }
      );
    }
    return Promise.resolve(copyFallback(text));
  }

  function canReadClipboard() {
    return !!(navigator.clipboard && navigator.clipboard.readText);
  }

  function init(menuEl) {
    if (menuEl._textMenuCtrl) return;
    var owner = menuEl.parentElement || document;
    var fields = owner.querySelectorAll("input.field__input, textarea.field__input");
    if (!fields.length) fields = owner.querySelectorAll("input, textarea");

    var field = null;
    var selStart = 0;
    var selEnd = 0;

    var ctrl = window.Dialect.createMenu(menuEl, {
      onChoose: function (item) {
        // 编辑动作里可能有剪贴板权限一类的异常，别让它把菜单关闭流程带崩
        try {
          if (field) perform(item.getAttribute("data-action"));
        } catch (e) {
          /* 忽略：菜单照常关，焦点照常还 */
        }
      }
    });
    menuEl._textMenuCtrl = ctrl;

    function item(name) {
      return menuEl.querySelector('[data-action="' + name + '"]');
    }

    function setEnabled(name, enabled) {
      var el = item(name);
      if (!el) return;
      if (enabled) el.removeAttribute("aria-disabled");
      else el.setAttribute("aria-disabled", "true");
    }

    function hasSelection() {
      return selEnd > selStart;
    }

    function update() {
      var readOnly = field && (field.readOnly || field.disabled);
      var has = hasSelection();
      setEnabled("cut", has && !readOnly);
      setEnabled("copy", has);
      setEnabled("paste", !readOnly && canReadClipboard());
      setEnabled("delete", has && !readOnly);
      setEnabled("selectall", !!field && field.value.length > 0);
    }

    function selectionText() {
      return field ? field.value.slice(selStart, selEnd) : "";
    }

    function replaceSelection(text) {
      if (!field) return;
      var start = Math.min(selStart, field.value.length);
      var end = Math.min(selEnd, field.value.length);
      field.focus({ preventScroll: true });
      field.setSelectionRange(start, end);
      field.setRangeText(text, start, end, "end");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function perform(action) {
      if (!field) return;
      if (action === "copy") {
        writeClipboard(selectionText());
        return;
      }
      if (action === "cut") {
        var text = selectionText();
        if (!text) return;
        // 先删再写：剪贴板写入是异步的，可能等权限或干脆不 resolve，
        // 不能让它卡住「Cut 等于删掉选区」这个可见结果
        replaceSelection("");
        writeClipboard(text);
        return;
      }
      if (action === "delete") {
        replaceSelection("");
        return;
      }
      if (action === "selectall") {
        field.focus({ preventScroll: true });
        field.select();
        return;
      }
      if (action === "paste") {
        if (!canReadClipboard()) return;
        navigator.clipboard.readText().then(
          function (text) {
            if (text) replaceSelection(text);
            field.focus({ preventScroll: true });
          },
          function () {
            // 权限被拒或读不到：什么都不做，菜单已经关掉
            field.focus({ preventScroll: true });
          }
        );
      }
    }

    Array.prototype.forEach.call(fields, function (el) {
      if (el.disabled) return;
      el.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        field = el;
        selStart = el.selectionStart || 0;
        selEnd = el.selectionEnd || 0;
        // 右键点在选区外时浏览器已经把选区收起，这里就按光标位置处理
        update();
        ctrl.open({
          point: { x: e.clientX, y: e.clientY },
          invoker: el
        });
      });
    });
  }

  document.querySelectorAll("[data-text-menu]").forEach(init);

  window.Dialect = window.Dialect || {};
  window.Dialect.initTextMenu = init;
})();
