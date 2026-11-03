// Nova tab (prototype): four chats like a messenger, through the user's own Claude Code (nova.rs).
//  - Nova: manager / assistant, the place to ask when unsure.
//  - Raka: profile and experience (runs as the raka agent).
//  - Lamaran: group with Sinta, Arga, Bayu and Tari; Nova coordinates, each member's step shows as their own bubble.
//  - Laras: interview practice (runs as the laras agent).
// Small talk gets a short Haiku answer (nova_quick); real work runs on Sonnet. Each chat is saved day by day in the
// user's folder; a fresh Claude Code session starts each day or after NOVA_MAX_TURNS and gets the end of the chat.
const NOVA_MAX_TURNS = 30;
// After an hour without messages Claude's cache of the conversation has expired, and resuming would pay to load the
// whole history again; a fresh session with a short recap is cheaper.
const NOVA_IDLE_MS = 60 * 60 * 1000;
const NOVA_MOVE = "If the user asks for something that belongs in another chat, do not do it here: say so in one short sentence and end " +
  "your reply with exactly one line [[pindah:nova]], [[pindah:raka]], [[pindah:lamaran]] or [[pindah:laras]] naming that chat.";
// Every reply is chat-sized: two or three sentences, up to six only when it really matters. Files are named, not repeated.
const NOVA_SHORT = "Keep every reply short, like a chat message: two or three sentences; only when it is really important up to six. " +
  "No long lists or reports in the chat: name the file instead of repeating it, and offer details only if the user asks.";
const NOVA_CHATS = [
  // effort: how hard the model thinks (low only where it is conversation, never for analysis or documents).
  // budget: emergency brake per reply in USD; the group runs whole applications (fit check, CV, QC) in one reply.
  {id:"nova", name:"Nova", role:"Your manager · ask me anything", av:"N", agent:"", persona:"Nova", effort:"low", budget:1,
   rules:"This is the chat with Nova, the user's manager and virtual assistant: the place to ask when the user is unsure. Answer questions, " +
     "explain what to do next, handle the first-run setup and anything general. Raka does profile work, the Lamaran group does job search and " +
     "applications, Laras does interview practice. " + NOVA_MOVE},
  {id:"raka", name:"Raka", role:"Your profile & experience", av:"R", agent:"raka", persona:"Raka",
   rules:"In this chat the user talks to you, Raka, directly (not through Nova). Talk to them in their language and their chosen form of address " +
     "(see identity.json and status.md). You do profile work only: the experience interview, sorting new material from the Inbox, raw facts, " +
     "about items. " + NOVA_MOVE},
  {id:"lamaran", name:"Applications", role:"Sinta · Arga · Bayu · Tari", av:"", group:true, agent:"", persona:"Nova", budget:4,
   rules:"This is the Lamaran group chat. Members: Sinta (finds jobs, morning report), Arga (checks the fit), Bayu (writes the CV and cover letter), " +
     "Tari (checks the documents); you, Nova, coordinate and do the work through them as the SOPs say. Write your reply as a real group chat: " +
     "short messages, each on its own line starting with the speaker's name and a colon (\"Arga: …\"). Only the members who have something to " +
     "say speak, in any order, and they may react to each other or to the user. It must read like friends in a WhatsApp group, never like a " +
     "form: casual everyday language in the user's language and form of address, no \"Siap.\" templates, no two members opening the same way, " +
     "at most one emoji now and then. Voices: Sinta is quick and excited about new finds; Arga is calm and precise and talks in numbers; Bayu is " +
     "relaxed and a bit funny about writing; Tari is strict but kind and keeps it very short; Nova is the warm manager who sums up or asks the " +
     "user what next. Small talk and greetings may come from any member. Results never: a member may only report work (a score, a job list, a " +
     "document, a check) when you actually called that member for it in this reply. Do not read the SOPs or the profile yourself before handing work to a member: they read what " +
     "they need, and reading it twice doubles the cost. Name the PDF files instead of repeating their content. " + NOVA_MOVE},
  {id:"laras", name:"Laras", role:"Interview practice", av:"L", agent:"laras", persona:"Laras",
   rules:"In this chat the user talks to you, Laras, directly (not through Nova). Talk to them in their language and their chosen form of address " +
     "(see identity.json and status.md). You prepare and run interview practice for a specific company and do the debrief afterwards; during " +
     "practice you play the interviewer. " + NOVA_MOVE},
];
// "Tidy up" in the Inbox: Raka decides, the app moves (nova_inbox_apply), so Claude never moves files itself.
const NOVA_TIDY = "The user pressed \"Tidy up\" on the Inbox page. Sort everything in their Inbox folder (\"--- I N B O X ---\") following " +
  "sop/penamaan_file.md, but do NOT move, copy, rename or delete any file yourself: the app does that right after your reply. Write the plan as " +
  "JSON to 01_user_documents/--usersettings/inbox_plan.json in the user's folder: {\"items\":[{\"from\":\"<path inside the Inbox>\",\"to\":" +
  "\"01_user_documents/materials/<new path>\",\"action\":\"move\"}]}, with action \"trash\" only for clear junk and duplicates; when unsure, " +
  "move it to materials instead. Add the moved files to materials/00_index.md with their NEW paths. Keep this cheap: the Inbox listing is below, " +
  "so do not list folders; read only sop/penamaan_file.md and materials/00_index.md; open a file only when its name does not tell what it is; " +
  "do not read raw_facts, other SOPs or status.md, do not write to status.md (the app reports the result), and do not unpack the material yet. The app acts right after your reply and trashed files " +
  "can be restored from the Trash, so do not ask the user to object first. End with two or three short sentences on what went where and offer " +
  "to unpack the new material next.";

