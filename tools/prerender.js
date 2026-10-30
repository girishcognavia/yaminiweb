#!/usr/bin/env node
/* =====================================================================
   SEO + GEO pre-render for the static site.

   Search engines and especially AI crawlers (GPTBot, ClaudeBot,
   PerplexityBot…) often don't run JavaScript. This script writes the
   JS-rendered content straight into each HTML file so it's crawlable:

     - <head>: canonical, Open Graph / Twitter, geo tags, favicon, JSON-LD
     - #site-header / #site-footer: static nav + footer (main.js swaps in
       the interactive version on load)
     - [data-bind] fields: phone, address, email, etc.
     - index.html #catGrid, products.html #prodGrid: category / product lists
     - sitemap.xml, robots.txt, llms.txt

   Source of truth stays assets/js/site-config.js + products-data.js.
   Run after changing either:   node tools/prerender.js
   Safe to re-run (replaces its own marked blocks).
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE_URL = "https://yaminient.in";          // canonical origin (CNAME)
const TODAY = new Date().toISOString().slice(0, 10);

// ---- load site data exactly as the browser does ----
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["assets/js/site-config.js", "assets/js/products-data.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx);
const S = ctx.window.SITE, CATS = ctx.window.CATEGORIES, PRODS = ctx.window.PRODUCTS;
const byCat = Object.fromEntries(CATS.map((c) => [c.id, c]));

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const abs = (p) => `${SITE_URL}/${p.replace(/^\/+/, "")}`;
const img = (p) => S.imgBase + p;

/* ---------------- Catalogue URLs ----------------
   Every category with copy in catalog-content.js gets /products/<id>/, and
   every product with specs or photos gets /products/<cat>/<slug>.html.
   Products with neither (generic catalogue stubs) stay modal-only. */
const CONTENT = require("./catalog-content");
const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const displayName = (p) => p.name.replace(/\bACs\b/, "AC");          // "…Inverter Split ACs" → "…Split AC"
const CAT_PAGES = CATS.filter((c) => CONTENT[c.id]);
const CAT_URL = Object.fromEntries(CAT_PAGES.map((c) => [c.id, `products/${c.id}/`]));
const catHref = (id) => CAT_URL[id] || `products.html?cat=${id}`;
const PROD_URL = {};
{
  const used = new Set();
  for (const p of PRODS) {
    if (!CAT_URL[p.cat] || !(p.specs.length || p.images.length)) continue;
    let s = slugify(displayName(p));
    if (used.has(`${p.cat}/${s}`)) s += `-${p.id}`;
    used.add(`${p.cat}/${s}`);
    PROD_URL[p.id] = `products/${p.cat}/${s}.html`;
  }
}

const PAGES = [
  { file: "index.html", url: "/", name: "Home", priority: "1.0" },
  { file: "products.html", url: "/products.html", name: "Products", priority: "0.9" },
  { file: "services.html", url: "/services.html", name: "Services", priority: "0.8" },
  { file: "about.html", url: "/about.html", name: "About Us", priority: "0.7" },
  { file: "contact.html", url: "/contact.html", name: "Contact", priority: "0.8" }
];

