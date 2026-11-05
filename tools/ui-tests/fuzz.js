const {launch}=require('./harness.js');
const SKIP=/remove|delete|trash|hapus|entfernen|restart|update now|do not remind|hide|sembunyi/i;
(async()=>{ const r=await launch({prefs:{lang:'en',seen:{at:Date.now(),day:'x',apps:{},reps:[],inbox:0}}}); const p=r.p; let clicks=0, problems=[];
 await p.evaluate(()=>{ __TAURI__.dialog={open:async()=>null}; window.__extra={run_kit_script:'{}',master_cv:{files:[]}}; state.data.inbox=[1,2,3].map(i=>({name:'f'+i,kb:1})); });
 for (const v of ['dash','inbox','laporan','apps','interview','profil','skill','learn']){
  await p.click(`nav a[data-view="${v}"]`).catch(()=>{}); await p.waitForTimeout(600);
  const n=await p.evaluate(()=>document.querySelectorAll('#view button, #view [data-go], #view .card[data-id], #view .seg, #view .chip, #view [data-open]').length);
  for (let i=0;i<Math.min(n,60);i++){
   await p.click(`nav a[data-view="${v}"]`).catch(()=>{}); await p.waitForTimeout(120);
   const info=await p.evaluate((i)=>{ const els=[...document.querySelectorAll('#view button, #view [data-go], #view .card[data-id], #view .seg, #view .chip, #view [data-open]')]; const e=els[i]; if(!e) return null; e.setAttribute('data-fz','1'); return (e.textContent||e.className||e.tagName).trim().replace(/\s+/g,' ').slice(0,40); },i);
   if(!info||SKIP.test(info)) continue;
   const before=r.errs.length;
   await p.click('[data-fz="1"]',{timeout:1500,force:true}).catch(()=>{}); clicks++; await p.waitForTimeout(120);
   await p.keyboard.press('Escape'); await p.evaluate(()=>{ const d=document.getElementById('dlg'); if(d&&!d.hidden){ const n=document.getElementById('dlgNo')||document.getElementById('dlgOk'); if(n) n.click(); } if(typeof closeApp==='function') closeApp(); document.querySelectorAll('[data-fz]').forEach(x=>x.removeAttribute('data-fz')); });
   if(r.errs.length>before) problems.push(v+': '+info+' -> '+r.errs.slice(before).join(' | '));
  }
 }
 console.log('clicks',clicks); console.log(problems.length?problems.join('\n'):'no errors from any click'); await r.b.close(); process.exit(problems.length?1:0); })();
