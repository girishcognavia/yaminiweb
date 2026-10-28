/* =====================================================================
   Hero 3D: "One building, every kind of cooling"
   An architectural cutaway of a 4-storey building air-conditioned end to
   end with Hitachi systems: what Yamini Enterprises supplies and services,
   from a single room to large-scale projects.

     Roof  VRF outdoor units + chiller (fans spin)
     04    Hospitals         VRF indoor units
     03    Hotels & resorts  Ducted AC
     02    Offices           Ceiling cassettes
     01    Homes             Wall-mounted splits

   Refrigerant pipes run from the roof to every floor with flowing pulses;
   each indoor unit blows cool air into its room.

   Interaction: pointer turns the building; hover a floor (or its label)
   to highlight it; click to open that space's products. Idle: slow sway.
   Needs THREE r147 (classic) + RoundedBoxGeometry + RoomEnvironment.
   No WebGL: the 2D vortex (hero-vortex.js) stays as the fallback.
   ===================================================================== */
(function () {
  "use strict";
  const host = document.querySelector(".vortex");
  const hero = document.querySelector(".hero");
  if (!host || !hero || !window.THREE) return;
  const T = window.THREE;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  window.HeroVortex2D && window.HeroVortex2D.disable();
  host.classList.add("is-3d", "is-building");

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  renderer.setPixelRatio(DPR);
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.className = "hero3d-canvas";
  host.appendChild(renderer.domElement);

  /* ---------- Scene ---------- */
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(28, 1.25, 0.1, 100);
  const LOOK = new T.Vector3(0, 0.15, 0);
  camera.position.set(0, 2.2, 12.5);
  camera.lookAt(LOOK);

  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
  scene.add(new T.HemisphereLight(0xdff2ff, 0x0b1a2b, 0.3));
  const key = new T.DirectionalLight(0xffffff, 1.0); key.position.set(5, 8, 6); scene.add(key);
  const rim = new T.DirectionalLight(0x78d6ff, 1.2); rim.position.set(-6, 3, -4); scene.add(rim);

  const ENV = 0.5;
  const M = {
    slab: new T.MeshStandardMaterial({ color: 0x0f2338, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.15 }),
    white: new T.MeshPhysicalMaterial({ color: 0xf2f5f8, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: ENV }),
    unit: new T.MeshPhysicalMaterial({ color: 0xc9d3dd, roughness: 0.45, metalness: 0.1, envMapIntensity: ENV }),
    dark: new T.MeshStandardMaterial({ color: 0x14263a, roughness: 0.7 }),
    glass: new T.MeshPhysicalMaterial({ color: 0x8fd3f5, roughness: 0.1, transparent: true, opacity: 0.1, side: T.DoubleSide, depthWrite: false }),
    pipe: new T.MeshStandardMaterial({ color: 0x2a8fc0, emissive: 0x1fa2c7, emissiveIntensity: 0.55, roughness: 0.4 }),
    red: new T.MeshStandardMaterial({ color: 0xd50f25, emissive: 0xd50f25, emissiveIntensity: 0.6 })
  };

  /* ---------- Building ---------- */
  const W = 3.6, D = 2.5, FH = 0.95, NF = 4, SLAB = 0.08;
  const baseY = -(NF * FH) / 2 - 0.3;
  const building = new T.Group();
  building.rotation.y = -0.62;
  scene.add(building);

  const floorY = (i) => baseY + i * FH;               // bottom of floor i (0..4)
  const FLOORS = [
    { n: "01", t: "Homes", s: "Wall-mounted splits", cat: "inverter-split-acs", kind: "split" },
    { n: "02", t: "Offices", s: "Ceiling cassettes", cat: "light-commercial-air-conditioners", kind: "cassette" },
    { n: "03", t: "Hotels & resorts", s: "Ducted AC", cat: "ductable-air-conditioners", kind: "duct" },
    { n: "04", t: "Hospitals", s: "VRF systems", cat: "vrf-systems", kind: "vrf" }
  ];
  const ROOF = { n: "", t: "Rooftop plant", s: "VRF outdoor units & chillers", cat: "hitachi-chillers" };

  const edgeMat = (c, o) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: o });
  const addEdges = (mesh, mat) => { const e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), mat); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); mesh.parent.add(e); return e; };

  // Slabs (floors + roof), corner columns
  for (let i = 0; i <= NF; i++) {
    const s = new T.Mesh(new T.BoxGeometry(W + 0.12, SLAB, D + 0.12), M.slab);
    s.position.y = floorY(i);
    building.add(s);
    addEdges(s, edgeMat(0x9fdcff, 0.6));
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const c = new T.Mesh(new T.BoxGeometry(0.07, NF * FH, 0.07), M.white);
    c.position.set(x * W / 2, baseY + (NF * FH) / 2, z * D / 2);
    building.add(c);
  }

  // Per floor: glass walls, frame, hit volume, accent strip, indoor units, air emitters
  const floorData = [];
  const emitters = [];
  FLOORS.forEach((f, i) => {
    const y0 = floorY(i) + SLAB / 2, y1 = floorY(i + 1) - SLAB / 2, h = y1 - y0, ym = (y0 + y1) / 2;
    const back = new T.Mesh(new T.PlaneGeometry(W, h), M.glass.clone());
    back.position.set(0, ym, -D / 2); building.add(back);
    const side = new T.Mesh(new T.PlaneGeometry(D, h), M.glass.clone());
    side.rotation.y = Math.PI / 2; side.position.set(-W / 2, ym, 0); building.add(side);
    const frame = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(W, h, D)), edgeMat(0x78d6ff, 0.18));
    frame.position.y = ym; building.add(frame);
    const hit = new T.Mesh(new T.BoxGeometry(W, h, D), new T.MeshBasicMaterial({ visible: false }));
    hit.position.y = ym; hit.userData.floor = i; building.add(hit);
    const accent = new T.Mesh(new T.BoxGeometry(W + 0.13, 0.018, 0.02), M.red.clone());
    accent.position.set(0, floorY(i) + SLAB / 2 + 0.002, D / 2 + 0.065);
    accent.material.transparent = true; accent.material.opacity = 0.35; accent.material.emissiveIntensity = 0.15;
    building.add(accent);

    const ceil = y1 - 0.02;
    if (f.kind === "split" || f.kind === "vrf") {
      for (const x of [-0.85, 0.85]) {
        const u = new T.Mesh(new T.RoundedBoxGeometry(0.95, 0.22, 0.16, 3, 0.05), M.white);
        u.position.set(x, ceil - 0.2, -D / 2 + 0.1); building.add(u);
        const stripe = new T.Mesh(new T.BoxGeometry(0.85, 0.012, 0.01), f.kind === "vrf" ? M.pipe : M.red);
        stripe.position.set(x, ceil - 0.26, -D / 2 + 0.185); building.add(stripe);
        emitters.push({ floor: i, pos: new T.Vector3(x, ceil - 0.3, -D / 2 + 0.2), dir: new T.Vector3(0, -0.55, 1), spread: 0.42 });
      }
    } else if (f.kind === "cassette") {
      for (const x of [-0.9, 0.9]) {
        const u = new T.Mesh(new T.BoxGeometry(0.62, 0.05, 0.62), M.white);
        u.position.set(x, ceil - 0.025, 0.05); building.add(u);
        const g = new T.Mesh(new T.BoxGeometry(0.34, 0.052, 0.34), M.dark);
        g.position.copy(u.position); building.add(g);
        emitters.push({ floor: i, pos: new T.Vector3(x, ceil - 0.06, 0.05), dir: new T.Vector3(0, -1, 0), spread: 0.32, radial: true });
      }
    } else if (f.kind === "duct") {
      const duct = new T.Mesh(new T.BoxGeometry(W - 0.5, 0.12, 0.28), M.unit);
      duct.position.set(0, ceil - 0.06, -0.35); building.add(duct);
      for (const x of [-1.1, 0, 1.1]) {
        const d = new T.Mesh(new T.BoxGeometry(0.34, 0.03, 0.22), M.dark);
        d.position.set(x, ceil - 0.135, -0.35); building.add(d);
        emitters.push({ floor: i, pos: new T.Vector3(x, ceil - 0.15, -0.3), dir: new T.Vector3(0, -1, 0.35), spread: 0.25 });
      }
    }
    floorData.push({ hit, back, side, frame, accent });
  });

  // Rooftop plant: 3 VRF outdoor units + 1 chiller; fans spin
  const roofY = floorY(NF) + SLAB / 2;
  const fans = [];
  function fan(x, y, z, r) {
    const ring = new T.Mesh(new T.CylinderGeometry(r, r, 0.02, 32), M.dark);
    ring.position.set(x, y, z); building.add(ring);
    const blades = new T.Group(); blades.position.set(x, y + 0.015, z);
    for (let k = 0; k < 3; k++) {
      const b = new T.Mesh(new T.BoxGeometry(r * 1.7, 0.01, r * 0.32), M.unit);
      b.rotation.y = (k * Math.PI * 2) / 3; blades.add(b);
    }
    building.add(blades); fans.push(blades);
  }
  for (const x of [-1.25, -0.6, 0.05]) {
    const u = new T.Mesh(new T.RoundedBoxGeometry(0.5, 0.62, 0.48, 3, 0.04), M.white);
    u.position.set(x, roofY + 0.31, -0.55); building.add(u);
    fan(x, roofY + 0.63, -0.55, 0.17);
  }
  const chiller = new T.Mesh(new T.RoundedBoxGeometry(1.15, 0.42, 0.7, 3, 0.04), M.unit);
  chiller.position.set(0.95, roofY + 0.21, 0.25); building.add(chiller);
  fan(0.68, roofY + 0.43, 0.25, 0.2);
  fan(1.22, roofY + 0.43, 0.25, 0.2);
  const roofHit = new T.Mesh(new T.BoxGeometry(W, 0.8, D), new T.MeshBasicMaterial({ visible: false }));
  roofHit.position.y = roofY + 0.4; roofHit.userData.floor = NF; building.add(roofHit);

  // Refrigerant pipes: riser at the back-right corner, a branch along each ceiling
  const pipeCurves = [];
  const riserX = W / 2 - 0.22, riserZ = -D / 2 + 0.22;
  pipeCurves.push(new T.CatmullRomCurve3([
    new T.Vector3(0.05, roofY + 0.05, -0.55), new T.Vector3(riserX, roofY + 0.05, -0.55),
    new T.Vector3(riserX, roofY + 0.04, riserZ), new T.Vector3(riserX, floorY(0) + 0.6, riserZ)
  ], false, "catmullrom", 0.05));
  for (let i = 0; i < NF; i++) {
    const y = floorY(i + 1) - SLAB / 2 - 0.05;
    pipeCurves.push(new T.CatmullRomCurve3([new T.Vector3(riserX, y, riserZ), new T.Vector3(-W / 2 + 0.3, y, riserZ)], false));
  }
  pipeCurves.forEach((c) => building.add(new T.Mesh(new T.TubeGeometry(c, 64, 0.022, 8, false), M.pipe)));

  // Ground: architectural grid + soft glow
  const grid = new T.GridHelper(14, 28, 0x1fa2c7, 0x1fa2c7);
  grid.material.transparent = true; grid.material.opacity = 0.09; grid.position.y = baseY - SLAB / 2 - 0.01;
  scene.add(grid);
  const glowCanvas = document.createElement("canvas"); glowCanvas.width = glowCanvas.height = 256;
  const gctx = glowCanvas.getContext("2d"), grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(120,214,255,0.55)"); grad.addColorStop(0.5, "rgba(31,162,199,0.15)"); grad.addColorStop(1, "rgba(31,162,199,0)");
  gctx.fillStyle = grad; gctx.fillRect(0, 0, 256, 256);
  const glow = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(glowCanvas), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = baseY - SLAB / 2; scene.add(glow);

  /* ---------- Particles: airflow + pipe pulses ---------- */
  const vert = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
    varying float vAlpha; varying vec3 vColor; uniform float uScale;
    void main() { vAlpha = aAlpha; vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`;
  const frag = `varying float vAlpha; varying vec3 vColor;
    void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vColor, a * a * vAlpha); }`;
  function points(n) {
    const g = new T.BufferGeometry();
    for (const [name, size] of [["position", 3], ["aColor", 3], ["aSize", 1], ["aAlpha", 1]])
      g.setAttribute(name, new T.BufferAttribute(new Float32Array(n * size), size));
    const m = new T.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false, blending: T.AdditiveBlending, uniforms: { uScale: { value: 300 } } });
    const p = new T.Points(g, m); p.frustumCulled = false; building.add(p);
    return { m, n, a: g.attributes };
  }
  const AIR_PER = coarse ? 70 : 120;
  const air = points(emitters.length * AIR_PER);
  const aLife = new Float32Array(air.n), aMax = new Float32Array(air.n), aVel = new Float32Array(air.n * 3), aEm = new Uint8Array(air.n);
  const PULSES = 7;
  const pulse = points(pipeCurves.length * PULSES);
  const pOff = Float32Array.from({ length: pulse.n }, () => Math.random());

  function spawnAir(k, warm) {
    const e = emitters[aEm[k]], p = air.a.position.array;
    p[k * 3] = e.pos.x + (Math.random() - 0.5) * (e.radial ? 0.3 : 0.8);
    p[k * 3 + 1] = e.pos.y;
    p[k * 3 + 2] = e.pos.z + (Math.random() - 0.5) * (e.radial ? 0.3 : 0.05);
    let vx = e.dir.x + (Math.random() - 0.5) * e.spread, vz = e.dir.z + (Math.random() - 0.5) * e.spread;
    if (e.radial) { const a = Math.random() * Math.PI * 2; vx = Math.cos(a) * 0.7; vz = Math.sin(a) * 0.7; }
    const sp = 0.35 + Math.random() * 0.3;
    aVel[k * 3] = vx * sp; aVel[k * 3 + 1] = e.dir.y * sp * (e.radial ? 0.6 : 1); aVel[k * 3 + 2] = vz * sp;
    aMax[k] = 1.2 + Math.random() * 0.9;
    aLife[k] = warm ? Math.random() * aMax[k] : 0;
  }
  for (let k = 0; k < air.n; k++) { aEm[k] = Math.floor(k / AIR_PER); spawnAir(k, true); }

  /* ---------- Floor labels (HTML, projected each frame) ---------- */
  const labelWrap = document.createElement("div");
  labelWrap.className = "bl-wrap";
  const allLabels = [...FLOORS, ROOF];
  labelWrap.innerHTML = allLabels.map((f, i) =>
    `<a class="bl" data-i="${i}" href="products.html?cat=${f.cat}"><span class="bl-n${f.n ? "" : " bl-n--roof"}">${f.n}</span><span class="bl-txt"><b>${f.t}</b><small>${f.s}</small></span></a>`).join("");
  host.appendChild(labelWrap);
  const labelEls = [...labelWrap.querySelectorAll(".bl")];
  const anchors = [...FLOORS.map((_, i) => new T.Vector3(W / 2 + 0.06, (floorY(i) + floorY(i + 1)) / 2, D / 2)), new T.Vector3(W / 2, roofY + 0.35, D / 2 - 0.4)];

  /* ---------- Interaction ---------- */
  let hover = -1, lastMove = -1e9, px = 0, py = 0;
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  const hits = [...floorData.map((f) => f.hit), roofHit];
  function pick(cx, cy) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(hits, false)[0];
    return h ? h.object.userData.floor : -1;
  }
  function setHover(i) {
    if (i === hover) return;
    hover = i;
    labelEls.forEach((el, k) => el.classList.toggle("is-active", k === i));
    renderer.domElement.style.cursor = i >= 0 ? "pointer" : "";
  }
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width) * 2 - 1;
    py = ((e.clientY - r.top) / r.height) * 2 - 1;
    lastMove = performance.now();
    if (!e.target.closest(".bl")) setHover(pick(e.clientX, e.clientY));
  }, { passive: true });
  hero.addEventListener("pointerleave", () => setHover(-1));
  renderer.domElement.addEventListener("click", (e) => {
    const f = pick(e.clientX, e.clientY);
    if (f >= 0) location.href = labelEls[f].href;
  });
  labelEls.forEach((el, i) => {
    el.addEventListener("pointerenter", () => setHover(i));
    el.addEventListener("focus", () => setHover(i));
    el.addEventListener("pointerleave", () => setHover(-1));
    el.addEventListener("blur", () => setHover(-1));
  });

  /* ---------- Animate ---------- */
  const tmp = new T.Vector3();
  const C_COOL = [0.55, 0.88, 1.0], C_HOT = [1.0, 0.35, 0.42];
  let time = 0, rotY = -0.62, rotX = 0;
  const ease = (cur, to, dt, k) => cur + (to - cur) * Math.min(1, dt * k);
  function step(dt) {
    time += dt;
    const idle = performance.now() - lastMove > 3000;
    rotY = ease(rotY, -0.62 + (idle ? Math.sin(time * 0.25) * 0.28 : px * 0.45), dt, 2.5);
    rotX = ease(rotX, idle ? 0 : py * 0.06, dt, 2.5);
    building.rotation.y = rotY;
    building.rotation.x = rotX;
    building.position.y = Math.sin(time * 0.8) * 0.04;
    fans.forEach((f, k) => (f.rotation.y += dt * (6 + k)));

    floorData.forEach((f, i) => {
      const on = hover === i;
      f.accent.material.emissiveIntensity = ease(f.accent.material.emissiveIntensity, on ? 1.4 : 0.15, dt, 8);
      f.accent.material.opacity = ease(f.accent.material.opacity, on ? 1 : 0.35, dt, 8);
      f.back.material.opacity = ease(f.back.material.opacity, on ? 0.22 : 0.1, dt, 8);
      f.side.material.opacity = f.back.material.opacity;
      f.frame.material.opacity = ease(f.frame.material.opacity, on ? 0.75 : 0.25, dt, 8);
      f.frame.material.color.setHex(on ? 0xff6b7a : 0x78d6ff);
    });

    // airflow from each indoor unit
    const p = air.a.position.array, c = air.a.aColor.array, s = air.a.aSize.array, al = air.a.aAlpha.array;
    for (let k = 0; k < air.n; k++) {
      aLife[k] += dt;
      if (aLife[k] >= aMax[k]) spawnAir(k, false);
      const e = emitters[aEm[k]], t = aLife[k] / aMax[k], k3 = k * 3;
      aVel[k3 + 1] *= Math.pow(0.6, dt);
      p[k3] += aVel[k3] * dt + Math.sin(time * 2 + k) * 0.02 * dt;
      p[k3 + 1] += aVel[k3 + 1] * dt;
      p[k3 + 2] += aVel[k3 + 2] * dt;
      const boost = hover === e.floor ? 1 : 0;
      c[k3] = C_COOL[0]; c[k3 + 1] = C_COOL[1]; c[k3 + 2] = C_COOL[2];
      s[k] = 1.6 + t * 3.2 + boost;
      al[k] = Math.min(1, t * 6) * (1 - t) * (0.45 + boost * 0.5);
    }
    // pulses travelling along the refrigerant pipes
    const pp = pulse.a.position.array, pc = pulse.a.aColor.array, ps = pulse.a.aSize.array, pa = pulse.a.aAlpha.array;
    for (let k = 0; k < pulse.n; k++) {
      const ci = Math.floor(k / PULSES), curve = pipeCurves[ci];
      const u = (pOff[k] + time * (ci === 0 ? 0.18 : 0.35)) % 1;
      curve.getPointAt(u, tmp);
      pp[k * 3] = tmp.x; pp[k * 3 + 1] = tmp.y; pp[k * 3 + 2] = tmp.z;
      const col = ci > 0 && hover === ci - 1 ? C_HOT : C_COOL;
      pc[k * 3] = col[0]; pc[k * 3 + 1] = col[1]; pc[k * 3 + 2] = col[2];
      ps[k] = 3.2; pa[k] = 0.9 * Math.sin(u * Math.PI);
    }
    for (const sys of [air, pulse]) for (const name in sys.a) sys.a[name].needsUpdate = true;
  }

  const proj = new T.Vector3();
  function placeLabels() {
    const r = host.getBoundingClientRect();
    building.updateMatrixWorld();
    anchors.forEach((a, i) => {
      proj.copy(a).applyMatrix4(building.matrixWorld).project(camera);
      const x = (proj.x * 0.5 + 0.5) * r.width, y = (-proj.y * 0.5 + 0.5) * r.height;
      labelEls[i].style.transform = `translate(${Math.round(x + 22)}px, ${Math.round(y)}px) translateY(-50%)`;
    });
  }

  /* ---------- Size, loop, visibility ---------- */
  function resize() {
    const r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    const narrow = camera.aspect < 1.1;      // pull back on narrow frames
    const shift = narrow ? 0.7 : 1.15;        // building sits left, labels on the right
    camera.position.set(shift, 4.6, narrow ? 16 : 10.6);   // elevated, isometric-style view
    LOOK.set(shift, -0.05, 0);
    camera.updateProjectionMatrix(); camera.lookAt(LOOK);
    const scale = r.height * DPR * 0.05;
    air.m.uniforms.uScale.value = scale; pulse.m.uniforms.uScale.value = scale;
  }
  resize();
  new ResizeObserver(resize).observe(host);

  let running = false, raf = 0, onScreen = true, last = performance.now();
  function loop(t) {
    const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
    step(dt); renderer.render(scene, camera); placeLabels();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!running && onScreen && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const hint = document.getElementById("heroHint");
  if (hint) hint.textContent = coarse ? "Tap a floor to explore" : "Hover a floor to explore";

  if (reduce) { for (let i = 0; i < 90; i++) step(1 / 60); renderer.render(scene, camera); placeLabels(); return; }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? start() : stop(); }).observe(host);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
})();
