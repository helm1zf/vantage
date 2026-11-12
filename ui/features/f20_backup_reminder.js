// F20 Backup reminder: when the last export is older than 7 days (or there is none), a Dashboard card offers "Export now". The date comes from
// Profile > Export account as well, so either button counts.
(function(){
  const st = VK.store("backup");
  vhook((view) => {
    if (view !== "dash" || !VK.ready() || prefs.backupOff) return;
    const last = st.get("last", ""), age = last ? -daysFrom(parseDate(last)) : Infinity;
    if (age < 7) return;
    const msg = last ? ft(`Last export ${age} days ago.`, `Letzter Export vor ${age} Tagen.`, `Ekspor terakhir ${age} hari lalu.`) : ft("No export yet. One zip file with your documents, workflow and settings.", "Noch kein Export. Eine Zip-Datei mit Dokumenten, Workflow und Einstellungen.", "Belum ada ekspor. Satu file zip berisi dokumen, workflow, dan pengaturan.");
    const el = VK.widget("backup", 90, `<div class="bk"><b>${esc(ft("Back up your data", "Daten sichern", "Cadangkan datamu"))}</b><span class="muted">${esc(msg)}</span><span class="grow"></span>
      <button class="btn sm" id="bkNow">${esc(ft("Export now", "Jetzt exportieren", "Ekspor sekarang"))}</button><button class="btn sm" id="bkOff">${esc(ft("Do not remind me", "Nicht erinnern", "Jangan ingatkan"))}</button></div>`);
    if (!el) return;
    $("bkOff").onclick = () => { savePref("backupOff", true); el.remove(); };
    $("bkNow").onclick = () => { goView("settings"); setTimeout(() => { const b = $("btnBackup"); if (b) b.click(); }, 600); };
  });
})();
