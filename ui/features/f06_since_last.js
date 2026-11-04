// F06 "Since you were last here": a banner on the Dashboard listing what changed while Vantage was closed
// (new report, status moves, new Inbox files, deadlines that passed). It compares with a small snapshot in app_prefs.json ("seen").
(function(){
  const css = document.createElement("style");
  css.textContent = `.sl{margin-bottom:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:12px 16px}
  .sl-h{display:flex;align-items:center;gap:10px;margin-bottom:6px}.sl-h b{font-weight:500}.sl-h .sp{flex:1}
  .sl ul{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:4px 18px}
  .sl li{display:flex;gap:8px;align-items:baseline;font-size:13px;padding:2px 0}.sl li i{width:8px;height:8px;border-radius:50%;background:var(--accent);flex:none;margin-top:5px}
  .sl li.g i{background:#2E7D4F}.sl li.w i{background:#B3261E}.sl li span{color:var(--muted)}`;
  document.head.appendChild(css);
  const today = () => new Date().toISOString().slice(0, 10);
  function snapshot(d){
    return {at:Date.now(), day:today(), apps:Object.fromEntries((d.apps || []).map(a => [a.id, a.status])), reps:(d.reports || []).map(r => r.date).slice(0, 5), inbox:(d.inbox || []).length};
  }
  function diff(prev, d){
    const out = [];
    (d.apps || []).forEach(a => { const was = prev.apps[a.id]; if (was === undefined) out.push({c:"g", t:ft(`New application: ${a.company}`, `Neue Bewerbung: ${a.company}`, `Lamaran baru: ${a.company}`), s:a.role}); else if (was !== a.status) out.push({c:a.status === "Offer" ? "g" : "", t:`${a.company}: ${was} → ${a.status}`, s:a.role}); });
    const newRep = (d.reports || []).filter(r => !prev.reps.includes(r.date));
    if (newRep.length) out.push({c:"g", t:ft(`${newRep.length} new Morning ${newRep.length === 1 ? "Report" : "Reports"}`, `${newRep.length} neue(r) Morning Report`, `${newRep.length} Morning Report baru`), s:newRep[0].date});
    const ib = (d.inbox || []).length; if (ib > prev.inbox) out.push({c:"", t:ft(`${ib - prev.inbox} new ${ib - prev.inbox === 1 ? "file" : "files"} in your Inbox`, `${ib - prev.inbox} neue Datei(en) in deiner Inbox`, `${ib - prev.inbox} file baru di Inbox kamu`), s:ft("waiting to be sorted", "wartet aufs Sortieren", "menunggu dirapikan")});
    (d.apps || []).forEach(a => { const t = a.due && parseDate(a.due); if (t && !["Offer", "Closed", "Rejected"].includes(a.status)){ const n = daysFrom(t); if (n < 0 && n >= -2 && Date.parse(a.due) > prev.at - 864e5) out.push({c:"w", t:ft(`${a.company}: deadline passed`, `${a.company}: Frist verstrichen`, `${a.company}: deadline lewat`), s:a.next || ""}); } });
    return out;
  }
  function hook(view, d){
    if (view !== "dash" || !d || !d.ok || $("slBox") || !Object.keys(prefs).length) return;   // prefs not loaded yet: do nothing (never overwrite the snapshot)
    const key = "seen", prev = prefs[key];
    if (!prev){ savePref(key, snapshot(d)); return; }
    if (Date.now() - prev.at < 20 * 60e3) return;                 // same sitting: nothing to report
    const ch = diff(prev, d);
    if (!ch.length){ savePref(key, snapshot(d)); return; }
    const box = document.createElement("div"); box.className = "sl"; box.id = "slBox";
    const ago = Math.round((Date.now() - prev.at) / 3600e3);
    box.innerHTML = `<div class="sl-h"><b>Since you were last here</b><span class="muted">${ago < 1 ? ft("less than an hour ago", "vor weniger als einer Stunde", "kurang dari satu jam lalu") : ago < 24 ? ft(ago + " hours ago", "vor " + ago + " Stunden", ago + " jam lalu") : ft(Math.round(ago / 24) + " days ago", "vor " + Math.round(ago / 24) + " Tagen", Math.round(ago / 24) + " hari lalu")}</span><span class="sp"></span><button class="btn sm" id="slOk">Got it</button></div>
      <ul>${ch.slice(0, 8).map(c => `<li class="${c.c}"><i></i><div>${esc(c.t)} <span>${esc(c.s)}</span></div></li>`).join("")}</ul>`;
    const v = $("view"); v.insertBefore(box, v.firstChild);
    $("slOk").onclick = () => { savePref(key, snapshot(state.data)); box.remove(); };
  }
  vhook(hook);
})();
