// F08 Smart paste: one box on the Dashboard. Paste a job link or the whole ad; Vantage reads it on the spot (contract, language,
// city, skills it recognises) and one button hands it to Arga for the fit check. Nothing is sent before you press the button.
(function(){
  const css = document.createElement("style");
  css.textContent = `.sp{margin-bottom:12px;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:12px 14px}
  .sp textarea{width:100%;min-height:42px;max-height:160px;resize:vertical;border:1px solid var(--fieldLine);border-radius:8px;background:var(--field);color:var(--ink);padding:10px 12px;font:13px/1.4 var(--ui);outline:none}
  .sp textarea:focus{border-color:var(--ink)}.sp-r{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}
  .sp-c{border:1px solid var(--fieldLine);border-radius:12px;padding:2px 10px;font-size:12px;background:var(--field)}.sp-c b{font-weight:500;color:var(--muted);margin-right:4px}.sp-r .sp{flex:1}`;
  document.head.appendChild(css);
  const SKILLS = ["SAP", "S/4HANA", "Python", "SQL", "Power BI", "Tableau", "Excel", "Docker", "Jira", "Celonis", "Java", "JavaScript", "Neo4j", "ERP", "Scrum", "AWS", "Azure", "R", "Git"];
  const CITIES = ["Hamburg", "Berlin", "München", "Munich", "Frankfurt", "Köln", "Stuttgart", "Düsseldorf", "Dortmund", "Leipzig", "Hannover", "Bremen"];
  const BOARDS = ["linkedin", "indeed", "stepstone", "xing", "glassdoor", "arbeitsagentur", "join", "monster", "kimeta", "jobware"];
  function read(t){
    const out = [], s = t.trim();
    if (/^https?:\/\/\S+$/i.test(s)){
      let host = ""; try { host = new URL(s).hostname.replace(/^(www|careers?|jobs?|apply|karriere)\./i, ""); } catch {}
      const base = host.split(".").slice(-2, -1)[0] || host;
      out.push(["Link", BOARDS.includes(base) ? ft("job board (" + base + ")", "Jobbörse (" + base + ")", "bursa kerja (" + base + ")") : base], ["Reads", "Arga opens the page itself"]);
      return out;
    }
    const low = s.toLowerCase(), de = (low.match(/\b(und|der|die|das|wir|sie|ihre|aufgaben|anforderungen|bewerbung|erfahrung)\b/g) || []).length, en = (low.match(/\b(and|the|you|we|your|requirements|responsibilities|experience|apply)\b/g) || []).length;
    out.push(["Language", de > en ? ft("German", "Deutsch", "Jerman") : ft("English", "Englisch", "Inggris")]);
    const ty = /werkstudent|working student/i.test(s) ? ft("Working student", "Werkstudent", "Working student") : /praktik|intern/i.test(s) ? ft("Internship", "Praktikum", "Magang") : /teilzeit|part[- ]time/i.test(s) ? ft("Part-time", "Teilzeit", "Paruh waktu") : /vollzeit|full[- ]time/i.test(s) ? ft("Full-time", "Vollzeit", "Penuh waktu") : "";
    if (ty) out.push(["Contract", ty]);
    const city = CITIES.find(c => low.includes(c.toLowerCase())); if (city) out.push(["City", city]);
    const sk = SKILLS.filter(k => new RegExp("(^|[^A-Za-z])" + k.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&") + "([^A-Za-z]|$)", k.length < 3 ? "" : "i").test(s));
    if (sk.length) out.push(["Skills", sk.slice(0, 6).join(", ") + (sk.length > 6 ? " +" + (sk.length - 6) : "")]);
    out.push(["Length", s.split(/\s+/).length + ft(" words", " Wörter", " kata")]);
    return out;
  }
  function hook(view){
    if (view !== "dash" || $("spBox")) return;
    const box = document.createElement("div"); box.className = "sp"; box.id = "spBox";
    box.innerHTML = `<textarea id="spIn" rows="1" placeholder="Paste a job link or the whole job ad here…"></textarea><div class="sp-r" id="spRes" hidden></div>`;
    const v = $("view"); v.insertBefore(box, v.firstChild);
    const ta = $("spIn"), res = $("spRes");
    ta.oninput = () => {
      const t = ta.value.trim(); if (t.length < 12){ res.hidden = true; return; }
      res.hidden = false;
      res.innerHTML = read(t).map(([k, v]) => `<span class="sp-c"><b>${esc(k)}</b>${esc(v)}</span>`).join("") + `<span class="sp"></span><button class="btn primary" id="spGo">Check the fit with Arga</button>`;
      $("spGo").onclick = () => { sendNow(ft("Nova, ask Arga to check the fit of this job for me and tell me if I should apply, following sop/lamaran_analisis.md:", "Nova, bitte Arga, die Passung dieser Stelle für mich zu prüfen und mir zu sagen, ob ich mich bewerben sollte, nach sop/lamaran_analisis.md:", "Nova, minta Arga mengecek kecocokan lowongan ini untukku dan bilang apakah sebaiknya aku melamar, sesuai sop/lamaran_analisis.md:") + "\n\n" + t.slice(0, 12000), "lamaran"); ta.value = ""; res.hidden = true; toast(ft("Sent to Arga", "An Arga gesendet", "Dikirim ke Arga")); };
    };
  }
  vhook(hook);
})();
