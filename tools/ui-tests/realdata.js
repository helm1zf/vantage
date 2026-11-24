// Every tab with a realistic user (fixtures/realistic_user.json: what the real backend read from a folder seeded with the kit's own scripts),
// in German and Indonesian: no English word may be left on screen unless it is the user's own data.
// Found 23 Nov 2026 with that folder: the Morning report showed "closes 27 Nov · 4d", "Needs: CV", "posted 22 Nov", "yesterday", "analysed",
// "no deadline stated" and a "Go" button in Indonesian; Profile showed "Discussed · Read: ya · Facts: 12"; Interview showed "materials ready".
// check_i18n.js cannot see these: they are assembled from pieces (`closes ${date}`) or too short ("Go").
// How "English" is decided: the same tabs are rendered in English first; a word counts as English when it appears there and is neither in the
// German/Indonesian translations (strings.js), nor the user's data, nor i18n_allow.txt.
const {launch} = require('./harness.js'); const fs = require('fs'), path = require('path');
let ok = 0, bad = 0; const t = (c, m) => { require('./report.js').rec(__filename, c, m); if (c) ok++; else { bad++; console.log('FAIL', m); } };
const R = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'realistic_user.json'), 'utf8'));
const words = (s) => (String(s).match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).map(w => w.toLowerCase());
const DATA = new Set(); (function walk(v){ if (typeof v === 'string') words(v).forEach(w => DATA.add(w)); else if (v && typeof v === 'object') Object.values(v).forEach(walk); })(R);
const ALLOW = new Set(fs.readFileSync(path.join(__dirname, '..', 'i18n_allow.txt'), 'utf8').split('\n').filter(l => !l.startsWith('#')).flatMap(words));
// the harness's own mock values (folder path, initials) and units that read the same in every language
// and words German or Indonesian use as they are (Route, Match, Button, Log, Tips, Bar, month names)
['pengguna', 'ps', 'kb', 'mb', 'min', 'h', 'november', 'route', 'match', 'button', 'log', 'tips', 'bar', 'your', 'recalling', 'journey'].forEach(w => ALLOW.add(w));
const VIEWS = ['dash', 'inbox', 'laporan', 'apps', 'offers', 'interview', 'skill', 'learn', 'profil', 'settings'];

async function texts(lang) {
  const r = await launch({vp: {width: 1300, height: 900}, scan: R.scan, prefs: {lang}, extra: {skill_gaps: R.skill_gaps, learn_plans: R.learn_plans, master_cv: R.master_cv}});
  const p = r.p, out = [];
  // the harness puts in its own sample report; show the real two
  await p.evaluate(async (reps) => { const inv = window.__TAURI__.core.invoke; window.__TAURI__.core.invoke = async (c, a) => { const v = await inv(c, a); if (c === 'scan') v.reports = reps; return v; }; await refresh(true); }, R.scan.reports);
  await p.waitForTimeout(600);
  const grab = async (where) => (await p.evaluate(() => { const o = []; const w = document.createTreeWalker(document.getElementById('view'), NodeFilter.SHOW_TEXT); while (w.nextNode()) { const n = w.currentNode, e = n.parentElement; if (!e || e.closest('[data-notr],script,style,textarea') || !e.offsetParent) continue; if (n.nodeValue.trim()) o.push(n.nodeValue.trim()); } document.querySelectorAll('#view [title],#view [placeholder]').forEach(e => { if (e.offsetParent) o.push(e.getAttribute('title') || e.getAttribute('placeholder')); }); return o; })).forEach(s => out.push([where, s]));
  for (const v of VIEWS) {
    await p.evaluate((v) => goView(v), v); await p.waitForTimeout(500);
    if (v === 'apps') for (const m of ['list', 'board']) { await p.click(`[data-amode="${m}"]`).catch(() => {}); await p.waitForTimeout(300); await grab(v + ':' + m); }
    else if (v === 'laporan') { await grab(v); for (const b of await p.$$('#view [data-rtab]')) { await b.click().catch(() => {}); await p.waitForTimeout(250); await grab(v + ':tab'); } }
    else await grab(v);
  }
  const tl = lang === 'en' ? '' : await p.evaluate((lang) => Object.values(TR).map(v => v[lang] || '').concat(TRP.map(x => lang === 'de' ? x[1] : x[2])).join(' '), lang);
  const errs = r.errs.slice(); await r.b.close();
  return {out, tl, errs};
}

(async () => {
  const en = await texts('en'); const EN = new Set(en.out.flatMap(([, s]) => words(s)));
  t(en.errs.length === 0, 'en: no page errors: ' + en.errs.join(' | '));
  for (const lang of ['id', 'de']) {
    const {out, tl, errs} = await texts(lang); const TL = new Set(words(tl));
    const left = new Map();
    for (const [where, s] of out) {
      const eng = words(s).filter(w => EN.has(w) && !TL.has(w) && !DATA.has(w) && !ALLOW.has(w));
      if (eng.length) left.set(s, where + ' [' + eng.join(',') + ']');
    }
    const list = [...left].map(([s, w]) => `${w}: "${s}"`);
    t(list.length === 0, `${lang}: no English left on any tab with a realistic user (${list.length}):\n   ` + list.join('\n   '));
    // texts the app or the kit scripts write into the data in English (the word check above takes them for data)
    const fixed = out.filter(([, s]) => /Prepare documents|materials ready|Follow up \(14 days\)/.test(s)).map(([w, s]) => `${w}: "${s}"`);
    t(fixed.length === 0, `${lang}: next steps written by the app are shown translated: ${fixed.join(' | ')}`);
    t(errs.length === 0, `${lang}: no page errors: ${errs.join(' | ')}`);
  }
  // The getting-started card points at the first step that is not done. Found 23 Nov 2026: a user with 7 applications and an offer but a thin
  // profile was shown "STEP 4 · INTERVIEW" and "Practise with Laras", and told to "start applying with Nova" (applications are the Lamaran group).
  {
    const r = await launch({vp: {width: 1300, height: 900}, scan: R.scan}); await r.p.waitForTimeout(600);
    const h = await r.p.evaluate(() => ({big: (document.querySelector('.lcd-big') || {}).textContent || '', sub: (document.querySelector('.lcd-sub') || {}).textContent || '',
      chat: (document.querySelector('.hero-act .btn') || {dataset: {}}).dataset.chat, active: (document.querySelector('.lcd .step.active') || {}).textContent || ''}));
    t(R.scan.raw_facts_kb < 3 && /STEP 2/.test(h.big) && /Profile/.test(h.active) && h.chat === 'raka', 'a thin profile with applications: the card points at step 2 Profile and opens Raka: ' + JSON.stringify(h));
    t(!/Nova/.test(h.sub), 'the card does not say applications are made with Nova: ' + h.sub);
    await r.b.close();
  }
  console.log(`realdata: ${ok} ok, ${bad} bad`); process.exit(bad ? 1 : 0);
})();
