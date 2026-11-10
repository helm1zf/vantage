// Learn tab: only a plan Arga really wrote shows weeks; without one there is a single honest button, a read error is not "no data yet".
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const GAPS=[{skill:'SQL',count:6,mentioned:[],discussed:'',advice:'Learn joins first'},{skill:'Excel (VBA)',count:3,mentioned:[],discussed:'',advice:''},{skill:'Celonis',count:1,mentioned:[],discussed:'',advice:''}];
const PLAN={skill:'sql',file:'2026-11-01_Rencana_Belajar_SQL.json',weeks:[{title:'Basics',focus:'select',hours:6},{title:'Joins',focus:'inner and outer',hours:8},{title:'Windows',focus:'',hours:8},{title:'Project',focus:'',hours:10},{title:'Tuning',focus:'',hours:4}]};
async function open(extra){ const r=await launch({vp:{width:1300,height:900},extra}); await r.p.click('nav a[data-view="learn"]'); await r.p.waitForTimeout(500); return r; }
(async()=>{
 let r=await open({skill_gaps:GAPS,learn_plans:[]}); let p=r.p;
 let txt=await p.evaluate(()=>document.getElementById('view').innerText);
 t(!/\b1 ads\b/.test(txt),'singular: never "1 ads"');
 t(!/Foundations|Core skills|20 percent/i.test(txt),'no invented weeks without a plan');
 t(!/of the ads you analysed ask for this/i.test(txt),'no claim about the level the ads ask for');
 t(await p.evaluate(()=>document.querySelectorAll('.lh-w').length===0),'no week list without a plan');
 t(await p.evaluate(()=>document.querySelectorAll('#view .btn.primary').length===1&&!!document.getElementById('lhPlan')),'one accent button: ask Arga for a plan');
 t(await p.evaluate(()=>!document.getElementById('lhPack')),'no study pack button without a plan');
 t(/no plan yet/i.test(txt),'the list says no plan yet'); await r.b.close();
 r=await open({skill_gaps:GAPS,learn_plans:[PLAN]}); p=r.p;
 txt=await p.evaluate(()=>document.getElementById('view').innerText);
 t(await p.evaluate(()=>[...document.querySelectorAll('.lh-w b')].map(b=>b.textContent).join('|'))==='Week 1: Basics|Week 2: Joins|Week 3: Windows','the weeks are the plan\'s own (job-ready = first 60%: 3 of 5)');
 t(/plan ready/i.test(txt)&&/no plan yet/i.test(txt),'SQL has a plan, Excel does not: matched by the skill name inside the plan');
 t(await p.evaluate(()=>!!document.querySelector('.lh-mk')),'the market marker is shown');
 t(await p.evaluate(()=>document.querySelectorAll('#view .btn.primary').length===1&&document.querySelector('#view .btn.primary').id==='lhPack'),'with a plan the one accent button builds the pack');
 await p.click('[data-lhlv="hero"]'); await p.waitForTimeout(200);
 t(await p.evaluate(()=>document.querySelectorAll('.lh-w').length===5),'hero shows all 5 weeks'); await r.b.close();
 r=await open({skill_gaps:{__throw:'boom'},learn_plans:[]}); p=r.p;
 txt=await p.evaluate(()=>document.getElementById('view').innerText);
 t(/could not be read/i.test(txt)&&!/No skill gaps recorded/i.test(txt),'a read error is not shown as "no data yet"');
 t(!!(await p.$('#lhRetry')),'and offers a retry'); await r.b.close();
 // Skills tab: plan matching by the skill name inside the plan (Java is not JavaScript; ae/ä are the same), errors are not "empty"
 const G2=[{skill:'Java',count:5,mentioned:[],discussed:'',advice:''},{skill:'Präsentationstechnik',count:3,mentioned:[],discussed:'',advice:''},{skill:'SQL',count:2,mentioned:[],discussed:'',advice:''}];
 const PF=[{path:'2026-11-01_Rencana_Belajar_JavaScript.pdf',section:'',kb:1,modified:5},{path:'2026-11-01_Rencana_Belajar_JavaScript.json',section:'',kb:1,modified:5},{path:'2026-11-02_Rencana_Belajar_Praesentationstechnik.pdf',section:'',kb:1,modified:6}];
 const JP=[{skill:'JavaScript',file:'2026-11-01_Rencana_Belajar_JavaScript.json',weeks:[{title:'a',focus:'',hours:1}]},{skill:'Praesentationstechnik',file:'2026-11-02_Rencana_Belajar_Praesentationstechnik.json',weeks:[{title:'a',focus:'',hours:1}]}];
 r=await launch({vp:{width:1300,height:900},extra:{skill_gaps:G2,learn_plans:JP,dir_files:PF}}); p=r.p;
 await p.click('nav a[data-view="skill"]'); await p.waitForTimeout(600);
 const rows=await p.evaluate(()=>[...document.querySelectorAll('#skBody tr')].map(tr=>tr.innerText.replace(/\s+/g,' ').trim()));
 const row=(n)=>rows.find(x=>x.startsWith(n))||'';
 t(!/plan ready/i.test(row('Java ')),'Java does not get the JavaScript plan: '+row('Java '));
 t(/plan ready|plan/i.test(row('Präsentationstechnik'))&&!/no plan|not yet/i.test(row('Präsentationstechnik')),'Präsentationstechnik finds the Praesentationstechnik plan: '+row('Präsentationstechnik'));
 await r.b.close();
 r=await launch({vp:{width:1300,height:900},extra:{skill_gaps:{__throw:'boom'}}}); p=r.p;
 await p.click('nav a[data-view="skill"]'); await p.waitForTimeout(600);
 t(await p.evaluate(()=>/could not be read/i.test(document.getElementById('view').innerText)&&!!document.getElementById('skRetry')),'Skills tab: a read error says so and offers a retry'); await r.b.close();
 console.log(`learn: ${ok} ok, ${bad} bad`); process.exit(bad?1:0);
})();
