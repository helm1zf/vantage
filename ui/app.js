const T = window.__TAURI__;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const invoke = T ? T.core.invoke : null;
const $ = (id) => document.getElementById(id);
const KEY = "vantage.folder";
const store = {
  get(){ try { return localStorage.getItem(KEY) || ""; } catch { return ""; } },
  set(v){ try { localStorage.setItem(KEY, v); } catch {} },
};
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

const ICONS = {
  chat:'<path d="M2.5 3h11v7.5h-6L5 13v-2.5H2.5z"/>',
  talk:'<path d="M2 3h8v5.5H5.5L3.5 10V8.5H2zM10 6h4v5h-1.2v1.6L11 11h-3.5V9"/>',
  inbox:'<path d="M2 9.5l1.8-6h8.4l1.8 6v4H2zM2 9.5h3.5l1 2h3l1-2H14"/>',
  cols:'<path d="M2 2.5h3v11H2zM6.5 2.5h3v7h-3zM11 2.5h3v9h-3z"/>',
  grid:'<path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z"/>',
  list:'<path d="M5 4h9M5 8h9M5 12h9M2 4h.5M2 8h.5M2 12h.5"/>',
  mic:'<rect x="6" y="2" width="4" height="7" rx="2"/><path d="M3.5 8a4.5 4.5 0 009 0M8 12.5V14"/>',
  user:'<circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c.5-3 2.5-4 5-4s4.5 1 5 4"/>',
  spark:'<path d="M2.5 13.5l4-4 2.5 2.5 4.5-5M10 7h3.5v3.5"/>',
  sun:'<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/>',
};
document.querySelectorAll(".ic").forEach(el => el.innerHTML = `<svg viewBox="0 0 16 16">${ICONS[el.dataset.i]}</svg>`);

/* Data contoh untuk pratinjau di browser. Bukan data pengguna. */
const wk = (n) => { const d = new Date(); d.setDate(d.getDate() - n * 7 - 2); return d.toISOString().slice(0,10); };
const MOCK = {ok:true,error:"",user:"user_name",materials:9,mat_items:[{name:"00_Original_CV.md",kind:"file",count:1,kb:6},{name:"00_Photo.jpg",kind:"file",count:1,kb:38},{name:"EDU1_University_A",kind:"folder",count:4,kb:0},{name:"EDU2_Language_Certificate",kind:"folder",count:2,kb:0},{name:"PROJ1_Store_Dashboard",kind:"folder",count:5,kb:0},{name:"PROJ2_Demand_Forecast",kind:"folder",count:3,kb:0},{name:"PROJ3_Thesis",kind:"folder",count:6,kb:0},{name:"ORG1_Student_Association",kind:"folder",count:2,kb:0},{name:"WORK1_Internship_Company_B",kind:"folder",count:3,kb:0}],raw_facts_kb:81,tracker:true,report_date:"2026-10-31",report_text:"# Morning report (sample)\n\n- 2 new postings with a match above 80%\n- 14-day follow-up due: Halden Software\n",apps:[
  {id:1,company:"Nordwind GmbH",role:"Werkstudent Corporate Finance",type:"Werkstudent",fit:.82,status:"Draft",next:"Submit via portal",due:"2026-11-03",date:wk(0)},
  {id:2,company:"Kestrel Logistics",role:"Internship SAP Logistics",type:"Internship",fit:.9,status:"Offer",next:"Sign contract",due:"2026-11-01",date:wk(6)},
  {id:3,company:"Blauberg AG",role:"Working Student Supply Chain",type:"Werkstudent",fit:.87,status:"Interview",prep:true,next:"Practise stage 2 answers",due:"2026-11-04",date:wk(5)},
  {id:4,company:"Halden Software",role:"Internship Data Governance",type:"Internship",fit:.74,status:"Sent",next:"Follow up (14 days)",due:"2026-11-07",date:wk(4)},
  {id:5,company:"Orbis Retail",role:"Working Student CRM and Email",type:"Werkstudent",fit:.7,status:"Sent",next:"",due:"",date:wk(3)},
  {id:6,company:"Lumen Energie",role:"Werkstudent SAP EWM",type:"Werkstudent",fit:.84,status:"Sent",next:"Follow up (14 days)",due:"2026-11-10",date:wk(3)},
  {id:7,company:"Fjord Analytics",role:"Internship Business Analyst",type:"Internship",fit:.66,status:"Rejected",next:"",due:"",date:wk(2)},
  {id:8,company:"Tessera Bank",role:"Werkstudent IT Prozesse",type:"Werkstudent",fit:.78,status:"No Response",next:"",due:"",date:wk(2)},
  {id:9,company:"Aurelia Motors",role:"Internship SAP WM",type:"Internship",fit:.8,status:"Ready",next:"Submit today",due:"2026-10-31",date:wk(0)},
]};

const COLS = [
  {k:"Preparing", m:["Draft","Ready"], to:"Draft"},
  {k:"Sent", m:["Sent","Applied"], to:"Applied"},
  {k:"Interview", m:["Interview","Screening","Interview R1","Interview R2","Assessment"], to:"Interview R1"},
  {k:"Offer", m:["Offer"], to:"Offer"},
  {k:"Closed", m:["Rejected","Withdrawn","No Response"], to:null},
];
const colOf = (s) => (COLS.find(c => c.m.includes(s)) || COLS[0]).k;
const pct = (f) => Math.round((Number(f) || 0) * 100);
const fmtDue = (d) => d ? d.slice(8,10) + "." + d.slice(5,7) : "";

const RANGE_DEF = "vantage.rangeDefault";
const rangeDefault = () => { try { return localStorage.getItem(RANGE_DEF) || "all"; } catch { return "all"; } };
let state = {data:null, view:"dash", cd:null, range:rangeDefault(), open:null};
let folder = store.get();

// toast(msg) or toast(msg, {label, run}) for a toast with one action button (e.g. Undo).
function toast(msg, action){
  const t = $("toast"), b = $("toastAct");
  $("toastMsg").textContent = msg;
  b.hidden = !action; t.classList.toggle("act", !!action);
  if (action){ b.textContent = action.label; b.onclick = () => { t.classList.remove("show"); action.run(); }; }
  t.classList.add("show"); clearTimeout(toast.h);
  toast.h = setTimeout(() => t.classList.remove("show"), action ? 9000 : Math.max(1800, msg.length * 60));
}

