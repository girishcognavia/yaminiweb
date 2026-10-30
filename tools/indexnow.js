#!/usr/bin/env node
/* =====================================================================
   IndexNow: tell Bing (which also feeds Microsoft Copilot and ChatGPT
   search), Yandex, Seznam and Naver that pages changed, so they recrawl
   within hours instead of weeks.

   Run AFTER the site is live (the key file must be reachable at
   https://yaminient.in/<key>.txt):      node tools/indexnow.js
   Submits every URL in sitemap.xml. The key is written by prerender.js.
   ===================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const HOST = "yaminient.in";
const keyFile = fs.readdirSync(ROOT).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("IndexNow key file not found: run node tools/prerender.js first");
const key = keyFile.slice(0, -4);
const urlList = [...fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1]).filter((u) => !/\.(png|jpe?g|webp)$/i.test(u));

fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList })
}).then((r) => console.log(`IndexNow: ${r.status} ${r.statusText} (${urlList.length} URLs)`))
  .catch((e) => { console.error("IndexNow failed:", e.message); process.exit(1); });
