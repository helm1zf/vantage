// F09 Personal page: a Profile button that turns the Master CV content into one local web page (build_site.py).
// Opt-in, nothing is uploaded; phone and address are left out (--no-contact).
(function(){
  const MASTER = "01_user_documents/Master_CV/master_cv_content.json";
  async function make(){
    if (!invoke) return toast("Available only in the Vantage application");
    if (!await dialog({title:"Create a personal page?", text:"Vantage turns your Master CV into one web page on this computer (light and dark mode, prints cleanly, no tracking). Nothing is uploaded and your phone number and address are left out. You decide if it ever goes online.", ok:"Create it"})) return;
    try {
      const out = await invoke("run_kit_script", {root:folder, script:"build_site.py", args:[folder.replace(/[\\/]+$/, "") + "/" + MASTER, "--no-contact"]});
      const path = String(out).trim().split("\n").pop().trim();
      if (!path || /^The Master CV|^pakai|Traceback/i.test(path)) return toast("Finish your Master CV first, then try again.");
      // The script prints the path of the page; open_path only opens folders, so the page is opened as a file inside the user's folder.
      const base = folder.replace(/[\\/]+$/, "").replace(/\\/g, "/"), full = path.replace(/\\/g, "/");
      const rel = full.startsWith(base + "/") ? full.slice(base.length + 1) : "";
      if (!rel) return toast(ft("Personal page is ready: ", "Persönliche Seite ist fertig: ", "Halaman pribadi siap: ") + path);
      toast(ft("Personal page is ready: ", "Persönliche Seite ist fertig: ", "Halaman pribadi siap: ") + rel);
      invoke("open_file", {root:folder, rel}).catch(err => toast(String(err)));
    } catch (e){
      // Only a missing Master CV is "finish your Master CV"; any other error (no Python, a damaged file) is shown as it is.
      const msg = String(e);
      toast(/Master CV|master_cv_content/i.test(msg) ? "Finish your Master CV first, then try again." : msg.slice(0, 200));
    }
  }
  function hook(view){
    if (view !== "settings" || $("btnSite")) return;
    const row = $("stTools"); if (!row) return;
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "btnSite"; b.textContent = "Personal page"; b.onclick = make; row.appendChild(b);
  }
  vhook(hook);
})();
