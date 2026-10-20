(function () {
  "use strict";

  var THEMES = ["win11", "macos", "gnome"];
  var params = new URLSearchParams(window.location.search);
  var boards = Array.prototype.slice.call(document.querySelectorAll(".board"));
  var template = document.getElementById("specimen");

  /* ---------- 1. 每个 board 放一份同样的控件样本 ---------- */

  boards.forEach(function (board) {
    var id = board.dataset.board;
    var slot = board.querySelector("[data-slot]");
    var frag = template.content.cloneNode(true);

    // radio 的 name 必须各自独立，否则三个面板互相干扰
    frag.querySelectorAll('input[type="radio"]').forEach(function (input, i) {
      input.name = "appearance-" + id + "-" + i;
    });

    slot.appendChild(frag);
    initSliders(slot);
    board.setAttribute("data-theme", id);
  });

  /* ---------- 滑块：把值写进 --slider-pct，轨道才会有填充 ---------- */

  function initSliders(root) {
    root.querySelectorAll(".slider").forEach(function (el) {
      var update = function () {
        var min = Number(el.min) || 0;
        var max = Number(el.max) || 100;
        var pct = ((Number(el.value) - min) / (max - min)) * 100;
        el.style.setProperty("--slider-pct", pct + "%");
        var out = el.parentElement.querySelector(".slider__value");
        if (out) out.textContent = el.value;
      };
      el.addEventListener("input", update);
      update();
    });
  }

  /* ---------- 2. 平台识别（只是给个默认值，可手动改） ---------- */

  function detectOS() {
    var d = navigator.userAgentData;
    var platform = (d && d.platform) || navigator.platform || "";
    var ua = navigator.userAgent || "";

    if (/mac/i.test(platform) || /Mac OS X/.test(ua)) return "macos";
    if (/win/i.test(platform) || /Windows/.test(ua)) return "win11";
    if (/linux|x11/i.test(platform) || /Linux/.test(ua)) return "gnome";
    return null;
  }

  /* ---------- 3. 状态 ---------- */

  var detected = detectOS();
  var systemDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  var theme = THEMES.indexOf(params.get("theme")) > -1
    ? params.get("theme")
    : detected || "macos";

  var mode = params.get("mode") === "dark"
    ? "dark"
    : params.get("mode") === "light"
      ? "light"
      : systemDark
        ? "dark"
        : "light";

  var compare = params.get("compare") === "1" || params.get("compare") === "true";

  /* ---------- 4. 渲染 ---------- */

  function render() {
    document.body.classList.toggle("is-compare", compare);
    document.body.classList.toggle("mode-dark", mode === "dark");

    boards.forEach(function (board) {
      var id = board.dataset.board;
      board.setAttribute("data-mode", mode);
      board.hidden = !compare && id !== theme;
    });

    document.querySelectorAll("[data-pick-theme]").forEach(function (btn) {
      btn.setAttribute(
        "aria-pressed",
        String(btn.dataset.pickTheme === theme)
      );
    });

    document.querySelectorAll("[data-pick-mode]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.pickMode === mode));
    });

    var hint = document.getElementById("hint");
    if (detected) {
      hint.textContent = "检测到 " + labelOf(detected) + " · 已预选";
    } else {
      hint.textContent = "未识别系统 · 默认 " + labelOf(theme);
    }

    try {
      var url = new URL(window.location.href);
      url.searchParams.set("theme", theme);
      url.searchParams.set("mode", mode);
      if (compare) url.searchParams.set("compare", "1");
      else url.searchParams.delete("compare");
      history.replaceState(null, "", url);
    } catch (e) {
      /* file:// 下 replaceState 可能被拒绝，忽略即可 */
    }
  }

  function labelOf(id) {
    return id === "win11" ? "Windows" : id === "macos" ? "macOS" : "Linux";
  }

  /* ---------- 5. 交互 ---------- */

  document.querySelectorAll("[data-pick-theme]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      theme = btn.dataset.pickTheme;
      if (compare) compare = false;
      render();
    });
  });

  document.querySelectorAll("[data-pick-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      mode = btn.dataset.pickMode;
      render();
    });
  });

  var compareBox = document.getElementById("compare");
  compareBox.checked = compare;
  compareBox.addEventListener("change", function () {
    compare = compareBox.checked;
    render();
  });

  render();
})();
