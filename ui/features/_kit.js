// Helpers shared by the feature files (loaded before them).
(function(){
  const VK = window.VK = {};
  VK.css = (id, text) => {
    if (document.getElementById("css_" + id)) return;
    const s = document.createElement("style"); s.id = "css_" + id; s.textContent = text; document.head.appendChild(s);
  };
  VK.day = (off = 0) => { const d = new Date(); d.setDate(d.getDate() + off); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  VK.apps = () => (state.data && state.data.apps) || [];
  VK.app = (id) => VK.apps().find(a => String(a.id) === String(id));
  VK.ready = () => !!(state.data && state.data.ok && Object.keys(prefs).length);
  // One object of app_prefs.json under `key`: all(), get(k, default), set(k, value).
  VK.store = (key) => ({ all: () => prefs[key] || {}, get: (k, def) => ((prefs[key] || {})[k] === undefined ? def : prefs[key][k]), set: (k, v) => savePref(key, Object.assign({}, prefs[key] || {}, {[k]: v})) });
  VK.copy = async (text) => { toast(await copyText(text) ? ft("Copied", "Kopiert", "Tersalin") : ft("Press Ctrl+C to copy", "Strg+C zum Kopieren", "Tekan Ctrl+C untuk menyalin")); };

  // A Dashboard card: lower prio = further up, span "full" = whole row. f21_layout.js orders them and lets the user hide any.
  VK.widget = (id, prio, html, span) => {
    if (document.getElementById("dw_" + id)) return null;
    const el = document.createElement("section"); el.className = "dw"; el.id = "dw_" + id; el.dataset.w = id; el.dataset.prio = prio; if (span) el.dataset.span = span;
    el.innerHTML = html; $("view").appendChild(el); return el;
  };
  // The button group in the Applications header (before the hint line).
  VK.boardActions = () => {
    const head = document.querySelector(".head.hhint"); if (!head) return null;
    let box = $("vkAct"); if (!box){ box = document.createElement("span"); box.id = "vkAct"; head.insertBefore(box, head.querySelector(".boardhint")); }
    return box;
  };
  // A block in an application's details: fn(app, infoElement) runs after the drawer is drawn.
  const drawerHooks = []; VK.onDrawer = (fn) => drawerHooks.push(fn);
  const open = window.openApp;
  window.openApp = async function(id){
    const r = open.apply(this, arguments), a = VK.app(id);
    if (a) setTimeout(() => { const info = document.querySelector("#drawer .dr-info"); if (info && state.open === a) drawerHooks.forEach(f => f(a, info)); }, 0);
    return r;
  };
  VK.css("base", `.dw{border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:14px 16px;min-width:0}.dw[data-span="full"]{grid-column:1/-1}
  .dw h3{font:500 14px var(--ui);margin:0 0 8px;display:flex;align-items:baseline;gap:10px}.dw h3 small{font:12px var(--ui);color:var(--muted)}.dw h3 .grow{flex:1}
  .vkf{display:grid;gap:3px;font-size:11px;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
  .vkf input,.vkf textarea,.vkf select{border:1px solid var(--fieldLine);border-radius:6px;background:var(--field);color:var(--ink);padding:6px 9px;font:13px var(--ui);text-transform:none;letter-spacing:0;width:100%}
  .vkb{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.vkb .cap{display:block;margin-bottom:8px}
  .head.hhint{flex-wrap:wrap;row-gap:8px;justify-content:flex-start;column-gap:8px}.head.hhint .segs{margin-right:auto}
  .head.hhint .boardhint{flex-basis:100%;margin:0;white-space:normal;overflow:visible;text-overflow:clip}#vkAct{display:flex;gap:8px}`);
})();
