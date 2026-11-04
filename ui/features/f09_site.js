// F09 Personal page: a Profile button that turns the Master CV content into one local web page (build_site.py).
// Opt-in, nothing is uploaded; phone and address are left out (--no-contact).
(function(){
  const MASTER = "01_user_documents/Master_CV/master_cv_content.json";
  async function make(){
    if (!invoke) return toast("Available only in the Vantage application");
    if (!await dialog({title:"Create a personal page?", text:"Vantage turns your Master CV into one web page on this computer (light and dark mode, prints cleanly, no tracking). Nothing is uploaded and your phone number and address are left out. You decide if it ever goes online.", ok:"Create it"})) return;
    try {
      const out = await invoke("run_kit_script", {root:folder, script:"build_site.py", args:[folder.replace(/[\\/]+$/, "") + "/" + MASTER, "--no-contact"]});
      const path = String(out).trim().split("\n").pop();
      if (!path || /^The Master CV|^pakai|Traceback/i.test(path)) return toast("Finish your Master CV first, then try again.");
      toast("Personal page is ready");
      invoke("open_path", {path}).catch(() => {});
    } catch (e){ toast("Finish your Master CV first, then try again."); }
  }
  function hook(view){
    if (view !== "profil" || $("btnSite")) return;
    const row = document.querySelector(".pfrow"); if (!row) return;
    const b = document.createElement("button"); b.className = "btn sm"; b.id = "btnSite"; b.textContent = "Personal page"; b.onclick = make; row.appendChild(b);
  }
  vhook(hook);
})();
