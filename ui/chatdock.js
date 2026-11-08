// Chat dock: the chats live in the bottom-right corner like a messenger (collapsed bar, list, up to three chat windows).
// Raka (Profile) and Laras (Interview) are also shown inside their own pages; that is the SAME chat (one state in nova.js),
// just displayed in another place. Full screen turns the corner chat into the WhatsApp-style view (nova.js, state.view "nova");
// "back" returns to the corner. Everything that sends, saves or measures stays in nova.js.
const DOCK_KEY = "vantage.chat.dock";
const dock = {open:false, wins:[], min:{}, q:0};
try { Object.assign(dock, JSON.parse(localStorage.getItem(DOCK_KEY) || "{}")); } catch {}
const dockSave = () => { try { localStorage.setItem(DOCK_KEY, JSON.stringify({open:dock.open, wins:dock.wins, min:dock.min})); } catch {} };
const dockMax = () => innerWidth < 1100 ? 1 : innerWidth < 1500 ? 2 : 3;
const WALLS = ["none", "warm", "sky", "sage", "dots", "night"];
const dockUnread = () => novaAll().filter(c => novaSt(c.id).unread).length;
// True when this chat is open on screen right now (so an arriving answer is not "unread").
const dockSeen = (id) => !!document.querySelector(`.nwin[data-nwin="${id}"]:not(.min)`);

function dockReady(){ return !!(nova.cli && nova.cli.installed && nova.cli.logged_in); }

function dockWinHtml(id, mode){
  const c = novaChat(id), s = novaSt(id), emb = mode === "embed", mn = !emb && dock.min[id];
  const ctl = `<button class="nw-ic" data-nw="menu" data-id="${id}" title="More" aria-label="More">${NI.more}</button>` +
    `<button class="nw-ic" data-nw="full" data-id="${id}" title="Full screen" aria-label="Full screen">${NI.full}</button>` +
    (emb ? "" : `<button class="nw-ic" data-nw="min" data-id="${id}" title="Minimise" aria-label="Minimise">${NI.dash}</button><button class="nw-ic" data-nw="close" data-id="${id}" title="Close" aria-label="Close">${NI.close}</button>`);
  const body = !dockReady() ? `<div class="nw-setup">${novaSetup()}</div>` :
    `<div class="nw-log wp-${esc(nova.ui.wall[id] || "none")}" data-id="${id}"><div class="wa-col" data-notr>${novaLogHtml(c)}</div></div>` +
    `<div class="nw-in"><textarea class="nw-ta" data-id="${id}" rows="1" placeholder="Message…">${esc(s.draft || "")}</textarea>` +
    (s.run ? `<button class="wa-send stop" data-nw="stop" data-id="${id}" title="Stop" aria-label="Stop"><svg viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg></button>`
           : `<button class="wa-send" data-nw="send" data-id="${id}" title="Send" aria-label="Send"><svg viewBox="0 0 16 16"><path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5"/></svg></button>`) + `</div>`;
  return `<div class="nwin ${mode}${mn ? " min" : ""}" data-nwin="${id}"><div class="nw-bar"${emb ? "" : ` data-nw="min" data-id="${id}"`}>${novaAvatar(c)}` +
    `<div class="nw-t"><b>${esc(novaName(c))}</b><small class="nw-status">${novaStatus(c)}</small></div><span class="nw-sp"></span>${ctl}</div>${body}</div>`;
}

function dockListPanel(){
  const n = dockUnread(), badge = `<span class="nbadge"${n ? "" : " hidden"}>${n}</span>`;
  const bar = `<div class="nw-bar" data-nw="toggle">` + (dock.open ? `<b class="nw-title">Chat</b>${badge}<span class="nw-sp"></span>` +
      `<button class="nw-ic" data-nw="new" title="New chat" aria-label="New chat">${NI.edit}</button><button class="nw-ic" data-nw="full" data-id="${nova.chat}" title="Full screen" aria-label="Full screen">${NI.full}</button><button class="nw-ic" data-nw="toggle" title="Collapse" aria-label="Collapse">${NI.down}</button>`
    : `<span class="nw-stack">${novaOrdered().slice(0, 3).map(c => `<span class="wa-av" style="background:${novaColor(c)}">${esc(c.av)}</span>`).join("")}</span><b class="nw-title">Chat</b>${badge}<span class="nw-sp"></span><span class="nw-ic">${NI.up}</span>`) + `</div>`;
  return `<div class="npanel nlist${dock.open ? "" : " shut"}">${bar}` + (dock.open ? `<div class="nl-items" id="novaList">${novaListHtml()}</div>` : "") + `</div>`;
}

