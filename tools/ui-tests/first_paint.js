// The first Dashboard paint must already be right: a step that is overdue is listed in the Today card only, not again in Needs attention.
// (Regression: the page was first drawn before the feature scripts had loaded, and the later render was skipped because the data had not changed.)
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
// steps that the Today card lists must not come back in Needs attention (an Offer's step is not in Today, so it may be there)
const dueInAttention=(p)=>p.evaluate((()=>{ const rows=[...document.querySelectorAll('.td-t')].map(e=>e.textContent); return [...document.querySelectorAll('.att-t')].filter(a=>/was due/.test(a.textContent)&&state.data.apps.some(ap=>a.textContent.includes(ap.company)&&rows.some(r=>r.includes(ap.company)))).length; }));
(async()=>{
 let r=await launch(); let p=r.p;
 t((await p.evaluate(()=>document.querySelectorAll('[data-tk]').length))>0,'the Today card lists overdue steps');
 t((await dueInAttention(p))===0,'first paint: overdue steps are not repeated in Needs attention');
 t(r.errs.length===0,'no page errors'); await r.b.close();
 r=await launch({prefs:{dwHidden:['today']}}); p=r.p;
 t(await p.evaluate(()=>{const e=document.getElementById('dw_today'); return !!e && e.hidden;}),'Today hidden: the Today card is hidden');
 t(await p.evaluate(()=>[...document.querySelectorAll('.att-t')].filter(e=>/was due/.test(e.textContent)).length)>1,'Today hidden: the overdue steps come back in Needs attention');
 await r.b.close();
 console.log(ok+' passed, '+bad+' failed'); process.exit(bad?1:0); })();
