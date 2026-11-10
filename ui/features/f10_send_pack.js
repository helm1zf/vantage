// F10 Pre-send check + send pack: a button in each application's drawer that checks the final PDFs (present, pages, leftover
// placeholders, password, size, portal-safe names, Tari's QC) and, when everything passes, builds a clean zip to upload.
(function(){
  const css = document.createElement("style");
  css.textContent = `.psc{margin-top:12px}.psc-row{display:flex;gap:8px;align-items:baseline;font-size:12.5px;padding:3px 0}.psc-row i{width:9px;height:9px;border-radius:50%;background:#2E7D4F;flex:none;margin-top:3px}
  .psc-row.bad i{background:#B3261E}.psc-row small{color:var(--muted)}.psc-sum{font-weight:500;margin:8px 0 4px}.psc-act{display:flex;gap:8px;margin-top:8px}`;
  document.head.appendChild(css);
  async function run(apply){
    const a = state.open; if (!a || !a.folder) return;
    const box = $("pscBox");
    try {
      const out = JSON.parse(await invoke("run_kit_script", {root:folder, script:"pack_application.py", args:["02_workflow/" + a.folder].concat(apply ? ["--apply"] : [])}));
      const bad = out.checks.filter(c => !c.ok);
      box.innerHTML = `<div class="psc-sum">${out.ok ? ft("Ready to send", "Bereit zum Senden", "Siap dikirim") : bad.length + ft(" to fix before sending", " vor dem Senden zu beheben", " perlu diperbaiki sebelum dikirim")}</div>` +
        out.checks.map(c => `<div class="psc-row${c.ok ? "" : " bad"}"><i></i><div>${esc(c.label)} <small>${esc(c.detail)}</small></div></div>`).join("") +
        `<div class="psc-act">${out.pack ? `<span class="muted">${ft("Pack", "Paket", "Paket")}: ${esc(String(out.pack).split(/[\\/]/).pop())}</span><button class="btn sm" data-pscopen="${esc(a.folder)}">Show in folder</button>`
          : out.ok ? `<button class="btn primary sm" id="pscBuild">Build send pack (.zip)</button>` : `<button class="btn sm" id="pscAgain">Check again</button><button class="btn sm" data-chat="lamaran" data-send="1" data-say="${esc(ft("Nova, my pre-send check for " + (a.company || "this application") + " found: " + bad.map(c => c.label + " (" + c.detail + ")").join("; ") + ". Please have Bayu and Tari fix it.", "Nova, mein Check vor dem Senden für " + (a.company || "diese Bewerbung") + " hat gefunden: " + bad.map(c => c.label + " (" + c.detail + ")").join("; ") + ". Bitte lass Bayu und Tari das beheben.", "Nova, cek sebelum kirim untuk " + (a.company || "lamaran ini") + " menemukan: " + bad.map(c => c.label + " (" + c.detail + ")").join("; ") + ". Tolong minta Bayu dan Tari memperbaikinya."))}">Ask Bayu to fix</button>`}</div>`;
      const po = box.querySelector("[data-pscopen]"); if (po) po.onclick = () => invoke("reveal_path", {root:folder, rel:"02_workflow/" + a.folder + "/03_send"}).catch(e => toast(String(e)));   // it used to do nothing
      const b = $("pscBuild"); if (b) b.onclick = () => run(true);
      const ag = $("pscAgain"); if (ag) ag.onclick = () => run(false);
    } catch (e){ box.innerHTML = `<div class="muted">${ft("The check is not available yet. Update Vantage first.", "Die Prüfung ist noch nicht verfügbar. Aktualisiere zuerst Vantage.", "Pengecekan belum tersedia. Perbarui Vantage dulu.")}</div>`; }
  }
  function hook(){
    const f = $("drFiles"); if (!f || $("pscBox") || !state.open || !state.open.folder) return;
    const w = document.createElement("div"); w.className = "psc"; w.innerHTML = `<button class="btn sm" id="pscBtn">Pre-send check</button><div id="pscBox"></div>`;
    f.after(w); $("pscBtn").onclick = () => run(false);
  }
  new MutationObserver(hook).observe($("drawer"), {childList:true, subtree:true});
})();
