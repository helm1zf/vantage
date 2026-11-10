// F05 Learn hub: a tab with your skill gaps, a level goal (zero, job-ready, hero), a week-by-week tracker you can tick,
// the point where it is "enough for the market", and one button that builds the study pack (.zip) from the plan.
// Progress is stored in app_prefs.json ("learn"). The plan itself is written by Arga (templates/rencana_belajar).
(function(){
  const css = document.createElement("style");
  css.textContent = `.lh{display:grid;grid-template-columns:260px minmax(0,1fr);gap:14px}.lh .panel{padding:0}
  .lh-sk{display:flex;flex-direction:column}.lh-sk button{display:block;text-align:left;border:0;border-bottom:1px solid var(--line);background:transparent;padding:11px 14px;cursor:pointer;color:var(--ink);font:13px var(--ui)}
  .lh-sk button.on{background:var(--field)}.lh-sk small{display:block;color:var(--muted);font-size:11px;margin-top:2px}
  .lh .lh-main{padding:16px 18px;min-width:0}.lh-main h2{margin:0 0 4px;font-size:18px;font-weight:500}.lh-lv{display:flex;gap:6px;margin:12px 0}
  .lh-lv button{flex:1;border:1px solid var(--fieldLine);border-radius:8px;background:transparent;color:var(--ink);padding:8px;cursor:pointer;font:13px var(--ui);text-align:left}
  .lh-lv button.on{border-color:var(--ink);background:var(--field)}.lh-lv small{display:block;color:var(--muted);font-size:11px}
  .lh-bar{height:8px;border-radius:4px;background:var(--line);overflow:hidden;margin:6px 0 4px}.lh-bar i{display:block;height:100%;background:var(--accent)}
  .lh-w{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)}.lh-w input{accent-color:var(--accent);margin-top:3px;width:16px;height:16px}
  .lh-w.done b{color:var(--muted);text-decoration:line-through}.lh-w b{font-weight:500}.lh-w small{display:block;color:var(--muted);font-size:12px}
  .lh-mk{display:inline-block;font:600 10px var(--mono);letter-spacing:.06em;color:#fff;background:#2E7D4F;border-radius:9px;padding:1px 8px;margin-left:8px;vertical-align:1px}
  .lh-act{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.lh-w>span,.lh-w>div{min-width:0}.lh-w b{overflow-wrap:anywhere}
  @media (max-width:900px){.lh{grid-template-columns:minmax(0,1fr)}.lh-lv{flex-wrap:wrap}.lh-lv button{min-width:140px}}`;
  document.head.appendChild(css);
  const LV = [["zero", "From zero", "I know nothing yet"], ["ready", "Job-ready", "Enough to apply"], ["hero", "Hero", "Go all the way"]];
  let gaps = [], plans = [], gapErr = false, sel = 0;
  const get = (s) => Object.assign({level:"ready", done:[]}, (prefs.learn || {})[s] || {});
  const put = (s, v) => { const a = Object.assign({}, prefs.learn || {}); a[s] = v; savePref("learn", a); };
  const name = (g) => g.skill.split("(")[0].trim();
  const norm = skNorm;
  // The plan Arga wrote for exactly this skill (newest first), by the skill name inside the plan, never by a guess from the file name.
  const planOf = (g) => plans.find(p => norm(p.skill) && norm(p.skill) === norm(g.skill));
  function page(){
    if (gapErr) return `<section class="panel"><div class="empty">${ft("The skill list could not be read.", "Die Skill-Liste ließ sich nicht lesen.", "Daftar skill tidak bisa dibaca.")} <button class="btn" id="lhRetry">${ft("Try again", "Erneut versuchen", "Coba lagi")}</button></div></section>`;
    const g = gaps[sel]; if (!g) return `<section class="panel"><div class="empty">${ft("No skill gaps recorded yet. Analyse a few job ads and Arga will list what to learn.", "Noch keine Skill-Lücken erfasst. Analysiere ein paar Anzeigen, dann listet Arga auf, was du lernen solltest.", "Belum ada skill gap. Analisis beberapa lowongan, lalu Arga mendaftar apa yang perlu dipelajari.")}</div></section>`;
    const plan = planOf(g), weeks = plan ? plan.weeks : [];
    const list = `<section class="panel lh-sk">${gaps.map((x, i) => `<button class="${i === sel ? "on" : ""}" data-lhsel="${i}">${esc(name(x))}<small>${ft("in " + x.count + (x.count === 1 ? " ad" : " ads"), "in " + x.count + (x.count === 1 ? " Anzeige" : " Anzeigen"), "di " + x.count + " lowongan")} · ${esc(planOf(x) ? ft("plan ready", "Plan fertig", "rencana siap") : ft("no plan yet", "noch kein Plan", "belum ada rencana"))}</small></button>`).join("")}</section>`;
    if (!plan) return `<div class="lh">${list}<section class="panel lh-main"><h2>${esc(name(g))}</h2><div class="muted">${esc(g.advice || "")}</div>
      <div class="muted" style="margin:10px 0">${ft("No plan for this skill yet. Arga writes one from your job ads and your background.", "Für diesen Skill gibt es noch keinen Plan. Arga schreibt ihn aus deinen Anzeigen und deinem Hintergrund.", "Belum ada rencana untuk skill ini. Arga membuatnya dari lowongan dan latar belakangmu.")}</div>
      <div class="lh-act"><button class="btn primary" id="lhPlan">${ft("Ask Arga for a plan", "Arga um einen Plan bitten", "Minta Arga membuat rencana")}</button></div></section></div>`;
    const st = get(g.skill), mk = Math.max(1, Math.round(weeks.length * 0.6)), upto = st.level === "hero" ? weeks.length : st.level === "ready" ? mk : weeks.length;
    const total = st.level === "ready" ? mk : weeks.length, n = st.done.filter(i => i < total).length;
    const hrs = Math.round(weeks.slice(0, total).reduce((a, w) => a + (w.hours || 0), 0));
    return `<div class="lh">${list}
    <section class="panel lh-main"><h2>${esc(name(g))}</h2><div class="muted">${esc(g.advice || "")}</div>
      <div class="lh-lv">${LV.map(([k, t, s]) => `<button class="${st.level === k ? "on" : ""}" data-lhlv="${k}">${t}<small>${s}</small></button>`).join("")}</div>
      <div class="muted">${st.level === "hero" ? ft("Full path: all " + total + " weeks.", "Voller Weg: alle " + total + " Wochen.", "Jalur penuh: semua " + total + " minggu.") : ft("Enough for the market after week " + mk + ". You can apply, and carry on later.", "Für den Markt reicht es nach Woche " + mk + ". Du kannst dich bewerben und später weitermachen.", "Cukup untuk pasar setelah minggu " + mk + ". Kamu bisa melamar dan melanjutkan belajar nanti.")}${hrs ? " · " + hrs + " h" : ""}</div>
      <div class="lh-bar"><i style="width:${Math.round(100 * n / total)}%"></i></div><div class="muted" style="margin-bottom:6px">${n} ${ft("of", "von", "dari")} ${total} ${ft("weeks done", "Wochen erledigt", "minggu selesai")}</div>
      ${weeks.slice(0, upto).map((w, i) => `<label class="lh-w${st.done.includes(i) ? " done" : ""}"><input type="checkbox" data-lhwk="${i}"${st.done.includes(i) ? " checked" : ""}><span><b>${ft("Week", "Woche", "Minggu")} ${i + 1}: ${esc(w.title)}</b>${i + 1 === mk ? '<span class="lh-mk">' + ft("ENOUGH FOR THE MARKET", "REICHT FÜR DEN MARKT", "CUKUP UNTUK PASAR") + '</span>' : ""}<small>${esc(w.focus || "")}</small></span></label>`).join("")}
      <div class="lh-act"><button class="btn primary" id="lhPack">${ft("Build study pack (.zip)", "Lernpaket erstellen (.zip)", "Buat paket belajar (.zip)")}</button><button class="btn" id="lhPlan">${ft("Ask Arga to update the plan", "Arga um einen neuen Plan bitten", "Minta Arga memperbarui rencana")}</button></div></section></div>`;
  }
  async function hook(view){
    if (view !== "learn") return;
    gapErr = false; plans = [];
    if (invoke){
      try { gaps = arr(await invoke("skill_gaps", {root:folder})); } catch { gaps = []; gapErr = true; }
      try { plans = arr(await invoke("learn_plans", {root:folder})); } catch { plans = []; }
    } else gaps = MOCK_GAPS;
    if (sel >= gaps.length) sel = 0;
    if (state.view !== "learn") return;
    $("view").innerHTML = page();
  }
  vhook(hook);
  ICONS.book = '<path d="M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 0 6.5 11.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z"/>';
  const nav = $("nav"); if (nav && !nav.querySelector('[data-view="learn"]')){
    const a = document.createElement("a"); a.href = "#"; a.dataset.view = "learn"; a.innerHTML = `<i class="ic" data-i="book"></i>Learn`;
    const skill = nav.querySelector('[data-view="skill"]'); if (skill) skill.after(a); else nav.appendChild(a);
    a.querySelectorAll(".ic").forEach(el => el.innerHTML = `<svg viewBox="0 0 16 16">${ICONS[el.dataset.i]}</svg>`);
  }
  // The study pack is built from the plan Arga wrote for the selected skill. Any failure: show what the script said.
  async function buildPack(g){
    const mine = planOf(g);
    if (!mine) return toast(ft("Ask Arga for a plan first, then build the pack.", "Bitte zuerst Arga um einen Plan, dann das Paket erstellen.", "Minta Arga membuat rencana dulu, lalu buat paketnya."));
    try { const p = await invoke("run_kit_script", {root:folder, script:"build_study_pack.py", args:[PLAN_DIR + mine.file]}); toast(ft("Study pack ready: ", "Lernpaket fertig: ", "Paket belajar siap: ") + String(p).trim().split(/[\\/]/).pop()); }
    catch (e) { toast(String(e).slice(0, 200)); }
  }
  document.addEventListener("click", (e) => {
    if (state.view !== "learn") return; const g = gaps[sel];
    const s = e.target.closest("[data-lhsel]"); if (s){ sel = +s.dataset.lhsel; $("view").innerHTML = page(); return; }
    const l = e.target.closest("[data-lhlv]"); if (l && g){ const st = get(g.skill); st.level = l.dataset.lhlv; put(g.skill, st); $("view").innerHTML = page(); return; }
    if (e.target.closest("#lhRetry")){ gapErr = false; return hook("learn"); }
    if (e.target.closest("#lhPlan") && g) return sendNow(say("studyplan", name(g)), "lamaran", "arga");
    if (e.target.closest("#lhPack") && g) return buildPack(g);
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-lhwk]"); if (!c || !gaps[sel]) return; const g = gaps[sel], st = get(g.skill), i = +c.dataset.lhwk;
    st.done = c.checked ? [...new Set([...st.done, i])] : st.done.filter(x => x !== i); put(g.skill, st); $("view").innerHTML = page();
  });
})();
