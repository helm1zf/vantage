// F22 To-do and calendar: your own to-do list, one per day, on the Dashboard. Today starts empty; earlier days stay readable in the month
// calendar next to it (you can still tick them, and move what is unfinished to today). The calendar also marks the days on which an
// application has a deadline, an interview, a follow-up or a start date. Opening an earlier day shows that day's numbers as well: the
// Dashboard saves one small snapshot per day. Everything is kept in app_prefs.json under "todo", the newest 120 days only.
(function(){
  const KEEP = 120, MAX_ITEMS = 40, MAX_LEN = 200;
  const day0 = () => VK.day();
  const store = () => (prefs && prefs.todo) || {};
  const lists = () => store().d || {};
  const snaps = () => store().s || {};
  // The newest KEEP days, and no empty lists: the file cannot grow without limit.
  const trim = (o) => Object.fromEntries(Object.keys(o).filter(k => !Array.isArray(o[k]) || o[k].length).sort().reverse().slice(0, KEEP).map(k => [k, o[k]]));
  const save = (d, s) => savePref("todo", {d: trim(d), s: trim(s)});
  const setList = (iso, items) => save(Object.assign({}, lists(), {[iso]: items.slice(0, MAX_ITEMS)}), snaps());
  const shift = (isoDay, n) => { const [y, m, d] = isoDay.split("-").map(Number); return iso(new Date(y, m - 1, d + n)); };
  const sel = () => (/^\d{4}-\d{2}-\d{2}$/.test(state.todoDay || "") ? state.todoDay : day0());
  const month = () => (/^\d{4}-\d{2}$/.test(state.todoMonth || "") ? state.todoMonth : sel().slice(0, 7));
  const nice = (isoDay, opt) => { const [y, m, d] = isoDay.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(LOC(), opt); };

  // What the applications have on each day.
  function events(apps){
    const map = {}, add = (t, e) => { const k = iso(t); (map[k] = map[k] || []).push(e); };
    apps.forEach(a => {
      if (colOf(a.status) === "Closed") return;
      const due = parseDate(a.due), start = a.status === "Offer" ? parseDate(a.start) : null, dl = parseDate(a.deadline);
      if (start) add(start, {what: ft(`Start at ${a.company}`, `Start bei ${a.company}`, `Mulai di ${a.company}`), who: a.role || "", id: a.id});
      if (due && !(start && +due === +start)) add(due, {what: en(a.next) || ft("Next step", "Nächster Schritt", "Langkah berikutnya"), who: a.company, id: a.id});
      if (dl && colOf(a.status) === "Preparing") add(dl, {what: ft("Application deadline", "Bewerbungsfrist", "Batas lamaran"), who: a.company, id: a.id});
    });
    return map;
  }
  // The four numbers of the yellow block, for the snapshot of a day.
  function numbers(apps){
    const active = apps.filter(a => ["Sent", "Interview"].includes(colOf(a.status)));
    const inInt = active.filter(a => colOf(a.status) !== "Sent").length, f = funnelNums(apps);
    return [active.length, inInt, f.sent ? Math.round(f.reply / f.sent * 100) : 0, f.offer];
  }

  function calendar(apps, cur, mon){
    const [y, m] = mon.split("-").map(Number), first = new Date(y, m - 1, 1), lead = (first.getDay() + 6) % 7, n = new Date(y, m, 0).getDate();
    const ev = events(apps), td = lists(), today = day0();
    const wd = Array.from({length: 7}, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(LOC(), {weekday: "short"}).slice(0, 2));
    let cells = "";
    for (let i = 0; i < lead; i++) cells += `<span class="td-c off"></span>`;
    for (let d = 1; d <= n; d++){
      const k = iso(new Date(y, m - 1, d)), hasT = (td[k] || []).length, hasE = (ev[k] || []).length;
      const label = nice(k, {day: "numeric", month: "long"}) + (hasT ? ", " + ft(`${hasT} to-dos`, `${hasT} To-dos`, `${hasT} to-do`) : "") + (hasE ? ", " + ft(`${hasE} from your applications`, `${hasE} aus deinen Bewerbungen`, `${hasE} dari lamaranmu`) : "");
      cells += `<button type="button" class="td-c${k === today ? " now" : ""}${k === cur ? " on" : ""}" data-tdday="${k}"${k === cur ? " disabled" : ""} aria-label="${esc(label)}" title="${esc(label)}">${d}<i>${hasT ? "<u></u>" : ""}${hasE ? '<u class="e"></u>' : ""}</i></button>`;
    }
    return `<div class="td-cal"><div class="td-mh"><button type="button" class="td-nav" id="tdMPrev" aria-label="${esc(ft("Previous month", "Voriger Monat", "Bulan sebelumnya"))}">‹</button><b>${esc(first.toLocaleDateString(LOC(), {month: "long", year: "numeric"}))}</b><button type="button" class="td-nav" id="tdMNext" aria-label="${esc(ft("Next month", "Nächster Monat", "Bulan berikutnya"))}">›</button></div>
      <div class="td-grid">${wd.map(w => `<span class="td-wd">${esc(w)}</span>`).join("")}${cells}</div>
      <div class="td-key"><span><u></u>${esc(ft("your to-dos", "deine To-dos", "to-do kamu"))}</span><span><u class="e"></u>${esc(ft("from your applications", "aus deinen Bewerbungen", "dari lamaranmu"))}</span></div></div>`;
  }

  function block(apps){
    const cur = sel(), today = day0(), past = cur < today, items = lists()[cur] || [], evs = events(apps)[cur] || [], done = items.filter(x => x.x).length, open = items.length - done;
    const title = cur === today ? ft("Today", "Heute", "Hari ini") : cur === shift(today, -1) ? ft("Yesterday", "Gestern", "Kemarin") : cur === shift(today, 1) ? ft("Tomorrow", "Morgen", "Besok") : nice(cur, {weekday: "long"});
    const rows = items.map((x, i) => `<div class="td-i${x.x ? " done" : ""}"><label><input type="checkbox" data-tdtick="${i}"${x.x ? " checked" : ""}><span>${esc(x.t)}</span></label>${past ? "" : `<button type="button" class="td-x" data-tddel="${i}" aria-label="${esc(ft("Delete", "Löschen", "Hapus"))}" title="${esc(ft("Delete", "Löschen", "Hapus"))}">×</button>`}</div>`).join("");
    const empty = past ? ft("No to-dos were written down for this day.", "Für diesen Tag wurden keine To-dos notiert.", "Tidak ada to-do yang dicatat untuk hari ini.")
      : cur === today ? ft("Nothing on your list yet. What do you want to get done today?", "Noch nichts auf deiner Liste. Was willst du heute schaffen?", "Daftarmu masih kosong. Apa yang mau kamu selesaikan hari ini?")
      : ft("Nothing planned for this day yet.", "Für diesen Tag ist noch nichts geplant.", "Belum ada rencana untuk hari ini.");
    const evRows = evs.map(e => `<button type="button" class="td-e" data-open="${esc(e.id)}"><i></i><span><b>${esc(e.what)}</b>${e.who ? `<small>${esc(e.who)}</small>` : ""}</span></button>`).join("");
    const sn = snaps()[cur], names = [ft("Active", "Aktiv", "Aktif"), ft("In interview", "Im Interview", "Interview"), ft("Reply rate", "Antwortquote", "Tingkat balasan"), ft("Offers", "Angebote", "Offer")];
    const snap = !past ? "" : `<div class="td-snap"><span class="cap">${esc(ft("Your Dashboard that day", "Dein Dashboard an diesem Tag", "Dashboard kamu hari itu"))}</span>` +
      (Array.isArray(sn) ? `<div class="td-nums">${names.map((nm, i) => `<div><b>${esc(sn[i] ?? "–")}${i === 2 ? "%" : ""}</b><span>${esc(nm)}</span></div>`).join("")}</div>`
        : `<p class="muted">${esc(ft("No numbers were saved for this day. Vantage saves them on each day you open the Dashboard.", "Für diesen Tag wurden keine Zahlen gespeichert. Vantage speichert sie an jedem Tag, an dem du das Dashboard öffnest.", "Tidak ada angka yang tersimpan untuk hari ini. Vantage menyimpannya setiap hari kamu membuka Dashboard."))}</p>`) + `</div>`;
    const foot = past
      ? `<div class="td-foot"><span class="muted">${esc(ft("An earlier day: you can still tick what you finished.", "Ein früherer Tag: Erledigtes kannst du noch abhaken.", "Hari yang sudah lewat: yang selesai masih bisa dicentang."))}</span>${open ? `<button type="button" class="btn sm" id="tdMove">${esc(ft("Move unfinished to today", "Offenes auf heute verschieben", "Pindahkan yang belum selesai ke hari ini"))}</button>` : ""}</div>`
      : `<form class="td-add" id="tdForm" autocomplete="off"><input class="field" id="tdNew" maxlength="${MAX_LEN}" placeholder="${esc(cur === today ? ft("Add a to-do for today", "To-do für heute hinzufügen", "Tambah to-do untuk hari ini") : ft("Add a to-do for this day", "To-do für diesen Tag hinzufügen", "Tambah to-do untuk hari ini"))}" aria-label="${esc(ft("New to-do", "Neues To-do", "To-do baru"))}"${items.length >= MAX_ITEMS ? " disabled" : ""}><button class="btn primary" id="tdAdd" disabled>${esc(ft("Add", "Hinzufügen", "Tambah"))}</button></form>`;
    return `<section class="panel bt-todo" id="tdBlock"><div class="head"><h2>To-do</h2><span class="cap">${items.length ? `${done}/${items.length} ${esc(ft("done", "erledigt", "selesai"))}` : ""}</span></div>
      <div class="td-body"><div class="td-main">
        <div class="td-day"><button type="button" class="td-nav" id="tdPrev" aria-label="${esc(ft("Previous day", "Voriger Tag", "Hari sebelumnya"))}">‹</button><div><b>${esc(title)}</b><span>${esc(nice(cur, {day: "numeric", month: "long", year: "numeric"}))}</span></div><button type="button" class="td-nav" id="tdNext" aria-label="${esc(ft("Next day", "Nächster Tag", "Hari berikutnya"))}">›</button>${cur === today ? "" : `<button type="button" class="btn sm" id="tdToday">${esc(ft("Back to today", "Zurück zu heute", "Kembali ke hari ini"))}</button>`}</div>
        <div class="td-items">${rows || `<p class="td-none">${esc(empty)}</p>`}</div>
        ${evRows ? `<div class="td-evs"><span class="cap">${esc(ft("From your applications", "Aus deinen Bewerbungen", "Dari lamaranmu"))}</span>${evRows}</div>` : ""}
        ${snap}${foot}</div>
      ${calendar(apps, cur, month())}</div></section>`;
  }
  // Used by the Dashboard (beton.js). Before the saved settings are loaded there is nothing to show (and nothing may be saved over them).
  window.todoBlock = (apps) => (VK.ready() ? block(apps || []) : "");
  const redraw = (focus) => { const el = $("tdBlock"); if (!el) return; el.outerHTML = block(VK.apps()); if (focus && $("tdNew")) $("tdNew").focus(); };
  const go = (isoDay) => { state.todoDay = isoDay; state.todoMonth = isoDay.slice(0, 7); redraw(); };

  $("view").addEventListener("click", (e) => {
    if (!e.target.closest("#tdBlock")) return;
    const cur = sel(), items = (lists()[cur] || []).slice(), q = (s) => e.target.closest(s);
    let b;
    if ((b = q("[data-tdtick]"))){ const i = +b.dataset.tdtick; if (items[i]){ items[i] = {t: items[i].t, x: b.checked ? 1 : 0}; setList(cur, items); redraw(); } }
    else if ((b = q("[data-tddel]"))){ items.splice(+b.dataset.tddel, 1); setList(cur, items); redraw(); }
    else if ((b = q("[data-tdday]"))) go(b.dataset.tdday);
    else if (q("#tdPrev")) go(shift(cur, -1));
    else if (q("#tdNext")) go(shift(cur, 1));
    else if (q("#tdToday")) go(day0());
    else if (q("#tdMPrev") || q("#tdMNext")){ const [y, m] = month().split("-").map(Number); state.todoMonth = iso(new Date(y, m - 1 + (q("#tdMNext") ? 1 : -1), 1)).slice(0, 7); redraw(); }
    else if (q("#tdMove")){
      const today = day0(), mine = lists()[today] || [], open = items.filter(x => !x.x), room = MAX_ITEMS - mine.length, moved = open.slice(0, Math.max(0, room));
      if (!moved.length) return toast(ft("Today's list is full.", "Die Liste für heute ist voll.", "Daftar hari ini sudah penuh."));
      const left = items.filter(x => !moved.includes(x));
      save(Object.assign({}, lists(), {[cur]: left, [today]: mine.concat(moved.map(x => ({t: x.t, x: 0})))}), snaps());
      toast(moved.length === 1 ? ft("1 to-do moved to today", "1 To-do auf heute verschoben", "1 to-do dipindah ke hari ini") : ft(`${moved.length} to-dos moved to today`, `${moved.length} To-dos auf heute verschoben`, `${moved.length} to-do dipindah ke hari ini`));
      go(today);
    }
  });
  $("view").addEventListener("input", (e) => { if (e.target.id === "tdNew" && $("tdAdd")) $("tdAdd").disabled = !e.target.value.trim(); });
  $("view").addEventListener("submit", (e) => {
    if (e.target.id !== "tdForm") return;
    e.preventDefault();
    const cur = sel(), text = ($("tdNew").value || "").trim().slice(0, MAX_LEN), items = (lists()[cur] || []).slice();
    if (!text || cur < day0() || items.length >= MAX_ITEMS) return;
    items.push({t: text, x: 0}); setList(cur, items); redraw(true);
  });

  // One snapshot of the numbers per day, taken whenever the Dashboard is drawn; saved only when it changed.
  vhook((view) => {
    if (view !== "dash" || !VK.ready() || !state.data || !state.data.ok) return;
    const now = numbers(VK.apps()), was = snaps()[day0()];
    if (JSON.stringify(now) !== JSON.stringify(was)) save(lists(), Object.assign({}, snaps(), {[day0()]: now}));
  });
})();
