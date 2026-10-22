/* ============================================================
   corridor.js — 回忆走廊（demo/corridor.html）

   做四件事：
   1. 把控件样本复制进每个时代的窗口；
   2. 滚动 / 方向键 / 左右按钮 / 右侧点轨切换时代；
   3. 滚动视差：窗口上下错位、缩放、淡出，壁纸反向漂移；
   4. 氛围层：鼠标光斑、尘埃粒子、按时代换强调色。
   ============================================================ */
(function () {
  "use strict";

  var roomsEl = document.getElementById("rooms");
  var rooms = Array.prototype.slice.call(document.querySelectorAll(".room"));
  if (!roomsEl || !rooms.length) return;

  var hudEra = document.getElementById("hud-era");
  var hudSub = document.getElementById("hud-sub");
  var hudIndex = document.getElementById("hud-index");
  var dotsEl = document.getElementById("dots");
  var navPrev = document.getElementById("nav-prev");
  var navNext = document.getElementById("nav-next");
  var dust = document.getElementById("dust");
  var tpl = document.getElementById("specimen");
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. 控件样本 ---------- */

  rooms.forEach(function (room, i) {
    var body = room.querySelector("[data-specimen]");
    if (!body || !tpl) return;
    var frag = tpl.content.cloneNode(true);
    // radio 的 name 必须每个房间独立，否则六个房间互相干扰
    frag.querySelectorAll('input[type="radio"]').forEach(function (input, n) {
      input.name = "corridor-" + i + "-" + n;
    });
    body.appendChild(frag);
  });

  /* ---------- 2. 导航与状态 ---------- */

  var dots = rooms.map(function (room, i) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", room.dataset.name || "第 " + (i + 1) + " 个时代");
    btn.addEventListener("click", function () {
      go(i);
    });
    dotsEl.appendChild(btn);
    return btn;
  });

  var current = -1;

  function go(i) {
    var next = Math.max(0, Math.min(rooms.length - 1, i));
    rooms[next].scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  function accentOf(room) {
    var raw = getComputedStyle(room).getPropertyValue("--era-accent").trim();
    return raw || "#ffffff";
  }

  function setCurrent(i) {
    if (i === current) return;
    current = i;
    var room = rooms[i];
    rooms.forEach(function (r, n) {
      r.classList.toggle("is-active", n === i);
    });
    hudEra.textContent = room.dataset.name;
    hudSub.textContent = room.dataset.sub;
    hudIndex.textContent =
      String(i + 1).padStart(2, "0") + " / " + String(rooms.length).padStart(2, "0");
    dots.forEach(function (btn, n) {
      btn.setAttribute("aria-current", n === i ? "true" : "false");
    });
    document.body.style.setProperty("--era-accent", accentOf(room));
    navPrev.disabled = i === 0;
    navNext.disabled = i === rooms.length - 1;
  }

  /* ---------- 3. 滚动视差 ---------- */

  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight || 1;
    var scrollTop = roomsEl.scrollTop;
    var idx = Math.round(scrollTop / vh);
    setCurrent(Math.max(0, Math.min(rooms.length - 1, idx)));
    if (reduced) return;

    rooms.forEach(function (room) {
      var rel = (room.offsetTop - scrollTop) / vh;
      var abs = Math.min(1, Math.abs(rel));
      var wall = room.querySelector(".room__wall");
      var stage = room.querySelector(".room__stage");
      if (wall) wall.style.setProperty("--wall-y", (rel * 70).toFixed(1) + "px");
      if (stage) {
        stage.style.setProperty("--win-y", (rel * -90).toFixed(1) + "px");
        stage.style.setProperty("--win-scale", (1 - abs * 0.08).toFixed(3));
        stage.style.setProperty("--win-opacity", Math.max(0, 1 - abs * 0.85).toFixed(2));
        stage.style.setProperty("--win-blur", (abs * 5).toFixed(1) + "px");
      }
    });
  }

  roomsEl.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  window.addEventListener("resize", update);

  navPrev.addEventListener("click", function () {
    go(current - 1);
  });
  navNext.addEventListener("click", function () {
    go(current + 1);
  });

  document.addEventListener("keydown", function (e) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
      case "PageDown":
        e.preventDefault();
        go(current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        go(current - 1);
        break;
      case "Home":
        e.preventDefault();
        go(0);
        break;
      case "End":
        e.preventDefault();
        go(rooms.length - 1);
        break;
      default:
        break;
    }
  });

  /* ---------- 4. 鼠标光斑 ---------- */

  window.addEventListener(
    "pointermove",
    function (e) {
      if (reduced) return;
      rooms.forEach(function (room) {
        var r = room.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        room.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
        room.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
      });
    },
    { passive: true }
  );

  /* ---------- 5. 尘埃粒子 ---------- */

  var ctx = dust ? dust.getContext("2d") : null;
  var particles = [];
  var W = 0;
  var H = 0;
  var dpr = window.devicePixelRatio || 1;

  function hexToRgb(hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16)
    };
  }

  function resizeCanvas() {
    if (!dust || !ctx) return;
    dpr = window.devicePixelRatio || 1;
    W = dust.width = Math.floor(window.innerWidth * dpr);
    H = dust.height = Math.floor(window.innerHeight * dpr);
    dust.style.width = window.innerWidth + "px";
    dust.style.height = window.innerHeight + "px";
    var count = Math.max(26, Math.min(90, Math.round((window.innerWidth * window.innerHeight) / 24000)));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.0006,
        vy: -(0.0002 + Math.random() * 0.0009),
        a: 0.12 + Math.random() * 0.42,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  function frame(t) {
    if (!ctx || reduced) return;
    var rgb = hexToRgb(document.body.style.getPropertyValue("--era-accent") || "#ffffff");
    var time = (t || 0) / 1000;
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.05) {
        p.y = 1.05;
        p.x = Math.random();
      }
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      var tw = 0.55 + 0.45 * Math.sin(time * 1.4 + p.ph);
      ctx.beginPath();
      ctx.arc(p.x * W, p.y * H, p.r * dpr, 0, Math.PI * 2);
      ctx.fillStyle =
        "rgba(" + rgb.r + "," + rgb.g + "," + rgb.b + "," + (p.a * tw).toFixed(3) + ")";
      ctx.fill();
    }
    window.requestAnimationFrame(frame);
  }

  if (dust && ctx) {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    if (!reduced) window.requestAnimationFrame(frame);
  }

  /* ---------- 6. 启动 ---------- */

  function startRoom() {
    var params = new URLSearchParams(window.location.search);
    var wanted = params.get("era");
    if (!wanted) {
      var ua = navigator.userAgent || "";
      if (/Mac OS X/.test(ua)) wanted = "macos";
      else if (/Windows/.test(ua)) wanted = "win11";
      else if (/Linux|X11/.test(ua)) wanted = "gnome";
    }
    var idx = rooms.findIndex(function (r) {
      return r.dataset.era === wanted;
    });
    if (idx < 0) idx = 0;
    roomsEl.scrollTop = idx * window.innerHeight;
    setCurrent(idx);
    update();
  }

  startRoom();
})();
