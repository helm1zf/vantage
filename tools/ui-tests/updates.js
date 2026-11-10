// Updates: "Update now" does the update (the app downloads and applies the kit, then gives Nova ONE message for the data migrations);
// the update dialog never says "up to date" when it could not check or could not download.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
const KIT={source:'github',current:'2026-10-01',latest:'2026-11-10',entries:[{date:'2026-11-10',title:'New scripts'}],body:''};
const RES=(o)=>Object.assign({new:1,changed:2,obsolete:0,backup:'/b/update_backup/x',from:'2026-10-01',version:'2026-11-10',pending:[],stamped:true,source:''},o||{});
async function open(extra,vp){ const r=await launch({vp:vp||{width:1400,height:900},extra}); await r.p.waitForTimeout(600); return r; }
const dlg=(p)=>p.evaluate(()=>{ const d=document.getElementById('dlg'); return d&&!d.hidden?document.getElementById('dlgSheet').innerText:''; });
(async()=>{
 // 1. the kit pill -> Update now -> the app does it; no pending migrations: nothing is sent to Nova
 let r=await open({update_info:KIT,kit_update_apply:RES()}); let p=r.p;
 t(await p.evaluate(()=>!document.getElementById('updPill').hidden),'the pill shows when a kit update exists');
 await p.click('#updPill'); await p.waitForTimeout(300);
 t(/Update now/.test(await dlg(p)),'the dialog offers Update now');
 await p.click('#dlgOk'); await p.waitForTimeout(900);
 let calls=await p.evaluate(()=>window.__calls.map(c=>c.cmd));
 t(calls.includes('kit_update_apply'),'Update now calls kit_update_apply');
 t(!calls.includes('nova_send'),'with no data migrations nothing is sent to Nova');
 t(!/Message ready/i.test(await p.evaluate(()=>document.getElementById('toastMsg').textContent)),'no "Message ready. Press Send."');
 const done=await dlg(p); t(/updated|3 files|backup/i.test(done),'the result says what was done: '+done.replace(/\s+/g,' ').slice(0,100));
 await p.close(); await r.b.close();
 // 2. data migrations pending: ONE direct message to Nova with the titles and the kept source
 r=await open({update_info:KIT,kit_update_apply:RES({pending:['Migrasi Alpha','Migrasi Beta'],stamped:false,source:'./01_user_documents/--usersettings/update_source'})}); p=r.p;
 await p.click('#updPill'); await p.waitForTimeout(300); await p.click('#dlgOk'); await p.waitForTimeout(1000);
 const sent=await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='nova_send').map(c=>c.args));
 t(sent.length===1&&sent[0].thread==='nova','one message goes to Nova ('+sent.length+')');
 t(sent[0]&&/Migrasi Alpha/.test(sent[0].text)&&/Migrasi Beta/.test(sent[0].text)&&/update_source/.test(sent[0].text)&&/--stamp/.test(sent[0].text),'it names the migrations, the kept kit and the stamp step');
 await p.close(); await r.b.close();
 // 3. the update fails (no internet): the user is told, the pill stays, nothing says "updated"
 r=await open({update_info:KIT,kit_update_apply:{__throw:'The update could not be downloaded. Check your internet connection and try again.'}}); p=r.p;
 await p.click('#updPill'); await p.waitForTimeout(300); await p.click('#dlgOk'); await p.waitForTimeout(900);
 const f=await dlg(p)+' '+await p.evaluate(()=>document.getElementById('toastMsg').textContent);
 t(/could not be downloaded/i.test(f),'the failure is shown: '+f.replace(/\s+/g,' ').slice(0,100));
 t(await p.evaluate(()=>!document.getElementById('updPill').hidden),'the pill stays so the user can try again');
 await p.close(); await r.b.close();
 // 4. the check itself failed (offline): never "up to date"
 r=await open({app_update_check:{configured:true,available:false,current:'0.9.1',error:'dns error'}}); p=r.p;
 await p.click('#btnUpdate'); await p.waitForTimeout(900);
 const o=await dlg(p);
 t(!/up to date/i.test(o),'offline: the dialog does not claim "up to date": '+o.replace(/\s+/g,' ').slice(0,100));
 t(/could not|couldn.t|check your internet|offline/i.test(o),'offline: it says the check failed');
 await p.close(); await r.b.close();
 // 5. the download of the app update failed: it says so and offers another try
 r=await open({app_update_check:{configured:true,available:true,current:'0.9.1',version:'0.9.2',notes:'Notes',date:'2026-11-10',error:''},app_update_prepare:{__throw:'download failed'}}); p=r.p;
 await p.click('#btnUpdate'); await p.waitForTimeout(900);
 const d5=await dlg(p);
 t(!/up to date/i.test(d5),'a failed download is not "up to date": '+d5.replace(/\s+/g,' ').slice(0,100));
 t(/failed|could not|try again/i.test(d5),'a failed download says so');
 await p.close(); await r.b.close();
 // 6. really up to date still says so
 r=await open({}); p=r.p; await p.click('#btnUpdate'); await p.waitForTimeout(700);
 t(/up to date/i.test(await dlg(p)),'when it is up to date, it says so');
 await p.close(); await r.b.close();
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('updates: all '+ok+' checks passed')); process.exit(bad?1:0);
})();
