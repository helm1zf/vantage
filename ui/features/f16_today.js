// F16 Today: next steps that are due or overdue, to tick off or snooze, and a weekly goal for applications sent. Ticks and snoozes are remembered
// in app_prefs.json; nothing is written to the tracker.
(function(){
  VK.css("td", `.td{display:block}.td-l{padding:14px 18px 6px}.td-r{padding:9px 18px;display:flex;align-items:center;gap:14px;border-top:1px solid var(--line);color:var(--muted)}
  .td h3{font-size:16px}.td h3 small{font-size:12px}
  .td-t{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line);font-size:13px;cursor:pointer}.td-t:first-of-type{border-top:0}
  .td-t input{accent-color:var(--accent);width:16px;height:16px;flex:none}.td-t .w{flex:1;min-width:0}.td-t .w span{display:block;color:var(--muted);font-size:12px}
  .td-t.done .w{text-decoration:line-through;color:var(--muted)}.td-t .late{font:11px var(--mono);color:var(--muted)}
  .td-t.focus{padding:14px 0 16px}.td-t.focus .w{font-size:19px;font-weight:500;line-height:1.3}.td-t.focus .w span{font-size:13px;font-weight:400;margin-top:2px}.td-t.focus .late{font:600 13px var(--mono);color:var(--accent)}.td-t.focus input{width:20px;height:20px}
  .td-t select{height:24px;border:0;background:transparent;color:var(--muted);font:12px var(--ui);padding:0 2px;cursor:pointer}
  .td-g{display:flex;align-items:center;gap:10px;flex:1}.td-g .big{font:500 13px var(--mono);color:var(--ink)}.td-g small{color:var(--muted);font-size:12px}.td-g>div{display:flex;align-items:center;gap:10px;flex:1}
  .td-bar{height:5px;width:90px;border-radius:3px;background:var(--line);overflow:hidden;flex:none}.td-bar i{display:block;height:100%;background:var(--accent)}.td-empty{padding:14px 0;color:var(--muted)}`);
  const st = VK.store("today");
  const dueTasks = () => dueSteps(VK.apps(), prefs.snooze || {}, VK.day()).map(t => Object.assign({}, t, {what:t.what || ft("Next step", "Nächster Schritt", "Langkah berikutnya")}));
  const sentThisWeek = () => {
    const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0);
    return VK.apps().filter(a => colOf(a.status) !== "Preparing" && (t => t && t >= mon)(parseDate(a.status_date || a.date))).length;
  };
  vhook((view) => {
    if (view !== "dash" || !VK.ready()) return;
    const ticked = st.get("day", "") === VK.day() ? st.get("keys", []) : [], goal = prefs.weekGoal || 5, sent = sentThisWeek(), ts = dueTasks();
    const el = VK.widget("today", 25, `<div class="td"><div class="td-l"><h3>${esc(ft("Today", "Heute", "Hari ini"))}<small id="tdCnt">${ts.filter(t => ticked.includes(t.key)).length}/${ts.length} ${esc(ft("done", "erledigt", "selesai"))}</small></h3>
      ${ts.length ? ts.map((t, i) => `<label class="td-t${i === 0 ? " focus" : ""}${ticked.includes(t.key) ? " done" : ""}"><input type="checkbox" data-tk="${esc(t.key)}" ${ticked.includes(t.key) ? "checked" : ""}><span class="w">${esc(t.what)}<span>${esc(t.who)}</span></span>${t.late ? `<span class="late">${t.late}${esc(ft("d late", "T überfällig", "h telat"))}</span>` : ""}
        <select data-sz="${esc(t.key)}" aria-label="${esc(ft("Snooze", "Später", "Tunda"))}"><option value="">${esc(ft("Snooze", "Später", "Tunda"))}</option><option value="1">+1 ${esc(ft("day", "Tag", "hari"))}</option><option value="3">+3 ${esc(ft("days", "Tage", "hari"))}</option><option value="7">+7 ${esc(ft("days", "Tage", "hari"))}</option></select>
        <button class="btn ${i === 0 ? "primary" : "sm"}" data-open="${esc(t.id)}">${esc(ft("Open", "Öffnen", "Buka"))}</button></label>`).join("") : `<div class="td-empty">${esc(ft("Nothing is due today.", "Heute ist nichts fällig.", "Tidak ada yang jatuh tempo hari ini."))}</div>`}</div>
      <div class="td-r"><div class="td-g"><span class="big">${sent}/${goal}</span><div style="flex:1"><div class="td-bar"><i style="width:${Math.min(100, sent / goal * 100)}%"></i></div><small>${esc(ft("applications sent this week", "Bewerbungen diese Woche", "lamaran terkirim minggu ini"))}</small></div></div>
        <button class="btn sm" id="tdGoal" style="align-self:flex-start">${esc(ft("Change goal", "Ziel ändern", "Ubah target"))}</button></div></div>`, "full");
    if (!el) return;
    el.style.padding = "0"; el.style.overflow = "hidden";
    el.querySelectorAll("[data-tk]").forEach(c => { c.onclick = (e) => { e.stopPropagation();
      const keys = new Set(ticked); c.checked ? keys.add(c.dataset.tk) : keys.delete(c.dataset.tk);
      savePref("today", {day:VK.day(), keys:[...keys]}); c.closest(".td-t").classList.toggle("done", c.checked); $("tdCnt").textContent = `${keys.size}/${ts.length} ${ft("done", "erledigt", "selesai")}`; }; });
    // a snooze saves only the dates still in the future, so the list never grows
    el.querySelectorAll("[data-sz]").forEach(s => { s.onclick = (e) => e.stopPropagation(); s.onchange = () => { if (!s.value) return; savePref("snooze", Object.assign(Object.fromEntries(Object.entries(prefs.snooze || {}).filter(([, d]) => d > VK.day())), {[s.dataset.sz]:VK.day(+s.value)})); toast(ft("Snoozed", "Zurückgestellt", "Ditunda")); render(); }; });
    $("tdGoal").onclick = async () => {
      const n = parseInt(await dialog({title:ft("Weekly goal", "Wochenziel", "Target mingguan"), text:ft("How many applications do you want to send each week?", "Wie viele Bewerbungen willst du pro Woche senden?", "Berapa lamaran yang ingin kamu kirim tiap minggu?"), input:"5", value:String(goal)}), 10);
      if (n > 0 && n < 100){ savePref("weekGoal", n); render(); }
    };
  });
})();
