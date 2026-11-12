// F20 Backup reminder: when the last export is older than 7 days (or there is none), a quiet line under "Export account" in Settings says so,
// and the gear in the sidebar gets a small mark. "Do not remind me" switches both off (Settings > Reminders switches them on again).
(function(){
  const st = VK.store("backup");
  VK.css("bk", `.bk-note{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0 0;padding-top:10px;border-top:1px dashed var(--line);font-size:13px;color:var(--muted);grid-column:1/-1;flex-basis:100%}
  .bk-note i{width:9px;height:9px;background:var(--sun,#F8C630);border:1.5px solid var(--edge,#141414);flex:none}.bk-note .grow{flex:1}
  .gear.due{position:relative}.gear.due::after{content:"";position:absolute;top:5px;right:5px;width:8px;height:8px;background:var(--sun,#F8C630);border:1.5px solid var(--edge,#141414)}`);
  const age = () => { const last = st.get("last", ""); return last ? -daysFrom(parseDate(last)) : Infinity; };
  const due = () => VK.ready() && !prefs.backupOff && age() >= 7;
  vhook((view) => {
    const gear = $("btnGear"); if (gear) gear.classList.toggle("due", due());
    const old = $("bkNote"); if (old) old.remove();
    if (view !== "settings" || !due()) return;
    const box = document.querySelector(".pdata"); if (!box) return;
    const a = age(), msg = a === Infinity ? ft("You have not exported your account yet.", "Du hast dein Konto noch nicht exportiert.", "Kamu belum pernah mengekspor akunmu.") : ft(`Your last export was ${a} days ago.`, `Dein letzter Export war vor ${a} Tagen.`, `Ekspor terakhirmu ${a} hari lalu.`);
    const n = document.createElement("div"); n.className = "bk-note"; n.id = "bkNote";
    n.innerHTML = `<i></i><span>${esc(msg)}</span><span class="grow"></span><button class="btn sm" id="bkOff" type="button">${esc(ft("Do not remind me", "Nicht erinnern", "Jangan ingatkan"))}</button>`;
    box.append(n);
    $("bkOff").onclick = () => { savePref("backupOff", true); n.remove(); if (gear) gear.classList.remove("due"); const s = $("stBackup"); if (s) s.value = "off"; };
  });
})();