// Muted tones that sit with the app's warm grey and orange; Nova keeps the accent colour.
const NOVA_MEMBERS = {Sinta:"#5F8A6E", Arga:"#5B7C99", Bayu:"#B58A4E", Tari:"#8B6F9E", Nova:"#E4511F", Raka:"#7A8450", Laras:"#A9566F"};
// Small line icons for the chat controls.
const NI = {
  more:'<svg viewBox="0 0 16 16"><circle cx="3.5" cy="8" r="1.1"/><circle cx="8" cy="8" r="1.1"/><circle cx="12.5" cy="8" r="1.1"/></svg>',
  full:'<svg viewBox="0 0 16 16"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9"/></svg>',
  min:'<svg viewBox="0 0 16 16"><path d="M13 9.5H9.5V13M3 6.5h3.5V3M9.5 9.5 14 14M6.5 6.5 2 2"/></svg>',
  dash:'<svg viewBox="0 0 16 16"><path d="M3.5 8h9"/></svg>',
  close:'<svg viewBox="0 0 16 16"><path d="m4 4 8 8M12 4l-8 8"/></svg>',
  edit:'<svg viewBox="0 0 16 16"><path d="M9.5 3.5 12.5 6.5M3 13l.7-3 7.8-7.8 2.3 2.3L6 12.3z"/></svg>',
  up:'<svg viewBox="0 0 16 16"><path d="m4 10 4-4 4 4"/></svg>',
  down:'<svg viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>',
};
const nova = {cli:null, checking:false, login:null, chat:"nova", folder:"", chats:{}, paintQ:0, back:"dash", uiLoaded:"", ui:{names:{}, wall:{}, custom:[]}};
// The fixed chats plus the user's own chats with Nova ("MHP prep"); own chats can be renamed and removed, the fixed ones only renamed.
const novaAll = () => NOVA_CHATS.concat((nova.ui.custom || []).map(x => Object.assign({}, NOVA_CHATS[0], {id:x.id, name:x.name, custom:true, av:(x.name || "?")[0].toUpperCase(), role:"Your own chat with Nova"})));
const novaChat = (id) => novaAll().find(c => c.id === id) || NOVA_CHATS[0];
const novaName = (c) => (nova.ui.names && nova.ui.names[c.id]) || (c.custom ? c.name : trText(c.name));
const novaColor = (c) => NOVA_MEMBERS[c.name] || "#8A8F99";
async function novaUiLoad(){
  if (nova.uiLoaded === folder) return;
  nova.uiLoaded = folder;
  try { const p = await invoke("prefs_get", {root:folder}); const u = (p && p.nova_ui) || {}; nova.ui = {names:u.names || {}, wall:u.wall || {}, custom:u.custom || []}; } catch { nova.ui = {names:{}, wall:{}, custom:[]}; }
}
function novaUiSave(){ invoke("prefs_set", {root:folder, key:"nova_ui", value:nova.ui}).catch(() => {}); }
// Repaint wherever the chat is shown: the full-screen view, or the dock windows and the embedded chats on the pages.
function novaRefresh(id){ if (state.view === "nova") novaRender(); else if (typeof dockRefresh === "function") dockRefresh(id); }
const novaSt = (id) => nova.chats[id] || (nova.chats[id] = {msgs:null, run:null, unread:false});

