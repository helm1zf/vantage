// F07 Offer compare: when you hold more than one offer, a tab lays them side by side and scores them with YOUR weights
// (pay per hour, growth, flexibility, commute, visa). Offers can come from the board (status Offer) or be added by hand.
// Stored in app_prefs.json ("offers", "offerw"). The winner is a suggestion, the table shows why.
(function(){
  const css = document.createElement("style");
  css.textContent = `.of{display:flex;flex-direction:column;gap:12px}.of-w{display:flex;gap:18px;flex-wrap:wrap;padding:12px 16px}.of-w label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted);min-width:130px}
  .of-w input[type=range]{accent-color:var(--accent)}.of table{width:100%;border-collapse:collapse;font-size:13px}.of th,.of td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
  .of th{font:10px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:400}
  .of td input{width:84px;height:28px;border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);padding:0 8px;font:13px var(--mono)}
  .of td input.t{width:150px;font:13px var(--ui)}.of .sc{font:600 22px var(--mono)}.of tr.win td{background:color-mix(in srgb,#2E7D4F 10%,transparent)}
  .of .why{font-size:11px;color:var(--muted);display:block;font-family:var(--ui)}.of .badge2{font:600 10px var(--mono);color:#fff;background:#2E7D4F;border-radius:9px;padding:1px 8px;margin-left:6px}`;
  document.head.appendChild(css);
  ICONS.scale = '<path d="M8 2.5v11M3 5.5h10M3 5.5 1.5 9.5a2 2 0 0 0 3 0zM13 5.5l-1.5 4a2 2 0 0 0 3 0z"/>';
  const W = [["pay", ["Pay per hour", "Lohn pro Stunde", "Gaji per jam"]], ["growth", ["Growth", "Entwicklung", "Perkembangan"]], ["flex", ["Flexibility", "Flexibilität", "Fleksibilitas"]], ["commute", ["Short commute", "Kurzer Arbeitsweg", "Perjalanan dekat"]], ["visa", ["Visa support", "Visa-Hilfe", "Bantuan visa"]]];
  const getW = () => Object.assign({pay:5, growth:4, flex:3, commute:2, visa:4}, prefs.offerw || {});
  const getO = () => prefs.offers || {};
  const rows = () => {
    const d = state.data || {}, o = getO(), out = [];
    (d.apps || []).filter(a => a.status === "Offer").forEach(a => out.push(Object.assign({key:"app" + a.id, name:a.company, role:a.role}, o["app" + a.id] || {})));
    Object.keys(o).filter(k => k.startsWith("man")).forEach(k => out.push(Object.assign({key:k}, o[k])));
    return out;
  };
  function calc(list){
    const w = getW(), perH = list.map(r => (+r.gross || 0) / Math.max(1, (+r.hours || 40) * 4.33)), max = Math.max(...perH, 1);
    const tot = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    const sc = list.map((r, i) => {
      const parts = {pay:perH[i] / max, growth:(+r.growth || 0) / 5, flex:Math.min(5, +r.remote || 0) / 5, commute:1 - Math.min(90, +r.commute || 0) / 90, visa:r.visa ? 1 : 0};
      const s = Math.round(100 * W.reduce((a, [k]) => a + parts[k] * w[k], 0) / tot);
      const best = ft(...W.map(([k, l]) => [l, parts[k] * w[k]]).sort((a, b) => b[1] - a[1])[0][0]);
      return {s, perH:perH[i], best, has:(+r.gross || 0) > 0};
    });
    // A winner is only named when at least two offers have a salary (nothing to compare otherwise) and exactly one has the top score.
    const real = sc.filter(x => x.has), top = Math.max(...real.map(x => x.s), 0);
    const win = real.length >= 2 && real.filter(x => x.s === top).length === 1 ? top : -1;
    sc.forEach(x => { x.win = x.has && x.s === win; });
    return sc;
  }
  const scoreCell = (x) => `<span class="sc">${x.has ? x.s : "–"}</span>${x.win ? '<span class="badge2">' + ft("BEST FIT", "BESTE WAHL", "PALING COCOK") + '</span>' : ""}<span class="why">${x.has ? `€${x.perH.toFixed(1)}/h · ${ft("strongest", "am stärksten", "terkuat")}: ${esc(x.best)}` : esc(ft("Enter the monthly gross to score this offer.", "Trage das Bruttogehalt ein, um dieses Angebot zu bewerten.", "Isi gaji bruto bulanan untuk menilai tawaran ini."))}</span>`;
  // Typing must never rebuild the inputs (that dropped the focus on Tab): only the scores and the winner are repainted in place.
  function paint(){
    const list = rows(), sc = calc(list), w = getW();
    document.querySelectorAll(".of tr[data-ofrow]").forEach((tr, i) => { if (!sc[i]) return; tr.classList.toggle("win", sc[i].win); tr.querySelector("td.scc").innerHTML = scoreCell(sc[i]); });
    W.forEach(([k, l]) => { const el = document.querySelector(`[data-ofwl="${k}"]`); if (el) el.textContent = `${ft(...l)}: ${w[k]}/5`; });
  }
  function page(){
    const list = rows(), w = getW(), sc = calc(list);
    const add = `<div style="padding:12px 16px"><button class="btn" id="ofAdd">+ ${esc(ft("Add an offer by hand", "Angebot von Hand hinzufügen", "Tambah tawaran manual"))}</button></div>`;
    if (!list.length) return `<div class="of"><section class="panel"><div class="empty">${esc(ft("No offer yet. An application that reaches the Offer stage appears here, or add one by hand.", "Noch kein Angebot. Eine Bewerbung in der Phase Angebot erscheint hier, oder füge eines von Hand hinzu.", "Belum ada tawaran. Lamaran yang sampai tahap Offer muncul di sini, atau tambahkan manual."))}</div>${add}</section></div>`;
    return `<div class="of"><section class="panel of-w">${W.map(([k, l]) => `<label><span data-ofwl="${k}">${ft(...l)}: ${w[k]}/5</span><input type="range" min="0" max="5" value="${w[k]}" data-ofw="${k}"></label>`).join("")}</section>
    <section class="panel"><table><tr><th>Offer</th><th>Gross €/month</th><th>Hours/week</th><th>Remote days</th><th>Commute min</th><th>Growth 1-5</th><th>Visa help</th><th>Score</th></tr>
    ${list.map((r, i) => `<tr data-ofrow="${esc(r.key)}" class="${sc[i].win ? "win" : ""}"><td><input class="t" value="${esc(r.name || "")}" placeholder="Company" data-ofk="${r.key}" data-off="name">${r.role ? `<span class="why">${esc(r.role)}</span>` : ""}${r.key.startsWith("man") ? `<button class="linkbtn" data-ofdel="${esc(r.key)}">${esc(ft("Remove", "Entfernen", "Hapus"))}</button>` : ""}</td>
      ${["gross", "hours", "remote", "commute", "growth"].map(f => `<td><input type="number" min="0" value="${esc(r[f] ?? "")}" data-ofk="${r.key}" data-off="${f}"></td>`).join("")}
      <td><input type="checkbox" ${r.visa ? "checked" : ""} data-ofk="${r.key}" data-off="visa" style="width:auto"></td>
      <td class="scc">${scoreCell(sc[i])}</td></tr>`).join("")}</table>${add}</section></div>`;
  }
  function hook(view){
    const nav = $("nav"), has = (state.data && state.data.apps || []).some(a => a.status === "Offer") || Object.keys(getO()).some(k => k.startsWith("man"));
    let a = nav && nav.querySelector('[data-view="offers"]');
    if (has && !a && nav){ a = document.createElement("a"); a.href = "#"; a.dataset.view = "offers"; a.innerHTML = `<i class="ic" data-i="scale"></i>Offers`; const ap = nav.querySelector('[data-view="apps"]'); (ap || nav.lastElementChild).after(a); a.querySelectorAll(".ic").forEach(el => el.innerHTML = `<svg viewBox="0 0 16 16">${ICONS[el.dataset.i]}</svg>`); }
    if (view === "offers") $("view").innerHTML = page();
  }
  vhook(hook);
  const put = (k, f, v) => { const o = Object.assign({}, getO()); o[k] = Object.assign({}, o[k] || {}, {[f]:v}); savePref("offers", o); };
  document.addEventListener("input", (e) => {   // sliders move the scores live
    if (state.view !== "offers") return;
    const r = e.target.closest("[data-ofw]"); if (r){ prefs.offerw = Object.assign(getW(), {[r.dataset.ofw]:+r.value}); paint(); }
  });
  document.addEventListener("change", (e) => {
    if (state.view !== "offers") return;
    const r = e.target.closest("[data-ofw]"); if (r){ savePref("offerw", Object.assign(getW(), {[r.dataset.ofw]:+r.value})); paint(); return; }
    const i = e.target.closest("[data-ofk]");
    if (i){
      let v = i.type === "checkbox" ? i.checked : i.type === "number" ? (i.value === "" ? "" : Math.max(0, +i.value)) : i.value;
      put(i.dataset.ofk, i.dataset.off, v); paint();
    }
  });
  document.addEventListener("click", (e) => {
    if (state.view !== "offers") return;
    if (e.target.closest("#ofAdd")){ put("man" + Date.now().toString(36), "name", ""); $("view").innerHTML = page(); return; }
    const d = e.target.closest("[data-ofdel]");
    if (d){ const o = Object.assign({}, getO()); delete o[d.dataset.ofdel]; savePref("offers", o); $("view").innerHTML = page(); }
  });
})();
