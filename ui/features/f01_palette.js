// F01 Command palette: Cmd/Ctrl+K opens one box that finds pages, actions, applications, chats and materials.
(function(){
  const css = document.createElement("style");
  css.textContent = `
  #pal{position:fixed;inset:0;z-index:80;background:rgba(35,34,31,.35);display:flex;justify-content:center;align-items:flex-start;padding-top:14vh}
  #pal[hidden]{display:none}
  #pal .pbox{width:min(600px,92vw);background:var(--field);border:1px solid var(--fieldLine);border-radius:12px;box-shadow:0 18px 60px rgba(0,0,0,.35);overflow:hidden}
  #pal input{width:100%;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--ink);font:16px var(--ui);padding:15px 18px;outline:none}
  #pal .plist{max-height:52vh;overflow:auto;padding:6px}
  #pal .pg{font:10px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted);padding:8px 12px 4px}
  #pal .pit{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:7px;cursor:pointer}
  #pal .pit.on{background:var(--panel)}
  #pal .pit i{width:22px;height:22px;border-radius:6px;background:var(--housing);display:grid;place-items:center;font:600 11px var(--mono);font-style:normal;color:var(--muted)}
  #pal .pit span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #pal .pit small{color:var(--muted);font-size:12px}
  #pal .pft{display:flex;gap:14px;padding:8px 14px;border-top:1px solid var(--line);font:11px var(--mono);color:var(--muted)}
  #btnPal{display:flex;align-items:center;gap:8px;height:32px;border:1px solid var(--fieldLine);border-radius:6px;background:transparent;color:var(--muted);padding:0 10px;font:13px var(--ui);cursor:pointer}
  #btnPal kbd{margin:0}`;
  document.head.appendChild(css);
  const mac = /Mac/i.test(navigator.platform);
  const el = document.createElement("div"); el.id = "pal"; el.hidden = true;
  el.innerHTML = `<div class="pbox"><input id="palIn" placeholder="Search pages, actions, applications, chats…" autocomplete="off"><div class="plist" id="palList"></div><div class="pft"><span>↑↓ move</span><span>Enter open</span><span>Esc close</span></div></div>`;
  document.body.appendChild(el);
  const btn = document.createElement("button"); btn.id = "btnPal"; btn.innerHTML = `Search <kbd>${mac ? "⌘" : "Ctrl"} K</kbd>`;
  const tools = document.querySelector(".tools"); if (tools) tools.insertBefore(btn, tools.firstChild);

  const PAGES = [["dash", "Dashboard"], ["inbox", "Inbox"], ["laporan", "Morning report"], ["apps", "Applications"], ["interview", "Interview"], ["profil", "Profile"], ["skill", "Skills"]];
  function items(){
    const d = state.data || {}, out = [];
    PAGES.forEach(([v, n]) => out.push({g:"Go to", t:n, k:"→", run:() => goView(v)}));
    out.push({g:"Actions", t:"Find jobs now", k:"⚡", run:() => runReport()});
    out.push({g:"Actions", t:"Tidy up my Inbox", k:"⚡", run:() => novaTidy()});
    out.push({g:"Actions", t:"Update Master CV", k:"⚡", run:() => sendNow(say("mcv"), "lamaran", "bayu")});
    out.push({g:"Actions", t:"New chat", k:"+", run:() => dockNew()});
    out.push({g:"Actions", t:"Edit my name", k:"✎", run:() => { goView("profil"); setTimeout(editName, 200); }});
    (d.apps || []).forEach(a => out.push({g:"Applications", t:`${a.company}`, s:`${a.role} · ${a.status}`, k:"A", run:() => { state.pipeIds = [String(a.id)]; goView("pipeline"); }}));
    (typeof novaAll === "function" ? novaAll() : []).forEach(c => out.push({g:"Chats", t:novaName(c), k:"C", run:() => dockOpen(c.id)}));
    (d.mat_items || []).forEach(m => out.push({g:"Materials", t:m.name.replace(/_/g, " "), k:"M", run:() => goView("profil")}));
    return out;
  }
  // Fuzzy: every typed character must appear in order; earlier and consecutive hits score higher.
  function score(q, text){
    q = q.toLowerCase(); text = text.toLowerCase(); let i = 0, s = 0, last = -2;
    for (const ch of q){ const j = text.indexOf(ch, i); if (j < 0) return -1; s += (j === last + 1 ? 3 : 1) + (j === 0 ? 2 : 0); last = j; i = j + 1; }
    return s - text.length * 0.01;
  }
  let shown = [], sel = 0;
  function draw(){
    const q = $("palIn").value.trim();
    let list = items().map(it => ({it, sc:q ? Math.max(score(q, it.t), it.s ? score(q, it.s) - 1 : -1) : 0})).filter(x => x.sc >= 0);
    const ORDER = ["Go to", "Actions", "Applications", "Chats", "Materials"];
    list.sort((a, b) => ORDER.indexOf(a.it.g) - ORDER.indexOf(b.it.g) || (q ? b.sc - a.sc : 0));   // keep each group together, best match first
    shown = list.slice(0, 9).map(x => x.it); sel = Math.min(sel, Math.max(shown.length - 1, 0));
    let h = "", g = "";
    shown.forEach((it, i) => { if (it.g !== g){ g = it.g; h += `<div class="pg">${esc(it.g)}</div>`; } h += `<div class="pit${i === sel ? " on" : ""}" data-i="${i}"><i>${esc(it.k)}</i><span>${esc(it.t)}</span>${it.s ? `<small>${esc(it.s)}</small>` : ""}</div>`; });
    $("palList").innerHTML = h || `<div class="pg">No match</div>`;
  }
  const open = () => { el.hidden = false; $("palIn").value = ""; sel = 0; draw(); $("palIn").focus(); };
  const close = () => { el.hidden = true; };
  const go = (i) => { const it = shown[i]; close(); if (it) setTimeout(it.run, 30); };
  btn.onclick = open;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); el.hidden ? open() : close(); return; }
    if (el.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown"){ e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); draw(); }
    else if (e.key === "ArrowUp"){ e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
    else if (e.key === "Enter"){ e.preventDefault(); go(sel); }
  });
  $("palIn").oninput = () => { sel = 0; draw(); };
  el.onclick = (e) => { const it = e.target.closest(".pit"); if (it) go(+it.dataset.i); else if (e.target === el) close(); };
})();
