// Beton layout: the Dashboard drawn new (yellow status slab, the route, pink reply-rate block). Loaded last, so these
// definitions replace the ones in app.js. Everything clickable keeps the data-attributes app.js already listens for
// (data-open, data-go, data-chat), so behaviour stays in one place.

// The route: every application as a point on a climb from Preparing to Offer. Click a point to open it.
function btRoute(apps){
  const W = 900, H = 250, ZW = W / 4, names = [ft("Preparing", "In Arbeit", "Disiapkan"), ft("Sent", "Gesendet", "Terkirim"), "Interview", ft("Offer", "Angebot", "Offer")];
  const sm = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const yAt = (x) => 200 - 44 * (sm(x, ZW - 55, ZW + 55) + sm(x, 2 * ZW - 55, 2 * ZW + 55) + sm(x, 3 * ZW - 55, 3 * ZW + 55));
  const stage = (a) => { const c = colOf(a.status); return c === "Preparing" ? 0 : c === "Sent" ? 1 : c === "Interview" ? 2 : c === "Offer" ? 3 : 1; };
  let d = ""; for (let x = 0; x <= W; x += 6) d += (x ? "L" : "M") + x + " " + yAt(x).toFixed(1);
  let h = `<path d="${d}L${W} ${H}L0 ${H}Z" class="bt-rfill"/><path d="${d}" class="bt-rline"/>`;
  for (let i = 0; i < 4; i++){
    const g = apps.filter(a => stage(a) === i).slice(0, 9), n = g.length, span = ZW - 90, step = n > 1 ? span / (n - 1) : 0;
    if (i) h += `<line x1="${i * ZW}" y1="24" x2="${i * ZW}" y2="${H}" class="bt-rdiv"/>`;
    h += `<text class="bt-rstage" x="${i * ZW + 14}" y="${H - 12}">${esc(names[i])} · ${apps.filter(a => stage(a) === i && colOf(a.status) !== "Closed").length}</text>`;
    g.forEach((a, k) => {
      const shut = colOf(a.status) === "Closed", x = i * ZW + 50 + (n > 1 ? k * step : span / 2), y = yAt(x) + (shut ? 22 : 0);
      h += `<g class="bt-pt${shut ? " shut" : i === 3 ? " won" : ""}" data-open="${esc(a.id)}" tabindex="0" aria-label="${esc(a.company)} ${pct(a.fit)}"><title>${esc(a.company)} · ${esc(a.role)}</title><circle cx="${x}" cy="${y}" r="17" fill="transparent"/><circle class="dot" cx="${x}" cy="${y}" r="7"/><text x="${x}" y="${shut ? y + 22 : y - 14}">${pct(a.fit) || ""}</text></g>`;
    });
  }
  return `<section class="panel bt-route"><div class="head"><h2>${ft("The route", "Die Route", "Rute lamaran")}</h2><span class="cap">${ft("click a point to open it", "Punkt anklicken zum Öffnen", "klik titik untuk membuka")}</span></div><div class="bt-rscroll"><svg viewBox="0 0 ${W} ${H}" role="group">${h}</svg></div></section>`;
}