const novaDay = (t) => { const d = new Date(t || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function novaLoad(){
  if (nova.folder !== folder){ nova.folder = folder; nova.chats = {}; }
  await novaUiLoad();
  await Promise.all(novaAll().map(async c => {
    const s = novaSt(c.id);
    if (s.msgs) return;
    try { s.msgs = await invoke("nova_chat_load", {root:folder, chat:c.id, limit:300}); s.msgs.sort((a, b) => a.at - b.at); } catch { s.msgs = []; }
  }));
}
function novaKeep(chat, m){ invoke("nova_chat_append", {root:folder, chat, day:novaDay(m.at), msg:m}).catch(e => toast(String(e))); }

async function novaSessions(){
  try { const p = await invoke("prefs_get", {root:folder}); return (p && p.nova_sessions) || {}; } catch { return {}; }
}
async function novaSetSession(chat, v){
  const all = await novaSessions(); all[chat] = v;
  try { await invoke("prefs_set", {root:folder, key:"nova_sessions", value:all}); } catch {}
}

// Small, safe Markdown: escape first, then bold, code, headings, bullets, https links and PDF files (open on click).
function novaMd(s, plain){
  let h = esc(s);
  h = h.replace(/```[^\n]*\n?([\s\S]*?)```/g, (_, c) => `<pre>${c}</pre>`);
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  h = h.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  h = h.replace(/^#{1,4} (.+)$/gm, "<b>$1</b>");
  h = h.replace(/^(\s*)[-*] (.+)$/gm, "$1• $2");
  h = h.replace(/\[([^\]\n]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2" data-novalink="$2">$1</a>');
  if (!plain) h = h.replace(/(^|[\s(>])([^\s<>()`"]+\.pdf)\b/gi, (m, pre, p) => `${pre}<a href="#" data-novafile="${p}">${p.split("/").pop()}</a>`);
  return h.replace(/\n/g, "<br>");
}

// What is happening, in plain words: the member doing it (by name) and the task.
const NOVA_WHO = {raka:"Raka", sinta:"Sinta", arga:"Arga", bayu:"Bayu", tari:"Tari", laras:"Laras"};
const NOVA_TASK = {raka:"updating your profile…", sinta:"searching for jobs…", arga:"checking how well the job fits…",
  bayu:"writing your CV and cover letter…", tari:"double-checking the documents…", laras:"preparing interview practice…"};
function novaTask(name, input){
  if (name === "Task" || name === "Agent"){ const a = String((input || {}).subagent_type || "").toLowerCase(); return {who:NOVA_WHO[a] || "", task:NOVA_TASK[a] || "working…"}; }
  return {who:"", task:({Read:"reading your files…", Write:"saving notes…", Edit:"saving notes…", Glob:"looking through your folder…", Grep:"looking through your folder…",
    WebSearch:"searching the internet…", WebFetch:"opening a web page…", Bash:"running a Vantage tool…", TodoWrite:"planning the steps…"})[name] || "working…"};
}

// Tokens and estimated cost of one Claude Code result (with a Pro/Max plan this is plan usage, not a bill).
function novaUse(ev){
  const u = ev.usage || {}, mu = ev.modelUsage || {};
  // modelUsage covers every model in the reply (the members' work included); usage only the main conversation.
  const per = Object.values(mu), tokens = per.length
    ? per.reduce((n, x) => n + (x.inputTokens || 0) + (x.outputTokens || 0) + (x.cacheReadInputTokens || 0) + (x.cacheCreationInputTokens || 0), 0)
    : (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  // Cached tokens: the conversation re-read on every step of a reply, at about a tenth of the price.
  const cached = per.length ? per.reduce((n, x) => n + (x.cacheReadInputTokens || 0), 0) : (u.cache_read_input_tokens || 0);
  const top = Object.entries(mu).sort((a, b) => (b[1].costUSD || 0) - (a[1].costUSD || 0))[0];
  return {tokens, cached, cost:ev.total_cost_usd || 0, model:top ? top[0] : ""};
}
const novaAdd = (a, b) => ({tokens:(a ? a.tokens : 0) + b.tokens, cached:(a ? a.cached || 0 : 0) + (b.cached || 0), cost:(a ? a.cost : 0) + b.cost, model:(a && a.model) || b.model, check:a && a.check});
const novaModel = (id) => /haiku/i.test(id) ? "Haiku" : /opus/i.test(id) ? "Opus" : /sonnet/i.test(id) ? "Sonnet" : id || "?";
const novaTok = (n) => n < 1000 ? String(n) : (n / 1000).toFixed(n < 10000 ? 1 : 0) + "k";
const novaUsd = (c) => "≈$" + (c < 0.01 ? c.toFixed(4) : c.toFixed(2));
// Under a reply: "⚡ Haiku · 1.2k tokens · ≈$0.0010", plus who actually worked on it.
// With a Pro/Max plan the dollar figure is only Claude Code's API-price estimate; what the user actually spends is a
// share of the 5-hour and weekly limits, so that is what the label shows (the dollar estimate stays in the tooltip).
const novaPlan = () => !!(nova.cli && nova.cli.method === "claude.ai");
const novaPct = (x) => x == null ? "" : x < 0.005 ? "<1%" : Math.round(x * 100) + "%";
function novaMeta(m){
  if (!m.use) return "";
  const who = (m.used || []).map(a => NOVA_WHO[a] || a).join(", ");
  const tok = novaTok(m.use.tokens) + " tokens" + (m.use.cached ? ` (${novaTok(m.use.cached)} cached)` : "");
  const lim = m.use.lim, share = novaPlan() && lim ? `${novaPct(lim.five)} ${trText("of 5h")} · ${novaPct(lim.week)} ${trText("weekly")}` : novaUsd(m.use.cost);
  return `<div class="wa-meta" title="${esc(novaUsd(m.use.cost) + " (API price estimate)")}">${m.quick ? "⚡ " : ""}${esc(novaModel(m.use.model))} · ${esc(share)} · ${tok}` +
    (m.use.check ? " · incl. Haiku check" : "") + (who ? ` · ${esc(who)}` : "") + `</div>`;
}
// Today's total for one chat, in its header.
function novaToday(c){
  let t = 0, cost = 0, five = 0, n = 0;
  // App notes repeat the cost of the reply they belong to, so they are not counted again.
  for (const m of novaSt(c.id).msgs || []) if (m.use && m.role !== "app" && novaDay(m.at) === novaDay()){
    t += m.use.tokens; cost += m.use.cost;
    if (m.use.lim && m.use.lim.five != null){ five += m.use.lim.five; n++; }
  }
  if (!t) return "";
  return `${trText("Today")}: ` + (novaPlan() && n ? `${novaPct(five)} ${trText("of 5h")}` : novaUsd(cost)) + ` · ${novaTok(t)} tokens`;
}

const novaTime = (t) => new Date(t).toLocaleTimeString(LOC(), {hour:"2-digit", minute:"2-digit"});
function novaDate(t){
  const d = novaDay(t), now = Date.now();
  if (d === novaDay(now)) return "Today";
  if (d === novaDay(now - 864e5)) return "Yesterday";
  return new Date(t).toLocaleDateString(LOC(), {weekday:"long", day:"numeric", month:"long"});
}

// "[[pindah:lamaran]]" at the end of a reply: a button to continue in that chat (with the user's message ready).
function novaMove(text){
  const m = /\[\[pindah:(nova|raka|lamaran|laras)\]\]\s*$/.exec(text || "");
  return m ? {text:text.slice(0, m.index).trim(), to:m[1]} : {text:text || "", to:""};
}
// Group replies: lines starting with "Sinta:", "Arga:" … become bubbles from that member.
function novaSplit(text){
  const parts = [];
  for (const line of String(text).split("\n")){
    const m = /^\s*\**(Sinta|Arga|Bayu|Tari|Nova)\**\s*:\s*\**\s*(.*)$/.exec(line);
    if (m) parts.push({who:m[1], text:m[2]});
    else if (parts.length) parts[parts.length - 1].text += "\n" + line;
    else parts.push({who:"Nova", text:line});
  }
  return parts.map(p => ({who:p.who, text:p.text.trim()})).filter(p => p.text);
}
const novaWho = (who) => who ? `<div class="wa-who" style="color:${NOVA_MEMBERS[who] || "var(--accent)"}">${esc(who)}</div>` : "";

function novaBubble(c, m){
  const tm = `<span class="wa-tm">${esc(novaTime(m.at))}</span>`;
  if (m.role === "app") return `<div class="wa-app"><div>${novaMd(m.text, true)}${novaMeta(m)}</div></div>`;
  if (m.role === "user") return `<div class="wa-b me"><div class="wa-t">${novaMd(m.text)}${tm}</div></div>`;
  const mv = novaMove(m.text), err = m.error ? `<div class="wa-err">${esc(m.error)}</div>` : "";
  const btn = mv.to ? `<button class="wa-move" data-novamove="${mv.to}">${esc(trText("Continue in " + novaChat(mv.to).name))} →</button>` : "";
  const parts = c.group && mv.text ? novaSplit(mv.text) : [{who:"", text:mv.text}];
  return parts.map((p, i) => {
    const last = i === parts.length - 1;
    return `<div class="wa-b nv"><div class="wa-t">${novaWho(p.who)}${novaMd(p.text)}${last ? err + btn + tm + novaMeta(m) : ""}</div></div>`;
  }).join("");
}
function novaLive(c){
  const r = novaSt(c.id).run;
  if (!r) return "";
  if (!r.text) return `<div class="nlive"><div class="wa-b nv"><div class="wa-t wa-dots"><i></i><i></i><i></i></div></div></div>`;
  const t = novaMove(r.text).text, parts = c.group ? novaSplit(t) : [{who:"", text:t}];
  return `<div class="nlive">` + parts.map(p => `<div class="wa-b nv"><div class="wa-t">${novaWho(p.who)}${novaMd(p.text)}</div></div>`).join("") + `</div>`;
}
// Status under the chat name: "online", "typing…" or who is doing what.
function novaStatus(c){
  const r = novaSt(c.id).run;
  if (!r) return `<span>${esc(c.group ? c.role : "online")}</span>`;
  if (r.task) return (r.task.who ? `<b>${esc(r.task.who)}</b> ` : "") + `<span>${esc(r.task.task)}</span>`;
  return `<span>typing…</span>`;
}

function novaSetup(){
  const c = nova.cli;
  if (!c) return `<section class="panel nsetup"><div class="empty"><i class="spin"></i> Checking Claude Code…</div></section>`;
  if (!c.installed) return `<section class="panel nsetup"><div class="empty"><b>Connect Claude</b><br>Nova runs on Claude Code, Anthropic's official app for your Claude account. Vantage installs it for you with Anthropic's own installer. You do this once.<br><br>` +
    `<button class="btn primary" data-nw="install"${nova.checking ? " disabled" : ""}>${nova.checking ? "Installing…" : "Install Claude Code"}</button></div></section>`;
  return `<section class="panel nsetup"><div class="empty"><b>Sign in to Claude</b><br>Sign in with your Claude account (Pro or Max) on Claude's own page. Vantage never sees your password or your account.<br><br>` +
    `<button class="btn primary" data-nw="login">Sign in to Claude</button> <button class="btn" data-nw="recheck">I signed in</button>` +
    (nova.login ? `<div class="wa-note" data-notr>${novaMd(nova.login)}</div>` : "") + `</div></section>`;
}

function novaAvatar(c){
  return c.group ? `<span class="wa-av grp"><svg viewBox="0 0 16 16"><circle cx="6" cy="6" r="2.2"/><circle cx="11" cy="6.5" r="1.8"/><path d="M2 13c.4-2.3 2-3.4 4-3.4s3.6 1.1 4 3.4M10 10c1.8 0 3.3.9 3.8 3"/></svg></span>`
    : `<span class="wa-av" style="background:${novaColor(c)}">${esc(c.av)}</span>`;
}
function novaListHtml(){
  return novaAll().map(c => {
    const s = novaSt(c.id), last = (s.msgs || []).slice(-1)[0];
    const prev = s.run ? `<span class="wa-typ">${esc((s.run.task && s.run.task.who ? s.run.task.who + " " : "") + trText(s.run.task ? s.run.task.task : "typing…"))}</span>`
      : esc(last ? (last.role === "user" ? trText("You") + ": " : "") + novaMove(last.text || last.error || "").text.replace(/[*`#]/g, "").replace(/\s+/g, " ").slice(0, 60) : trText(c.role));
    const when = last ? (novaDay(last.at) === novaDay() ? novaTime(last.at) : trText(novaDate(last.at))) : "";
    return `<button class="wa-item${c.id === nova.chat ? " on" : ""}" data-novachat="${c.id}">${novaAvatar(c)}<span class="wa-it"><span class="wa-r1"><b>${esc(novaName(c))}</b>` +
      `<small>${esc(when)}</small></span><span class="wa-r2"><span class="wa-pv" data-notr>${prev}</span>${s.unread ? '<i class="wa-dot"></i>' : ""}</span></span></button>`;
  }).join("");
}
function novaLogHtml(c){
  const s = novaSt(c.id);
  let last = "", h = "";
  for (const m of s.msgs){
    const d = novaDay(m.at);
    if (d !== last){ h += `<div class="wa-day"><span>${esc(trText(novaDate(m.at)))}</span></div>`; last = d; }
    h += novaBubble(c, m);
  }
  if (s.run && novaDay() !== last) h += `<div class="wa-day"><span>${esc(trText("Today"))}</span></div>`;
  return (h || `<div class="wa-empty">${esc(trText(c.group ? "Paste a job ad or ask for the morning report." : "Say hi to start."))}</div>`) + novaLive(c);
}

async function novaRender(){
  if ($("dock")) $("dock").hidden = true;   // full screen replaces the corner chat
  if (!nova.cli || !nova.cli.installed || !nova.cli.logged_in){
    $("view").innerHTML = `<div class="wa">${novaSetup()}</div>`;
    if (!nova.cli && !nova.checking) novaCheck();
    return novaWire();
  }
  await novaLoad();
  if (state.view !== "nova") return;
  const c = novaChat(nova.chat), s = novaSt(c.id);
  if ($("novaText") && $("novaText").dataset.chat === c.id) s.draft = $("novaText").value;
  s.unread = false; novaBadge();
  $("view").innerHTML = `<div class="wa2"><aside class="wa-side"><div class="wa-list" id="novaList">${novaListHtml()}</div><button class="wa-new" data-nw="new">+ New chat</button><div class="wa-quota" id="novaQuota">${novaQuotaHtml()}</div></aside><div class="wa">
    <div class="wa-head">${novaAvatar(c)}<div><b>${esc(novaName(c))}</b><small id="novaStatus">${novaStatus(c)}</small></div><span class="wa-cost" data-notr>${esc(novaToday(c))}</span>
      <button class="nw-ic" data-nw="menu" data-id="${c.id}" title="More" aria-label="More">${NI.more}</button><button class="nw-ic" data-nw="back" title="Back to normal view" aria-label="Back to normal view">${NI.min}</button></div>
    <div class="wa-log wp-${esc(nova.ui.wall[c.id] || "none")}" id="novaLog"><div class="wa-col" data-notr>${novaLogHtml(c)}</div></div>
    <div class="wa-in"><textarea id="novaText" data-chat="${c.id}" rows="1" placeholder="Message…"></textarea>` +
    (s.run ? `<button class="wa-send stop" id="novaStop" title="Stop" aria-label="Stop"><svg viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg></button>`
           : `<button class="wa-send" id="novaSend" title="Send" aria-label="Send"><svg viewBox="0 0 16 16"><path d="M2.5 8h10M8.5 3.5 13 8l-4.5 4.5"/></svg></button>`) + `</div></div></div>`;
  $("novaText").value = s.draft || "";
  const box = $("novaLog"); box.scrollTop = box.scrollHeight;
  novaWire();
  $("novaText").focus();
}

// Open another chat; `text` puts a message ready in its input (the user still presses Send).
function novaOpen(id, text){
  if ($("novaText")) novaSt($("novaText").dataset.chat).draft = $("novaText").value;
  nova.chat = id;
  if (text !== undefined) novaSt(id).draft = text;
  novaRender();
}

function novaWire(){
  const on = (id, f) => { if ($(id)) $(id).onclick = f; };
  on("novaSend", () => novaSend());
  on("novaStop", () => invoke("nova_stop", {thread:nova.chat}).catch(e => toast(String(e))));
  document.querySelectorAll("[data-novachat]").forEach(b => b.onclick = () => { if (b.dataset.novachat !== nova.chat) novaOpen(b.dataset.novachat); });
  const ta = $("novaText");
  if (ta){
    ta.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing){ e.preventDefault(); if (!novaSt(nova.chat).run) novaSend(); } };
    ta.oninput = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 160) + "px"; };
  }
  const lg = $("novaLog");
  if (lg) lg.onclick = (e) => novaLogClick(e, nova.chat);
}
function novaLogClick(e, chat){
  {
    const a = e.target.closest("[data-novalink]"), f = e.target.closest("[data-novafile]"), mv = e.target.closest("[data-novamove]");
    if (a){ e.preventDefault(); invoke("open_url", {url:a.dataset.novalink}).catch(() => {}); }
    if (f){
      e.preventDefault();
      // Paths may start at the Vantage package folder ("<user>/02_workflow/…") or at the user's folder.
      const user = folder.split(/[\\/]/).filter(Boolean).pop() || "";
      let rel = f.dataset.novafile.replace(/^\.?\//, "");
      if (rel.startsWith(user + "/")) rel = rel.slice(user.length + 1);
      invoke("open_file", {root:folder, rel}).catch(err => toast(String(err)));
    }
    if (mv){
      // Continue in the other chat with the user's last message ready to send.
      const mine = [...novaSt(chat).msgs].reverse().find(m => m.role === "user"), to = mv.dataset.novamove;
      if (state.view === "nova") novaOpen(to, mine ? mine.text : ""); else dockOpen(to, mine ? mine.text : "");
    }
  }
}

// A dot on the Nova tab when an answer arrived while the user was elsewhere.
function novaBadge(){ if (typeof dockBadge === "function") dockBadge(); }

async function novaCheck(){
  nova.checking = true;
  try { nova.cli = await invoke("nova_status"); } catch (e){ nova.cli = {installed:false}; toast(String(e)); }
  nova.checking = false;
  novaRefresh();
}

async function novaInstall(){
  nova.checking = true; novaRefresh();
  try { await invoke("nova_install"); toast("Claude Code is installed."); }
  catch (e){ dialog({title:"Claude Code could not be installed", text:String(e).slice(-600), ok:"Close"}); }
  nova.checking = false; nova.cli = null; novaRefresh();
}

// Claude Code opens Claude's login page in the browser; this page checks every few seconds until it is done.
let novaLoginPoll = 0;
async function novaLogin(){
  nova.login = null;
  try { await invoke("nova_login"); } catch (e){ return toast(String(e)); }
  toast("Claude's sign-in page opens in your browser.");
  clearInterval(novaLoginPoll);
  const until = Date.now() + 5 * 60 * 1000;
  novaLoginPoll = setInterval(async () => {
    let s = null; try { s = await invoke("nova_status"); } catch {}
    if ((s && s.logged_in) || Date.now() > until){
      clearInterval(novaLoginPoll);
      if (s){ nova.cli = s; novaRefresh(); }
    }
  }, 3000);
}
if (T && T.event) T.event.listen("nova-login", (e) => {
  const url = (String(e.payload || "").match(/https:\/\/\S+/) || [])[0];
  if (url){ nova.login = `If no browser opened: [open Claude's sign-in page](${url})`; novaRefresh(); }
});

const novaLine = (m) => `[${novaDay(m.at)} ${novaTime(m.at)}] ${m.role === "user" ? "User" : m.role === "app" ? "Vantage app" : "You"}: ${novaMove(String(m.text || m.error || "")).text.slice(0, 700)}`;

// The end of the conversation, for a fresh session (first message of the day, or after a long session).
function novaRecap(msgs){
  const recent = msgs.slice(-21, -1);
  if (!recent.length) return "";
  let t = recent.map(novaLine).join("\n");
  if (t.length > 9000) t = t.slice(-9000);
  return "This is a fresh session of the same chat. Before answering, read status.md as usual. The end of the earlier conversation, for continuity:\n" + t;
}

// Small talk is answered by Haiku in one or two sentences; anything else (or any doubt) goes to the working session.
// The first message of a chat, long messages, links and files always go to the working session.
async function novaQuick(c, msgs, text){
  if (msgs.length < 2 || text.length > 200 || /https?:\/\/|\n|\.pdf\b/i.test(text)) return {text:""};
  const system = `You answer small talk in the "${c.name}" chat of the Vantage job-application app, as ${c.persona}. ` +
    "Decide whether the user's new message needs real work: a job ad or link, files or material, a request to search, apply, write, check, " +
    "update, practise or explain something, a question about their profile, documents, applications or next steps, an answer to a question " +
    "you asked them, or anything you would need their files or the internet for. If it needs work, or you are not sure, answer exactly WORK " +
    "and nothing else. Otherwise (acknowledgements, \"wait, I'll send it\", thanks, greetings, small talk) answer as " + c.persona +
    " in the user's language and form of address as seen in the conversation, in at most two short sentences, no lists, no promises of work.";
  const prompt = "Recent conversation:\n" + msgs.slice(-7, -1).map(novaLine).join("\n") + "\n\nNew message from the user:\n" + text;
  try {
    const v = await invoke("nova_quick", {prompt, system}), r = String(v.result || "").trim();
    return {text:!r || /^WORK\b/i.test(r) ? "" : r.slice(0, 300), use:novaUse(v), lim:novaLimits(v.rate_limit_info)};
  } catch { return {text:""}; }
}

// `say` sends a message for the user (a button in the app), `opts.chat` into another chat than the open one
// (works from any page); `tidy` marks the Inbox tidy-up.
async function novaSend(say, opts){
  opts = opts || {};
  const ta = opts.ta || $("novaText"), text = (say !== undefined ? say : ta ? ta.value : "").trim();
  const c = novaChat(opts.chat || nova.chat), st = novaSt(c.id);
  if (!text || st.run || !folder) return;
  await novaLoad();
  const m = {role:"user", text, at:Date.now()};
  st.msgs.push(m); novaKeep(c.id, m);
  if (say === undefined){ st.draft = ""; if (ta) ta.value = ""; }
  st.run = {text:"", task:null, streamed:false, used:[], tidy:!!opts.tidy, limStart:novaLimNow()};
  if (state.view !== "inbox" || !opts.tidy) novaRefresh(c.id); else render();
  const quick = opts.tidy ? {text:""} : await novaQuick(c, st.msgs, text);
  // The Haiku check is counted with the reply it led to.
  if (quick.use) st.run.use = Object.assign(quick.use, {check:!quick.text});
  if (quick.lim){ if (!st.run.limStart) st.run.limStart = quick.lim; st.run.limEnd = quick.lim; }
  if (quick.text){ st.run.text = quick.text; st.run.quick = true; return novaFinish(c.id); }
  const s = (await novaSessions())[c.id] || {};
  const fresh = !s.id || s.day !== novaDay() || (s.turns || 0) >= NOVA_MAX_TURNS || !s.last || Date.now() - s.last > NOVA_IDLE_MS;
  st.run.turns = fresh ? 0 : (s.turns || 0);
  // Claude Code reports cost and tokens as running totals for the whole session, so one reply is the difference.
  st.run.prev = fresh ? null : (s.cum || null);
  const listing = opts.tidy && state.data && state.data.inbox ? "\nInbox listing (name, size):\n" + state.data.inbox.map(it => `- ${it.name}${it.folder ? "/ (folder)" : ""} ${it.kb} KB`).join("\n") : "";
  const context = c.rules + " " + NOVA_SHORT + (opts.tidy ? "\n\n" + NOVA_TIDY + listing : "") + (fresh ? "\n\n" + novaRecap(st.msgs) : "");
  try { await invoke("nova_send", {root:folder, thread:c.id, session:fresh ? "" : s.id, context, text, agent:c.agent, model:"sonnet", preload:fresh,
    effort:opts.tidy ? "low" : (c.effort || ""), budget:c.budget || 1.5}); }   // the Inbox tidy-up is sorting by rules: low effort
  catch (e){ st.run.error = String(e); novaFinish(c.id); }
}

function novaFinish(id){
  const st = novaSt(id), r = st.run; if (!r) return;
  const limUsed = novaLimDiff(r.limStart, r.limEnd);
  if (r.cum){
    const p = r.prev || {tokens:0, cached:0, cost:0};
    const run = {tokens:Math.max(0, r.cum.tokens - p.tokens), cached:Math.max(0, (r.cum.cached || 0) - (p.cached || 0)), cost:Math.max(0, r.cum.cost - p.cost), model:r.cum.model};
    r.use = r.use ? Object.assign(novaAdd(r.use, run), {model:run.model}) : run;
    if (r.sid) novaSetSession(id, {id:r.sid, day:novaDay(), turns:(r.turns || 0) + 1, last:Date.now(), cum:{tokens:r.cum.tokens, cached:r.cum.cached || 0, cost:r.cum.cost}});
  } else if (r.sid) novaSetSession(id, {id:r.sid, day:novaDay(), turns:(r.turns || 0) + 1, last:Date.now()});
  if (r.use && limUsed) r.use.lim = limUsed;
  const m = Object.assign({role:"nova", text:r.text.trim(), at:Date.now()}, r.error ? {error:r.error} : {}, r.quick ? {quick:true} : {},
    r.use ? {use:r.use} : {}, r.used.length ? {used:[...new Set(r.used)]} : {});
  st.run = null;
  if (m.text || m.error){ st.msgs.push(m); novaKeep(id, m); }
  if (r.tidy && !r.error) novaTidyApply(id, m.use);
  else if (r.tidy){ novaNotify(id, r.error); if (state.view === "inbox") render(); }
  if (!(state.view === "nova" && nova.chat === id) && !(typeof dockSeen === "function" && dockSeen(id))) st.unread = true;
  novaBadge();
  novaRefresh(id);
}

// Repaint the live reply, the status line and the chat list (once per frame); keep the scroll at the bottom if it was there.
function novaPaint(id){
  if (state.view !== "nova") return typeof dockPaint === "function" ? dockPaint(id) : undefined;
  cancelAnimationFrame(nova.paintQ);
  nova.paintQ = requestAnimationFrame(() => {
    if ($("novaList")){ $("novaList").innerHTML = novaListHtml(); novaWire(); }
    const c = novaChat(nova.chat), box = $("novaLog"), live = box && box.querySelector(".nlive");
    if (!box || !live) return;
    const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    live.outerHTML = novaLive(c);
    if ($("novaStatus")) $("novaStatus").innerHTML = novaStatus(c);
    if (atEnd) box.scrollTop = box.scrollHeight;
  });
}

if (T && T.event) T.event.listen("nova-event", (e) => {
  const {thread:id, ev} = e.payload || {}, st = nova.chats[id], r = st && st.run;
  if (!ev || !r) return;
  if (ev.type === "rate_limit_event"){
    const l = novaLimits(ev.rate_limit_info);
    if (l){ if (!r.limStart) r.limStart = l; r.limEnd = l; }
    return;
  }
  if (ev.type === "system" && ev.subtype === "init" && ev.session_id && !r.saved){
    r.saved = true;
    r.sid = ev.session_id;
  }
  // The members' own working notes stay behind the scenes; their work shows as the status line.
  if (ev.parent_tool_use_id) return;
  if (ev.type === "stream_event" && ev.event){
    const x = ev.event;
    if (x.type === "content_block_start" && x.content_block && x.content_block.type === "text"){ if (r.text) r.text += "\n\n"; r.task = null; }
    if (x.type === "content_block_delta" && x.delta && x.delta.type === "text_delta"){ r.streamed = true; r.text += x.delta.text; }
  } else if (ev.type === "assistant" && ev.message){
    for (const b of ev.message.content || []){
      if (b.type === "tool_use"){
        r.task = novaTask(b.name, b.input);
        const a = String((b.input || {}).subagent_type || "").toLowerCase();
        if ((b.name === "Task" || b.name === "Agent") && a) r.used.push(a);
      }
      else if (b.type === "text" && !r.streamed) r.text += (r.text ? "\n\n" : "") + b.text;
    }
  } else if (ev.type === "result"){
    // A reply can end with more than one result (e.g. after a member's work); each carries the session total so far.
    r.cum = novaUse(ev);
    // The emergency brake: say so plainly instead of a bare error.
    if (ev.subtype === "error_max_budget_usd") r.error = "Stopped at the cost limit for one reply. Ask for the rest in a new message, or in smaller steps.";
    else if (ev.is_error) r.error = ev.result || (ev.errors || []).join(" ") || "No answer.";
    else if (!r.text && ev.result) r.text = ev.result;
    const denied = [...new Set((ev.permission_denials || []).map(d => d.tool_name).filter(Boolean))];
    if (denied.length && !r.error) r.text += `\n\n(Not allowed in Vantage: ${denied.join(", ")})`;
  }
  novaPaint(id);
});
if (T && T.event) T.event.listen("nova-done", (e) => {
  const {thread:id, code, stderr} = e.payload || {}, st = nova.chats[id], r = st && st.run;
  if (!r) return;
  if (!r.text && !r.error) r.error = code === null ? "Stopped." : (stderr || "No answer.").slice(-400);
  // "Not logged in": back to the sign-in screen.
  if (/not logged in|\/login/i.test(r.error || "")) nova.cli = null;
  novaFinish(id);
});

// Plan usage (5-hour and weekly limits), as Claude Code reports it with every reply. Kept per computer.
const NOVA_LIM = "vantage.nova.limits";
// Returns {five, week} utilisation (0-1) so a reply can measure how much of the plan it used (end minus start).
function novaLimits(info){
  if (!info) return null;
  const w = info.unifiedWindows || {}, pick = (k) => w[k] || (info.rateLimitType === k ? {utilization:info.utilization, resetsAt:info.resetsAt} : null);
  const prev = (() => { try { return JSON.parse(localStorage.getItem(NOVA_LIM) || "{}"); } catch { return {}; } })();
  const lim = {at:Date.now(), five:pick("five_hour") || prev.five, week:pick("seven_day") || prev.week};
  try { localStorage.setItem(NOVA_LIM, JSON.stringify(lim)); } catch {}
  if ($("novaQuota")) $("novaQuota").innerHTML = novaQuotaHtml();
  return {five:lim.five ? lim.five.utilization : null, week:lim.week ? lim.week.utilization : null};
}
// The latest known utilisation, when it is recent enough to count as "before this reply".
function novaLimNow(){
  try {
    const l = JSON.parse(localStorage.getItem(NOVA_LIM) || "null");
    if (l && Date.now() - l.at < 10 * 60 * 1000) return {five:l.five ? l.five.utilization : null, week:l.week ? l.week.utilization : null};
  } catch {}
  return null;
}
const novaLimDiff = (a, b) => a && b ? {five:a.five != null && b.five != null ? Math.max(0, b.five - a.five) : null, week:a.week != null && b.week != null ? Math.max(0, b.week - a.week) : null} : null;
function novaQuotaHtml(){
  let lim = null; try { lim = JSON.parse(localStorage.getItem(NOVA_LIM) || "null"); } catch {}
  if (!lim || !(lim.five || lim.week)) return "";
  const when = (s) => { const d = new Date(s * 1000); return novaDay(d) === novaDay() ? novaTime(d) : d.toLocaleDateString(LOC(), {weekday:"short"}) + " " + novaTime(d); };
  const row = (label, x) => {
    if (!x || x.utilization == null) return "";
    const p = Math.round(x.utilization * 100);
    return `<div class="wq"><span>${esc(label)}</span><span class="wq-bar"><i class="${p >= 90 ? "hi" : p >= 75 ? "mid" : ""}" style="width:${Math.min(p, 100)}%"></i></span><b>${p}%</b></div>` +
      (x.resetsAt ? `<small><span>resets</span> ${esc(when(x.resetsAt))}</small>` : "");
  };
  return `<div class="cap">Claude usage</div>` + row("5 hours", lim.five) + row("Weekly", lim.week);
}

// Inbox "Tidy up": open Raka's chat and send the request; when Raka is done the app carries out the plan.
const NOVA_TIDY_SAY = {en:"Please tidy up my Inbox.", de:"Bitte räum meine Inbox auf.", id:"Tolong rapikan Inbox aku."};
// The user stays on the Inbox page: Raka answers with a message notification and works in the background.
const NOVA_TIDY_ACK = {en:"Got your files from the Inbox. I'm sorting them now and will tell you where everything went.",
  de:"Deine Dateien aus der Inbox sind da. Ich sortiere sie jetzt und sage dir gleich, wo alles gelandet ist.",
  id:"File kamu dari Inbox udah aku terima. Lagi aku rapikan, nanti aku kabari semuanya masuk ke mana."};
async function novaTidy(){
  if (!nova.cli || !nova.cli.logged_in){ try { nova.cli = await invoke("nova_status"); } catch {} }
  // Not connected yet: the Nova tab shows how to install Claude Code or sign in.
  if (!nova.cli || !nova.cli.logged_in) return dockOpen("raka");
  await novaLoad();
  const st = novaSt("raka");
  if (st.run) return toast("Raka is still busy.");
  const say = NOVA_TIDY_SAY[lang] || NOVA_TIDY_SAY.en;
  novaSend(say, {tidy:true, chat:"raka"}).then(() => {
    // Raka's acknowledgement goes in the chat right after the request (written by the app, no Claude call).
    const ack = {role:"nova", text:NOVA_TIDY_ACK[lang] || NOVA_TIDY_ACK.en, at:Date.now(), auto:true};
    const i = st.msgs.length; st.msgs.splice(i, 0, ack); novaKeep("raka", ack);
  });
  novaNotify("raka", NOVA_TIDY_ACK[lang] || NOVA_TIDY_ACK.en);
}
const novaTidyBusy = () => !!(nova.chats.raka && nova.chats.raka.run && nova.chats.raka.run.tidy);

// A message notification (like a phone banner) from one chat; clicking it opens that chat.
function novaNotify(id, text){
  if (state.view === "nova" && nova.chat === id) return;
  if (typeof dockSeen === "function" && dockSeen(id)) return;
  const c = novaChat(id);
  let el = $("novaNotif");
  if (!el){ el = document.createElement("div"); el.id = "novaNotif"; el.className = "wa-notif"; document.body.appendChild(el); }
  el.innerHTML = `${novaAvatar(c)}<div data-notr><b>${esc(novaName(c))}</b><span>${esc(text.replace(/[*`]/g, "").slice(0, 160))}</span></div>`;
  el.onclick = () => { el.classList.remove("show"); dockOpen(id); };
  el.classList.add("show"); clearTimeout(novaNotify.h);
  novaNotify.h = setTimeout(() => el.classList.remove("show"), 9000);
}
const NOVA_TIDY_TXT = {
  en:{head:"Inbox tidied", moved:"moved", trash:"to Trash", skip:"skipped", none:"Raka wrote no plan, so nothing was moved."},
  de:{head:"Inbox aufgeräumt", moved:"verschoben", trash:"im Papierkorb", skip:"übersprungen", none:"Raka hat keinen Plan geschrieben, nichts wurde verschoben."},
  id:{head:"Inbox dirapikan", moved:"dipindah", trash:"ke Trash", skip:"dilewati", none:"Raka belum menulis rencana, jadi belum ada file yang dipindah."},
};
async function novaTidyApply(id, use){
  const t = NOVA_TIDY_TXT[lang] || NOVA_TIDY_TXT.en;
  let text;
  try {
    const r = await invoke("nova_inbox_apply", {root:folder});
    text = `**${t.head}:** ${r.moved.length} ${t.moved} · ${r.trashed.length} ${t.trash} · ${r.skipped.length} ${t.skip}\n` +
      r.moved.map(([a, b]) => `• ${a} → ${b.replace(/^01_user_documents\/(materials\/)?/, "")}`).concat(
      r.trashed.map(a => `• ${a} → Trash`), r.skipped.map(([a, why]) => `• ${a}: ${why}`)).join("\n");
  } catch (e){ text = t.none + (String(e).includes("did not write") ? "" : "\n" + String(e)); }
  const st = novaSt(id), m = Object.assign({role:"app", text, at:Date.now()}, use ? {use} : {});
  st.msgs.push(m); novaKeep(id, m);
  if (!(state.view === "nova" && nova.chat === id) && !(typeof dockSeen === "function" && dockSeen(id))){ st.unread = true; novaBadge(); }
  novaNotify(id, text.split("\n")[0]);
  novaRefresh(id); if (state.view === "inbox") render();
  refresh(true);
}
