// First-launch tutorial: language choice, then a few steps that point at the real controls.
// Shown once per user folder (app_prefs.json "tour"); replay from the user menu.
let prefs = {};
async function loadPrefs(){
  prefs = {};
  if (invoke && folder){ try { prefs = await invoke("prefs_get", {root:folder}) || {}; } catch {} }
  lang = LANGS.some(l => l[0] === prefs.lang) ? prefs.lang : "en";
  applyLang();
  if (state.view !== "nova") render();
  if (folder && !prefs.tour) startTour(false);
  checkUpdate(false);
}
const savePref = (key, value) => { prefs[key] = value; if (invoke && folder) invoke("prefs_set", {root:folder, key, value}).catch(e => toast(String(e))); };

const TX = {
  next:{en:"Next", de:"Weiter", id:"Lanjut"}, back:{en:"Back", de:"Zurück", id:"Kembali"},
  skip:{en:"Skip tutorial", de:"Tutorial überspringen", id:"Lewati tutorial"}, done:{en:"Let's start", de:"Los geht's", id:"Mulai"},
  copy:{en:"Copy path", de:"Pfad kopieren", id:"Salin path"}, copied:{en:"Path copied", de:"Pfad kopiert", id:"Path disalin"},
  reveal:{en:IS_MAC ? "Open in Finder" : "Open in File Explorer", de:IS_MAC ? "Im Finder öffnen" : "Im Explorer öffnen", id:IS_MAC ? "Buka di Finder" : "Buka di File Explorer"},
  save:{en:"Save", de:"Speichern", id:"Simpan"},
};
const tx = (k) => TX[k][lang] || TX[k].en;
// Each step: target (CSS selector or null for a centred card), title and body per language.
const STEPS = [
  {lang:true, title:{en:"Choose your language", de:"Sprache wählen", id:"Pilih bahasa"},
   body:{en:"Vantage and the requests it sends to Nova will use this language. You can change it later in the user menu (▾).",
         de:"Vantage und die Anfragen an Nova verwenden diese Sprache. Du kannst sie später im Benutzermenü (▾) ändern.",
         id:"Vantage dan permintaan yang dikirim ke Nova akan memakai bahasa ini. Bisa diganti nanti lewat menu user (▾)."}},
  {target:"#userBtn", path:true, title:{en:"This is your Vantage folder", de:"Das ist dein Vantage-Ordner", id:"Ini folder Vantage kamu"},
   body:{en:"Everything Vantage knows about you lives in this folder on your computer: your materials, applications and reports. Nothing is stored anywhere else.",
         de:"Alles, was Vantage über dich weiß, liegt in diesem Ordner auf deinem Computer: Materialien, Bewerbungen und Berichte. Nichts wird woanders gespeichert.",
         id:"Semua yang Vantage tahu tentang kamu ada di folder ini di komputer kamu: bahan, lamaran, dan laporan. Tidak ada yang disimpan di tempat lain."}},
  {target:"#navNova", title:{en:"Talk to Nova", de:"Mit Nova sprechen", id:"Ngobrol dengan Nova"},
   body:{en:"The Nova tab is where the work happens, in four chats: <b>Nova</b> (ask anything), <b>Raka</b> (your profile), the <b>Applications</b> group (job search, CVs, checks) and <b>Laras</b> (interview practice). The first time, connect Claude: Vantage installs Claude Code and you sign in with your Claude Pro or Max account on Claude's own page.",
         de:"Im Tab Nova passiert die Arbeit, in vier Chats: <b>Nova</b> (frag alles), <b>Raka</b> (dein Profil), die Gruppe <b>Bewerbungen</b> (Stellensuche, CVs, Prüfung) und <b>Laras</b> (Interview-Training). Beim ersten Mal verbindest du Claude: Vantage installiert Claude Code, und du meldest dich auf Claudes eigener Seite mit deinem Claude-Pro- oder Max-Konto an.",
         id:"Tab Nova adalah tempat semua kerjaan, dalam empat chat: <b>Nova</b> (tanya apa saja), <b>Raka</b> (profil kamu), grup <b>Lamaran</b> (cari lowongan, CV, pengecekan), dan <b>Laras</b> (latihan interview). Pertama kali, sambungkan Claude: Vantage memasang Claude Code dan kamu masuk dengan akun Claude Pro atau Max di halaman resmi Claude."}},
  {target:'#nav a[data-view="inbox"]', title:{en:"Inbox", de:"Inbox", id:"Inbox"},
   body:{en:"Drop any file here: certificates, old CVs, job postings. Then press <b>Tidy up with Nova</b>: Raka sorts everything into your documents and tells you where each file went.",
         de:"Zieh beliebige Dateien hierher: Zeugnisse, alte CVs, Stellenanzeigen. Dann <b>Tidy up with Nova</b> drücken: Raka sortiert alles in deine Dokumente und sagt dir, wo jede Datei gelandet ist.",
         id:"Lempar file apa saja ke sini: sertifikat, CV lama, lowongan. Lalu tekan <b>Tidy up with Nova</b>: Raka merapikan semuanya ke dokumen kamu dan memberi tahu tiap file masuk ke mana."}},
  {target:'#nav a[data-view="apps"]', title:{en:"Applications: Board and List", de:"Bewerbungen: Board und Liste", id:"Lamaran: Papan dan Daftar"},
   body:{en:"All your applications, in two views. Switch at the top of the tab: <b>Board</b> shows a card per application in columns (Preparing, Sent, Interview, Offer, Closed); <b>List</b> shows them sorted by date, name, score or status. Click any card or row to see its details and documents. On the Board, drag a card to the next column when something happens; Vantage moves the folder, updates your tracker, and you can undo.",
         de:"Alle Bewerbungen, in zwei Ansichten. Umschalten oben im Tab: <b>Board</b> zeigt jede Bewerbung als Karte in Spalten (Vorbereitung, Gesendet, Interview, Angebot, Abgeschlossen); <b>Liste</b> sortiert nach Datum, Name, Score oder Status. Klick auf eine Karte oder Zeile zeigt Details und Dokumente. Im Board ziehst du eine Karte in die nächste Spalte, wenn etwas passiert; Vantage verschiebt den Ordner, aktualisiert den Tracker, rückgängig machen geht auch.",
         id:"Semua lamaranmu, dalam dua tampilan. Ganti di bagian atas tab: <b>Papan</b> menampilkan satu kartu per lamaran dalam kolom (Persiapan, Terkirim, Interview, Offer, Selesai); <b>Daftar</b> mengurutkan menurut tanggal, nama, skor, atau status. Klik kartu atau baris untuk melihat detail dan dokumennya. Di Papan, geser kartu ke kolom berikutnya kalau ada perkembangan; Vantage memindahkan foldernya, memperbarui tracker, dan bisa di-undo."}},
];
let tour = null;
function startTour(langOnly){
  tour = {i:0, langOnly};
  $("tour").hidden = false; drawTour();
}
function endTour(){
  if (!tour) return;
  if (!tour.langOnly) savePref("tour", true);
  tour = null; $("tour").hidden = true;
}
function drawTour(){
  const st = STEPS[tour.i], last = tour.langOnly || tour.i === STEPS.length - 1;
  const tgt = st.target && document.querySelector(st.target);
  const ring = $("tourRing"), card = $("tourCard");
  ring.hidden = !tgt;
  let html = `<div class="cap">${tour.langOnly ? "" : (tour.i + 1) + " / " + STEPS.length}</div><h3>${esc(st.title[lang] || st.title.en)}</h3><div class="tbody">${st.body[lang] || st.body.en}</div>`;
  if (st.lang) html += `<div class="tlangs">${LANGS.map(([k, n]) => `<button class="btn${k === lang ? " primary" : ""}" data-lang="${k}">${n}</button>`).join("")}</div>`;
  if (st.path && folder) html += `<div class="tpath mono" title="${esc(folder)}">${esc(folder)}</div><div class="trow"><button class="btn" data-tact="copy">${tx("copy")}</button><button class="btn" data-tact="reveal">${tx("reveal")}</button></div>`;
  html += `<div class="tfoot">${tour.langOnly ? "" : `<button class="link" data-tact="skip">${tx("skip")}</button>`}<span></span>` +
    (tour.i && !tour.langOnly ? `<button class="btn" data-tact="back">${tx("back")}</button>` : "") +
    `<button class="btn primary" data-tact="next">${tour.langOnly ? tx("save") : last ? tx("done") : tx("next")}</button></div>`;
  card.innerHTML = html;
  card.classList.toggle("center", !tgt);
  if (tgt){
    const r = tgt.getBoundingClientRect(), pad = 4;
    Object.assign(ring.style, {left:(r.left - pad) + "px", top:(r.top - pad) + "px", width:(r.width + pad * 2) + "px", height:(r.height + pad * 2) + "px"});
    const cw = card.offsetWidth, ch = card.offsetHeight;
    card.style.left = Math.min(r.right + 16, innerWidth - cw - 12) + "px";
    card.style.top = Math.max(12, Math.min(r.top - 8, innerHeight - ch - 12)) + "px";
  } else { card.style.left = ""; card.style.top = ""; }
}
$("tour").onclick = async (e) => {
  const l = e.target.closest("[data-lang]");
  if (l){ lang = l.dataset.lang; savePref("lang", lang); applyLang(); render(); drawTour(); return; }
  const b = e.target.closest("[data-tact]"); if (!b) return;
  const act = b.dataset.tact;
  if (act === "skip") return endTour();
  if (act === "back"){ tour.i--; return drawTour(); }
  if (act === "next"){ if (tour.langOnly || tour.i === STEPS.length - 1) return endTour(); tour.i++; return drawTour(); }
  if (act === "copy"){ toast((await copyText(folder)) ? tx("copied") : "Could not copy"); return; }
  if (act === "reveal" && invoke) invoke("open_path", {path:folder}).catch(err => toast(String(err)));
};
window.addEventListener("resize", () => { if (tour) drawTour(); });
document.addEventListener("keydown", (e) => { if (tour && e.key === "Escape") endTour(); });
booted.then(() => { if (folder) loadPrefs(); });