/* ---------------- Structured data (JSON-LD) ---------------- */
const BIZ_ID = `${SITE_URL}/#business`;
const business = {
  "@type": ["HVACBusiness", "LocalBusiness"],
  "@id": BIZ_ID,
  name: S.name,
  legalName: S.name,
  // Other names the business appears under online (store signboard reads "HITACHI STUDIO")
  alternateName: ["Yamini Enterprises Jodhpur", "Yamini Enterprises Hitachi Studio", "Hitachi Studio Jodhpur"],
  description: `${S.tagline}. ${S.overview}`,
  slogan: S.headerLine,
  url: `${SITE_URL}/`,
  logo: abs(img(S.logo)),
  image: [abs(img(S.logo)), abs(img("gallery/showroom-6.png"))],
  telephone: S.phones.map((p) => p.tel),
  email: S.email,
  contactPoint: S.phones.map((p, i) => ({
    "@type": "ContactPoint", telephone: p.tel, contactType: i ? "customer service" : "sales",
    areaServed: "IN-RJ", availableLanguage: ["en", "hi"]
  })),
  currenciesAccepted: "INR",
  foundingDate: String(S.established),
  founder: { "@id": `${SITE_URL}/about.html#founder` },
  vatID: S.gst,
  address: {
    "@type": "PostalAddress",
    streetAddress: S.address.line1,
    addressLocality: "Jodhpur",
    addressRegion: "Rajasthan",
    postalCode: "342008",
    addressCountry: "IN"
  },
  hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.address.mapQuery)}`,
  areaServed: [
    { "@type": "City", name: "Jodhpur" },
    { "@type": "State", name: "Rajasthan" }
  ],
  brand: { "@type": "Brand", name: "Hitachi" },
  knowsAbout: ["HVAC", "Air conditioning", "Inverter split AC", "VRF systems", "Ductable AC", "Cassette AC", "Chillers", "AC installation", "AC maintenance (AMC)", "AC repair"],
  makesOffer: [
    "Hitachi air conditioner sales", "AC installation", "AC annual maintenance (AMC)", "AC repair and service", "Central AC / VRF / chiller projects"
  ].map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n, areaServed: "Jodhpur, Rajasthan" } })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Hitachi HVAC range",
    itemListElement: CATS.map((c) => ({
      "@type": "OfferCatalog", name: c.name, url: abs(catHref(c.id)), description: `${c.short} ${c.series}`
    }))
  },
  sameAs: [S.indiamart, ...Object.values(S.social).filter(Boolean)],
  ...(S.hours ? { openingHours: S.hours.map((h) => h.join(" ")) } : {})
};
const website = { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: S.name, publisher: { "@id": BIZ_ID }, inLanguage: "en-IN" };

function breadcrumb(page) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      ...(page.url === "/" ? [] : [{ "@type": "ListItem", position: 2, name: page.name, item: abs(page.url) }])
    ]
  };
}

function faqFromHtml(html) {
  const out = [];
  const re = /<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g;
  let m;
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  while ((m = re.exec(html))) out.push({ "@type": "Question", name: strip(m[1]), acceptedAnswer: { "@type": "Answer", text: strip(m[2]) } });
  return out;
}

function servicesFromHtml(html) {
  const out = [];
  const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  const re = /<div class="sv-body"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>(?:<ul>([\s\S]*?)<\/ul>)?/g;
  let m;
  while ((m = re.exec(html))) out.push({ name: strip(m[1]), desc: strip(m[2]), items: (m[3] || "").split(/<\/li>/).map(strip).filter(Boolean) });
  return out;
}

function pageGraph(page, html, meta) {
  const webpage = {
    "@type": { "/about.html": "AboutPage", "/contact.html": "ContactPage", "/products.html": "CollectionPage" }[page.url] || "WebPage",
    "@id": `${abs(page.url)}#webpage`, url: abs(page.url), name: meta.title, description: meta.desc,
    isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": BIZ_ID }, inLanguage: "en-IN"
  };
  const graph = [business, website, webpage, breadcrumb(page)];
  if (page.url === "/about.html") {
    graph.push({
      "@type": "Person", "@id": `${SITE_URL}/about.html#founder`, name: `${S.owner}`, honorificPrefix: "Mr.",
      jobTitle: "Founder & Proprietor", worksFor: { "@id": BIZ_ID },
      description: "Retired Indian Air Force serviceman with experience teaching military students; founded Yamini Enterprises in Jodhpur in 2009."
    });
  }
  if (page.url === "/services.html") {
    const faq = faqFromHtml(html);
    if (faq.length) graph.push({ "@type": "FAQPage", "@id": `${abs(page.url)}#faq`, mainEntity: faq });
    for (const sv of servicesFromHtml(html)) graph.push({
      "@type": "Service", name: sv.name, description: sv.desc, serviceType: sv.name,
      provider: { "@id": BIZ_ID }, brand: { "@type": "Brand", name: "Hitachi" },
      areaServed: [{ "@type": "City", name: "Jodhpur" }, { "@type": "State", name: "Rajasthan" }],
      ...(sv.items.length ? { hasOfferCatalog: { "@type": "OfferCatalog", name: sv.name, itemListElement: sv.items.map((n) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: n } })) } } : {})
    });
  }
  if (page.url === "/products.html") {
    graph.push({
      "@type": "ItemList", name: "Hitachi air conditioners at Yamini Enterprises", numberOfItems: PRODS.length,
      itemListElement: PRODS.map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "Product", name: displayName(p), url: abs(PROD_URL[p.id] || `products.html#p-${p.id}`), category: byCat[p.cat].name,
          brand: { "@type": "Brand", name: "Hitachi" },
          ...(p.images[0] ? { image: abs(img(p.images[0])) } : {}),
          ...(p.specs.length ? { additionalProperty: p.specs.slice(0, 6).map(([k, v]) => ({ "@type": "PropertyValue", name: k, value: v })) } : {})
        }
      }))
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/* ---------------- <head> block ---------------- */
function headBlock(page, html) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1].replace(/&amp;/g, "&");
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1].replace(/&amp;/g, "&");
  const meta = { title, desc };
  return seoBlock({ url: page.url, title, desc, graph: pageGraph(page, html, meta) });
}

// Shared <head> SEO block. ogImage: a site path; omitted → the 1200×630 brand cover.
function seoBlock({ url, title, desc, graph, ogType = "website", ogImage, ogAlt }) {
  const ld = JSON.stringify(graph).replace(/</g, "\\u003c");
  const image = abs(ogImage || "images/brand/og-cover.png");
  return `  <!-- SEO:START (generated by tools/prerender.js, do not edit by hand) -->
  <link rel="canonical" href="${abs(url)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="theme-color" content="#0b1a2b">
  <meta name="author" content="${esc(S.name)}">
  <meta name="geo.region" content="IN-RJ">
  <meta name="geo.placename" content="Jodhpur, Rajasthan">
  <link rel="icon" type="image/png" sizes="32x32" href="images/brand/favicon-32.png">
  <link rel="apple-touch-icon" href="images/brand/apple-touch-icon.png">
  <link rel="alternate" type="text/plain" title="LLM summary" href="${abs("llms.txt")}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="${esc(S.name)}">
  <meta property="og:locale" content="en_IN">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(url)}">
  <meta property="og:image" content="${image}">
${ogImage ? "" : `  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
`}  <meta property="og:image:alt" content="${esc(ogAlt || `${S.name}, exclusive Hitachi HVAC dealer in Jodhpur`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${image}">
  <script type="application/ld+json">${ld}</script>
  <!-- SEO:END -->`;
}

