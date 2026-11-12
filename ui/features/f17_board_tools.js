// F17 Board tools: search, minimum match, sort and "hide closed" above the Applications board, plus Select to give several cards the same new status.
// Filters only hide or reorder what is on screen; files change only when you press Move.
(function(){
  VK.css("bt", `.bt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 16px;border-bottom:1px solid var(--line)}.bt input[type=search]{height:28px;border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);padding:0 10px;font:13px var(--ui);width:200px}
  .bt label{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}.bt input[type=range]{width:110px;accent-color:var(--accent)}.bt .mono{min-width:34px;color:var(--ink)}
  .bt select{height:28px;border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);font:13px var(--ui)}.bt .sp2{flex:1}.bt .cnt{font:11px var(--mono);color:var(--muted)}
  .card.bsel{outline:2px solid var(--accent);outline-offset:-2px}.card .bchk{display:none;position:absolute;top:8px;right:8px;accent-color:var(--accent)}.selmode .card{position:relative;cursor:pointer}.selmode .card .bchk{display:block}
  .bbar{position:sticky;bottom:0;display:flex;gap:10px;align-items:center;padding:10px 16px;background:var(--ink);color:var(--housing);border-radius:0 0 10px 10px}.bbar[hidden]{display:none}
  .bbar .btn{border-color:var(--housing);color:var(--housing)}.bbar .btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}`);
  const F = {q:"", min:0, sort:"", hideClosed:false, sel:false, picked:new Set()}, CLOSED = ["Accepted", "Rejected", "Withdrawn", "No Response"];
  const SORT = {score:(x, y) => (y.fit || 0) - (x.fit || 0), new:(x, y) => (Date.parse(y.date) || 0) - (Date.parse(x.date) || 0), az:(x, y) => x.company.localeCompare(y.company)};
  function apply(){
    const apps = VK.apps(), by = new Map(apps.map(a => [String(a.id), a])), cards = [...document.querySelectorAll(".board .card[data-id]")];
    const rank = new Map(SORT[F.sort] ? [...apps].sort(SORT[F.sort]).map((a, i) => [String(a.id), i + 1]) : []);   // positive, so the column header (order 0) stays on top
    let shown = 0;
    cards.forEach(c => {
      const a = by.get(c.dataset.id); if (!a) return;
      const ok = (!F.q || `${a.company} ${a.role} ${a.type || ""} ${a.status || ""}`.toLowerCase().includes(F.q)) && Math.round((a.fit || 0) * 100) >= F.min && !(F.hideClosed && CLOSED.includes(a.status));
      c.style.display = ok ? "" : "none"; shown += ok;
      c.style.order = String(rank.get(c.dataset.id) || 0);
      c.classList.toggle("bsel", F.picked.has(c.dataset.id));
      let k = c.querySelector(".bchk"); if (!k){ k = document.createElement("input"); k.type = "checkbox"; k.className = "bchk"; k.tabIndex = -1; c.appendChild(k); }
      k.checked = F.picked.has(c.dataset.id);
    });
    $("btCount").textContent = `${shown}/${cards.length}`;
    $("btBar").hidden = !F.sel; $("btPicked").textContent = `${F.picked.size} ${ft("selected", "ausgewählt", "dipilih")}`; $("btMove").disabled = !F.picked.size;
    document.querySelector(".board").classList.toggle("selmode", F.sel);
  }
  async function moveAll(){
    const ids = [...F.picked];
    const to = await dialog({title:ft("Move selected", "Auswahl verschieben", "Pindahkan yang dipilih"), text:ft(`${ids.length} applications get the same new status.`, `${ids.length} Bewerbungen bekommen denselben neuen Status.`, `${ids.length} lamaran mendapat status baru yang sama.`), select:["Accepted", "Rejected", "Withdrawn", "No Response", "Applied", "Interview R1", "Offer"], ok:ft("Move", "Verschieben", "Pindahkan")});
    if (!to) return;
    const done = [];   // what each move reported, so one Undo can put everything back
    let failed = 0, problem = "";
    for (const id of ids){ try { done.push({id, r: await invoke("move_application", {root:folder, id:String(id), status:to})}); } catch (e){ failed++; problem = String(e); } }
    F.picked.clear(); F.sel = false; state.sig = null; await refresh(true);
    const msg = `${done.length} ${ft("moved", "verschoben", "dipindahkan")}${failed ? ` · ${failed} ${ft("failed", "fehlgeschlagen", "gagal")} (${problem})` : ""}`;
    if (!done.length) return toast(msg);
    toast(msg, {label:ft("Undo", "Rückgängig", "Urungkan"), run: async () => {
      let back = 0, bad = "";
      for (const m of done.slice().reverse()){
        try { await invoke("undo_move", {root:folder, id:String(m.id), status:m.r.old_status, folder:m.r.old_folder, statusDate:m.r.old_status_date, nextAction:m.r.old_next, nextDue:m.r.old_due}); back++; } catch (e){ bad = String(e); }
      }
      state.sig = null; await refresh(true);
      toast(`${back} ${ft("put back", "zurückgesetzt", "dikembalikan")}${bad ? " · " + bad : ""}`);
    }});
  }
  vhook((view) => {
    if (view !== "apps" && view !== "pipeline") return;
    const board = document.querySelector(".board"); if (!board || $("btBox")) return;
    const bar = document.createElement("div"); bar.id = "btBox"; bar.className = "bt";
    const selLabel = () => F.sel ? ft("Done selecting", "Fertig", "Selesai memilih") : ft("Select", "Auswählen", "Pilih");
    bar.innerHTML = `<input type="search" id="btQ" placeholder="${esc(ft("Search company or role", "Firma oder Stelle suchen", "Cari perusahaan atau posisi"))}" value="${esc(F.q)}">
      <label>${esc(ft("Match", "Match", "Cocok"))} ≥ <input type="range" id="btMin" min="0" max="95" step="5" value="${F.min}"><span class="mono" id="btMinV">${F.min}%</span></label>
      <select id="btSort"><option value="">${esc(ft("Sort: board order", "Sortierung: Board", "Urutan: papan"))}</option><option value="score">${esc(ft("Highest match first", "Höchster Match zuerst", "Kecocokan tertinggi"))}</option><option value="new">${esc(ft("Newest first", "Neueste zuerst", "Terbaru"))}</option><option value="az">A–Z</option></select>
      <label><input type="checkbox" id="btClosed" ${F.hideClosed ? "checked" : ""}> ${esc(ft("Hide closed", "Abgeschlossene ausblenden", "Sembunyikan yang ditutup"))}</label>
      <span class="sp2"></span><span class="cnt" id="btCount"></span><button class="btn sm" id="btSel">${esc(selLabel())}</button>`;
    board.before(bar); $("btSort").value = F.sort;
    const foot = document.createElement("div"); foot.id = "btBar"; foot.className = "bbar"; foot.hidden = true;
    foot.innerHTML = `<span id="btPicked"></span><span style="flex:1"></span><button class="btn" id="btClear">${esc(ft("Clear", "Leeren", "Kosongkan"))}</button><button class="btn primary" id="btMove">${esc(ft("Move…", "Verschieben…", "Pindahkan…"))}</button>`;
    board.after(foot);
    $("btQ").oninput = (e) => { F.q = e.target.value.trim().toLowerCase(); apply(); };
    $("btMin").oninput = (e) => { F.min = +e.target.value; $("btMinV").textContent = F.min + "%"; apply(); };
    $("btSort").onchange = (e) => { F.sort = e.target.value; apply(); };
    $("btClosed").onchange = (e) => { F.hideClosed = e.target.checked; apply(); };
    $("btSel").onclick = () => { F.sel = !F.sel; if (!F.sel) F.picked.clear(); $("btSel").textContent = selLabel(); apply(); };
    $("btClear").onclick = () => { F.picked.clear(); apply(); };
    $("btMove").onclick = moveAll;
    // in Select mode a click on a card ticks it instead of opening it
    board.addEventListener("click", (e) => {
      const c = F.sel && e.target.closest(".card[data-id]"); if (!c) return;
      e.stopPropagation(); e.preventDefault(); F.picked.has(c.dataset.id) ? F.picked.delete(c.dataset.id) : F.picked.add(c.dataset.id); apply();
    }, true);
    apply();
  });
})();
