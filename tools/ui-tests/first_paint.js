// The first Dashboard paint must already be right: every step that is due or overdue is listed in Needs attention exactly once, and the cards
// that were taken off the Dashboard (Today, Customize, backup reminder) are not there, with or without an old "hidden cards" setting.
// (Regression: the page was first drawn before the feature scripts had loaded, and the later render was skipped because the data had not changed.)
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
// what the data says is due today or earlier, and how often each of those companies is named in Needs attention
const due=(p)=>p.evaluate(()=>{ const steps=dueSteps(state.data.apps,{},iso(new Date())); const rows=[...document.querySelectorAll('.att-t')].map(e=>e.textContent);
  return {n:steps.length, counts:steps.map(s=>rows.filter(r=>r.includes(s.who)&&/was due|due today|you start|today,|tomorrow,|in \d+ days,/.test(r)).length)}; });
(async()=>{
 for(const [name,prefs] of [['first paint',{}],['old "hidden cards" setting',{dwHidden:['today','backup']}]]){
  const r=await launch({prefs}); const p=r.p; const d=await due(p);
  t(d.n>0,name+': the mock data has steps that are due');
  t(d.counts.every(c=>c===1),name+': every due step is in Needs attention exactly once ('+d.counts.join(',')+')');
  t(await p.evaluate(()=>!document.getElementById('dw_today')&&!document.getElementById('dwCust')&&!document.getElementById('dw_backup')&&!document.getElementById('dwBar')),name+': no Today card, no Customize bar and no backup card on the Dashboard');
  t(await p.evaluate(()=>!!document.getElementById('tdBlock')),name+': the to-do block is there');
  t(r.errs.length===0,name+': no page errors '+r.errs.join('|')); await r.b.close();
 }
 console.log(ok+' passed, '+bad+' failed'); process.exit(bad?1:0); })();
