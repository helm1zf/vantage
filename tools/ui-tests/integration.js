const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
(async()=>{ const r=await launch({prefs:{lang:'en',seen:{at:Date.now(),day:'x',apps:{},reps:[],inbox:0}}}); const p=r.p; const ev=(f,a)=>p.evaluate(f,a); const calls=(c)=>ev((c)=>__calls.filter(x=>x.cmd===c).map(x=>x.args),c);
 await ev(()=>{ window.__extra={run_kit_script:JSON.stringify({ok:true,id:'2026-11-05_Acme',folder:'01_Pipeline/x'}), master_cv:{files:[]}}; state.data.full_name='Maria Sari'; state.data.mat_items.push({name:'archive/Vantage_old',kind:'folder',count:3,kb:1,group:'archive'}); render(); }); await p.waitForTimeout(700);
 // dashboard
 t(await ev(()=>!!document.getElementById('dwArea')),'layout area'); 
 const ids=await ev(()=>[...document.querySelectorAll('#dwArea>*')].map(e=>e.id)); console.log('widgets',ids);
 t(ids.includes('dw_health'),'health card at the top'); t(await ev(()=>!document.getElementById('dwCust')&&!document.getElementById('dw_today')&&!document.getElementById('dw_backup')),'no Customize bar, Today card or backup card on the Dashboard');
 t(!(await ev(()=>document.getElementById('dwArea').textContent.includes('undefined'))),'no undefined text');
 // theme
 await p.click('nav a[data-view="settings"]'); await p.selectOption('#stTheme','dark'); t((await ev(()=>document.documentElement.dataset.theme))==='dark','dark theme'); t((await ev(()=>prefs.theme))==='dark','theme saved'); await p.selectOption('#stTheme','system'); t((await ev(()=>prefs.theme))==='system','back to automatic'); await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(500);
 // the due steps are listed in Needs attention (the Today card is gone)
 t(await ev(()=>/was due/.test(document.querySelector('.panel.fill .scroll').textContent)),'overdue steps are in Needs attention');
 // backup reminder -> profile -> export sets last
 await p.evaluate(()=>{ __TAURI__.dialog={open:async()=>null}; });
 // apps page
 await p.click('nav a[data-view="apps"]'); await p.waitForTimeout(700);
 t(await ev(()=>['qaAdd','exBtn','btBox','btBar'].every(i=>!!document.getElementById(i))),'apps controls'); t((await ev(()=>document.querySelectorAll('#vkAct button').length))===2,'two actions in one group');
 await p.click('#qaAdd'); await p.fill('#qaC','Halden Software'); await p.waitForTimeout(100); t(/already have/.test(await ev(()=>document.getElementById('qaN').textContent)),'duplicate company warned');
 await p.fill('#qaC','Acme Logistik GmbH'); await p.fill('#qaR','Werkstudent Einkauf'); await p.click('#dlgOk'); await p.waitForTimeout(500);
 let sc=(await calls('run_kit_script')).filter(a=>a.script==='add_application.py'); t(sc.length===1&&JSON.parse(sc[0].args[0]).company==='Acme Logistik GmbH','add_application called'); 
 await p.fill('#btQ','a'); await p.selectOption('#btSort','score'); t((await ev(()=>document.getElementById('btCount').textContent)).includes('/'),'count shown');
 await p.click('#btSel'); t(await ev(()=>!document.getElementById('btBar').hidden),'select bar'); await p.click('.card[data-id="1"]'); t((await ev(()=>document.getElementById('btPicked').textContent)).startsWith('1'),'picked 1'); await p.click('#btSel'); t(await ev(()=>document.getElementById('btBar').hidden),'bar hidden again');
 await ev(()=>{ window.__extra.run_kit_script=JSON.stringify({files:['/x/_Exports/a.csv','/x/_Exports/b.ics'],events:3,rows:9}); }); await p.click('#exBtn'); await p.selectOption('#dlgSel',{index:2}); await p.click('#dlgOk'); await p.waitForTimeout(400);
 sc=(await calls('run_kit_script')).filter(a=>a.script==='export_tracker.py'); t(sc.length===1&&sc[0].args[0]==='both','export both'); await p.click('#dlgNo');
 // drawer: contacts + follow up
 await ev(()=>openApp(4)); await p.waitForTimeout(700); t(await ev(()=>!!document.querySelector('#drawer .ct')&&!!document.querySelector('#drawer .fu')),'contacts and follow-up blocks');
 await p.fill('[data-f="name"]','Ms Weber'); await p.waitForTimeout(800); t((await ev(()=>prefs.contacts['4'].name))==='Ms Weber','contact saved');
 await p.selectOption('#fuLang','de'); t((await ev(()=>document.getElementById('fuText').value)).includes('Guten Tag Ms Weber'),'draft uses the contact'); await p.click('#fuDone'); t((await ev(()=>!!prefs.followed['4'])),'followed up saved');
 await p.waitForTimeout(4500); const ctx=(await calls('write_ui_context')).pop(); t(ctx&&/Ms Weber/.test(ctx.text)&&/followed up on/.test(ctx.text),'notes mirrored for the agents');
 await ev(()=>closeApp());
 // profile export buttons set the reminder date
 await p.click('nav a[data-view="settings"]'); await p.waitForTimeout(800); await ev(()=>render()); await p.waitForTimeout(400);
 t(await ev(()=>!!document.getElementById('bkNote')&&document.getElementById('btnGear').classList.contains('due')),'reminder line in Settings before the first export');
 await ev(()=>{ window.__extra.run_kit_script=JSON.stringify({path:'/x/_Backups/u.zip',files:5,mb:1,skipped:[]}); }); await p.click('#btnBackup'); await p.waitForTimeout(500); t((await ev(()=>prefs.backup&&prefs.backup.last))===(await ev(()=>VK.day())),'export date remembered'); await p.click('#dlgNo');
 t(await ev(()=>!document.getElementById('bkNote')&&!document.getElementById('btnGear').classList.contains('due')),'no reminder after an export');
 await p.click('nav a[data-view="dash"]'); await p.waitForTimeout(600); await p.click('nav a[data-view="settings"]'); await p.waitForTimeout(500); t(await ev(()=>!document.getElementById('bkNote')),'no reminder after an export, also when Settings is opened again');
 console.log('errors:',r.errs); t(r.errs.length===0,'no page errors'); console.log(ok+' passed, '+bad+' failed'); await r.b.close(); process.exit(bad?1:0); })().catch(e=>{console.error(e);process.exit(1)});
