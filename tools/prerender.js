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
  description: `${S.tagline}. ${S.overview}`,
  slogan: S.headerLine,
  url: `${SITE_URL}/`,
  logo: abs(img(S.logo)),
  image: [abs(img(S.logo)), abs(img("gallery/showroom-6.png"))],
  telephone: S.phones.map((p) => p.tel),
  email: S.email,
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
      "@type": "OfferCatalog", name: c.name, url: abs(`products.html?cat=${c.id}`), description: `${c.short} ${c.series}`
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
  }
  if (page.url === "/products.html") {
    graph.push({
      "@type": "ItemList", name: "Hitachi air conditioners at Yamini Enterprises", numberOfItems: PRODS.length,
      itemListElement: PRODS.map((p, i) => ({
        "@type": "ListItem", position: i + 1,
        item: {
          "@type": "Product", name: p.name, url: abs(`products.html#p-${p.id}`), category: byCat[p.cat].name,
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
  const ld = JSON.stringify(pageGraph(page, html, meta)).replace(/</g, "\\u003c");
  return `  <!-- SEO:START (generated by tools/prerender.js, do not edit by hand) -->
  <link rel="canonical" href="${abs(page.url)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <meta name="theme-color" content="#0b1a2b">
  <meta name="author" content="${esc(S.name)}">
  <meta name="geo.region" content="IN-RJ">
  <meta name="geo.placename" content="Jodhpur, Rajasthan">
  <link rel="icon" type="image/png" sizes="32x32" href="images/brand/favicon-32.png">
  <link rel="apple-touch-icon" href="images/brand/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(S.name)}">
  <meta property="og:locale" content="en_IN">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${abs(page.url)}">
  <meta property="og:image" content="${abs("images/brand/og-cover.png")}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(S.name)}, exclusive Hitachi HVAC dealer in Jodhpur">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${abs("images/brand/og-cover.png")}">
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
        <div class="f-col"><h4>Products</h4><ul>${CATS.filter((c) => c.cover).map((c) => `<li><a href="products.html?cat=${c.id}">${esc(c.name)}</a></li>`).join("")}</ul></div>
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
  return CATS.map((c) => `<a class="range-card" href="products.html?cat=${c.id}"><span class="range-count">${c.count} model${c.count === 1 ? "" : "s"}</span><div class="range-media">${c.cover ? `<img src="${img(c.cover)}" alt="Hitachi ${esc(c.name)}" loading="lazy">` : ""}</div><div class="range-body"><div><h3>${esc(c.name)}</h3><p>${esc(c.short)}</p></div><span class="range-go" aria-hidden="true">${arrow}</span></div></a>`).join("");
}
function worksHtml() {
  // No-JS fallback (also what crawlers read): a swipeable row of image cards
  return `<ul class="works-static">${(S.works || []).map((w) => `<li class="ws-card${w.photo ? " is-photo" : ""}"><img src="${img(w.img)}" alt="${esc(w.title)}" loading="lazy"><div><small>${esc(w.tag)} · ${esc(w.place)}</small><h3>${esc(w.title)}</h3><p>${esc(w.text)} Systems: ${w.systems.map(esc).join(", ")}.</p></div></li>`).join("")}</ul>`;
}
function prodGridHtml() {
  return PRODS.map((p) => {
    const specs = p.specs.slice(0, 4).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(" · ");
    return `<article class="prod-card" id="p-${p.id}"><div class="prod-media">${p.images[0] ? `<img src="${img(p.images[0])}" alt="${esc(p.name)}" loading="lazy">` : ""}</div><div class="prod-body"><span class="cat-count">${esc(byCat[p.cat].name)}</span><h3>${esc(p.name)}</h3>${specs ? `<p class="prod-tags"><span>${specs}</span></p>` : ""}<div class="prod-foot"><span class="price">Price on request</span></div></div></article>`;
  }).join("");
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
  html = stampAssets(html);

  fs.writeFileSync(file, html);
  console.log("updated", page.file);
}

fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${abs(p.url)}</loc><lastmod>${TODAY}</lastmod><priority>${p.priority}</priority></url>`).join("\n")}
</urlset>
`);

fs.writeFileSync(path.join(ROOT, "robots.txt"),
`# ${S.name}: all search engines and AI assistants are welcome.
User-agent: *
Allow: /

# AI / answer-engine crawlers (explicitly allowed)
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Applebot-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);

const faqLines = faqFromHtml(fs.readFileSync(path.join(ROOT, "services.html"), "utf8"))
  .map((q) => `### ${q.name}\n${q.acceptedAnswer.text}`).join("\n\n");
const catLines = CATS.map((c) => `- [${c.name}](${abs(`products.html?cat=${c.id}`)}): ${c.count} models. ${c.short} ${c.series}`).join("\n");
fs.writeFileSync(path.join(ROOT, "llms.txt"),
`# ${S.name}

> ${S.tagline}. ${S.overview}

## Key facts
- Business: ${S.category}
- Industry: ${S.industry}
- Brand: Exclusive dealer and service provider, ${S.brandPartner}
- Authorisation: ${S.authorisation}
- Certification: ${S.certification}
- Established: ${S.established}, Jodhpur, Rajasthan, India
- Founder: Mr. ${S.owner} (retired Indian Air Force serviceman)
- Service area: ${S.serviceArea}
- Customers: homeowners (single rooms to whole houses), offices and commercial buildings, hotels and resorts, hospitals, industrial facilities and institutions
- Address: ${S.address.line1}, ${S.address.line2}, India
- Phone: ${S.phones.map((p) => p.display).join(", ")}
- Email: ${S.email}
- GSTIN: ${S.gst}
${S.hours ? `- Hours: ${S.hours.map((h) => h.join(" ")).join("; ")}\n` : ""}
## Services
- Sales and supply of the complete Hitachi air-conditioning range
- Installation and commissioning
- Annual maintenance (AMC)
- Repairs and breakdown service for Hitachi units
- Central AC projects: VRF, ductable and chiller systems for hotels, hospitals, offices and industry across Rajasthan

## Product range (Hitachi)
${catLines}

## Frequently asked questions
${faqLines}

## Pages
- [Home](${SITE_URL}/)
- [Products](${abs("products.html")}): full Hitachi catalogue with specifications (${PRODS.length} models)
- [Services](${abs("services.html")}): services, process and FAQ
- [About](${abs("about.html")}): company history and founder
- [Contact](${abs("contact.html")}): address, phone and enquiry form
`);
const p404 = path.join(ROOT, "404.html");
if (fs.existsSync(p404)) fs.writeFileSync(p404, stampAssets(fs.readFileSync(p404, "utf8")));
console.log("wrote sitemap.xml, robots.txt, llms.txt; stamped asset versions");
