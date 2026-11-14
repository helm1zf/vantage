// Data honesty: a damaged tracker file is said out loud (with what the app did), and the Applications tab never shows an empty or guessed
// tracker as if it were fine.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
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
    if (prob==='damaged') {
     t(await p.evaluate(()=>{const b=document.querySelector('#appsProblem .btn'); return !!b&&b.dataset.agent==='arga'&&!!b.dataset.say&&b.dataset.send==='1';}),mode+': '+prob+' warning has a button that really asks Arga');
     const say=await p.evaluate(()=>document.querySelector('#appsProblem .btn').dataset.say);
     t(/applications\.last_good\.json/.test(say),mode+': the message names the backup file');
    } else {
     // a good copy exists: the app puts it back itself, no chat (before 0.11.1 this asked Arga)
     await p.evaluate(()=>{ window.__extra=Object.assign(window.__extra||{},{restore_tracker:'applications.damaged_2026-11-14.json'}); });
     await p.click('#btnTrackerRestore'); await p.waitForTimeout(500);
     const c=await p.evaluate(()=>({restore:window.__calls.filter(c=>c.cmd==='restore_tracker').length, sent:window.__calls.filter(c=>c.cmd==='nova_send').length, toast:document.getElementById('toastMsg').textContent}));
     t(c.restore===1&&c.sent===0&&/damaged_2026-11-14/.test(c.toast),mode+': restored tracker: the button restores the last good copy in the app and sends no message ('+JSON.stringify(c)+')');
    }
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
 t(!!nd&&!nd.chat&&!nd.say,'the interview date row sends nothing to a chat');
 // the row opens a small form; the app writes the date itself
 const q=rd.p; await q.evaluate(()=>goView('dash')); await q.waitForTimeout(400);
 await q.click('[data-ivdate]'); await q.waitForTimeout(300);
 t(await q.evaluate(()=>/Nodate GmbH/.test(document.getElementById('dlgSheet').innerText)&&!!document.getElementById('dlgIn')),'interview date: the row opens a form that names the company');
 await q.fill('#dlgIn','next friday'); await q.click('#dlgOk'); await q.waitForTimeout(400);
 t(await q.evaluate(()=>window.__calls.filter(c=>c.cmd==='set_next_step').length===0&&/2026-11-20/.test(document.getElementById('toastMsg').textContent)),'interview date: something that is not a date is refused with an example');
 await q.click('[data-ivdate]'); await q.waitForTimeout(300); await q.fill('#dlgIn','20.11.2026 14.30'); await q.click('#dlgOk'); await q.waitForTimeout(500);
 const sv=await q.evaluate(()=>({set:window.__calls.filter(c=>c.cmd==='set_next_step').map(c=>c.args), sent:window.__calls.filter(c=>c.cmd==='nova_send').length}));
 t(sv.set.length===1&&sv.set[0].id==='9'&&sv.set[0].due==='2026-11-20'&&sv.set[0].next==='Interview 14:30'&&sv.sent===0,'interview date: the app saves date and time as the next step and sends no message ('+JSON.stringify(sv)+')');
 await rd.b.close();
 console.log(`data: ${ok} ok, ${bad} bad`); process.exit(bad?1:0);
})();
