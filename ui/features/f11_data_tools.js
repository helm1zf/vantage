// F11 Your data: back up your whole folder in one click, and bring an old Vantage folder (or a backup) in without copying anything by hand.
// Both run kit scripts (backup_user.py, import_old.py). The import shows what it will do first and never overwrites or changes the old folder.
(function(){
  const css = document.createElement("style");
  css.textContent = `.pdata{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.pdata>div{flex:1;min-width:240px}.pdata b{display:block;font-weight:500}.pdata span.muted{font-size:12px}
  .pdata .btns{display:flex;gap:8px;flex-wrap:wrap}.imp-n{display:flex;gap:18px;flex-wrap:wrap;margin:8px 0}.imp-n b{display:block;font:500 22px var(--mono)}.imp-n span{font-size:12px;color:var(--muted)}
  .imp-l{margin:6px 0 0;padding-left:18px;font-size:12.5px}.imp-l li{margin:2px 0}.imp-e{color:#B3261E}`;
  document.head.appendChild(css);
  const run = (script, args) => invoke("run_kit_script", {root:folder, script, args});
  const parse = (out) => { try { return JSON.parse(out); } catch { return null; } };
  function busy(msg){
    $("dlgSheet").innerHTML = `<div class="cap">${esc(msg)}</div><p><i class="spin"></i> ${esc(ft("This can take a minute for a big folder. Please keep Vantage open.", "Das kann bei einem großen Ordner eine Minute dauern. Bitte lass Vantage offen.", "Ini bisa makan waktu semenit untuk folder besar. Biarkan Vantage tetap terbuka."))}</p>`;
    $("dlg").hidden = false;
    return () => { $("dlg").hidden = true; };
  }
  async function backup(){
    if (!invoke) return toast("Available only in the Vantage application");
    const done = busy(ft("Backing up…", "Sichere…", "Mencadangkan…"));
    let r = null, err = "";
    try { r = parse(await run("backup_user.py", [])); } catch (e){ err = String(e); }
    done();
    if (!r) return dialog({title:ft("Backup", "Sicherung", "Cadangan"), text:err || ft("The backup could not be made. Update Vantage first.", "Die Sicherung konnte nicht erstellt werden. Aktualisiere zuerst Vantage.", "Cadangan tidak bisa dibuat. Perbarui Vantage dulu."), no:false});
    const sk = r.skipped && r.skipped.length ? "\n\n" + ft("Not saved (in use by another program): ", "Nicht gesichert (von einem anderen Programm benutzt): ", "Tidak tersimpan (dipakai program lain): ") + r.skipped.slice(0, 5).map(x => x.file).join(", ") : "";
    const open = await dialog({title:ft("Backup saved", "Sicherung gespeichert", "Cadangan tersimpan"), text:`${String(r.path).split(/[\\/]/).pop()}\n${r.files} ${ft("files", "Dateien", "file")}, ${r.mb} MB${sk}`, ok:ft("Show in folder", "Im Ordner zeigen", "Tampilkan di folder"), no:ft("Close", "Schließen", "Tutup")});
    if (open) invoke("open_path", {path:String(r.path).replace(/[\\/][^\\/]*$/, "")}).catch(() => {});
  }
  async function pickSource(){
    const kind = await dialog({title:ft("Import old data", "Alte Daten importieren", "Impor data lama"),
      text:ft("Bring your old Vantage folder (or a backup) in. Nothing is changed in the old folder and nothing here is overwritten: a file that differs is kept next to the existing one. You see the plan before anything is copied.", "Hol deinen alten Vantage-Ordner (oder eine Sicherung) hinein. Am alten Ordner wird nichts verändert und hier wird nichts überschrieben: Eine abweichende Datei bleibt neben der vorhandenen. Du siehst den Plan, bevor etwas kopiert wird.", "Masukkan folder Vantage lamamu (atau cadangan). Folder lama tidak diubah dan tidak ada yang ditimpa di sini: file yang berbeda disimpan di samping yang sudah ada. Kamu melihat rencananya sebelum ada yang disalin."),
      select:[ft("An old folder", "Ein alter Ordner", "Folder lama"), ft("A backup file (.zip)", "Eine Sicherungsdatei (.zip)", "File cadangan (.zip)")], ok:ft("Choose…", "Auswählen…", "Pilih…")});
    if (!kind) return null;
    const zip = kind.includes(".zip");
    return T && T.dialog ? T.dialog.open(zip ? {title:"Backup", filters:[{name:"Backup", extensions:["zip"]}]} : {directory:true, title:ft("Choose the old folder", "Alten Ordner wählen", "Pilih folder lama")}) : null;
  }
  async function importOld(){
    if (!invoke) return toast("Available only in the Vantage application");
    const src = await pickSource(); if (!src) return;
    let done = busy(ft("Looking at the old folder…", "Schaue mir den alten Ordner an…", "Memeriksa folder lama…")), plan = null, err = "";
    try { plan = parse(await run("import_old.py", [src])); } catch (e){ err = String(e); }
    done();
    if (!plan) return dialog({title:ft("Import old data", "Alte Daten importieren", "Impor data lama"), text:err || ft("Could not read that folder.", "Dieser Ordner konnte nicht gelesen werden.", "Folder itu tidak bisa dibaca."), no:false});
    const clash = plan.conflicts.length, tpl = plan.replace_template.length, news = plan.copy.length;
    const html = `<div class="imp-n"><div><b>${news}</b><span>${esc(ft("new files", "neue Dateien", "file baru"))}</span></div><div><b>${plan.same}</b><span>${esc(ft("already identical", "schon identisch", "sudah sama"))}</span></div><div><b>${tpl}</b><span>${esc(ft("empty files replaced", "leere Dateien ersetzt", "file kosong diganti"))}</span></div><div><b>${clash}</b><span>${esc(ft("kept side by side", "nebeneinander behalten", "disimpan berdampingan"))}</span></div></div>` +
      (plan.root ? `<div class="muted">${esc(ft("Old user found: ", "Alter Nutzer gefunden: ", "User lama ditemukan: "))}${esc(plan.root)}</div>` : "") +
      (plan.to_inbox ? `<div class="muted">${esc(ft("No old Vantage layout found: everything goes to the Inbox for Tidy up.", "Kein altes Vantage-Layout gefunden: Alles kommt in die Inbox zum Aufräumen.", "Tata letak Vantage lama tidak ditemukan: semuanya masuk Inbox untuk dirapikan."))}</div>` : "") +
      (plan.todo.length ? `<ul class="imp-l">${plan.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "") +
      (plan.errors.length ? `<ul class="imp-l imp-e">${plan.errors.slice(0, 4).map(e => `<li>${esc(e.file)}: ${esc(e.error)}</li>`).join("")}</ul>` : "");
    if (!news && !clash && !tpl) return dialog({title:ft("Import old data", "Alte Daten importieren", "Impor data lama"), html:`<p>${esc(ft("Everything from that folder is already here.", "Alles aus diesem Ordner ist schon hier.", "Semua dari folder itu sudah ada di sini."))}</p>${html}`, no:false, ok:ft("Close", "Schließen", "Tutup")});
    if (!await dialog({title:ft("Import old data", "Alte Daten importieren", "Impor data lama"), html, ok:ft("Import", "Importieren", "Impor")})) return;
    done = busy(ft("Importing…", "Importiere…", "Mengimpor…")); let res = null;
    try { res = parse(await run("import_old.py", [src, "--apply"])); } catch (e){ err = String(e); }
    done();
    if (!res) return dialog({title:ft("Import old data", "Alte Daten importieren", "Impor data lama"), text:err, no:false});
    refresh(true);
    const left = res.errors.length;
    const next = await dialog({title:left ? ft("Imported, with a few files left", "Importiert, wenige Dateien offen", "Terimpor, beberapa file tersisa") : ft("Imported", "Importiert", "Terimpor"),
      html:`<p>${res.applied} ${esc(ft("files copied.", "Dateien kopiert.", "file disalin."))}</p>` + (left ? `<ul class="imp-l imp-e">${res.errors.slice(0, 6).map(e => `<li>${esc(e.file)}: ${esc(e.error)}</li>`).join("")}</ul><p class="muted">${esc(ft("Close the program that uses them and run the import again: only the missing files are copied.", "Schließe das Programm, das sie benutzt, und starte den Import erneut: Es werden nur die fehlenden Dateien kopiert.", "Tutup program yang memakainya lalu impor lagi: hanya file yang kurang yang disalin."))}</p>` : ""),
      ok:ft("Ask Nova to finish up", "Nova den Rest erledigen lassen", "Minta Nova menyelesaikan"), no:ft("Close", "Schließen", "Tutup")});
    if (next) sendNow(ft("Nova, I just imported my old Vantage data. Please read 01_user_documents/--usersettings/import_log.json and do what it lists under todo (merge my old CLAUDE.md rules, rename old month folders, check applications.json), then run verify_consistency.py.", "Nova, ich habe gerade meine alten Vantage-Daten importiert. Bitte lies 01_user_documents/--usersettings/import_log.json und erledige, was dort unter todo steht (alte CLAUDE.md-Regeln zusammenführen, alte Monatsordner umbenennen, applications.json prüfen), und führe dann verify_consistency.py aus.", "Nova, aku baru mengimpor data Vantage lamaku. Tolong baca 01_user_documents/--usersettings/import_log.json dan kerjakan yang tercantum di todo (gabungkan aturan CLAUDE.md lama, ganti nama folder bulan lama, cek applications.json), lalu jalankan verify_consistency.py."), "nova");
  }
  // Parts of an old Vantage that ended up inside materials (Archive, workflows ...) go back where they belong. Moved to --usersettings/imported, never deleted.
  async function repair(){
    if (!invoke) return toast("Available only in the Vantage application");
    const ttl = ft("Fix misplaced files", "Falsch abgelegte Dateien korrigieren", "Perbaiki file yang salah tempat");
    let done = busy(ft("Looking through your materials…", "Schaue deine Materialien durch…", "Memeriksa materialmu…")), plan = null, err = "";
    try { plan = parse(await run("import_old.py", ["--repair"])); } catch (e){ err = String(e); }
    done();
    if (!plan) return dialog({title:ttl, text:err || "?", no:false});
    if (!plan.entries.length) return dialog({title:ttl, text:ft("Nothing is out of place: no old Vantage folders were found inside your materials.", "Nichts liegt falsch: In deinen Materialien wurden keine alten Vantage-Ordner gefunden.", "Tidak ada yang salah tempat: tidak ada folder Vantage lama di dalam materialmu."), no:false, ok:ft("Close", "Schließen", "Tutup")});
    const html = `<p>${esc(ft("These will go back where they belong (the originals are kept under --usersettings/imported):", "Diese kommen an ihren Platz zurück (die Originale bleiben unter --usersettings/imported):", "Ini akan dikembalikan ke tempat yang benar (aslinya disimpan di --usersettings/imported):"))}</p><ul class="imp-l">${plan.entries.map(n => `<li>${esc(n)}</li>`).join("")}</ul>`;
    if (!await dialog({title:ttl, html, ok:ft("Fix", "Korrigieren", "Perbaiki")})) return;
    done = busy(ft("Moving…", "Verschiebe…", "Memindahkan…")); let res = null;
    try { res = parse(await run("import_old.py", ["--repair", "--apply"])); } catch (e){ err = String(e); }
    done(); refresh(true);
    if (!res) return dialog({title:ttl, text:err, no:false});
    dialog({title:ttl, html:`<p>${res.applied} ${esc(ft("files put back.", "Dateien zurückgelegt.", "file dikembalikan."))}</p>` + (res.errors.length ? `<ul class="imp-l imp-e">${res.errors.slice(0, 6).map(e => `<li>${esc(e.file)}: ${esc(e.error)}</li>`).join("")}</ul>` : ""), no:false, ok:ft("Close", "Schließen", "Tutup")});
  }
  function hook(view){
    if (view !== "profil" || $("btnBackup")) return;
    const danger = document.querySelector(".pdanger"); if (!danger) return;
    const sec = document.createElement("section"); sec.className = "panel pdata";
    sec.innerHTML = `<div><b>${esc(ft("Your data", "Deine Daten", "Datamu"))}</b><span class="muted">${esc(ft("Back up your whole folder in one click, or bring an old Vantage folder or backup in, no copying by hand.", "Sichere deinen ganzen Ordner mit einem Klick oder hole einen alten Vantage-Ordner oder eine Sicherung herein, ohne von Hand zu kopieren.", "Cadangkan seluruh folder dengan satu klik, atau masukkan folder Vantage lama atau cadangan, tanpa menyalin manual."))}</span></div>
      <div class="btns"><button class="btn" id="btnBackup">Back up my data</button><button class="btn" id="btnImport">Import old data</button><button class="btn" id="btnRepair">Fix misplaced files</button></div>`;
    danger.before(sec);
    $("btnBackup").onclick = backup; $("btnImport").onclick = importOld; $("btnRepair").onclick = repair;
  }
  vhook(hook);
})();
