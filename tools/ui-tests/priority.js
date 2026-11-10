// Hierarchy per tab (owner rule): the most eye-catching thing is the most important one, at most ONE accent button per screen.
// Applications: what is late comes first, the List can be searched and filtered, status can be changed. Interview: one accent button and the date.
// Profile: one accent only when the Master CV needs work. Dates are relative to today (tests never depend on the calendar).
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
const day=(n)=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const A=(id,company,status,due,over={})=>({id,company,company_full:company+' GmbH',role:'Data Analyst',status,type:'Full-time',location:'Berlin',fit:70,date:day(-9),status_date:day(-3),next:due?'Follow up':'',due:due||'',prep:false,folder:'f'+id,...over});
const APPS=[A(1,'Alpha','Applied',day(-5)),A(2,'Beta','Interview R1',day(2),{prep:true}),A(3,'Gamma','Interview R2',day(1),{prep:true}),A(4,'Delta','Applied',day(6)),A(5,'Epsilon','Rejected',day(-20))];
const prim=(p)=>p.evaluate(()=>[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent).length);
async function open(view,scan,vp){ const r=await launch({vp:vp||{width:1300,height:900},scan}); await r.p.click(`nav a[data-view="${view}"]`); await r.p.waitForTimeout(500); return r; }
(async()=>{
 // ---- Applications
 let r=await open('apps',{apps:APPS}), p=r.p;
 let strip=await p.evaluate(()=>[...document.querySelectorAll('.panel.overdue .ovrow')].map(x=>x.innerText.replace(/\s+/g,' ')));
 t(strip.length===1&&/Alpha/.test(strip[0]),'only the live overdue step is in the strip (a closed application is not): '+strip.join('|'));
 t(await prim(p)===0,'Applications board: no accent button competes with the overdue strip');
 const sz=await p.evaluate(()=>{const h=document.querySelector('.panel.overdue .head h2'),c=getComputedStyle(h).color,a=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(); return {c,a};});
 t(sz.c!==sz.a,'the warning colour is not the accent colour');
 await p.click('.ovrow'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>!document.getElementById('drawer').hidden&&/Alpha/.test(document.getElementById('drawer').innerText)),'clicking the overdue row opens that application'); await p.click('#drClose');
 await p.click('[data-amode="list"]'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>document.querySelectorAll('.arow').length)===5,'list shows all 5');
 t(await p.evaluate(()=>[...document.querySelectorAll('.arow.overdue')].map(x=>x.innerText).join('').includes('Alpha')&&document.querySelectorAll('.arow.overdue').length===1),'only Alpha is marked late in the list');
 await p.fill('#listQ','bet'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('.arow').length)===1,'search narrows the list');
 t(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='listQ'),'the search box keeps focus while typing');
 await p.fill('#listQ','zzz'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>/No application matches/i.test(document.getElementById('view').innerText)),'no match says so');
 await p.fill('#listQ',''); await p.selectOption('#listStatus','Applied'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('.arow').length)===2,'status filter');
 await p.selectOption('#sortBy','due'); await p.selectOption('#listStatus',''); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelector('.arow b').textContent)==='Epsilon','sort by next-step due puts the oldest first');
 await p.click('.arow'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>!!document.getElementById('drMove')&&document.querySelectorAll('#drMoveTo option').length>=3),'the drawer can change the status');
 t(await prim(p)===0,'list: still no accent button'); await r.b.close();
 r=await open('apps',{apps:APPS.map(a=>({...a,due:day(5)}))}); t(!(await r.p.$('.panel.overdue')),'nothing late = no strip'); await r.b.close();
 // ---- Interview
 r=await open('interview',{apps:APPS}); p=r.p;
 t(await prim(p)===1,'Interview: exactly one accent button');
 const first=await p.evaluate(()=>{const c=document.querySelector('.ivlay .card'); return {t:c.innerText.replace(/\s+/g,' '),prim:!!c.querySelector('.btn.primary'),cards:document.querySelectorAll('.ivlay .card').length};});
 t(first.prim&&/Gamma/.test(first.t),'the soonest interview (Gamma, tomorrow) is first and owns the accent: '+first.t.slice(0,60));
 t(first.cards===2,'two interview cards');
 t(await p.evaluate(()=>/\d\d\.\d\d/.test(document.querySelector('.ivlay .card .ivdate').textContent)),'the interview date is shown'); await r.b.close();
 // ---- Profile
 for (const [lab,scan,want] of [['no Master CV',{cv_modified:0},1],['outdated Master CV',{cv_modified:1000,raw_facts_modified:99999},1],['fresh Master CV',{cv_modified:99999,raw_facts_modified:1000},0]]) {
  r=await open('profil',scan); p=r.p;
  t(await prim(p)===want,'Profile ('+lab+'): accent buttons = '+want);
  if (want) t(await p.evaluate(()=>{const b=document.querySelector('#view .btn.primary'); return b.dataset.chat==='lamaran'&&b.dataset.agent==='bayu'&&b.dataset.send==='1'&&!!b.dataset.say;}),'Profile ('+lab+'): the button really asks the agent');
  await r.b.close();
 }
 // ---- narrow window
 r=await open('apps',{apps:APPS},{width:900,height:700}); p=r.p;
 t(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),'Applications fits a narrow window without sideways scrolling');
 await r.b.close();
 console.log(`priority.js: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