// Vantage folder updates: newer entries in _TEMPLATE's migration log than the user's .vantage_version (update_info in main.rs).
let upd = null;
async function checkUpdate(manual){
  if (!invoke || !folder) return;
  try { upd = await invoke("update_info", {root:folder}); } catch { upd = null; }
  const later = !manual && Date.now() < (prefs.update_later || 0);
  $("updPill").hidden = !(upd && upd.entries.length) || later;
  if (manual) showUpdate();
}
async function showUpdate(){
  if (!upd || !upd.source) return dialog({title:"Check for updates", text:"No update source is set up for this copy of Vantage yet.", no:false});
  if (!upd.entries.length) return dialog({title:"Vantage is up to date", text:`You are on version ${upd.current || "unknown"}.`, no:false});
  const fmt = (d) => { const t = parseDate(d); return t ? t.getDate() + " " + MON[t.getMonth()] + " " + t.getFullYear() : d; };
  // local: one line per migration; github: the release notes.
  const html = `<p>Your version: ${esc(upd.current || "unknown")} · latest: ${esc(upd.latest)}. What's new:</p><ul class="updlog">` +
    upd.entries.map(e => `<li><span class="mono">${esc(fmt(e.date))}</span>${esc(e.title)}</li>`).join("") + `</ul>` +
    (upd.body ? `<div class="updbody">${md(upd.body)}</div>` : "") +
    `<p class="muted">Nova updates only the system files. Your materials, applications and reports stay as they are, and a backup is made first.</p>`;
  const ok = await dialog({title:"Vantage update available", html, ok:"Update now", no:"Later"});
  if (ok){
    $("updPill").hidden = true;
    // The app updates itself (banner); the kit in the user's folder is updated by Nova.
    sendToClaude(say("update"));
  }
  else { savePref("update_later", Date.now() + 3 * DAY); $("updPill").hidden = true; }
}
$("updPill").onclick = () => showUpdate();

