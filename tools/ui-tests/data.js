// Data honesty: a damaged tracker file is said out loud (with what the app did), and the Applications tab never shows an empty or guessed
// tracker as if it were fine.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
async function open(scan){ const r=await launch({vp:{width:1300,height:900},scan}); await r.p.click('nav a[data-view="apps"]'); await r.p.waitForTimeout(500); return r; }
(async()=>{
 for (const mode of ['board','list']) {
  for (const [prob, re] of [['',null],['restored',/last good copy/i],['damaged',/no good copy/i]]) {
   const r=await open({apps_problem:prob}); const p=r.p;
   if (mode==='list') { await p.click('[data-amode="list"]').catch(()=>{}); await p.waitForTimeout(300); }
   const txt=await p.evaluate(()=>document.getElementById('view').innerText);
   if (!prob) t(!(await p.$('#appsProblem')),mode+': a healthy tracker shows no warning');
   else {
    t(!!(await p.$('#appsProblem'))&&re.test(txt),mode+': '+prob+' tracker says so');
    t(await p.evaluate(()=>{const b=document.querySelector('#appsProblem .btn'); return !!b&&b.dataset.agent==='arga'&&!!b.dataset.say&&b.dataset.send==='1';}),mode+': '+prob+' warning has a button that really asks Arga');
    const say=await p.evaluate(()=>document.querySelector('#appsProblem .btn').dataset.say);
    t(/applications\.last_good\.json/.test(say),mode+': the message names the backup file');
   }
   t(!/undefined|NaN|\[object/.test(txt),mode+': no undefined on the page');
   await r.b.close();
  }
 }
 // empty tracker text points at what really exists
 const r=await open({apps:[]}); await r.p.click('[data-amode="list"]').catch(()=>{}); await r.p.waitForTimeout(300);
 const e=await r.p.evaluate(()=>document.getElementById('view').innerText);
 t(!/Send a job posting to Nova/i.test(e),'the empty tracker does not send people to Nova'); await r.b.close();
 // an interview with no date is asked for on the Dashboard, and the button really asks Arga (a draft the user completes)
 const ND=[{id:'9',name:'Nodate GmbH',company:'Nodate GmbH',role:'Analyst',status:'Interview',fit:.8,date:new Date().toISOString().slice(0,10),next:'',due:'',folder:'',stage:'',missing:false,prep:false}];
 const rd=await launch({vp:{width:1300,height:900},scan:{apps:ND}}); await rd.p.waitForTimeout(600);
 const att=await rd.p.evaluate(()=>{ const h=document.createElement('div'); h.innerHTML=attention(state.data); return [...h.querySelectorAll('.att')].map(e=>({t:e.textContent.replace(/\s+/g,' '),chat:e.dataset.chat,agent:e.dataset.agent,say:e.dataset.say,draft:e.dataset.draft})); });
 const nd=att.find(a=>/Nodate GmbH/.test(a.t));
 t(!!nd&&/interview date missing/i.test(nd.t),'Dashboard asks for the missing interview date: '+JSON.stringify(att.map(a=>a.t)));
 t(!!nd&&nd.agent==='arga'&&nd.chat==='lamaran'&&/Nodate GmbH/.test(nd.say||'')&&nd.draft==='1','its button opens a draft to Arga that names the company'); await rd.b.close();
 console.log(`data: ${ok} ok, ${bad} bad`); process.exit(bad?1:0);
})();
