// F04 Interview prep tracker: a real checklist per application (tick, add your own, practice log with a 1-5 score).
// Stored in app_prefs.json ("ivtrack"), so it needs no new file and works offline. Laras can read it from Interview_Prep.json later.
(function(){
  const css = document.createElement("style");
  css.textContent = `.ivt{margin-top:10px;border-top:1px dashed var(--fieldLine);padding-top:10px;font-size:13px}
  .ivt-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}.ivt-h b{font-weight:500}
  .ivt-bar{flex:1;height:6px;border-radius:3px;background:var(--housing);overflow:hidden}.ivt-bar i{display:block;height:100%;background:var(--accent)}
  .ivt label{display:flex;align-items:center;gap:8px;padding:3px 0;cursor:pointer}.ivt label.done span{color:var(--muted);text-decoration:line-through}
  .ivt input[type=checkbox]{accent-color:var(--accent);width:15px;height:15px}
  .ivt-add{display:flex;gap:6px;margin:6px 0}.ivt-add input{flex:1;height:28px;border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);padding:0 8px;font:13px var(--ui)}
  .ivt-log{margin-top:8px;color:var(--muted);font-size:12px}.ivt-log div{display:flex;gap:8px;padding:2px 0}.ivt-log b{color:var(--ink);font:500 12px var(--mono)}
  .ivt-sc{display:flex;gap:4px;align-items:center}.ivt-sc button{width:24px;height:24px;border:1px solid var(--fieldLine);border-radius:6px;background:transparent;color:var(--ink);cursor:pointer;font:12px var(--mono)}
  .ivt-sc button.on{background:var(--ink);color:#fff}`;
  document.head.appendChild(css);
  const BASE = ["Pitch in 60 seconds", "A story for each project in my CV", "Answers to the questions about the role", "Questions I ask them", "Gaps in my CV and how I answer them", "Logistics: link, time, documents", "One full practice run"];
  const get = (k) => Object.assign({done:[], extra:[], log:[]}, ((prefs.ivtrack || {})[k]) || {});
  const put = (k, v) => { const all = Object.assign({}, prefs.ivtrack || {}); all[k] = v; savePref("ivtrack", all); };
  function html(k, st){
    const items = BASE.map((t, i) => ({id:"b" + i, t})).concat(st.extra.map((t, i) => ({id:"x" + i, t})));
    const n = items.filter(it => st.done.includes(it.id)).length, pct = Math.round(100 * n / items.length);
    const last = st.log.slice(-3).reverse();
    return `<div class="ivt-h"><b>Prep tracker</b><span class="ivt-bar"><i style="width:${pct}%"></i></span><span class="muted">${n}/${items.length}</span></div>` +
      items.map(it => `<label class="${st.done.includes(it.id) ? "done" : ""}"><input type="checkbox" data-ivk="${esc(k)}" data-ivid="${it.id}"${st.done.includes(it.id) ? " checked" : ""}><span>${esc(it.t)}</span></label>`).join("") +
      `<div class="ivt-add"><input placeholder="Add your own item…" data-ivadd="${esc(k)}"><button class="btn sm" data-ivaddb="${esc(k)}">Add</button></div>` +
      `<div class="ivt-h" style="margin-top:8px"><b>Practice log</b><span class="ivt-sc" data-ivsc="${esc(k)}">${[1, 2, 3, 4, 5].map(s => `<button data-ivscore="${s}">${s}</button>`).join("")}</span></div>` +
      `<div class="ivt-log">${last.length ? last.map(l => `<div><b>${esc(l.d)} · ${l.s}/5</b><span>${esc(l.n || "")}</span></div>`).join("") : "Rate a practice run 1 to 5 to start your track record."}</div>`;
  }
  function hook(view){
    if (view !== "interview") return;
    document.querySelectorAll("#view .card").forEach(card => {
      if (card.querySelector(".ivt")) return;
      const k = card.dataset.folder || (card.querySelector("b") || {}).textContent || "x";
      const box = document.createElement("div"); box.className = "ivt"; box.dataset.k = k; box.innerHTML = html(k, get(k)); card.appendChild(box);
    });
  }
  document.addEventListener("click", (e) => {
    const box = e.target.closest(".ivt"); if (!box) return; const k = box.dataset.k;
    const redraw = () => { box.innerHTML = html(k, get(k)); };
    const sc = e.target.closest("[data-ivscore]");
    if (sc){ e.stopPropagation(); const st = get(k); const note = ""; st.log.push({d:new Date().toLocaleDateString(LOC(), {day:"numeric", month:"short"}), s:+sc.dataset.ivscore, n:note}); put(k, st); redraw(); return; }
    if (e.target.closest("[data-ivaddb]")){ e.stopPropagation(); const i = box.querySelector("[data-ivadd]"); if (i.value.trim()){ const st = get(k); st.extra.push(i.value.trim().slice(0, 80)); put(k, st); redraw(); } }
  }, true);
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-ivid]"); if (!c) return; const k = c.dataset.ivk, st = get(k), id = c.dataset.ivid;
    st.done = c.checked ? [...new Set([...st.done, id])] : st.done.filter(x => x !== id); put(k, st);
    const box = c.closest(".ivt"); box.innerHTML = html(k, st);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches && e.target.matches("[data-ivadd]")){ e.preventDefault(); e.target.closest(".ivt").querySelector("[data-ivaddb]").click(); } });
  vhook(hook);
})();
