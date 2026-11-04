// F11 Your data: export a whole account as one file, import it back EXACTLY (with a check that nothing is missing and a plain list of anything that failed), and bring an old Vantage folder in.
// Runs the kit scripts backup_user.py (export), account_import.py (import and check) and import_old.py (old folders). The import shows what it will do first and never overwrites or changes the old folder.
(function(){
  const css = document.createElement("style");
  css.textContent = `.pdata{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 16px}.pdata>div{flex:1;min-width:240px}.pdata b{display:block;font-weight:500}.pdata span.muted{font-size:12px}
  .pdata .btns{display:flex;gap:8px;flex-wrap:wrap}.imp-n{display:flex;gap:18px;flex-wrap:wrap;margin:8px 0}.imp-n b{display:block;font:500 22px var(--mono)}.imp-n span{font-size:12px;color:var(--muted)}
  .imp-l{margin:6px 0 0;padding-left:18px;font-size:12.5px}.imp-l li{margin:2px 0}.imp-e{color:#B3261E}`;
  document.head.appendChild(css);
  // A script the app needs but the Vantage folder does not have yet (the app is newer than the folder's files): offer the update right away.
  const run = async (script, args) => {
    try { return await invoke("run_kit_script", {root:folder, script, args}); }
    catch (e){
      if (/not part of your Vantage files/.test(String(e)) && typeof checkUpdate === "function")
        toast(ft("Your Vantage files are older than the app.", "Deine Vantage-Dateien sind älter als die App.", "File Vantage-mu lebih lama dari aplikasinya."), {label:ft("Update now", "Jetzt aktualisieren", "Perbarui sekarang"), run:() => checkUpdate(true)});
      throw e;
    }
  };
  const parse = (out) => { try { return JSON.parse(out); } catch { return null; } };
  function busy(msg){
    $("dlgSheet").innerHTML = `<div class="cap">${esc(msg)}</div><p><i class="spin"></i> ${esc(ft("This can take a minute for a big folder. Please keep Vantage open.", "Das kann bei einem großen Ordner eine Minute dauern. Bitte lass Vantage offen.", "Ini bisa makan waktu semenit untuk folder besar. Biarkan Vantage tetap terbuka."))}</p>`;
    $("dlg").hidden = false;
    return () => { $("dlg").hidden = true; };
  }

  const ttl = () => ft("Account", "Konto", "Akun");
  async function exportAccount(){
    if (!invoke) return toast("Available only in the Vantage application");
    const done = busy(ft("Exporting…", "Exportiere…", "Mengekspor…"));
    let r = null, err = "";
    try { r = parse(await run("backup_user.py", [])); } catch (e){ err = String(e); }
    done();
    if (!r) return dialog({title:ft("Export account", "Konto exportieren", "Ekspor akun"), text:err || ft("The export could not be made. Update Vantage first.", "Der Export konnte nicht erstellt werden. Aktualisiere zuerst Vantage.", "Ekspor tidak bisa dibuat. Perbarui Vantage dulu."), no:false});
    const sk = r.skipped && r.skipped.length ? "\n\n" + ft("Not exported (in use by another program), the import will name them: ", "Nicht exportiert (von einem anderen Programm benutzt), der Import nennt sie: ", "Tidak terekspor (dipakai program lain), impor akan menyebutnya: ") + r.skipped.slice(0, 5).map(x => x.file).join(", ") : "";
    const open = await dialog({title:ft("Account exported", "Konto exportiert", "Akun terekspor"), text:`${String(r.path).split(/[\\/]/).pop()}\n${r.files} ${ft("files", "Dateien", "file")}, ${r.mb} MB\n${ft("Import this one file on the other computer: it takes everything back exactly.", "Importiere diese eine Datei auf dem anderen Computer: Sie bringt alles genau zurück.", "Impor satu file ini di komputer lain: semuanya kembali persis.")}${sk}`, ok:ft("Show in folder", "Im Ordner zeigen", "Tampilkan di folder"), no:ft("Close", "Schließen", "Tutup")});
    if (open) invoke("open_path", {path:String(r.path).replace(/[\\/][^\\/]*$/, "")}).catch(() => {});
  }
  async function pickSource(){
    const kind = await dialog({title:ft("Import account", "Konto importieren", "Impor akun"),
      text:ft("Choose what to bring in. An exported account comes back exactly, and you see afterwards that every file arrived. Nothing here is overwritten: a file that differs is kept next to the existing one.", "Wähle, was hereinkommen soll. Ein exportiertes Konto kommt genau zurück, und du siehst danach, dass jede Datei angekommen ist. Hier wird nichts überschrieben: Eine abweichende Datei bleibt neben der vorhandenen.", "Pilih yang ingin dimasukkan. Akun hasil ekspor kembali persis, dan setelahnya kamu melihat bahwa setiap file sampai. Tidak ada yang ditimpa: file yang berbeda disimpan di samping yang sudah ada."),
      select:[ft("An exported account (.zip)", "Ein exportiertes Konto (.zip)", "Akun hasil ekspor (.zip)"), ft("An old Vantage folder", "Ein alter Vantage-Ordner", "Folder Vantage lama")], ok:ft("Choose…", "Auswählen…", "Pilih…")});
    if (!kind) return null;
    const zip = kind.includes(".zip");
    return T_ && T_.dialog ? T_.dialog.open(zip ? {title:"Export", filters:[{name:"Vantage", extensions:["zip"]}]} : {directory:true, title:ft("Choose the folder", "Ordner wählen", "Pilih folder")}) : null;
  }
  const T_ = window.__TAURI__;
  const reasonLine = (f) => `<li><b>${esc(String(f.file).split("/").slice(-2).join("/"))}</b>: ${esc(f.reason || f.detail || "")}${f.hint ? `<br><span class="muted">${esc(f.hint)}</span>` : ""}</li>`;
  function openItems(r){ return [].concat(r.failed || [], r.damaged || [], (r.verify && r.verify.missing || []).map(x => ({file:x.file, reason:ft("missing: ", "fehlt: ", "hilang: ") + x.detail})), (r.verify && r.verify.different || []).map(x => ({file:x.file, reason:x.detail}))); }
  function summary(r){
    const c = r.counts || {}, v = r.verify || {}, items = openItems(r);
    return `<div class="imp-n"><div><b>${c.copy || 0}</b><span>${esc(ft("new files", "neue Dateien", "file baru"))}</span></div><div><b>${c.same || 0}</b><span>${esc(ft("already identical", "schon identisch", "sudah sama"))}</span></div><div><b>${(c.replaced || 0) + (c.merged || 0)}</b><span>${esc(ft("settings taken in", "Einstellungen übernommen", "pengaturan diambil"))}</span></div><div><b>${c.conflicts || 0}</b><span>${esc(ft("kept side by side", "nebeneinander behalten", "disimpan berdampingan"))}</span></div></div>` +
      (v.ok !== undefined && (r.applied !== undefined || r.verify) ? `<div style="margin:6px 0">${items.length ? `<b style="color:#B3261E">${items.length} ${esc(ft("open", "offen", "terbuka"))}</b>` : `<b style="color:#2E7D4F">${esc(ft("Every file of the package is accounted for.", "Jede Datei des Pakets ist vorhanden.", "Setiap file dalam paket sudah ada."))}</b>`} <span class="muted">(${v.ok} ${esc(ft("checked", "geprüft", "diperiksa"))})</span></div>` : "") +
      ((r.missing_in_package || []).length ? `<div class="muted">${esc(ft("Not in the package (the old computer could not read them): ", "Nicht im Paket (der alte Computer konnte sie nicht lesen): ", "Tidak ada di paket (komputer lama tidak bisa membacanya): "))}${esc(r.missing_in_package.map(x => x.file.split("/").pop()).slice(0, 5).join(", "))}</div>` : "") +
      (items.length ? `<ul class="imp-l imp-e">${items.slice(0, 8).map(reasonLine).join("")}${items.length > 8 ? `<li>+ ${items.length - 8} ${esc(ft("more in the report", "weitere im Bericht", "lainnya di laporan"))}</li>` : ""}</ul>` : "") +
      (r.warnings && r.warnings.length ? `<ul class="imp-l">${r.warnings.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : "") +
      (r.todo && r.todo.length ? `<ul class="imp-l">${r.todo.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : "");
  }
  const NOVA_FIX = () => ft("Nova, I imported an account package. Please read 01_user_documents/--usersettings/import_report.md and work through every open item: fix what you can, ask me about files that were kept side by side, run the import command from the report again if it says so, and tell me when the report has no open items left.", "Nova, ich habe ein Konto-Paket importiert. Bitte lies 01_user_documents/--usersettings/import_report.md und arbeite jeden offenen Punkt ab: Behebe, was du kannst, frag mich bei Dateien, die nebeneinander behalten wurden, führe den Import-Befehl aus dem Bericht erneut aus, wenn es dort steht, und sag mir, wenn im Bericht nichts mehr offen ist.", "Nova, aku mengimpor paket akun. Tolong baca 01_user_documents/--usersettings/import_report.md dan kerjakan setiap butir yang masih terbuka: perbaiki yang bisa, tanyakan padaku soal file yang disimpan berdampingan, jalankan lagi perintah impor dari laporan jika disebutkan, dan beri tahu aku kalau laporan sudah tidak punya butir terbuka.");
  async function finish(r, title){
    refresh(true);
    const items = openItems(r), more = items.length || (r.conflicts || []).length || (r.todo || []).length;
    const ask = await dialog({title, html:`<p>${esc(r.applied !== undefined ? `${r.applied} ${ft("files copied.", "Dateien kopiert.", "file disalin.")}` : "")}</p>${summary(r)}<p class="muted">${esc(ft("Report for you and for Nova: ", "Bericht für dich und Nova: ", "Laporan untuk kamu dan Nova: "))}${esc(r.report || "01_user_documents/--usersettings/import_report.md")}</p>`, ok:more ? ft("Ask Nova to finish", "Nova den Rest erledigen lassen", "Minta Nova menyelesaikan") : ft("Close", "Schließen", "Tutup"), no:more ? ft("Close", "Schließen", "Tutup") : false});
    if (ask && more) sendNow(NOVA_FIX(), "nova");
  }
  async function importAccount(){
    if (!invoke) return toast("Available only in the Vantage application");
    const src = await pickSource(); if (!src) return;
    let done = busy(ft("Reading the package…", "Lese das Paket…", "Membaca paket…")), plan = null, err = "";
    try { plan = parse(await run("account_import.py", [src])); } catch (e){ err = String(e); }
    done();
    if (err && /not part of your Vantage files/.test(err)) return legacyImport(src);      // an older kit: the old way still works
    if (!plan) return dialog({title:ft("Import account", "Konto importieren", "Impor akun"), text:err || ft("Could not read that package.", "Dieses Paket konnte nicht gelesen werden.", "Paket itu tidak bisa dibaca."), no:false});
    if (plan.kind === "legacy") return legacyImport(src);                               // an old Vantage folder, not an exported account
    const c = plan.counts || {};
    if (!c.copy && !c.conflicts && !c.replaced && !c.merged && !c.failed && !c.damaged) return dialog({title:ft("Import account", "Konto importieren", "Impor akun"), html:`<p>${esc(ft("Everything from this package is already here.", "Alles aus diesem Paket ist schon hier.", "Semua dari paket ini sudah ada di sini."))}</p>`, no:false, ok:ft("Close", "Schließen", "Tutup")});
    const pre = `<p class="muted">${esc(plan.fresh_target ? ft("This account is still empty: the package's settings and notes are used.", "Dieses Konto ist noch leer: Einstellungen und Notizen des Pakets werden übernommen.", "Akun ini masih kosong: pengaturan dan catatan dari paket dipakai.") : ft("This account already has data: yours stays, the package is added next to it and merged where possible.", "Dieses Konto hat schon Daten: Deine bleiben, das Paket kommt daneben und wird, wo möglich, zusammengeführt.", "Akun ini sudah berisi data: milikmu tetap, paket ditambahkan di sampingnya dan digabung bila bisa."))}</p>`;
    if (!await dialog({title:ft("Import account", "Konto importieren", "Impor akun"), html:pre + summary(plan), ok:ft("Import", "Importieren", "Impor")})) return;
    done = busy(ft("Importing…", "Importiere…", "Mengimpor…")); let res = null; err = "";
    try { res = parse(await run("account_import.py", [src, "--apply"])); } catch (e){ err = String(e); }
    done();
    if (!res) return dialog({title:ft("Import account", "Konto importieren", "Impor akun"), text:err, no:false});
    finish(res, openItems(res).length ? ft("Imported, with open items", "Importiert, mit offenen Punkten", "Terimpor, ada butir terbuka") : ft("Imported", "Importiert", "Terimpor"));
  }
  async function checkImport(){
    if (!invoke) return toast("Available only in the Vantage application");
    const src = await pickSource(); if (!src) return;
    const done = busy(ft("Comparing every file…", "Vergleiche jede Datei…", "Membandingkan setiap file…")); let res = null, err = "";
    try { res = parse(await run("account_import.py", [src, "--verify"])); } catch (e){ err = String(e); }
    done();
    if (!res || res.kind === "legacy") return dialog({title:ft("Check import", "Import prüfen", "Periksa impor"), text:err || ft("This can only be checked for an exported account (.zip).", "Das lässt sich nur für ein exportiertes Konto (.zip) prüfen.", "Ini hanya bisa diperiksa untuk akun hasil ekspor (.zip)."), no:false});
    finish(res, ft("Check import", "Import prüfen", "Periksa impor"));
  }

  async function legacyImport(src){
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
    const headEl = document.querySelector(".prof > .phead"); if (!headEl) return;
    const sec = document.createElement("section"); sec.className = "panel pdata";
    sec.innerHTML = `<div><b>${esc(ft("Your data and tools", "Deine Daten und Werkzeuge", "Data dan alatmu"))}</b><span class="muted">${esc(ft("Export your whole account as one file and import it on another computer: it comes back exactly, and Vantage shows that every file arrived or names the ones that did not.", "Exportiere dein ganzes Konto als eine Datei und importiere es auf einem anderen Computer: Es kommt genau zurück, und Vantage zeigt, dass jede Datei angekommen ist, oder nennt die, die fehlen.", "Ekspor seluruh akunmu sebagai satu file dan impor di komputer lain: kembali persis, dan Vantage menunjukkan bahwa setiap file sampai atau menyebut yang tidak."))}</span></div>
      <div class="btns"><button class="btn sm" id="btnBackup">Export account</button><button class="btn sm" id="btnImport">Import account</button><button class="btn sm" id="btnCheck">Check import</button><button class="btn sm" id="btnRepair">Fix misplaced files</button></div>`;
    headEl.after(sec);
    // the other tools live in the same row, so the profile header stays one clean line
    const b = sec.querySelector(".btns"); ["btnSite", "btnDoctor"].forEach(id => { const x = $(id); if (x) b.append(x); });
    $("btnBackup").onclick = exportAccount; $("btnImport").onclick = importAccount; $("btnCheck").onclick = checkImport; $("btnRepair").onclick = repair;
  }
  vhook(hook);
})();
