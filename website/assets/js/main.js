/* =====================================================================
   Shared behaviour for every page: header/footer, data binding,
   placeholders, menus, animations, enquiry → WhatsApp.
   Edit company details in site-config.js, not here.
   ===================================================================== */
(function () {
  "use strict";
  const S = window.SITE;
  const CATS = window.CATEGORIES || [];
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Icons (inline SVG, stroke style) ---------- */
  const P = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    up: '<path d="m18 15-6-6-6 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    truck: '<path d="M10 17h4V5H2v12h3"/><path d="M14 8h4l4 4v5h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12M6 14h12"/><rect x="6" y="10" width="12" height="12"/>',
    scale: '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    rupee: '<path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c6.67 0 6.67-10 0-10"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
    ruler: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"/>',
    snow: '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
    office: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4M2 7h20M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
    hotel: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M12 4v6M2 18h20"/>',
    hospital: '<path d="M12 6v4M14 14h-4M14 18h-4M14 8h-4"/><path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2"/><path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18"/>',
    factory: '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1M12 18h1M7 18h1"/>',
    star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>',
    headset: '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    youtube: '<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
    linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/>',
    quote: '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H4c-1.25 0-2 .75-2 1.97V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .01-1 1.03V20c0 1 0 1 1 1z"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;
  const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 12 2.2c2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8M20.5 3.5A11.8 11.8 0 0 0 12 0C5.5 0 .1 5.3.1 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.8 1 3.7 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.4"/></svg>';
  window.ICON = icon;
  window.WA_SVG = WA_SVG;

  const img = (p) => S.imgBase + p;
  const phText = (label) => `<span class="ph-text">[${esc(label)}]</span>`;
  const phBox = (label, hint, cls = "") => `<div class="ph ${cls}">${icon("image")}<span>${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ""}</div>`;
  const waLink = (msg) => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}`;
  const years = new Date().getFullYear() - S.established;
  window.UI = { img, phText, phBox, waLink, esc, icon, years };

  if (!S.showPlaceholderHints) document.documentElement.classList.add("no-hints");

  /* ---------- Header ---------- */
  const page = document.body.dataset.page || "";
  const nav = [
    ["home", "index.html", "Home"],
    ["products", "products.html", "Products", true],
    ["services", "services.html", "Services"],
    ["about", "about.html", "About Us"],
    ["contact", "contact.html", "Contact"]
  ];
  const markHTML = S.logo
    ? `<img class="logo-emblem" src="${img(S.logo)}" alt="" width="56" height="56">`
    : `<span class="logo-mark">Y</span>`;
  const line = esc(S.headerLine || "Jodhpur");
  // Header (white): emblem + wordmark image + red line
  const logoHTML = markHTML + (S.wordmark
    ? `<span class="logo-text"><img class="logo-wordmark" src="${img(S.wordmark)}" alt="${esc(S.name)}"><span>${line}</span></span>`
    : `<span class="logo-text"><strong>${esc(S.name)}</strong><span>${line}</span></span>`);
  // Footer (dark): the black wordmark wouldn't show, so use live text
  const footerLogoHTML = markHTML + `<span class="logo-text"><strong>${esc(S.name)}</strong><span>${line}</span></span>`;

  const megaHTML = `
    <div class="mega" role="region" aria-label="Product categories">
      <div class="mega-inner">
        <div>
          <div class="mega-title">Hitachi air conditioning range</div>
          <div class="mega-grid">
            ${CATS.map((c) => `
              <a class="mega-item" href="products.html?cat=${c.id}">
                ${c.cover ? `<img src="${img(c.cover)}" alt="" loading="lazy">` : `<span class="cat-icon cat-icon--sm">${icon("snow")}</span>`}
                <span><strong>${esc(c.name)}</strong><small>${c.count} model${c.count === 1 ? "" : "s"} · ${esc(c.short)}</small></span>
              </a>`).join("")}
          </div>
          <p style="margin:18px 10px 0"><a class="link-arrow" href="products.html">View all products ${icon("arrow")}</a></p>
        </div>
        <div class="mega-promo">
          <span class="tag">Need help choosing?</span>
          <h4>Not sure which AC fits your space?</h4>
          <p>From a single room to a hotel or hospital, our team will recommend the right Hitachi system for your requirement.</p>
          <a class="btn btn-primary btn-sm" href="contact.html#enquiry">Talk to our team</a>
        </div>
      </div>
    </div>`;

  const headerHTML = `
    <header class="header" id="header">
      <div class="header-tab">
        <a class="logo" href="index.html" aria-label="${esc(S.name)} home">${logoHTML}</a>
      </div>
      <div class="header-pill">
        <nav aria-label="Main">
          <ul class="nav" id="nav">
            ${nav.map(([id, href, label, mega]) => mega
              ? `<li class="has-mega"><button class="nav-link ${page === id ? "active" : ""}" aria-expanded="false" data-href="${href}">${label} ${icon("chevron")}</button>${megaHTML}</li>`
              : `<li><a class="nav-link ${page === id ? "active" : ""}" href="${href}">${label}</a></li>`).join("")}
            <li class="nav-mobile-cta" style="display:none">
              <a class="btn btn-primary" href="contact.html#enquiry">Get a Free Quote</a>
              <a class="btn btn-outline" href="tel:${S.phone.tel}">${icon("phone")} ${esc(S.phone.display)}</a>
            </li>
          </ul>
        </nav>
        <a class="btn btn-primary btn-sm header-quote" href="contact.html#enquiry">Get a Free Quote</a>
        <button class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false">${icon("menu")}</button>
      </div>
    </header>`;

  /* ---------- Footer ---------- */
  // Social links render only when a real URL is set in site-config.js
  const socials = ["facebook", "instagram", "youtube", "linkedin"].filter((k) => S.social[k])
    .map((k) => `<a href="${S.social[k]}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`).join("");
  const navLinks = [["index.html", "Home"], ["products.html", "Products"], ["services.html", "Services"], ["about.html", "About Us"], ["contact.html", "Contact"]];

  const footerHTML = `
    <footer class="footer">
      <div class="footer-shell">
        <div class="container">
          <!-- Brand row -->
          <div class="f-brand">
            <div>
              <p class="f-name">${esc(S.name)}</p>
              <p class="f-tagline">${esc(S.tagline)}.</p>
            </div>
            <div class="f-actions">
              <a class="btn btn-primary" href="contact.html#enquiry">Get a quote</a>
              <a class="f-call" href="tel:${S.phone.tel}"><small>Call us</small>${esc(S.phone.display)}</a>
            </div>
          </div>

          <!-- Columns -->
          <div class="f-grid">
            <div class="f-col f-dealer">
              <h4>Authorised dealer</h4>
              ${S.partnerLogo ? `<div class="f-partner"><img src="${img(S.partnerLogo)}" alt="Bosch, Hitachi Cooling and Heating" loading="lazy"></div>` : ""}
              <p class="f-cred">${esc(S.authorisation)}</p>
              <p class="f-cert"><span class="f-dot"></span>${esc(S.certification)}</p>
            </div>
            <div class="f-col">
              <h4>Explore</h4>
              <ul>${navLinks.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul>
            </div>
            <div class="f-col">
              <h4>Products</h4>
              <ul>${CATS.filter((c) => c.cover).map((c) => `<li><a href="products.html?cat=${c.id}">${esc(c.name)}</a></li>`).join("")}</ul>
            </div>
            <div class="f-col f-contact">
              <h4>Contact</h4>
              <dl>
                <dt>Address</dt><dd>${esc(S.address.line1)},<br>${esc(S.address.line2)}</dd>
                <dt>Mobile</dt><dd>${S.phones.map((x) => `<a href="tel:${x.tel}">${esc(x.display)}</a>`).join("<br>")}</dd>
                <dt>Email</dt><dd><a href="mailto:${S.email}">${esc(S.email)}</a></dd>
                <dt>Hours</dt><dd>${S.hours ? S.hours.map((h) => esc(h.join(": "))).join("<br>") : phText("Business hours")}</dd>
              </dl>
              ${socials ? `<div class="f-social">${socials}</div>` : ""}
            </div>
          </div>

          <!-- Bottom bar -->
          <div class="f-bottom">
            <span>© ${new Date().getFullYear()} ${esc(S.name)} · GSTIN ${esc(S.gst)}</span>
            <span>Bosch and Hitachi are trademarks of their respective owners.</span>
            <button class="to-top" id="toTop">Back to top ${icon("up")}</button>
          </div>
        </div>
        <div class="f-watermark" aria-hidden="true">YAMINI</div>
      </div>
    </footer>
    <div class="fab">
      <a class="wa" href="${waLink("Hello Yamini Enterprises, I'd like to know more about Hitachi air conditioners.")}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${WA_SVG}</a>
      <a class="call" href="tel:${S.phone.tel}" aria-label="Call us">${icon("phone")}</a>
    </div>
    <nav class="mobile-bar" aria-label="Quick actions">
      <a href="tel:${S.phone.tel}">${icon("phone")}Call</a>
      <a class="wa" href="${waLink("Hello Yamini Enterprises, I'd like to know more about Hitachi air conditioners.")}" target="_blank" rel="noopener">${WA_SVG}WhatsApp</a>
      <a class="q" href="contact.html#enquiry">${icon("clipboard")}Get Quote</a>
    </nav>`;

  const h = $("#site-header"), f = $("#site-footer");
  if (h) h.outerHTML = headerHTML;
  if (f) f.outerHTML = footerHTML;

  /* ---------- Data binding: <span data-bind="phone"></span> ---------- */
  const binders = {
    name: () => esc(S.name),
    owner: () => esc(S.owner),
    years: () => String(years),
    established: () => String(S.established),
    phone: () => `<a href="tel:${S.phone.tel}">${esc(S.phone.display)}</a>`,
    phones: () => S.phones.map((x) => `<a href="tel:${x.tel}">${esc(x.display)}</a>`).join("<br>"),
    addressArea: () => esc(S.address.area),
    authorisation: () => esc(S.authorisation),
    certification: () => esc(S.certification),
    email: () => `<a href="mailto:${S.email}">${esc(S.email)}</a>`,
    address: () => `${esc(S.address.line1)}, ${esc(S.address.line2)}`,
    gst: () => esc(S.gst),
    tagline: () => esc(S.tagline),
    brandPartner: () => esc(S.brandPartner),
    overview: () => esc(S.overview),
    industry: () => esc(S.industry),
    category: () => esc(S.category),
    hours: () => (S.hours ? S.hours.map((x) => esc(x.join(": "))).join("<br>") : phText("Business hours")),
    serviceArea: () => esc(S.serviceArea)
  };
  $$("[data-bind]").forEach((el) => { const fn = binders[el.dataset.bind]; if (fn) el.innerHTML = fn(); });
  $$("[data-href-tel]").forEach((el) => (el.href = `tel:${S.phone.tel}`));
  $$("[data-href-mail]").forEach((el) => (el.href = `mailto:${S.email}`));
  $$("[data-href-wa]").forEach((el) => (el.href = waLink(el.dataset.hrefWa || "Hello Yamini Enterprises")));

  /* ---------- Image placeholders: <div class="ph" data-ph="Label" data-hint="1200×800"> ---------- */
  $$(".ph[data-ph]").forEach((el) => {
    el.innerHTML = `${icon("image")}<span>${esc(el.dataset.ph)}</span>${el.dataset.hint ? `<small>${esc(el.dataset.hint)}</small>` : ""}`;
  });
  $$("img[data-src]").forEach((el) => (el.src = img(el.dataset.src)));
  $$("[data-icon]").forEach((el) => (el.innerHTML = icon(el.dataset.icon) + el.innerHTML));

  /* ---------- Header behaviour ---------- */
  const header = $("#header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const navEl = $("#nav"), toggle = $("#menuToggle");
  const mq = window.matchMedia("(max-width: 960px)");
  toggle && toggle.addEventListener("click", () => {
    const open = navEl.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
    toggle.innerHTML = icon(open ? "close" : "menu");
    document.body.classList.toggle("lock", open);
  });

  $$(".has-mega").forEach((li) => {
    const btn = $(".nav-link", li);
    let t;
    const set = (open) => { li.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); };
    btn.addEventListener("click", () => {
      if (!mq.matches && li.classList.contains("open")) { location.href = btn.dataset.href; return; }
      set(!li.classList.contains("open"));
    });
    li.addEventListener("mouseenter", () => { if (!mq.matches) { clearTimeout(t); set(true); } });
    li.addEventListener("mouseleave", () => { if (!mq.matches) t = setTimeout(() => set(false), 150); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    document.addEventListener("click", (e) => { if (!mq.matches && !li.contains(e.target)) set(false); });
  });

  const toTop = $("#toTop");
  toTop && toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------- Reveal on scroll ---------- */
  const io = "IntersectionObserver" in window && new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  window.observeReveal = (root = document) => $$(".reveal:not(.in)", root).forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  window.observeReveal();

  /* ---------- Counters: <b data-count="17" data-suffix="+"> ---------- */
  const countIO = "IntersectionObserver" in window && new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
      const t0 = performance.now(), dur = 1400;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.innerHTML = `${v}<em>${suf}</em>`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => {
    if (el.dataset.count === "years") el.dataset.count = years;
    el.innerHTML = `${el.dataset.count}<em>${el.dataset.suffix || ""}</em>`;
    countIO && countIO.observe(el);
  });

  /* ---------- Enquiry forms → WhatsApp / email (no backend needed) ---------- */
  $$("form[data-enquiry]").forEach((form) => {
    const build = () => {
      const d = new FormData(form);
      const lines = ["New enquiry from website"];
      for (const [k, v] of d.entries()) if (String(v).trim()) lines.push(`${k}: ${v}`);
      return lines.join("\n");
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      window.open(waLink(build()), "_blank", "noopener");
    });
    const mailBtn = $("[data-send-email]", form);
    mailBtn && mailBtn.addEventListener("click", () => {
      if (!form.reportValidity()) return;
      location.href = `mailto:${S.email}?subject=${encodeURIComponent("Website enquiry")}&body=${encodeURIComponent(build())}`;
    });
  });

  /* ---------- Prefill enquiry from ?product= ---------- */
  const qp = new URLSearchParams(location.search);
  const msg = $("form[data-enquiry] textarea");
  if (msg && qp.get("product")) msg.value = `I'm interested in: ${qp.get("product")}`;

  /* ---------- Lightbox: <a data-lightbox href="..." data-caption=""> ---------- */
  const lb = document.createElement("div");
  lb.className = "modal lightbox";
  lb.innerHTML = `<div class="modal-backdrop" data-close></div><figure class="modal-dialog" style="margin:0"><button class="modal-close" data-close aria-label="Close">${icon("close")}</button><img alt=""><figcaption></figcaption></figure>`;
  document.body.appendChild(lb);
  const closeLb = () => { lb.classList.remove("open"); document.body.classList.remove("lock"); };
  lb.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-lightbox]");
    if (!a) return;
    e.preventDefault();
    $("img", lb).src = a.href;
    $("figcaption", lb).textContent = a.dataset.caption || "";
    lb.classList.add("open");
    document.body.classList.add("lock");
  });

  /* ---------- Small helper used by pages ---------- */
  window.renderGallery = (el, items) => {
    el.innerHTML = items.map(([src, cap]) => `<a href="${img(src)}" data-lightbox data-caption="${esc(cap)}"><img src="${img(src)}" alt="${esc(cap)}" loading="lazy"></a>`).join("");
  };
  window.GALLERY = [
    ["helplinesearch/helplinesearch-2.jpg", "Hitachi air conditioners on display"],
    ["gallery/showroom-6.png", "Split AC display wall and customer desk"],
    ["helplinesearch/helplinesearch-3.jpg", "Latest Hitachi split ACs"],
    ["gallery/showroom-5.png", "Hitachi refrigerators on display"],
    ["gallery/showroom-3.png", "Our team at the Hitachi counter"],
    ["gallery/showroom-2.png", "Hitachi air conditioner display stand"],
    ["gallery/showroom-1.png", "Wall-mounted split ACs, ready to demo"],
    ["helplinesearch/helplinesearch-4.jpg", "Hitachi display wall"],
    ["gallery/showroom-4.png", "Compare models side by side"]
  ];
})();