/* ---------------- Static header / footer ---------------- */
const NAV = PAGES.map((p) => [p.file === "index.html" ? "index.html" : p.file, p.name]);
function headerHtml(page) {
  return `<header class="header" id="header">
      <div class="header-tab"><a class="logo" href="index.html" aria-label="${esc(S.name)} home"><img class="logo-emblem" src="${img(S.logo)}" alt="" width="56" height="56"><span class="logo-text"><img class="logo-wordmark" src="${img(S.wordmark)}" alt="${esc(S.name)}"><span>${esc(S.headerLine)}</span></span></a></div>
      <div class="header-pill"><nav aria-label="Main"><ul class="nav">${NAV.map(([h, l]) => `<li><a class="nav-link${h === page.file ? " active" : ""}" href="${h}">${l}</a></li>`).join("")}</ul></nav><a class="btn btn-primary btn-sm header-quote" href="contact.html#enquiry">Get a Free Quote</a></div>
    </header>`;
}
function footerHtml() {
  return `<footer class="footer"><div class="footer-shell"><div class="container">
      <div class="f-brand"><div><p class="f-name">${esc(S.name)}</p><p class="f-tagline">${esc(S.tagline)}.</p></div>
        <div class="f-actions"><a class="btn btn-primary" href="contact.html#enquiry">Get a quote</a><a class="f-call" href="tel:${S.phone.tel}"><small>Call us</small>${esc(S.phone.display)}</a></div></div>
      <div class="f-grid">
        <div class="f-col f-dealer"><h4>Authorised dealer</h4><div class="f-partner"><img src="${img(S.partnerLogo)}" alt="Bosch, Hitachi Cooling and Heating"></div><p class="f-cred">${esc(S.authorisation)}</p><p class="f-cert"><span class="f-dot"></span>${esc(S.certification)}</p></div>
        <div class="f-col"><h4>Explore</h4><ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul></div>
        <div class="f-col"><h4>Products</h4><ul>${CATS.filter((c) => c.cover).map((c) => `<li><a href="${catHref(c.id)}">${esc(c.name)}</a></li>`).join("")}</ul></div>
        <div class="f-col f-contact"><h4>Contact</h4><address><dl>
          <dt>Address</dt><dd>${esc(S.address.line1)},<br>${esc(S.address.line2)}</dd>
          <dt>Mobile</dt><dd>${S.phones.map((x) => `<a href="tel:${x.tel}">${esc(x.display)}</a>`).join("<br>")}</dd>
          <dt>Email</dt><dd><a href="mailto:${S.email}">${esc(S.email)}</a></dd>
        </dl></address></div>
      </div>
      <div class="f-bottom"><span>© ${new Date().getFullYear()} ${esc(S.name)} · GSTIN ${esc(S.gst)}</span><span>Bosch and Hitachi are trademarks of their respective owners.</span></div>
    </div></div></footer>`;
}

/* ---------------- data-bind values (static copies) ---------------- */
const BIND = {
  name: esc(S.name), owner: esc(S.owner), established: String(S.established),
  years: String(new Date().getFullYear() - S.established),
  phone: `<a href="tel:${S.phone.tel}">${esc(S.phone.display)}</a>`,
  phones: S.phones.map((x) => `<a href="tel:${x.tel}">${esc(x.display)}</a>`).join("<br>"),
  email: `<a href="mailto:${S.email}">${esc(S.email)}</a>`,
  address: `${esc(S.address.line1)}, ${esc(S.address.line2)}`,
  gst: esc(S.gst), tagline: esc(S.tagline), brandPartner: esc(S.brandPartner), overview: esc(S.overview),
  industry: esc(S.industry), category: esc(S.category), serviceArea: esc(S.serviceArea),
  authorisation: esc(S.authorisation), certification: esc(S.certification),
  ...(S.hours ? { hours: S.hours.map((h) => esc(h.join(": "))).join("<br>") } : {})
};
function fillBinds(html) {
  return html.replace(/<(span|td|p|b|strong|dd)(\b[^>]*\bdata-bind="(\w+)"[^>]*)>([^<]*(?:<(?:a|br)\b[^>]*>[^<]*(?:<\/a>)?[^<]*)*)<\/\1>/g,
    (m, tag, attrs, key) => (key in BIND ? `<${tag}${attrs}>${BIND[key]}</${tag}>` : m));
}

/* ---------------- Category grid (home) + product catalogue ---------------- */
function catGridHtml() {
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  return CATS.map((c) => `<a class="range-card" href="${catHref(c.id)}"><span class="range-count">${c.count} model${c.count === 1 ? "" : "s"}</span><div class="range-media">${c.cover ? `<img src="${img(c.cover)}" alt="Hitachi ${esc(c.name)}" loading="lazy">` : ""}</div><div class="range-body"><div><h3>${esc(c.name)}</h3><p>${esc(c.short)}</p></div><span class="range-go" aria-hidden="true">${arrow}</span></div></a>`).join("");
}
function worksHtml() {
  // No-JS fallback (also what crawlers read): a swipeable row of image cards
  return `<ul class="works-static">${(S.works || []).map((w) => `<li class="ws-card${w.photo ? " is-photo" : ""}"><img src="${img(w.img)}" alt="${esc(w.title)}" loading="lazy"><div><small>${esc(w.tag)} · ${esc(w.place)}</small><h3>${esc(w.title)}</h3><p>${esc(w.text)} Systems: ${w.systems.map(esc).join(", ")}.</p></div></li>`).join("")}</ul>`;
}
// Same tags as the interactive grid (assets/js/products.js → shortTags)
const shortTags = (p) => {
  const want = /tonnage|capacity|model number|^model$|compressor|refrigerant|star/i;
  return p.specs.filter(([k]) => want.test(k)).slice(0, 2).map(([, v]) => v.replace(/^Available in /i, "").split(",").slice(0, 3).join(", "));
};
// Product card: a link to the product's own page when it has one
function prodCard(p, { id = false } = {}) {
  const href = PROD_URL[p.id];
  const tag = href ? "a" : "article";
  return `<${tag} class="prod-card"${id ? ` id="p-${p.id}"` : ""}${href ? ` href="${href}"` : ""}><div class="prod-media">${p.images[0] ? `<img src="${img(p.images[0])}" alt="${esc(displayName(p))}" loading="lazy">` : ""}</div><div class="prod-body"><span class="cat-count">${esc(byCat[p.cat].name)}</span><h3>${esc(displayName(p))}</h3><div class="prod-tags">${shortTags(p).map((t) => `<span>${esc(t)}</span>`).join("")}</div><div class="prod-foot"><span class="price">${p.price ? esc(p.price) : "Price on request"}</span>${href ? '<span class="view">Details →</span>' : ""}</div></div></${tag}>`;
}
function prodGridHtml() {
  return PRODS.map((p) => prodCard(p, { id: true })).join("");
}

