// Settings: theme, language and reminders live on ONE page (dropdowns), not as corner buttons; updating is only the top-right button.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
(async()=>{
 const r=await launch({vp:{width:1300,height:900}}), p=r.p;
 t(await p.evaluate(()=>!document.getElementById('btnTheme')&&!document.getElementById('btnLang')&&!document.getElementById('langMenu')),'no theme or language buttons in the corner');
 t(await p.evaluate(()=>!document.getElementById('updPill')&&!document.getElementById('appUpd')&&!!document.getElementById('btnUpdate')),'one update control: the top-right button');
 await p.click('nav a[data-view="settings"]'); await p.waitForTimeout(400);
 t(await p.evaluate(()=>document.getElementById('title').textContent.trim()==='Settings'),'the page is titled Settings');
 t(await p.evaluate(()=>['stTheme','stLang','stBackup','stTour'].every(i=>document.getElementById(i)&&document.getElementById(i).tagName==='SELECT')),'choices are dropdowns');
 t(await p.evaluate(()=>document.querySelectorAll('#view .btn.primary').length===0),'Settings has no accent button');
 await p.selectOption('#stTheme','dark'); t(await p.evaluate(()=>document.documentElement.dataset.theme==='dark'&&prefs.theme==='dark'),'theme applies and is saved');
 await p.selectOption('#stTheme','light'); t(await p.evaluate(()=>document.documentElement.dataset.theme==='light'),'light again');
 await p.selectOption('#stBackup','off'); t(await p.evaluate(()=>prefs.backupOff===true),'backup reminder can be switched off');
 await p.selectOption('#stBackup','on'); t(await p.evaluate(()=>prefs.backupOff===false),'and back on (it was a one-way link before)');
 await p.selectOption('#stTour','off'); t(await p.evaluate(()=>prefs.tourOff===true),'tutorial off'); await p.selectOption('#stTour','on');
 await p.evaluate(()=>{ prefs.dwHidden=['today']; }); await p.click('#stCards'); t(await p.evaluate(()=>Array.isArray(prefs.dwHidden)&&prefs.dwHidden.length===0),'hidden dashboard cards come back');
 await p.click('#stMorning'); await p.waitForTimeout(300); t(await p.evaluate(()=>state.view==='laporan'),'the Morning report button opens it');
 await p.click('nav a[data-view="settings"]'); await p.selectOption('#stLang','de'); await p.waitForTimeout(400);
 t(await p.evaluate(()=>lang==='de'&&prefs.lang==='de'&&/Darstellung/.test(document.getElementById('view').innerText)),'language changes the page at once and is saved');
 t(!r.errs.length,'no page errors: '+r.errs.join('|'));
 await r.b.close();
 console.log(`settings.js: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
