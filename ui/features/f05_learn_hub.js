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
  // Default 6-week path when Arga has not written a plan yet; the market marker is week 3 (about 60 percent of the path).
  const DEFAULT = [[["Foundations", "Grundlagen", "Dasar"], ["Concepts and vocabulary", "Konzepte und Begriffe", "Konsep dan istilah"]], [["Core skills", "Kernkompetenzen", "Skill inti"], ["The 20 percent used in 80 percent of jobs", "Die 20 Prozent, die in 80 Prozent der Jobs gebraucht werden", "20 persen yang dipakai di 80 persen pekerjaan"]], [["Small project", "Kleines Projekt", "Proyek kecil"], ["Build one thing end to end", "Eine Sache von Anfang bis Ende bauen", "Bangun satu hal dari awal sampai akhir"]], [["Real-world practice", "Praxis im echten Alltag", "Latihan dunia nyata"], ["Messy data, errors, other people's code", "Unsaubere Daten, Fehler, fremder Code", "Data berantakan, error, kode orang lain"]], [["Advanced", "Fortgeschritten", "Lanjutan"], ["What separates good from great", "Was Gut von Sehr gut trennt", "Yang membedakan bagus dari hebat"]], [["Portfolio", "Portfolio", "Portofolio"], ["Write it up so a recruiter sees it", "Aufschreiben, damit ein Recruiter es sieht", "Tuliskan supaya recruiter melihatnya"]]];
  let gaps = [], sel = 0;
  const get = (s) => Object.assign({level:"ready", done:[]}, (prefs.learn || {})[s] || {});
  const put = (s, v) => { const a = Object.assign({}, prefs.learn || {}); a[s] = v; savePref("learn", a); };
  const name = (g) => g.skill.split("(")[0].trim();
  function page(){
    const g = gaps[sel]; if (!g) return `<section class="panel"><div class="empty">No skill gaps recorded yet. Analyse a few job ads and Arga will list what to learn.</div></section>`;
    const st = get(g.skill), mk = Math.max(1, Math.round(DEFAULT.length * 0.6)), upto = st.level === "hero" ? DEFAULT.length : st.level === "ready" ? mk : DEFAULT.length;
    const total = st.level === "ready" ? mk : DEFAULT.length, n = st.done.filter(i => i < total).length;
    return `<div class="lh"><section class="panel lh-sk">${gaps.map((x, i) => `<button class="${i === sel ? "on" : ""}" data-lhsel="${i}">${esc(name(x))}<small>${ft("in " + x.count + " ads", "in " + x.count + " Anzeigen", "di " + x.count + " lowongan")} · ${esc(x.discussed.startsWith("Yes") ? ft("plan ready", "Plan fertig", "rencana siap") : ft("no plan yet", "noch kein Plan", "belum ada rencana"))}</small></button>`).join("")}</section>
    <section class="panel lh-main"><h2>${esc(name(g))}</h2><div class="muted">${esc(g.advice || "")}</div>
      <div class="lh-lv">${LV.map(([k, t, s]) => `<button class="${st.level === k ? "on" : ""}" data-lhlv="${k}">${t}<small>${s}</small></button>`).join("")}</div>
      <div class="muted">${st.level === "hero" ? ft("Full path: all " + total + " weeks.", "Voller Weg: alle " + total + " Wochen.", "Jalur penuh: semua " + total + " minggu.") : st.level === "ready" ? ft("Enough for the market after week " + mk + ": " + g.count + " of the ads you analysed ask for this at about this level. You can apply, and carry on later.", "Für den Markt reicht es nach Woche " + mk + ": " + g.count + " der analysierten Anzeigen verlangen das etwa auf diesem Niveau. Du kannst dich bewerben und später weitermachen.", "Cukup untuk pasar setelah minggu " + mk + ": " + g.count + " lowongan yang kamu analisis meminta ini di level yang kurang lebih sama. Kamu bisa melamar dan melanjutkan belajar nanti.") : ft("Starting from nothing: weeks 1 to " + mk + " get you job-ready, the rest makes you strong.", "Bei null anfangen: Woche 1 bis " + mk + " machen dich jobreif, der Rest macht dich stark.", "Mulai dari nol: minggu 1 sampai " + mk + " membuatmu siap kerja, sisanya membuatmu kuat.")}</div>
      <div class="lh-bar"><i style="width:${Math.round(100 * n / total)}%"></i></div><div class="muted" style="margin-bottom:6px">${n} ${ft("of", "von", "dari")} ${total} ${ft("weeks done", "Wochen erledigt", "minggu selesai")}</div>
      ${DEFAULT.slice(0, upto).map(([tt, ss], i) => { const t = ft(...tt), s = ft(...ss); return `<label class="lh-w${st.done.includes(i) ? " done" : ""}"><input type="checkbox" data-lhwk="${i}"${st.done.includes(i) ? " checked" : ""}><span><b>${ft("Week", "Woche", "Minggu")} ${i + 1}: ${t}</b>${i + 1 === mk ? '<span class="lh-mk">' + ft("ENOUGH FOR THE MARKET", "REICHT FÜR DEN MARKT", "CUKUP UNTUK PASAR") + '</span>' : ""}<small>${s}</small></span></label>`; }).join("")}
      <div class="lh-act"><button class="btn primary" id="lhPlan">Ask Arga for my full plan</button><button class="btn" id="lhPack">Build study pack (.zip)</button></div></section></div>`;
  }
  async function hook(view){
    if (view !== "learn") return;
    if (invoke){ try { gaps = await invoke("skill_gaps", {root:folder}) || []; } catch { gaps = []; } } else gaps = MOCK_GAPS;
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
  // The study pack is built from Arga's plan file for the skill (the SOP names them YYYY-MM-DD_Rencana_Belajar_<Skill>.json): the newest one
  // that names the skill, else the newest plan. No plan: say so. Any other failure: show what the script said.
  async function buildPack(g){
    let files = []; try { files = await invoke("dir_files", {root:folder, rel:PLAN_DIR}); } catch {}
    const plans = arr(files).filter(f => f && typeof f.path === "string" && !f.path.includes("/") && /\.json$/i.test(f.path)).sort((a, b) => (b.modified || 0) - (a.modified || 0));
    const slug = (s) => String(s || "").toLowerCase().replace(/\(.*$/, "").replace(/[^a-z0-9]+/g, "");
    const mine = plans.find(f => slug(f.path).includes(slug(name(g))) && slug(name(g))) || plans[0];
    if (!mine) return toast(ft("Ask Arga for a plan first, then build the pack.", "Bitte zuerst Arga um einen Plan, dann das Paket erstellen.", "Minta Arga membuat rencana dulu, lalu buat paketnya."));
    try { const p = await invoke("run_kit_script", {root:folder, script:"build_study_pack.py", args:[PLAN_DIR + mine.path]}); toast(ft("Study pack ready: ", "Lernpaket fertig: ", "Paket belajar siap: ") + String(p).trim().split(/[\\/]/).pop()); }
    catch (e) { toast(String(e).slice(0, 200)); }
  }
  document.addEventListener("click", (e) => {
    if (state.view !== "learn") return; const g = gaps[sel];
    const s = e.target.closest("[data-lhsel]"); if (s){ sel = +s.dataset.lhsel; $("view").innerHTML = page(); return; }
    const l = e.target.closest("[data-lhlv]"); if (l && g){ const st = get(g.skill); st.level = l.dataset.lhlv; put(g.skill, st); $("view").innerHTML = page(); return; }
    if (e.target.closest("#lhPlan") && g) return sendNow(say("studyplan", name(g)), "lamaran", "arga");
    if (e.target.closest("#lhPack") && g) return buildPack(g);
  });
  document.addEventListener("change", (e) => {
    const c = e.target.closest("[data-lhwk]"); if (!c || !gaps[sel]) return; const g = gaps[sel], st = get(g.skill), i = +c.dataset.lhwk;
    st.done = c.checked ? [...new Set([...st.done, i])] : st.done.filter(x => x !== i); put(g.skill, st); $("view").innerHTML = page();
  });
})();