// The yellow slab: what today asks of you, and the four numbers that matter.
function btHero(d, apps){
  const day = iso(new Date()), steps = dueSteps(apps, prefSnooze(), day), n = steps.length;
  const active = apps.filter(a => ["Sent", "Interview"].includes(colOf(a.status)));
  const waiting = active.filter(a => colOf(a.status) === "Sent").length, inInt = active.length - waiting;
  const { sent, reply } = funnelNums(apps), rate = sent ? Math.round(reply / sent * 100) : 0;
  const prep = apps.filter(a => colOf(a.status) === "Preparing").length;
  const offer = apps.filter(a => a.status === "Offer").sort((a, b) => appDate(b).localeCompare(appDate(a)))[0];
  const head = n === 0 ? ft("Nothing is due today.", "Heute ist nichts fällig.", "Tidak ada yang jatuh tempo hari ini.")
    : n === 1 ? ft("One step needs you today.", "Ein Schritt wartet heute auf dich.", "Satu langkah menunggu kamu hari ini.")
    : ft(`${n} steps need you today.`, `${n} Schritte warten heute auf dich.`, `${n} langkah menunggu kamu hari ini.`);
  const first = steps[0];
  const sub = offer ? ft(`Offer from ${offer.company}.`, `Angebot von ${offer.company}.`, `Ada offer dari ${offer.company}.`)
    : first ? `${first.who}: ${first.what}` : ft("Paste a job ad below or wait for the Morning report.", "Füge unten eine Stellenanzeige ein oder warte auf den Morning Report.", "Tempel lowongan di bawah atau tunggu Laporan pagi.");
  const tile = (big, cap, sub, attr = "") => `<div class="dstat bt-tile" ${attr}><b>${big}</b><span class="cap">${cap}</span><small>${sub}</small></div>`;
  return `<section class="dstrip bt-hero">
    <div class="bt-hl"><span class="cap">${new Date().toLocaleDateString(LOC(), { weekday: "long", day: "numeric", month: "long" })}</span><h2>${esc(head)}</h2><p>${esc(sub)}</p>
      <div class="bt-acts">${first ? `<button class="btn bt-black" data-open="${esc(first.id)}">${ft("Open the first one", "Den ersten öffnen", "Buka yang pertama")}</button>` : `<button class="btn bt-black" ${go("laporan")}>${ft("Morning report", "Morning Report", "Laporan pagi")}</button>`}<button class="btn" ${go("apps")}>${ft("All applications", "Alle Bewerbungen", "Semua lamaran")}</button></div></div>
    <div class="bt-tiles">${tile(active.length, ft("Active", "Aktiv", "Aktif"), ft(`${waiting} awaiting reply`, `${waiting} warten auf Antwort`, `${waiting} menunggu balasan`))}${tile(inInt, ft("In interview", "Im Interview", "Interview"), ft(`${prep} in preparation`, `${prep} in Vorbereitung`, `${prep} disiapkan`))}${tile(rate + "%", ft("Reply rate", "Antwortquote", "Tingkat balasan"), ft(`${reply} of ${sent} sent`, `${reply} von ${sent} gesendet`, `${reply} dari ${sent} terkirim`))}${offer ? tile(esc(offer.company), ft("Offer", "Angebot", "Offer"), esc(offer.role || ""), first && String(first.id) === String(offer.id) ? "" : `data-open="${esc(offer.id)}" role="button" tabindex="0"`) : tile("–", ft("Offer", "Angebot", "Offer"), ft("No offer yet", "Noch kein Angebot", "Belum ada offer"))}</div>
  </section>`;
}

// The pink block: reply rate, the week-by-week line and the funnel.
function btRate(apps){
  const { sent, reply, intv, offer } = funnelNums(apps), rate = sent ? Math.round(reply / sent * 100) : 0;
  const w = weekly(apps), wm = Math.max(1, ...w), pts = w.map((v, i) => `${(i * (300 / 7)).toFixed(1)},${(56 - v / wm * 50).toFixed(1)}`).join(" ");
  const rows = [[ft("Sent", "Gesendet", "Terkirim"), sent], [ft("Reply", "Antwort", "Balasan"), reply], ["Interview", intv], [ft("Offer", "Angebot", "Offer"), offer]];
  return `<section class="bt-rate"><div class="bt-rate-top"><b>${rate}%</b><span>${ft("of your applications got a reply", "deiner Bewerbungen bekamen eine Antwort", "lamaran kamu dibalas")}</span></div>
    <div class="bt-rate-body"><div class="bt-rate-n"><b>${w[7]}</b><span>${ft("sent this week", "diese Woche gesendet", "terkirim minggu ini")}</span></div><svg viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}"/></svg>
    <div class="bt-fun">${rows.map(([l, v]) => `<div><span>${esc(l)}</span><i><u style="width:${Math.max(3, v / Math.max(1, sent) * 100)}%"></u></i><b>${v}</b></div>`).join("")}</div></div></section>`;
}