// Keep what the user is doing across a repaint: scroll position of every log and the focused input.
function dockKeep(){
  const keep = {scroll:{}, focus:null};
  document.querySelectorAll(".nwin").forEach(w => {
    const l = w.querySelector(".nw-log"); if (!l) return;
    keep.scroll[w.dataset.nwin + (w.classList.contains("embed") ? ":e" : ":d")] = l.scrollHeight - l.scrollTop - l.clientHeight < 60 ? null : l.scrollTop;
  });
  const a = document.activeElement;
  if (a && a.classList && a.classList.contains("nw-ta")){
    const w = a.closest(".nwin");
    keep.focus = {id:a.dataset.id, emb:w && w.classList.contains("embed"), s:a.selectionStart, e:a.selectionEnd};
  }
  return keep;
}
function dockRestore(keep, wantFocus){
  document.querySelectorAll(".nwin").forEach(w => {
    const l = w.querySelector(".nw-log"); if (!l) return;
    const k = keep.scroll[w.dataset.nwin + (w.classList.contains("embed") ? ":e" : ":d")];
    l.scrollTop = k == null ? l.scrollHeight : k;
  });
  const f = keep.focus;
  if (f){
    const w = document.querySelector(`.nwin${f.emb ? ".embed" : ":not(.embed)"}[data-nwin="${f.id}"] .nw-ta`);
    if (w){ w.focus(); try { w.setSelectionRange(f.s, f.e); } catch {} }
  } else if (wantFocus){
    const w = document.querySelector(`.nwin:not(.min)[data-nwin="${wantFocus}"] .nw-ta`);
    if (w) w.focus();
  }
  document.querySelectorAll(".nw-ta").forEach(t => { t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 120) + "px"; });
}

async function dockRefresh(id, focusId){
  await novaLoad();
  cancelAnimationFrame(dock.q);
  dock.q = requestAnimationFrame(() => dockRender(focusId));
}
function dockRender(focusId){
  const el = $("dock");
  if (!el) return;
  const show = !!folder && state.view !== "nova" && state.data && state.data.ok;
  const embeds = [...document.querySelectorAll(".nembed[data-embed]")];
  if (!show && !embeds.length){ el.hidden = true; el.innerHTML = ""; return; }
  const keep = dockKeep();
  // Chats must be loaded before they are drawn.
  if (novaAll().some(c => !novaSt(c.id).msgs)){ novaLoad().then(() => dockRender(focusId)); return; }
  if (!nova.cli && !nova.checking) novaCheck();
  if (show){
    const wins = dock.wins.filter(id => novaAll().some(c => c.id === id)).slice(-dockMax());
    wins.forEach(id => { if (!dock.min[id]) novaSt(id).unread = false; });
    el.hidden = false;
    el.innerHTML = wins.map(id => dockWinHtml(id, "float")).join("") + dockListPanel();
  } else { el.hidden = true; el.innerHTML = ""; }
  embeds.forEach(e => { e.innerHTML = dockWinHtml(e.dataset.embed, "embed"); novaSt(e.dataset.embed).unread = false; });
  dockBadge();
  dockRestore(keep, focusId);
}
// Called by app.js after every page render: fills the chats that are part of a page (Laras in Interview, Raka in Profile).
function novaEmbeds(){ dockRefresh(); }

function dockBadge(){
  const n = dockUnread();
  document.querySelectorAll(".nbadge").forEach(b => { b.textContent = n; b.hidden = !n; });
}
// While a reply streams: only the live bubble, the status line and the list preview are repainted.
function dockPaint(id){
  cancelAnimationFrame(dockPaint.q);
  dockPaint.q = requestAnimationFrame(() => {
    const c = novaChat(id);
    document.querySelectorAll(`.nwin[data-nwin="${id}"]`).forEach(w => {
      const box = w.querySelector(".nw-log"), live = w.querySelector(".nlive");
      if (w.querySelector(".nw-status")) w.querySelector(".nw-status").innerHTML = novaStatus(c);
      if (!box || !live) return;
      const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
      live.outerHTML = novaLive(c);
      if (atEnd) box.scrollTop = box.scrollHeight;
    });
    const l = $("novaList"); if (l && state.view !== "nova") l.innerHTML = novaListHtml();
  });
}

