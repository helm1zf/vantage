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
 const fun=await ev(()=>{ const d=document.querySelector('.bt-rate'); return d?{top:(d.querySelector('.bt-rate-top b')||{}).textContent, rows:d.querySelectorAll('.bt-fun > div').length}:null; });
 t(fun&&fun.top===exp.rate+'%','the reply-rate block shows the same rate as the tile'); t(fun&&fun.rows===4,'the funnel has its four steps (sent, reply, interview, offer)');
 const rt=await ev(()=>({pts:document.querySelectorAll('.bt-route .bt-pt').length, apps:state.data.apps.length}));
 t(rt.pts===rt.apps,'the route shows every application as a point ('+rt.pts+' of '+rt.apps+')');
 await p.click('.bt-route .bt-pt'); await p.waitForTimeout(300); t(await ev(()=>!document.getElementById('drawer').hidden),'a point on the route opens that application'); await ev(()=>closeApp());
 const bk=await ev(()=>{ const e=document.getElementById('dw_backup'); if(!e) return null; const g=document.querySelector('.g-bot').getBoundingClientRect(); const b=e.getBoundingClientRect(); return {inFoot:!!e.closest('#dwFoot'), below:b.top>=g.bottom-1, h:Math.round(b.height)}; });
 t(bk&&bk.inFoot&&bk.below,'the backup reminder sits below the cards'); t(bk&&bk.h<=64,'the backup reminder is a slim line (height '+(bk&&bk.h)+')');
 // cards are as tall as their content: an empty Morning report is not stretched
 const rh=await ev(()=>{ const e=document.querySelector('.rep-card, .g-bot .stack:last-child .panel'); return e?Math.round(e.getBoundingClientRect().height):0; });
 t(rh>0&&rh<340,'the Morning report card is not stretched (height '+rh+')');
 // narrow window
 await p.setViewportSize({width:760,height:1000}); await p.waitForTimeout(400);
 t(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no sideways scrolling at 760px');
 t(r.errs.length===0,'no page errors'); console.log(ok+' passed, '+bad+' failed'); await r.b.close(); process.exit(bad?1:0); })();
