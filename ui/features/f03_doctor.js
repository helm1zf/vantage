// F03 System check: one dialog that shows what this computer still needs (Python, libraries, Chrome/Edge, Claude Code, disk, path)
// with a "Fix with Nova" button on each failed row. Replaces the manual "install tools" steps in the old first run.
(function(){
  const css = document.createElement("style");
  css.textContent = `.doc-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:13px}
  .doc-row:last-child{border-bottom:0}.doc-dot{width:10px;height:10px;border-radius:50%;flex:none;background:#2E7D4F}.doc-row.bad .doc-dot{background:#B3261E}
  .doc-row span{flex:1;min-width:0}.doc-row small{display:block;color:var(--muted);font-size:11px;overflow-wrap:anywhere}
  .doc-sum{font-size:13px;margin-bottom:6px}`;
  document.head.appendChild(css);
  async function run(){
    let data;
    try { data = JSON.parse(await invoke("run_kit_script", {root:folder, script:"doctor.py", args:[]})); }
    catch (e){ return toast(ft("System check is not available yet. Update Vantage first.", "Der Systemcheck ist noch nicht verfügbar. Aktualisiere zuerst Vantage.", "Cek sistem belum tersedia. Perbarui Vantage dulu.")); }
    const bad = data.checks.filter(c => !c.ok);
    const html = `<div class="doc-sum">${bad.length ? bad.length + ft(bad.length > 1 ? " things to fix" : " thing to fix", bad.length > 1 ? " Punkte zu beheben" : " Punkt zu beheben", " hal perlu diperbaiki") : ft("Everything is ready.", "Alles ist bereit.", "Semuanya sudah siap.")}</div>` +
      data.checks.map(c => `<div class="doc-row${c.ok ? "" : " bad"}"><i class="doc-dot"></i><span>${esc(c.label)}<small>${esc(c.detail)}</small></span>${c.ok ? "" : `<button class="btn sm" data-docfix="${esc(c.id)}" data-fixtext="${esc(c.fix)}">Fix with Nova</button>`}</div>`).join("");
    dialog({title:"System check", html, ok:"Close", no:false});
    $("dlgSheet").querySelectorAll("[data-docfix]").forEach(b => b.onclick = () => { $("dlg").hidden = true; sendNow(ft(`Nova, my system check says this is not ready: ${b.dataset.fixtext}. Please fix exactly that for me (ask before installing anything).`, `Nova, mein Systemcheck sagt, das ist nicht bereit: ${b.dataset.fixtext}. Bitte behebe genau das für mich (frag, bevor du etwas installierst).`, `Nova, cek sistemku bilang ini belum siap: ${b.dataset.fixtext}. Tolong perbaiki persis itu untukku (tanya dulu sebelum memasang apa pun).`), "nova"); });
  }
  function hook(view){
    if (view !== "profil" || $("btnDoctor")) return;
    const row = document.querySelector(".pfrow"); if (!row) return;
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "btnDoctor"; b.textContent = "System check"; b.onclick = run; row.appendChild(b);
  }
  vhook(hook);
  window.runSystemCheck = run;
})();