// App updates from GitHub Releases (app_update_* in main.rs): checked a few seconds after start, downloaded in the
// background, then one banner: "ready, restart". Nothing to type, nothing to confirm in the chat.
const AU = {
  dl:    {en:(v, p) => `Downloading Vantage ${v}… ${p}`, de:(v, p) => `Vantage ${v} wird geladen… ${p}`, id:(v, p) => `Mengunduh Vantage ${v}… ${p}`},
  ready: {en:(v) => `Vantage ${v} is ready.`, de:(v) => `Vantage ${v} ist bereit.`, id:(v) => `Vantage ${v} sudah siap.`},
  restart: {en:"Restart to update", de:"Neu starten", id:"Mulai ulang untuk update"},
  news:  {en:"What's new", de:"Was ist neu", id:"Apa yang baru"},
  later: {en:"Later", de:"Später", id:"Nanti"},
  newIn: {en:(v) => `What's new in Vantage ${v}`, de:(v) => `Neu in Vantage ${v}`, id:(v) => `Yang baru di Vantage ${v}`},
  log:   {en:"Update log", de:"Update-Verlauf", id:"Log update"},
  none:  {en:"No release notes yet.", de:"Noch keine Versionshinweise.", id:"Belum ada catatan rilis."},
  off:   {en:"Update checks are not set up in this copy of Vantage yet.", de:"Update-Prüfung ist in dieser Vantage-Kopie noch nicht eingerichtet.", id:"Pengecekan update belum diatur di salinan Vantage ini."},
};
const au = (k, ...a) => { const t = AU[k][lang] || AU[k].en; return typeof t === "function" ? t(...a) : t; };
let appUpd = null, appUpdState = "";
function drawAppUpd(pct){
  const el = $("appUpd"); if (!el) return;
  if (!appUpd || !appUpdState || appUpdState === "error"){ el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = appUpdState === "dl"
    ? `<span>${esc(au("dl", appUpd.version, pct || ""))}</span>`
    : `<span><b>${esc(au("ready", appUpd.version))}</b></span><button class="btn sm primary" id="auRestart">${au("restart")}</button><button class="btn sm" id="auNews">${au("news")}</button><button class="linkbtn" id="auLater">${au("later")}</button>`;
}
async function checkAppUpdate(){
  if (!invoke) return;
  let r = null;
  try { r = await invoke("app_update_check"); } catch { return; }
  if ($("appVer") && r.current) $("appVer").textContent = "v" + r.current;
  whatsNewOnce(r);
  if (!r.available) return;
  appUpd = r; appUpdState = "dl"; drawAppUpd();
  try { await invoke("app_update_prepare"); appUpdState = "ready"; }
  catch { appUpdState = "error"; }  // quiet: tried again at the next start
  drawAppUpd();
}
if (T && T.event) T.event.listen("app-update", (e) => {
  const {done, total} = e.payload || {};
  if (appUpdState === "dl") drawAppUpd(total ? Math.round(done / total * 100) + "%" : "");
});
$("appUpd").onclick = (e) => {
  if (e.target.closest("#auRestart")) return invoke("app_update_restart").catch(err => toast(String(err)));
  if (e.target.closest("#auNews")) return showLog(appUpd && appUpd.notes ? [{version:appUpd.version, date:appUpd.date, notes:appUpd.notes}] : null);
  if (e.target.closest("#auLater")){ $("appUpd").hidden = true; }
};
// Update log: release notes from GitHub, newest first. Shown once by itself after an update.
async function showLog(list, title){
  if (!list){
    try { list = invoke ? await invoke("release_notes") : []; } catch { list = []; }
  }
  const fmt = (d) => { const t = parseDate(d); return t ? t.getDate() + " " + MON[t.getMonth()] + " " + t.getFullYear() : d; };
  const html = list && list.length
    ? `<div class="updbody">` + list.map(r => `<h3>Vantage ${esc(r.version)} <span class="muted mono">${esc(fmt(r.date))}</span></h3>${md(r.notes || "")}`).join("") + `</div>`
    : `<p>${au(appUpd || list ? "none" : "off")}</p>`;
  return dialog({title: title || au("log"), html, no:false});
}
async function whatsNewOnce(r){
  const KEY = "vantage.seenVersion";
  let seen = null; try { seen = localStorage.getItem(KEY); localStorage.setItem(KEY, r.current); } catch {}
  if (!seen || seen === r.current || !r.configured) return;
  let list = []; try { list = await invoke("release_notes"); } catch {}
  const mine = list.filter(x => x.version === r.current);
  if (mine.length) showLog(mine, au("newIn", r.current));
}

// First visit to the Chat tab: point at "Use this chat for Vantage" until a chat is pinned.
// Translate the interface (strings.js) from the start and for everything rendered later.
startTranslation();