/* ---------------- Helpers ---------------- */
function setInner(html, openTagRe, inner, label) {
  // replace the content of an element whose opening tag matches; content is a marked generated block or empty
  const m = html.match(openTagRe);
  if (!m) throw new Error(`${label}: anchor not found`);
  const start = m.index + m[0].length;
  const endMarker = `<!-- /${label} -->`;
  const existingEnd = html.indexOf(endMarker, start);
  const close = existingEnd > -1 ? existingEnd + endMarker.length : start;
  return html.slice(0, start) + `<!-- ${label} -->${inner}${endMarker}` + html.slice(close);
}

/* ---------------- Category + product pages ----------------
   Static pages under /products/, fully written here (nothing to hand-edit).
   They sit one or two folders deep, so <base href="/"> keeps every
   relative link (header, footer, images, scripts) working. */
const waLink = (msg) => `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(msg)}`;
const WA_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:18px;height:18px"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 0 1 12 2.2c2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8M20.5 3.5A11.8 11.8 0 0 0 12 0C5.5 0 .1 5.3.1 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.8 1 3.7 1.5 5.7 1.5 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.4"/></svg>';
const SINGULAR = {
  "inverter-split-acs": "inverter split air conditioner", "fixed-speed-split-acs": "fixed speed split air conditioner",
  "window-acs": "window air conditioner", "light-commercial-air-conditioners": "light commercial air conditioner",
  "ductable-air-conditioners": "ductable air conditioner", "vrf-systems": "VRF system product", "hitachi-chillers": "chiller"
};
const DEALER = `Yamini Enterprises, the exclusive dealer and service provider for ${S.brandPartner} in Jodhpur`;
const ADDRESS_LINE = `${S.address.line1}, ${S.address.line2}`;

// "Available in 1.0TR,1.5TR,1.8TR" → "1.0, 1.5 and 1.8 ton"
function capacityText(p) {
  const kv = p.specs.find(([k]) => /tonnage|capacity/i.test(k)) || p.specs.find(([k, v]) => /model number/i.test(k) && /\b(TR|HP)\b/i.test(v));
  const hp = p.name.match(/\b(\d+(?:\.\d+)?)\s*HP\b/);
  if (!kv) return hp ? `${hp[1]} HP` : "";
  const v = kv[1].replace(/^Available in /i, "").trim();
  const parts = v.split(",").map((x) => x.trim());
  if (parts.every((x) => /^\d+(\.\d+)?\s*TR$/i.test(x))) {
    const n = parts.map((x) => x.replace(/\s*TR$/i, ""));
    return (n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n[0]) + " ton";
  }
  return /^(25 to 100%)$/.test(v) ? "" : v.replace(/\bTr(\.f)?\b/g, "TR");
}
const featureGroups = (p) => p.features
  .map((g) => ({ title: g.title, items: [...new Set(g.items.filter((i) => i && !/^other feature$/i.test(i)))] }))
  .filter((g) => g.items.length);
const listText = (a) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0] || "");

function productSummary(p) {
  const cap = capacityText(p);
  const feats = [...new Set(featureGroups(p).flatMap((g) => g.items))].filter((f) => f.length < 48).slice(0, 4);
  return `The ${displayName(p)} is a Hitachi ${SINGULAR[p.cat]}${cap ? ` available in ${cap}` : ""}. In Jodhpur it is supplied, installed and serviced by ${DEALER}.` +
    (feats.length ? ` Key features include ${listText(feats)}.` : "");
}
function productFaq(p) {
  const n = displayName(p);
  return [
    [`Where can I buy the ${n} in Jodhpur?`, `${S.name} at ${ADDRESS_LINE} supplies the ${n} as the exclusive dealer for ${S.brandPartner} in Jodhpur. Call ${S.phone.display} or message on WhatsApp to check stock.`],
    [`What is the price of the ${n}?`, `The price depends on the capacity, current offers and installation requirements, so ${S.name} shares the latest price on request. Call or WhatsApp ${S.phone.display} for a quote.`],
    [`Does ${S.name} install and service the ${n}?`, `Yes. Our technicians install, test and hand over the unit, and we provide annual maintenance (AMC) and repairs. We serve ${S.serviceArea}.`]
  ];
}
const faqHtml = (faq) => faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n          ");
const faqLd = (url, faq) => ({ "@type": "FAQPage", "@id": `${abs(url)}#faq`, mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });
const crumbsLd = (items) => ({ "@type": "BreadcrumbList", itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(url) })) });
const crumbsHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, url], i) => (i === items.length - 1 ? `<span>${esc(name)}</span>` : `<a href="${url}">${esc(name)}</a><span>/</span>`)).join("")}</nav>`;

function faqSection(heading, faq, tech) {
  return `<section class="sv-faq">
      <div class="container sv-faq-grid">
        <div class="sv-faq-side">
          <p class="ab-label"><span></span>questions.</p>
          <h2>${esc(heading)}</h2>
          <div class="sv-tech">
            <h3>${esc(tech.title)}</h3>
            <p>${esc(tech.text)}</p>
            <div class="sv-tech-cta"><a class="btn btn-primary btn-sm" href="tel:${S.phone.tel}">Call ${esc(S.phone.display)}</a><a class="btn btn-ghost btn-sm" href="${waLink(tech.wa)}" target="_blank" rel="noopener">WhatsApp us</a></div>
          </div>
        </div>
        <div class="sv-faq-list">
          ${faqHtml(faq)}
        </div>
      </div>
    </section>`;
}

function shell({ url, title, desc, graph, ogImage, ogAlt, main, scripts = [] }) {
  return `<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
