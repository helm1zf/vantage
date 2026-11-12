// F21 Dashboard layout (loaded last): the cards the features add ("Needs a look", "Since you were last here") are gathered in one area
// under the paste box, ordered by priority, two per row (wide ones across). They only appear when they have something to say.
(function(){
  VK.css("lay", `#dwArea{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:12px;margin-bottom:12px}#dwArea>*{margin:0!important}#dwArea>.sl{grid-column:1/-1}`);
  vhook((view) => {
    if (view !== "dash" || !VK.ready() || $("dwArea")) return;
    const cards = [...document.querySelectorAll("#view .dw")].map(e => ({e, prio:+e.dataset.prio}));
    const since = $("slBox"); if (since) cards.push({e:since, prio:10});          // the "since you were last here" banner (f06)
    if (!cards.length) return;
    cards.sort((a, b) => a.prio - b.prio);
    const area = document.createElement("div"); area.id = "dwArea";
    cards.forEach(c => area.appendChild(c.e));
    const root = $("view"), paste = $("spBox");
    root.insertBefore(area, paste ? paste.nextSibling : root.firstChild);
  });
})();
