/* Products page: category tabs, search, product grid and detail modal.
   Deep links: products.html?cat=<category-id>  ·  products.html#p-<product-id> */
(function () {
  "use strict";
  const { img, esc, icon, waLink } = window.UI;
  const S = window.SITE, CATS = window.CATEGORIES, PRODS = window.PRODUCTS;
  const byCat = Object.fromEntries(CATS.map((c) => [c.id, c]));
  const $ = (id) => document.getElementById(id);

  const params = new URLSearchParams(location.search);
  let current = byCat[params.get("cat")] ? params.get("cat") : "all";
  let query = "";

  /* Tabs */
  const tabs = [{ id: "all", name: "All products", count: PRODS.length }, ...CATS];
  $("catTabs").innerHTML = tabs.map((t) => `<button class="cat-tab" role="tab" data-id="${t.id}">${esc(t.name)}<span>${t.count}</span></button>`).join("");
  $("catTabs").addEventListener("click", (e) => {
    const b = e.target.closest(".cat-tab");
    if (!b) return;
    current = b.dataset.id;
    const u = new URL(location.href);
    current === "all" ? u.searchParams.delete("cat") : u.searchParams.set("cat", current);
    history.replaceState(null, "", u);
    render();
  });
  $("search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });

  const shortTags = (p) => {
    const want = /tonnage|capacity|model number|^model$|compressor|refrigerant|star/i;
    return p.specs.filter(([k]) => want.test(k)).slice(0, 2).map(([, v]) => v.replace(/^Available in /i, "").split(",").slice(0, 3).join(", "));
  };
  const matches = (p) => !query || (p.name + " " + p.specs.map((s) => s.join(" ")).join(" ")).toLowerCase().includes(query);

  function render() {
    $("catTabs").querySelectorAll(".cat-tab").forEach((b) => {
      const on = b.dataset.id === current;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
      if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    const cat = byCat[current];
    $("catTitle").textContent = cat ? cat.name : "All products";
    $("catDesc").textContent = cat ? `${cat.short} ${cat.series}` : "Every Hitachi system we supply and install, from homes to industry.";
    const list = PRODS.filter((p) => (current === "all" || p.cat === current) && matches(p));
    $("resultCount").textContent = `${list.length} product${list.length === 1 ? "" : "s"}`;
    $("empty").hidden = list.length > 0;
    $("prodGrid").innerHTML = list.map((p) => `
      <button class="prod-card reveal" data-id="${p.id}" aria-label="View details: ${esc(p.name)}">
        <div class="prod-media">
          ${p.images.length ? `<img src="${img(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : `<span class="cat-icon">${icon("snow")}</span>`}
          ${p.images.length > 1 ? `<span class="more">+${p.images.length - 1} photos</span>` : ""}
        </div>
        <div class="prod-body">
          <span class="cat-count">${esc(byCat[p.cat].name)}</span>
          <h3>${esc(p.name)}</h3>
          <div class="prod-tags">${shortTags(p).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
          <div class="prod-foot"><span class="price">${p.price ? esc(p.price) : "Price on request"}</span><span class="view">Details →</span></div>
        </div>
      </button>`).join("");
    window.observeReveal($("prodGrid"));
  }

  /* Modal */
  const modal = $("prodModal");
  let lastFocus = null;
  function open(id) {
    const p = PRODS.find((x) => x.id === id);
    if (!p) return;
    lastFocus = document.activeElement;
    const setMain = (i) => {
      $("mMain").innerHTML = p.images.length ? `<img src="${img(p.images[i])}" alt="${esc(p.name)}">` : `<span class="cat-icon" style="width:140px;height:140px">${icon("snow")}</span>`;
      $("mThumbs").querySelectorAll("button").forEach((b, k) => b.classList.toggle("active", k === i));
    };
    $("mThumbs").innerHTML = p.images.length > 1 ? p.images.map((src, i) => `<button aria-label="Photo ${i + 1}"><img src="${img(src)}" alt=""></button>`).join("") : "";
    $("mThumbs").querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => setMain(i)));
    setMain(0);

    const enquiry = `Hello Yamini Enterprises, I'm interested in the ${p.name}. Please share the price and availability.`;
    $("mInfo").innerHTML = `
      <span class="cat-count">${esc(byCat[p.cat].name)}</span>
      <h2 id="mTitle">${esc(p.name)}</h2>
      <div class="modal-price">${icon("rupee")} ${p.price ? esc(p.price) : "Price on request: ask for today's best price"}</div>
      ${p.specs.length ? `<table class="spec-table"><tbody>${p.specs.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : `<p style="color:var(--muted)">${window.UI.phText("Product description & specifications")}</p>`}
      ${p.features.map((g) => `<div class="feature-group">${g.title ? `<h4>${esc(g.title)}</h4>` : ""}<ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}
      ${p.video ? `<p><a class="link-arrow" href="https://www.youtube.com/watch?v=${p.video}" target="_blank" rel="noopener">Watch product video ${icon("arrow")}</a></p>` : ""}
      <div class="modal-actions">
        <a class="btn btn-wa" href="${waLink(enquiry)}" target="_blank" rel="noopener">${window.WA_SVG.replace("<svg", '<svg style="width:18px;height:18px"')} Enquire on WhatsApp</a>
        <a class="btn btn-outline" href="tel:${S.phone.tel}">${icon("phone")} Call</a>
        <a class="btn btn-outline" href="contact.html?product=${encodeURIComponent(p.name)}#enquiry">Request quote</a>
      </div>`;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("lock");
    history.replaceState(null, "", `#p-${p.id}`);
    modal.querySelector(".modal-close").focus();
  }
  function close() {
    if (!modal.classList.contains("open")) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lock");
    history.replaceState(null, "", location.pathname + location.search);
    lastFocus && lastFocus.focus();
  }
  $("prodGrid").addEventListener("click", (e) => { const c = e.target.closest(".prod-card"); if (c) open(c.dataset.id); });
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  render();
  const m = location.hash.match(/^#p-(\d+)/);
  if (m) {
    const p = PRODS.find((x) => x.id === m[1]);
    if (p && current !== "all" && p.cat !== current) { current = p.cat; render(); }
    open(m[1]);
  }
})();
