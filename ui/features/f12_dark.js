// F12 Theme: Light, Dark or Automatic (follows the computer), from the button next to "?". The choice is remembered.
(function(){
  const D = 'html[data-theme="dark"]';
  VK.css("dark", `${D}{--housing:#1B1A18;--panel:#252320;--field:#2E2C28;--ink:#ECE8DF;--muted:#9C9889;--line:rgba(236,232,223,.14);--fieldLine:rgba(236,232,223,.3);--lcd:#0F0E0D;--lcdText:#EDE9DF;--lcdMuted:#8F8B80}
  ${D} body{color-scheme:dark}${D} nav a:hover,${D} .tbtn:hover{background:rgba(236,232,223,.07)}${D} .btn:active{background:rgba(236,232,223,.12)}
  ${D} .card,${D} .field,${D} input,${D} textarea,${D} select{background:var(--field);color:var(--ink)}${D} ::placeholder{color:var(--muted)}
  ${D} .st-draft{background:#4a4020;color:#f0d98a;border-color:#6b5a26}${D} .st-applied{background:#1f3550;color:#a9cbf0;border-color:#2f4f75}
  ${D} .st-int{background:#3a2f58;color:#cdbdf2;border-color:#52437c}${D} .st-offer{background:#1f4630;color:#a5dfb6;border-color:#2f6a46}
  ${D} .st-rej{background:#52282a;color:#f1b1ab;border-color:#7a3b3b}${D} .st-wd{background:#36342f;color:#b8b4a9;border-color:#4a4741}${D} .st-nr{background:#4b3a1c;color:#ecc98e;border-color:#6d552a}
  ${D} .upc.late{background:#52282a;border-color:#7a3b3b;color:#f1b1ab}${D} .miss{background:#3a2423;border-color:#7a3b3b}${D} .rw .late,${D} .lp-run.late{color:#f1a39b}
  ${D} .k-interview,${D} .k-mulai_kerja{background:#2e2744;border-color:#52437c;color:#cdbdf2}${D} .k-belum_dijawab{background:#44361a;border-color:#6d552a;color:#ecc98e}
  #btnTheme svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round}`);
  const ICON = {
    light:'<circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
    dark:'<path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8z"/>',
    system:'<rect x="2" y="3" width="12" height="8.5" rx="1.2"/><path d="M5.5 14h5M8 11.5V14"/>'};
  const NAME = () => ({light:ft("Light", "Hell", "Terang"), dark:ft("Dark", "Dunkel", "Gelap"), system:ft("Automatic", "Automatisch", "Otomatis")});
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const saved = () => { try { return localStorage.getItem("vantage.theme"); } catch { return null; } };
  const mode = () => (prefs && prefs.theme) || saved() || "system";
  const setAttr = () => { const m = mode(); document.documentElement.dataset.theme = m === "dark" || (m === "system" && mq.matches) ? "dark" : "light"; };
  function apply(){
    setAttr();
    const b = $("btnTheme"); if (!b) return;
    b.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${ICON[mode()]}</svg>`;
    b.title = ft("Theme: ", "Design: ", "Tema: ") + NAME()[mode()]; b.setAttribute("aria-label", b.title);
  }
  function cycle(){
    const next = {system:"light", light:"dark", dark:"system"}[mode()];
    try { localStorage.setItem("vantage.theme", next); } catch {}
    savePref("theme", next); apply(); toast(ft("Theme: ", "Design: ", "Tema: ") + NAME()[next]);
  }
  setAttr();                                                    // before the first paint, so there is no flash
  mq.addEventListener("change", apply);
  vhook(() => {
    if (!$("btnTheme")){
      const tools = document.querySelector(".tools"), help = $("btnTour"); if (!tools || !help) return;
      const b = document.createElement("button"); b.className = "tbtn"; b.id = "btnTheme"; b.onclick = cycle; tools.insertBefore(b, help);
    }
    apply();
  });
})();