${seoBlock({ url, title, desc, graph: { "@context": "https://schema.org", "@graph": graph }, ogImage, ogAlt })}
  <!-- Generated by tools/prerender.js from products-data.js + catalog-content.js. Edit those, not this file. -->
  <base href="/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/style.css">
</head>
<body data-page="products">
  <div id="site-header"><!-- prerender:header -->${headerHtml({ file: "products.html" })}<!-- /prerender:header --></div>

  <main>
${main}
  </main>

  <div id="site-footer"><!-- prerender:footer -->${footerHtml()}<!-- /prerender:footer --></div>

  <script src="assets/js/site-config.js"></script>
  <script src="assets/js/products-data.js"></script>
  <script src="assets/js/catalog-urls.js"></script>
  <script src="assets/js/main.js"></script>
${scripts.map((s) => `  <script src="${s}"></script>\n`).join("")}</body>
</html>
`;
}

function ctaBand(h, p, wa) {
  return `<section class="section" style="padding-top:0">
      <div class="container">
        <div class="band">
          <div style="position:relative;z-index:1">
            <h2>${esc(h)}</h2>
            <p>${esc(p)}</p>
          </div>
          <div class="band-actions">
            <a class="btn btn-light" href="contact.html#enquiry">Request a quote</a>
            <a class="btn btn-ghost" href="${waLink(wa)}" target="_blank" rel="noopener">Ask on WhatsApp</a>
          </div>
        </div>
      </div>
    </section>`;
}

function categoryPage(c) {
  const k = CONTENT[c.id], url = `/${CAT_URL[c.id]}`;
  const list = PRODS.filter((p) => p.cat === c.id && PROD_URL[p.id]);      // generic stubs (no specs/photos) stay off
  const crumbs = [["Home", "/"], ["Products", "/products.html"], [c.name, url]];
  const others = CAT_PAGES.filter((o) => o.id !== c.id);
  const graph = [business, website, {
    "@type": "CollectionPage", "@id": `${abs(url)}#webpage`, url: abs(url), name: k.title, description: k.desc,
    isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": BIZ_ID }, inLanguage: "en-IN",
    ...(c.cover ? { primaryImageOfPage: abs(img(c.cover)) } : {}),
    mainEntity: {
      "@type": "ItemList", name: k.h1, numberOfItems: list.length,
      itemListElement: list.map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: { "@type": "Product", name: displayName(p), brand: { "@type": "Brand", name: "Hitachi" }, category: c.name,
          ...(PROD_URL[p.id] ? { url: abs(PROD_URL[p.id]) } : {}), ...(p.images[0] ? { image: abs(img(p.images[0])) } : {}) }
      }))
    }
  }, crumbsLd(crumbs), faqLd(url, k.faq)];
  const main = `    <section class="page-hero">
      <div class="container">
        ${crumbsHtml(crumbs)}
        <h1>${esc(k.h1)}</h1>
        <p>${esc(k.intro)}</p>
        <ul class="cat-facts">
          <li>${list.length} model${list.length === 1 ? "" : "s"}</li>
          <li>${esc(c.series.replace(/\.$/, ""))}</li>
          <li>Supply, installation &amp; service</li>
        </ul>
      </div>
    </section>

    <section class="section" style="padding-top:56px">
      <div class="container">
        <div class="cat-intro">
          <div><h2>All Hitachi ${esc(c.name)}</h2><p>${esc(c.short)} Prices change with season and stock, so ask for the latest quote.</p></div>
          <a class="link-arrow" href="products.html">Full catalogue →</a>
        </div>
        <div class="prod-grid">${list.map((p) => prodCard(p)).join("")}</div>
      </div>
    </section>

    <section class="section cat-guide-wrap" style="padding-top:0">
      <div class="container cat-guide">
        <div class="cat-guide-card">
          <h2>Best for</h2>
          <ul>${k.bestFor.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
        <div class="cat-guide-card cat-guide-card--dark">
          <h2>How to choose</h2>
          <ul>${k.choose.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
        </div>
      </div>
    </section>

    ${faqSection(`Questions about Hitachi ${c.name}`, k.faq, { title: "Not sure which model?", text: "Tell us the room or building size and how you'll use it, and we'll recommend the right Hitachi system with a clear quote.", wa: `Hello Yamini Enterprises, I need advice on Hitachi ${c.name}.` })}

    <section class="section" style="padding-top:0;padding-bottom:40px">
      <div class="container">
        <h2 class="cat-more-title">More from the Hitachi range</h2>
        <ul class="cat-more">${others.map((o) => `<li><a href="${CAT_URL[o.id]}">${esc(o.name)}<span>${o.count} models</span></a></li>`).join("")}</ul>
      </div>
    </section>

    ${ctaBand(`Looking for Hitachi ${c.name} in Jodhpur?`, `Visit our showroom at ${S.address.line1}, or tell us your requirement and we'll confirm availability and the best price.`, `Hello Yamini Enterprises, I'm interested in Hitachi ${c.name}.`)}`;
  return shell({ url, title: k.title, desc: k.desc, graph, ogImage: c.cover ? img(c.cover) : null, ogAlt: k.h1, main });
}

