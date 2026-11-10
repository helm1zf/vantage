// Offers tab (audit): honest scoring, nothing that cannot be undone, no lost focus, no empty-table.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const A=(id,company,status)=>({id,company,company_full:company+' GmbH',role:'Data Analyst',status,type:'Full-time',location:'Berlin',fit:80,date:'2026-10-01',status_date:'2026-10-20',next:'',due:'',prep:false,folder:'f'+id});
async function open(apps,vp){ const r=await launch({vp:vp||{width:1300,height:900},scan:{apps}}); await r.p.waitForTimeout(500); if (await r.p.$('nav a[data-view="offers"]')) await r.p.click('nav a[data-view="offers"]'); await r.p.waitForTimeout(400); return r; }
(async()=>{
 let r=await open([A(1,'Alpha','Offer'),A(2,'Beta','Offer')]), p=r.p;
 t(await p.evaluate(()=>document.querySelectorAll('.of tr.win').length===0&&!document.querySelector('.badge2')),'no winner is named while no offer has any numbers (all-zero tie is not "best fit")');
 await p.fill('[data-ofk="app1"][data-off="gross"]','3000'); await p.fill('[data-ofk="app1"][data-off="hours"]','40'); await p.press('[data-ofk="app1"][data-off="hours"]','Tab'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('.of tr.win').length===0),'one offer with numbers and one without: still no winner (nothing to compare)');
 t(await p.evaluate(()=>document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.off==='remote'),'Tab moves on to the next field (focus is not lost when a value is saved): '+await p.evaluate(()=>document.activeElement&&(document.activeElement.dataset.off||document.activeElement.tagName)));
 await p.fill('[data-ofk="app2"][data-off="gross"]','2000'); await p.fill('[data-ofk="app2"][data-off="hours"]','40'); await p.press('[data-ofk="app2"][data-off="hours"]','Tab'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('.of tr.win').length===1&&document.querySelector('.of tr.win').dataset.ofrow==='app1'),'with numbers for both, the better paid one wins');
 await p.click('#ofAdd'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('[data-ofdel]').length===1),'a hand-made offer can be removed');
 await p.click('[data-ofdel]'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('[data-ofdel]').length===0&&Object.keys(prefs.offers||{}).filter(k=>k.startsWith('man')).length===0),'removing it really deletes it');
 t(await p.evaluate(()=>{ const x=document.querySelector('[data-ofk="app1"][data-off="gross"]'); return !!x&&x.min==='0'; }),'numbers cannot be negative');
 t(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'fits the window');
 t(!r.errs.length,'no page errors: '+r.errs.join('|')); await r.b.close();
 // no offers left: the page says so instead of an empty table
 r=await open([A(1,'Alpha','Applied')]); p=r.p;
 await p.evaluate(()=>{ goView('offers'); }); await p.waitForTimeout(300);
 t(await p.evaluate(()=>state.view!=='offers'||/No offer/i.test(document.getElementById('view').innerText)),'with no offers the page says so (or the tab is not offered)'); 
 t(!r.errs.length,'no page errors (no offers): '+r.errs.join('|')); await r.b.close();
 console.log(`offers.js: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