function dash(d){
  setTimeout(loadDashExtras, 0);
  const apps = d.apps || [], p = phase(d), fn = funnelNums(apps);
  const ready = p.flags[0] && p.flags[1] && p.flags[2];
  return `${ready ? btHero(d, apps) : ""}<div class="dashwrap btd">
  ${ready ? "" : hero(d, apps, p)}
  ${apps.length ? btRoute(apps) : ""}
  <div class="grid g-bot">
    <div class="stack">${attention(d)}</div>
    <div class="stack">${upcoming(apps)}</div>
    <div class="stack">${latestReport(d)}</div>
  </div>
  ${fn.sent ? btRate(apps) : ""}
  </div>`;
}
// Keyboard: Enter on a point of the route opens it, like a click.
document.addEventListener("keydown", (e) => { const g = e.key === "Enter" && e.target.closest && e.target.closest(".bt-pt,.bt-tile[data-open]"); if (g) g.dispatchEvent(new MouseEvent("click", { bubbles: true })); });


// ---------- navigation: five working tabs; Profile sits under your name, Settings behind the gear ----------
if (navigator.webdriver) document.documentElement.classList.add("auto");   // the UI tests drive the full controls directly
const BT_YOU = ["profil", "skill", "learn"];
$("userBtn").onclick = (e) => { e.stopPropagation(); goView("profil"); };
$("btnGear").onclick = () => goView("settings");
{ const _sp = settingsPage; settingsPage = function(){ return _sp.apply(this, arguments).replace('<div class="settings">', '<div class="settings"><span id="stTools" hidden></span>'); }; }

// Interview: one page per interview, picked with tabs, instead of every interview in one long list.
{ const _iv = interviewPage; interviewPage = function(d){
  const html = _iv.call(this, d), box = document.createElement("div"); box.innerHTML = html;
  const cards = [...box.querySelectorAll(".list > .card")]; if (cards.length < 2) return html;
  const sel = Math.min(state.ivSel || 0, cards.length - 1);
  const tabs = cards.map((c, i) => `<button class="${i === sel ? "on" : ""}" data-ivtab="${i}"${i === sel ? " disabled" : ""}>${esc(c.querySelector("b").childNodes[0].textContent.trim())}</button>`).join("");
  cards.forEach((c, i) => { if (i !== sel) c.hidden = true; else { const b = c.querySelector(".ivtop .btn"); if (b) b.classList.add("primary"); } });
  box.querySelector(".list").insertAdjacentHTML("beforebegin", `<div class="bt-tabs in">${tabs}</div>`);
  return box.innerHTML;
}; }
$("view").addEventListener("click", (e) => { const t = e.target.closest("[data-ivtab]"); if (t){ state.ivSel = +t.dataset.ivtab; render(); } });

vhook((view) => {
  document.querySelector(".user").classList.toggle("on", BT_YOU.includes(view));
  $("btnGear").classList.toggle("on", view === "settings");
  const v = $("view");
  // Profile, Skills and Learn are one area with sub-tabs.
  if (BT_YOU.includes(view) && !$("btTabs")){
    const names = { profil: ft("Profile", "Profil", "Profil"), skill: ft("Skills", "Skills", "Skill"), learn: ft("Learn", "Lernen", "Belajar") };
    v.insertAdjacentHTML("afterbegin", `<div class="bt-tabs" id="btTabs">${BT_YOU.filter(k => document.querySelector(`#nav a[data-view="${k}"]`)).map(k => `<button class="${k === view ? "on" : ""}" ${go(k)}>${esc(names[k])}</button>`).join("")}</div>`);
  }
  // Applications: search and "Add" stay in view; the filters used now and then open with one button.
  if ((view === "apps" || view === "pipeline") && $("btBox") && !$("btMore")){
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "btMore"; b.type = "button";
    const paint = () => { const open = document.body.classList.contains("bt-filters"); b.textContent = open ? ft("Hide filters", "Filter ausblenden", "Sembunyikan filter") : ft("Filters", "Filter", "Filter"); };
    b.onclick = () => { document.body.classList.toggle("bt-filters"); paint(); };
    paint(); const s = $("btBox").querySelector("input[type=search]"); if (s) s.after(b); else $("btBox").prepend(b);
  }
});
if (typeof render === "function" && state && state.data) render();