function dockOpen(id, text){
  if (text !== undefined) novaSt(id).draft = text;
  if (state.view === "nova"){ nova.chat = id; return novaRender(); }
  // A chat that is already shown inside this page (Laras in Interview, Raka in Profile) is not opened a second time in the corner.
  if (document.querySelector(`.nembed[data-embed="${id}"]`)){ novaSt(id).unread = false; return dockRefresh(id, id); }
  dock.min[id] = false;
  dock.wins = dock.wins.filter(x => x !== id).concat(id);
  while (dock.wins.length > dockMax()) dock.wins.shift();
  novaSt(id).unread = false; dockSave();
  dockRefresh(id, id);
}
function dockFull(id){
  if (state.view !== "nova") nova.back = state.view;
  nova.chat = id || nova.chat; novaSt(nova.chat).unread = false;
  goView("nova");
}
function dockBack(){
  const id = nova.chat, v = nova.back && nova.back !== "nova" ? nova.back : "dash";
  goView(v);
  dock.open = true; dockOpen(id);
}

// ---- own chats, rename, wallpaper, export and import ----
async function dockNew(){
  const name = await dialog({title:"New chat", text:"A chat of your own with Nova, for one topic, for example an application or an interview.", input:"Name", ok:"Create"});
  if (!name) return;
  const id = "c-" + Date.now().toString(36).slice(-8);
  nova.ui.custom.push({id, name:name.slice(0, 40)}); novaUiSave();
  dockOpen(id);
}
async function dockRename(id){
  const c = novaChat(id);
  const name = await dialog({title:"Rename chat", input:"Name", value:novaName(c), ok:"Save"});
  if (name === null) return;
  nova.ui.names[id] = name.slice(0, 40);
  const x = (nova.ui.custom || []).find(y => y.id === id); if (x) x.name = nova.ui.names[id];
  novaUiSave(); novaRefresh(id);
}
async function dockRemove(id){
  const c = novaChat(id);
  if (!await dialog({title:"Remove this chat?", text:novaName(c) + ": " + trText("it disappears from the list. Its messages stay in your Vantage folder."), ok:"Remove", danger:true})) return;
  nova.ui.custom = (nova.ui.custom || []).filter(x => x.id !== id); delete nova.ui.names[id]; delete nova.ui.wall[id];
  dock.wins = dock.wins.filter(x => x !== id); novaUiSave(); dockSave();
  if (nova.chat === id) nova.chat = "nova";
  novaRefresh();
}
function dockWall(id, v){ nova.ui.wall[id] = v; novaUiSave(); document.querySelectorAll(`.nw-log[data-id="${id}"]`).forEach(l => { l.className = "nw-log wp-" + v; }); const f = $("novaLog"); if (f && nova.chat === id) f.className = "wa-log wp-" + v; }
async function dockExport(id){
  const c = novaChat(id);
  let msgs = []; try { msgs = await invoke("nova_chat_load", {root:folder, chat:id, limit:100000}); } catch (e){ return toast(String(e)); }
  const text = JSON.stringify({app:"vantage-chat", version:1, chat:id, name:novaName(c), exported:new Date().toISOString(), messages:msgs}, null, 2);
  const file = "Vantage_chat_" + novaName(c).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") + ".json";
  if (T && T.dialog){
    const path = await T.dialog.save({defaultPath:file, filters:[{name:"Chat", extensions:["json"]}]});
    if (!path) return;
    try { await invoke("save_text", {path, text}); toast(trText("Chat exported.")); } catch (e){ toast(String(e)); }
  } else {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type:"application/json"})); a.download = file; a.click();
  }
}
function dockImport(id){
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
  inp.onchange = async () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    let data; try { data = JSON.parse(await f.text()); } catch { return toast(trText("This file is not a Vantage chat.")); }
    const ok = (m) => m && typeof m === "object" && ["user", "nova", "app"].includes(m.role) && typeof m.at === "number" && (typeof m.text === "string" || typeof m.error === "string");
    const msgs = data && data.app === "vantage-chat" && Array.isArray(data.messages) ? data.messages.filter(ok) : [];
    if (!msgs.length) return toast(trText("This file is not a Vantage chat."));
    if (!await dialog({title:"Import chat", text:trText("Add") + " " + msgs.length + " " + trText("messages to this chat?"), ok:"Import"})) return;
    const have = new Set((novaSt(id).msgs || []).map(m => m.at + "|" + m.role));
    for (const m of msgs) if (!have.has(m.at + "|" + m.role)) await invoke("nova_chat_append", {root:folder, chat:id, day:novaDay(m.at), msg:m}).catch(() => {});
    novaSt(id).msgs = null; await novaLoad(); novaRefresh(id); toast(trText("Chat imported."));
  };
  inp.click();
}
function dockMenu(btn, id){
  closeDockMenu();
  const c = novaChat(id), r = btn.getBoundingClientRect();
  const m = document.createElement("div"); m.id = "nmenu"; m.className = "nmenu";
  m.innerHTML = `<button data-nm="rename">Rename chat</button>` +
    `<div class="nm-wall"><span>Wallpaper</span><div>${WALLS.map(w => `<button class="wsw wp-${w}${(nova.ui.wall[id] || "none") === w ? " on" : ""}" data-nm="wall" data-v="${w}" title="${w}" aria-label="${w}"></button>`).join("")}</div></div>` +
    `<label class="nm-detail"><span>Reply detail</span><select data-nm="detail">${[["short", "Short"], ["standard", "Standard"], ["full", "Full"]].map(([v, l]) => `<option value="${v}"${(nova.ui.detail || "standard") === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>` +
    `<button data-nm="export">Export chat</button><button data-nm="import">Import chat</button>` + (c.custom ? `<hr><button data-nm="remove">Remove chat</button>` : "");
  document.body.appendChild(m);
  const w = 210, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
  m.style.top = (r.top > h + 16 ? r.top - h - 6 : r.bottom + 6) + "px";
  m.onchange = (e) => { const b = e.target.closest("select[data-nm=detail]"); if (b){ nova.ui.detail = b.value; novaUiSave(); } };
  m.onclick = (e) => {
    const b = e.target.closest("[data-nm]"); if (!b) return;
    const k = b.dataset.nm;
    if (k === "detail") return;
    if (k === "wall"){ dockWall(id, b.dataset.v); m.querySelectorAll(".wsw").forEach(x => x.classList.toggle("on", x === b)); return; }
    closeDockMenu();
    if (k === "rename") dockRename(id); else if (k === "export") dockExport(id); else if (k === "import") dockImport(id); else if (k === "remove") dockRemove(id);
  };
}
const closeDockMenu = () => { const m = $("nmenu"); if (m) m.remove(); };

// ---- events (one set for the dock, the embedded chats and the full-screen view) ----
document.addEventListener("click", (e) => {
  const nm = e.target.closest("#nmenu");
  if (!nm && !e.target.closest('[data-nw="menu"]')) closeDockMenu();
  const it = e.target.closest("#dock [data-novachat]");
  if (it){ dockOpen(it.dataset.novachat); return; }
  const lg = e.target.closest(".nw-log");
  if (lg && (e.target.closest("[data-novalink]") || e.target.closest("[data-novafile]") || e.target.closest("[data-novamove]") || e.target.closest("[data-novatidy]") || e.target.closest("[data-perm]"))) return novaLogClick(e, lg.dataset.id);
  const b = e.target.closest("[data-nw]"); if (!b) return;
  const k = b.dataset.nw, id = b.dataset.id || (b.closest(".nwin") || {dataset:{}}).dataset.nwin;
  e.stopPropagation();
  if (k === "menu") return dockMenu(b, id || nova.chat);
  if (k === "toggle"){ dock.open = !dock.open; dockSave(); return dockRender(); }
  if (k === "min"){ dock.min[id] = !dock.min[id]; dockSave(); return dockRender(dock.min[id] ? undefined : id); }
  if (k === "close"){ dock.wins = dock.wins.filter(x => x !== id); dockSave(); return dockRender(); }
  if (k === "full") return dockFull(id);
  if (k === "back") return dockBack();
  if (k === "new") return dockNew();
  if (k === "install") return novaInstall();
  if (k === "login") return novaLogin();
  if (k === "recheck"){ nova.cli = null; return novaRefresh(); }
  if (k === "stop") return invoke("nova_stop", {thread:id}).catch(err => toast(String(err)));
  if (k === "send"){ const ta = b.closest(".nwin").querySelector(".nw-ta"); return novaSend(undefined, {chat:id, ta}); }
}, true);
document.addEventListener("keydown", (e) => {
  const ta = e.target.closest && e.target.closest(".nw-ta"); if (!ta) return;
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); if (!novaSt(ta.dataset.id).run) novaSend(undefined, {chat:ta.dataset.id, ta}); }
});
document.addEventListener("input", (e) => {
  const ta = e.target.closest && e.target.closest(".nw-ta"); if (!ta) return;
  novaSt(ta.dataset.id).draft = ta.value;
  ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
});
addEventListener("resize", () => { clearTimeout(dock.rt); dock.rt = setTimeout(() => dockRender(), 150); });
