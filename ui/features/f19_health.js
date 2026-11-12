// F19 Needs a look: a Dashboard card for what went wrong for real users: old Vantage folders filed under materials and applications whose folder is gone.
// Each line has the button that fixes it. The card does not appear when everything is fine. (Inbox files and missing facts are already shown elsewhere.)
(function(){
  VK.css("hl", `.hl-r{display:flex;align-items:center;gap:10px;padding:7px 0;border-top:1px solid var(--line);font-size:13px}.hl-r:first-of-type{border-top:0}.hl-r i{width:8px;height:8px;border-radius:50%;background:#B58A4E;flex:none}
  .hl-r span{flex:1}.hl-r small{display:block;color:var(--muted);font-size:12px}`);
  const MISFILED = /^(archive|workflows?|workflow_import|imported)\b/i;
  vhook((view, d) => {
    if (view !== "dash" || !VK.ready()) return;
    const issues = [], gone = VK.apps().filter(a => a.missing).length;
    if ((d.mat_items || []).some(m => MISFILED.test(m.name))) issues.push({t:ft("Old Vantage folders may be filed under materials", "Alte Vantage-Ordner liegen evtl. unter materials", "Folder Vantage lama mungkin salah tempat di materials"), s:ft("Settings > Fix misplaced files puts them back.", "Einstellungen > Falsch abgelegte Dateien korrigieren legt sie zurück.", "Setelan > Perbaiki file yang salah tempat mengembalikannya."), b:ft("Fix", "Beheben", "Perbaiki"), run:() => { goView("settings"); setTimeout(() => { const b = $("btnRepair"); if (b) b.click(); }, 600); }});
    if (gone) issues.push({t:ft(`${gone} ${gone === 1 ? "application has" : "applications have"} no folder any more`, `${gone} ${gone === 1 ? "Bewerbung hat" : "Bewerbungen haben"} keinen Ordner mehr`, `${gone} lamaran kehilangan foldernya`), s:ft("Open the card to remove it from the tracker.", "Karte öffnen, um sie aus dem Tracker zu entfernen.", "Buka kartunya untuk menghapus dari tracker."), b:ft("Show", "Zeigen", "Lihat"), run:() => goView("apps")});
    if (!issues.length) return;
    const el = VK.widget("health", 20, `<h3>${esc(ft("Needs a look", "Braucht einen Blick", "Perlu dicek"))}<small>${issues.length}</small></h3>` +
      issues.map((x, i) => `<div class="hl-r"><i></i><span>${esc(x.t)}<small>${esc(x.s)}</small></span><button class="btn sm" data-hl="${i}">${esc(x.b)}</button></div>`).join(""));
    if (el) el.onclick = (e) => { const b = e.target.closest("[data-hl]"); if (b) issues[+b.dataset.hl].run(); };
  });
})();
