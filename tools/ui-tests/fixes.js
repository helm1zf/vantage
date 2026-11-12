// Fixes of 11 Nov (reported by the owner from real use): a dialog you cannot close, a header that scrolls away and sits in another place on
// each tab, Skip in the Morning report that depended on a chat, no "Accepted" in Closed, an example name that is not a western name.
// Messages start with "<tab>.<feature>:" so features.js claims them.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const day=(n)=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const A=(id,company,status)=>({id,company,company_full:company+' GmbH',role:'Data Analyst',status,type:'Full-time',location:'Berlin',fit:70,date:day(-9),status_date:day(-3),next:'',due:'',prep:false,folder:'f'+id});
async function open(view,o){ o=o||{}; const r=await launch({vp:o.vp||{width:1300,height:900},scan:o.scan,extra:o.extra,prefs:o.prefs}); r.p.setDefaultTimeout(4000); await r.p.waitForTimeout(450); if(view){ await r.p.click(`nav a[data-view="${view}"]`); await r.p.waitForTimeout(600); } return r; }
const calls=(p,cmd)=>p.evaluate((c)=>window.__calls.filter(x=>!c||x.cmd===c).map(x=>({cmd:x.cmd,args:x.args})),cmd);
const step=async(name,fn)=>{ try{ await fn(); }catch(e){ t(false,name+' threw: '+String(e.message).split('\n').slice(0,9).join(' ').slice(0,700)); } };
(async()=>{
 // ---- a dialog always has a way out, and its buttons stay reachable when the text is long
 let r=await open('dash'), p=r.p;
 await step('app.frame:',async()=>{
  await p.evaluate(()=>{ window.__pending=dialog({title:'Long one', html:'<div>'+'<p>release note line</p>'.repeat(120)+'</div>', ok:'Update now', no:'Later'}); });
  await p.waitForTimeout(200);
  const m=await p.evaluate(()=>{ const ok=document.getElementById('dlgOk').getBoundingClientRect(), x=document.getElementById('dlgX'); return {okIn:ok.bottom<=innerHeight&&ok.top>=0, hasX:!!x&&x.offsetParent!==null}; });
  t(m.hasX,'app.frame: every dialog has a × in the corner');
  t(m.okIn,'app.frame: with a very long text the dialog buttons are still on screen');
  await p.click('#dlgX'); await p.waitForTimeout(150);
  t(await p.evaluate(()=>document.getElementById('dlg').hidden&&true),'app.frame: the × closes the dialog');
  t(await p.evaluate(()=>window.__pending.then(v=>v===null)),'app.frame: closing with × answers "no" (nothing is confirmed)');
  await p.evaluate(()=>{ window.__pending=dialog({title:'One button', text:'x', no:false, ok:'Close'}); }); await p.waitForTimeout(100);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  t(await p.evaluate(()=>document.getElementById('dlg').hidden),'app.frame: Esc closes a one-button dialog');
 });
 await r.b.close();
 // ---- the update dialog (real one) can be closed
 r=await open('dash',{extra:{app_update_check:{configured:true,available:false,current:'0.9.1'}}}); p=r.p;
 await step('app.update:',async()=>{
  await p.click('#btnUpdate'); await p.waitForTimeout(600);
  t(await p.evaluate(()=>!document.getElementById('dlg').hidden&&!!document.getElementById('dlgX')),'app.update: the update dialog opens with a × in the corner');
  await p.click('#dlgX'); await p.waitForTimeout(150);
  t(await p.evaluate(()=>document.getElementById('dlg').hidden),'app.update: the × closes it');
 });
 await r.b.close();
 // ---- the header does not scroll away and sits at the same place on every tab
 const where=async(p)=>p.evaluate(()=>{ const q=(s)=>{ const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return [Math.round(b.left),Math.round(b.top)]; }; return {title:q('#title'),upd:q('#btnUpdate')}; });
 r=await open(null); p=r.p; const spots={};
 for(const v of ['dash','laporan','apps','profil','skill','settings']){ await p.click(`nav a[data-view="${v}"]`); await p.waitForTimeout(500); spots[v]=await where(p); }
 await p.evaluate(()=>{ state.view='nova'; render(); }); await p.waitForTimeout(500); spots.nova=await where(p);
 const ref=JSON.stringify(spots.dash);
 await step('app.frame header:',async()=>{
  const off=Object.entries(spots).filter(([,w])=>JSON.stringify(w)!==ref).map(([v,w])=>v+' '+JSON.stringify(w));
  t(!off.length,'app.frame: the title and the update button are at the same place on every tab (dash '+ref+'; different: '+off.join('; ')+')');
  await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(500);
  const sc=await p.evaluate(()=>{ const m=document.querySelector('.main'); m.scrollTop=400; return {max:m.scrollHeight-m.clientHeight, top:Math.round(document.querySelector('.bar').getBoundingClientRect().top-m.getBoundingClientRect().top-m.clientTop), st:m.scrollTop}; });
  t(sc.max<=0||(sc.st>0&&sc.top===0),'app.frame: after scrolling down the header is still at the top ('+JSON.stringify(sc)+')');
  await p.evaluate(()=>{ document.querySelector('.main').scrollTop=0; });
 });
 await r.b.close();
 // ---- Skip is written by a script, the card goes away and stays away
 r=await open('laporan'); p=r.p;
 let co='', ro='';
 await step('laporan.answer skip:',async()=>{
  const n0=await p.evaluate(()=>document.querySelectorAll('.rrec').length);
  const first=await p.evaluate(()=>{ const b=document.querySelector('.rrec [data-skipjob]'); return b?{co:b.dataset.co,role:b.dataset.role}:null; });
  t(!!first&&n0>0,'laporan.answer: each recommendation has a Skip button'); if(!first) return; co=first.co; ro=first.role;
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('.rrec [data-skipjob]'); await p.waitForTimeout(400);
  const k=await calls(p,'run_kit_script'), sent=await calls(p,'nova_send');
  t(k.length===1&&k[0].args.script==='answer_report.py'&&k[0].args.args[0]==='skip'&&k[0].args.args[1]===co,'laporan.answer: Skip runs the kit script that writes the answer ('+JSON.stringify(k.map(x=>x.args))+')');
  t(!sent.length,'laporan.answer: Skip does not ask a chat to find the file and guess its format');
  t(await p.evaluate(()=>document.querySelectorAll('.rrec').length)===n0-1,'laporan.answer: the skipped card is gone from the page');
  t(/skipped/i.test(await p.evaluate(()=>document.getElementById('toastMsg').textContent)),'laporan.answer: it says it was skipped');
 });
 await r.b.close();
 // a skip written earlier (the script lists it) keeps the card away after a restart
 r=await open(null,{extra:{run_kit_script:JSON.stringify({skipped:[(co+'|'+ro).toLowerCase()]})}}); p=r.p;
 await step('laporan.answer persists:',async()=>{
  await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(900);
  t(await p.evaluate((c)=>![...document.querySelectorAll('.rrec .rtop b')].some(b=>b.textContent.trim()===c),co),'laporan.answer: a posting skipped earlier does not come back ('+co+')');
 });
 await r.b.close();
 // near misses can be decided too
 r=await open('laporan'); p=r.p;
 await step('laporan.answer near:',async()=>{
  await p.click('[data-rtab="considered"]'); await p.waitForTimeout(300);
  const n=await p.evaluate(()=>document.querySelectorAll('.rnear').length);
  t(n===0||await p.evaluate(()=>document.querySelectorAll('.rnear [data-skipjob]').length===document.querySelectorAll('.rnear').length),'laporan.answer: a near miss can be skipped or analysed, not just read');
  if(n){ await p.evaluate(()=>window.__calls.splice(0)); await p.click('.rnear [data-skipjob]'); await p.waitForTimeout(300); t((await calls(p,'run_kit_script')).length===1,'laporan.answer: skipping a near miss runs the same script'); }
 });
 await r.b.close();
 // ---- Closed has an "Accepted" outcome everywhere a closing status is chosen
 r=await open('apps',{scan:{apps:[A(1,'Alpha','Offer'),A(2,'Beta','Applied')]}}); p=r.p;
 await step('apps.board accepted:',async()=>{
  await p.click('[data-amode="list"]'); await p.waitForTimeout(250);
  await p.click('.arow >> text=Alpha'); await p.waitForTimeout(300);
  await p.selectOption('#drMoveTo','Closed'); await p.click('#drMove'); await p.waitForTimeout(300);
  const opts=await p.evaluate(()=>[...document.querySelectorAll('#dlgSel option')].map(o=>o.textContent));
  t(opts.includes('Accepted')&&opts[0]==='Accepted','apps.board: closing an application offers "Accepted" ('+opts+')');
  await p.selectOption('#dlgSel','Accepted'); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#dlgOk'); await p.waitForTimeout(400);
  const c=await calls(p,'move_application'); t(c.length===1&&c[0].args.status==='Accepted','apps.board: "Accepted" is what is sent ('+JSON.stringify(c.map(x=>x.args))+')');
  t(await p.evaluate(()=>colOf('Accepted')==='Closed'&&STEP_CLOSED.includes('Accepted')),'apps.board: Accepted sits in the Closed column and has no next step');
 });
 t(!r.errs.length,'apps.board: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---- moving several applications at once can be undone as a whole and says how many failed
 r=await open('apps',{scan:{apps:[A(1,'Alpha','Applied'),A(2,'Beta','Applied'),A(3,'Gamma','Applied')]},extra:{move_application:{tracker:'ok',old_status:'Applied',old_folder:'fold',old_status_date:'2026-01-01',old_next:'',old_due:''}}}); p=r.p;
 await step('apps.board bulk undo:',async()=>{
  await p.click('[data-amode="board"]'); await p.waitForTimeout(300);
  await p.click('#btSel'); await p.waitForTimeout(150);
  await p.click('.board .card >> nth=0'); await p.click('.board .card >> nth=1'); await p.waitForTimeout(150);
  await p.click('#btMove'); await p.waitForTimeout(250); await p.selectOption('#dlgSel','Rejected');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#dlgOk'); await p.waitForTimeout(500);
  t((await calls(p,'move_application')).length===2,'apps.board: moving two picked applications moves both');
  t(await p.evaluate(()=>!document.getElementById('toastAct').hidden&&/Undo/i.test(document.getElementById('toastAct').textContent)),'apps.board: after a bulk move the toast offers Undo (it had none)');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#toastAct'); await p.waitForTimeout(600);
  const u=await calls(p,'undo_move'); t(u.length===2&&u.every(x=>x.args.status==='Applied'&&x.args.folder==='fold'),'apps.board: Undo puts every moved application back ('+JSON.stringify(u.map(x=>x.args.id))+')');
 });
 await r.b.close();
 r=await open('apps',{scan:{apps:[A(1,'Alpha','Applied'),A(2,'Beta','Applied')]},extra:{move_application:{__throw:'folder is open in another program'}}}); p=r.p;
 await step('apps.board bulk fail:',async()=>{
  await p.click('[data-amode="board"]'); await p.waitForTimeout(300); await p.click('#btSel'); await p.click('.board .card >> nth=0'); await p.click('.board .card >> nth=1');
  await p.click('#btMove'); await p.waitForTimeout(250); await p.selectOption('#dlgSel','Rejected'); await p.click('#dlgOk'); await p.waitForTimeout(500);
  const m=await p.evaluate(()=>document.getElementById('toastMsg').textContent);
  t(/0 moved/.test(m)&&/2 .*(failed|could not)/i.test(m),'apps.board: a bulk move that fails says how many failed, not only the last error ('+m+')');
 });
 await r.b.close();
 // ---- one date format on the Applications tab (it had three: "found 7 Nov", "(03.11)", "2026-11-07") and German shows German month names
 r=await open('apps',{scan:{apps:[Object.assign(A(1,'Alpha','Applied'),{next:'Submit',due:'2026-11-03',deadline:'2026-12-01'})]},prefs:{lang:'de'}}); p=r.p;
 await step('apps.board dates:',async()=>{
  await p.click('[data-amode="board"]'); await p.waitForTimeout(300);
  const card=await p.evaluate(()=>document.querySelector('.board .card').innerText);
  t(!/\(\d\d\.\d\d\)/.test(card),'apps.board: the next-step date is not the bare "(03.11)" form ('+card.replace(/\n/g,' | ')+')');
  t(/3\.? Nov/.test(card)&&/Okt|Nov|Dez|Mär|Mai/.test(card)&&!/found \d+ Nov|Nov\b.*found/.test(card),'apps.board: card dates use the same "3 Nov" style');
  await p.click('.board .card'); await p.waitForTimeout(350);
  const dr=await p.evaluate(()=>document.querySelector('.drawer, #drawer, .dr')?.innerText||'');
  t(!/\d{4}-\d{2}-\d{2}/.test(dr),'apps.board: the drawer shows no raw 2026-11-07 dates ('+dr.slice(0,200).replace(/\n/g,' | ')+')');
 });
 await r.b.close();
 // ---- a narrow window: the board scrolls sideways and shows that there is more (edge shadow), it does not just cut a column in half
 r=await open('apps',{vp:{width:760,height:800},scan:{apps:[A(1,'Alpha','Applied'),A(2,'Beta','Offer')]}}); p=r.p;
 await step('apps.board narrow:',async()=>{
  await p.click('[data-amode="board"]').catch(()=>{}); await p.waitForTimeout(300);
  const m=await p.evaluate(()=>{ const b=document.querySelector('.board'); const cs=getComputedStyle(b); return {over:b.scrollWidth>b.clientWidth, ox:cs.overflowX, bg:cs.backgroundImage}; });
  t(m.over&&/auto|scroll/.test(m.ox),'apps.board: at 760px the board scrolls sideways ('+JSON.stringify({over:m.over,ox:m.ox})+')');
  t(/gradient/.test(m.bg),'apps.board: at 760px the board shows an edge shadow so a cut column is understood as "more to the right"');
 });
 await r.b.close();
 // ---- the example name is a western one
 const src=require('fs').readFileSync(__dirname+'/../../ui/i18n.js','utf8');
 t(!/Maria Sari/.test(src)&&/Emily Carter/.test(src),'profil.account: the example name in the "add user" field is a western name');
 console.log('fixes:',ok,'ok',bad,'fail'); process.exit(bad?1:0);
})();
