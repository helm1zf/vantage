// F15 Follow-up draft: for a sent application, a short polite follow-up in English, German or Bahasa, built on this computer from what Vantage knows
// (role, company, date sent, contact name from F14). Nothing is sent: copy it, or have Nova polish it. "Mark as followed up" is remembered.
(function(){
  VK.css("fu", `.fu-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}.fu-h select{margin-left:auto;height:26px}.fu textarea{width:100%;min-height:170px;resize:vertical;border:1px solid var(--fieldLine);border-radius:8px;background:var(--field);color:var(--ink);padding:10px 12px;font:13px/1.5 var(--ui)}
  .fu-b{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center}.fu-d{font-size:12px;color:var(--muted);margin-left:auto}`);
  const TEXT = {
    en:(o) => `Subject: Following up on my application: ${o.role}\n\nDear ${o.name || "Sir or Madam"},\n\nI applied for the position of ${o.role} at ${o.company} on ${o.sent}. I am still very interested in the role and wanted to ask whether there is any news on the process, or anything further you need from me.\n\nThank you for your time. I look forward to hearing from you.\n\nKind regards\n${o.me}`,
    de:(o) => `Betreff: Nachfrage zu meiner Bewerbung: ${o.role}\n\n${o.name ? "Guten Tag " + o.name : "Sehr geehrte Damen und Herren"},\n\nam ${o.sent} habe ich mich bei ${o.company} auf die Stelle ${o.role} beworben. Ich interessiere mich weiterhin sehr für die Position und möchte nachfragen, ob es schon einen Stand zum Verfahren gibt oder ob Sie noch etwas von mir benötigen.\n\nVielen Dank für Ihre Zeit. Ich freue mich auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen\n${o.me}`,
    id:(o) => `Subjek: Menanyakan kabar lamaran: ${o.role}\n\nYth. ${o.name || "Tim Rekrutmen"},\n\nPada ${o.sent} saya melamar posisi ${o.role} di ${o.company}. Saya masih sangat tertarik dan ingin menanyakan apakah ada perkembangan proses seleksi, atau apakah ada hal lain yang perlu saya lengkapi.\n\nTerima kasih atas waktunya. Saya menantikan kabar dari Anda.\n\nHormat saya,\n${o.me}`};
  const dateIn = (iso, l) => { const t = parseDate(iso); return t ? t.toLocaleDateString({de:"de-DE", id:"id-ID"}[l] || "en-GB", {day:"numeric", month:"long", year:"numeric"}) : ""; };
  const followed = VK.store("followed");
  VK.onDrawer((a, info) => {
    if (info.querySelector(".fu") || !["Sent", "Applied"].includes(a.status)) return;
    const done = followed.get(a.id, ""), days = Math.max(0, -daysFrom(parseDate(a.status_date || a.date) || new Date()));
    const box = document.createElement("div"); box.className = "vkb fu";
    box.innerHTML = `<div class="fu-h"><span class="cap">${esc(ft("Follow-up draft", "Nachfrage-Entwurf", "Draf tindak lanjut"))}</span><select id="fuLang"><option value="en">English</option><option value="de">Deutsch</option><option value="id">Bahasa</option></select></div>
      <textarea id="fuText"></textarea><div class="fu-b"><button class="btn primary" id="fuCopy">${esc(ft("Copy", "Kopieren", "Salin"))}</button><button class="btn" id="fuPolish">${esc(ft("Polish with Nova", "Mit Nova verfeinern", "Poles dengan Nova"))}</button><button class="btn" id="fuDone">${esc(ft("Mark as followed up", "Als nachgefragt markieren", "Tandai sudah ditindaklanjuti"))}</button>
      <span class="fu-d" id="fuInfo">${done ? esc(ft("Followed up on ", "Nachgefragt am ", "Ditindaklanjuti pada ") + dateIn(done, lang)) : esc(ft(`Waiting ${days} days`, `Seit ${days} Tagen offen`, `Menunggu ${days} hari`))}</span></div>`;
    info.appendChild(box);
    const fill = () => { const l = $("fuLang").value, c = (prefs.contacts || {})[a.id] || {};
      $("fuText").value = TEXT[l]({role:a.role, company:a.company_full || a.company, sent:dateIn(a.status_date || a.date, l) || "…", name:c.name, me:state.data.full_name || ""}); };
    $("fuLang").value = ["de", "id"].includes(lang) ? lang : "en"; fill(); $("fuLang").onchange = fill;
    $("fuCopy").onclick = () => VK.copy($("fuText").value);
    $("fuPolish").onclick = () => { closeApp(); sendNow(ft("Polish this follow-up for my application at ", "Verfeinere diese Nachfrage zu meiner Bewerbung bei ", "Poles draf tindak lanjut untuk lamaranku di ") + a.company + ". " + ft("Keep it short and in the tone of my CV:", "Kurz halten, im Ton meines Lebenslaufs:", "Singkat dan sesuai gaya CV-ku:") + "\n\n" + $("fuText").value, "nova"); };
    $("fuDone").onclick = () => { followed.set(a.id, VK.day()); $("fuInfo").textContent = ft("Followed up today", "Heute nachgefragt", "Ditindaklanjuti hari ini"); };
  });
  window.CTX = window.CTX || {};
  CTX.followed = {title:"Follow-up emails the user marked as sent", fmt:(v, apps) => Object.entries(v).map(([id, d]) => `- ${(apps.find(x => String(x.id) === String(id)) || {company:id}).company}: followed up on ${d}`)};
})();
