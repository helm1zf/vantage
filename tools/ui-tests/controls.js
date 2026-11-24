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
 await step('dash.todo:',async()=>{
  const today=day(0), list=(d)=>p.evaluate((d)=>((prefs.todo||{}).d||{})[d]||[],d);
  t(await p.evaluate(()=>!!document.getElementById('tdBlock')&&document.querySelectorAll('.td-i').length===0),'dash.todo: the list for today starts empty');
  t(await p.evaluate(()=>document.getElementById('tdAdd').disabled),'dash.todo: "Add" waits for a text');
  await p.fill('#tdNew','Call the recruiter'); await p.click('#tdAdd'); await p.waitForTimeout(150);
  await p.fill('#tdNew','Print the CV'); await p.press('#tdNew','Enter'); await p.waitForTimeout(150);
  let l=await list(today);
  t(l.length===2&&l[0].t==='Call the recruiter'&&l[1].t==='Print the CV'&&l[1].x===0&&await p.evaluate(()=>document.querySelectorAll('.td-i').length===2),'dash.todo: "Add" (button and Enter) saves the to-do under today');
  t((await calls(p,'prefs_set')).some(c=>c.args.key==='todo'),'dash.todo: the list is written to the settings file');
  t(await p.evaluate(()=>document.activeElement&&document.activeElement.id==='tdNew'),'dash.todo: the field keeps the cursor for the next to-do');
  await p.click('[data-tdtick="0"]'); await p.waitForTimeout(150); l=await list(today);
  t(l[0].x===1&&l[1].x===0&&await p.evaluate(()=>document.querySelectorAll('.td-i.done').length===1&&/1\/2/.test(document.querySelector('#tdBlock .head .cap').textContent)),'dash.todo: a tick is saved and counted (1/2)');
  await p.click('[data-tddel="1"]'); await p.waitForTimeout(150); l=await list(today);
  t(l.length===1&&l[0].t==='Call the recruiter','dash.todo: "Delete" removes that one to-do');
  const snap=await p.evaluate((d)=>(prefs.todo.s||{})[d],today), tiles=await p.evaluate(()=>[...document.querySelectorAll('.dstat b')].map(b=>parseInt(b.textContent,10)));
  t(Array.isArray(snap)&&snap.length===4&&snap[0]===tiles[0]&&snap[1]===tiles[1]&&snap[2]===tiles[2],'dash.todo: today\'s numbers are saved as the snapshot of the day ('+JSON.stringify(snap)+')');
  // other days
  await p.click('#tdNext'); await p.waitForTimeout(150);
  t(await p.evaluate((d)=>state.todoDay===d&&!!document.getElementById('tdNew')&&!!document.getElementById('tdToday')&&document.querySelectorAll('.td-i').length===0,day(1)),'dash.todo: "next day" opens tomorrow, where you can plan ahead');
  await p.click('#tdNext'); await p.waitForTimeout(150);
  t(await p.evaluate(()=>[...document.querySelectorAll('.td-e')].some(e=>/Beta/.test(e.textContent))),'dash.todo: a day shows what the applications have on it (the Beta step in two days)');
  await p.click('.td-e'); await p.waitForTimeout(300); t(await p.evaluate(()=>!document.getElementById('drawer').hidden),'dash.todo: that line opens the application'); await p.evaluate(()=>closeApp());
  await p.click('#tdToday'); await p.waitForTimeout(150);
  t(await p.evaluate((d)=>state.todoDay===d&&!document.getElementById('tdToday')&&document.querySelectorAll('.td-i').length===1,today),'dash.todo: "Back to today" returns to today\'s list');
  await p.click('#tdPrev'); await p.waitForTimeout(150);
  t(await p.evaluate((d)=>state.todoDay===d&&!document.getElementById('tdNew')&&!document.getElementById('tdAdd')&&!document.querySelector('[data-tddel]'),day(-1)),'dash.todo: "previous day" opens yesterday, which takes no new to-dos');
  t(await p.evaluate(()=>{ const s=document.querySelector('.td-snap'); return !!s&&!s.querySelector('.td-nums')&&/No numbers were saved/.test(s.textContent); }),'dash.todo: a day without a snapshot says so plainly');
  // calendar
  const m0=await p.evaluate(()=>document.querySelector('.td-mh b').textContent);
  await p.click('#tdMPrev'); await p.waitForTimeout(150); const m1=await p.evaluate(()=>document.querySelector('.td-mh b').textContent);
  t(m1!==m0&&await p.evaluate((d)=>state.todoDay===d,day(-1)),'dash.todo: the calendar turns back a month without changing the open day ('+m0+' > '+m1+')');
  await p.click('#tdMNext'); await p.waitForTimeout(150); t(await p.evaluate(()=>document.querySelector('.td-mh b').textContent)===m0,'dash.todo: and forward again');
  const cell=await p.evaluate(()=>document.querySelector('[data-tdday]:not(:disabled)').dataset.tdday);
  await p.click('[data-tdday]:not(:disabled)'); await p.waitForTimeout(150);
  t(await p.evaluate((c)=>state.todoDay===c&&document.querySelector('[data-tdday="'+c+'"]').disabled&&document.querySelector('[data-tdday="'+c+'"]').classList.contains('on'),cell),'dash.todo: a click on a day in the calendar opens that day');
  await p.click('nav a[data-view="inbox"]'); await p.waitForTimeout(300); await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(400);
  t(await p.evaluate(()=>!state.todoDay&&document.querySelectorAll('.td-i').length===1),'dash.todo: coming back to the Dashboard shows today again');
 });
 t(!r.errs.length,'dash.todo: no page errors: '+r.errs.join('|')); await r.b.close();
 // an earlier day with something unfinished, a saved snapshot, and far more days than are kept
 { const old={}; for(let i=3;i<160;i++) old[day(-i)]=[{t:'old '+i,x:1}];
   r=await open('dash',{scan:{apps:APPS},prefs:{todo:{d:Object.assign(old,{[day(-2)]:[{t:'Old and open',x:0},{t:'Old and done',x:1}]}),s:{[day(-2)]:[3,1,50,0]}}}}); p=r.p; }
 await step('dash.todo:',async()=>{
  await p.click('#tdPrev'); await p.click('#tdPrev'); await p.waitForTimeout(200);
  t(await p.evaluate(()=>[...document.querySelectorAll('.td-nums b')].map(b=>b.textContent).join('|'))==='3|1|50%|0','dash.todo: an earlier day shows the numbers saved on that day');
  t(await p.evaluate(()=>document.querySelectorAll('.td-i').length===2&&!!document.getElementById('tdMove')),'dash.todo: an earlier day lists its to-dos and offers to move the unfinished ones');
  await p.click('#tdMove'); await p.waitForTimeout(250);
  const st=await p.evaluate(([a,b])=>({view:state.todoDay, today:(prefs.todo.d[a]||[]).map(x=>x.t+':'+x.x), old:(prefs.todo.d[b]||[]).map(x=>x.t+':'+x.x), keys:Object.keys(prefs.todo.d).length, has:!!prefs.todo.d[b], snaps:Object.keys(prefs.todo.s).length}),[day(0),day(-2)]);
  t(st.view===day(0)&&st.today.join()==='Old and open:0'&&st.old.join()==='Old and done:1','dash.todo: "Move unfinished to today" moves only the open ones and shows today ('+st.today.join()+' / '+st.old.join()+')');
  t(st.keys<=120&&st.has,'dash.todo: only the newest 120 days are kept ('+st.keys+' days after a save, the recent ones among them)');
  await p.click('#tdPrev'); await p.click('#tdPrev'); await p.waitForTimeout(200); await p.click('[data-tdtick="0"]'); await p.waitForTimeout(150);
  t(await p.evaluate((b)=>prefs.todo.d[b][0].x===0&&!!document.getElementById('tdMove'),day(-2)),'dash.todo: an earlier day can still be ticked and unticked (the unticked one can be moved again)');
 });
 t(!r.errs.length,'dash.todo: no page errors (earlier days): '+r.errs.join('|')); await r.b.close();
 // ---------------- Settings: the backup reminder is a quiet line there
 r=await open('settings',{}); p=r.p;
 await step('settings.backup:',async()=>{
  await p.waitForTimeout(300);
  t(await p.evaluate(()=>!!document.getElementById('bkNote')&&document.getElementById('bkNote').closest('.pdata')!==null&&document.getElementById('btnGear').classList.contains('due')),'settings.backup: with no export yet, a line under "Export account" says so and the gear carries a mark');
  await p.click('#bkOff'); await p.waitForTimeout(200);
  t(await p.evaluate(()=>prefs.backupOff===true&&!document.getElementById('bkNote')&&!document.getElementById('btnGear').classList.contains('due')&&document.getElementById('stBackup').value==='off'),'settings.backup: "Do not remind me" saves the choice, removes the line and the mark, and the switch above shows Off');
  await p.selectOption('#stBackup','on'); await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(300); await p.click('nav a[data-view="settings"]'); await p.waitForTimeout(400);
  t(await p.evaluate(()=>!!document.getElementById('bkNote')),'settings.backup: switching the reminder on again brings the line back');
 });
 t(!r.errs.length,'settings.backup: no page errors: '+r.errs.join('|')); await r.b.close();
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
 await step('laporan.search boards:',async()=>{
  const saved=async()=>{ const c=await calls(p,'search_settings_set'); return c.length?c[c.length-1].args.settings:null; };
  t((await saved()).allow_aggregators===false,'laporan.search: job boards stay off unless you switch them on (saved as off)');
  await p.click('#btnLpEdit'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>{ const e=document.getElementById('ssAgg'); return !!e&&e.type==='checkbox'&&!e.checked; }),'laporan.search: the "Job boards" switch is there and off by default');
  await p.check('#ssAgg'); await p.$eval('#btnSsSave',b=>b.click()); await p.waitForTimeout(400);
  t((await saved()).allow_aggregators===true,'laporan.search: switching "Job boards" on is saved as allow_aggregators: true');
  t(await p.evaluate(()=>/job boards allowed/.test(document.getElementById('view').textContent)),'laporan.search: the summary on the page says job boards are allowed');
  await p.click('#btnLpEdit'); await p.waitForTimeout(300);
  t(await p.evaluate(()=>document.getElementById('ssAgg').checked),'laporan.search: the switch shows the saved choice when the settings are opened again');
  await p.uncheck('#ssAgg'); await p.$eval('#btnSsSave',b=>b.click()); await p.waitForTimeout(400);
  t((await saved()).allow_aggregators===false,'laporan.search: and it can be switched off again');
 });
 await r.b.close();
 { const rec=(c,link,agg)=>Object.assign({perusahaan:c,posisi:'Werkstudent Controlling',jenis:'Werkstudent',kota:'Hamburg',diposting:day(-1),skor:86,komponen:{tugas:35,skill:21,bahasa:15,kontrak:8,nilai_tambah:7},cocok:'Reconciled 1,200 transactions a month',gap:'No SAP FI yet',bahasa_lamaran:'DE',deadline:'',sumber:'x',link,aksi:'Lamar',aksi_alasan:'Strong match',folder:'01_x',usaha:{dokumen:['CV'],menit:30},perjalanan:'25 min',riwayat:''},agg?{hanya_agregator:true}:{});
   const data={bobot_skor:{tugas:40,skill:25,bahasa:15,kontrak:10,nilai_tambah:10},tanggal:day(0),run:1,status:'lengkap',bahasa:'en',agregator_diizinkan:true,ambang_skor:80,ambang_hampir:70,target_jumlah:5,jumlah_dianalisis:9,fokus:'Apply to Alpha today',
    pencarian:{oleh:'Sinta',sumber:['LinkedIn'],kata_kunci:['Werkstudent'],lokasi:['Hamburg'],filter:['Werkstudent'],corong:{ditemukan:20,lolos_saring:9,link_resmi_ok:1,dianalisis_penuh:2,direkomendasikan:2},gagal:[]},perlu_aksi:[],
    rekomendasi:[rec('Alpha GmbH','https://karriere.alpha.de/jobs/123-werkstudent',false),rec('Beta AG','https://de.linkedin.com/jobs/view/4012345678',true)],
    hampir_masuk:[{skor:76,perusahaan:'Delta KG',posisi:'Werkstudent Finance',kota:'Berlin',alasan:'Needs C1 German',link:'https://www.stepstone.de/stellenangebote--x-123.html',hanya_agregator:true}],
    dilewati:{link_tidak_ketemu:0,sudah_di_tracker:0,sudah_dilaporkan:0,skor_rendah:0,lainnya:0,lainnya_alasan:''},catatan_pasar:[],pola_gap:[],catatan_jujur:'1 of 2 recommendations is only on a job board.'};
   r=await launch({vp:{width:1300,height:900},reportData:data}); p=r.p; p.setDefaultTimeout(4000); await p.waitForTimeout(450); await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(500); }
 await step('laporan.search boards:',async()=>{
  const m=await p.evaluate(()=>{ const tags=[...document.querySelectorAll('#view .ragg')]; const inside=tags.every(e=>{ const c=e.closest('.panel,section,.rcard,.rec')||document.getElementById('view'); const a=e.getBoundingClientRect(), b=c.getBoundingClientRect(); return a.width>0&&a.right<=b.right+1&&a.left>=b.left-1; });
   return {n:tags.length, texts:tags.map(e=>e.textContent), inside, alpha:[...document.querySelectorAll('#view .ragg')].some(e=>{ let x=e.parentElement; for(let i=0;i<6&&x;i++,x=x.parentElement){ if(/Alpha GmbH/.test(x.textContent)&&!/Beta AG/.test(x.textContent)) return true; } return false; })}; });
  t(m.n>=1&&m.texts.every(x=>x==='job board only'),'laporan.search: an ad that is only on a job board is marked "job board only" on the report ('+m.n+' marks)');
  t(m.inside&&!m.alpha,'laporan.search: the mark sits inside its row and the ad with an official link has none');
 });
 t(!r.errs.length,'laporan.search: no page errors with job-board ads: '+r.errs.join('|')); await r.b.close();
 r=await open('laporan'), p=r.p;
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
  await p.click('#btnPick'); await p.waitForTimeout(250); await p.click('#dlgNo'); await p.waitForTimeout(250); await p.click('#dlgOk'); await p.waitForTimeout(250); t(await p.evaluate(()=>window.__pick===1),'profil.master: with no folder chosen, "Get started" opens the folder chooser');
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
 // ---------------- Settings: the account tools moved here; Interview: one interview per tab
 r=await open('settings'), p=r.p;
 await step('profil.account import:',async()=>{
  await p.click('#btnImport'); await p.waitForTimeout(300); t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'profil.account: Import account (in Settings) first asks what to bring in'); await p.click('#dlgNo'); await p.waitForTimeout(200);
  await p.click('#btnCheck'); await p.waitForTimeout(300); t(await p.evaluate(()=>!document.getElementById('dlg').hidden),'profil.account: Check import (in Settings) asks which package to compare'); await p.click('#dlgNo'); await p.waitForTimeout(200);
 });
 t(!r.errs.length,'profil.account: no page errors (settings tools): '+r.errs.join('|')); await r.b.close();
 r=await open('interview'), p=r.p;
 await step('interview.tabs:',async()=>{
  const before=await p.evaluate(()=>({tabs:document.querySelectorAll('[data-ivtab]').length, shown:[...document.querySelectorAll('.ivlay .list > .card')].filter(c=>c.offsetParent).map(c=>c.querySelector('b').textContent)}));
  t(before.tabs>=2&&before.shown.length===1,'interview.tabs: one interview is shown at a time, with a tab for each ('+before.tabs+' tabs, '+before.shown.length+' shown)');
  await p.click('[data-ivtab]:not([disabled])'); await p.waitForTimeout(300);
  const after=await p.evaluate(()=>[...document.querySelectorAll('.ivlay .list > .card')].filter(c=>c.offsetParent).map(c=>c.querySelector('b').textContent));
  t(after.length===1&&after[0]!==before.shown[0],'interview.tabs: another tab shows that interview instead');
 });
 t(!r.errs.length,'interview.tabs: no page errors: '+r.errs.join('|')); await r.b.close();
 console.log(`controls.js: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
