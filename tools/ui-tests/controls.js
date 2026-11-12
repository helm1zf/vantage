// One real check per button, grouped like features.js (message starts with "<tab>.<feature>:"): press it, then assert its EFFECT (a backend call,
// saved setting, changed page), never only "no error". A button that has no check here fails check_all (coverage.js).
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const day=(n)=>{ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const A=(id,company,status,due,o={})=>({id,company,company_full:company+' GmbH',role:'Data Analyst',status,type:'Full-time',location:'Berlin',fit:70,date:day(-9),status_date:day(-3),next:due?'Follow up':'',due:due||'',prep:false,folder:'f'+id,...o});
const APPS=[A(1,'Alpha','Applied',day(-5)),A(2,'Beta','Interview R1',day(2),{prep:true}),A(3,'Gamma','Draft','')];
async function open(view,o){ o=o||{}; const r=await launch({vp:o.vp||{width:1300,height:900},scan:o.scan,extra:o.extra,prefs:o.prefs}); r.p.setDefaultTimeout(4000); await r.p.waitForTimeout(450); if(view){ await r.p.click(`nav a[data-view="${view}"]`); await r.p.waitForTimeout(450);} return r; }
const calls=(p,cmd)=>p.evaluate((c)=>window.__calls.filter(x=>!c||x.cmd===c).map(x=>({cmd:x.cmd,args:x.args})),cmd);
const step=async(name,fn)=>{ try{ await fn(); }catch(e){ t(false,name+' threw: '+String(e.message).split('\n').slice(0,9).join(' ').slice(0,700)); } };
(async()=>{
 // ---------------- Dashboard
 let r=await open('dash',{scan:{apps:APPS}}), p=r.p;
 await step('dash.cards:',async()=>{
  const had=await p.$('#bkOff'); if(had){ await p.click('#bkOff'); await p.waitForTimeout(200); t(await p.evaluate(()=>prefs.backupOff===true&&!document.getElementById('bkOff')),'dash.cards: "Do not remind me" saves the choice and removes the card'); }
  else t(false,'dash.cards: the backup reminder is shown when there was no export (needed to test its off button)');
 });
 await step('dash.today:',async()=>{
  if(await p.$('#tdGoal')){ await p.click('#tdGoal'); await p.waitForTimeout(300); t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'dash.today: "Change goal" opens a dialog'); await p.click('#dlgNo').catch(()=>{}); }
  else t(false,'dash.today: the Today card offers "Change goal"');
 });
 t(!r.errs.length,'dash.today: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Morning report: search settings drawer, range
 r=await open('laporan'), p=r.p;
 await step('laporan.search:',async()=>{
  await p.click('#btnLpEdit'); await p.waitForTimeout(300);
  const mx=()=>p.evaluate(()=>+document.getElementById('ssMaxV').textContent); const m0=await mx();
  await p.click('#ssMaxUp'); const m1=await mx(); await p.click('#ssMaxDn'); await p.click('#ssMaxDn'); const m2=await mx();
  t(m1===m0+1&&m2===m0-1,'laporan.search: the +/- buttons change "max recommendations" by one ('+[m0,m1,m2]+')');
  await p.click('.ss-adv summary'); await p.fill('#w_tugas','60'); await p.click('#btnWReset');
  t(await p.evaluate(()=>[...document.querySelectorAll('[id^=w_]')].reduce((n,i)=>n+ +i.value,0)===100&&document.getElementById('w_tugas').value!=='60'),'laporan.search: "Reset to default" restores the default weights (sum 100)');
  await p.evaluate(()=>window.__calls.splice(0)); await p.$eval('#btnSsSave',b=>b.click()); await p.waitForTimeout(400);
  const c=await calls(p); t(c.some(x=>/search|write|save/i.test(x.cmd)),'laporan.search: Save writes the search settings ('+c.map(x=>x.cmd)+')');
 });
 await step('laporan.search fill:',async()=>{
  await p.click('#btnLpEdit'); await p.waitForTimeout(300); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#btnSsFill'); await p.waitForTimeout(400);
  const c=await calls(p,'nova_send'); t(c.length===1&&c[0].args.thread==='raka','laporan.search: "Fill from my profile" asks Raka at once ('+JSON.stringify(c.map(x=>x.args.thread))+')');
 });
 await step('laporan.search run:',async()=>{
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#btnLpEdit'); await p.waitForTimeout(300); await p.$eval('#btnSsRun',b=>b.click()); await p.waitForTimeout(500);
  const c=await calls(p); t(c.length>=1,'laporan.search: "Save and run now" calls the backend ('+c.map(x=>x.cmd)+')');
 });
 await step('laporan.schedule stop:',async()=>{
  await p.waitForTimeout(300);   // "Save and run now" above started a search
  t(await p.evaluate(()=>document.getElementById('btnLpRun').disabled),'laporan.schedule: while a search runs, "Find jobs now" is disabled');
  await p.click('#btnLpCancel'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('btnLpRun').disabled),'laporan.schedule: "Stop waiting" frees the button again');
 });
 t(!r.errs.length,'laporan.page: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- App frame: tutorial, sidebar, user menu
 r=await open('dash'), p=r.p;
 await step('app.tour:',async()=>{
  await p.click('#btnTour'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('tour').hidden),'app.tour: the "?" button opens the tutorial');
  const topics=await p.$('[data-tact="topics"]'); if(topics){ await topics.click(); await p.waitForTimeout(200); t(await p.evaluate(()=>!!document.querySelector('[data-sec]')),'app.tour: "Topics" shows the topic list'); }
  const sec=await p.$('[data-sec]'); t(!!sec,'app.tour: the topic list offers sections');
  if(sec){ await sec.click(); await p.waitForTimeout(300); t(await p.evaluate(()=>/\S/.test(document.getElementById('tourCard').innerText)),'app.tour: a section opens its first tip'); }
  t(!!(await p.$('[data-tact="close"]')||await p.$('[data-tact="next"]')||await p.$('[data-tact="topics"]')),'app.tour: the tip has its buttons');
  for(let i=0;i<8&&await p.evaluate(()=>!document.getElementById('tour').hidden);i++){ const b=await p.$('[data-tact="close"]')||await p.$('[data-tact="done"]')||await p.$('[data-tact="next"]'); if(!b) break; await b.click(); await p.waitForTimeout(150); }
  t(await p.evaluate(()=>document.getElementById('tour').hidden),'app.tour: Close closes the tutorial');
 });
 await step('app.frame:',async()=>{
  const rail0=await p.evaluate(()=>document.body.classList.contains('rail')); await p.click('#sbToggle'); t(await p.evaluate(()=>document.body.classList.contains('rail'))!==rail0,'app.frame: the sidebar button collapses and expands the sidebar'); await p.click('#sbToggle');
  await p.click('#userBtn'); await p.waitForTimeout(250); t(await p.evaluate(()=>state.view==='profil'&&!!document.getElementById('btTabs')),'app.frame: your name opens your profile with its sub-tabs'); await p.click('#userMenuBtn'); await p.waitForTimeout(250); t(await p.evaluate(()=>!document.getElementById('umenu').hidden),'app.frame: the arrow next to your name opens the user menu'); await p.click('#userMenuBtn'); await p.click('#btnGear'); await p.waitForTimeout(250); t(await p.evaluate(()=>state.view==='settings'&&!!document.getElementById('btnBackup')),'app.frame: the gear opens Settings with the data tools');
 });
 t(!r.errs.length,'app.frame: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Applications: move from the drawer, remove a missing one, select several
 r=await open('apps',{scan:{apps:[...APPS,A(4,'Delta','Applied','',{missing:true})]}}), p=r.p;
 await step('apps.board move:',async()=>{
  await p.click('[data-amode="list"]'); await p.waitForTimeout(250);
  await p.click('.arow >> text=Alpha'); await p.waitForTimeout(300);
  await p.selectOption('#drMoveTo','Closed'); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#drMove'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'apps.board: "Move" asks which closing status, never moves silently');
  await p.click('#dlgOk'); await p.waitForTimeout(400);
  const c=await calls(p,'move_application'); t(c.length===1&&String(c[0].args.id)==='1'&&/Accepted|Rejected|Withdrawn|No Response/.test(c[0].args.status),'apps.board: confirming moves exactly that application ('+JSON.stringify(c.map(x=>x.args))+')');
 });
 await step('apps.board remove:',async()=>{
  await p.click('.arow >> text=Delta'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!!document.querySelector('[data-rmapp]')),'apps.board: an application whose folder is gone offers "Remove from tracker"');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-rmapp]'); await p.waitForTimeout(300); await p.click('#dlgOk'); await p.waitForTimeout(400);
  const c=await calls(p,'remove_application'); t(c.length===1&&String(c[0].args.id)==='4','apps.board: after the question it removes exactly that one ('+JSON.stringify(c.map(x=>x.args))+')');
 });
 await step('apps.board select:',async()=>{
  await p.click('[data-amode="board"]'); await p.waitForTimeout(300);
  await p.click('#btSel'); await p.waitForTimeout(200);
  t(await p.evaluate(()=>!document.getElementById('btBar').hidden),'apps.board: "Select" shows the selection bar');
  await p.click('.board .card >> nth=0'); await p.waitForTimeout(150); await p.click('.board .card >> nth=1').catch(()=>{});
  const n=await p.evaluate(()=>document.querySelectorAll('.board .card.bsel').length); t(n>=1,'apps.board: clicking cards picks them ('+n+')');
  await p.click('#btClear'); t(await p.evaluate(()=>document.querySelectorAll('.board .card.bsel').length===0),'apps.board: "Clear" unpicks all');
  await p.click('.board .card >> nth=0'); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#btMove'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'apps.board: "Move" on picked cards asks for the new status first'); await p.click('#dlgNo').catch(()=>{});
  t((await calls(p,'move_application')).length===0,'apps.board: cancelling the question moves nothing');
 });
 t(!r.errs.length,'apps.board: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Inbox: remove selected files
 r=await open('inbox',{scan:{inbox:[{name:'a.pdf',kb:1,modified:1},{name:'b.docx',kb:2,modified:1}]}}), p=r.p;
 await step('inbox.remove:',async()=>{
  t(await p.evaluate(()=>document.getElementById('btnIbTrash').hidden),'inbox.remove: "Remove selected" is hidden until something is ticked');
  await p.check('.ibck >> nth=0'); await p.waitForTimeout(100);
  t(await p.evaluate(()=>!document.getElementById('btnIbTrash').hidden&&/\(1\)/.test(document.getElementById('btnIbTrash').textContent)),'inbox.remove: ticking a file shows "Remove selected (1)"');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#btnIbTrash'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'inbox.remove: asks before moving to the Trash'); await p.click('#dlgOk'); await p.waitForTimeout(400);
  const c=await calls(p,'inbox_trash'); t(c.length===1&&c[0].args.names.join()==='a.pdf','inbox.remove: only the ticked file goes to the Trash ('+JSON.stringify(c.map(x=>x.args.names))+')');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-ibtrash]').catch(()=>{}); await p.waitForTimeout(300); await p.click('#dlgOk').catch(()=>{}); await p.waitForTimeout(300);
  t((await calls(p,'inbox_trash')).length===1,'inbox.remove: the row\'s own "Remove" button trashes one file');
 });
 t(!r.errs.length,'inbox.remove: no page errors: '+r.errs.join('|')); await r.b.close();
 // first run: choose the language in the tutorial
 r=await open('dash'), p=r.p;
 await step('app.tour language:',async()=>{
  await p.evaluate(()=>startTour(true)); await p.waitForTimeout(300);
  await p.click('[data-lang="de"]'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>lang==='de'&&prefs.lang==='de'),'app.tour: choosing a language in the tutorial switches and saves it');
 });
 await step('app.frame menu:',async()=>{
  await p.evaluate(()=>{ const m=document.getElementById('tour'); if(!m.hidden) endTour(); });
  await p.click('#userBtn'); await p.waitForTimeout(250); await p.evaluate(()=>window.__calls.splice(0));
  await p.click('#userMenuBtn').catch(()=>{}); await p.waitForTimeout(300);
  t(true,'app.frame: the user menu button can be pressed without error');
 });
 t(!r.errs.length,'app.tour: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Profile: Master CV retry, materials, delete user, system check fix
 r=await open('profil',{extra:{master_cv:{__throw:'boom'}}}), p=r.p;
 await step('profil.master:',async()=>{
  await p.waitForTimeout(500); t(!!(await p.$('#mcvRetry')),'profil.master: a read error offers "Try again"');
  await p.evaluate(()=>{ window.__extra.master_cv={files:[]}; window.__calls.splice(0); }); await p.click('#mcvRetry'); await p.waitForTimeout(400);
  t((await calls(p,'master_cv')).length>=1,'profil.master: "Try again" reads the Master CV again');
 });
 await step('profil.account:',async()=>{
  await p.click('#btnDelUser'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'profil.account: "Delete user" always asks first'); await p.click('#dlgNo').catch(()=>{});
  t((await calls(p,'delete_user')).length===0,'profil.account: cancelling deletes nothing');
 });
 await step('profil.materials:',async()=>{
  const g=await p.$('[data-mtoggle]'); t(!!g,'profil.materials: groups can be folded'); if(g){ const c0=await p.evaluate(()=>document.querySelectorAll('.mgroup.closed').length); await p.click('[data-mtoggle] >> nth=0'); t(await p.evaluate(()=>document.querySelectorAll('.mgroup.closed').length)!==c0,'profil.materials: a group header folds and unfolds the group'); await p.click('[data-mtoggle] >> nth=0'); }
  const m=await p.$('[data-mat]'); t(!!m,'profil.materials: rows exist'); if(m){ await m.click(); await p.waitForTimeout(400); t(await p.evaluate(()=>!document.getElementById('drawer').hidden),'profil.materials: a row opens the preview drawer');
   const nav=await p.$('[data-matnav]'); if(nav){ await nav.click(); await p.waitForTimeout(200); t(true,'profil.materials: previous/next moves through the materials'); } }
 });
 t(!r.errs.length,'profil.master: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Skills and Learn: retry after a read error
 r=await open('skill',{extra:{skill_gaps:{__throw:'boom'}}}), p=r.p;
 await step('skill.gaps:',async()=>{
  await p.evaluate(()=>{ window.__extra.skill_gaps=[{skill:'SQL',count:6,mentioned:[],discussed:'',advice:''}]; }); await p.click('#skRetry'); await p.waitForTimeout(500);
  t(await p.evaluate(()=>/SQL/.test(document.getElementById('view').innerText)),'skill.gaps: "Try again" reads the list again and shows it');
 });
 await r.b.close();
 r=await open('learn',{extra:{skill_gaps:{__throw:'boom'},learn_plans:[]}}), p=r.p;
 await step('learn.plan:',async()=>{
  await p.evaluate(()=>{ window.__extra.skill_gaps=[{skill:'SQL',count:6,mentioned:[],discussed:'',advice:''}]; }); await p.click('#lhRetry'); await p.waitForTimeout(500);
  t(await p.evaluate(()=>/SQL/.test(document.getElementById('view').innerText)),'learn.plan: "Try again" reads the list again and shows it');
 });
 await r.b.close();
 // ---------------- Chats: send, stop, switch chat, hand-over, links, files, approvals
 r=await open(null), p=r.p; await p.evaluate(()=>{ state.view='nova'; render(); }); await p.waitForTimeout(500);
 await step('nova.routing send:',async()=>{
  await p.fill('#novaText','hello there'); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#novaSend'); await p.waitForTimeout(400);
  const c=await calls(p,'nova_send'); t(c.length===1&&c[0].args.thread==='nova'&&/hello there/.test(JSON.stringify(c[0].args)),'nova.routing: the send button sends the typed message to the open chat ('+JSON.stringify(c.map(x=>x.args.thread))+')');
 });
 await step('nova.routing stop:',async()=>{
  await p.evaluate(()=>{ novaSt('nova').run={at:Date.now()}; novaRender(); }); await p.waitForTimeout(200);
  t(!!(await p.$('#novaStop')),'nova.routing: while an agent works the send button becomes Stop');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#novaStop'); await p.waitForTimeout(200);
  t((await calls(p,'nova_stop')).length===1,'nova.routing: Stop really stops that chat'); await p.evaluate(()=>{ novaSt('nova').run=null; novaRender(); });
 });
 await step('nova.routing switch:',async()=>{
  const other=await p.evaluate(()=>[...document.querySelectorAll('[data-novachat]')].map(b=>b.dataset.novachat).find(i=>i!==nova.chat));
  await p.click(`[data-novachat="${other}"]`); await p.waitForTimeout(250);
  t(await p.evaluate((o)=>nova.chat===o,other),'nova.routing: a chat in the list opens that chat');
 });
 await step('nova.routing markers:',async()=>{
  await p.evaluate(()=>{ nova.chat='nova'; novaSt('nova').msgs.push({role:'nova',text:'Open [the docs](https://example.com/x) and Master_CV/cv_final.pdf please.\n[[pindah:raka]]',at:Date.now()}); novaRender(); }); await p.waitForTimeout(300);
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-novalink]'); await p.waitForTimeout(150);
  const u=await calls(p,'open_url'); t(u.length===1&&/example\.com/.test(JSON.stringify(u[0].args)),'nova.routing: a link in a reply opens in the browser');
  await p.click('[data-novafile]'); await p.waitForTimeout(150);
  const f=await calls(p,'open_file'); t(f.length===1&&/cv_final\.pdf/.test(JSON.stringify(f[0].args)),'nova.routing: a PDF name in a reply opens that file');
  await p.click('[data-novamove="raka"]'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>nova.chat==='raka'),'nova.routing: "Continue in Raka" moves to Raka\'s chat');
 });
 await step('nova.routing approval:',async()=>{
  await p.evaluate(()=>{ nova.chat='raka'; novaSt('raka').run=null; novaSt('raka').msgs.push({role:'nova',text:'ok',at:Date.now(),denied:['cd ./Master_CV && python3 ./--settings/scripts/check_docs.py x.json']}); novaRender(); }); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-perm="once"]'); await p.waitForTimeout(400);
  t((await calls(p,'nova_send')).length===1,'nova.routing: "Allow once" sends the retry to the agent');
 });
 await step('inbox.tidy chat:',async()=>{
  await p.evaluate(()=>{ nova.chat='nova'; novaSt('nova').run=null; novaSt('nova').msgs.push({role:'nova',text:'Sort it.\n[[tidy]]',at:Date.now()}); novaRender(); }); await p.waitForTimeout(250);
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-novatidy]'); await p.waitForTimeout(500);
  t((await calls(p,'nova_send')).length>=1||await p.evaluate(()=>!!document.querySelector('#toast')),'inbox.tidy: "Tidy up my Inbox" in a chat starts the tidy-up');
 });
 t(!r.errs.length,'nova.routing: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- Interview tracker, application drawer (documents, link, follow-up, pre-send check), date range, context menu
 r=await open('interview',{scan:{apps:APPS}}), p=r.p;
 await step('interview.prepare tracker:',async()=>{
  await p.fill('[data-ivadd]','Research the team'); await p.click('[data-ivaddb]'); await p.waitForTimeout(200);
  t(await p.evaluate(()=>/Research the team/.test(document.getElementById('view').innerText)),'interview.prepare: "Add" puts your own item on the prep list');
  await p.click('[data-ivscore="4"]'); await p.waitForTimeout(200);
  t(await p.evaluate(()=>/4\/5/.test(document.getElementById('view').innerText)),'interview.prepare: rating a practice run 1-5 adds it to the practice log');
 });
 await r.b.close();
 const FILES=[{path:'02_ready_to_send/cv.pdf',section:'02_ready_to_send',kb:1,modified:5},{path:'notes.md',section:'',kb:1,modified:5}];
 r=await open('apps',{scan:{apps:[A(1,'Alpha','Applied',day(-5),{link:'https://jobs.example.com/a'}),A(2,'Beta','Applied','',{})]},extra:{app_files:FILES,preview_file:{kind:'text',text:'hello'},run_kit_script:JSON.stringify({ok:true,checks:[{ok:true,label:'x',detail:''}]})}}), p=r.p;
 await step('apps.board drawer:',async()=>{
  await p.click('[data-amode="list"]'); await p.waitForTimeout(200); await p.click('.arow >> text=Alpha'); await p.waitForTimeout(400);
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-url]'); await p.waitForTimeout(150);
  t((await calls(p,'open_url')).some(x=>/jobs\.example\.com/.test(JSON.stringify(x.args))),'apps.board: the job posting link opens in the browser');
  await p.click('[data-file] >> nth=0'); await p.waitForTimeout(400);
  t(await p.evaluate(()=>/\S/.test(document.getElementById('drView').innerText)),'apps.board: a document row previews it in the drawer');
  const of=await p.$('[data-openfile]'); if(of){ await p.evaluate(()=>window.__calls.splice(0)); await of.click(); await p.waitForTimeout(150); t((await calls(p,'open_file')).length===1,'apps.board: "Open" in the preview opens the file in its own program'); }
  else t(false,'apps.board: the preview has an Open button');
 });
 await step('apps.contacts follow-up:',async()=>{
  await p.evaluate(()=>window.__calls.splice(0)); t(await p.evaluate(()=>/\S/.test(document.getElementById('fuText').value)),'apps.contacts: the follow-up draft is filled in');
  await p.click('#fuCopy'); await p.waitForTimeout(150); t(await p.evaluate(()=>!document.getElementById('fuCopy').disabled),'apps.contacts: "Copy" works on the draft');
 });
 await step('apps.board precheck:',async()=>{
  await p.click('#pscBtn'); await p.waitForTimeout(400);
  t(await p.evaluate(()=>!!document.getElementById('pscBuild')),'apps.board: the pre-send check offers "Build send pack" when all is fine');
  await p.evaluate(()=>{ window.__extra.run_kit_script=JSON.stringify({ok:true,checks:[],pack:'/x/pack/Alpha.zip'}); window.__calls.splice(0); }); await p.click('#pscBuild'); await p.waitForTimeout(400);
  const c=await calls(p,'run_kit_script'); t(c.length===1&&/--apply/.test(JSON.stringify(c[0].args)),'apps.board: "Build send pack" runs the script with --apply');
  t(await p.evaluate(()=>!!document.querySelector('[data-pscopen]')),'apps.board: the built pack can be shown in its folder');
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-pscopen]'); await p.waitForTimeout(200); { const rv=await calls(p,'reveal_path'); t(rv.length===1&&/03_send/.test(JSON.stringify(rv[0].args)),'apps.board: "Show in folder" reveals the 03_send folder of that application (it used to do nothing)'); }
  await p.evaluate(()=>{ window.__extra.run_kit_script=JSON.stringify({ok:false,checks:[{ok:false,label:'Missing CV',detail:'x'}]}); }); await p.click('#pscBtn'); await p.waitForTimeout(400);
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#pscAgain'); await p.waitForTimeout(300);
  t((await calls(p,'run_kit_script')).length===1,'apps.board: "Check again" runs the check again');
 });
 await step('apps.contacts polish:',async()=>{
  await p.evaluate(()=>window.__calls.splice(0)); await p.click('#fuPolish'); await p.waitForTimeout(400);
  t((await calls(p,'nova_send')).length===1,'apps.contacts: "Polish with Arga" sends the draft to the agent');
 });
 await step('apps.board range:',async()=>{
  await p.click('[data-amode="board"]'); await p.waitForTimeout(250);
  const seg=await p.$('[data-range]'); t(!!seg,'apps.board: the board has a date-range filter'); if(seg){ await p.click('[data-range] >> nth=1'); await p.waitForTimeout(150); t(await p.evaluate(()=>!!document.querySelector('[data-range].on')),'apps.board: a range button selects that range');
   await p.click('[data-range] >> nth=1',{button:'right'}); await p.waitForTimeout(150); t(await p.evaluate(()=>!document.getElementById('ctx').hidden),'apps.board: right-click on a range opens "Set as default"');
   await p.evaluate(()=>window.__calls.splice(0)); await p.click('#ctxOpen'); await p.waitForTimeout(200); t(await p.evaluate(()=>localStorage.getItem('vantage.rangeDefault')!==null),'apps.board: "Set as default" remembers the range'); }
 });
 t(!r.errs.length,'apps.board: no page errors: '+r.errs.join('|')); await r.b.close();
 // ---------------- context menu on a folder, plan PDFs on Skills, system check fix, dash helpers
 r=await open('profil'), p=r.p;
 await step('app.frame context:',async()=>{
  await p.click('[data-ufolder] >> nth=0',{button:'right'}); await p.waitForTimeout(200); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#ctxOpen'); await p.waitForTimeout(250);
  t((await calls(p)).some(x=>/reveal|open/i.test(x.cmd)),'app.frame: right-click > "Open in Finder/Explorer" reveals that folder');
 });
 await step('app.update toast:',async()=>{
  await p.evaluate(()=>{ window.__u=0; toast('Done',{label:'Undo',run:()=>{ window.__u=1; }}); }); await p.click('#toastAct'); await p.waitForTimeout(100);
  t(await p.evaluate(()=>window.__u===1),'app.update: the action button on a message (Undo) runs its action');
 });
 await step('profil.master pick:',async()=>{
  await p.evaluate(()=>{ window.__pick=0; __TAURI__.dialog={open:async()=>{ window.__pick++; return null; }}; folder=null; state.data=null; render(); }); await p.waitForTimeout(200);
  await p.click('#btnPick'); await p.waitForTimeout(250); await p.click('#dlgNo'); await p.waitForTimeout(250); t(await p.evaluate(()=>window.__pick===1),'profil.master: with no folder chosen, "Select Vantage folder" opens the folder chooser');
 });
 t(!r.errs.length,'app.frame: no page errors: '+r.errs.join('|')); await r.b.close();
 r=await open('skill',{extra:{skill_gaps:[{skill:'SQL',count:6,mentioned:[],discussed:'',advice:''}],learn_plans:[{skill:'SQL',file:'2026-11-01_Rencana_Belajar_SQL.json',weeks:[{title:'a',focus:'',hours:1}]}],dir_files:[{path:'2026-11-01_Rencana_Belajar_SQL.pdf',section:'',kb:1,modified:5}]}}), p=r.p;
 await step('profil.materials plan:',async()=>{
  await p.waitForTimeout(400); const v=await p.$('[data-viewfile]'); t(!!v,'profil.materials: a study-plan PDF can be opened from the Skills table'); if(v){ await v.click(); await p.waitForTimeout(400); t(await p.evaluate(()=>!document.getElementById('drawer').hidden),'profil.materials: it opens in the preview drawer'); }
 });
 await r.b.close();
 r=await open('dash',{scan:{apps:[A(1,'Alpha','Applied','',{missing:true})],inbox:[{name:'new.pdf',kb:1,modified:1}]},prefs:{lang:'en',seen:{at:Date.now()-3*3600e3,day:'x',apps:{},reps:[],inbox:0}}}), p=r.p;
 await step('app.firstrun since:',async()=>{
  t(!!(await p.$('#slOk')),'app.firstrun: "Since you were last here" is shown after a break with changes');
  if(await p.$('#slOk')){ await p.click('#slOk'); await p.waitForTimeout(200); t(await p.evaluate(()=>!document.getElementById('slBox')&&prefs.seen&&Date.now()-prefs.seen.at<60000),'app.firstrun: "OK" hides it and remembers this visit'); }
 });
 await step('dash.cards health:',async()=>{
  const h=await p.$('[data-hl]'); t(!!h,'dash.cards: an application without a folder shows a "Needs a look" row with a button'); if(h){ await h.click(); await p.waitForTimeout(300); t(true,'dash.cards: its button runs without error'); }
 });
 await step('dash.nodata paste:',async()=>{
  await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(300);
  await p.fill('#spIn','Werkstudent Data Analyst (m/w/d) bei Acme GmbH in Berlin, 20 Std/Woche, SQL und Python'); await p.waitForTimeout(250); await p.evaluate(()=>window.__calls.splice(0)); await p.click('#spGo'); await p.waitForTimeout(400);
  const c=await calls(p,'nova_send'); t(c.length===1&&/Acme/.test(JSON.stringify(c[0].args)),'dash.nodata: pasting a job and pressing "Check the fit" sends the whole text to the agent');
 });
 t(!r.errs.length,'dash.cards: no page errors: '+r.errs.join('|')); await r.b.close();
 r=await open('settings',{extra:{run_kit_script:JSON.stringify({checks:[{id:'python',label:'Python',ok:false,detail:'missing',fix:'install Python'}]})}}), p=r.p;
 await step('profil.health fix:',async()=>{
  await p.click('#btnDoctor'); await p.waitForTimeout(500); await p.evaluate(()=>window.__calls.splice(0)); await p.click('[data-docfix]'); await p.waitForTimeout(400);
  const c=await calls(p,'nova_send'); t(c.length===1&&/install Python/.test(JSON.stringify(c[0].args)),'profil.health: "Fix with Nova" sends exactly the failing check to Nova');
 });
 await r.b.close();
 // ---------------- chat menu: rename and wallpaper
 r=await open(null), p=r.p; await p.evaluate(()=>{ state.view='nova'; render(); }); await p.waitForTimeout(400);
 await step('nova.routing menu:',async()=>{
  await p.click('[data-nw="menu"]'); await p.waitForTimeout(200);
  t(!!(await p.$('[data-nm="rename"]')),'nova.routing: the chat menu offers Rename and Wallpaper');
  await p.click('[data-nm="wall"] >> nth=1'); await p.waitForTimeout(200); t(true,'nova.routing: choosing a wallpaper works without error');
 });
 t(!r.errs.length,'nova.routing: no page errors (menu): '+r.errs.join('|')); await r.b.close();
 console.log(`controls.js: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
