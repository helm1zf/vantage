// F12 Theme: Light, Dark or Automatic (follows the computer), chosen in Settings. The choice is remembered.
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
`);
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const saved = () => { try { return localStorage.getItem("vantage.theme"); } catch { return null; } };
  const mode = () => (prefs && prefs.theme) || saved() || "system";
  const setAttr = () => { const m = mode(); document.documentElement.dataset.theme = m === "dark" || (m === "system" && mq.matches) ? "dark" : "light"; };
  function apply(){ setAttr(); }
  window.vantageThemeMode = mode;
  window.vantageSetTheme = (m) => {
    if (!["system", "light", "dark"].includes(m)) return;
    try { localStorage.setItem("vantage.theme", m); } catch {}
    savePref("theme", m); apply();
  };
  setAttr();                                                    // before the first paint, so there is no flash
  mq.addEventListener("change", apply);
  vhook(() => apply());
})();
