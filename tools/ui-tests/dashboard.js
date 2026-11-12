// Dashboard hierarchy and layout (the most eye-catching thing is the most important to read: what to do now; the numbers and the other cards are quieter).
// Dashboard layout: every step appears once, the numbers sit in one strip at the top, the funnel is folded away, the backup reminder is not on this page,
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
 t(await ev(()=>!document.getElementById('dw_backup')&&!document.querySelector('#view .bk')),'the backup reminder is not on the Dashboard (it is a line in Settings)');
 // cards are as tall as their content: an empty Morning report is not stretched
 const rh=await ev(()=>{ const e=document.querySelector('.rep-card, .g-bot .stack:last-child .panel'); return e?Math.round(e.getBoundingClientRect().height):0; });
 t(rh>0&&rh<340,'the Morning report card is not stretched (height '+rh+')');
 // narrow window
 await p.setViewportSize({width:760,height:1000}); await p.waitForTimeout(400);
 t(await ev(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'no sideways scrolling at 760px');
 t(r.errs.length===0,'no page errors'); await r.b.close();
 // Long names and texts: nothing may be wider than the card it sits in, at three window widths and in the three languages.
 const dd=(n)=>{const x=new Date();x.setDate(x.getDate()+n);const z=(v)=>String(v).padStart(2,'0');return x.getFullYear()+'-'+z(x.getMonth()+1)+'-'+z(x.getDate())};
 const L='Internationale Wirtschaftsprüfungsgesellschaft Müller-Hohenstein & Partner Steuerberatungsgesellschaft mbH', W='Donaudampfschifffahrtsgesellschaftskapitänsvereinigung';
 const R='Werkstudent (m/w/d) Konzernrechnungswesen und Verrechnungspreisdokumentation im Bereich Supply-Chain-Controlling';
 const N='Unterlagen_vollständig_einreichen_und_Arbeitszeugnisübersetzungen_nachreichen before the portal closes at midnight, then confirm by e-mail';
 const apps=[{id:1,company:L,role:R,fit:0.91,status:'Offer',next:N,due:dd(-1),start:dd(20),date:dd(-40)},{id:2,company:W,role:R,fit:0.84,status:'Interview',prep:true,next:N,due:dd(1),date:dd(-30)},
  {id:3,company:L,role:R,fit:0.77,status:'Applied',next:N,due:dd(-3),date:dd(-20)},{id:4,company:'Kurz AG',role:'Praktikum',fit:0.66,status:'Draft',next:N,due:dd(0),deadline:dd(4),date:dd(-2)},
  {id:5,company:L,role:R,fit:0.88,status:'Interview R1',next:'',due:'',date:dd(-12)},{id:6,company:L,role:R,fit:0.58,status:'Applied',next:'Follow up (14 days)',due:dd(6),date:dd(-16),status_date:dd(-16)}];
 const rc=(c,s)=>({perusahaan:c,posisi:R,skor:s,aksi:'Lamar'});
 const todo={d:{[dd(0)]:[{t:N+' '+W,x:0},{t:L,x:1}],[dd(-1)]:[{t:N,x:0}]},s:{[dd(-1)]:[123,45,100,12]}};
 for(const [w,lang] of [[1100,'en'],[1280,'de'],[1280,'id'],[1440,'en'],[900,'de']]){
  const q=await launch({vp:{width:w,height:900},scan:{apps},reportData:{ambang_skor:80,rekomendasi:[rc(L,91),rc(W,84),rc(L,79)],perlu_aksi:[]},prefs:{lang,todo:JSON.parse(JSON.stringify(todo))}});
  for(const state of ['today','an earlier day']){
   if(state!=='today'){ await q.p.click('#tdPrev'); await q.p.waitForTimeout(200); }
   const out=await q.p.evaluate(()=>{ const o=[], v=document.getElementById('view'), vr=v.getBoundingClientRect();
    v.querySelectorAll('*').forEach(e=>{ if(e.closest('svg')&&e.tagName!=='svg'||e.closest('.bt-rscroll')) return;   /* the route scrolls sideways on purpose in a narrow window */ const b=e.getBoundingClientRect(); if(!b.width||!b.height) return;
     const card=e.parentElement.closest('.panel,.bt-hero,.bt-tile,.bt-rate,.dw,.sl,.td-cal,.td-main,section')||v, c=card.getBoundingClientRect();
     const spill=e.children.length===0&&e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflowX==='visible'&&getComputedStyle(e).display!=='inline';
     if(b.right>c.right+1||b.left<c.left-1||b.right>vr.right+1||spill) o.push((e.tagName+'.'+String(e.className)).slice(0,40)+' in '+String(card.className||card.id).slice(0,24)); });
    return [...new Set(o)].slice(0,6); });
   t(out.length===0,'every text stays inside its card at '+w+'px, '+lang+', '+state+(out.length?': '+out.join(' ; '):''));
  }
  t(q.errs.length===0,'no page errors with long texts at '+w+'px '+lang+' '+q.errs.join('|')); await q.b.close();
 }
 console.log(ok+' passed, '+bad+' failed'); process.exit(bad?1:0); })();
