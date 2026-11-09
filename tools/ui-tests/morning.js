// Morning report page: one control card, one accent button, tabs instead of one long scroll, no "undefined"/"Invalid Date",
// and a daily schedule that is a real OS task (the page only shows and changes it; it never runs a timer of its own).
// Mock data has fixed dates relative to today, so nothing here depends on the calendar.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
const SCHED=(o)=>Object.assign({supported:true,registered:true,time:'07:00',last_end:0,last_ok:true,last_error:'',next:Math.floor(Date.now()/1000)+3600*5},o||{});
async function open(opts,sched){
  const r=await launch(opts); const p=r.p; await p.evaluate((s)=>{ window.__extra=Object.assign(window.__extra||{},{sched_status:s,sched_set:null}); },sched||SCHED());
  await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(900); return r;
}
(async()=>{
 // 1. sparse report data never leaks "undefined" / "Invalid Date" / "NaN" and never shows empty Fit/Gap/Action rows
 let r=await open({vp:{width:1400,height:1000}}); let p=r.p; const ev=(f,a)=>p.evaluate(f,a);
 const txt=await ev(()=>document.getElementById('view').innerText);
 for (const bad of ['undefined','Invalid Date','NaN','null']) t(!txt.includes(bad),'no "'+bad+'" on the page');
 t(await ev(()=>![...document.querySelectorAll('#view .rwhy')].some(e=>!e.textContent.replace(/Fit|Gap|Action|Status/,'').trim())),'no Fit/Gap/Action row without text');
 // 2. one control card (search + schedule together), the old separate schedule bar is gone, no in-app timer
 t(await ev(()=>!document.getElementById('schBar')),'the separate schedule bar is gone');
 t(await ev(()=>document.querySelectorAll('#lpBar').length===1&&!!document.querySelector('#lpBar .lp-sched')),'search and schedule share one card');
 t(await ev(()=>typeof window.__schedTick==='undefined'),'the page has no timer of its own that runs the search');
 // 3. one accent button: today's report has recommendations, so the top one owns it
 const prim=await ev(()=>[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent).map(b=>({t:b.textContent.trim(),inRec:!!b.closest('.rrec'),first:b===document.querySelector('.rrec .btn.primary')})));
 t(prim.length===1,'exactly one accent button ('+prim.map(x=>x.t).join(',')+')'); t(prim[0]&&prim[0].inRec&&prim[0].first,'it is the top recommendation\'s button');
 t(await ev(()=>!document.getElementById('btnLpRun').classList.contains('primary')),'Find jobs now is quiet while there is a recommendation to act on');
 // 4. tabs, and the search description is out of the way on the first tab
 const tabs=await ev(()=>[...document.querySelectorAll('.rtabs [data-rtab]')].map(b=>b.dataset.rtab));
 t(tabs.join('|')==='today|considered|search','report tabs: '+tabs.join('|'));
 t(await ev(()=>{ const s=document.querySelector('.rsearch'); return !s||s.offsetParent===null; }),'"How Sinta searched" is not on the first tab');
 t(await ev(()=>!!document.querySelector('.rrec')),'recommendations are on the first tab');
 await p.click('.rtabs [data-rtab="search"]',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(300);
 t(await ev(()=>{ const s=document.querySelector('.rsearch'); return !!s&&s.offsetParent!==null; }),'"How Sinta searched" is on the Search tab');
 await p.click('.rtabs [data-rtab="considered"]',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(300);
 t(await ev(()=>!!document.querySelector('.rskip'))&&await ev(()=>!document.querySelector('.rrec')),'Considered tab shows near misses and skipped, not recommendations');
 await p.click('.rtabs [data-rtab="today"]',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(300);
 // 5. the schedule line is honest: next and last run come from the OS status
 const line=await ev(()=>document.querySelector('#lpBar .lp-sched').innerText);
 t(/Next/i.test(line)&&/\d\d:\d\d/.test(line)&&await ev(()=>document.getElementById('schT').value==='07:00'),'the schedule shows the next run and the time: '+line.replace(/\s+/g,' '));
 t(await ev(()=>!!document.querySelector('#lpBar .lp-sched .sw.on')),'the switch is on when the OS task is registered');
 t(!/while Vantage is open/i.test(line),'no "runs while Vantage is open" caveat any more');
 await p.close(); await r.b.close();
 // 6. last run failed: the page says why and offers a retry
 r=await open({vp:{width:1400,height:1000}},SCHED({last_ok:false,last_end:Math.floor(Date.now()/1000)-600,last_error:'Claude Code is not logged in.'})); p=r.p;
 const fl=await p.evaluate(()=>document.querySelector('#lpBar .lp-sched').innerText);
 t(/not logged in/i.test(fl),'a failed run shows its reason: '+fl.replace(/\s+/g,' '));
 t(await p.evaluate(()=>!!document.querySelector('#lpBar .lp-sched [data-act="retry"]')),'a failed run offers Try again');
 await p.close(); await r.b.close();
 // 7. the switch registers / removes the OS task through the backend
 r=await open({vp:{width:1400,height:1000}},SCHED({registered:false})); p=r.p;
 await p.click('#lpBar .lp-sched .sw'); await p.waitForTimeout(500);
 let call=await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='sched_set').pop());
 t(call&&call.args.on===true&&call.args.time==='07:00','switching on calls sched_set with the time ('+JSON.stringify(call&&call.args)+')');
 await p.close(); await r.b.close();
 // 8. a platform without OS scheduling says so instead of showing a switch that does nothing
 r=await open({vp:{width:1400,height:1000}},SCHED({supported:false})); p=r.p;
 t(await p.evaluate(()=>!document.querySelector('#lpBar .lp-sched .sw')),'no switch when the OS cannot schedule');
 await p.close(); await r.b.close();
 // 9. no report yet: Find jobs now is the one accent button
 r=await open({vp:{width:1400,height:1000},reports:false}); p=r.p;
 t(await p.evaluate(()=>[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent).map(b=>b.id).join()==='btnLpRun'),'with no report, Find jobs now is the only accent button');
 await p.close(); await r.b.close();
 // 10. narrow window: nothing runs off the side
 r=await open({vp:{width:760,height:1000}}); p=r.p;
 t(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll at 760px');
 // 11. an old report without JSON is called "Older report", not "legacy format"
 await p.evaluate(()=>{ state.data.reports=[{date:'2025-01-02',text:'# Old report\n\nSome text',pdf:null,data:null}]; render(); }); await p.waitForTimeout(500);
 t(await p.evaluate(()=>!/legacy format/i.test(document.getElementById('view').innerText)&&/older report/i.test(document.getElementById('view').innerText)),'old reports are labelled "older report"');
 await p.close(); await r.b.close();
 // 12. whoever had the old in-app daily search switched on gets the real OS task at start-up, without opening this page
 r=await launch({vp:{width:1400,height:1000},prefs:{sched:{on:true,time:'06:30'}},extra:{sched_status:SCHED({registered:false}),sched_set:null}}); p=r.p; await p.waitForTimeout(800);
 call=await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='sched_set')[0]);
 t(call&&call.args.on===true&&call.args.time==='06:30','an old "on" setting is moved to the OS task at start-up ('+JSON.stringify(call&&call.args)+')');
 await p.close(); await r.b.close();
 // 13. nothing is registered for someone who never switched it on
 r=await launch({vp:{width:1400,height:1000},extra:{sched_status:SCHED({registered:false}),sched_set:null}}); p=r.p; await p.waitForTimeout(800);
 t(await p.evaluate(()=>!window.__calls.some(c=>c.cmd==='sched_set')),'nothing is registered unless the user switched it on');
 await p.close(); await r.b.close();
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('morning: all '+ok+' checks passed')); process.exit(bad?1:0);
})();
