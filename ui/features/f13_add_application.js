// F13 Add application: a form for a job you found yourself (a tip, a career fair, a site Sinta does not search).
// scripts/add_application.py creates the folder and the applications.json entry in one step. New cards start as Draft, Screening or Interview R1;
// move them on the board afterwards, which moves the folder the proper way.
(function(){
  VK.css("add", `.qa{display:grid;gap:10px;margin-top:8px}.qa .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.qa .note{color:#B3261E;font-size:12px;min-height:16px}`);
  const sameCompany = (name) => { const n = name.trim().toLowerCase(); return n.length >= 3 ? VK.apps().find(a => (a.company || "").toLowerCase() === n) : null; };
  async function form(prev){
    const v = Object.assign({company:"", role:"", link:"", source:"", deadline:"", status:"Draft", fit:""}, prev);
    const opt = (k, t) => `<option value="${k}"${v.status === k ? " selected" : ""}>${esc(t)}</option>`;
    const html = `<div class="qa"><label class="vkf">${esc(ft("Company", "Firma", "Perusahaan"))} *<input id="qaC" autocomplete="off" value="${esc(v.company)}"></label><div class="note" id="qaN"></div>
      <label class="vkf">${esc(ft("Role", "Stelle", "Posisi"))} *<input id="qaR" autocomplete="off" value="${esc(v.role)}"></label>
      <label class="vkf">${esc(ft("Link to the job ad", "Link zur Anzeige", "Tautan lowongan"))}<input id="qaL" placeholder="https://" value="${esc(v.link)}"></label>
      <div class="two"><label class="vkf">${esc(ft("Where did you find it?", "Wo gefunden?", "Dari mana?"))}<input id="qaS" value="${esc(v.source)}"></label>
        <label class="vkf">${esc(ft("Deadline", "Frist", "Batas waktu"))}<input id="qaD" type="date" value="${esc(v.deadline)}"></label></div>
      <div class="two"><label class="vkf">Status<select id="qaT">${opt("Draft", ft("Preparing (Draft)", "In Vorbereitung (Draft)", "Persiapan (Draft)"))}${opt("Screening", "Screening")}${opt("Interview R1", "Interview R1")}</select></label>
        <label class="vkf">${esc(ft("Match, 0 to 100 (if known)", "Match, 0 bis 100 (falls bekannt)", "Kecocokan 0–100 (jika tahu)"))}<input id="qaF" type="number" min="0" max="100" value="${esc(v.fit)}"></label></div></div>`;
    const warn = () => { const a = sameCompany($("qaC").value); $("qaN").textContent = a ? ft(`You already have ${a.company} (${a.role}, ${a.status}).`, `${a.company} hast du schon (${a.role}, ${a.status}).`, `${a.company} sudah ada (${a.role}, ${a.status}).`) : ""; };
    const done = dialog({title:ft("Add application", "Bewerbung hinzufügen", "Tambah lamaran"), html, ok:ft("Add", "Hinzufügen", "Tambah")});
    $("qaC").oninput = warn; warn();
    if (!await done) return;
    const g = (id) => $(id).value.trim();
    const data = {company:g("qaC"), role:g("qaR"), link:g("qaL"), source:g("qaS"), deadline:g("qaD"), status:g("qaT"), fit:+g("qaF") || 0};
    if (!data.company || !data.role){ toast(ft("Company and role are both needed.", "Firma und Stelle werden beide gebraucht.", "Perusahaan dan posisi wajib diisi.")); return form(data); }
    try {
      const r = JSON.parse(await invoke("run_kit_script", {root:folder, script:"add_application.py", args:[JSON.stringify(data)]}));
      state.sig = null; await refresh(true);
      toast(ft(`Added ${data.company}.`, `${data.company} hinzugefügt.`, `${data.company} ditambahkan.`), {label:ft("Open", "Öffnen", "Buka"), run:() => openApp(r.id)});
    } catch (e){ dialog({title:ft("Add application", "Bewerbung hinzufügen", "Tambah lamaran"), text:String(e), no:false}); }
  }
  vhook((view) => {
    if (view !== "apps" && view !== "pipeline") return;
    const box = VK.boardActions(); if (!box || $("qaAdd")) return;
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "qaAdd"; b.textContent = "+ " + ft("Add application", "Bewerbung hinzufügen", "Tambah lamaran"); b.onclick = () => form();
    box.appendChild(b);
  });
})();
