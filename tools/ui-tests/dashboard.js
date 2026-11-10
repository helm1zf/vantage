// Dashboard hierarchy and layout (the most eye-catching thing is the most important to read: what to do now; the numbers and the other cards are quieter).
// Dashboard layout: every step appears once, the numbers sit in one strip at the top, the funnel is folded away, the backup reminder is a slim line at the bottom,
// and cards are as tall as their content. The mock data has fixed dates, so every expectation is computed from the data and today's date, never hard-coded.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
(async()=>{
 const r=await launch({vp:{width:1400,height:1000}}); const p=r.p; const ev=(f,a)=>p.evaluate(f,a);
 // strip of numbers
 const tiles=await ev(()=>[...document.querySelectorAll('.dstat')].map(e=>({label:(e.querySelector('.cap')||{}).textContent, big:(e.querySelector('b')||{}).textContent, text:e.textContent})));
 t(tiles.length===4,'four number tiles in the strip (got '+tiles.length+')');
 t(tiles.map(x=>x.label).join('|')==='Active|In interview|Reply rate|Offer','tile labels: '+tiles.map(x=>x.label).join('|'));
 const exp=await ev(()=>{ const a=state.data.apps, sent=a.filter(x=>colOf(x.status)!=="Preparing").length, reply=a.filter(x=>["Interview","Offer"].includes(colOf(x.status))||x.status==="Rejected").length, act=a.filter(x=>["Sent","Interview"].includes(colOf(x.status))), offer=a.find(x=>x.status==="Offer"); return {rate:sent?Math.round(reply/sent*100):0, active:act.length, offer:offer?offer.company:""}; });
 t(tiles[2]&&tiles[2].big.replace(/\s/g,'')===exp.rate+'%','reply rate tile equals the data ('+exp.rate+'%)');
 t(tiles[0]&&+tiles[0].big===exp.active,'active tile equals the data ('+exp.active+')');
 t(!exp.offer||(tiles[3]&&tiles[3].text.includes(exp.offer)),'offer tile names the company');
 t(await ev(()=>!document.querySelector('.dashwrap .lcd')&&!document.querySelector('.g-top2')),'the black status block and the big funnel are gone from the top');
 const fun=await ev(()=>{ const d=document.querySelector('details.dfun'); return d?{open:d.open, has:!!d.querySelector('.funnel-hero'), line:(d.querySelector('summary')||{}).textContent}:null; });
 t(fun&&!fun.open&&fun.has,'the funnel is folded away but still there'); t(fun&&/sent/i.test(fun.line||''),'the folded funnel shows a one-line summary');
 // the numbers come first, then the Today card
 t(await ev(()=>{ const a=document.querySelector('.dstrip'), b=document.getElementById('dw_today'); return !!a&&!!b&&b.getBoundingClientRect().top<a.getBoundingClientRect().top; }),'the Today card comes before the numbers');
 // hierarchy: sizes and the one accent button
 const h=await ev(()=>{ const fs=(e)=>e?parseFloat(getComputedStyle(e).fontSize):0; const rows=[...document.querySelectorAll('#dw_today .td-t')]; const focus=document.querySelector('#dw_today .td-t.focus');
   const other=rows.find(r=>r!==focus); return {focus:fs(focus&&focus.querySelector('.w')), other:fs(other&&other.querySelector('.w')), stat:Math.max(0,...[...document.querySelectorAll('.dstat b')].map(fs)), head:Math.max(0,...[...document.querySelectorAll('.g-bot .head h2')].map(fs)), todayH:fs(document.querySelector('#dw_today h3')),
     prim:[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent!==null).length, nfocus:document.querySelectorAll('#dw_today .td-t.focus').length, focusBtnPrimary:!!(focus&&focus.querySelector('.btn.primary'))}; });
 t(h.nfocus===1,'exactly one focus row in Today ('+h.nfocus+')');
 t(h.focus>=17,'the focus step is large ('+h.focus+'px)'); t(!h.other||h.focus>=h.other*1.3,'the focus step is clearly larger than the other steps ('+h.focus+' vs '+h.other+')');
 t(h.stat<=16&&h.stat<h.focus,'the numbers are quieter than the focus step ('+h.stat+' vs '+h.focus+')');
 t(h.head<=13.5&&h.head<h.todayH,'secondary card titles are quieter than the Today title ('+h.head+' vs '+h.todayH+')');
 t(h.prim===1&&h.focusBtnPrimary,'one accent button on the page, on the focus step ('+h.prim+')');
 // a new user (nothing sent yet) gets no empty funnel
 await ev(()=>{ state.data.apps=[]; render(); }); await p.waitForTimeout(500);
 t(await ev(()=>!document.querySelector('details.dfun')),'no funnel line while nothing has been sent');
 await ev(()=>{ state.data.apps=JSON.parse(JSON.stringify(MOCK.apps)); render(); }); await p.waitForTimeout(500);
 // each overdue or due step once
 const rep=await ev(()=>{ const out=[]; state.data.apps.filter(a=>a.due&&colOf(a.status)!=="Closed").forEach(a=>{ const n=daysFrom(parseDate(a.due)); if(n>0) return; const key=a.id+":"+a.due, snoozed=((prefs.snooze||{})[key]||"")>VK.day(); const step=en(a.next)||"";
   const hits=[...document.querySelectorAll('.td-t, .att-t, .up')].filter(e=>e.textContent.includes(a.company)&&(!step||e.textContent.includes(step.split(/[.;(]/)[0].trim()))).length; out.push({co:a.company,step,hits,snoozed}); }); return out; });
 t(rep.length>0,'the data has overdue steps to check ('+rep.length+')');
 rep.forEach(x=>t(x.snoozed?x.hits===0:x.hits===1,'"'+x.step+'" at '+x.co+' appears once (got '+x.hits+')'));
 const ofr=await ev(()=>{ const a=state.data.apps.find(x=>x.status==='Offer'&&x.due&&daysFrom(parseDate(x.due))<=0&&!(((prefs.snooze||{})[x.id+':'+x.due]||'')>VK.day())); return a?{co:a.company, inToday:[...document.querySelectorAll('#dw_today .td-t')].some(e=>e.textContent.includes(a.company))}:null; });
 t(!ofr||ofr.inToday,'an Offer\'s overdue step is in Today, the one place for what to do now');
 // the most important step is first: an Offer before an interview before the rest, then the most overdue
 const first=await ev(()=>{ const ap=(k)=>state.data.apps.find(a=>a.id===k); const steps=dueSteps(state.data.apps,prefs.snooze||{},VK.day()); if(!steps.length) return null; const rank=(x)=>{ const a=ap(x.id); return a.status==='Offer'?0:/^Interview/.test(a.status)?1:2; }; const best=steps.slice().sort((x,y)=>rank(x)-rank(y)||x.n-y.n)[0]; const f=document.querySelector('#dw_today .td-t.focus'); return {want:best.who, got:f?f.textContent:''}; });
 t(first&&first.got.includes(first.want),'the focus step is the most important one ('+(first&&first.want)+')');
 // only the focus step shouts: the other late labels are muted
 t(await ev(()=>{ const c=(e)=>getComputedStyle(e).color; const f=document.querySelector('#dw_today .td-t.focus .late'), o=document.querySelector('#dw_today .td-t:not(.focus) .late'); return !o||(!!f&&c(f)!==c(o)); }),'the late label is red only on the focus step');
 // priority dots: only urgent items are coloured
 const dots=await ev(()=>[...document.querySelectorAll('.att')].map(e=>({on:!!e.querySelector('.led.on'), txt:e.textContent})));
 t(dots.length>0&&dots.every(d=>!d.on||/was due|you start|today|tomorrow|in \d+ day/.test(d.txt)),'only urgent attention items have a coloured dot');
 t(dots.filter(d=>/not answered yet|waiting in your Inbox|older than your raw facts/.test(d.txt)).every(d=>!d.on),'report, Inbox and CV items are not coloured as urgent');
 // slim backup line at the bottom
 const bk=await ev(()=>{ const e=document.getElementById('dw_backup'); if(!e) return null; const g=document.querySelector('.g-bot').getBoundingClientRect(); const b=e.getBoundingClientRect(); return {inFoot:!!e.closest('#dwFoot'), below:b.top>=g.bottom-1, h:Math.round(b.height)}; });
 t(bk&&bk.inFoot&&bk.below,'the backup reminder sits below the cards'); t(bk&&bk.h<=64,'the backup reminder is a slim line (height '+(bk&&bk.h)+')');
 // cards are as tall as their content: an empty Morning report is not stretched
 const rh=await ev(()=>{ const e=document.querySelector('.rep-card, .g-bot .stack:last-child .panel'); return e?Math.round(e.getBoundingClientRect().height):0; });
 t(rh>0&&rh<300,'the Morning report card is not stretched (height '+rh+')');
 // narrow window
 await p.setViewportSize({width:760,height:1000}); await p.waitForTimeout(400);
 t(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no sideways scrolling at 760px');
 t(r.errs.length===0,'no page errors'); console.log(ok+' passed, '+bad+' failed'); await r.b.close(); process.exit(bad?1:0); })();
