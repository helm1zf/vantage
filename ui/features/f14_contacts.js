// F14 Contacts and notes: in an application's details, who you talked to, when, and your own notes. Saved per application in app_prefs.json
// and mirrored to ui_context.md (f50), so Nova, Raka and Laras know it without being told.
(function(){
  VK.css("ct", `.ct-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ct-g .full{grid-column:1/-1}.ct-g textarea{min-height:64px;resize:vertical}.ct-s{float:right;font-size:12px;color:var(--muted)}.ct-ago{font:11px var(--mono);color:var(--muted)}`);
  const st = VK.store("contacts");
  const ago = (iso) => { const t = parseDate(iso); if (!t) return ""; const n = -daysFrom(t); return n <= 0 ? ft("today", "heute", "hari ini") : n === 1 ? ft("yesterday", "gestern", "kemarin") : ft(`${n} days ago`, `vor ${n} Tagen`, `${n} hari lalu`); };
  window.CTX = window.CTX || {};
  CTX.contacts = {title:"Contacts and notes per application", fmt:(v, apps) => Object.entries(v).map(([id, c]) => {
    const a = apps.find(x => String(x.id) === String(id));
    return `- ${a ? a.company : id}: ` + [c.name && "contact " + c.name, c.role, c.email, c.last && "last contact " + c.last, c.notes && "notes: " + c.notes].filter(Boolean).join("; ");
  })};
  VK.onDrawer((a, info) => {
    if (info.querySelector(".ct")) return;
    const c = st.get(a.id, {}), f = (k, label, extra = "") => `<label class="vkf">${esc(label)}<input data-f="${k}" value="${esc(c[k] || "")}" autocomplete="off" ${extra}></label>`;
    const box = document.createElement("div"); box.className = "vkb ct";
    box.innerHTML = `<span class="cap">${esc(ft("Contacts and notes", "Kontakte und Notizen", "Kontak dan catatan"))}</span><span class="ct-s" id="ctSaved"></span>
      <div class="ct-g">${f("name", ft("Name", "Name", "Nama"))}${f("role", ft("Role", "Funktion", "Jabatan"))}${f("email", "Email")}${f("last", ft("Last contact", "Letzter Kontakt", "Kontak terakhir"), 'type="date"')}
      <div class="full ct-ago" id="ctAgo">${c.last ? esc(ago(c.last)) : ""}</div>
      <textarea class="full" data-f="notes" placeholder="${esc(ft("What was said, what to bring, questions to ask …", "Was gesagt wurde, was mitzubringen ist, Fragen …", "Apa yang dibicarakan, apa yang dibawa, pertanyaan …"))}">${esc(c.notes || "")}</textarea></div>`;
    info.appendChild(box);
    let timer;
    box.oninput = box.onchange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const cur = {}; box.querySelectorAll("[data-f]").forEach(x => { cur[x.dataset.f] = x.value.trim(); });
        st.set(a.id, cur);
        $("ctSaved").textContent = ft("Saved", "Gespeichert", "Tersimpan"); $("ctAgo").textContent = cur.last ? ago(cur.last) : "";
        setTimeout(() => { const s = $("ctSaved"); if (s) s.textContent = ""; }, 1500);
      }, 450);
    };
  });
})();
