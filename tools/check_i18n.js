#!/usr/bin/env node
// Interface translation check (no dependencies):   node tools/check_i18n.js
//  1. every entry in ui/strings.js (TR) and every pattern (TRP) has German and Indonesian text;
//  2. every English UI text found in ui/app.js and ui/tour.js is translated for both languages, either by
//     strings.js or by one of the per-feature tables (texts that already arrive translated), or is listed in
//     tools/i18n_allow.txt (sample data, product names, words that are the same in all three languages).
// Exit 1 on any gap, with the list.
const fs = require("fs"), path = require("path");
const UI = path.join(__dirname, "..", "ui");
const read = (f) => fs.readFileSync(path.join(UI, f), "utf8");

// Load the dictionary without a browser (the DOM part of strings.js is left out).
const vm = require("vm");
const sandbox = vm.createContext({lang: "en"});
vm.runInContext(read("strings.js").replace(/\/\/ Original English text per node[\s\S]*$/, "") + "\n;this.TR = TR; this.TRP = TRP; this.trText = trText;", sandbox);
const {TR, TRP} = sandbox;

const problems = [];
for (const [k, v] of Object.entries(TR)) for (const l of ["de", "id"]) if (!v[l] || !String(v[l]).trim()) problems.push(`strings.js: "${k}" has no ${l}`);
TRP.forEach(([rx, de, id], i) => { if (!de || !id) problems.push(`strings.js: pattern #${i + 1} ${rx} is missing a language`); });

// Texts the per-feature tables translate already (SK, DM, AU, SST, CT, tour steps, NAV, SAY): their English values.
const tables = new Set();
for (const f of ["app.js", "tour.js", "i18n.js"]){
  // L3("English", "Deutsch", "Indonesia") helper used by the tutorial: all three texts are already translated.
  for (const m of read(f).matchAll(/\bL3\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\)/g)) for (let i = 1; i <= 3; i++) tables.add(m[i].trim());
  // English values of those tables, and their German/Indonesian values (not source texts).
  for (const m of read(f).matchAll(/\b(?:en|de|id):\s*(?:\([^)]*\)\s*=>\s*)?["`]((?:[^"`\\]|\\.)*)["`]/g)) tables.add(m[1].trim());
}

// English UI texts from the code: whole text nodes of HTML templates (no ${...} inside) and whole string literals
// that read like interface text. Sentences assembled from pieces are covered by the patterns (TRP) instead.
// ft("English", "Deutsch", "Indonesia") calls (feature files) carry all three languages: leave their texts out of the scan.
function stripFt(src){
  let out = "", i = 0;
  for (;;){
    const j = src.indexOf("ft(", i);
    if (j < 0){ out += src.slice(i); break; }
    if (/\w/.test(src[j - 1] || "")){ out += src.slice(i, j + 3); i = j + 3; continue; }
    out += src.slice(i, j);
    let d = 0, k = j + 2, q = "";
    for (; k < src.length; k++){
      const c = src[k];
      if (q){ if (c === "\\"){ k++; continue; } if (c === q) q = ""; continue; }
      if (c === '"' || c === "'" || c === "`"){ q = c; continue; }
      if (c === "(") d++; else if (c === ")"){ d--; if (d === 0) break; }
    }
    out += "__FT__"; i = k + 1;
  }
  return out;
}
const frags = new Set();
const looksLikeUi = (t) => t.length >= 3 && /[A-Za-z]{3,}/.test(t) && /^[A-Z+•…"“(]/.test(t) && !/[{}<>;=\[\]$`\\]|=>|https?:|\.(js|json|md|pdf|png|jpe?g)$|^[A-Z0-9_]+$|^[A-Z][a-z]+[A-Z]/.test(t);
const FEATURES = fs.readdirSync(path.join(UI, "features")).filter(f => f.endsWith(".js") && !f.startsWith("_")).map(f => "features/" + f);
for (const f of ["app.js", "tour.js"].concat(FEATURES)){
  const s = stripFt(read(f)).replace(/\/\/[^\n]*/g, "");
  for (const m of s.matchAll(/`((?:[^`\\]|\\.)*)`/g)){
    const lit = m[1].replace(/\$\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, "\u0001");
    for (const piece of lit.split(/<[^>]*>/)){ const t = piece.trim(); if (!t.includes("\u0001") && looksLikeUi(t)) frags.add(t); }
  }
  for (const m of s.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)){ const t = m[1].trim(); if (looksLikeUi(t) && /\s|^[A-Z][a-z]+$/.test(t)) frags.add(t); }
}
const allow = new Set(fs.existsSync(path.join(__dirname, "i18n_allow.txt"))
  ? fs.readFileSync(path.join(__dirname, "i18n_allow.txt"), "utf8").split("\n").map(x => x.trim()).filter(x => x && !x.startsWith("#")) : []);
const missing = [];
for (const t of frags){
  if (allow.has(t) || tables.has(t)) continue;
  const known = TR[t] || TRP.some(([rx]) => rx.test(t));
  if (!known) missing.push(t);
}
// Non-English text (German/Indonesian table values) is not a source text.
const notEnglish = /[äöüßÄÖÜ„“]|\b(dan|yang|untuk|kamu|dengan|aku|der|die|und|nicht|ist)\b/;
missing.filter(t => !notEnglish.test(t)).sort().forEach(t => problems.push(`untranslated UI text: "${t}"`));

if (problems.length){
  console.log(problems.join("\n"));
  console.log(`\n${problems.length} problem(s). Add the text to ui/strings.js (TR or TRP), or to tools/i18n_allow.txt if it is data or the same in every language.`);
  process.exit(1);
}
console.log(`OK: ${Object.keys(TR).length} texts and ${TRP.length} patterns in EN/DE/ID; no untranslated UI text in the code.`);