// Small dialog: dialog({title, text, input?, select?, ok}) resolves to the input/select value, true, or null when cancelled.
function dialog(o){
  return new Promise(res => {
    const sh = $("dlgSheet");
    sh.innerHTML = `<div class="cap">${esc(o.title)}</div>${o.text ? `<p>${esc(o.text)}</p>` : ""}${o.html || ""}` +
      (o.input ? `<input class="field" id="dlgIn" placeholder="${esc(o.input)}" value="${esc(o.value || "")}" autocomplete="off">` : "") +
      (o.select ? `<select class="field" id="dlgSel">${o.select.map(x => `<option>${esc(x)}</option>`).join("")}</select>` : "") +
      `<div class="dlg-btns">${o.no === false ? "" : `<button class="btn" id="dlgNo">${esc(o.no || dt("cancel"))}</button>`}<button class="btn ${o.danger ? "danger" : "primary"}" id="dlgOk">${esc(o.ok || dt("ok"))}</button></div>`;
    $("dlg").hidden = false; $("dlg").setAttribute("role", "dialog"); $("dlg").setAttribute("aria-modal", "true");
    const done = (v) => { $("dlg").hidden = true; res(v); };
    if ($("dlgNo")) $("dlgNo").onclick = () => done(null);
    $("dlgOk").onclick = () => done(o.input ? ($("dlgIn").value.trim() || null) : o.select ? $("dlgSel").value : true);
    // A destructive confirm starts on Cancel, so a stray Enter never deletes anything.
    const f = $("dlgIn") || $("dlgSel") || (o.danger && $("dlgNo")) || $("dlgOk"); setTimeout(() => f.focus(), 0);
    // Keyboard: Esc cancels, Enter confirms (except on a focused button, which Enter already presses), Tab stays inside.
    $("dlg").onkeydown = (e) => {
      if (e.key === "Escape"){ e.preventDefault(); ($("dlgNo") || $("dlgOk")).click(); }
      else if (e.key === "Enter" && e.target.tagName !== "BUTTON"){ e.preventDefault(); $("dlgOk").click(); }
      else if (e.key === "Tab"){
        const f = [...sh.querySelectorAll("button,input,select")]; const i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
  });
}

function phase(d){
  const apps = d.apps || [];
  const f = [d.materials > 0, d.raw_facts_kb >= 3, apps.length > 0, apps.some(a => ["Interview","Offer"].includes(colOf(a.status)))];
  let n = 0; f.forEach((x,i) => { if (x) n = i + 1; });
  return {flags:f, n};
}
function weekly(apps){
  const out = Array(8).fill(0), now = Date.now();
  apps.forEach(a => {
    if (!a.date) return;
    const w = Math.floor((now - new Date(a.date).getTime()) / 6048e5);
    if (w >= 0 && w < 8) out[7 - w]++;
  });
  return out;
}
// Elements with data-folder open that application's folder from the right-click menu.
const folderAttr = (a) => a.folder ? ` data-folder="${esc(a.folder)}"` : "";
// Coloured status chip, the same everywhere (Applications, Pipeline cards, detail panel).
const ST_CLASS = {Draft:"draft", Ready:"draft", Applied:"applied", Sent:"applied", Screening:"int", Interview:"int", "Interview R1":"int", "Interview R2":"int", Assessment:"int", Offer:"offer", Rejected:"rej", Withdrawn:"wd", "No Response":"nr"};
const chip = (st) => `<span class="st st-${ST_CLASS[st] || "wd"}">${esc(st)}</span>`;
// Cards keep the stable "found" date and add when the status last changed ("moved today"), so the Today /
// This week filters (which use the last change) are unambiguous.
function moved(a){
  const t = parseDate(a.status_date); if (!t || a.status_date === a.date) return "";
  const n = -daysFrom(t);
  return n <= 0 ? "moved today" : n === 1 ? "moved yesterday" : n < 14 ? `moved ${n} days ago` : `moved ${shortDate(a.status_date)}`;
}
function card(a){
  const mv = moved(a);
  return `<div class="card ${a.fit >= .85 ? "hot" : ""}${a.missing ? " gone" : ""}"${folderAttr(a)} data-id="${esc(a.id)}" title="${esc(a.company + " · " + a.role + (a.missing ? " · folder missing" : ""))}"><b>${esc(a.company)}</b><span class="r">${esc(a.role)}</span>` +
         `<div class="m">${chip(a.status)}<span class="fit">${pct(a.fit)}%</span></div>` +
         (a.next ? `<div class="cnext">Next: ${esc(en(a.next))}${a.due ? ` <span class="mono">(${fmtDue(a.due)})</span>` : ""}</div>` : "") +
         `<div class="cdates"><span>found ${esc(shortDate(a.date) || "—")}</span>${mv ? `<span class="mv ${/today|yesterday/.test(mv) ? "now" : ""}">${esc(mv)}</span>` : ""}</div></div>`;
}

// Display-only English for the Indonesian task texts in the tracker (the data files are not changed).
const EN = [
  [/^Tunggu respons\b/i, "Awaiting response"], [/^Selesai\s*[—-]\s*arsip$/i, "Done, archived"],
  [/\bTunggu respons\b/gi, "awaiting response"], [/\bTunggu undangan\b/gi, "wait for the invitation"], [/\bTunggu\b/g, "Wait for"],
  [/\bSubmit lewat\b/gi, "Submit via"], [/\blewat\b/g, "via"], [/\bparalel tanya\b/gi, "in parallel ask"], [/\bsoal\b/g, "about"],
  [/\bkalau diundang interview\b/gi, "if invited to an interview"], [/\bsiapkan\b/g, "prepare"], [/\bsemua dokumen terkirim\b/gi, "all documents sent"],
  [/\bminggu sebelum mulai\b/gi, "weeks before the start"], [/\bberakhir\b/g, "ends"], [/\bmulai\b/g, "starts"], [/\bdan\b/g, "and"],
  [/\bsaat\b/g, "during"], [/\bhari\b/g, "days"], [/\bke\b/g, "to"], [/\bbelum\b/g, "not yet"], [/\bperlu dikonfirmasi\b/gi, "to be confirmed"],
];
const en = (t) => EN.reduce((x, [re, to]) => x.replace(re, to), String(t || ""));

const DAY = 864e5;
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const parseDate = (t) => {
  t = String(t || "");
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return new Date(+m[1], m[2] - 1, +m[3]);
  m = /(\d{2})\.(\d{2})\.(\d{4})/.exec(t); if (m) return new Date(+m[3], m[2] - 1, +m[1]);
  return null;
};
const daysFrom = (dt) => Math.round((dt - today0()) / DAY);
const inDays = (n) => n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 0 ? `in ${n} days` : `${-n} days ago`;
const go = (view) => `data-go="${view}"`;

// Dismissed "Needs attention" items: key -> until (ms). Stored only on this computer, never in the Vantage data.
const DISMISS = "vantage.dismissed";
const dismissed = () => { try { return JSON.parse(localStorage.getItem(DISMISS)) || {}; } catch { return {}; } };
function dismiss(key){ const d = dismissed(); d[key] = Date.now() + 7 * DAY; try { localStorage.setItem(DISMISS, JSON.stringify(d)); } catch {} }
const isDismissed = (key) => (dismissed()[key] || 0) > Date.now();

// Needs attention, most urgent first. All "no reply" applications collapse into one row, so they cannot bury the rest.
// Is the Today card (feature f16) shown? Answered here from the saved setting, not through the feature scripts: the Dashboard is first drawn
// before they have loaded, and that first paint used to list every overdue step twice (Today and Needs attention).
const todayCardOn = () => { try { return !(prefs.dwHidden || []).includes("today"); } catch { return true; } };
const prefSnooze = () => { try { return prefs.snooze || {}; } catch { return {}; } };
// The next steps that are due or overdue, in one place: the Today card (feature f16) lists them, and Needs attention and Upcoming use the same
// list to leave them out, so a step is shown once. A step that is not here (an Offer, a snoozed step) is shown by Needs attention instead.
const STEP_CLOSED = ["Rejected", "Withdrawn", "No Response"];   // an Offer is still open: its next step ("sign the contract") is in Today
function dueSteps(apps, snoozed, day){
  const out = [];
  apps.forEach(a => {
    const t = !STEP_CLOSED.includes(a.status) && a.due && parseDate(a.due); if (!t) return;
    const n = daysFrom(t), key = `${a.id}:${a.due}`;
    if (n <= 0 && !((snoozed[key] || "") > day)) out.push({key, id:a.id, what:en(a.next) || "", who:a.company, late:Math.max(0, -n), n, rank:a.status === "Offer" ? 0 : /^Interview/.test(a.status) ? 1 : 2});
  });
  // The first one is shown biggest, so it must be the most important: an Offer, then an interview, then the rest; the most overdue first.
  return out.sort((x, y) => x.rank - y.rank || x.n - y.n).slice(0, 8);
}
function attention(d){
  const apps = d.apps || [], items = [], day = iso(new Date()), snz = prefSnooze();
  const inToday = new Set(todayCardOn() ? dueSteps(apps, snz, day).map(x => x.key) : []);
  apps.filter(a => a.due && colOf(a.status) !== "Closed").forEach(a => {
    const t = parseDate(a.due), n = t ? daysFrom(t) : null, key = `${a.id}:${a.due}`;
    // The Today card lists the due and overdue next steps (with tick and snooze); they are not repeated here. A snoozed step stays quiet.
    if (inToday.has(key) || (snz[key] || "") > day) return;
    if (n !== null && n < 0){ items.push({p:1, key:`overdue:${a.id}:${a.due}`, html:`<b>${esc(a.company)}</b>: ${esc(en(a.next) || "task")} was due ${fmtDue(a.due)}`, attr:`data-open="${esc(a.id)}"`}); }
    else if (n !== null && n <= 2 && ["Interview","Offer"].includes(colOf(a.status))){
      const st = a.status === "Offer" ? parseDate(a.start) : null;
      const what = st && +st === +t ? "you start" : (en(a.next) || "due").split(/[.;(]/)[0];
      items.push({p:2, key:`soon:${a.id}:${a.due}`, html:`<b>${esc(a.company)}</b>: ${inDays(n)}, ${esc(what)}`, attr:`data-open="${esc(a.id)}"`});
    }
  });
  if (d.cv_modified && d.raw_facts_modified > d.cv_modified + 60) items.push({p:3, key:`mcv:${d.raw_facts_modified}`, html:`<b>Master CV</b> is older than your raw facts`, attr:go("profil")});
  const ib = (d.inbox || []).length;
  if (ib) items.push({p:4, key:`inbox:${ib}`, html:`<b>${ib} ${ib === 1 ? "file" : "files"}</b> waiting in your Inbox`, attr:go("inbox")});
  const todo = (d.mat_items || []).filter(it => it.kupas === "todo" || it.kupas === "partly");
  if (todo.length) items.push({p:4, key:`kupas:${todo.map(it => it.name + it.kupas).join(",")}`,
    html:`<b>${todo.length} ${todo.length === 1 ? "material" : "materials"}</b> not fully discussed yet <span class="link">Ask Nova →</span>`, attr:`data-chat="raka" data-say="${esc(say("kupas"))}"`});
  const latest = (d.reports || [])[0];
  unanswered(latest, d).forEach(r => items.push({p:3, key:`unans:${latest.date}:${r.perusahaan}`,
    html:`<b>${esc(r.perusahaan)}</b> (${r.skor}) from the ${esc(fmtDue(latest.date))} report: not answered yet`, attr:go("laporan")}));
  const quiet = apps.filter(a => a.status === "Applied").filter(a => { const t = parseDate(a.status_date || a.date); return t && -daysFrom(t) > 14; });
  if (quiet.length) items.push({p:5, key:`noreply:${quiet.map(a => a.id).sort().join(",")}`,
    html:`<b>${quiet.length} ${quiet.length === 1 ? "application" : "applications"}</b> with no reply for 14+ days <span class="link">Review →</span>`, attr:`data-noreply="${esc(quiet.map(a => a.id).join(","))}"`});
  const shown = items.filter(x => !isDismissed(x.key)).sort((a, b) => a.p - b.p);
  return `<section class="panel fill"><div class="head"><h2>Needs attention</h2><span class="cap">${shown.length || ""}</span></div><div class="scroll">` +
    (shown.length ? shown.map(x => `<div class="att" role="button" tabindex="0" ${x.attr}><span class="led${x.p <= 2 ? " on" : ""}"></span><span class="att-t">${x.html}</span><button class="x" data-dismiss="${esc(x.key)}" title="Hide for 7 days">×</button></div>`).join("")
      : '<div class="clear"><b>All clear</b><span>Nothing needs your attention right now.</span></div>') + `</div></section>`;
}

function funnelNums(apps){
  const sent = apps.filter(a => colOf(a.status) !== "Preparing").length;
  const reply = apps.filter(a => ["Interview","Offer"].includes(colOf(a.status)) || a.status === "Rejected").length;
  const intv = apps.filter(a => ["Interview","Offer"].includes(colOf(a.status)) || a.prep).length;
  const offer = apps.filter(a => a.status === "Offer").length;
  return {sent, reply, intv, offer};
}
function funnelHero(apps){
  const {sent, reply, intv, offer} = funnelNums(apps);
  const steps = [["Sent", sent], ["Reply", reply], ["Interview", intv], ["Offer", offer]];
  const max = Math.max(1, sent);
  const rows = steps.map(([l, v], i) => {
    const conv = i ? (steps[i-1][1] ? Math.round(v / steps[i-1][1] * 100) + "%" : "–") : "";
    return `<div class="fn-row"><span class="fn-l">${l}</span><div class="fn-bar"><i style="width:${Math.max(2, v / max * 100)}%"></i></div><span class="fn-v mono">${v}</span><span class="fn-c mono">${conv}</span></div>`;
  }).join("");
  const w = weekly(apps), wm = Math.max(1, ...w);
  const spark = `<svg class="spark" viewBox="0 0 160 30" preserveAspectRatio="none"><polyline fill="none" stroke="var(--ink)" stroke-width="1.5" points="${w.map((v, i) => `${i * (160 / 7)},${28 - v / wm * 26}`).join(" ")}"/><circle cx="160" cy="${28 - w[7] / wm * 26}" r="2.5" fill="var(--accent)"/></svg>`;
  const rate = sent ? Math.round(reply / sent * 100) : 0;
  return `<section class="panel funnel-hero"><div class="head"><h2>Funnel</h2><span class="cap">${apps.length} applications in total</span></div>
    <div class="fh-body"><div class="fh-big"><span class="cap">Response rate</span><b class="mono">${rate}<small>%</small></b><span>${reply} of ${sent} sent got a reply</span></div><div class="fn">${rows}</div></div>
    <div class="fn-week"><span class="cap">Per week</span>${spark}<span class="mono">${w[7]} this week</span></div></section>`;
}

// Hero: the onboarding stepper while setup is incomplete (afterwards the number strip below takes its place).
function hero(d, apps, p){
  const names = ["Setup","Profile","Applications","Interview"];
  const steps = names.map((n,i) => `<div class="step ${i+1 === p.n + 1 ? "active" : p.flags[i] ? "done" : ""}"><b>${i+1}</b>${n}</div>`).join("");
  return `<section class="lcd"><div class="cap">Getting started</div><div class="lcd-big">STEP ${Math.min(4, p.n + 1)} · ${names[Math.min(3, p.n)].toUpperCase()}</div>
    <div class="lcd-sub">Finish the steps to start applying with Nova</div><div class="steps">${steps}</div></section>`;
}
// The numbers that matter, in one row: what is open, what is in interview, how many answered, and the offer if there is one.
function statStrip(d, apps){
  const active = apps.filter(a => ["Sent","Interview"].includes(colOf(a.status)));
  const waiting = active.filter(a => colOf(a.status) === "Sent").length, inInt = active.length - waiting;
  const {sent, reply} = funnelNums(apps), rate = sent ? Math.round(reply / sent * 100) : 0;
  const offer = apps.filter(a => a.status === "Offer").sort((a, b) => appDate(b).localeCompare(appDate(a)))[0];
  const prep = apps.filter(a => colOf(a.status) === "Preparing").length;
  let when = "";
  if (offer){ const st = parseDate(offer.start), n = st ? daysFrom(st) : null; when = st ? `${n >= 0 ? "starts" : "started"} ${st.toLocaleDateString(LOC(), {day:"numeric", month:"short"})}` : "offer received"; }
  const tile = (cap, big, sub, attr = "", cls = "") => `<div class="dstat${cls}" ${attr}><b${cls.includes("txt") ? ' class="dtxt"' : ""}>${big}</b><span class="cap">${cap}</span><small>${sub}</small></div>`;
  return `<div class="dstrip">${tile("Active", active.length, `${waiting} awaiting reply`)}${tile("In interview", inInt, `${prep} in preparation`)}${tile("Reply rate", rate + "%", `${reply} of ${sent} sent`)}` +
    (offer ? tile("Offer", esc(offer.company), esc(when), `data-open="${esc(offer.id)}"`, " hot txt") : tile("Offer", "–", "No offer yet")) + `</div>`;
}

// Upcoming: one chronological list (start dates, interviews, due dates, deadlines), then tasks without a date.
function upcoming(apps){
  const ev = [], undated = [];
  apps.filter(a => colOf(a.status) !== "Closed").forEach(a => {
    const due = parseDate(a.due), start = a.status === "Offer" ? parseDate(a.start) : null, dl = parseDate(a.deadline);
    if (start && daysFrom(start) >= 0) ev.push({t:start, what:`Start at ${a.company}`, sub:a.role, id:a.id});
    // A step that is due or overdue is in Today or Needs attention; Upcoming looks ahead only.
    if (due && !(start && +due === +start)){ if (daysFrom(due) > 0) ev.push({t:due, what:en(a.next) || "Due", sub:a.company, id:a.id}); }
    else if (!due && a.next && !/^awaiting response/i.test(en(a.next))) undated.push(a);
    if (dl && colOf(a.status) === "Preparing") ev.push({t:dl, what:"Application deadline", sub:a.company, id:a.id});
  });
  ev.sort((x, y) => x.t - y.t);
  const evHtml = ev.map(e => { const n = daysFrom(e.t);
    return `<button class="up" data-open="${esc(e.id)}"><span class="upc mono ${n < 0 ? "late" : n <= 2 ? "soon" : ""}">${n < 0 ? -n + "d late" : n === 0 ? "today" : n + "d"}</span><span class="up-t"><b>${esc(e.what)}</b><span>${esc(e.sub)} · ${e.t.toLocaleDateString(LOC(), {day:"numeric", month:"short"})}</span></span></button>`; }).join("");
  const udHtml = undated.map(a => `<button class="up" data-open="${esc(a.id)}"><span class="upc mono nd">—</span><span class="up-t"><b>${esc(en(a.next))}</b><span>${esc(a.company)}</span></span></button>`).join("");
  return `<section class="panel fill"><div class="head"><h2>Upcoming</h2><span class="cap">by date</span></div><div class="scroll">` +
    (evHtml || udHtml ? evHtml + (udHtml ? `<div class="up-sep cap">No date</div>` + udHtml : "") : '<div class="clear"><b>Nothing scheduled</b><span>Interviews, start dates and deadlines appear here.</span></div>') + `</div></section>`;
}

// Score that counts as "Apply" (green): the report's own threshold + 5 (default 80 -> 85).
const lamarAt = (data) => Math.min(100, ((data && data.ambang_skor) || 80) + 5);
// Morning report: compact for now (title, age, counts). A structured view follows once the report template is fixed.
// Dashboard Morning report card: one period at a time (day, week, month, year, all). "Day" shows only today's report;
// when there is none the card says so instead of showing an older one.
const DR = {
  day:{en:"Day", de:"Tag", id:"Hari"}, week:{en:"Week", de:"Woche", id:"Minggu"}, month:{en:"Month", de:"Monat", id:"Bulan"},
  year:{en:"Year", de:"Jahr", id:"Tahun"}, all:{en:"All", de:"Alle", id:"Semua"},
  none:{en:"No Morning Report today", de:"Heute kein Morning Report", id:"Belum ada Morning Report hari ini"},
  noneSub:{en:"The next one arrives with your daily search.", de:"Der nächste kommt mit deiner täglichen Suche.", id:"Berikutnya datang bersama pencarian harian kamu."},
  noneP:{en:"No reports in this period", de:"Keine Reports in diesem Zeitraum", id:"Tidak ada laporan di periode ini"},
  reports:{en:"reports", de:"Reports", id:"laporan"}, report:{en:"report", de:"Report", id:"laporan"}, recs:{en:"recommended", de:"empfohlen", id:"direkomendasikan"},
  best:{en:"Best matches", de:"Beste Treffer", id:"Kecocokan terbaik"}, open:{en:"Open reports →", de:"Reports öffnen →", id:"Buka laporan →"},
};
const dr = (k) => DR[k][lang] || DR[k].en;
const REP_RANGES = ["day", "week", "month", "year", "all"];
function repInRange(iso, range){
  const t = parseDate(iso); if (!t) return false;
  if (range === "all") return true;
  const n = -daysFrom(t);   // days ago
  return range === "day" ? n === 0 : range === "week" ? n >= 0 && n < 7 : range === "month" ? n >= 0 && n < 31 : n >= 0 && n < 366;
}
function repPeriod(d, reps, range){
  const inr = reps.filter(r => repInRange(r.date, range));
  const head = `<div class="head"><h2>Morning report</h2><span class="cap">${inr.length} ${dr(inr.length === 1 ? "report" : "reports")}</span></div><div class="rseg">${REP_RANGES.map(k => `<button class="seg${(state.repRange || "day") === k ? " on" : ""}" data-reprange="${k}">${dr(k)}</button>`).join("")}</div>`;
  if (!inr.length) return `<section class="panel fill">${head}<div class="clear"><b>${dr(range === "day" ? "none" : "noneP")}</b><span>${dr("noneSub")}</span></div></section>`;
  const recs = [];
  inr.forEach(r => ((r.data && r.data.rekomendasi) || []).forEach(rc => recs.push({...rc, date:r.date, amb:lamarAt(r.data)})));
  recs.sort((a, b) => (b.skor || 0) - (a.skor || 0));
  const seen = new Set(), top = recs.filter(rc => { const k = (rc.perusahaan + "|" + rc.posisi).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
  const rows = top.map(rc => `<tr><td><b>${esc(rc.perusahaan)}</b><span>${esc(rc.posisi)}${range === "day" ? "" : " · " + esc(shortDate(rc.date))}</span></td><td class="mono rs ${rc.skor >= rc.amb ? "hi" : "mid"}">${esc(rc.skor ?? "–")}</td></tr>`).join("");
  return `<section class="panel fill rep-card" ${go("laporan")}>${head}
    <div class="rep-c"><div class="rep-n"><span><b class="mono">${seen.size}</b> ${dr("recs")}</span><span><b class="mono">${inr.length}</b> ${dr(inr.length === 1 ? "report" : "reports")}</span></div>
    ${rows ? `<div class="cap" style="margin-top:8px">${dr("best")}</div><table class="rtop3">${rows}</table>` : ""}</div>
    <div class="rep-more">${dr("open")}</div></section>`;
}
function latestReport(d){
  const reps = d.reports || [];
  if (reps.length && reps.every(r => r.data && !r.data.dikonversi_dari_lama)) return repPeriod(d, reps, state.repRange || "day");
  if (reps.length && (state.repRange || "day") !== "day") return repPeriod(d, reps, state.repRange);
  // Old-format reports (converted or plain text) keep the compact card, but still only for today.
  const r = reps.find(x => repInRange(x.date, "day"));
  const head = (cap) => `<div class="head"><h2>Morning report</h2><span class="cap">${cap}</span></div>`;
  if (!r) return repPeriod(d, reps, state.repRange || "day");
  const when = `${esc(shortDate(r.date))} · ${esc(daysAgo(r.date))}`;
  if (r.data && r.data.dikonversi_dari_lama){
    const x = r.data, recs = x.rekomendasi || [];
    const top = recs.slice(0, 3).map(rc => `<tr><td><b>${esc(rc.perusahaan)}</b><span>${esc(rc.posisi)}</span></td><td class="mono rs ${rc.skor >= lamarAt(r.data) ? "hi" : "mid"}">${esc(rc.skor ?? rc.skor_label ?? "–")}</td></tr>`).join("");
    return `<section class="panel fill rep-card" ${go("laporan")}>${head(when + " · converted")}
      <div class="rep-c"><div class="rep-n"><span><b class="mono">${recs.length}</b> listed</span><span><b class="mono">${reps.length}</b> reports</span></div>
      ${top ? `<table class="rtop3">${top}</table>` : ""}<div class="muted" style="font-size:12px">Converted from the old format. No new search or scoring.</div></div>
      <div class="rep-more">Open report →</div></section>`;
  }
  if (r.data){
    const x = r.data, recs = (x.rekomendasi || []).slice().sort((a, b) => b.skor - a.skor), un = unanswered(r, d).length;
    const top = recs.slice(0, 3).map(rc => `<tr><td><b>${esc(rc.perusahaan)}</b><span>${esc(rc.posisi)}</span></td><td class="mono rs ${rc.skor >= lamarAt(r.data) ? "hi" : "mid"}">${rc.skor}</td><td><span class="ra a-${esc(rc.aksi.toLowerCase())}">${RLBL[rc.aksi] || esc(rc.aksi)}</span></td></tr>`).join("");
    return `<section class="panel fill rep-card" ${go("laporan")}>${head(when)}
      <div class="rep-c"><div class="rep-n"><span><b class="mono">${recs.length}</b> recommended</span><span><b class="mono">${(x.perlu_aksi || []).length}</b> actions</span><span><b class="mono ${un ? "warn-t" : ""}">${un}</b> not answered</span></div>
      ${top ? `<table class="rtop3">${top}</table>` : `<div class="clear"><span>No new postings ≥${x.ambang_skor} that day.</span></div>`}</div>
      <div class="rep-more">Open report →</div></section>`;
  }
  const rows = r.text.split(/\r?\n/).filter(l => /^\s*\|/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l));
  const tables = r.text.split(/\r?\n/).filter((l, i, a) => /^\s*\|/.test(l) && !/^\s*\|/.test(a[i - 1] || "")).length;
  return `<section class="panel fill rep-card" ${go("laporan")}>${head(when + " · legacy format")}
    <div class="rep-c"><div class="rep-n"><span><b class="mono">${Math.max(0, rows.length - tables)}</b> postings</span><span><b class="mono">${reps.length}</b> reports</span></div>
    <div class="muted" style="font-size:12px">Older report format. New reports show the top recommendations here.</div></div>
    <div class="rep-more">Open reports →</div></section>`;
}

function dash(d){
  setTimeout(loadDashExtras, 0);
  const apps = d.apps || [], p = phase(d), fn = funnelNums(apps);
  const ready = p.flags[0] && p.flags[1] && p.flags[2];
  // The strip is outside .dashwrap so the Dashboard layout (f21) can put the Today card right under it.
  return `${ready ? statStrip(d, apps) : ""}<div class="dashwrap">
  ${ready ? "" : hero(d, apps, p)}
  <div class="grid g-bot">
    <div class="stack">${attention(d)}<section class="panel dmini" id="dSkills" ${go("skill")}></section></div>
    <div class="stack">${upcoming(apps)}</div>
    <div class="stack">${latestReport(d)}<section class="panel dmini" id="dPlan"></section></div>
  </div>
  ${fn.sent ? `<details class="dfun"><summary><b>Funnel</b><span>${fn.sent} sent · ${fn.reply} replies · ${fn.intv} interviews · ${fn.offer} ${fn.offer === 1 ? "offer" : "offers"}</span></summary>${funnelHero(apps)}</details>` : ""}
  </div>`;
}
// Two compact Dashboard cards from the Skills data (JD_Insights + recommended_skill_for_you). Real data only:
// no progress figures, because none are recorded.
const DM = {
  skT: {en:"Skills to close", de:"Skills zum Aufholen", id:"Skill yang perlu dikejar"},
  skNone: {en:"No skill gaps recorded yet.", de:"Noch keine Skill-Lücken erfasst.", id:"Belum ada skill gap yang tercatat."},
  ads: {en:"ads", de:"Anzeigen", id:"lowongan"},
  plT: {en:"Study plan", de:"Lernplan", id:"Rencana belajar"},
  plNone: {en:"No study plan yet.", de:"Noch kein Lernplan.", id:"Belum ada rencana belajar."},
  plAsk: {en:"Ask Nova for one", de:"Nova fragen", id:"Minta ke Nova"},
  all: {en:"All skills →", de:"Alle Skills →", id:"Semua skill →"},
};
const dm = (k) => DM[k][lang] || DM[k].en;
async function loadDashExtras(){
  if (state.view !== "dash" || !$("dSkills")) return;
  let gaps = [], plans = [];
  if (invoke){
    try { gaps = await invoke("skill_gaps", {root:folder}); } catch {}
    try { plans = await invoke("dir_files", {root:folder, rel:PLAN_DIR}); } catch {}
  } else gaps = MOCK_GAPS;
  if (!$("dSkills") || !$("dPlan")) return;
  const ads = new Set(); gaps.forEach(g => g.mentioned.forEach(m => ads.add(skMention(m).ad.toLowerCase())));
  const n = ads.size >= Math.max(0, ...gaps.map(g => g.count)) ? ads.size : 0;
  const top = gaps.slice(0, 3);
  $("dSkills").innerHTML = `<div class="head"><h2>${dm("skT")}</h2><span class="cap">${dm("all")}</span></div>` +
    (top.length ? top.map(g => `<div class="dmrow"><span>${esc(g.skill.split("(")[0].trim())}</span><span class="mono">${g.count}${n ? ` ${sk("of")} ${n}` : ""} ${dm("ads")}</span></div>`).join("")
      : `<div class="dmrow muted">${dm("skNone")}</div>`);
  const pdfs = plans.filter(f => !f.path.includes("/") && /\.pdf$/i.test(f.path)).sort((a, b) => b.modified - a.modified);
  const p = pdfs[0];
  const next = gaps.find(g => !/^(ya|yes|ja)\b/i.test(g.discussed));
  $("dPlan").innerHTML = `<div class="head"><h2>${dm("plT")}</h2>${pdfs.length > 1 ? `<span class="cap">${pdfs.length}</span>` : ""}</div>` +
    (p ? `<button class="frow dmplan" data-viewfile="${esc(PLAN_DIR + p.path)}"><span>${esc(p.path.replace(/\.pdf$/i, "").replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/_/g, " "))}</span><span class="mono">${esc(fmtDay(p.modified))}</span></button>`
       : `<div class="dmrow"><span class="muted">${dm("plNone")}</span>${next ? `<button class="btn sm" data-chat="lamaran" data-send="1" data-agent="arga" data-say="${esc(say("studyplan", next.skill))}">${dm("plAsk")}</button>` : ""}</div>`);
}

// Date filter for the pipeline: the last status change, or the day the posting was found.
const RANGES = [["today","Today"],["week","This week"],["month","This month"],["year","This year"],["all","All"]];
const iso = (dt) => dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0");
function inRange(a, r){
  if (r === "all") return true;
  const d = (a.status_date || a.date || "").slice(0, 10); if (!d) return false;
  const now = new Date(), t = iso(now);
  if (r === "today") return d === t;
  if (r === "month") return d.slice(0, 7) === t.slice(0, 7);
  if (r === "year") return d.slice(0, 4) === t.slice(0, 4);
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  return d >= iso(mon) && d <= t;
}
function pipelinePage(d){
  const ids = state.pipeIds;
  const apps = (d.apps || []).filter(a => inRange(a, state.range) && (!ids || ids.includes(String(a.id))));
  const board = COLS.map(c => {
    const list = apps.filter(a => c.m.includes(a.status)).sort((a,b) => b.fit - a.fit);
    return `<div class="col" data-col="${c.k}"><div class="col-h"><span>${c.k}</span><span>${list.length}</span></div>` +
           (list.map(card).join("") || '<div class="none">Empty</div>') + `</div>`;
  }).join("");
  const def = rangeDefault();
  const bar = RANGES.map(([k, l]) => `<button class="seg ${state.range === k ? "on" : ""}" data-range="${k}" title="Shows applications whose last activity (status change, else found date) is in this period. Right-click to make it the default.">${l}${k === def ? '<i class="defdot" title="Default"></i>' : ""}</button>`).join("");
  const banner = ids ? `<div class="fbanner">Showing ${apps.length} applications with no reply for 14+ days <button class="btn" data-clearfilter>Show all</button></div>` : "";
  return `<section class="panel">${banner}<div class="head hhint"><div class="segs">${bar}</div><span class="cap boardhint">click a card for details · drag it to move · right-click to open its folder</span></div><div class="board" id="board">${board}</div></section>`;
}

const SENT_LIKE = (a) => colOf(a.status) !== "Preparing";
// Sorting for the Applications list, remembered on this computer.
const SORT = "vantage.sort";
const STATUS_ORDER = ["Offer","Interview R2","Interview R1","Interview","Assessment","Screening","Applied","Draft","No Response","Withdrawn","Rejected"];
const getSort = () => { try { return JSON.parse(localStorage.getItem(SORT)) || {by:"date", desc:true}; } catch { return {by:"date", desc:true}; } };
const setSort = (v) => { try { localStorage.setItem(SORT, JSON.stringify(v)); } catch {} };
const appDate = (a) => (a.status_date || a.date || "").slice(0, 10);
function sortApps(list){
  const {by, desc} = getSort(), dir = desc ? -1 : 1;
  const key = {date: a => appDate(a), name: a => a.company.toLowerCase(), match: a => a.fit, status: a => { const i = STATUS_ORDER.indexOf(a.status); return i < 0 ? 99 : i; }}[by] || (a => appDate(a));
  return list.slice().sort((a, b) => { const x = key(a), y = key(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || a.company.localeCompare(b.company); });
}
// Group header for date sorting, from the date the list is sorted by (last status change, else found date).
function dateGroup(iso){
  const t = parseDate(iso); if (!t) return "No date";
  const n = -daysFrom(t), now = today0(), mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  if (n <= 0) return "Today";
  if (t >= mon) return "This week";
  const lastMon = new Date(mon); lastMon.setDate(mon.getDate() - 7);
  if (t >= lastMon) return "Last week";
  return t.toLocaleDateString(LOC(), {month:"long", year:"numeric"});
}
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const shortDate = (iso) => { const t = parseDate(iso); return t ? t.getDate() + " " + MON[t.getMonth()] : ""; };
// Applications tab: one set of applications, two views (Board = pipeline columns, List = table).
const APPS_MODE_KEY = "vantage.appsMode";
function getAppsMode(){ try { return localStorage.getItem(APPS_MODE_KEY) === "list" ? "list" : "board"; } catch { return "board"; } }
function setAppsMode(m){ try { localStorage.setItem(APPS_MODE_KEY, m); } catch {} }
function lamaranPage(d){
  const m = getAppsMode();
  const L = {board:{en:"Board", de:"Board", id:"Papan"}, list:{en:"List", de:"Liste", id:"Daftar"}};
  const I = {board:ICONS.cols, list:ICONS.list};
  const seg = (k) => `<button class="am-b ${m === k ? "on" : ""}" data-amode="${k}"><svg viewBox="0 0 16 16">${I[k]}</svg>${L[k][lang] || L[k].en}</button>`;
  const V = {en:"View", de:"Ansicht", id:"Tampilan"};
  return `<div class="amode" id="amode"><span class="cap">${V[lang] || V.en}</span><div class="am-sw">${seg("board")}${seg("list")}</div></div>` + (m === "board" ? pipelinePage(d) : table(d));
}
// Skills tab texts (EN/DE/ID). Data: skill-gap table in JD_Insights.md (updated after every job ad analysis)
// and the study plans in recommended_skill_for_you/. Nothing here is estimated: missing values show as "–".
const SK = {
  title:   {en:"Skill gaps from your job ads", de:"Skill-Lücken aus deinen Stellenanzeigen", id:"Skill gap dari lowongan yang dianalisis"},
  intro:   {en:"Each analysed job ad records the skills you could not yet back with evidence. Skills asked for most often are the best ones to learn next.",
            de:"Jede analysierte Stellenanzeige hält fest, welche Skills du noch nicht belegen kannst. Die am häufigsten verlangten lohnen sich zuerst.",
            id:"Setiap lowongan yang dianalisis mencatat skill yang belum bisa kamu buktikan. Skill yang paling sering diminta paling layak dipelajari duluan."},
  gaps:    {en:"Skill gaps", de:"Skill-Lücken", id:"Skill gap"},
  high:    {en:"High priority", de:"Hohe Priorität", id:"Prioritas tinggi"},
  ads:     {en:"Job ads in log", de:"Anzeigen im Log", id:"Lowongan di log"},
  plans:   {en:"Study plans", de:"Lernpläne", id:"Rencana belajar"},
  all:     {en:"All", de:"Alle", id:"Semua"},
  fnd:     {en:"Not discussed", de:"Nicht besprochen", id:"Belum dibahas"},
  fplan:   {en:"Plan ready", de:"Plan vorhanden", id:"Rencana siap"},
  f5:      {en:"In 5+ ads", de:"In 5+ Anzeigen", id:"Di 5+ lowongan"},
  cSkill:  {en:"Skill", de:"Skill", id:"Skill"},
  cAsked:  {en:"Asked in", de:"Verlangt in", id:"Diminta di"},
  cPrio:   {en:"Priority", de:"Priorität", id:"Prioritas"},
  cStatus: {en:"Status", de:"Status", id:"Status"},
  cSeen:   {en:"Seen at", de:"Gesehen bei", id:"Muncul di"},
  cLast:   {en:"Last seen", de:"Zuletzt", id:"Terakhir"},
  cPlan:   {en:"Plan", de:"Plan", id:"Rencana"},
  legend:  {en:"Bar = how often a skill is asked for compared with the most requested one; the number is the exact count. Click a row for details.",
            de:"Balken = wie oft ein Skill im Vergleich zum meistverlangten gefragt wird; die Zahl ist der genaue Wert. Zeile anklicken für Details.",
            id:"Bar = seberapa sering skill diminta dibanding yang paling sering; angkanya jumlah persisnya. Klik baris untuk detail."},
  prioTip: {en:"High: asked for in 5 or more job ads (Nova then offers a study plan). Medium: 2 to 4. Low: once.",
            de:"Hoch: in 5 oder mehr Anzeigen verlangt (Nova bietet dann einen Lernplan an). Mittel: 2 bis 4. Niedrig: einmal.",
            id:"Tinggi: diminta di 5 lowongan atau lebih (Nova lalu menawarkan rencana belajar). Sedang: 2 sampai 4. Rendah: sekali."},
  pH: {en:"High", de:"Hoch", id:"Tinggi"}, pM: {en:"Medium", de:"Mittel", id:"Sedang"}, pL: {en:"Low", de:"Niedrig", id:"Rendah"},
  sPlan: {en:"Plan ready", de:"Plan vorhanden", id:"Rencana siap"}, sYes: {en:"Discussed", de:"Besprochen", id:"Sudah dibahas"}, sNo: {en:"Not discussed", de:"Nicht besprochen", id:"Belum dibahas"},
  sugg:  {en:"Suggestion", de:"Empfehlung", id:"Saran"}, seenAll: {en:"Asked for in", de:"Verlangt in", id:"Diminta di"}, first: {en:"First seen", de:"Zuerst", id:"Pertama"},
  empty: {en:"No skill gaps recorded yet. They appear here after Nova analyses job ads for you: paste a job ad into the chat or run the Morning Report.",
          de:"Noch keine Skill-Lücken erfasst. Sie erscheinen, sobald Nova Stellenanzeigen für dich analysiert: Anzeige in den Chat einfügen oder den Morgenbericht starten.",
          id:"Belum ada skill gap yang tercatat. Akan muncul setelah Nova menganalisis lowongan untukmu: tempel lowongan di chat atau jalankan Morning Report."},
  noMatch: {en:"No skill matches this filter.", de:"Kein Skill passt zu diesem Filter.", id:"Tidak ada skill yang cocok dengan filter ini."},
  noPlan: {en:"No study plan yet.", de:"Noch kein Lernplan.", id:"Belum ada rencana belajar."},
  ask:   {en:"Ask Nova for a study plan:", de:"Nova um einen Lernplan bitten:", id:"Minta rencana belajar ke Nova:"},
  of:    {en:"of", de:"von", id:"dari"},
};
const sk = (k) => SK[k][lang] || SK[k].en;
const MOCK_GAPS = [
  {skill:"Power BI (advanced)", count:6, mentioned:["Halden Software – Data Governance (02-10)","Lumen Energie – SAP EWM (09-10)"], discussed:"Yes, 2026-10-08 + PDF", advice:"Microsoft PL-300 certification"},
  {skill:"PowerPoint (consulting level)", count:4, mentioned:["Kestrel Logistics – SAP Logistics (18-09)"], discussed:"Not yet", advice:"Two portfolio decks from real projects"},
  {skill:"Jira / Agile", count:2, mentioned:["Orbis Retail – CRM (09-10)"], discussed:"Not yet", advice:"Basic familiarisation"},
  {skill:"Celonis", count:1, mentioned:[], discussed:"Not yet", advice:"-"},
];
const PLAN_DIR = "01_user_documents/recommended_skill_for_you/";
let skData = null;
function skillPage(d){
  setTimeout(loadSkills, 0);
  return `<div class="skills"><section class="panel phead" id="skHead"><div class="empty">Loading…</div></section><div id="skBody"></div></div>`;
}
// Normalised name used to match a skill with a study plan file ("Power BI (advanced)" -> "powerbi").
const skKey = (n) => n.split(/[(/]/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
// "UniCredit – Corporate Lending (21-09)" -> company "UniCredit", day "21-09"
function skMention(m){
  const dm = /\((\d{1,2})-(\d{1,2})\)\s*$/.exec(m);
  return {ad: m.replace(/\s*\(\d{1,2}-\d{1,2}\)\s*$/, "").trim(), company: m.split(/\s+[–-]\s+/)[0].trim(), day: dm ? +dm[1] : null, month: dm ? +dm[2] : null};
}
async function loadSkills(){
  if (state.view !== "skill" || !$("skBody")) return;
  let gaps = [], plans = [];
  if (invoke){
    try { gaps = await invoke("skill_gaps", {root:folder}); } catch {}
    try { plans = await invoke("dir_files", {root:folder, rel:PLAN_DIR}); } catch {}
  } else gaps = MOCK_GAPS;
  if (state.view !== "skill" || !$("skBody")) return;
  const byStem = {};
  plans.filter(f => !f.path.includes("/")).forEach(f => { const st = f.path.replace(/\.[^.]+$/, ""); if (!byStem[st] || /\.pdf$/i.test(f.path)) byStem[st] = f; });
  plans = Object.values(byStem).sort((a, b) => b.modified - a.modified);
  const ads = new Set();
  const rows = gaps.map(g => {
    const ms = g.mentioned.map(skMention); ms.forEach(m => ads.add(m.ad.toLowerCase()));
    const dated = ms.filter(m => m.day).map(m => m.month * 100 + m.day).sort((a, b) => a - b);
    const key = skKey(g.skill);
    const plan = key.length >= 3 ? plans.find(f => f.path.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key)) : null;
    const yes = /^(ya|yes|ja)\b/i.test(g.discussed);
    return {...g, ms, companies:[...new Set(ms.map(m => m.company))], first: dated[0] || null, last: dated[dated.length - 1] || null,
            plan, status: plan ? "plan" : yes ? "yes" : "no", prio: g.count >= 5 ? 3 : g.count >= 2 ? 2 : 1};
  });
  skData = {rows, plans, nAds: ads.size};
  const high = rows.filter(r => r.prio === 3).length;
  const tile = (k, v, sub) => `<div class="ptile"><span class="cap">${k}</span><b class="mono">${v}</b><span>${sub}</span></div>`;
  $("skHead").innerHTML = `<div class="pid"><div><h2>${sk("title")}</h2><div class="muted">${sk("intro")}</div></div></div>
    <div class="ptiles">${tile(sk("gaps"), rows.length, "")}${tile(sk("high"), high, "5+ ads")}${tile(sk("ads"), skData.nAds || "–", "")}${tile(sk("plans"), plans.length, "")}</div>`;
  drawSkills();
}
const skDate = (v) => v ? `${v % 100} ${MON[Math.floor(v / 100) - 1] || ""}` : "–";
function drawSkills(){
  if (!skData || !$("skBody")) return;
  const {rows, plans} = skData;
  // "x of N" only when N (job ads named in the log) is a valid total for every row.
  const nAds = skData.nAds >= Math.max(0, ...rows.map(r => r.count)) ? skData.nAds : 0;
  if (!rows.length){ $("skBody").innerHTML = `<section class="panel"><div class="empty">${sk("empty")}</div></section>`; return; }
  const f = state.skFilter || "all", so = state.skSort || {k:"count", desc:true};
  const pass = (r) => f === "all" || (f === "no" && r.status === "no") || (f === "plan" && r.status === "plan") || (f === "5" && r.count >= 5);
  const val = {skill:r => r.skill.toLowerCase(), count:r => r.count, prio:r => r.prio, status:r => ({plan:3, yes:2, no:1})[r.status], seen:r => r.companies.length, last:r => r.last || 0};
  const list = rows.filter(pass).sort((a, b) => { const x = val[so.k](a), y = val[so.k](b); return (x < y ? -1 : x > y ? 1 : 0) * (so.desc ? -1 : 1) || b.count - a.count; });
  const max = Math.max(1, ...rows.map(r => r.count));
  const th = (k, label, tip) => `<th data-sksort="${k}" class="${so.k === k ? "on" : ""}"${tip ? ` title="${esc(tip)}"` : ""}>${label}${so.k === k ? (so.desc ? " ↓" : " ↑") : ""}</th>`;
  const prio = (p) => `<span class="prio p${p}" title="${esc(sk("prioTip"))}">${sk(p === 3 ? "pH" : p === 2 ? "pM" : "pL")}</span>`;
  const status = (r) => `<span class="sst s-${r.status}">${sk(r.status === "plan" ? "sPlan" : r.status === "yes" ? "sYes" : "sNo")}</span>`;
  const seen = (r) => r.companies.length ? esc(r.companies.slice(0, 2).join(", ")) + (r.companies.length > 2 ? ` <span class="muted">+${r.companies.length - 2}</span>` : "") : "–";
  const planCell = (r) => r.plan ? `<button class="linkbtn" data-viewfile="${esc(PLAN_DIR + r.plan.path)}">PDF</button>` : "–";
  const body = list.map((r, i) => `<tr class="skr${state.skOpen === r.skill ? " open" : ""}" data-skrow="${esc(r.skill)}">
      <td class="skn">${esc(r.skill)}</td>
      <td class="ska"><i class="sk-bar"><em style="width:${Math.round(r.count / max * 100)}%"></em></i><b class="mono">${r.count}</b>${nAds ? `<span class="muted mono"> ${sk("of")} ${nAds}</span>` : ""}</td>
      <td>${prio(r.prio)}</td><td>${status(r)}</td><td class="sks">${seen(r)}</td><td class="mono">${skDate(r.last)}</td><td>${planCell(r)}</td></tr>` +
    (state.skOpen === r.skill ? `<tr class="skd"><td colspan="7"><div><span class="cap">${sk("sugg")}</span> ${r.advice && r.advice !== "-" ? esc(r.advice) : "–"}</div>
      <div><span class="cap">${sk("seenAll")}</span> ${r.ms.length ? r.ms.map(m => esc(m.ad) + (m.day ? ` <span class="muted mono">(${m.day} ${MON[m.month - 1]})</span>` : "")).join(" · ") : "–"}</div>
      <div><span class="cap">${sk("first")}</span> <span class="mono">${skDate(r.first)}</span></div></td></tr>` : "")).join("");
  const chips = [["all", sk("all")], ["no", sk("fnd")], ["plan", sk("fplan")], ["5", sk("f5")]].map(([k, l]) => `<button class="seg ${f === k ? "on" : ""}" data-skfilter="${k}">${l}</button>`).join("");
  const next = rows.filter(r => r.status === "no").sort((a, b) => b.count - a.count)[0];
  $("skBody").innerHTML = `<div class="sk-two"><section class="panel"><div class="head"><div class="segs">${chips}</div><span class="cap">${list.length} / ${rows.length}</span></div>
      ${list.length ? `<table class="sktable"><thead><tr>${th("skill", sk("cSkill"))}${th("count", sk("cAsked"))}${th("prio", sk("cPrio"), sk("prioTip"))}${th("status", sk("cStatus"))}${th("seen", sk("cSeen"))}${th("last", sk("cLast"))}<th>${sk("cPlan")}</th></tr></thead><tbody>${body}</tbody></table>`
        : `<div class="empty">${sk("noMatch")}</div>`}
      <div class="sk-leg muted">${sk("legend")}</div></section>
    <section class="panel"><div class="head"><h2>${sk("plans")}</h2></div>
      ${plans.length ? plans.map(p => `<button class="frow" ${/\.pdf$/i.test(p.path) ? `data-viewfile="${esc(PLAN_DIR + p.path)}"` : `data-openfile="${esc(PLAN_DIR + p.path)}"`} data-ufolder="${esc(PLAN_DIR + p.path)}"><span>${esc(p.path.replace(/\.[^.]+$/, "").replace(/^\d{4}-\d{2}-\d{2}_/, "").replace(/_/g, " "))}</span><span class="mono">${esc(fmtDay(p.modified))}</span></button>`).join("") : `<div class="empty">${sk("noPlan")}</div>`}
      ${next ? `<div class="sk-ask"><span class="muted">${sk("ask")}</span><button class="btn" data-chat="lamaran" data-send="1" data-agent="arga" data-say="${esc(say("studyplan", next.skill))}">${esc(next.skill)}</button></div>` : ""}</section></div>`;
}

function table(d){
  const apps = sortApps(d.apps || []), so = getSort();
  if (!apps.length) return '<section class="panel"><div class="empty">No applications yet. Send a job posting to Nova in the chat to get started.</div></section>';
  const opts = [["date","Date"],["name","Name"],["match","Match score"],["status","Status"]].map(([k, l]) => `<option value="${k}" ${so.by === k ? "selected" : ""}>${l}</option>`).join("");
  const missing = apps.filter(a => a.missing).length;
  let last = null;
  const rows = apps.map(a => {
    const g = so.by === "date" ? dateGroup(appDate(a)) : null;
    const head = g && g !== last ? `<div class="agroup">${esc(g)}</div>` : "";
    last = g;
    const dates = `found ${shortDate(a.date) || "—"}${a.status_date && a.status_date !== a.date ? ` · status ${shortDate(a.status_date)}` : ""}`;
    return head + `<button class="arow${a.missing ? " gone" : ""}"${folderAttr(a)} data-open="${esc(a.id)}">` +
      `<span class="l1"><b>${esc(a.company)}</b>${chip(a.status)}${a.missing ? '<span class="st st-rej">Folder missing</span>' : ""}<span class="mono adate">${dates}</span><span class="mono fitv">${pct(a.fit)}%</span></span>` +
      `<span class="l2">${esc(a.role)}</span>` +
      `<span class="l3">${esc([a.type, a.location, a.next ? "Next: " + en(a.next) : ""].filter(Boolean).join(" · "))}${a.due ? ` <span class="mono">(${fmtDue(a.due)})</span>` : ""}</span></button>`;
  }).join("");
  return `<section class="panel"><div class="head"><h2>All applications <span class="cap">${apps.length}</span></h2><div class="sortbar"><span class="cap">Sort by</span><select class="field sortsel" id="sortBy">${opts}</select><button class="btn sortdir" id="sortDir" title="${so.desc ? "Descending" : "Ascending"}">${so.desc ? "↓" : "↑"}</button></div></div>` +
    (missing ? `<div class="fbanner">${missing} ${missing === 1 ? "application points" : "applications point"} to a folder that no longer exists (deleted in Finder?). Open one to remove it from the tracker.</div>` : "") +
    `<div class="alist">${rows}</div></section>`;
}

// Detail drawer for one application: all tracker fields, its documents and an in-app viewer.
const fileName = (p) => p.split("/").pop();
// Files that are only working material (sources, drafts in Word, data) are folded away by default.
const WORK_FILE = /\.(json|docx?|xlsx?|csv|txt|html?|py|js|css|log)$/i;
async function openApp(id){
  const a = (state.data.apps || []).find(x => String(x.id) === String(id)); if (!a) return;
  state.open = a;
  const field = (k, v) => v ? `<div class="kv"><span>${k}</span><div>${esc(v)}</div></div>` : "";
  $("drawer").innerHTML = `<div class="dr-head"><div><h2>${esc(a.company_full || a.company)}</h2><div class="muted">${esc(a.role)}</div></div><button class="btn" id="drClose">Close</button></div>
    <div class="dr-body"><div class="dr-info">
      <div class="dr-tags">${chip(a.status)}<span class="mono">${pct(a.fit)}% match</span><span class="mono">${esc(a.type)}</span></div>
      ${a.missing ? `<div class="miss">The folder for this application no longer exists. <button class="btn" data-rmapp="${esc(a.id)}">Remove from tracker</button></div>` : ""}
      ${field("Next step", en(a.next))}${field("Due", a.due)}${field("Location", a.location)}${field("Start", a.start)}${field("Duration", a.duration)}
      ${field("Found", a.date)}${field("Status since", a.status_date)}${field("Deadline", a.deadline)}${field("Source", a.source)}
      ${a.link ? `<div class="kv"><span>Job posting</span><div><a href="#" data-url="${esc(a.link)}">${esc(a.link.replace(/^https:\/\/(www\.)?/, "").split("/")[0])} ↗</a></div></div>` : ""}
      ${field("Notes", a.notes)}
      <div class="cap" style="margin:16px 0 6px">Documents</div><div id="drFiles" class="muted">${a.folder ? "Loading…" : "No folder for this application."}</div>
    </div><div class="dr-view" id="drView"><div class="empty">Select a document to preview it here.</div></div></div>`;
  $("drawer").hidden = false; $("scrim").hidden = false;
  if (!a.folder || !invoke) return;
  let files = [];
  try { files = await invoke("app_files", {root:folder, folder:a.folder}); } catch (e){ $("drFiles").textContent = String(e); return; }
  if (state.open !== a) return;
  const base = "02_workflow/" + a.folder + "/";
  const finals = files.filter(f => f.section === "02_ready_to_send" && !WORK_FILE.test(f.path));
  // One documents list: final PDFs (badge Ready to send / Sent), then analysis and preparation. Drafts are the
  // working versions of the finals, so with finals present they go to "Working files" with everything technical.
  const isWork = (f) => WORK_FILE.test(f.path) || (f.section === "00_Draft" && finals.length > 0);
  const main = files.filter(f => !isWork(f)), work = files.filter(isWork);
  const label = {"02_ready_to_send": SENT_LIKE(a) ? "Sent" : "Ready to send", "00_Draft":"Draft", "01_Analisis":"Analysis", "Interview_Prep":"Interview prep", "Onboarding":"Onboarding"};
  const order = ["02_ready_to_send","00_Draft","01_Analisis","Interview_Prep","Onboarding"];
  main.sort((x, y) => (order.indexOf(x.section) + 1 || 50) - (order.indexOf(y.section) + 1 || 50) || x.path.localeCompare(y.path));
  const row = (f) => `<button class="frow" data-file="${esc(base + f.path)}" data-ufolder="${esc(base + f.path)}" title="${esc(f.path)}"><span>${esc(fileName(f.path))}</span>` +
    `${label[f.section] ? `<span class="ftag ${f.section === "02_ready_to_send" ? (SENT_LIKE(a) ? "sent" : "ready") : ""}">${label[f.section]}</span>` : ""}<span class="mono">${fmtSize(f.kb)}</span></button>`;
  $("drFiles").innerHTML = (main.map(row).join("") || '<div class="muted">No documents yet.</div>') +
    (work.length ? `<details class="fgroup"><summary class="fg-h">Working files <span class="mono">${work.length}</span></summary>${work.map(row).join("")}</details>` : "");
  const first = finals.find(f => /\.pdf$/i.test(f.path)) || main.find(f => /\.pdf$/i.test(f.path));
  if (first) showFile(base + first.path);
}
function closeApp(){ state.open = null; $("drawer").hidden = true; $("scrim").hidden = true; }
let blobUrl = null;
async function showFile(rel, target = "drView"){
  document.querySelectorAll(".frow").forEach(b => b.classList.toggle("on", b.dataset.file === rel));
  const v = $(target); if (!v || !invoke) return;
  v.innerHTML = '<div class="empty">Loading…</div>';
  let p;
  try { p = await invoke("preview_file", {root:folder, rel}); } catch (e){ v.innerHTML = `<div class="empty">${esc(String(e))}</div>`; return; }
  if (blobUrl){ URL.revokeObjectURL(blobUrl); blobUrl = null; }
  const openBtn = `<div class="v-bar"><span class="mono">${esc(fileName(rel))}</span><button class="btn" data-openfile="${esc(rel)}">Open</button></div>`;
  if (p.kind === "pdf" || p.kind === "image"){
    const bin = atob(p.data), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    blobUrl = URL.createObjectURL(new Blob([bytes], {type:p.mime}));
    v.innerHTML = openBtn + (p.kind === "pdf" ? `<iframe class="pdf" src="${blobUrl}"></iframe>` : `<div class="imgv"><img src="${blobUrl}" alt=""></div>`);
  } else if (p.kind === "text"){
    v.innerHTML = openBtn + `<div class="report">${/\.md$/i.test(rel) ? md(p.data) : `<pre>${esc(p.data)}</pre>`}</div>`;
  } else {
    v.innerHTML = openBtn + '<div class="empty">This file type cannot be previewed here. Click Open to view it.</div>';
  }
}

function interviewPage(d){
  const list = (d.apps || []).filter(a => a.prep || ["Interview","Offer"].includes(colOf(a.status)));
  const chat = '<aside class="nembed" data-embed="laras"></aside>';
  if (!list.length) return '<div class="ivlay"><section class="panel"><div class="empty">No interview preparation yet. It will appear once an application reaches the Interview stage.</div></section>' + chat + '</div>';
  setTimeout(loadIvDocs, 0);
  return '<div class="ivlay"><section class="panel"><div class="head"><h2>Interview preparation</h2><span class="cap">'+list.length+' applications</span></div><div class="list">' +
    list.map(a => `<div class="card"${folderAttr(a)}><div class="ivtop"><b>${esc(a.company)}</b><button class="btn primary" data-chat="laras" data-send="1" data-say="${esc(say("interviewGo", a.company_full || a.company, a.role))}">Let's prepare this interview</button></div><span class="r">${esc(a.role)}</span><div class="m"><span>${esc(a.status)}${a.prep ? " · materials ready" : ""}</span><span class="fit">${pct(a.fit)}%</span></div>${a.next ? `<div class="r wrap">Next step: ${esc(en(a.next))}${a.due ? " (" + fmtDue(a.due) + ")" : ""}</div>` : ""}<div class="ivdocs" data-ivdocs="${esc(a.folder || "")}"></div></div>`).join("") + '</div></section>' + chat + '</div>';
}
// The prep dossier (PDF) and other documents Laras made for each application, found in its Interview_Prep folder.
async function loadIvDocs(){
  if (state.view !== "interview" || !invoke || !folder) return;
  for (const el of document.querySelectorAll("[data-ivdocs]")){
    const f = el.dataset.ivdocs; if (!f) continue;
    let files = []; try { files = await invoke("dir_files", {root:folder, rel:"02_workflow/" + f + "/Interview_Prep"}); } catch {}
    if (state.view !== "interview" || !el.isConnected) return;
    const pdfs = files.filter(x => /\.pdf$/i.test(x.path)).sort((a, b) => b.modified - a.modified);
    el.innerHTML = pdfs.length ? pdfs.map(x => `<button class="chip" data-viewfile="02_workflow/${esc(f)}/Interview_Prep/${esc(x.path)}" title="${esc(x.path)}">${esc(x.path.replace(/\.pdf$/i, "").replace(/_/g, " "))}</button>`).join("") : "";
  }
}

const KT = {
  note: {en:(n) => `${n} ${n === 1 ? "material has" : "materials have"} no status yet: this folder was made before status tracking.`,
         de:(n) => `${n} ${n === 1 ? "Material hat" : "Materialien haben"} noch keinen Status: Dieser Ordner entstand vor der Statusverfolgung.`,
         id:(n) => `${n} bahan belum punya status: folder ini dibuat sebelum ada pelacakan status.`},
  btn:  {en:"Ask Raka to fill it in", de:"Raka bitten, es auszufüllen", id:"Minta Raka mengisinya"},
};
const kt = (k, ...a) => { const t = KT[k][lang] || KT[k].en; return typeof t === "function" ? t(...a) : t; };
const GROUPS = {EDU:"Education", PROJ:"Projects", ORG:"Organisations", WORK:"Work experience", EXP:"Experience", CERT:"Certificates", SKILL:"Skills", "00":"Basics"};
const GROUP_ORDER = ["00","EDU","PROJ","WORK","EXP","ORG","CERT","SKILL"];
// Category folders inside materials/ (education/, research/, workflow_import/ ...): one group each, one entry per sub-folder.
const CATS = {education:"Education", research:"Research projects", projects:"Projects", project:"Projects", work:"Work experience", experience:"Experience",
  organisations:"Organisations", organizations:"Organisations", org:"Organisations", certificates:"Certificates", certs:"Certificates", skills:"Skills",
  languages:"Languages", language:"Languages", courses:"Courses", publications:"Publications", workflow_import:"Imported workflow", imported:"Imported", import:"Imported", other:"Other", misc:"Other", archive:"Archive"};
const baseOf = (n) => String(n).split("/").pop();
// A category folder that matches a known prefix group joins it (education/ with EDU1_..., projects/ with PROJ1_...).
const CATKEY = {education:"EDU", projects:"PROJ", project:"PROJ", work:"WORK", experience:"EXP", organisations:"ORG", organizations:"ORG", org:"ORG", certificates:"CERT", certs:"CERT", skills:"SKILL"};
const itemKey = (it) => it.group ? (CATKEY[it.group.toLowerCase()] || "CAT:" + it.group) : groupKey(it.name);
const catLabel = (g) => CATS[g.toLowerCase()] || g.replace(/[_-]+/g, " ").replace(/^./, c => c.toUpperCase());
const groupKey = (n) => { const m = /^([A-Za-z]+|\d+)/.exec(n); const k = m ? m[1].toUpperCase() : "OTHER"; return /^\d+$/.test(k) ? "00" : k; };
function groupMaterials(items){
  const g = {};
  (items || []).forEach(it => (g[itemKey(it)] = g[itemKey(it)] || []).push(it));
  const rank = (k) => k.startsWith("CAT:") ? (k === "CAT:workflow_import" ? 200 : 100) : (GROUP_ORDER.indexOf(k) + 1 || 99);
  return Object.keys(g).sort((a,b) => rank(a) - rank(b) || a.localeCompare(b))
    .map(k => ({k, label:k.startsWith("CAT:") ? catLabel(k.slice(4)) : (GROUPS[k] || k),
      items:g[k].sort((a,b) => codeOf(baseOf(a.name)).localeCompare(codeOf(baseOf(b.name)), undefined, {numeric:true}) || baseOf(a.name).localeCompare(baseOf(b.name), undefined, {numeric:true}))}));
}
const codeOf = (n) => n.includes("_") ? n.slice(0, n.indexOf("_")) : n.replace(/\.[a-z0-9]+$/i, "");
function cleanName(n){ return n.replace(/^[^_]*_/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ") || n; }
// Readable names from folder names: "FHDortmund" -> "FH Dortmund", "BankSQL" -> "Bank SQL", "SAP1" -> "SAP 1".
const pretty = (t) => t.replace(/([a-z])(?=[A-Z][A-Za-z])/g, "$1 ").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/-/g, " ").replace(/\s+/g, " ").trim();
const matName = (it) => it.group ? pretty(cleanName(baseOf(it.name))) : groupKey(it.name) === "00" ? (/photo|foto/i.test(it.name) ? "Photo" : /cv/i.test(it.name) ? cleanName(it.name).replace(/\bCV\b ?(\w+)?$/, (m, l) => "CV" + (l ? ` (${l})` : "")) : cleanName(it.name)) : pretty(cleanName(it.name));
const matPill = (it) => it.group ? codeOf(baseOf(it.name)) : groupKey(it.name) === "00" ? (it.name.split(".").pop() || "").toUpperCase() : codeOf(it.name);
const MAT_DIR = "01_user_documents/materials/";
const fmtDay = (s) => s ? new Date(s * 1000).toLocaleDateString(LOC(), {day:"numeric", month:"short", year:"numeric"}) : "";

// Master CV: the files in 01_user_documents/Master_CV, with a note when raw facts changed after it.
async function loadMasterCv(){
  if (!invoke || !folder) return;
  let mc; try { mc = await invoke("master_cv", {root:folder}); } catch { return; }
  if (state.view !== "profil" || !$("mcvFiles")) return;
  const stale = mc.cv_modified && mc.raw_facts_modified > mc.cv_modified + 60;
  const label = (f) => { const n = fileName(f.path), lang = (/_([A-Z]{2})\.\w+$/.exec(n) || [])[1] || ""; return `${lang ? lang + " · " : ""}PDF`; };
  mc.files = mc.files.filter(f => f.section === "pdf");
  $("mcvFiles").innerHTML = mc.files.length ? mc.files.sort((a, b) => label(a).localeCompare(label(b)))
      .map(f => `<button class="chip" ${f.section === "pdf" ? `data-viewfile="${esc(f.path)}"` : `data-openfile="${esc(f.path)}"`} data-ufolder="${esc(f.path)}" title="${esc(fileName(f.path))}">${esc(label(f))}</button>`).join("")
    : '<span class="muted">No Master CV yet.</span>';
  $("mcvNote").innerHTML = !mc.files.length ? `<button class="btn" data-chat="lamaran" data-send="1" data-agent="bayu" data-say="${esc(say("mcv"))}">Ask Bayu to create it</button>`
    : stale ? `<span class="warn-t">Raw facts changed on ${fmtDay(mc.raw_facts_modified)}, after this update.</span><button class="btn" data-chat="lamaran" data-send="1" data-agent="bayu" data-say="${esc(say("mcv"))}">Ask Bayu to update it</button>`
    : `<span class="muted">Up to date with your raw facts.</span>`;
  $("mcvWhen").textContent = mc.cv_modified ? "Refreshed " + fmtDay(mc.cv_modified) : "";
}

function profilPage(d){
  setTimeout(loadMasterCv, 0);
  const groups = groupMaterials(d.mat_items), total = (d.mat_items || []).length;
  const stale = d.cv_modified && d.raw_facts_modified > d.cv_modified + 60;
  const sel = state.matGroup || "all";
  state.collapsed = state.collapsed || {};
  const tile = (k, v, sub, cls = "") => `<div class="ptile ${cls}"><span class="cap">${k}</span><b class="mono">${v}</b><span>${sub}</span></div>`;
  const head = `<section class="panel phead">
      <div class="pid"><span class="avatar big">${$("avatar").innerHTML || esc(initials(d.full_name || niceName(d.user)))}</span>
        <div><h2>${esc(d.full_name || d.user)}</h2><div class="muted">${esc(d.tagline || "Your Vantage profile")}</div><div class="pfrow"><span class="mono pfolder">${esc(d.user)}</span><button class="btn sm" id="btnOpenUser" title="${esc(folder || "")}">${OPEN_LABEL}</button><button class="btn sm" id="btnEditName">${ud("edit")}</button></div></div></div>
      <div class="ptiles">${tile("Materials", total, groups.length + " groups")}${tile("Discussed", (() => { const mi = d.mat_items || [], known = mi.filter(it => it.kupas && it.kupas !== "skip" && it.kupas !== "unknown").length, unk = mi.some(it => it.kupas === "unknown"); return unk && !known ? "—" : mi.filter(it => it.kupas === "done").length + " / " + known; })(), (d.mat_items || []).some(it => it.kupas === "unknown") ? "status not tracked yet" : "materials unpacked")}
        ${tile("Master CV", !d.cv_modified ? "None" : stale ? "Outdated" : "Fresh", d.cv_modified ? fmtDay(d.cv_modified) : "not created", stale ? "warn" : "")}
        ${tile("Applications", (d.apps || []).length, "in the tracker")}</div></section>`;
  const mcv = `<section class="panel mcvrow"><div class="mcv-l"><b>Master CV</b><span class="cap" id="mcvWhen"></span></div>
      <div class="mcv-files" id="mcvFiles"><span class="muted">Loading…</span></div><div class="mcv-note" id="mcvNote"></div></section>`;
  setTimeout(loadProfileExtras, 0);
  const extras = `<div class="px-two"><section class="panel"><div class="head"><h2>Reference CVs</h2><span class="cap">00_other_cv_as_role_model</span></div><div id="pxRole"><div class="empty">Loading…</div></div></section>
    <section class="panel"><div class="head"><h2>Experience notes</h2><span class="cap">your_recalling_journey</span></div><div id="pxJourney"><div class="empty">Loading…</div></div></section></div>`;
  const danger = `<section class="panel pdanger"><div><b>${ud("dz")}</b><span class="muted">${ud("dzx")}</span></div><button class="btn danger" id="btnDelUser">${ud("btn")}</button></section>`;
  if (!total) return `<div class="prof">${head}${mcv}${extras}<section class="panel"><div class="empty">No materials yet. Drop files into the Inbox, then click Tidy up.</div></section>${danger}</div>`;
  const notDone = (it) => it.kupas === "todo" || it.kupas === "partly";
  const nTodo = (d.mat_items || []).filter(notDone).length;
  const chips = [["all", "All", total], ...groups.map(g => [g.k, g.label, g.items.length]), ...(nTodo ? [["todo", "Not discussed yet", nTodo]] : [])]
    .map(([k, l, n]) => `<button class="seg ${sel === k ? "on" : ""}${k === "todo" ? " todo" : ""}" data-mgroup="${k}">${esc(l)} <span class="mono">${n}</span></button>`).join("");
  const KUPAS = {done:"Discussed", partly:"Partly discussed", todo:"Not discussed yet", skip:"Not taken (not relevant)", unknown:"Status not tracked yet"};
  const nUnk = (d.mat_items || []).filter(it => it.kupas === "unknown").length;
  const unkNote = nUnk ? `<div class="mnote"><span>${kt("note", nUnk)}</span><button class="btn sm" data-chat="raka" data-send="1" data-say="${esc(say("kupasSync"))}">${kt("btn")}</button></div>` : "";
  const list = groups.map(g => sel === "todo" ? {...g, items:g.items.filter(notDone)} : g).filter(g => g.items.length && (sel === "all" || sel === "todo" || g.k === sel)).map(g => {
    const closed = state.collapsed[g.k];
    return `<div class="mgroup${closed ? " closed" : ""}"><button class="mg-h" data-mtoggle="${g.k}"><span class="tw">${closed ? "▸" : "▾"}</span><b>${esc(g.label)}</b><span class="mono">${g.items.length}</span></button>` +
      `<div class="mg-rows">` + g.items.map(it => {
        const sub = !it.group && codeOf(it.name).includes("-"), rel = MAT_DIR + it.name;
        return `<button class="mrow${sub ? " sub" : ""}" data-mat="${esc(it.name)}" data-ufolder="${esc(rel)}" data-q="${esc((it.name + " " + matName(it)).toLowerCase())}">` +
          `<span class="kdot k-${esc(it.kupas || "na")}" title="${esc(it.kupas ? KUPAS[it.kupas] + " · " + (it.kupas_note || "") : "")}"></span>` +
          `<span class="pill mono">${esc(matPill(it))}</span><span class="mname">${esc(matName(it))}</span>` +
          `<span class="mono mc">${it.kind === "folder" ? it.count + (it.count === 1 ? " file" : " files") : "file"}</span><span class="mono mc">${fmtSize(it.kb)}</span><span class="mono mc md">${fmtDay(it.modified)}</span></button>`;
      }).join("") + `</div></div>`;
  }).join("");
  return `<div class="prof">${head}${mcv}${extras}
    <section class="panel mats"><div class="head"><h2>Materials</h2><input class="field msearch" id="msearch" placeholder="Search materials" autocomplete="off"></div>
      ${unkNote}<div class="mchips">${chips}</div><div class="mlist" id="mlist">${list}</div>
      <div class="mfoot muted">Right-click a row to open it in ${IS_MAC ? "Finder" : "File Explorer"}. To add more, drop files into the Inbox and click Tidy up.</div></section>${danger}</div>`;
}

// Profile sub-sections, shown as they are on disk: CVs of people whose applications worked (Nova studies why,
// it never copies them) and the recalling journey documents. PDF preferred over a Markdown twin.
const ROLE_DIR = "01_user_documents/00_other_cv_as_role_model/", JOURNEY_DIR = "01_user_documents/your_recalling_journey/";
const MOCK_ROLE = [{path:"Example_Person/Example_CV.pdf", section:"Example_Person", kb:240, modified:0}, {path:"Example_Person/Example_Cover-Letter.pdf", section:"Example_Person", kb:110, modified:0}];
const MOCK_JOURNEY = [{path:"Bachelor.pdf", section:"", kb:80, modified:0}];
function onePerDoc(files){
  const by = {};
  files.filter(f => !/(^|\/)README\.md$/i.test(f.path) && !/\.(DS_Store|json)$/i.test(f.path)).forEach(f => {
    const st = f.path.replace(/\.[^.]+$/, ""); if (!by[st] || /\.pdf$/i.test(f.path)) by[st] = f; });
  return Object.values(by).sort((a, b) => a.path.localeCompare(b.path));
}
const docBtn = (dir, f, label) => `<button class="frow" ${/\.(pdf|png|jpe?g|md|txt)$/i.test(f.path) ? `data-viewfile="${esc(dir + f.path)}"` : `data-openfile="${esc(dir + f.path)}"`} data-ufolder="${esc(dir + f.path)}" title="${esc(f.path)}"><span>${esc(label)}</span><span class="mono">${esc((f.path.split(".").pop() || "").toUpperCase())}</span></button>`;
async function loadProfileExtras(){
  if (state.view !== "profil" || !$("pxRole")) return;
  let role = [], journey = [];
  if (invoke){
    try { role = await invoke("dir_files", {root:folder, rel:ROLE_DIR}); } catch {}
    try { journey = await invoke("dir_files", {root:folder, rel:JOURNEY_DIR}); } catch {}
  } else { role = MOCK_ROLE; journey = MOCK_JOURNEY; }
  if (state.view !== "profil" || !$("pxRole")) return;
  role = onePerDoc(role); journey = onePerDoc(journey);
  const people = {};
  role.forEach(f => { const k = f.section || "Other"; (people[k] = people[k] || []).push(f); });
  const pretty = (n) => n.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  $("pxRole").innerHTML = role.length
    ? Object.entries(people).map(([who, fs]) => `<div class="px-who">${esc(pretty(who))}</div>` + fs.map(f => docBtn(ROLE_DIR, f, pretty(f.path.split("/").pop()))).join("")).join("")
      + `<div class="px-note muted">CVs and cover letters of people whose applications worked. Nova studies why they worked and uses the pattern for your strategy, never the content.</div>`
    : `<div class="empty">No reference CV yet. Optional: if someone in your target field got hired, put their CV and cover letter (with their permission) into 00_other_cv_as_role_model.</div>`;
  $("pxJourney").innerHTML = journey.length
    ? journey.map(f => docBtn(JOURNEY_DIR, f, pretty(f.path.split("/").pop()))).join("")
    : `<div class="empty">Nothing here yet. Nova writes these after talking with you about your studies and past work.</div>`;
}

// Material drawer: summary first (opened in the viewer), then documents, evidence, data, and a folded group with
// source code and system files. Prev/Next walk through the materials in list order.
const CODE_EXT = /\.(php|js|mjs|ts|css|scss|html?|py|sh|bat|ps1|ini|cfg|conf|yml|yaml|lock|map|xml|sql|htaccess)$|(^|\/)(htaccess[^/]*|\.?env|robots\.txt|install\.txt|license[^/]*|config\.[a-z]+)$/i;
const DATA_EXT = /\.(csv|tsv|xlsx?|json|parquet|sav|dta)$/i;
const DOC_EXT = /\.(pdf|docx?|pptx?|md|odt|rtf|pages|key)$/i;
const MEDIA_EXT = /\.(png|jpe?g|gif|webp|heic|mp4|mov|m4a|mp3)$/i;
function fileKind(path){
  const n = fileName(path).toLowerCase();
  if (/about_project/.test(n)) return "Summary";
  if (CODE_EXT.test(path) || (/\.txt$/i.test(n) && !/data/i.test(path))) return "code";
  if (DATA_EXT.test(n) || /\.txt$/i.test(n)) return "Data";
  if (/(^|\/)(bahan|evidence|source)\//i.test(path) || MEDIA_EXT.test(n)) return "Evidence / source files";
  if (DOC_EXT.test(n)) return "Documents";
  return "Documents";
}
// "a-very-long-file-name.pdf" -> "a-very-lo…name.pdf": keeps the extension visible.
const midEllipsis = (n, max = 38) => n.length <= max ? n : n.slice(0, Math.ceil((max - 1) * .6)) + "…" + n.slice(n.length - Math.floor((max - 1) * .4));
function matOrder(){ return groupMaterials(state.data.mat_items).flatMap(g => g.items.map(it => it.name)); }
async function openMaterial(name){
  const it = (state.data.mat_items || []).find(x => x.name === name); if (!it) return;
  const rel = MAT_DIR + it.name, order = matOrder(), idx = order.indexOf(name);
  const prev = order[idx - 1], next = order[idx + 1];
  $("drawer").innerHTML = `<div class="dr-head"><div class="dr-title"><h2>${esc(matName(it))} <span class="pill mono">${esc(matPill(it))}</span></h2>
      <div class="dr-chips"><span>${it.kind === "folder" ? it.count + (it.count === 1 ? " file" : " files") : "1 file"}</span><span>${fmtSize(it.kb)}</span><span>changed ${fmtDay(it.modified)}</span></div></div>
    <div class="dr-nav"><button class="btn" ${prev ? `data-matnav="${esc(prev)}"` : "disabled"} title="Previous material">‹</button><button class="btn" ${next ? `data-matnav="${esc(next)}"` : "disabled"} title="Next material">›</button><button class="btn" id="drClose">Close</button></div></div>
    <div class="dr-body"><div class="dr-info" id="drFiles"><div class="muted">Loading…</div></div>
    <div class="dr-view" id="drView"><div class="empty">Select a file to preview it here.</div></div></div>`;
  $("drawer").hidden = false; $("scrim").hidden = false;
  let files = [];
  try { files = await invoke("dir_files", {root:folder, rel}); } catch (e){ $("drFiles").textContent = String(e); return; }
  const base = it.kind === "folder" ? rel + "/" : MAT_DIR;
  const groups = {};
  files.forEach(f => { const k = fileKind(f.path); (groups[k] = groups[k] || []).push(f); });
  const row = (f) => `<button class="frow" data-file="${esc(base + f.path)}" data-ufolder="${esc(base + f.path)}" title="${esc(f.path)}"><span>${esc(midEllipsis(fileName(f.path)))}</span><span class="mono">${fmtSize(f.kb)}</span></button>`;
  const order2 = ["Summary", "Documents", "Evidence / source files", "Data"];
  let html = order2.filter(k => groups[k]).map(k => `<div class="fgroup"><div class="fg-h">${k} <span class="mono">${groups[k].length}</span></div>${groups[k].map(row).join("")}</div>`).join("");
  if (groups.code) html += `<details class="fgroup"><summary class="fg-h">Source code and system files <span class="mono">${groups.code.length}</span></summary>${groups.code.map(row).join("")}</details>`;
  $("drFiles").innerHTML = html || '<div class="muted">No files.</div>';
  // Preview: the summary (PDF first, then Markdown), else the first previewable document.
  const sum = (groups.Summary || []), pick1 = sum.find(f => /\.pdf$/i.test(f.path)) || sum.find(f => /\.md$/i.test(f.path)) ||
    files.find(f => fileKind(f.path) !== "code" && /\.(pdf|png|jpe?g|md)$/i.test(f.path));
  if (pick1) showFile(base + pick1.path);
}
async function viewFile(rel){
  $("drawer").innerHTML = `<div class="dr-head"><div><h2>${esc(fileName(rel))}</h2><div class="muted mono">${esc(rel)}</div></div><button class="btn" id="drClose">Close</button></div>
    <div class="dr-body one"><div class="dr-view" id="drView"></div></div>`;
  $("drawer").hidden = false; $("scrim").hidden = false;
  showFile(rel);
}

// Small Markdown renderer for the morning report: headings, tables, lists, bold, links.
function inline(t){
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/https:\/\/[^\s|<)]+/g, u => `<a href="#" data-url="${u}">${u.replace(/^https:\/\/(www\.|[a-z]{2}\.)?/, "").split("/")[0]} ↗</a>`);
}
function md(text){
  const out = [], lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++){
    const l = lines[i];
    if (/^\s*\|/.test(l)){
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const cells = rows.filter(r => !/^\s*\|[\s:|-]+\|\s*$/.test(r)).map(r => r.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      if (!cells.length) continue;
      out.push(`<table class="mdt"><thead><tr>${cells[0].map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
        cells.slice(1).map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("") + `</tbody></table>`);
    } else if (/^#{1,6}\s/.test(l)){
      const n = l.match(/^#+/)[0].length;
      out.push(`<div class="h${Math.min(n, 3)}">${inline(l.replace(/^#+\s*/, ""))}</div>`);
    } else if (/^\s*[-*]\s/.test(l)){
      out.push(`<div class="li">${inline(l.replace(/^\s*[-*]\s/, ""))}</div>`);
    } else if (l.trim()){
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  return out.join("");
}
function daysAgo(iso){
  const t = new Date(iso + "T00:00:00").getTime();
  if (isNaN(t)) return "";
  const n = Math.floor((Date.now() - t) / 864e5);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
}
const reportTitle = (t) => ((t.split(/\r?\n/).find(l => /^#\s/.test(l)) || "").replace(/^#+\s*/, "") || "Morning report");
// Morning Report v2: rendered from the report JSON (same structure as the PDF), interactive.
// Reports without JSON (before v2) keep the Markdown view, marked as legacy format.
const isUnanswered = (r, apps) => !(apps || []).some(a => a.company && r.perusahaan && (a.company_full || a.company).toLowerCase().includes(r.perusahaan.toLowerCase().split(" ")[0]));
function unanswered(rep, d){
  if (!rep || !rep.data || rep.data.dikonversi_dari_lama) return [];
  const age = -daysFrom(parseDate(rep.date) || today0());
  const fromRecs = age <= 7 ? (rep.data.rekomendasi || []).map((r, i) => ({...r, no:i + 1})).filter(r => isUnanswered(r, d.apps)) : [];
  return fromRecs;
}
const RLBL = {Lamar:"Apply", Analisis:"Analyse", Lewati:"Skip"};
// An old report converted to the v2 layout: only what the old report recorded, "–" elsewhere, no verdicts or reply buttons.
function reportLegacy(rep, d){
  const x = rep.data, c = x.pencarian || {}, f = c.corong || {}, D = "–";
  const chips = (xs, cls = "") => (xs || []).length ? xs.map(v => `<span class="rch ${cls}">${esc(v)}</span>`).join("") : D;
  const steps = [["ditemukan","found"],["lolos_saring","screened"],["link_resmi_ok","official link OK"],["dianalisis_penuh","analysed"],["direkomendasikan","listed"]]
    .map(([k, l], i) => `<div class="rfs${i === 4 ? " fin" : ""}"><b>${f[k] ?? D}</b><span>${l}</span></div>`).join("");
  const host = (u) => /linkedin\./.test(u) ? "LinkedIn link (legacy)" : (u.split("/")[2] || "").replace("www.", "");
  const acts = (x.perlu_aksi || []).map(a => `<div class="ract${a.lewat ? " past" : ""}"><div class="rw"><b>${esc(fmtDue(a.tanggal))}</b><span>${a.lewat ? "past" : ""}</span></div>` +
    `<span class="rk k-${esc(a.jenis)}">${esc(a.jenis.replace("_", " "))}</span><div class="rt"><b>${esc(a.lamaran)}</b><span>${esc(a.aksi)}</span></div></div>`).join("") || '<div class="none">None.</div>';
  const recs = (x.rekomendasi || []).map((r, i) => `<div class="rrec legacy"><div class="rl"><span class="rno">${i + 1}</span>` +
      (r.skor != null ? `<span class="rsc ${r.skor >= lamarAt(x) ? "hi" : "mid"}">${r.skor}</span>` : `<span class="rsc lbl">${esc(r.skor_label || D)}</span>`) + `</div>
      <div class="rm"><div class="rtop"><b>${esc(r.perusahaan)}</b><span class="ra a-na">not assessed</span></div>
        <div class="rrole">${esc(r.posisi)}</div>
        <div class="rmeta">${esc(r.jenis)} · ${esc(r.kota || D)} · posted ${r.diposting ? esc(fmtDue(r.diposting)) : D}</div>
        ${r.cocok ? `<div class="rwhy"><span class="ok">Fit</span>${esc(r.cocok)}</div>` : ""}${r.gap ? `<div class="rwhy"><span class="gap">Gap</span>${esc(r.gap)}</div>` : ""}
        ${r.catatan_asli ? `<div class="rwhy"><span class="ak">Status</span>${esc(r.catatan_asli)}</div>` : ""}
        <div class="rbtns"><a href="#" data-url="${esc(r.link)}" class="rlink">${esc(host(r.link))} ↗</a></div></div></div>`).join("") || '<div class="none">None.</div>';
  const near = (x.hampir_masuk || []).map(n => `<div class="rnear">${n.skor != null ? `<b class="mono">${n.skor}</b>` : `<span class="ntag">${esc(n.skor_label || D)}</span>`}<span><b>${esc(n.perusahaan)}</b> — ${esc(n.posisi)}${n.kota ? ", " + esc(n.kota) : ""}${n.alasan ? `<em>${esc(n.alasan)}</em>` : ""}</span>${n.link ? `<a href="#" data-url="${esc(n.link)}">${esc(host(n.link))} ↗</a>` : "<i></i>"}</div>`).join("") || '<div class="none">None.</div>';
  const notes = (x.catatan_asli || []).map(m => `<div>· ${esc(m)}</div>`).join("") || `<div class="none">${D}</div>`;
  const sec = (n, title, body, sub = "") => `<section class="rsec"><h3><span>${n}</span>${title}${sub ? `<small>${sub}</small>` : ""}</h3>${body}</section>`;
  const a = x.asal || {};
  return `<div class="rv2">
    <div class="rhead"><div><div class="cap">From ${esc(c.oleh || "Nova")} · <b class="conv">converted from the old format</b>${x.status === "terpotong" ? ' · <b class="warn-t">incomplete</b>' : ""}</div><h2>${esc(new Date(x.tanggal + "T00:00:00").toLocaleDateString(LOC(), {weekday:"long", day:"numeric", month:"long", year:"numeric"}))}</h2></div>
      <div class="rhbtns">${rep.pdf ? `<button class="btn" data-openfile="${esc(rep.pdf)}">Open PDF</button>` : ""}<button class="btn" data-openfile="${esc(a.pdf || a.readme)}">Open original</button></div></div>
    <div class="rconv">${esc(x.catatan_konversi || "")}</div>
    <div class="rfocus"><span>Focus</span>${esc(x.fokus || "")}</div>
    <div class="rsearch"><div class="cap">How ${esc(c.oleh || "Nova")} searched (as recorded)</div>
      <div class="rsg"><div><i>Keywords</i>${chips(c.kata_kunci, "kw")}</div><div><i>Locations</i>${chips(c.lokasi)}</div><div><i>Filters</i>${chips(c.filter)}</div><div><i>Sources</i>${chips(c.sumber)}</div></div>
      <div class="rfun">${steps}</div></div>
    ${sec("01", "Needs your action", acts)}
    ${sec("02", "Postings", recs, "as in the original report")}
    <div class="rtwo">${sec("03", "Near misses", near, "as in the original report")}${sec("04", "Skipped", `<div class="rskip">${D}</div>`)}</div>
    <div class="rtwo">${sec("05", "Gap pattern", `<div class="none">${D}</div>`)}${sec("06", "Notes from the original report", notes)}</div>
  </div>`;
}
// The report page keeps three tabs so it is not one long scroll: Today (what to do), Considered (near misses, skipped), Search (how it searched, patterns).
const REP_TABS = [["today", "Today"], ["considered", "Considered"], ["search", "Search"]];
const isTodayReport = (rep) => !!rep && daysFrom(parseDate(rep.date) || new Date(0)) === 0;
function reportV2(rep, d){
  if (rep.data.dikonversi_dari_lama) return reportLegacy(rep, d);
  const x = rep.data, day = x.tanggal || rep.date, t = parseDate(day), dd = (s) => daysFrom(parseDate(s)) - daysFrom(t);
  const c = x.pencarian || {}, f = c.corong || {}, who = c.oleh || "Sinta";
  const chips = (xs, cls = "") => (xs || []).map(v => `<span class="rch ${cls}">${esc(v)}</span>`).join("");
  const host = (u) => (u || "").split("/")[2] || "";
  const steps = [["ditemukan","found"],["lolos_saring","screened"],["link_resmi_ok","official link OK"],["dianalisis_penuh","analysed"],["direkomendasikan","recommended"]]
    .map(([k, l], i) => `<div class="rfs${i === 4 ? " fin" : ""}"><b>${f[k] ?? "–"}</b><span>${l}</span></div>`).join("");
  const kindL = {belum_dijawab:"Not answered", follow_up:"Follow-up", deadline:"Deadline", interview:"Interview", mulai_kerja:"Start date", dokumen:"Documents"};
  const acts = (x.perlu_aksi || []).filter(a => a.tanggal || a.dari_laporan).slice().sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || "")).map(a => {
    const n = dd(a.tanggal);
    const when = a.jenis === "belum_dijawab" ? `<b>since ${esc(fmtDue(a.dari_laporan))}</b><span>gone in ${Math.max(0, n)}d</span>`
      : `<b>${esc(fmtDue(a.tanggal))}</b><span class="${n >= 0 && n <= 3 ? "urg" : n < 0 ? "late" : ""}">${n === 0 ? "today" : n > 0 ? "in " + n + "d" : -n + "d ago"}</span>`;
    return `<div class="ract"><div class="rw">${when}</div><span class="rk k-${esc(a.jenis)}">${kindL[a.jenis] || esc(a.jenis)}</span>` +
      `<div class="rt"><b>${esc(a.lamaran)}</b>${a.skor ? ` · score ${a.skor}` : ""}<span>${esc(a.aksi)}${a.link ? ` · <a href="#" data-url="${esc(a.link)}">${esc(host(a.link))} ↗</a>` : ""}</span></div></div>`;
  }).join("") || '<div class="none">Nothing to do.</div>';
  const KOMP = [["tugas","Tasks",40],["skill","Skills",25],["bahasa","Language",15],["kontrak","Contract",10],["nilai_tambah","Extras",10]];
  // The first recommendation of today's report owns the page's one accent button.
  const goFirst = isTodayReport(rep);
  const recList = (x.rekomendasi || []).slice().sort((a, b) => (b.skor || 0) - (a.skor || 0));
  const recs = recList.map((r, i) => {
    const dl = r.deadline ? (() => { const n = dd(r.deadline); return `<span class="rdl ${n <= 7 ? "soon" : ""}">closes ${esc(fmtDue(r.deadline))} · ${n}d</span>`; })() : `<span class="rdl">no deadline stated</span>`;
    const docs = (r.usaha?.dokumen || []).join(" · "), mins = r.usaha?.menit;
    const effort = docs || mins != null ? `<span class="reff">${docs ? "Needs: " + esc(docs) : ""}${docs && mins != null ? " · " : ""}${mins != null ? "±" + esc(mins) + " min" : ""}</span>` : "";
    const bars = r.komponen ? `<div class="rr">${KOMP.map(([k, l, mx]) => `<div class="rkb"><span>${l}</span><i><em style="width:${(r.komponen[k] || 0) / mx * 100}%"></em></i><b>${r.komponen[k] ?? "–"}/${mx}</b></div>`).join("")}</div>` : "";
    const ref = `nomor ${i + 1} dari laporan ${x.tanggal || rep.date}`;
    const meta = [r.jenis, r.kota, r.perjalanan].filter(Boolean).map(esc).concat(r.diposting ? ["posted " + esc(fmtDue(r.diposting))] : []).join(" · ");
    const why = (cls, label, text) => text ? `<div class="rwhy"><span class="${cls}">${label}</span>${esc(text)}</div>` : "";
    const act = String(r.aksi || "");
    return `<div class="rrec${bars ? "" : " nobars"}"><div class="rl"><span class="rno">${i + 1}</span>${r.skor != null ? `<span class="rsc ${r.skor >= lamarAt(x) ? "hi" : "mid"}">${r.skor}</span>` : ""}</div>
      <div class="rm"><div class="rtop"><b>${esc(r.perusahaan)}</b>${act ? `<span class="ra a-${esc(act.toLowerCase())}">${RLBL[act] || esc(act)}</span>` : ""}</div>
        <div class="rrole">${esc(r.posisi)}</div>
        ${meta ? `<div class="rmeta">${meta}</div>` : ""}
        <div class="rchips">${dl}<span class="rhist">${r.riwayat ? "History: " + esc(r.riwayat) : "Never applied here"}</span>${effort}</div>
        ${why("ok", "Fit", r.cocok)}${why("gap", "Gap", r.gap)}${why("ak", "Action", r.aksi_alasan)}
        <div class="rbtns">${r.link ? `<a href="#" data-url="${esc(r.link)}" class="rlink">${esc(host(r.link))} ↗</a>` : ""}
          <button class="btn${goFirst && i === 0 ? " primary" : ""}" data-chat="lamaran" data-say="${esc(say("go", ref))}">Go</button><button class="btn" data-chat="lamaran" data-say="${esc(say("skip", ref))}">Skip</button>
          <button class="btn" data-chat="lamaran" data-say="${esc("👍 " + ref)}" title="Score feels right">👍</button><button class="btn" data-chat="lamaran" data-say="${esc(say("down", ref))}" title="Score feels wrong">👎</button></div></div>
      ${bars}</div>`;
  }).join("") || `<div class="none">No new postings${x.ambang_skor != null ? " ≥" + x.ambang_skor : ""} today${x.jumlah_dianalisis != null ? " (" + x.jumlah_dianalisis + " checked)" : ""}.</div>`;
  const nearL = x.hampir_masuk || [];
  const near = nearL.map(n => `<div class="rnear"><b class="mono">${n.skor ?? "–"}</b><span><b>${esc(n.perusahaan)}</b> — ${esc(n.posisi)}${n.alasan ? `<em>${esc(n.alasan)}</em>` : ""}</span>${n.link ? `<a href="#" data-url="${esc(n.link)}">${esc(host(n.link))} ↗</a>` : ""}</div>`).join("") || '<div class="none">None today.</div>';
  const dl = x.dilewati || {}, skipParts = [["link_tidak_ketemu", "official link not found"], ["sudah_di_tracker", "already in tracker"], ["sudah_dilaporkan", "in an earlier report"], ["skor_rendah", "below " + (x.ambang_hampir ?? "the threshold")]]
    .filter(([k]) => dl[k]).map(([k, l]) => `${dl[k]} ${l}`);
  if (dl.lainnya) skipParts.push(`${dl.lainnya} other (${esc(dl.lainnya_alasan || "")})`);
  const total = ["link_tidak_ketemu","sudah_di_tracker","sudah_dilaporkan","skor_rendah","lainnya"].reduce((s, k) => s + (dl[k] || 0), 0);
  const skip = total ? `${total} skipped: ${skipParts.join(" · ")}` : "Nothing skipped.";
  const gaps = (x.pola_gap || []).map(g => `<div><b class="gapk">${esc(g.skill)}</b> in ${g.jumlah} of ${g.dari} postings</div>`).join("") || '<div class="none">No pattern yet.</div>';
  const market = (x.catatan_pasar || []).map(m => `<div>· ${esc(m)}</div>`).join("") || '<div class="none">—</div>';
  const sec = (title, body, sub = "") => `<section class="rsec"><h3>${title}${sub ? `<small>${sub}</small>` : ""}</h3>${body}</section>`;
  const tab = REP_TABS.some(([k]) => k === state.rtab) ? state.rtab : "today";
  const cnt = {today: recList.length, considered: nearL.length, search: 0};
  const tabs = `<div class="rtabs" role="tablist">${REP_TABS.map(([k, l]) => `<button class="rtab${k === tab ? " on" : ""}" role="tab" data-rtab="${k}">${l}${cnt[k] ? ` <i>${cnt[k]}</i>` : ""}</button>`).join("")}</div>`;
  const body = tab === "today" ? sec("Needs your action", acts) + sec("Recommendations", recs, x.ambang_skor != null ? `score ≥${x.ambang_skor}${x.target_jumlah ? ", max " + x.target_jumlah : ""}` : "")
    : tab === "considered" ? sec("Near misses", near, x.ambang_hampir != null && x.ambang_skor != null ? `${x.ambang_hampir}–${x.ambang_skor - 1}` : "") + sec("Skipped", `<div class="rskip">${skip}</div>`)
    : `<div class="rsearch"><div class="cap">How ${esc(who)} searched</div>
        <div class="rsg"><div><i>Keywords</i>${chips(c.kata_kunci, "kw") || "–"}</div><div><i>Locations</i>${chips(c.lokasi) || "–"}</div><div><i>Filters</i>${chips(c.filter) || "–"}</div>
        <div><i>Sources</i>${chips(c.sumber) || "–"}<div class="rfail">Could not check: ${(c.gagal || []).length ? `<b>${esc(c.gagal.join(" · "))}</b>` : "none, all sources worked"}</div></div></div>
        <div class="rfun">${steps}</div>
        <div class="rsfoot"><span class="muted">Search looks wrong?</span><button class="btn" data-chat="lamaran" data-say="${esc(say("search"))}">Change search</button></div></div>` +
      sec("Gap pattern this week", gaps + ((x.pola_gap || []).length ? `<button class="btn" data-chat="lamaran" data-send="1" data-agent="arga" data-say="${esc(say("study"))}">Study plan</button>` : "")) + sec("Market note", market);
  return `<div class="rv2">
    <div class="rhead"><div><div class="cap">From ${esc(who)}${x.run != null ? " · run " + esc(x.run) : ""}${x.status === "terpotong" ? ' · <b class="warn-t">incomplete</b>' : ""}</div><h2>${esc(t ? new Date(day + "T00:00:00").toLocaleDateString(LOC(), {weekday:"long", day:"numeric", month:"long", year:"numeric"}) : day)}</h2></div>
      ${rep.pdf ? `<button class="btn" data-openfile="${esc(rep.pdf)}">Open PDF</button>` : ""}</div>
    ${x.fokus ? `<div class="rfocus"><span>Focus today</span>${esc(x.fokus)}</div>` : ""}
    ${tabs}${body}
  </div>`;
}
const repsOf = (d) => d.reports && d.reports.length ? d.reports : d.report_text ? [{date:d.report_date, text:d.report_text}] : [];
// ---- Daily schedule: a real task of the operating system (launchd on macOS, Task Scheduler on Windows), set up by the app (sched.rs).
// It runs at the chosen time even when Vantage is closed. The page only shows its state and changes it; it keeps no timer of its own.
let SCHED = null;
async function loadSched(){
  if (!invoke || !folder){ SCHED = null; return drawSched(); }
  try { SCHED = await invoke("sched_status", {root: folder}); } catch (e) { SCHED = {supported:true, unreadable:true}; }
  drawSched();
}
// Before 0.9.2 the daily search was a timer inside the app. Whoever had it switched on gets the real task of the OS now,
// at start-up, without having to open this page.
async function migrateSched(){
  if (state.schedChecked || !invoke || !folder) return;
  state.schedChecked = true;
  try {
    const p = ((await invoke("prefs_get", {root: folder})) || {}).sched;   // read here: the page's own prefs may not be loaded yet
    if (!p || !p.on) return;
    const s = await invoke("sched_status", {root: folder});
    if (s && s.supported && !s.registered) await invoke("sched_set", {root: folder, on: true, time: p.time || "07:00"});
  } catch {}
}
function schedWhen(ts){
  const d = new Date(ts * 1000), n = new Date(), hm = d.toLocaleTimeString(LOC(), {hour:"2-digit", minute:"2-digit", hour12:false});
  const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5);
  return (days === 0 ? ft("today", "heute", "hari ini") : days === 1 ? ft("tomorrow", "morgen", "besok") : d.toLocaleDateString(LOC(), {weekday:"short", day:"numeric", month:"short"})) + " " + hm;
}
function drawSched(){
  const el = $("lpSched"); if (!el) return;
  const s = SCHED;
  if (!s){ el.innerHTML = ""; return; }
  if (s.unreadable){ el.innerHTML = `<span class="muted">${ft("Could not read the state of the daily search.", "Der Stand der täglichen Suche ließ sich nicht lesen.", "Status pencarian harian tidak bisa dibaca.")}</span> <button class="btn" data-act="sched-retry">${ft("Check again", "Erneut prüfen", "Periksa lagi")}</button>`; return; }
  if (!s.supported){ el.innerHTML = `<span class="muted">${ft("A daily search needs macOS or Windows.", "Die tägliche Suche braucht macOS oder Windows.", "Pencarian harian butuh macOS atau Windows.")}</span>`; return; }
  const time = s.time || (prefs.sched && prefs.sched.time) || "07:00";
  let st;
  if (!s.registered) st = ft("Off. Turn it on and Vantage searches by itself every day, even when it is closed.", "Aus. Schalte es ein, und Vantage sucht jeden Tag von selbst, auch wenn es geschlossen ist.", "Mati. Nyalakan dan Vantage mencari sendiri tiap hari, bahkan saat tertutup.");
  else {
    st = ft("Next: ", "Nächster Lauf: ", "Berikutnya: ") + `<b>${esc(s.next ? schedWhen(s.next) : time)}</b>`;
    if (s.last_end && s.last_ok) st += " · " + ft("Last: ", "Zuletzt: ", "Terakhir: ") + esc(schedWhen(s.last_end));
    if (s.last_end && !s.last_ok) st += ` · <b class="warn-t">${ft("Last run failed: ", "Letzter Lauf fehlgeschlagen: ", "Terakhir gagal: ")}${esc(s.last_error || "")}</b> <button class="btn" data-act="retry">${ft("Try again", "Erneut versuchen", "Coba lagi")}</button>`;
  }
  el.innerHTML = `<button class="sw${s.registered ? " on" : ""}" role="switch" aria-checked="${!!s.registered}" aria-label="${ft("Daily search", "Tägliche Suche", "Pencarian harian")}"></button>
    <b>${ft("Search every day at", "Täglich suchen um", "Cari tiap hari pukul")}</b><input type="time" id="schT" value="${esc(time)}"><span class="muted">${st}</span>`;
}
async function schedSet(on, time){
  try { SCHED = await invoke("sched_set", {root: folder, on, time}) || SCHED; savePref("sched", {on, time}); }
  catch (e) { toast(String(e)); }
  await loadSched();
}
function laporanPage(d){
  const reps = repsOf(d);
  setTimeout(() => { loadSearchBar(); loadSched(); }, 0);
  lpWatch(reps);
  const i0 = reps.length ? Math.min(state.rep || 0, reps.length - 1) : 0, cur = reps[i0];
  // The accent button belongs to the top recommendation of today's report; with nothing to act on it is "Find jobs now".
  const acting = !!cur && !!cur.data && !cur.data.dikonversi_dari_lama && isTodayReport(cur) && arr(cur.data.rekomendasi).length > 0;
  const bar = `<section class="panel lpbar" id="lpBar"><div class="lp-main"><div class="lp-sum" id="lpSum"><span class="muted">Loading search settings…</span></div>
    <div class="lp-btns"><span class="lp-run" id="lpRun" hidden></span><button class="btn" id="btnLpEdit">Search settings</button><button class="btn${acting ? "" : " primary"}" id="btnLpRun">Find jobs now</button></div></div>
    <div class="lp-sched" id="lpSched"></div></section>`;
  if (!reps.length) return `<div class="lpwrap">${bar}<section class="panel"><div class="empty">No morning report yet. Set your search above, then click Find jobs now.</div></section></div>`;
  const i = i0, r = cur, ago = daysAgo(r.date);
  const list = reps.map((x, j) => {
    const v2 = !!x.data, n = v2 ? (x.data.rekomendasi || []).length : null, un = unanswered(x, d).length;
    const title = v2 ? (x.data.fokus || "") : reportTitle(x.text);
    return `<button class="rep ${j === i ? "on" : ""}" data-rep="${j}"><b>${esc(x.date)}${un ? `<i class="undot" title="${un} not answered yet"></i>` : ""}</b><span>${esc(title)}</span>` +
      `<small>${esc(daysAgo(x.date))}${v2 && x.data.dikonversi_dari_lama ? ` · ${n} listed · converted` : v2 ? ` · ${n} ${n === 1 ? "recommendation" : "recommendations"}` : " · older report"}</small></button>`;
  }).join("");
  const view = r.data ? `<section class="panel repview"><div class="report">${reportV2(r, d)}</div></section>`
    : `<section class="panel repview"><div class="head"><h2>${esc(r.date)}</h2><span class="cap">${ago} · older report</span></div><div class="report">${md(r.text)}</div></section>`;
  return `<div class="lpwrap">${bar}<div class="reps"><section class="panel replist"><div class="head"><h2>All reports</h2><span class="cap">${reps.length}</span></div><div class="scroll">${list}</div></section>${view}</div></div>`;
}
// ---- Morning Report search settings (--usersettings/search_settings.json, read by Sinta) and "Run now".
// The app saves the settings, then only TYPES the request into the Vantage chat; the user presses Enter.
const CONTRACTS = ["Werkstudent", "Praktikum", "Teilzeit", "Vollzeit", "Minijob"];
const SST = {
  maxHint: {en:"How many jobs one report can list. 5 or fewer keeps the search from looking like a bot; up to 50 is allowed.",
            de:"Wie viele Stellen ein Bericht höchstens nennt. 5 oder weniger, damit die Suche nicht wie ein Bot wirkt; bis 50 ist erlaubt.",
            id:"Berapa lowongan maksimal dalam satu laporan. 5 atau kurang supaya pencarian tidak terlihat seperti bot; maksimal 50."},
  ambHint: {en:"Only jobs that score at least this many points out of 100 are recommended. Applying starts at the threshold + 5.",
            de:"Nur Stellen mit mindestens so vielen Punkten von 100 werden empfohlen. Bewerben beginnt bei Schwelle + 5.",
            id:"Hanya lowongan dengan skor minimal sebesar ini dari 100 yang direkomendasikan. Lamar mulai dari ambang + 5."},
  perReport: {en:"per report", de:"pro Bericht", id:"per laporan"},
  matchT: {en:"Match", de:"Passung", id:"Kecocokan"},
  advT: {en:"Advanced: score breakdown", de:"Erweitert: Punkteverteilung", id:"Lanjutan: rincian skor"},
  advHint: {en:"How the 100 points are shared between the five checks. They must add up to 100.",
            de:"Wie sich die 100 Punkte auf die fünf Prüfungen verteilen. Zusammen müssen es 100 sein.",
            id:"Pembagian 100 poin ke lima penilaian. Jumlahnya harus 100."},
  total: {en:"Total", de:"Summe", id:"Total"},
  reset: {en:"Reset to default", de:"Auf Standard zurücksetzen", id:"Kembalikan ke bawaan"},
  fill: {en:"Fill from my profile", de:"Aus meinem Profil füllen", id:"Isi dari profilku"},
  fillHint: {en:"Raka fills every field from your profile. You can change anything afterwards.",
             de:"Raka füllt jedes Feld aus deinem Profil. Danach kannst du alles ändern.",
             id:"Raka mengisi semua kolom dari profilmu. Setelah itu kamu bebas mengubahnya."},
  fillSay: {en:"Please fill my Morning Report search settings from my profile and 01_user_documents/raw_facts_about_you.md, as described in sop/laporan_pagi.md (search settings). Keep what I already set myself, write the file, then tell me what you filled in.",
            de:"Bitte fülle meine Sucheinstellungen für den Morgenbericht aus meinem Profil und 01_user_documents/raw_facts_about_you.md, wie in sop/laporan_pagi.md beschrieben. Behalte, was ich selbst eingestellt habe, schreibe die Datei und sag mir danach, was du eingetragen hast.",
            id:"Tolong isi pengaturan pencarian Morning Report aku dari profil dan 01_user_documents/raw_facts_about_you.md aku, sesuai sop/laporan_pagi.md (pengaturan pencarian). Biarkan yang sudah aku atur sendiri, tulis filenya, lalu kabari aku apa saja yang kamu isi."},
  filled: {en:"Asked Raka to fill in your settings", de:"Raka soll deine Einstellungen ausfüllen", id:"Raka diminta mengisi pengaturanmu"},
  sumErr: {en:(n) => `The five weights must add up to 100 (now ${n}).`, de:(n) => `Die fünf Gewichte müssen zusammen 100 ergeben (jetzt ${n}).`, id:(n) => `Kelima bobot harus berjumlah 100 (sekarang ${n}).`},
  wTugas: {en:"Core job tasks", de:"Kernaufgaben der Stelle", id:"Tugas inti lowongan"},
  wTugasD: {en:"Full when each core task has direct evidence in your profile.", de:"Voll, wenn jede Kernaufgabe einen direkten Beleg in deinem Profil hat.", id:"Penuh kalau tiap tugas inti punya bukti langsung di profilmu."},
  wSkill: {en:"Required skills and tools", de:"Pflicht-Skills und Tools", id:"Skill dan tool wajib"},
  wSkillD: {en:"Full when every must-have is there at the requested level.", de:"Voll, wenn jedes Muss-Kriterium im geforderten Level erfüllt ist.", id:"Penuh kalau semua yang wajib ada di level yang diminta."},
  wBahasa: {en:"Language", de:"Sprache", id:"Bahasa"},
  wBahasaD: {en:"Full when your level meets what the ad asks for.", de:"Voll, wenn dein Level zur Anzeige passt.", id:"Penuh kalau levelmu memenuhi yang diminta iklan."},
  wKontrak: {en:"Contract and logistics", de:"Vertrag und Rahmen", id:"Kontrak dan logistik"},
  wKontrakD: {en:"Contract type, hours, place, work permit and start date fit.", de:"Vertragsart, Stunden, Ort, Arbeitserlaubnis und Starttermin passen.", id:"Jenis kontrak, jam, lokasi, izin kerja, dan tanggal mulai cocok."},
  wNilai: {en:"Extras", de:"Pluspunkte", id:"Nilai tambah"},
  wNilaiD: {en:"Nice-to-haves, the same industry, a referral.", de:"Wünschenswertes, gleiche Branche, eine Empfehlung.", id:"Nilai plus, industri yang sama, referral."},
};
const ssT = (k) => SST[k][lang] || SST[k].en;
const MOCK_SEARCH = {kata_kunci:["Werkstudent Data", "SAP Consulting"], lokasi:["Berlin"], jarak_km:30, remote_ok:true, jenis_kontrak:["Werkstudent"], umur_iklan_hari:7, bahasa_lamaran:["EN", "DE"], kecualikan_perusahaan:[], maks_rekomendasi:5, ambang_skor:80};
let search = null;
async function getSearch(){
  if (!invoke) return search || (search = JSON.parse(JSON.stringify(MOCK_SEARCH)));
  try { const v = await invoke("search_settings_get", {root:folder}); search = v && typeof v === "object" ? v : {}; } catch { search = {}; }
  return search;
}
const arr = (x) => Array.isArray(x) ? x : [];
// A report's JSON is written by a language model, so its shape can be wrong (a string where a list belongs, null inside a list,
// an object where text belongs). Cleaned once, where the data comes in, so no page has to defend itself; good data is left as it is.
const isObj = (x) => !!x && typeof x === "object" && !Array.isArray(x);
const REP_TEXT = ["perusahaan", "posisi", "kota", "jenis", "link", "aksi", "aksi_alasan", "usaha", "deadline", "diposting", "tanggal", "alasan", "skill", "dari_laporan", "skor_label", "oleh"];
const REP_NUM = ["skor", "jumlah", "dari"];
function normalizeReports(d){
  const items = (v) => arr(v).filter(isObj).map(o => {
    for (const k of REP_TEXT) if (k in o && o[k] != null && typeof o[k] !== "string") o[k] = typeof o[k] === "number" ? String(o[k]) : "";
    for (const k of REP_NUM) if (k in o && o[k] != null && !Number.isFinite(o[k])) { const n = typeof o[k] === "string" && o[k].trim() !== "" ? Number(o[k]) : NaN; o[k] = Number.isFinite(n) ? n : null; }
    for (const k of ["cocok", "gap", "riwayat", "perjalanan"]) if (k in o && o[k] != null && !Array.isArray(o[k])) o[k] = [];
    if ("komponen" in o && o.komponen != null && !isObj(o.komponen) && !Array.isArray(o.komponen)) o.komponen = {};
    return o;
  });
  if (d && Array.isArray(d.reports)) for (const r of d.reports) {
    if (!r || !r.data) continue;
    if (!isObj(r.data)) { r.data = null; continue; }
    const x = r.data;
    for (const k of ["rekomendasi", "perlu_aksi", "hampir_masuk", "pola_gap"]) if (k in x) x[k] = items(x[k]);
    if ("pola_gap" in x) x.pola_gap = x.pola_gap.filter(g => g.skill && Number.isFinite(g.jumlah) && Number.isFinite(g.dari));   // "in N of M postings" needs all three
    if ("catatan_pasar" in x) x.catatan_pasar = arr(x.catatan_pasar).filter(m => typeof m === "string");
    if ("dilewati" in x && !isObj(x.dilewati)) x.dilewati = {};
    if ("cakupan" in x && !isObj(x.cakupan)) x.cakupan = {};
    if ("pencarian" in x && !isObj(x.pencarian)) x.pencarian = {};
    for (const k of ["fokus", "status"]) if (k in x && x[k] != null && typeof x[k] !== "string") x[k] = "";
    if ("run" in x && x.run != null && typeof x.run !== "string" && typeof x.run !== "number") x.run = null;
    for (const k of ["ambang_skor", "ambang_hampir", "target_jumlah"]) if (k in x && x[k] != null && !Number.isFinite(x[k])) { const n = Number(x[k]); x[k] = typeof x[k] === "string" && x[k].trim() !== "" && Number.isFinite(n) ? n : null; }
  }
  return d;
}
function searchSummary(x){
  const parts = [];
  if (arr(x.kata_kunci).length) parts.push(`<b>${arr(x.kata_kunci).map(esc).join(", ")}</b>`);
  if (arr(x.lokasi).length) parts.push(`<span>${esc(arr(x.lokasi).join(", "))}${x.jarak_km ? ` (≤${esc(x.jarak_km)} km)` : ""}</span>`);
  if (x.remote_ok) parts.push("<span>remote OK</span>");
  if (arr(x.jenis_kontrak).length) parts.push(`<span>${esc(arr(x.jenis_kontrak).join(", "))}</span>`);
  if (x.umur_iklan_hari) parts.push(`<span>posted ≤${esc(x.umur_iklan_hari)} days</span>`);
  parts.push(`<span>min. score ${esc(x.ambang_skor || 80)}/100</span>`, `<span>up to ${esc(x.maks_rekomendasi || 5)} per report</span>`);
  return parts.length ? parts.join(" · ") : `<span class="muted">No search settings yet. Click Search settings to set keywords and locations.</span>`;
}
async function loadSearchBar(){
  if (state.view !== "laporan" || !$("lpSum")) return;
  const x = await getSearch();
  if (!$("lpSum")) return;
  $("lpSum").innerHTML = `<span class="cap">Search</span><span class="lp-txt">${searchSummary(x)}</span>`;
  lpShowRun();
}
function chipBox(id, items, ph){
  return `<div class="chipbox" data-chipbox="${id}">${items.map(v => `<span class="chipx">${esc(v)}<button data-chipdel title="Remove">×</button></span>`).join("")}<input class="chipin" placeholder="${esc(ph)}" autocomplete="off"></div>`;
}
const chipVals = (id) => [...document.querySelectorAll(`[data-chipbox="${id}"] .chipx`)].map(c => c.firstChild.textContent);
const WKEYS = ["tugas", "skill", "bahasa", "kontrak", "nilai_tambah"];
const WDEF = {tugas:40, skill:25, bahasa:15, kontrak:10, nilai_tambah:10};
const WLAB = {tugas:["wTugas", "wTugasD"], skill:["wSkill", "wSkillD"], bahasa:["wBahasa", "wBahasaD"], kontrak:["wKontrak", "wKontrakD"], nilai_tambah:["wNilai", "wNilaiD"]};
const wValid = (w) => !!w && typeof w === "object" && Object.keys(w).length === 5 && WKEYS.every(k => Number.isInteger(w[k]) && w[k] >= 0) && WKEYS.reduce((n, k) => n + w[k], 0) === 100;
function ssWire(){
  const amb = $("ssAmb"); amb.oninput = () => { $("ssAmbV").textContent = amb.value; };
  const mx = $("ssMax"), setMx = (v) => { v = Math.max(1, Math.min(50, v)); mx.dataset.v = v; $("ssMaxV").textContent = v; };
  $("ssMaxDn").onclick = () => setMx(Number(mx.dataset.v) - 1);
  $("ssMaxUp").onclick = () => setMx(Number(mx.dataset.v) + 1);
  const sum = () => WKEYS.reduce((n, k) => n + Number($("w_" + k).value), 0);
  const draw = () => { WKEYS.forEach(k => { $("wv_" + k).textContent = $("w_" + k).value; }); const t = sum(); $("wSum").classList.toggle("bad", t !== 100); $("wSumV").textContent = t; };
  WKEYS.forEach(k => { $("w_" + k).oninput = draw; });
  $("btnWReset").onclick = () => { WKEYS.forEach(k => { $("w_" + k).value = WDEF[k]; }); draw(); };
  $("btnSsFill").onclick = () => { closeApp(); novaSend(ssT("fillSay"), {chat:"raka"}); toast(ssT("filled")); };
  draw();
}
async function openSearchSettings(){
  const x = await getSearch();
  const ck = (name, vals, list) => list.map(v => `<label class="ckl"><input type="checkbox" name="${name}" value="${esc(v)}" ${arr(vals).includes(v) ? "checked" : ""}> ${esc(v)}</label>`).join("");
  const sel = (id, opts, cur) => `<select class="field" id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(cur) === String(v) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
  const w = wValid(x.bobot_skor) ? x.bobot_skor : WDEF, wChanged = WKEYS.some(k => w[k] !== WDEF[k]);
  const wRows = WKEYS.map(k => `<div class="wrow"><div><b>${ssT(WLAB[k][0])}</b><small>${ssT(WLAB[k][1])}</small></div><input type="range" class="rng" id="w_${k}" min="0" max="60" step="1" value="${w[k]}"><b class="wv mono" id="wv_${k}">${w[k]}</b></div>`).join("");
  const amb = Math.min(95, Math.max(60, Number(x.ambang_skor) || 80)), mxv = Math.min(50, Math.max(1, Number(x.maks_rekomendasi) || 5));
  $("drawer").innerHTML = `<div class="dr-head"><div><h2>Morning Report search settings</h2><div class="muted">Sinta uses these for every search: the scheduled one each morning and Run now.</div></div><button class="btn" id="drClose">Close</button></div>
    <div class="dr-body one"><div class="ss ss-grid">
      <div class="ss-col">
        <div class="ss-row"><label>Keywords</label>${chipBox("kw", arr(x.kata_kunci), "Type a keyword, press Enter")}<small>Job titles or skills, e.g. Werkstudent SAP, Data Analyst.</small></div>
        <div class="ss-row"><label>Locations</label>${chipBox("loc", arr(x.lokasi), "Type a city or region, press Enter")}</div>
        <div class="ss-two"><div class="ss-row"><label>Max distance</label>${sel("ssKm", [["", "No limit"], [10, "10 km"], [25, "25 km"], [50, "50 km"], [100, "100 km"]], x.jarak_km || "")}</div>
          <div class="ss-row"><label>Remote</label><label class="ckl"><input type="checkbox" id="ssRemote" ${x.remote_ok ? "checked" : ""}> Remote jobs are OK</label></div></div>
        <div class="ss-row"><label>Contract types</label><div class="cks">${ck("ct", x.jenis_kontrak, CONTRACTS)}</div></div>
        <div class="ss-two"><div class="ss-row"><label>Ad age</label>${sel("ssAge", [[1, "Last 24 hours"], [3, "Last 3 days"], [7, "Last 7 days"], [14, "Last 14 days"], [30, "Last 30 days"]], x.umur_iklan_hari || 7)}</div>
          <div class="ss-row"><label>Application language</label><div class="cks">${ck("lang", x.bahasa_lamaran, ["EN", "DE"])}</div></div></div>
        <div class="ss-row"><label>Exclude companies</label>${chipBox("ex", arr(x.kecualikan_perusahaan), "Company name, press Enter")}</div>
      </div>
      <div class="ss-col"><div class="ss-card">
        <div class="ss-fill"><button class="btn" id="btnSsFill">${ssT("fill")}</button><small>${ssT("fillHint")}</small></div>
        <h3>${ssT("matchT")}</h3>
        <div class="ss-row"><label>Match threshold</label><div class="thr"><input type="range" class="rng" id="ssAmb" min="60" max="95" step="1" value="${amb}"><span class="thrv"><b id="ssAmbV">${amb}</b><span class="of">/ 100</span></span></div><small>${ssT("ambHint")}</small></div>
        <div class="ss-row"><label>Max recommendations</label><div class="stepper" id="ssMax" data-v="${mxv}"><button type="button" id="ssMaxDn" aria-label="Fewer">−</button><b id="ssMaxV">${mxv}</b><button type="button" id="ssMaxUp" aria-label="More">+</button><span class="of">${ssT("perReport")}</span></div><small>${ssT("maxHint")}</small></div>
        <details class="ss-adv" ${wChanged ? "open" : ""}><summary>${ssT("advT")}</summary><small class="adv-h">${ssT("advHint")}</small>${wRows}<div class="wsum" id="wSum"><span>${ssT("total")} <b id="wSumV">100</b> / 100</span><button type="button" class="linkbtn" id="btnWReset">${ssT("reset")}</button></div></details>
      </div></div>
      <div class="ss-btns"><button class="btn" id="btnSsSave">Save</button><button class="btn primary" id="btnSsRun">Save and run now</button></div>
    </div></div>`;
  $("drawer").hidden = false; $("scrim").hidden = false; ssWire();
  setTimeout(() => { const i = document.querySelector('[data-chipbox="kw"] .chipin'); if (i) i.focus(); }, 0);
}
async function saveSearch(){
  // Text still typed in a chip field counts too.
  document.querySelectorAll(".chipin").forEach(i => { if (i.value.trim()) addChip(i); });
  const x = Object.assign({}, search || {});
  const checked = (n) => [...document.querySelectorAll(`input[name="${n}"]:checked`)].map(c => c.value);
  x.kata_kunci = chipVals("kw"); x.lokasi = chipVals("loc"); x.kecualikan_perusahaan = chipVals("ex");
  x.jarak_km = $("ssKm").value ? Number($("ssKm").value) : null; x.remote_ok = $("ssRemote").checked;
  x.jenis_kontrak = checked("ct"); x.umur_iklan_hari = Number($("ssAge").value); x.bahasa_lamaran = checked("lang");
  const mx = Number($("ssMax").dataset.v), amb = Number($("ssAmb").value);
  if (!Number.isInteger(mx) || mx < 1 || mx > 50){ toast("Max recommendations must be 1 to 50."); return false; }
  if (!Number.isInteger(amb) || amb < 60 || amb > 95){ toast("Match threshold must be 60 to 95."); return false; }
  const bobot = {}; WKEYS.forEach(k => { bobot[k] = Number($("w_" + k).value); });
  const tot = WKEYS.reduce((n, k) => n + bobot[k], 0);
  if (!WKEYS.every(k => Number.isInteger(bobot[k])) || tot !== 100){ toast(ssT("sumErr")(tot)); return false; }
  x.maks_rekomendasi = mx; x.ambang_skor = amb; x.bobot_skor = bobot;
  x.diperbarui = new Date().toISOString().slice(0, 10); x.oleh = "app";
  if (!x.kata_kunci.length){ toast("Add at least one keyword."); return false; }
  if (!invoke){ search = x; closeApp(); render(); toast("Search settings saved"); return true; }
  try { await invoke("search_settings_set", {root:folder, settings:x}); search = x; }
  catch (e){ toast(String(e)); return false; }
  closeApp(); render(); toast("Search settings saved");
  return true;
}
function addChip(input){
  const v = input.value.trim().replace(/,$/, ""); input.value = "";
  if (!v) return;
  const box = input.closest("[data-chipbox]");
  if (chipVals(box.dataset.chipbox).some(x => x.toLowerCase() === v.toLowerCase())) return;
  input.insertAdjacentHTML("beforebegin", `<span class="chipx">${esc(v)}<button data-chipdel title="Remove">×</button></span>`);
}
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "schT") schedSet(!!(SCHED && SCHED.registered), e.target.value || "07:00");
});
document.addEventListener("keydown", (e) => {
  const i = e.target.closest && e.target.closest(".chipin"); if (!i) return;
  if (e.key === "Enter" || e.key === ","){ e.preventDefault(); addChip(i); }
  else if (e.key === "Backspace" && !i.value){ const prev = i.previousElementSibling; if (prev && prev.classList.contains("chipx")) prev.remove(); }
});
// Run state, kept per folder so it survives a restart: "Searching…" until the report list changes.
const RUN_KEY = () => "vantage.lpRun:" + (folder || "");
const repSig = (reps) => JSON.stringify((reps || []).slice(0, 3).map(r => [r.date, r.data ? r.data.run : 0, r.data ? r.data.fokus : (r.text || "").length]));
function lpGet(){ try { return JSON.parse(localStorage.getItem(RUN_KEY()) || "null"); } catch { return null; } }
function lpSet(v){ try { v ? localStorage.setItem(RUN_KEY(), JSON.stringify(v)) : localStorage.removeItem(RUN_KEY()); } catch {} }
let lpTimer = null;
function lpWatch(reps){
  const r = lpGet(); if (!r) return;
  if (repSig(reps) !== r.sig){ lpSet(null); clearInterval(lpTimer); lpTimer = null; state.rep = 0; toast("New Morning Report is ready"); return; }
  if (Date.now() - r.at > 20 * 60 * 1000){ lpSet(null); clearInterval(lpTimer); lpTimer = null; state.lpLate = true; lpShowRun(); return; }
  if (!lpTimer) lpTimer = setInterval(() => refresh(), 15000);
}
// Shows the run state: searching (spinner + Stop waiting), timed out (message, Run is available again) or nothing.
function lpShowRun(){
  const r = lpGet(), el = $("lpRun"), b = $("btnLpRun"); if (!el || !b) return;
  b.disabled = !!r;
  el.classList.toggle("late", !r && !!state.lpLate);
  if (r){
    el.hidden = false;
    el.innerHTML = `<i class="spin"></i><span class="lp-rt" title="Press Enter in the chat if you have not yet.">Searching… since ${new Date(r.at).toLocaleTimeString(LOC(), {hour:"2-digit", minute:"2-digit"})}</span><button class="linkbtn" id="btnLpCancel">Stop waiting</button>`;
  } else if (state.lpLate){
    el.hidden = false;
    el.innerHTML = `<span class="lp-rt" title="Check the chat with Nova, then run it again.">No report arrived within 20 minutes. Try again.</span>`;
  } else { el.hidden = true; el.innerHTML = ""; }
}
function lpStop(){ lpSet(null); clearInterval(lpTimer); lpTimer = null; state.lpLate = false; lpShowRun(); }
async function runReport(){
  const x = await getSearch();
  if (!arr(x.kata_kunci).length){ openSearchSettings(); toast("Add at least one keyword first."); return; }
  const reps = repsOf(state.data || {});
  state.lpLate = false;
  lpSet({at: Date.now(), sig: repSig(reps)});
  lpShowRun(); lpWatch(reps);
  sendNow(say("runreport"), "lamaran", "sinta");   // Sinta runs the whole morning report herself (search, then Arga), no Nova in between
}
const fmtSize = (kb, dir) => dir ? "folder" : kb >= 1048576 ? (kb / 1048576).toFixed(1) + " GB" : kb >= 1024 ? (kb / 1024).toFixed(1) + " MB" : Math.max(1, kb) + " KB";
const fmtTime = (s) => s ? new Date(s * 1000).toLocaleString(LOC(), {day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit"}) : "";
function inboxPage(d){
  const items = d.inbox || [];
  const list = items.length ? `<table class="inbox-t"><thead><tr><th class="ck"><input type="checkbox" id="ibAll" aria-label="Select all"></th><th>Name</th><th>Size</th><th>Added</th><th></th></tr></thead><tbody>` +
      items.map(it => `<tr><td class="ck"><input type="checkbox" class="ibck" value="${esc(it.name)}" aria-label="Select ${esc(it.name)}"></td><td><b>${esc(it.name)}</b></td><td class="mono">${fmtSize(it.kb, it.folder)}</td><td class="mono">${esc(fmtTime(it.modified))}</td>` +
        `<td class="ibx"><button class="btn sm" data-ibtrash="${esc(it.name)}" title="Move to Trash">Remove</button></td></tr>`).join("") + `</tbody></table>`
    : '<div class="empty">Your Inbox is empty.</div>';
  setTimeout(loadLastTidy, 0);
  return `<div class="inbox">
    <section class="drop" id="drop"><div class="drop-ic"><svg viewBox="0 0 16 16">${ICONS.inbox}</svg></div>
      <b>Drop files or folders here</b><span class="muted">They are copied into your Inbox. Your originals stay where they are.</span>
      <div class="drop-btns"><button class="btn" id="btnPickFiles">Choose files</button><button class="btn" id="btnPickDir">Choose a folder</button></div></section>
    <section class="panel"><div class="head"><h2>In your Inbox</h2><span class="cap">${items.length} ${items.length === 1 ? "item" : "items"}</span></div>${list}
      <div class="inbox-foot"><span class="muted">Raka sorts these into your user documents.</span><button class="btn" id="btnIbTrash" hidden>Remove selected</button>${typeof novaTidyBusy === "function" && novaTidyBusy() ? `<button class="btn primary" disabled><i class="spin"></i> Raka is tidying up…</button>` : `<button class="btn primary" id="btnTidy" ${items.length ? "" : "disabled"}>Tidy up</button>`}</div></section>
    <div id="lastTidy"></div>
  </div>`;
}
// The last tidy-up, on the Inbox page: what moved where, what went to the Trash, what was skipped, with Undo for the moves.
let LASTT = null;
async function loadLastTidy(){
  if (!invoke || !folder) return;
  let t = null; try { t = await invoke("nova_inbox_last", {root: folder}); } catch {}
  LASTT = t && JSON.stringify(t) !== state.tidyUndone ? t : null;
  drawLastTidy();
}
function drawLastTidy(){
  const el = $("lastTidy"); if (!el) return;
  const t = LASTT;
  if (state.tidyNote){ el.innerHTML = `<section class="panel"><div class="muted">${esc(state.tidyNote)}</div></section>`; return; }
  if (!isObj(t)){ el.innerHTML = ""; return; }
  const pair = (v) => arr(v).filter(x => Array.isArray(x) && typeof x[0] === "string" && typeof x[1] === "string");
  const moved = pair(t.moved), skipped = pair(t.skipped), dups = pair(t.duplicates), trashed = arr(t.trashed).filter(x => typeof x === "string");
  if (!moved.length && !skipped.length && !dups.length && !trashed.length){ el.innerHTML = ""; return; }
  const short = (p) => p.replace(/^01_user_documents\/(materials\/)?/, "");
  const parts = [];
  if (moved.length) parts.push(moved.length + " " + ft("moved", "verschoben", "dipindah"));
  if (dups.length) parts.push(dups.length + " " + ft("already there (to Trash)", "schon vorhanden (im Papierkorb)", "sudah ada (ke Trash)"));
  if (trashed.length) parts.push(trashed.length + " " + ft("to Trash", "im Papierkorb", "ke Trash"));
  if (skipped.length) parts.push(skipped.length + " " + ft("skipped", "übersprungen", "dilewati"));
  const li = (s) => `<div>· ${esc(s)}</div>`;
  const body = moved.map(([a, b]) => li(a + " → " + short(b))).concat(
    dups.map(([a, b]) => li(a + ": " + ft("the same file is already at ", "dieselbe Datei liegt schon in ", "file yang sama sudah ada di ") + short(b))),
    trashed.map(a => li(a + " → Trash")), skipped.map(([a, why]) => li(a + ": " + why))).join("");
  const undoRow = moved.length ? `<div class="lt-act"><button class="btn sm" data-act="inbox-undo">${ft("Undo", "Rückgängig", "Urungkan")}</button><span class="muted">${ft("Puts the moved files back in the Inbox. Files in the Trash stay there: restore them from the Trash.", "Legt die verschobenen Dateien zurück in die Inbox. Dateien im Papierkorb bleiben dort: hol sie von dort zurück.", "Mengembalikan file yang dipindah ke Inbox. File di Trash tetap di sana: pulihkan dari Trash.")}</span></div>` : "";
  const title = ft("Last tidy-up", "Letztes Aufräumen", "Rapikan terakhir");
  el.innerHTML = `<section class="panel lasttidy"><details><summary><b>${title}</b> <span class="muted">${esc(parts.join(" · "))}</span></summary><div class="lt-body">${body}</div></details>${undoRow}</section>`;
}
async function inboxUndo(){
  const was = LASTT;
  try {
    const r = await invoke("nova_inbox_undo", {root: folder});
    state.tidyUndone = JSON.stringify(was);
    const n = arr(r && r.restored).length, sk = arr(r && r.skipped).length;
    state.tidyNote = n + " " + ft("files are back in the Inbox.", "Dateien sind zurück in der Inbox.", "file kembali ke Inbox.") + (sk ? " " + sk + " " + ft("could not be put back.", "ließen sich nicht zurücklegen.", "tidak bisa dikembalikan.") : "");
    setTimeout(() => { state.tidyNote = ""; drawLastTidy(); }, 6000);
  } catch (e) { toast(String(e)); }
  LASTT = null; drawLastTidy(); await refresh(true);
}
function niceName(s){ return String(s || "").split(/[\s_-]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" "); }
function initials(n){ return String(n || "?").split(/[\s_-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?"; }

function render(){
  const d = state.data;
  // The Nova tab uses a full-width layout (body.chat in style.css); the palette is the same as everywhere else.
  document.body.classList.toggle("chat", state.view === "nova");
  // Today's date only on the Dashboard; on other pages it read like a heading for the list below it.
  $("date").textContent = state.view === "dash" ? new Date().toLocaleDateString(LOC(),{weekday:"long",day:"numeric",month:"long",year:"numeric"}) : "";
  if (!d || !d.ok){
    $("who").textContent = "—"; $("whoSub").textContent = "Select your folder"; $("inboxN").hidden = true;
    $("view").innerHTML = d && folder
      ? `<section class="panel"><div class="empty">This folder is not complete. Vantage can add the missing parts; nothing that is already there is changed.<br><br><button class="btn primary" id="btnRepair">Set up this folder</button> <button class="btn" id="btnPick">Choose another folder</button></div></section>`
      : `<section class="panel"><div class="empty">Please select your personal Vantage folder first.<br><br><button class="btn primary" id="btnPick">Select Vantage folder</button></div></section>`;
    $("btnPick").onclick = pick; if ($("btnRepair")) $("btnRepair").onclick = () => openChosen(folder); return;
  }
  $("who").textContent = d.full_name || niceName(d.user);
  $("userBtn").title = "Switch user";
  if (!$("avatar").firstChild) $("avatar").textContent = initials(d.full_name || niceName(d.user));
  const n = (d.inbox || []).length;
  $("inboxN").hidden = !n; $("inboxN").textContent = n;
  if (state.view === "nova") return novaRender();
  if (state.view === "profil") $("title").textContent = "Profile";
  $("view").innerHTML = state.view === "dash" ? dash(d) : state.view === "inbox" ? inboxPage(d) : state.view === "pipeline" || state.view === "apps" ? lamaranPage(d) : state.view === "skill" ? skillPage(d) : state.view === "interview" ? interviewPage(d) : state.view === "profil" ? profilPage(d) : laporanPage(d);
  if (typeof novaEmbeds === "function") novaEmbeds();
  (window.VH || []).forEach(f => { try { f(state.view, d); } catch (e) { console.warn("feature hook", e); } });   // feature hook (proposals)
}
// Feature hooks: a feature registers a function that runs after every page render (and once right away when it loads late).
window.vhook = (fn) => { (window.VH = window.VH || []).push(fn); if (state.data && state.data.ok) setTimeout(() => { try { fn(state.view, state.data); } catch (e) { console.warn("feature hook", e); } }, 0); };

async function refresh(force){
  if (!invoke){ state.data = MOCK; return render(); }
  if (!folder){ state.data = null; return render(); }
  // Cheap check first: modification times of what the app shows. No change = no scan, no render.
  if (!force && state.sig){
    let fp = null;
    try { fp = await invoke("fingerprint", {root:folder}); } catch {}
    if (fp !== null && fp === state.fp){ $("upd").textContent = "Refreshed " + new Date().toLocaleTimeString(LOC(), {hour:"2-digit", minute:"2-digit"}); return; }
    state.fp = fp;
  } else {
    try { state.fp = await invoke("fingerprint", {root:folder}); } catch {}
  }
  let next;
  try { next = await invoke("scan", {path: folder}); }
  catch (e){ next = {ok:false, error:String(e)}; }
  $("upd").textContent = "Refreshed " + new Date().toLocaleTimeString(LOC(), {hour:"2-digit", minute:"2-digit"});
  // Re-render only when something changed, so scroll position and open panels are kept.
  const sig = JSON.stringify(next);
  if (sig === state.sig) return;
  state.sig = sig; state.data = normalizeReports(next);
  if (next && next.ok) migrateSched();
  // The Nova tab repaints itself; a full render would clear what the user is typing.
  if (state.view !== "nova") render();
}

// No folder yet (or a broken one): choose an existing Vantage folder, or let the app set up a new one from the template
// bundled inside it. A chosen folder that is empty or not a Vantage folder is set up, never reported as an error.
async function pick(){
  if (!T){ toast("Available only in the Vantage application"); return; }
  const fresh = await dialog({title:"Your Vantage folder", text:"Vantage keeps your materials, applications and reports in one folder on this computer.",
    ok:"Set up a new Vantage folder", no:"Choose my existing folder"});
  if (fresh) return setupNew();
  const p = await T.dialog.open({directory:true, title:trText("Select your personal Vantage folder")});  // native window: translated here
  if (p) openChosen(p);
}
async function setupNew(dir){
  if (!dir){ try { dir = await invoke("default_vantage_dir"); } catch { return; } }
  const name = await dialog({title:"Set up a new Vantage folder", text:trText("Your folder will be created here:") + " " + dir + "\n" + trText("What is your full name?"), input:"Full name", ok:"Create"});
  if (!name) return;
  try {
    const u = await invoke("vantage_setup", {dir, fullName:name});
    useFolder(u);
    toast(trText("Your Vantage folder is ready. Say hi to Nova to get started."));
    dockOpen("nova");
  } catch (e){ toast(String(e)); }
}
async function openChosen(p){
  let i = null;
  try { i = await invoke("inspect_folder", {dir:p}); } catch {}
  if (!i) return useFolder(p);
  if (i.kind === "user"){
    try { await invoke("vantage_setup", {dir:p, fullName:""}); } catch {}  // adds missing system parts, never overwrites
    return useFolder(p);
  }
  if (i.kind === "package" && i.users.length) return useFolder(i.users[0]);
  const ok = await dialog({title:"Set up Vantage here?",
    text: i.kind === "other" ? "This folder is not a Vantage folder yet. Set up Vantage inside it? Nothing in it is changed or deleted." : "This folder is empty. Set up your Vantage folder here?",
    ok:"Set up here"});
  if (ok) setupNew(p);
}
// Last used folders, newest first (for "Switch user").
const RECENT = "vantage.recent";
const recent = { get(){ try { return JSON.parse(localStorage.getItem(RECENT) || "[]"); } catch { return []; } },
                 set(v){ try { localStorage.setItem(RECENT, JSON.stringify(v)); } catch {} },
                 add(p){ recent.set([p, ...recent.get().filter(x => x !== p)].slice(0, 6)); } };
// Drop users whose folder was deleted (e.g. in Finder). If the current one is gone, ask for a folder.
async function pruneUsers(){
  if (!invoke) return;
  const all = [...new Set([folder, ...recent.get()].filter(Boolean))];
  let alive = all;
  try { alive = await invoke("existing_dirs", {paths:all}); } catch { return; }
  recent.set(recent.get().filter(p => alive.includes(p)));
  if (folder && !alive.includes(folder)){
    folder = ""; store.set(""); state.data = null; state.sig = null; render();
    toast("That user's folder no longer exists. Please choose a Vantage folder.");
  }
}
function useFolder(p){
  folder = p; store.set(p); recent.add(p);
  state.sig = null; state.schedChecked = false; $("avatar").textContent = ""; loadPhoto(); refresh(true); loadPrefs();
}
async function loadPhoto(){
  if (!invoke || !folder) return;
  let url = "";
  try { url = await invoke("user_photo", {root:folder}); } catch {}
  const a = $("avatar"); a.textContent = "";
  if (url){ const img = new Image(); img.src = url; img.alt = ""; a.appendChild(img); }
  else if (state.data && state.data.ok) a.textContent = initials(state.data.full_name || state.data.user);
}
const baseName = (p) => String(p).split(/[\\/]/).filter(Boolean).pop() || p;
// The name/avatar opens the user menu (switch user, language, tutorial, updates). Profile is its own sidebar tab.
$("userBtn").onclick = (e) => {
  if (!state.data || !state.data.ok) return pick();
  $("userMenuBtn").onclick(e);
};
$("userMenuBtn").onclick = async (e) => {
  e.stopPropagation();
  const m = $("umenu");
  if (!m.hidden){ m.hidden = true; return; }
  await pruneUsers();
  const others = recent.get().filter(p => p !== folder);
  let labels = []; try { labels = invoke ? await invoke("user_labels", {paths: others}) : []; } catch {}
  m.innerHTML = `<div class="cap">Switch user</div>` +
    others.map((p, i) => `<button data-folder-pick="${esc(p)}" title="${esc(p)}">${esc(labels[i] || niceName(baseName(p)))}</button>`).join("") +
    `<button data-folder-pick="" class="new">+ Create new user</button>`;
  m.hidden = false;
};
$("umenu").onclick = (e) => {
  const tb = e.target.closest("[data-tour]");
  if (tb){ $("umenu").hidden = true; if (tb.dataset.tour === "update"){ checkUpdate(true); checkAppUpdate(); } else if (tb.dataset.tour === "log") showLog(); else startTour(tb.dataset.tour === "lang"); return; }
  const b = e.target.closest("[data-folder-pick]"); if (!b) return;
  $("umenu").hidden = true;
  if (b.dataset.folderPick) useFolder(b.dataset.folderPick); else createUser();
};
// Edit the displayed full name, and take a user out of Vantage (two confirmations; nothing is erased, see remove_user).
const UD = {
  edit:{en:"Edit name", de:"Namen ändern", id:"Ubah nama"},
  editT:{en:"Your full name", de:"Dein vollständiger Name", id:"Nama lengkap kamu"},
  editIn:{en:"Full name", de:"Vollständiger Name", id:"Nama lengkap"},
  save:{en:"Save", de:"Speichern", id:"Simpan"},
  dz:{en:"Delete this user", de:"Diesen Nutzer löschen", id:"Hapus user ini"},
  dzx:{en:"Takes this user out of Vantage. Nothing is erased at once; you confirm twice.", de:"Nimmt diesen Nutzer aus Vantage heraus. Nichts wird sofort gelöscht; du bestätigst zweimal.", id:"Mengeluarkan user ini dari Vantage. Tidak ada yang langsung terhapus; kamu konfirmasi dua kali."},
  btn:{en:"Delete this user…", de:"Diesen Nutzer löschen…", id:"Hapus user ini…"},
  t1:{en:"Delete this user?", de:"Diesen Nutzer löschen?", id:"Hapus user ini?"},
  x1:{en:(n) => `${n}: the whole Vantage folder (materials, applications, reports, chats and settings) leaves Vantage. It is moved to the folder "_Deleted_Users" next to it, so you can still move it back by hand until you empty that folder yourself.`,
      de:(n) => `${n}: Der gesamte Vantage-Ordner (Materialien, Bewerbungen, Berichte, Chats und Einstellungen) wird aus Vantage entfernt. Er wird in den Ordner „_Deleted_Users“ daneben verschoben und kann von Hand zurückgelegt werden, bis du diesen Ordner selbst leerst.`,
      id:(n) => `${n}: seluruh folder Vantage (bahan, lamaran, laporan, chat, dan pengaturan) keluar dari Vantage. Folder itu dipindah ke folder "_Deleted_Users" di sebelahnya, jadi masih bisa dikembalikan manual sampai kamu sendiri mengosongkan folder itu.`},
  cont:{en:"Continue", de:"Weiter", id:"Lanjut"},
  t2:{en:"Type the name to confirm", de:"Zur Bestätigung den Namen eintippen", id:"Ketik nama untuk konfirmasi"},
  x2:{en:(n) => `To avoid a wrong click, type the name exactly as shown: ${n}`, de:(n) => `Um einen Fehlklick zu vermeiden, tippe den Namen genau so ein: ${n}`, id:(n) => `Supaya tidak salah pencet, ketik nama persis seperti ini: ${n}`},
  in2:{en:"Name", de:"Name", id:"Nama"},
  ok2:{en:"Delete user", de:"Nutzer löschen", id:"Hapus user"},
  mismatch:{en:"The name did not match. Nothing was deleted.", de:"Der Name stimmt nicht überein. Nichts wurde gelöscht.", id:"Namanya tidak cocok. Tidak ada yang dihapus."},
  done:{en:(n) => `${n} was taken out of Vantage.`, de:(n) => `${n} wurde aus Vantage entfernt.`, id:(n) => `${n} sudah dikeluarkan dari Vantage.`},
};
const ud = (k, ...a) => { const t = UD[k][lang] || UD[k].en; return typeof t === "function" ? t(...a) : t; };
async function editName(){
  const d = state.data; if (!d || !d.ok || !invoke) return;
  const name = await dialog({title:ud("editT"), input:ud("editIn"), value:d.full_name || "", ok:ud("save")});
  if (!name) return;
  try { await invoke("set_full_name", {root:folder, name}); $("avatar").textContent = ""; loadPhoto(); refresh(true); }
  catch (e){ toast(String(e)); }
}
async function deleteUser(){
  const d = state.data; if (!d || !d.ok || !invoke) return;
  const name = d.full_name || niceName(d.user);
  if (!await dialog({title:ud("t1"), text:ud("x1", name), ok:ud("cont"), danger:true})) return;
  const typed = await dialog({title:ud("t2"), text:ud("x2", name), input:ud("in2"), ok:ud("ok2"), danger:true});
  if (!typed) return;
  if (typed.trim().toLowerCase() !== name.trim().toLowerCase()) return toast(ud("mismatch"));
  try { await invoke("remove_user", {root:folder}); } catch (e){ return toast(String(e)); }
  recent.set(recent.get().filter(p => p !== folder));
  folder = ""; store.set(""); state.data = null; state.sig = null;
  toast(ud("done", name));
  if (!(await autoFind())){ render(); pick(); }
}
async function createUser(){
  if (!folder){ pick(); return; }
  const name = await dialog({title:dt("newT"), text:dt("newX"), input:dt("newIn"), ok:dt("create")});
  if (!name) return;
  try { const p = await invoke("create_user", {current:folder, fullName:name}); useFolder(p); toast("Created " + baseName(p) + ". Nova will guide the setup in the chat."); }
  catch (e){ toast(String(e)); }
}
document.addEventListener("click", (e) => { if (!e.target.closest(".userbox")) $("umenu").hidden = true; });

// Inbox: copy files into the user's Inbox folder (drop anywhere on the window, or choose).
// The copy runs in Rust on its own thread (any type, any size, no file data through the bridge);
// it reports "inbox-progress" events, shown in a small bar, until phase "done".
async function addToInbox(paths){
  if (!paths || !paths.length) return;
  if (!folder){ toast("Please select your Vantage folder first."); return; }
  try { await invoke("inbox_add", {root:folder, paths}); inboxBar({phase:"scan", done_items:0, total_items:0, done_bytes:0, total_bytes:0}); }
  catch (e){ toast(String(e)); }
}
const mb = (b) => b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : b >= 1e6 ? (b / 1e6).toFixed(b >= 1e8 ? 0 : 1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB";
function inboxBar(p){
  const el = $("inboxJob"); if (!el) return;
  const pct = p.total_bytes ? Math.min(100, Math.round(p.done_bytes / p.total_bytes * 100)) : 0;
  const what = p.phase === "scan" ? "Preparing…" : p.phase === "download" ? `Downloading from iCloud: ${esc(p.current)}` :
    `Copying ${Math.min(p.done_items + 1, p.total_items)} of ${p.total_items} · ${mb(p.done_bytes)} of ${mb(p.total_bytes)}`;
  el.innerHTML = `<span>${what}</span><i><em style="width:${pct}%"></em></i>`;
  el.hidden = false;
}
async function inboxDone(p){
  $("inboxJob").hidden = true;
  const n = p.added.length;
  if (p.errors.length) toast((n ? `${n} added. ` : "") + "Not copied: " + p.errors.join("; "));
  else toast(n === 1 ? `Added to your Inbox: ${p.added[0]}` : n + " items added to your Inbox");
  state.sig = null; await refresh(true);
}
if (T && T.event) T.event.listen("inbox-progress", (e) => e.payload.phase === "done" ? inboxDone(e.payload) : inboxBar(e.payload));
// Remove from the Inbox = move to the Trash (can be put back from there), after a confirm.
async function inboxTrash(names){
  if (!names.length || !invoke) return;
  const bin = IS_MAC ? "Trash" : "Recycle Bin";
  const ok = await dialog({title: names.length === 1 ? "Remove from Inbox?" : `Remove ${names.length} items from Inbox?`,
    text: (names.length === 1 ? names[0] : names.slice(0, 5).join(", ") + (names.length > 5 ? ", …" : "")) + ` will be moved to the ${bin}. You can put it back from there.`,
    ok: `Move to ${bin}`, danger: true});
  if (!ok) return;
  try { const n = await invoke("inbox_trash", {root:folder, names}); toast(n === 1 ? `Moved to the ${bin}` : `${n} items moved to the ${bin}`); }
  catch (e){ toast(String(e)); }
  state.sig = null; await refresh(true);
}
document.addEventListener("change", (e) => {
  if (e.target.id === "ibAll") document.querySelectorAll(".ibck").forEach(c => { c.checked = e.target.checked; });
  if (e.target.id === "ibAll" || e.target.classList.contains("ibck")){
    const n = document.querySelectorAll(".ibck:checked").length, b = $("btnIbTrash");
    if (b){ b.hidden = !n; b.textContent = `Remove selected (${n})`; }
  }
});
async function pickInbox(dir){
  if (!T){ toast("Available only in the Vantage application"); return; }
  const p = await T.dialog.open({multiple:!dir, directory:dir, title: trText(dir ? "Choose a folder for your Inbox" : "Choose files for your Inbox")});
  if (p) addToInbox(Array.isArray(p) ? p : [p]);
}
// File drops come from Rust ("vantage-drop", forwarded from the window's native drag-and-drop) so they work
// on every page, also while the chat webview is in the window. A full-window overlay shows where they go.
let lastDrop = 0;
function onDrop(p){
  const t = p && p.type;
  document.body.classList.toggle("dragging", t === "over");
  const dz = $("drop"); if (dz) dz.classList.toggle("over", t === "over");
  if (t === "drop" && Date.now() - lastDrop > 800){ lastDrop = Date.now(); addToInbox(p.paths || []); }
}
if (T && T.event) T.event.listen("vantage-drop", (e) => onDrop(e.payload));
if (T && T.webview) T.webview.getCurrentWebview().onDragDropEvent((ev) => onDrop({type: ev.payload.type === "drop" ? "drop" : ev.payload.type === "leave" ? "leave" : "over", paths: ev.payload.paths}));

// A request from a button (Update Master CV, Prepare interview, Morning report, …): open the Nova tab on the chat that
// does that work with the request ready in its input. Nothing is sent until the user presses Send.
// Like sendToClaude, but the message goes out at once (buttons that are a clear request in themselves).
async function sendNow(text, chat, agent){
  if (!invoke){ toast("Available only in the Vantage application"); return; }
  const id = chat || "nova";
  if (!nova.cli || !nova.cli.logged_in){ try { nova.cli = await invoke("nova_status"); } catch {} }
  dockOpen(id);   // not connected yet: the chat window shows how to install Claude Code or sign in
  if (!nova.cli || !nova.cli.logged_in) return;
  novaSend(text, agent ? {chat:id, agent} : {chat:id});   // agent: straight to that member, Nova is not asked first
}
function sendToClaude(text, chat){
  if (!invoke){ toast("Available only in the Vantage application"); return; }
  dockOpen(chat || "nova", text);
  toast("Message ready. Press Send.");
}

// Opens a view from anywhere. "pipeline" is the Board mode of the Applications tab.
function goView(v){
  if (v === "nova"){   // the full-screen chat is no longer in the menu; it opens from the chat window's full-screen button
    document.querySelectorAll("#nav a").forEach(x => x.classList.remove("on"));
    state.view = "nova"; $("title").textContent = "Chat"; document.querySelector(".main").scrollTop = 0; render(); return;
  }
  if (v === "pipeline"){ setAppsMode("board"); v = "apps"; }
  const a = document.querySelector(`#nav a[data-view="${v}"]`); if (a) a.click();
}
$("nav").onclick = (e) => {
  const a = e.target.closest("a"); if (!a) return; e.preventDefault();
  document.querySelectorAll("#nav a").forEach(x => x.classList.toggle("on", x === a));
  if (e.isTrusted) state.pipeIds = null;
  state.view = a.dataset.view;
  $("title").textContent = [...a.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim();
  document.querySelector(".main").scrollTop = 0; render();
};
const OPEN_LABEL = IS_MAC ? "Open in Finder" : "Open in File Explorer";
function openFolder(rel){
  if (!invoke){ toast("Available only in the Vantage application"); return; }
  invoke("open_app_folder", {root:folder, folder:rel}).catch(err => toast(String(err)));
}
$("view").onclick = (e) => {
  const dm0 = e.target.closest("[data-dismiss]");
  if (dm0){ dismiss(dm0.dataset.dismiss); render(); return; }
  if (e.target.closest("#btnPickFiles")) return pickInbox(false);
  if (e.target.closest("#btnPickDir")) return pickInbox(true);
  // Prototype: the Inbox tidy-up runs in the Nova tab (Raka decides, the app moves the files).
  if (e.target.closest("#btnTidy")) return novaTidy();
  if (e.target.closest('[data-act="inbox-undo"]')) return inboxUndo();
  const sks = e.target.closest("[data-sksort]");
  if (sks){ const k = sks.dataset.sksort, so = state.skSort || {k:"count", desc:true}; state.skSort = {k, desc: so.k === k ? !so.desc : k !== "skill"}; drawSkills(); return; }
  const skf = e.target.closest("[data-skfilter]");
  if (skf){ state.skFilter = skf.dataset.skfilter; drawSkills(); return; }
  const skr = e.target.closest("[data-skrow]");
  if (skr && !e.target.closest("button")){ state.skOpen = state.skOpen === skr.dataset.skrow ? null : skr.dataset.skrow; drawSkills(); return; }
  if (e.target.closest("#btnLpEdit")) return openSearchSettings();
  const rtab = e.target.closest("[data-rtab]");
  if (rtab){ state.rtab = rtab.dataset.rtab; render(); return; }
  if (e.target.closest("#lpSched .sw")){ const t = ($("schT") || {}).value || "07:00"; return schedSet(!(SCHED && SCHED.registered), t); }
  if (e.target.closest('#lpSched [data-act="retry"]')) return runReport();
  if (e.target.closest('#lpSched [data-act="sched-retry"]')) return loadSched();
  if (e.target.closest("#btnLpRun")) return runReport();
  if (e.target.closest("#btnLpCancel")) return lpStop();
  const bc = e.target.closest(".card[data-id]");
  if (bc && !e.target.closest("button") && Date.now() - (state.dragEnd || 0) > 400){ openApp(bc.dataset.id); return; }
  const rr = e.target.closest("[data-reprange]");
  if (rr){ state.repRange = rr.dataset.reprange; render(); return; }
  const am = e.target.closest("[data-amode]");
  if (am){ setAppsMode(am.dataset.amode); render(); return; }
  const ibt = e.target.closest("[data-ibtrash]");
  if (ibt) return inboxTrash([ibt.dataset.ibtrash]);
  if (e.target.closest("#btnIbTrash")) return inboxTrash([...document.querySelectorAll(".ibck:checked")].map(c => c.value));
  if (e.target.closest("#btnEditName")) return editName();
  if (e.target.closest("#btnDelUser")) return deleteUser();
  if (e.target.closest("#btnOpenUser")){
    if (!invoke){ toast("Available only in the Vantage application"); return; }
    return invoke("open_path", {path:folder}).catch(err => toast(String(err)));
  }
  const rep = e.target.closest("[data-rep]");
  if (rep){ state.rep = Number(rep.dataset.rep); state.rtab = "today"; render(); return; }
  const g = e.target.closest("[data-go]");
  if (g && !e.target.closest("[data-open]")){ const v = g.dataset.go; goView(v); return; }
  if (e.target.closest("#sortDir")){ const v = getSort(); v.desc = !v.desc; setSort(v); render(); return; }
  if (e.target.closest("[data-clearfilter]")){ state.pipeIds = null; render(); return; }
  const nr = e.target.closest("[data-noreply]");
  if (nr){ state.pipeIds = nr.dataset.noreply.split(","); state.range = "all"; goView("pipeline"); return; }
  const mg = e.target.closest("[data-mgroup]");
  if (mg){ state.matGroup = mg.dataset.mgroup; render(); return; }
  const mt = e.target.closest("[data-mtoggle]");
  if (mt){ state.collapsed[mt.dataset.mtoggle] = !state.collapsed[mt.dataset.mtoggle]; render(); return; }
  const mr = e.target.closest("[data-mat]");
  if (mr){ openMaterial(mr.dataset.mat); return; }
  const vf = e.target.closest("[data-viewfile]");
  if (vf){ viewFile(vf.dataset.viewfile); return; }
  const rg = e.target.closest("[data-range]");
  if (rg){ state.range = rg.dataset.range; render(); return; }
  const op = e.target.closest("[data-open]");
  if (op){ openApp(op.dataset.open); return; }
  const fr = e.target.closest("[data-file]");
  if (fr){ showFile(fr.dataset.file, fr.dataset.target || "drView"); return; }
  const of = e.target.closest("[data-openfile]");
  if (of){ invoke && invoke("open_file", {root:folder, rel:of.dataset.openfile}).catch(err => toast(String(err))); return; }
  const say = e.target.closest("[data-say]");
  if (say){ if (say.dataset.send) sendNow(say.dataset.say, say.dataset.chat, say.dataset.agent); else sendToClaude(say.dataset.say, say.dataset.chat); return; }
  const a = e.target.closest("a[data-url]"); if (!a) return; e.preventDefault();
  if (invoke) invoke("open_url", {url:a.dataset.url}).catch(err => toast(String(err)));
};
$("view").addEventListener("change", (e) => {
  if (e.target.id === "sortBy"){ const v = getSort(); v.by = e.target.value; v.desc = v.by !== "name"; setSort(v); render(); }
});
$("view").addEventListener("input", (e) => {
  if (e.target.id !== "msearch") return;
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll("#mlist .mrow").forEach(r => { r.hidden = q && !r.dataset.q.includes(q); });
  document.querySelectorAll("#mlist .mgroup").forEach(g => { g.hidden = q && !g.querySelector(".mrow:not([hidden])"); if (q) g.classList.remove("closed"); });
});
// Right-click menu on application cards and rows.
$("ctxOpen").textContent = OPEN_LABEL;
const ctxMenu = (e) => {
  const rg = e.target.closest("[data-range]");
  if (rg){
    e.preventDefault();
    const m = $("ctx"); m.hidden = false; m.dataset.range = rg.dataset.range; m.dataset.folder = ""; m.dataset.ufolder = "";
    $("ctxOpen").textContent = "Set as default"; m.style.left = e.clientX + "px"; m.style.top = e.clientY + "px"; return;
  }
  $("ctxOpen").textContent = OPEN_LABEL; $("ctx").dataset.range = "";
  const el = e.target.closest("[data-folder],[data-ufolder]"); if (!el) return;
  e.preventDefault();
  const m = $("ctx"); m.hidden = false;
  m.dataset.folder = el.dataset.folder || ""; m.dataset.ufolder = el.dataset.folder ? "" : el.dataset.ufolder;
  m.style.left = Math.min(e.clientX, innerWidth - m.offsetWidth - 8) + "px";
  m.style.top = Math.min(e.clientY, innerHeight - m.offsetHeight - 8) + "px";
};
$("view").oncontextmenu = ctxMenu;
$("drawer").oncontextmenu = ctxMenu;
$("ctxOpen").onclick = () => {
  const m = $("ctx"); m.hidden = true;
  if (m.dataset.range){ try { localStorage.setItem(RANGE_DEF, m.dataset.range); } catch {} state.range = m.dataset.range; render(); toast("Default filter saved"); return; }
  if (m.dataset.ufolder) invoke && invoke("reveal_path", {root:folder, rel:m.dataset.ufolder}).catch(err => toast(String(err)));
  else openFolder(m.dataset.folder);
};
document.addEventListener("click", (e) => { if (!e.target.closest("#ctx")) $("ctx").hidden = true; });
document.addEventListener("scroll", () => { $("ctx").hidden = true; }, true);

// Sidebar: full or icon rail. Remembered per computer; below 900 px it collapses automatically.
const SB = "vantage.sidebar";
const sbPref = () => { try { return localStorage.getItem(SB) || "full"; } catch { return "full"; } };
function applySidebar(){
  const rail = sbPref() === "rail" || innerWidth < 900;
  document.body.classList.toggle("rail", rail);
  $("sbToggle").title = rail ? "Show sidebar" : "Hide sidebar";
  document.querySelectorAll("#nav a").forEach(a => a.title = rail ? [...a.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("").trim() : "");
}
$("sbToggle").onclick = () => { try { localStorage.setItem(SB, document.body.classList.contains("rail") ? "full" : "rail"); } catch {} applySidebar(); };
window.addEventListener("resize", applySidebar);
applySidebar();

// Drawer (application details).
async function removeApp(id){
  const a = (state.data.apps || []).find(x => String(x.id) === String(id)); if (!a) return;
  if (!await dialog({title:dt("rmT"), text:dt("rmX", a.company, a.role), ok:dt("remove"), danger:true})) return;
  try {
    const r = await invoke("remove_application", {root:folder, id:String(id)});
    closeApp(); state.sig = null; await refresh(true);
    toast(`${a.company} removed from the tracker` + (r.tracker === "ok" ? "" : " (Excel not rebuilt: " + r.tracker + ")"), {label:"Undo", run: async () => {
      try { await invoke("restore_application", {root:folder, entry:r.entry, index:r.index}); state.sig = null; await refresh(true); toast("Restored"); }
      catch (err){ toast(String(err)); }
    }});
  } catch (err){ toast(String(err)); }
}
$("drawer").onclick = (e) => {
  if (e.target.closest("#drClose")) return closeApp();
  const cd = e.target.closest("[data-chipdel]"); if (cd){ cd.parentElement.remove(); return; }
  const cb = e.target.closest("[data-chipbox]"); if (cb && !e.target.closest("button")){ cb.querySelector(".chipin").focus(); }
  if (e.target.closest("#btnSsSave")) return saveSearch();
  if (e.target.closest("#btnSsRun")) return saveSearch().then(ok => ok && runReport());
  const rm = e.target.closest("[data-rmapp]"); if (rm) return removeApp(rm.dataset.rmapp);
  const mn = e.target.closest("[data-matnav]"); if (mn) return openMaterial(mn.dataset.matnav);
  const fr = e.target.closest("[data-file]"); if (fr) return showFile(fr.dataset.file);
  const of = e.target.closest("[data-openfile]");
  if (of) return invoke && invoke("open_file", {root:folder, rel:of.dataset.openfile}).catch(err => toast(String(err)));
  const a = e.target.closest("a[data-url]");
  if (a){ e.preventDefault(); invoke && invoke("open_url", {url:a.dataset.url}).catch(err => toast(String(err))); }
};
$("scrim").onclick = closeApp;
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("drawer").hidden) closeApp(); });

// Pipeline drag & drop: drag a card to another column to change its status. The app moves the folder
// (01_Pipeline / 02_Sent as in the Vantage SOP), updates applications.json and rebuilds the tracker.
let drag = null;
const colAt = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.closest(".col[data-col]") : null; };
$("view").addEventListener("pointerdown", (e) => {
  if (!(state.view === "pipeline" || state.view === "apps") || getAppsMode() !== "board" || e.button !== 0 || !invoke) return;
  const c = e.target.closest(".card[data-id]"); if (!c || !c.dataset.id) return;
  drag = {el:c, id:c.dataset.id, x:e.clientX, y:e.clientY, ghost:null, from:c.closest(".col").dataset.col};
});
document.addEventListener("pointermove", (e) => {
  if (!drag) return;
  if (!drag.ghost){
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
    const r = drag.el.getBoundingClientRect();
    drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add("ghost"); drag.ghost.style.width = r.width + "px";
    drag.dx = drag.x - r.left; drag.dy = drag.y - r.top;
    document.body.appendChild(drag.ghost); drag.el.classList.add("dragsrc");
  }
  drag.ghost.style.left = (e.clientX - drag.dx) + "px"; drag.ghost.style.top = (e.clientY - drag.dy) + "px";
  const col = colAt(e.clientX, e.clientY);
  document.querySelectorAll(".col").forEach(c => c.classList.toggle("drop-on", c === col && c.dataset.col !== drag.from));
});
document.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const d = drag; drag = null;
  if (!d.ghost) return;
  d.ghost.remove(); d.el.classList.remove("dragsrc"); state.dragEnd = Date.now();
  document.querySelectorAll(".col").forEach(c => c.classList.remove("drop-on"));
  const col = colAt(e.clientX, e.clientY);
  if (col && col.dataset.col !== d.from) moveApp(d.id, d.from, col.dataset.col);
});
async function moveApp(id, from, to){
  const a = (state.data.apps || []).find(x => String(x.id) === String(id)); if (!a) return;
  const note = dt("note");
  let status = null;
  if (to === "Closed") status = await dialog({title:dt("closedT", a.company), text:dt("closedX") + note, select:["Rejected","Withdrawn","No Response"], ok:dt("move")});
  else if (to === "Interview") status = await dialog({title:dt("ivT", a.company), text:dt("ivX") + note, select:["Interview R1","Interview R2","Screening","Assessment"], ok:dt("move")});
  else if (await dialog({title:dt("moveT"), text:dt("moveX", a.company, from, to) + note + (to === "Sent" ? dt("sentNote") : ""), ok:dt("move")})) status = COLS.find(c => c.k === to).to;
  if (!status) return;
  try {
    const r = await invoke("move_application", {root:folder, id:String(id), status});
    state.sig = null; await refresh(true);
    const info = r.tracker === "ok" ? " · folder and tracker updated" : ". Folder and applications.json updated, but the Excel tracker was not: " + r.tracker;
    toast(`${a.company} moved to ${to}${info}`, {label:"Undo", run: async () => {
      try { const u = await invoke("undo_move", {root:folder, id:String(id), status:r.old_status, folder:r.old_folder, statusDate:r.old_status_date, nextAction:r.old_next, nextDue:r.old_due}); state.sig = null; await refresh(true); toast(u.tracker === "ok" ? "Move undone · tracker updated" : "Move undone, but the Excel tracker was not updated: " + u.tracker); }
      catch (err){ toast(String(err)); }
    }});
  } catch (err){ toast(String(err)); }
}

// Automatic refresh, kept cheap: only while the window is visible and focused, at most every 60 s, plus on
// focus and after every change the app makes. Each tick is a quick change check; a full scan only runs when
// files actually changed.
setInterval(() => { if (document.visibilityState === "visible" && document.hasFocus()) refresh(); }, 60000);
window.addEventListener("focus", () => { pruneUsers(); refresh(); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refresh(); });
// tour.js waits for this, then loads the user's language and tutorial state.
// First launch: no folder chosen yet. An existing personal folder in the usual place opens by itself; otherwise the
// user chooses one or the app sets up a new one.
async function autoFind(){
  let f = null;
  try { f = await invoke("find_users"); } catch {}
  if (f && f.users && f.users.length){ useFolder(f.users[0]); return true; }
  render();
  return false;
}
const booted = (async () => {
  await pruneUsers();
  if (invoke && !folder){
    if (!(await autoFind())) pick();
  } else { if (folder) recent.add(folder); loadPhoto(); refresh(true); }
})();

