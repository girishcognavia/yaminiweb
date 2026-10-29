# Yamini Enterprises: sample website

A static site (HTML, CSS and plain JavaScript) with no build step. Open `index.html` in a browser to view it.

## Pages
| File | Contents |
|---|---|
| `index.html` | Home: hero, stats, product categories, solutions by space, why us, process, projects, showroom, testimonials, enquiry form |
| `products.html` | All products: category tabs, search, and a detail popup (photos, specs, features, WhatsApp enquiry) |
| `services.html` | Services, process, AMC plans, industries, FAQ |
| `about.html` | Story, founder, milestones, factsheet, showroom gallery |
| `contact.html` | Contact cards, enquiry form, map, directions |

## Where to update things
| What | Where |
|---|---|
| Phone, email, address, hours, social links, logo, owner photo, tagline | `assets/js/site-config.js` (any `null` value shows as a `[PLACEHOLDER]`) |
| Products and categories | `assets/js/products-data.js` (generated from the IndiaMART catalogue; edit directly) |
| Product, brand and store images | `images/` (brand logos in `images/brand/`, client originals in `images/company logo/`) |
| Projects, testimonials, client logos, AMC prices, FAQ answers | Search the HTML for `ph-text` and `data-ph="` |
| Colours and fonts | Top of `assets/css/style.css` (`:root`) |

Placeholders are highlighted in amber for review. Set `showPlaceholderHints: false` in `site-config.js` to make them neutral before going live.

## Notes
- The enquiry forms have no server. Submitting opens WhatsApp with the details filled in, and the second button opens an email instead.
- The map pin on the Contact page is an approximate address search. Put the exact Google Maps embed URL in `mapEmbed`.
- Run locally: `python3 -m http.server 8000` from the repo root, then open http://localhost:8000
- Deployed with GitHub Pages from the repo root (custom domain in `CNAME`); `_config.yml` keeps `company-data/` and `README.md` out of the published site.

## SEO & GEO (search engines + AI answer engines)
After changing **any** CSS/JS file, `assets/js/site-config.js`, `assets/js/products-data.js`, a page title/description or the FAQ, run:

```
node tools/prerender.js
```

It writes crawlable copies of the JavaScript-rendered content into the HTML (header, footer, contact details, product catalogue), plus canonical/Open Graph/geo tags and JSON-LD structured data (HVACBusiness, Person, FAQPage, ItemList, BreadcrumbList) into each page's `<head>`. It also regenerates `sitemap.xml`, `robots.txt` and `llms.txt`, and stamps every CSS/JS link with `?v=<content hash>` so browsers never show a stale cached version. Never edit the blocks between `SEO:START`/`SEO:END` or `prerender:*` markers by hand.

