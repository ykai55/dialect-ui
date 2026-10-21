(function () {
  "use strict";

  var THEMES = [
    { id: "win11", name: "Windows 11", sub: "Fluent / WinUI 3 · 4px 圆角 · 底部内描边" },
    { id: "win10", name: "Windows 10", sub: "Aero / Win32 · 方角 · 1px 全描边" },
    { id: "winxp", name: "Windows XP", sub: "经典外观 · 2px 四色斜面 · 无悬停" },
    { id: "macos", name: "macOS", sub: "Tahoe (26) · 胶囊按钮 · 外发光焦点" },
    { id: "gnome", name: "GNOME", sub: "Adwaita / GTK4 · 9px 圆角 · 内侧焦点环" }
  ];

  var STATES = [
    { cls: "", label: "default", disabled: false },
    { cls: "s-hover", label: "hover", disabled: false },
    { cls: "s-active", label: "active", disabled: false },
    { cls: "s-focus", label: "focus", disabled: false },
    { cls: "s-disabled", label: "disabled", disabled: true }
  ];

  var params = new URLSearchParams(window.location.search);
  var mode = params.get("mode") === "dark" ? "dark" : "light";
  var only = params.get("theme");

  /* ---------- 片段 ---------- */

  function btn(cls, text, disabled) {
    return (
      '<button type="button" class="btn ' +
      cls +
      '"' +
      (disabled ? " disabled" : "") +
      ">" +
      text +
      "</button>"
    );
  }

  function field(cls, disabled) {
    return (
      '<label class="field ' +
      cls +
      '">' +
      '<span class="field__wrap">' +
      '<input class="field__input" type="text" placeholder="name@example.com"' +
      (disabled ? " disabled" : "") +
      ">" +
      "</span></label>"
    );
  }

  function check(cls, on, disabled) {
    return (
      '<label class="check ' +
      cls +
      '">' +
      '<input type="checkbox" class="check__input"' +
      (on ? " checked" : "") +
      (disabled ? " disabled" : "") +
      ">" +
      '<span class="check__box"><svg class="check__mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M5.2 10.3 L8 14 L13.5 5.7" /></svg></span>' +
      '<span class="check__label">Label</span>' +
      "</label>"
    );
  }

  function radio(cls, on, disabled, i) {
    return (
      '<label class="radio ' +
      cls +
      '">' +
      '<input type="radio" class="radio__input" name="hr' +
      i +
      '"' +
      (on ? " checked" : "") +
      (disabled ? " disabled" : "") +
      ">" +
      '<span class="radio__dot"></span>' +
      '<span class="radio__label">Label</span>' +
      "</label>"
    );
  }

  function toggle(cls, on, disabled) {
    return (
      '<label class="switch ' +
      cls +
      '">' +
      '<input type="checkbox" class="switch__input"' +
      (on ? " checked" : "") +
      (disabled ? " disabled" : "") +
      ">" +
      '<span class="switch__track"><span class="switch__knob"></span></span>' +
      '<span class="switch__label">Label</span>' +
      "</label>"
    );
  }

  function row(label, html) {
    return (
      '<div class="hrow">' +
      '<span class="hrow__label">' +
      label +
      "</span>" +
      '<span class="hrow__slot">' +
      html +
      "</span>" +
      "</div>"
    );
  }

  function group(title, rows) {
    return (
      '<section class="hgroup">' +
      '<h4 class="hgroup__title">' +
      title +
      "</h4>" +
      rows.join("") +
      "</section>"
    );
  }

  /* ---------- 组装 ---------- */

  function build(theme) {
    var buttons = STATES.map(function (s) {
      return row(
        s.label,
        btn(s.cls, "Cancel", s.disabled) +
          btn("btn--primary " + s.cls, "Save", s.disabled)
      );
    });

    var fields = [
      row("default", field("", false)),
      row("focus", field("s-focus", false)),
      row("disabled", field("s-disabled", true))
    ];

    var checks = [
      row("off", check("", false, false)),
      row("on", check("", true, false)),
      row("focus", check("s-focus", true, false)),
      row("disabled", check("s-disabled", true, true))
    ];

    var radios = [
      row("off", radio("", false, false, 1)),
      row("on", radio("", true, false, 2)),
      row("focus", radio("s-focus", true, false, 3)),
      row("disabled", radio("s-disabled", false, true, 4))
    ];

    var switches = [
      row("off", toggle("", false, false)),
      row("on", toggle("", true, false)),
      row("focus", toggle("s-focus", true, false)),
      row("disabled", toggle("s-disabled", true, true))
    ];

    var el = document.createElement("section");
    el.className = "hcard";
    el.setAttribute("data-theme", theme.id);
    el.setAttribute("data-mode", mode);
    el.innerHTML =
      '<div class="hcard__cap">' +
      theme.name +
      "<small>" +
      theme.sub +
      "</small></div>" +
      '<div class="hbody panel">' +
      group("button", buttons) +
      group("text field", fields) +
      group("checkbox", checks) +
      group("radio", radios) +
      group("switch", switches) +
      "</div>";

    return el;
  }

  document.body.classList.toggle("mode-dark", mode === "dark");

  var root = document.getElementById("harness");
  var list = !only || only === "all"
    ? THEMES
    : THEMES.filter(function (t) {
        return t.id === only;
      });

  if (only && only !== "all") {
    root.classList.add("harness--single");
  }

  list.forEach(function (t) {
    root.appendChild(build(t));
  });

  document.getElementById("harness-hint").textContent =
    (only && only !== "all" ? only : "全部平台") + " · " + mode;
})();