function productPage(p) {
  const c = byCat[p.cat], url = `/${PROD_URL[p.id]}`, name = displayName(p);
  const crumbs = [["Home", "/"], ["Products", "/products.html"], [c.name, `/${CAT_URL[c.id]}`], [name, url]];
  const summary = productSummary(p), faq = productFaq(p), groups = featureGroups(p);
  const cap = capacityText(p);
  const model = (p.specs.find(([k]) => /^model( number)?$/i.test(k)) || [])[1];
  const related = PRODS.filter((x) => x.cat === p.cat && x.id !== p.id && PROD_URL[x.id]).slice(0, 4);
  const enquiry = `Hello Yamini Enterprises, I'm interested in the ${name}. Please share the price and availability.`;
  const title = `${name} | Price & Dealer in Jodhpur`.length <= 62 ? `${name} | Price & Dealer in Jodhpur` : `${name} | Yamini, Jodhpur`;
  const desc = (`${name}${cap ? ` (${cap})` : ""}: specifications and features. Supplied, installed and serviced in Jodhpur by Yamini Enterprises, the exclusive Hitachi HVAC dealer.`).slice(0, 160);
  const graph = [business, website, {
    "@type": "ItemPage", "@id": `${abs(url)}#webpage`, url: abs(url), name: title, description: desc,
    isPartOf: { "@id": `${SITE_URL}/#website` }, about: { "@id": `${abs(url)}#product` }, inLanguage: "en-IN",
    ...(p.images[0] ? { primaryImageOfPage: abs(img(p.images[0])) } : {})
  }, {
    "@type": "Product", "@id": `${abs(url)}#product`, name, url: abs(url), description: summary,
    brand: { "@type": "Brand", name: "Hitachi" }, manufacturer: { "@type": "Organization", name: "Hitachi" }, category: c.name,
    ...(model && model.length < 60 ? { model } : {}),
    ...(p.images.length ? { image: p.images.map((i) => abs(img(i))) } : {}),
    ...(p.specs.length ? { additionalProperty: p.specs.map(([k, v]) => ({ "@type": "PropertyValue", name: k, value: v })) } : {}),
    ...(p.video ? { subjectOf: { "@type": "VideoObject", name: `${name} video`, url: `https://www.youtube.com/watch?v=${p.video}`, embedUrl: `https://www.youtube.com/embed/${p.video}`, thumbnailUrl: `https://i.ytimg.com/vi/${p.video}/hqdefault.jpg`, description: `Hitachi product video for the ${name}.` } } : {}),
    isRelatedTo: related.map((r) => ({ "@type": "Product", name: displayName(r), url: abs(PROD_URL[r.id]) }))
  }, crumbsLd(crumbs), faqLd(url, faq)];
  const main = `    <section class="page-hero page-hero--compact">
      <div class="container">
        ${crumbsHtml(crumbs)}
        <h1>${esc(name)}</h1>
        <p>${esc(summary)}</p>
      </div>
    </section>

    <section class="pd">
      <div class="container pd-grid">
        <div class="pd-media">
          <div class="pd-main">${p.images[0] ? `<img id="pdMain" src="${img(p.images[0])}" alt="${esc(name)}" width="600" height="600">` : ""}</div>
          ${p.images.length > 1 ? `<div class="thumbs" id="pdThumbs">${p.images.map((s, i) => `<button type="button"${i ? "" : ' class="active"'} data-src="${img(s)}" aria-label="Photo ${i + 1} of ${p.images.length}"><img src="${img(s)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
        </div>
        <div class="pd-info">
          <a class="cat-count" href="${CAT_URL[c.id]}">${esc(c.name)}</a>
          <div class="modal-price"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c6.67 0 6.67-10 0-10"/></svg> ${p.price ? esc(p.price) : "Price on request: ask for today's best price"}</div>
          ${p.specs.length ? `<h2>Specifications</h2>
          <table class="spec-table"><tbody>${p.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` : ""}
          ${groups.length ? `<h2>Features</h2>
          ${groups.map((g) => `<div class="feature-group">${g.title && !/^features?$/i.test(g.title) ? `<h3>${esc(g.title)}</h3>` : ""}<ul>${g.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}` : ""}
          ${p.video ? `<p><a class="link-arrow" href="https://www.youtube.com/watch?v=${p.video}" target="_blank" rel="noopener">Watch the product video →</a></p>` : ""}
          <div class="pd-actions">
            <a class="btn btn-wa" href="${waLink(enquiry)}" target="_blank" rel="noopener">${WA_ICON} Enquire on WhatsApp</a>
            <a class="btn btn-outline" href="tel:${S.phone.tel}">Call ${esc(S.phone.display)}</a>
            <a class="btn btn-outline" href="contact.html?product=${encodeURIComponent(name)}#enquiry">Request quote</a>
          </div>
          <p class="pd-note">Sold, installed and serviced in Jodhpur by ${esc(S.name)} · ${esc(S.authorisation)}.</p>
        </div>
      </div>
    </section>

    ${faqSection(`Buying the ${name}`, faq, { title: "Want today's price?", text: "Send us the model name and your room size. We'll confirm stock, the best price and installation.", wa: enquiry })}

    ${related.length ? `<section class="section" style="padding-top:56px">
      <div class="container">
        <div class="cat-intro">
          <div><h2>More ${esc(c.name)}</h2></div>
          <a class="link-arrow" href="${CAT_URL[c.id]}">All ${esc(c.name)} →</a>
        </div>
        <div class="prod-grid">${related.map((r) => prodCard(r)).join("")}</div>
      </div>
    </section>` : ""}`;
  return shell({ url, title, desc, graph, ogImage: p.images[0] ? img(p.images[0]) : null, ogAlt: name, main, scripts: p.images.length > 1 ? ["assets/js/product-page.js"] : [] });
}

function writeCatalog() {
  const dir = path.join(ROOT, "products");
  // URL map first, so pages stamp the right ?v= hash for it
  fs.writeFileSync(path.join(ROOT, "assets/js/catalog-urls.js"),
`/* AUTO-GENERATED by tools/prerender.js: URLs of the static category and product pages. */
window.CAT_URLS = ${JSON.stringify(CAT_URL)};
window.PRODUCT_URLS = ${JSON.stringify(PROD_URL)};
`);
  fs.rmSync(dir, { recursive: true, force: true });             // fully generated: rebuild from scratch
  for (const c of CAT_PAGES) {
    fs.mkdirSync(path.join(dir, c.id), { recursive: true });
    fs.writeFileSync(path.join(dir, c.id, "index.html"), stampAssets(categoryPage(c)));
  }
  for (const p of PRODS) if (PROD_URL[p.id]) fs.writeFileSync(path.join(ROOT, PROD_URL[p.id]), stampAssets(productPage(p)));
  console.log(`wrote ${CAT_PAGES.length} category pages, ${Object.keys(PROD_URL).length} product pages`);
}

/* ---------------- Run ---------------- */
/* ---------------- Cache-busting: ?v=<content hash> on local CSS/JS ---------------- */
const crypto = require("crypto");
const verCache = {};
function version(rel) {
  if (!(rel in verCache)) {
    const f = path.join(ROOT, rel);
    verCache[rel] = fs.existsSync(f) ? crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8) : "";
  }
  return verCache[rel];
}
function stampAssets(html) {
  return html.replace(/((?:src|href)=")(\/?)(assets\/(?:css|js)\/[\w.-]+\.(?:css|js))(?:\?v=\w*)?(")/g,
    (m, a, slash, rel, z) => `${a}${slash}${rel}${version(rel) ? "?v=" + version(rel) : ""}${z}`);
}

// Every page loads the catalogue URL map (header menu, footer, product cards link to the static pages)
function addCatalogScript(html) {
  html = html.replace('<html lang="en">', '<html lang="en-IN">');
  if (html.includes("assets/js/catalog-urls.js")) return html;
  return html.replace(/(\n(\s*)<script src="assets\/js\/products-data\.js[^"]*"><\/script>)/, '$1\n$2<script src="assets/js/catalog-urls.js"></script>');
}

writeCatalog();

for (const page of PAGES) {
  const file = path.join(ROOT, page.file);
  let html = fs.readFileSync(file, "utf8");

  html = html.replace(/\n  <!-- SEO:START[\s\S]*?<!-- SEO:END -->/, "");
  html = html.replace(/(<meta name="description" content="[^"]*">)/, `$1\n${headBlock(page, html)}`);

  html = setInner(html, /<div id="site-header">/, headerHtml(page), "prerender:header");
  html = setInner(html, /<div id="site-footer">/, footerHtml(), "prerender:footer");
  if (page.file === "index.html") html = setInner(html, /<div class="range-grid" id="catGrid">/, catGridHtml(), "prerender:cats");
  if (page.file === "index.html") html = setInner(html, /<div class="works-stage" id="worksStage" aria-label="Our work">/, worksHtml(), "prerender:works");
  if (page.file === "products.html") html = setInner(html, /<div class="prod-grid" id="prodGrid">/, prodGridHtml(), "prerender:products");
  html = fillBinds(html);
  html = stampAssets(addCatalogScript(html));

  fs.writeFileSync(file, html);
  console.log("updated", page.file);
}

/* ---------------- sitemap.xml (with product images) ---------------- */
const ALL_URLS = [
  ...PAGES.map((p) => ({ loc: abs(p.url), priority: p.priority, images: [] })),
  ...CAT_PAGES.map((c) => ({ loc: abs(CAT_URL[c.id]), priority: "0.8", images: c.cover ? [[img(c.cover), `Hitachi ${c.name}`]] : [] })),
  ...PRODS.filter((p) => PROD_URL[p.id]).map((p) => ({ loc: abs(PROD_URL[p.id]), priority: "0.6", images: p.images.slice(0, 5).map((i) => [i && img(i), displayName(p)]) }))
];
fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${ALL_URLS.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority>${u.images.map(([src]) => `<image:image><image:loc>${abs(src)}</image:loc></image:image>`).join("")}</url>`).join("\n")}
</urlset>
`);

/* ---------------- robots.txt ---------------- */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",                  // OpenAI / ChatGPT search
  "ClaudeBot", "Claude-SearchBot", "Claude-User",             // Anthropic / Claude
  "PerplexityBot", "Perplexity-User",                         // Perplexity
  "Google-Extended", "Googlebot",                             // Gemini, Google AI Overviews
  "Bingbot",                                                  // Bing + Microsoft Copilot (and ChatGPT search's index)
  "Applebot", "Applebot-Extended",                            // Siri / Apple Intelligence
  "Amazonbot", "DuckAssistBot", "Meta-ExternalAgent", "MistralAI-User", "cohere-ai"
];
fs.writeFileSync(path.join(ROOT, "robots.txt"),
`# ${S.name}: all search engines and AI assistants are welcome.
User-agent: *
Allow: /

# AI / answer-engine crawlers (explicitly allowed)
${AI_BOTS.map((b) => `User-agent: ${b}\nAllow: /`).join("\n")}

# Plain-text summaries for AI assistants: ${SITE_URL}/llms.txt and ${SITE_URL}/llms-full.txt
Sitemap: ${SITE_URL}/sitemap.xml
`);

/* ---------------- llms.txt + llms-full.txt ---------------- */
const servicesHtml = fs.readFileSync(path.join(ROOT, "services.html"), "utf8");
const FAQ = faqFromHtml(servicesHtml);
const SERVICES = servicesFromHtml(servicesHtml);
const faqLines = FAQ.map((q) => `### ${q.name}\n${q.acceptedAnswer.text}`).join("\n\n");
const catLines = CATS.map((c) => `- [${c.name}](${abs(catHref(c.id))}): ${c.count} models. ${c.short} ${c.series}`).join("\n");
const keyFacts = `## Key facts
- Business: ${S.category}
- Industry: ${S.industry}
- Brand: Exclusive dealer and service provider, ${S.brandPartner}
- Authorisation: ${S.authorisation}
- Certification: ${S.certification}
- Established: ${S.established}, Jodhpur, Rajasthan, India (${new Date().getFullYear() - S.established}+ years)
- Founder: Mr. ${S.owner}, ${S.ownerTitle} (retired Indian Air Force serviceman)
- Service area: ${S.serviceArea}
- Customers: homeowners (single rooms to whole houses), offices and commercial buildings, hotels and resorts, hospitals, industrial facilities and institutions
- Showroom address: ${S.address.line1}, ${S.address.line2}, India
- Phone / WhatsApp: ${S.phones.map((p) => p.display).join(", ")}
- Email: ${S.email}
- GSTIN: ${S.gst}
${S.hours ? `- Hours: ${S.hours.map((h) => h.join(" ")).join("; ")}\n` : ""}`;
const pageLines = `- [Home](${SITE_URL}/)
- [Products](${abs("products.html")}): full Hitachi catalogue with specifications (${PRODS.length} models)
- [Services](${abs("services.html")}): services, process and FAQ
- [About](${abs("about.html")}): company history and founder
- [Contact](${abs("contact.html")}): address, phone and enquiry form
- [Full catalogue as text](${abs("llms-full.txt")}): every model with specifications`;

fs.writeFileSync(path.join(ROOT, "llms.txt"),
`# ${S.name}

> ${S.tagline}. ${S.overview}

In short: ${S.name} is the exclusive dealer and service provider for ${S.brandPartner} in Jodhpur, Rajasthan, for Hitachi air conditioner sales, its Hitachi showroom, installation, annual maintenance (AMC) and repairs.

${keyFacts}
## Services
${SERVICES.map((s) => `- ${s.name}: ${s.desc}`).join("\n")}

## Product range (Hitachi)
${catLines}

## Frequently asked questions
${faqLines}

## Pages
${pageLines}
`);

const modelLine = (p) => {
  const cap = capacityText(p);
  const specs = p.specs.filter(([k]) => !/^brand$/i.test(k)).map(([k, v]) => `${k}: ${v}`).join("; ");
  const feats = [...new Set(featureGroups(p).flatMap((g) => g.items))].join(", ");
  return `- ${PROD_URL[p.id] ? `[${displayName(p)}](${abs(PROD_URL[p.id])})` : displayName(p)}${cap ? `, ${cap}` : ""}${specs ? `. ${specs}` : ""}${feats ? `. Features: ${feats}` : ""}`;
};
fs.writeFileSync(path.join(ROOT, "llms-full.txt"),
`# ${S.name}: full information and Hitachi catalogue

> ${S.tagline}. ${S.overview}

Prices are not published: they depend on model, capacity, season and installation. Customers get a quote by calling or messaging ${S.phone.display} on WhatsApp.

${keyFacts}
## About
${S.name} was founded in ${S.established} in Jodhpur by Mr. ${S.owner}, a retired Indian Air Force serviceman. The company specialises only in Hitachi HVAC products and services and has a showroom at ${S.address.line1}, ${S.address.line2}, where customers can compare Hitachi models side by side.

## Services
${SERVICES.map((s) => `### ${s.name}\n${s.desc}${s.items.length ? `\nIncludes: ${s.items.join("; ")}.` : ""}`).join("\n\n")}

## Frequently asked questions
${faqLines}

${CATS.map((c) => {
  const k = CONTENT[c.id];
  return `## ${c.name} (${c.count} models)
${k ? `Page: ${abs(CAT_URL[c.id])}\n\n${k.intro}\n\nBest for:\n${k.bestFor.map((x) => `- ${x}`).join("\n")}\n\nHow to choose:\n${k.choose.map((x) => `- ${x}`).join("\n")}\n\n${k.faq.map(([q, a]) => `### ${q}\n${a}`).join("\n\n")}\n\n` : `${c.short} ${c.series}\n\n`}Models:
${PRODS.filter((p) => p.cat === c.id).map(modelLine).join("\n")}`;
}).join("\n\n")}
`);

/* ---------------- IndexNow (Bing, Yandex, Seznam…; Bing feeds Copilot and ChatGPT search) ----------------
   The key file proves we own the domain. tools/indexnow.js submits every sitemap URL after a deploy. */
const INDEXNOW_KEY = "ce6a52e4595af36c505a42611d1857d8";
fs.writeFileSync(path.join(ROOT, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY);

const p404 = path.join(ROOT, "404.html");
if (fs.existsSync(p404)) fs.writeFileSync(p404, stampAssets(addCatalogScript(fs.readFileSync(p404, "utf8"))));
console.log(`wrote sitemap.xml (${ALL_URLS.length} URLs), robots.txt, llms.txt, llms-full.txt; stamped asset versions`);
