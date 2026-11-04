// F02 Daily Morning Report: runs "Find jobs now" by itself once a day at the chosen time while Vantage is open.
// Missed it (app was closed)? It runs once when Vantage next opens after that time. Settings live in app_prefs.json ("sched").
(function(){
  const css = document.createElement("style");
  css.textContent = `.sch{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);font-size:13px}
  .sch b{font-weight:500}.sch .sw{position:relative;width:34px;height:20px;border-radius:10px;background:var(--fieldLine);cursor:pointer;border:0;padding:0;flex:none}
  .sch .sw:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
  .sch .sw.on{background:var(--accent)}.sch .sw.on:after{left:16px}
  .sch input[type=time]{height:28px;border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);font:13px var(--mono);padding:0 8px}
  .sch .muted{font-size:12px}`;
  document.head.appendChild(css);
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const cfg = () => Object.assign({on:false, time:"07:00", last:""}, (typeof prefs === "object" && prefs.sched) || {});
  const save = (c) => savePref("sched", c);
  const due = (c) => { const n = new Date(); const [h, m] = c.time.split(":").map(Number); return n.getHours() * 60 + n.getMinutes() >= h * 60 + m; };
  function nextRun(c){
    const n = new Date(), [h, m] = c.time.split(":").map(Number), t = new Date(); t.setHours(h, m, 0, 0);
    const done = c.last === today(); if (done || t <= n) t.setDate(t.getDate() + (done || t <= n ? 1 : 0));
    return (t.toDateString() === n.toDateString() ? ft("today", "heute", "hari ini") : ft("tomorrow", "morgen", "besok")) + " " + c.time;
  }
  function draw(view){
    if (view !== "laporan" || $("schBar")) return;
    const c = cfg(), bar = document.createElement("div"); bar.className = "sch"; bar.id = "schBar";
    bar.innerHTML = `<button class="sw${c.on ? " on" : ""}" id="schSw" aria-label="Daily search"></button><b>Search for jobs every day at</b><input type="time" id="schT" value="${esc(c.time)}">
      <span class="muted">${c.on ? ft("Next run: ", "Nächster Lauf: ", "Jalan berikutnya: ") + esc(nextRun(c)) + ft(". Runs while Vantage is open; if it was closed, once when you open it.", ". Läuft, solange Vantage offen ist; war es geschlossen, einmal beim Öffnen.", ". Jalan selama Vantage terbuka; kalau tadinya tertutup, sekali saat dibuka.") : ft("Off. Turn on and Vantage searches by itself, no need to press Find jobs now.", "Aus. Schalte ein, und Vantage sucht von selbst, ohne dass du Find jobs now drücken musst.", "Mati. Nyalakan dan Vantage mencari sendiri, tanpa perlu menekan Find jobs now.")}</span>`;
    const v = $("view"); v.insertBefore(bar, v.firstChild);
    $("schSw").onclick = () => { const x = cfg(); x.on = !x.on; save(x); $("schBar").remove(); draw("laporan"); tick(true); };
    $("schT").onchange = (e) => { const x = cfg(); x.time = e.target.value || "07:00"; save(x); $("schBar").remove(); draw("laporan"); };
  }
  let busy = false;
  async function tick(){
    const c = cfg();
    if (!c.on || busy || c.last === today() || !due(c)) return;
    if (!folder || !state.data || !state.data.ok || !nova.cli || !nova.cli.logged_in) return;
    if (repsOf(state.data).some(r => String(r.date).startsWith(today()))){ c.last = today(); save(c); return; }   // today's report already exists
    if (novaSt("lamaran").run) return;
    busy = true;
    try {
      const x = await getSearch();
      if (!arr(x.kata_kunci).length) return;           // nothing to search for yet
      c.last = today(); save(c);
      toast("Daily search started");
      novaSend(say("runreport"), {chat:"lamaran"});
    } finally { busy = false; }
  }
  vhook(draw);
  setInterval(tick, 30000); setTimeout(tick, 4000);
  window.__schedTick = tick;
})();
