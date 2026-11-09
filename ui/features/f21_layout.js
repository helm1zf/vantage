// F21 Dashboard layout (loaded last): the cards the features add are gathered in one area at the top of the Dashboard, ordered by priority, two per row
// (wide ones across), and "Customize" lets you hide any of them. The choice is remembered.
(function(){
  VK.css("lay", `#dwArea{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px;margin-bottom:12px}#dwArea>*{margin:0!important}#dwArea>.sl{grid-column:1/-1}
  #dwBar{display:flex;align-items:center;gap:10px;margin:0 0 8px;color:var(--muted);font-size:12px}#dwBar .grow{flex:1}
  #dwPick{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:6px 16px;border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:10px;background:var(--panel)}
  #dwPick label{display:flex;gap:8px;align-items:center;font-size:13px}#dwPick input{accent-color:var(--accent)}`);
  const NAMES = () => ({today:ft("Today", "Heute", "Hari ini"), health:ft("Needs a look", "Braucht einen Blick", "Perlu dicek"), backup:ft("Backup reminder", "Sicherungs-Erinnerung", "Pengingat cadangan"), since:ft("Since you were last here", "Seit deinem letzten Besuch", "Sejak terakhir kamu di sini")});
  vhook((view) => {
    if (view !== "dash" || !VK.ready() || $("dwArea")) return;
    const cards = [...document.querySelectorAll("#view .dw")].map(e => ({e, id:e.dataset.w, prio:+e.dataset.prio}));
    const since = $("slBox"); if (since) cards.push({e:since, id:"since", prio:10});          // the "since you were last here" banner (f06)
    if (!cards.length) return;
    cards.sort((a, b) => a.prio - b.prio);
    const hidden = new Set(prefs.dwHidden || []), area = document.createElement("div"); area.id = "dwArea";
    const FOOT = 80;   // cards with a priority of 80 or more (the backup reminder) go below the Dashboard, not above it
    const foot = document.createElement("div"); foot.id = "dwFoot";
    cards.forEach(c => { c.e.hidden = hidden.has(c.id); (c.prio >= FOOT ? foot : area).appendChild(c.e); });
    const shownN = cards.filter(c => !hidden.has(c.id)).length, bar = document.createElement("div"); bar.id = "dwBar";
    bar.innerHTML = `<span class="grow">${shownN} ${esc(shownN === 1 ? ft("card", "Karte", "kartu") : ft("cards", "Karten", "kartu"))}</span><button class="btn sm" id="dwCust">${esc(ft("Customize", "Anpassen", "Atur"))}</button>`;
    const root = $("view"), paste = $("spBox");
    root.insertBefore(area, paste ? paste.nextSibling : root.firstChild); root.insertBefore(bar, area);
    if (foot.children.length) root.appendChild(foot);
    // what to do now first, the numbers right under it
    const strip = root.querySelector(".dstrip"); if (strip) area.after(strip);
    $("dwCust").onclick = () => {
      const open = $("dwPick"); if (open) return open.remove();
      const pick = document.createElement("div"); pick.id = "dwPick";
      pick.innerHTML = cards.map(c => `<label><input type="checkbox" data-hid="${esc(c.id)}" ${hidden.has(c.id) ? "" : "checked"}> ${esc(NAMES()[c.id] || c.id)}</label>`).join(""); bar.after(pick);
      pick.onchange = (e) => {
        const box = e.target.closest("[data-hid]"); if (!box) return;
        const set = new Set(prefs.dwHidden || []); box.checked ? set.delete(box.dataset.hid) : set.add(box.dataset.hid);
        savePref("dwHidden", [...set]);
        cards.find(c => c.id === box.dataset.hid).e.hidden = !box.checked;           // applied at once, the list stays open
        const n = cards.filter(c => !c.e.hidden).length;
        bar.firstChild.textContent = `${n} ${n === 1 ? ft("card", "Karte", "kartu") : ft("cards", "Karten", "kartu")}`;
        if (box.dataset.hid === "today"){ render(); setTimeout(() => $("dwCust") && $("dwCust").click(), 30); }   // the Needs attention list takes the due steps back
      };
    };
  });
})();
