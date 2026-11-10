// The feature registry check (CLAUDE.md rules 2 and 3), enforced on the real pages: every button that sends a message to an agent really sends it
// (data-send or data-draft, never a copy-paste leftover), and the agent NAMED on a button is the agent that really answers it.
// Also: a request handed to another chat with "Continue in ..." is done there; it is not redirected a second time.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const NAMES=['Nova','Raka','Arga','Bayu','Tari','Sinta','Laras']; const OWN={raka:'Raka',laras:'Laras',nova:'Nova'};
const SCAN=()=>[...document.querySelectorAll('[data-say]')].filter(e=>e.offsetParent!==null||e.closest('.att')).map(e=>({label:(e.innerText||e.textContent).replace(/\s+/g,' ').trim(),chat:e.dataset.chat||'',agent:e.dataset.agent||'',send:e.dataset.send,draft:e.dataset.draft}));
(async()=>{
 const rep={date:'2026-11-09',text:'x',data:null}; 
 for (const v of ['dash','apps','inbox','laporan','interview','profil','skill','learn','offers']) for (const lang of ['en','de','id']) {
  const r=await launch({vp:{width:1400,height:1000}}); const p=r.p;
  await p.evaluate((l)=>{ lang=l; },lang);
  await p.click(`nav a[data-view="${v}"]`).catch(()=>{}); await p.waitForTimeout(700);
  const found=await p.evaluate(SCAN);
  for (const b of found) {
   t(!!(b.send||b.draft),`${v}/${lang}: "${b.label}" must send or draft its message (no copy-paste leftovers)`);
   const named=NAMES.filter(n=>new RegExp('\\b'+n+'\\b').test(b.label));
   const real=b.agent?b.agent[0].toUpperCase()+b.agent.slice(1):(OWN[b.chat]||'');
   if (named.length===1 && real) t(named[0]===real,`${v}/${lang}: "${b.label}" names ${named[0]} but ${real} answers`);
  }
  await r.b.close();
 }
 // hand-over: "Continue in Raka" does not send the request back
 const r=await launch({vp:{width:1300,height:900}}); const p=r.p; const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{ const m={role:'user',text:'sort my files',at:Date.now()}; novaSt('nova').msgs.push(m, {role:'nova',text:'That is Raka\'s job. [[pindah:raka]]',at:Date.now()}); });
 await ev(()=>{ nova.handed='raka'; });
 await ev(async()=>{ novaSt('raka').run=null; await novaSend('sort my files',{chat:'raka'}); }); await p.waitForTimeout(500);
 let ns=(await ev(()=>__calls.filter(x=>x.cmd==='nova_send').map(x=>x.args))).pop();
 t(ns&&/handed over to you/.test(ns.context)&&!/\[\[pindah/.test(ns.context),'a handed-over request is done in the receiving chat, with no second redirect');
 await ev(()=>{ novaSt('raka').run=null; }); await ev(async()=>{ await novaSend('another thing',{chat:'raka'}); }); await p.waitForTimeout(500);
 ns=(await ev(()=>__calls.filter(x=>x.cmd==='nova_send').map(x=>x.args))).pop();
 t(ns&&!/handed over to you/.test(ns.context)&&/\[\[pindah/.test(ns.context),'the next ordinary message gets the normal rules again');
 console.log(`registry: ${ok} ok, ${bad} bad`); await r.b.close(); process.exit(bad?1:0);
})();
