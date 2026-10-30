/* =====================================================================
   "Who we are" work carousel (home page).
   Cards sit on the inside of a curved wall (CSS 3D) and glide slowly
   right → left, looping forever; hovering slows them down.
   Click / tap a card: it flips and pops out to the centre with the work
   details. Close (✕, Esc, backdrop): it flips back into its slot and the
   carousel resumes.
   Data: SITE.works in site-config.js.
   ===================================================================== */
(function () {
  "use strict";
  const stage = document.getElementById("worksStage");
  const S = window.SITE, UI = window.UI;
  if (!stage || !S || !S.works || !S.works.length || !UI) return;
  const { img, esc, icon } = UI;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Repeat the list so the curved wall is always full (at least 12 cards)
  const base = S.works;
  const reps = Math.max(1, Math.ceil(12 / base.length));
  const items = Array.from({ length: base.length * reps }, (_, i) => ({ ...base[i % base.length], key: i % base.length }));

  const cardHTML = (w, i) => `
    <button class="work-card${w.photo ? " is-photo" : ""}" data-i="${i}" aria-label="${esc(w.title)}: open details"${i >= base.length ? ' tabindex="-1" aria-hidden="true"' : ""}>
      <span class="work-media"><img src="${img(w.img)}" alt="" decoding="async" draggable="false"></span>
      <span class="work-cap"><small>${esc(w.tag)}</small><b>${esc(w.title)}</b></span>
      <span class="work-plus" aria-hidden="true">${icon("arrow")}</span>
    </button>`;
  stage.innerHTML = `<div class="works-ring">${items.map(cardHTML).join("")}</div>`;
  stage.classList.add("is-live");
  // Preload + decode every card image before the wall appears (no blank-then-pop cards)
  const uniq = [...new Set(base.map((w) => img(w.img)))];
  const whenReady = Promise.race([
    Promise.all(uniq.map((src) => { const im = new Image(); im.src = src; return (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); })),
    new Promise((r) => setTimeout(r, 2500))                // never wait longer than this
  ]);
  const ring = stage.firstElementChild;
  const cards = [...ring.children];

  /* ---------- curved wall geometry ---------- */
  let R = 1100, C = 900, P = 1000, cardW = 260, gap = 26, spacing = 286, L = 0;
  function layout() {
    const w = stage.clientWidth;
    cardW = Math.max(170, Math.min(290, w * 0.19));
    gap = cardW * 0.1;
    spacing = cardW + gap;
    R = Math.max(700, w * 0.78);           // cylinder radius
    P = R * 0.92;                           // perspective (viewer distance)
    C = P * 0.9;                            // cylinder centre sits just in front of the viewer → concave wall
    L = spacing * items.length;
    stage.style.perspective = P + "px";
    stage.style.setProperty("--cw", cardW + "px");
    stage.style.setProperty("--ch", cardW * 1.32 + "px");
  }

  let offset = 0, speed = 1, target = 1, hoverSlow = false, paused = false, openIdx = -1;
  function place() {
    const maxA = 1.05;
    cards.forEach((el, i) => {                            // the open card keeps its slot updated (hidden via .is-away)
      let s = (i * spacing - offset) % L;
      if (s < 0) s += L;
      s -= L / 2;                                          // centred around 0
      const a = s / R;
      const x = R * Math.sin(a), z = C - R * Math.cos(a);
      const vis = Math.abs(a) < maxA;
      el.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) rotateY(${(-a).toFixed(4)}rad)`;
      el.style.opacity = vis ? Math.min(1, (maxA - Math.abs(a)) / 0.25).toFixed(3) : 0;
      el.style.pointerEvents = vis ? "" : "none";         // keep painted (no visibility toggling → no flicker)
      el.dataset.a = a;
    });
  }

  let raf = 0, last = performance.now(), onScreen = true;
  function tick(t) {
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    target = paused ? 0 : hoverSlow ? 0.35 : 1;           // ~60 px/s cruising
    speed += (target - speed) * Math.min(1, dt * 3);
    offset += speed * 60 * dt;
    place();
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && onScreen && !document.hidden && !reduce) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  layout(); offset = L / 2 - spacing * 0.5; place();
  new ResizeObserver(() => { layout(); place(); }).observe(stage);
  let entered = false;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && !entered) {                 // entrance: wall rises in while the cards sweep past fast, then settle
      entered = true;
      whenReady.then(() => { stage.classList.add("is-in"); if (!reduce) speed = 14; });
    }
    onScreen ? start() : stop();
  }, { threshold: 0.2 }).observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  stage.addEventListener("pointerenter", () => (hoverSlow = true));
  stage.addEventListener("pointerleave", () => (hoverSlow = false));
  start();

  /* ---------- flip & pop ---------- */
  const pop = document.createElement("div");
  pop.className = "work-pop";
  pop.innerHTML = `<div class="wp-backdrop" data-close></div>
    <div class="wp-card" role="dialog" aria-modal="true" aria-labelledby="wpTitle">
      <div class="wp-inner">
        <div class="wp-face wp-front"><img alt=""></div>
        <div class="wp-face wp-back">
          <div class="wp-media"><img alt=""></div>
          <div class="wp-body">
            <button class="wp-close" data-close aria-label="Close">${icon("close")}</button>
            <span class="wp-tag"></span>
            <h3 id="wpTitle"></h3>
            <p class="wp-place"></p>
            <p class="wp-text"></p>
            <ul class="wp-systems"></ul>
            <div class="wp-actions"></div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(pop);
  const wpCard = pop.querySelector(".wp-card"), wpInner = pop.querySelector(".wp-inner");
  let lastFocus = null, anim = null, busy = false;

  function finalRect() {
    const vw = innerWidth, vh = innerHeight, narrow = vw < 760;
    const w = Math.min(narrow ? vw - 24 : 920, vw - 32), h = Math.min(narrow ? vh - 40 : 540, vh - 48);
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  }
  const DUR = reduce ? 1 : 720, EASE = "cubic-bezier(.2,.75,.2,1)";

  function open(i) {
    if (busy || openIdx >= 0) return;
    busy = true; paused = true; openIdx = i; lastFocus = document.activeElement;
    const card = cards[i], w = items[i];
    const from = card.getBoundingClientRect(), to = finalRect();
    const a = parseFloat(card.dataset.a) || 0;
    pop.classList.toggle("is-photo", !!w.photo);
    pop.querySelectorAll(".wp-front img, .wp-media img").forEach((im) => { im.src = img(w.img); im.alt = w.title; });
    pop.querySelector(".wp-tag").textContent = w.tag;
    pop.querySelector("#wpTitle").textContent = w.title;
    pop.querySelector(".wp-place").innerHTML = `${icon("pin")}${esc(w.place)}`;
    pop.querySelector(".wp-text").textContent = w.text;
    pop.querySelector(".wp-systems").innerHTML = w.systems.map((s) => `<li>${icon("check")}${esc(s)}</li>`).join("");
    pop.querySelector(".wp-actions").innerHTML =
      `<a class="btn btn-primary btn-sm" href="${w.cat ? UI.catUrl(w.cat) : "products.html"}">View products</a>` +
      `<a class="btn btn-ghost btn-sm" href="contact.html#enquiry">Get a quote</a>`;
    card.classList.add("is-away");
    pop.classList.add("open");
    document.body.classList.add("lock");
    const kf = (r) => ({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    anim = [
      wpCard.animate([kf(from), kf(to)], { duration: DUR, easing: EASE, fill: "forwards" }),
      wpInner.animate([{ transform: `rotateY(${-a}rad)` }, { transform: "rotateY(180deg)" }], { duration: DUR, easing: EASE, fill: "forwards" })
    ];
    pop.classList.add("is-in");
    anim[0].finished.then(() => { busy = false; pop.querySelector(".wp-close").focus(); });
  }

  function close() {
    if (busy || openIdx < 0) return;
    busy = true;
    const i = openIdx, card = cards[i];
    place();                                                    // make sure its slot is current
    const to = card.getBoundingClientRect(), from = wpCard.getBoundingClientRect();
    const a = parseFloat(card.dataset.a) || 0;
    const kf = (r) => ({ left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
    anim.forEach((x) => x.cancel());
    pop.classList.remove("is-in");
    const back = [
      wpCard.animate([kf(from), kf(to)], { duration: DUR * 0.85, easing: EASE, fill: "forwards" }),
      wpInner.animate([{ transform: "rotateY(180deg)" }, { transform: `rotateY(${-a}rad)` }], { duration: DUR * 0.85, easing: EASE, fill: "forwards" })
    ];
    back[0].finished.then(() => {
      card.classList.remove("is-away");
      pop.classList.remove("open");
      back.forEach((x) => x.cancel());
      document.body.classList.remove("lock");
      openIdx = -1; paused = false; busy = false;
      lastFocus && lastFocus.focus({ preventScroll: true });
    });
  }

  ring.addEventListener("click", (e) => { const c = e.target.closest(".work-card"); if (c) open(+c.dataset.i); });
  pop.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
})();
