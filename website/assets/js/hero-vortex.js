/* =====================================================================
   Hero visual: a live "airflow vortex" drawn on <canvas id="vortex">.
   Thousands of fine light streaks orbit a glowing core on a tilted plane,
   like cool air leaving a fan. Brand colours: cool cyan/white + a few red.
   - Sharp on retina (devicePixelRatio), resizes with its container
   - Pauses when off-screen or when the tab is hidden
   - prefers-reduced-motion: draws one still frame
   ===================================================================== */
(function () {
  "use strict";
  const canvas = document.getElementById("vortex");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TILT = 0.58;                 // vertical squash of the orbit plane (3D tilt)
  const ROT = -0.32;                 // rotation of the plane in radians
  const COLORS = [                   // [r, g, b, share]
    [120, 214, 255, 0.62],           // cool cyan
    [235, 246, 255, 0.28],           // icy white
    [255, 77, 94, 0.10]              // brand red sparks
  ];

  let W = 0, H = 0, R = 0, dpr = 1, parts = [], running = false, raf = 0, visible = true;

  function pickColor() {
    let x = Math.random();
    for (let i = 0; i < COLORS.length; i++) { if ((x -= COLORS[i][3]) <= 0) return i; }
    return 0;
  }
  function gauss() { return (Math.random() + Math.random() + Math.random()) / 3; }

  function spawn(p, fresh) {
    const band = 0.14 + gauss() * 0.86;           // most particles in the middle band
    p.r = R * (fresh ? band : 0.16 + Math.random() * 0.12);
    p.a = Math.random() * Math.PI * 2;
    p.w = (0.0035 + Math.random() * 0.006) * Math.pow(R / p.r, 0.75); // angular speed: faster near the core
    p.dr = R * (0.0004 + Math.random() * 0.0012); // slow outward drift
    p.c = pickColor();
    p.wob = Math.random() * Math.PI * 2;
    p.len = 0.6 + Math.random() * 1.2;            // streak thickness factor
    return p;
  }

  function size() {
    const box = canvas.parentElement.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = box.width; H = box.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H / TILT) * 0.5;
    const n = Math.round(Math.min(1800, Math.max(600, (W * H) / 130)));
    parts = Array.from({ length: n }, () => spawn({}, true));
    ctx.clearRect(0, 0, W, H);
  }

  // Project polar coords on the tilted, rotated plane to canvas x/y; z in [-1, 1] = depth
  const cosR = Math.cos(ROT), sinR = Math.sin(ROT);
  function project(r, a) {
    const x = r * Math.cos(a), y = r * Math.sin(a) * TILT;
    return [W / 2 + x * cosR - y * sinR, H / 2 + x * sinR + y * cosR, Math.sin(a)];
  }

  function frame() {
    // Fade previous frame (keeps soft trails, preserves transparency)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    // Batch strokes by colour and depth (back = dim, front = bright)
    const paths = COLORS.map(() => [new Path2D(), new Path2D()]);
    for (const p of parts) {
      const [x0, y0] = project(p.r, p.a);
      p.wob += 0.02;
      p.a += p.w;
      p.r += p.dr + Math.sin(p.wob) * R * 0.0008;
      if (p.r > R * 1.02) { spawn(p, false); continue; }
      const [x1, y1, z] = project(p.r, p.a);
      const path = paths[p.c][z > 0 ? 1 : 0];
      path.moveTo(x0, y0); path.lineTo(x1, y1);
    }
    COLORS.forEach(([r, g, b], i) => {
      ctx.strokeStyle = `rgba(${r},${g},${b},0.28)`; ctx.lineWidth = 1;   ctx.stroke(paths[i][0]);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`; ctx.lineWidth = 1.4; ctx.stroke(paths[i][1]);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function loop() { frame(); raf = requestAnimationFrame(loop); }
  function start() { if (!running && visible && !reduce) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  let disabled = false;
  // The 3D scene (hero-3d.js) calls this once WebGL is running; this 2D vortex is the fallback.
  window.HeroVortex2D = { disable() { disabled = true; stop(); canvas.style.display = "none"; } };
  const _start = start;
  start = function () { if (!disabled) _start(); };

  size();
  if (reduce) { for (let i = 0; i < 60; i++) frame(); return; }

  new ResizeObserver(() => { const was = running; stop(); size(); if (was) start(); }).observe(canvas.parentElement);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
})();
