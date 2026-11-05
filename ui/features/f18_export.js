// F18 Export: take your applications out of Vantage. A spreadsheet (CSV, opens in Excel, Numbers, Google Sheets) and a calendar file (.ics) with
// next steps, deadlines and 14-day follow-ups. scripts/export_tracker.py writes into _Exports/ in your folder and never changes applications.json.
(function(){
  async function run(mode){
    let r; try { r = JSON.parse(await invoke("run_kit_script", {root:folder, script:"export_tracker.py", args:[mode]})); } catch (e){ return dialog({title:ft("Export", "Export", "Ekspor"), text:String(e), no:false}); }
    const names = r.files.map(f => f.split(/[\\/]/).pop()).join("\n");
    const show = await dialog({title:ft("Export saved", "Export gespeichert", "Ekspor tersimpan"), text:`${names}\n${r.rows} ${ft("applications", "Bewerbungen", "lamaran")}${r.events ? ` · ${r.events} ${ft("calendar events", "Kalendereinträge", "acara kalender")}` : ""}${mode === "csv" ? "" : "\n" + ft("Double-click the .ics file to add it to your calendar.", "Doppelklick auf die .ics-Datei fügt sie deinem Kalender hinzu.", "Klik dua kali file .ics untuk menambahkannya ke kalender.")}`, ok:ft("Show in folder", "Im Ordner zeigen", "Tampilkan di folder"), no:ft("Close", "Schließen", "Tutup")});
    if (show) invoke("open_path", {path:r.files[0].replace(/[\\/][^\\/]*$/, "")}).catch(() => {});
  }
  async function menu(){
    const csv = ft("Spreadsheet (CSV)", "Tabelle (CSV)", "Spreadsheet (CSV)"), ics = ft("Calendar (.ics)", "Kalender (.ics)", "Kalender (.ics)"), both = ft("Both", "Beides", "Keduanya");
    const pick = await dialog({title:ft("Export your applications", "Bewerbungen exportieren", "Ekspor lamaranmu"), text:ft("Your tracker is not changed.", "Dein Tracker wird nicht verändert.", "Trackermu tidak diubah."), select:[csv, ics, both], ok:ft("Export", "Exportieren", "Ekspor")});
    if (pick) run({[csv]:"csv", [ics]:"ics", [both]:"both"}[pick]);
  }
  vhook((view) => {
    if (view !== "apps" && view !== "pipeline") return;
    const box = VK.boardActions(); if (!box || $("exBtn")) return;
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "exBtn"; b.textContent = ft("Export", "Export", "Ekspor"); b.onclick = menu; box.appendChild(b);
  });
})();
