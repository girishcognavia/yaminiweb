/* =====================================================================
   Hero visual: interactive "airflow vortex" on <canvas id="vortex">.
   Thousands of fine light streaks orbit on a tilted plane, like cool air
   leaving a fan. Brand colours: cool cyan / icy white + a few red sparks.

   Interaction (mouse + touch):
   - the vortex centre leans toward the pointer
   - streaks near the pointer are pushed aside and swirl around it
   - faster pointer movement spins the whole vortex faster
   - click / tap sends a shockwave through the air
   - a soft glow (#heroCursor) follows the pointer; the outlined headline
     fills with light under it (--mx/--my on #heroTitle)
   - streaks flow AROUND the outlined headline letters (.ht-outline): a
     keep-out field built from the real glyph positions deflects them, and
     the glyph area is wiped each frame so nothing draws inside the letters

   Sharp on retina, resizes with its container, pauses off-screen or in a
   hidden tab. prefers-reduced-motion: one still frame, no interaction.
   ===================================================================== */
(function () {
  "use strict";
  const canvas = document.getElementById("vortex");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const hero = canvas.closest(".hero") || canvas.parentElement;
  const cursorEl = document.getElementById("heroCursor");
  const titleEl = document.getElementById("heroTitle");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  const TILT = 0.58;                 // vertical squash of the orbit plane (3D tilt)
  const ROT = -0.32;                 // rotation of the plane in radians
  const COLORS = [                   // [r, g, b, share]
    [120, 214, 255, 0.62],           // cool cyan
    [235, 246, 255, 0.28],           // icy white
    [255, 77, 94, 0.10]              // brand red sparks
  ];
  const cosR = Math.cos(ROT), sinR = Math.sin(ROT);

  let W = 0, H = 0, R = 0, dpr = 1, parts = [], running = false, raf = 0, visible = true;
  let CX = 0, CY = 0;                // resting centre of the vortex
  let cx = 0, cy = 0;                // current (leaning) centre
  const ptr = { x: 0, y: 0, vx: 0, vy: 0, on: false, last: 0 };
  let spin = 1, waves = [];          // global spin multiplier; active shockwaves

  function pickColor() {
    let x = Math.random();
    for (let i = 0; i < COLORS.length; i++) { if ((x -= COLORS[i][3]) <= 0) return i; }
    return 0;
  }
  const gauss = () => (Math.random() + Math.random() + Math.random()) / 3;

  function spawn(p, fresh) {
    p.r = R * (fresh ? 0.14 + gauss() * 0.86 : 0.16 + Math.random() * 0.12);
    p.a = Math.random() * Math.PI * 2;
    p.w = (0.0035 + Math.random() * 0.006) * Math.pow(R / p.r, 0.75); // faster near the core
    p.dr = R * (0.0004 + Math.random() * 0.0012);                     // slow outward drift
    p.c = pickColor();
    p.wob = Math.random() * Math.PI * 2;
    p.ox = 0; p.oy = 0;                                               // pointer displacement
    p.px = NaN; p.py = NaN;                                           // last drawn position
    return p;
  }

  function size() {
    const box = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const wide = W / H > 1.1;
    CX = wide ? W * 0.62 : W * 0.5;              // sit right of the headline on wide screens
    CY = wide ? H * 0.5 : H * 0.62;
    cx = CX; cy = CY;
    R = Math.min(W * (wide ? 0.62 : 0.9), H / TILT) * 0.5 * 1.35;
    const n = Math.round(Math.min(coarse ? 1100 : 2000, Math.max(600, (W * H) / 220)));
    parts = Array.from({ length: n }, () => spawn({}, true));
    ctx.clearRect(0, 0, W, H);
    buildMask();
  }

  /* ---------- keep-out field: streaks flow around the outlined headline ---------- */
  const avoidEl = document.querySelector(".ht-outline");
  const CELL = 6;                    // field resolution in px
  let mask = null, field = null, FW = 0, FH = 0;
  function buildMask() {
    mask = field = null;
    const node = avoidEl && avoidEl.firstChild;
    if (!node || node.nodeType !== 3 || !W || !H) return;
    const cr = canvas.getBoundingClientRect(), cs = getComputedStyle(avoidEl);
    const m = document.createElement("canvas"); m.width = Math.ceil(W); m.height = Math.ceil(H);
    const g = m.getContext("2d");
    const fs = parseFloat(cs.fontSize);
    g.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    g.textBaseline = "alphabetic"; g.fillStyle = g.strokeStyle = "#000"; g.lineJoin = "round";
    g.lineWidth = Math.max(8, fs * 0.09);                // breathing room around each letter
    const asc = g.measureText("Hg").fontBoundingBoxAscent || fs * 0.8;
    const range = document.createRange(), text = node.textContent;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (let i = 0; i < text.length; i++) {             // place each glyph exactly where the browser drew it
      if (text[i] === " ") continue;
      range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      if (!r.width) continue;
      const x = r.left - cr.left, y = r.top - cr.top + asc;
      g.fillText(text[i], x, y); g.strokeText(text[i], x, y);
      bx0 = Math.min(bx0, x); by0 = Math.min(by0, r.top - cr.top); bx1 = Math.max(bx1, r.right - cr.left); by1 = Math.max(by1, r.bottom - cr.top);
    }
    if (bx0 < bx1) fillCounters(g, bx0, by0, bx1, by1);
    mask = m;
    // low-res blurred copy → smooth "pressure" field whose gradient points into the letters
    FW = Math.ceil(W / CELL); FH = Math.ceil(H / CELL);
    const s = document.createElement("canvas"); s.width = FW; s.height = FH;
    const sg = s.getContext("2d"); sg.drawImage(m, 0, 0, FW, FH);
    const d = sg.getImageData(0, 0, FW, FH).data;
    const f = new Float32Array(FW * FH), tmp = new Float32Array(FW * FH), rad = 2, n = 2 * rad + 1;
    for (let i = 0; i < f.length; i++) f[i] = d[i * 4 + 3] / 255;
    const cl = (v, hi) => (v < 0 ? 0 : v > hi ? hi : v);
    for (let pass = 0; pass < 2; pass++) {               // separable box blur
      for (let y = 0; y < FH; y++) {
        let acc = 0; for (let x = -rad; x <= rad; x++) acc += f[y * FW + cl(x, FW - 1)];
        for (let x = 0; x < FW; x++) { tmp[y * FW + x] = acc / n; acc += f[y * FW + cl(x + rad + 1, FW - 1)] - f[y * FW + cl(x - rad, FW - 1)]; }
      }
      for (let x = 0; x < FW; x++) {
        let acc = 0; for (let y = -rad; y <= rad; y++) acc += tmp[cl(y, FH - 1) * FW + x];
        for (let y = 0; y < FH; y++) { f[y * FW + x] = acc / n; acc += tmp[cl(y + rad + 1, FH - 1) * FW + x] - tmp[cl(y - rad, FH - 1) * FW + x]; }
      }
    }
    field = f;
  }
  // Fill enclosed letter holes (o, a, e, g…): flood-fill the open space from the text box edges;
  // any non-glyph pixel the flood can't reach is inside a letter.
  function fillCounters(g, x0, y0, x1, y1) {
    const pad = 6;
    x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad));
    x1 = Math.min(g.canvas.width, Math.ceil(x1 + pad)); y1 = Math.min(g.canvas.height, Math.ceil(y1 + pad));
    const w = x1 - x0, h = y1 - y0;
    if (w < 3 || h < 3) return;
    const img = g.getImageData(x0, y0, w, h), d = img.data, seen = new Uint8Array(w * h), stack = [];
    const open = (i) => d[i * 4 + 3] < 128;
    const push = (i) => { if (!seen[i] && open(i)) { seen[i] = 1; stack.push(i); } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (stack.length) {
      const i = stack.pop(), x = i % w;
      if (x > 0) push(i - 1); if (x < w - 1) push(i + 1);
      if (i >= w) push(i - w); if (i < w * (h - 1)) push(i + w);
    }
    for (let i = 0; i < w * h; i++) if (!seen[i] && open(i)) d[i * 4 + 3] = 255;
    g.putImageData(img, x0, y0);
  }

  function avoid(p, x, y) {
    if (!field) return;
    const i = (x / CELL) | 0, j = (y / CELL) | 0;
    if (i < 1 || j < 1 || i >= FW - 1 || j >= FH - 1) return;
    const k = j * FW + i, v = field[k];
    if (v < 0.01) return;
    const gx = field[k + 1] - field[k - 1], gy = field[k + FW] - field[k - FW], gl = Math.hypot(gx, gy);
    if (gl < 1e-5) return;
    const push = v * v * 6;                               // gentle: slide just clear of the glyph
    p.ox -= (gx / gl) * push; p.oy -= (gy / gl) * push;
    const ol = Math.hypot(p.ox, p.oy), cap = 46;            // never shove a streak far off its path
    if (ol > cap) { p.ox *= cap / ol; p.oy *= cap / ol; }
  }

  function project(r, a) {
    const x = r * Math.cos(a), y = r * Math.sin(a) * TILT;
    return [cx + x * cosR - y * sinR, cy + x * sinR + y * cosR];
  }

  /* ---------- pointer ---------- */
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const now = performance.now(), dt = Math.max(8, now - ptr.last);
    if (ptr.on) { ptr.vx = (x - ptr.x) / dt * 16; ptr.vy = (y - ptr.y) / dt * 16; }
    ptr.x = x; ptr.y = y; ptr.on = true; ptr.last = now;
    if (cursorEl) cursorEl.style.transform = `translate(${x}px, ${y}px)`;
    if (titleEl) {
      const tr = titleEl.getBoundingClientRect();
      titleEl.style.setProperty("--mx", (e.clientX - tr.left) + "px");
      titleEl.style.setProperty("--my", (e.clientY - tr.top) + "px");
    }
    hero.classList.add("is-pointing");
  }
  function leave() { ptr.on = false; hero.classList.remove("is-pointing"); }
  function burst(e) {
    if (e.target.closest("a, button")) return;
    setPointer(e);
    waves.push({ x: ptr.x, y: ptr.y, t: 0 });
    spin = Math.min(spin + 1.6, 4);
    if (cursorEl) { cursorEl.classList.remove("is-burst"); void cursorEl.offsetWidth; cursorEl.classList.add("is-burst"); }
  }
  if (!reduce) {
    hero.addEventListener("pointermove", setPointer, { passive: true });
    hero.addEventListener("pointerdown", burst, { passive: true });
    hero.addEventListener("pointerleave", leave);
    hero.addEventListener("pointercancel", leave);
    if (coarse) hero.addEventListener("pointerup", leave);
  }

  /* ---------- frame ---------- */
  function frame() {
    // fade previous frame (soft trails, keeps transparency)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    // centre leans toward the pointer; spin follows pointer speed
    const tx = ptr.on ? CX + (ptr.x - CX) * 0.18 : CX, ty = ptr.on ? CY + (ptr.y - CY) * 0.18 : CY;
    cx += (tx - cx) * 0.04; cy += (ty - cy) * 0.04;
    const speed = Math.hypot(ptr.vx, ptr.vy);
    spin += (1 + Math.min(speed / 40, 1.5) - spin) * 0.03;
    ptr.vx *= 0.9; ptr.vy *= 0.9;
    waves.forEach((w) => (w.t += 1));
    waves = waves.filter((w) => w.t < 70);

    const RAD = Math.max(120, Math.min(W, H) * 0.2), RAD2 = RAD * RAD;
    const paths = COLORS.map(() => new Path2D());
    for (const p of parts) {
      p.wob += 0.02;
      p.a += p.w * spin;
      p.r += p.dr + Math.sin(p.wob) * R * 0.0008;
      if (p.r > R * 1.02) { spawn(p, false); continue; }
      let [x, y] = project(p.r, p.a);

      // pointer: push aside + swirl
      if (ptr.on) {
        const dx = x + p.ox - ptr.x, dy = y + p.oy - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < RAD2) {
          const d = Math.sqrt(d2) || 1, f = (1 - d / RAD);
          const push = f * f * 9, swirl = f * 6;
          p.ox += (dx / d) * push - (dy / d) * swirl + ptr.vx * f * 0.35;
          p.oy += (dy / d) * push + (dx / d) * swirl + ptr.vy * f * 0.35;
        }
      }
      // shockwaves: ring that pushes outward as it expands
      for (const w of waves) {
        const ring = w.t * 14, dx = x + p.ox - w.x, dy = y + p.oy - w.y, d = Math.hypot(dx, dy) || 1;
        const band = Math.abs(d - ring);
        if (band < 60) { const f = (1 - band / 60) * (1 - w.t / 70) * 10; p.ox += (dx / d) * f; p.oy += (dy / d) * f; }
      }
      avoid(p, x + p.ox, y + p.oy);
      p.ox *= 0.93; p.oy *= 0.93;
      x += p.ox; y += p.oy;

      if (p.px === p.px) { paths[p.c].moveTo(p.px, p.py); paths[p.c].lineTo(x, y); }
      p.px = x; p.py = y;
    }
    COLORS.forEach(([r, g, b], i) => {
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`; ctx.lineWidth = 1.2; ctx.stroke(paths[i]);
    });
    if (mask) { ctx.globalCompositeOperation = "destination-out"; ctx.drawImage(mask, 0, 0, W, H); }   // keep letters clear
    ctx.globalCompositeOperation = "source-over";
  }

  function loop() { frame(); raf = requestAnimationFrame(loop); }
  function start() { if (!running && visible && !reduce && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const hint = document.getElementById("heroHint");
  if (hint) hint.textContent = coarse ? "Touch and drag to stir the air · tap for a burst" : "Move your cursor to stir the air · click for a burst";

  size();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMask);   // glyph metrics need the web font
  if (reduce) { for (let i = 0; i < 60; i++) frame(); return; }
  new ResizeObserver(() => { const was = running; stop(); size(); if (was) start(); }).observe(canvas.parentElement);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
})();
