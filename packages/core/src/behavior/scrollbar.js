/* ============================================================
   scrollbar.js — Firefox 的滚动条兜底

   Chromium / Safari 能用 ::-webkit-scrollbar 画平台样式；Firefox 只支持
   scrollbar-width / scrollbar-color，macOS 上还是系统 overlay，宽度、圆角、
   箭头都不受控。这里在 Firefox 里隐藏原生滚动条，用 DOM 画一条同样吃
   --scrollbar-* 令牌的滚动条；Chromium / Safari 不介入。

   标记：给滚动容器加 data-dialect-scrollbar。
   ============================================================ */

function isFirefox() {
  return typeof CSS !== "undefined" && CSS.supports && CSS.supports("-moz-appearance", "none");
}

function makeOverlay(target) {
  var overlay = document.createElement("div");
  overlay.className = "dsb";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<button type="button" class="dsb__btn dsb__btn--up" tabindex="-1" aria-hidden="true"></button>' +
    '<div class="dsb__track"><div class="dsb__thumb"></div></div>' +
    '<button type="button" class="dsb__btn dsb__btn--down" tabindex="-1" aria-hidden="true"></button>';
  return overlay;
}

function attach(target) {
  if (target._dialectScrollbar) return;
  target._dialectScrollbar = true;
  target.classList.add("dsb-on");

  var overlay = makeOverlay(target);
  var isPage = target.classList.contains("rooms");
  overlay.classList.add(isPage ? "dsb--fixed" : "dsb--window");
  if (isPage) target.appendChild(overlay);
  else target.parentElement.appendChild(overlay);

  var track = overlay.querySelector(".dsb__track");
  var thumb = overlay.querySelector(".dsb__thumb");
  var up = overlay.querySelector(".dsb__btn--up");
  var down = overlay.querySelector(".dsb__btn--down");

  function sync() {
    var sh = target.scrollHeight;
    var ch = target.clientHeight;
    if (sh <= ch + 1) {
      overlay.hidden = true;
      return;
    }
    overlay.hidden = false;

    if (!isPage) {
      var r = target.getBoundingClientRect();
      var wr = target.parentElement.getBoundingClientRect();
      overlay.style.top = r.top - wr.top + "px";
      overlay.style.height = r.height + "px";
    }

    var trackH = track.clientHeight;
    var thumbH = Math.max(24, Math.round((ch / sh) * trackH));
    thumb.style.height = thumbH + "px";
    var maxScroll = sh - ch;
    var maxThumb = Math.max(1, trackH - thumbH);
    var y = (target.scrollTop / maxScroll) * maxThumb;
    thumb.style.transform = "translateY(" + y + "px)";
  }

  target.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  if (window.ResizeObserver) new ResizeObserver(sync).observe(target);

  up.addEventListener("click", function () {
    target.scrollBy({ top: -target.clientHeight * 0.9, behavior: "auto" });
  });
  down.addEventListener("click", function () {
    target.scrollBy({ top: target.clientHeight * 0.9, behavior: "auto" });
  });

  /* 拖拽滑块 */
  var drag = null;
  thumb.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    drag = {
      y: e.clientY,
      top: target.scrollTop,
      range: (target.scrollHeight - target.clientHeight) / Math.max(1, track.clientHeight - thumb.offsetHeight)
    };
    overlay.classList.add("dsb--dragging");
  });
  thumb.addEventListener("pointermove", function (e) {
    if (!drag) return;
    target.scrollTop = drag.top + (e.clientY - drag.y) * drag.range;
  });
  function endDrag() {
    drag = null;
    overlay.classList.remove("dsb--dragging");
  }
  thumb.addEventListener("pointerup", endDrag);
  thumb.addEventListener("pointercancel", endDrag);

  sync();
}

export function initScrollbars(root = document) {
  if (!isFirefox()) return;
  var scope = root || document;
  var targets = Array.prototype.slice.call(scope.querySelectorAll("[data-dialect-scrollbar]"));
  if (scope.nodeType === 1 && scope.matches("[data-dialect-scrollbar]")) targets.unshift(scope);
  targets.forEach(attach);
}

export function destroyScrollbars(root = document) {
  var scope = root || document;
  scope.querySelectorAll("[data-dialect-scrollbar].dsb-on").forEach(function (target) {
    target.classList.remove("dsb-on");
    target._dialectScrollbar = false;
    if (target.classList.contains("rooms")) {
      var own = target.querySelector(":scope > .dsb--fixed");
      if (own) own.remove();
    } else {
      var win = target.parentElement && target.parentElement.querySelector(".dsb--window");
      if (win) win.remove();
    }
  });
}
