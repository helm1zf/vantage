// Package 1: a button does what its label says. A button that only fills the chat box ("Message ready. Press Send.") is a leftover of the
// copy-paste era; the only ones allowed are drafts the user must finish (data-draft). Morning report: Go, Skip and "score feels wrong" go straight
// to the agent that does the work.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
const VIEWS=['inbox','dash','laporan','apps','offers','interview','profil','skill','learn'];
(async()=>{
 const sched={supported:true,registered:true,time:'07:00',last_end:0,last_ok:true,last_error:'',next:Math.floor(Date.now()/1000)+3600};
 let r=await launch({vp:{width:1400,height:1000},extra:{sched_status:sched}}); let p=r.p;
 // 1. no button that only fills the chat box
 for(const v of VIEWS){
   const ok1=await p.evaluate((v)=>{ const a=document.querySelector('nav a[data-view="'+v+'"]'); if(a){ a.click(); return true;} return false; },v);
   if(!ok1) continue; await p.waitForTimeout(500);
   const lone=await p.evaluate(()=>[...document.querySelectorAll('#view [data-say]')].filter(b=>!b.dataset.send&&!b.hasAttribute('data-draft')).map(b=>b.textContent.trim().slice(0,30)));
   t(!lone.length,'on '+v+' these buttons only fill the chat box: '+lone.join(', '));
 }
 // 2. Morning report: Go, Skip, wrong score go straight to the agent
 await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(700);
 const labels=await p.evaluate(()=>[...document.querySelectorAll('.rrec:first-of-type .rbtns .btn')].map(b=>b.textContent.trim()));
 t(labels.includes('Go')&&labels.includes('Skip'),'Go and Skip are there: '+labels);
 t(!labels.includes('👍'),'no 👍 button that does nothing');
 await p.close(); await r.b.close();
 const CASES=[['Go','.rrec .rbtns button:text-is("Go")','arga'],['Skip','.rrec .rbtns button:text-is("Skip")','sinta'],['Score feels wrong','.rrec .rbtns button[title="Score feels wrong"]','arga']];
 for(const [name,sel,agent] of CASES){   // one fresh page per button: a chat that is answering takes no second request
   r=await launch({vp:{width:1400,height:1000},extra:{sched_status:sched}}); p=r.p;
   await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(700);
   await p.click(sel); await p.waitForTimeout(500);
   const c=await p.evaluate(()=>window.__calls.filter(x=>x.cmd==='nova_send').map(x=>x.args));
   t(c.length===1&&c[0].agent===agent&&c[0].thread==='lamaran',name+' sends to '+agent+' in the application chat ('+JSON.stringify(c.map(x=>[x.agent,x.thread]))+')');
   t(!/Message ready/i.test(await p.evaluate(()=>document.getElementById('toastMsg').textContent)),name+': no "Message ready. Press Send."');
   if(name==='Go') t(/Arga/.test(c[0]&&c[0].text||''),'the Go message addresses Arga');
   await p.close(); await r.b.close();
 }
 r=await launch({vp:{width:1400,height:1000},extra:{sched_status:sched}}); p=r.p;
 // 3. the wording follows the language
 const en=await p.evaluate(()=>{ window.__calls.length=0; return say('go','#1 of the report'); });
 t(!/nomor/i.test(en)&&/Arga/.test(en),'English Go message is English and names Arga');
 const ref=await p.evaluate(()=>{ lang='en'; document.querySelector('.rrec .rbtns button:nth-of-type(1)'); return [...document.querySelectorAll('.rrec .rbtns .btn')].map(b=>b.dataset.say||'').join(' | '); });
 t(!/nomor/i.test(ref),'the reference in an English message is English: '+ref.slice(0,90));
 await p.close(); await r.b.close();
 // 4. "Mark as followed up" really takes the step off the due list (it only wrote a note that nothing read)
 r=await launch({vp:{width:1400,height:1000}}); p=r.p;
 const out=await p.evaluate(async()=>{
   const day=iso(new Date()); const yest=new Date(); yest.setDate(yest.getDate()-3);
   const due=yest.getFullYear()+'-'+String(yest.getMonth()+1).padStart(2,'0')+'-'+String(yest.getDate()).padStart(2,'0');
   const a=state.data.apps.find(x=>['Sent','Applied'].includes(x.status))||state.data.apps[0]; a.status='Applied'; a.due=due; a.next='Follow up';
   const before=dueSteps(state.data.apps,{},day).some(s=>s.id===a.id);
   await openApp(a.id); await new Promise(r=>setTimeout(r,300));
   const btn=document.getElementById('fuDone'); if(!btn) return {before,noBtn:true};
   btn.click(); await new Promise(r=>setTimeout(r,200));
   return {before, after:dueSteps(state.data.apps,{},day).some(s=>s.id===a.id), needs:String(attention(state.data)).includes('overdue:'+a.id+':'+due)||String(attention(state.data)).includes('data-open="'+a.id+'"')};
 });
 t(!out.noBtn,'the follow-up card has its Mark as followed up button');
 t(out.before===true,'the overdue step is in the due list before');
 t(out.after===false,'after "Mark as followed up" the step is off the due list');
 t(out.needs===false,'and it is not listed again under Needs attention');
 await p.close(); await r.b.close();
 // 5. Personal page: the page really opens, and a real error is shown as it is
 r=await launch({vp:{width:1400,height:1000},extra:{run_kit_script:'/x/pengguna/site/index.html\n',open_file:null}}); p=r.p;
 await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(800);
 await p.click('#btnSite',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(300); await p.click('#dlgOk',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(600);
 let oc=await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='open_file'||c.cmd==='open_path').map(c=>[c.cmd,c.args]));
 t(oc.length===1&&oc[0][0]==='open_file'&&oc[0][1].rel==='site/index.html','the page is opened as a file inside the folder (open_file site/index.html), not as a folder: '+JSON.stringify(oc));
 await p.close(); await r.b.close();
 r=await launch({vp:{width:1400,height:1000},extra:{run_kit_script:{__throw:'Python is not installed or not found. Open Profile > System check to fix it.'}}}); p=r.p;
 await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(800);
 await p.click('#btnSite',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(300); await p.click('#dlgOk',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(600);
 const pm=await p.evaluate(()=>document.getElementById('toastMsg').textContent);
 t(/Python/.test(pm)&&!/Finish your Master CV/.test(pm),'a missing Python is reported as such, not as "Finish your Master CV": '+pm);
 await p.close(); await r.b.close();
 // 6. Study pack: finds the plan file, passes its path, shows the real error
 const PLANS=[{path:'2026-11-01_Rencana_Belajar_Old.json',section:'',kb:1,modified:100},{path:'2026-11-09_Rencana_Belajar_SQL.json',section:'',kb:1,modified:200},{path:'x.pdf',section:'',kb:1,modified:300}];
 for(const [label,extra,check] of [
   ['finds the newest plan json',{dir_files:PLANS,run_kit_script:'/x/pengguna/pack.zip\n'},(c,m)=>c.length===1&&/2026-11-09_Rencana_Belajar_SQL\.json$/.test(c[0].args[0])&&/recommended_skill_for_you\//.test(c[0].args[0])],
   ['no plan yet says so',{dir_files:[{path:'x.pdf',section:'',kb:1,modified:1}]},(c,m)=>c.length===0&&/Arga/.test(m)],
   ['shows the real error',{dir_files:PLANS,run_kit_script:{__throw:'No module named reportlab'}},(c,m)=>/reportlab/.test(m)],
 ]){
   r=await launch({vp:{width:1400,height:1000},extra}); p=r.p;
   await p.click('nav a[data-view="learn"]'); await p.waitForTimeout(800);
   await p.click('#lhPack',{timeout:3000}).catch(()=>{}); await p.waitForTimeout(600);
   const calls=await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='run_kit_script'&&c.args.script==='build_study_pack.py').map(c=>c.args));
   const m=await p.evaluate(()=>document.getElementById('toastMsg').textContent);
   t(check(calls.map(a=>({args:a.args})),m),'study pack: '+label+' (calls='+JSON.stringify(calls.map(a=>a.args))+' toast='+m+')');
   await p.close(); await r.b.close();
 }
 // 7. Interview, narrow window: "Let's prepare" brings the chat into view (it used to answer below the fold, so the button looked dead)
 r=await launch({vp:{width:760,height:800}}); p=r.p;
 await p.click('nav a[data-view="interview"]'); await p.waitForTimeout(800);
 const hasBtn=await p.evaluate(()=>!!document.querySelector('#view [data-chat="laras"][data-send]'));
 t(hasBtn,'the Interview page has a prepare button for Laras');
 if(hasBtn){
   await p.click('#view [data-chat="laras"][data-send]'); await p.waitForTimeout(900);
   const vis=await p.evaluate(()=>{ const e=document.querySelector('.nembed'); if(!e) return 'no embed'; const b=e.getBoundingClientRect(); return b.top<innerHeight-40&&b.bottom>0; });
   t(vis===true,'after the click the chat with Laras is in view ('+vis+')');
 }
 await p.close(); await r.b.close();
 // 8. Master CV card: never "Loading…" for ever, and one definition of "there is a Master CV"
 r=await launch({vp:{width:1400,height:1000},extra:{master_cv:{__throw:'could not read the folder'}}}); p=r.p;
 await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(900);
 const mc=await p.evaluate(()=>(document.getElementById('mcvFiles')||{}).innerText+' | '+(document.getElementById('mcvNote')||{}).innerText);
 t(!/Loading/i.test(mc),'a failing master_cv does not leave "Loading…": '+mc.replace(/\s+/g,' '));
 t(/could not|couldn.t|Retry|try again/i.test(mc),'it says the Master CV could not be read');
 await p.close(); await r.b.close();
 r=await launch({vp:{width:1400,height:1000},scan:{cv_modified:Math.floor(Date.now()/1000)-3600,raw_facts_modified:Math.floor(Date.now()/1000)-7200},extra:{master_cv:{files:[{path:'01_user_documents/Master_CV/Master_CV.docx',section:'docx'}],cv_modified:Math.floor(Date.now()/1000)-3600,raw_facts_modified:Math.floor(Date.now()/1000)-7200}}}); p=r.p;
 await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(900);
 const both=await p.evaluate(()=>document.getElementById('view').innerText);
 t(/Fresh/.test(both)&&!/No Master CV yet/.test(both)&&/DOCX/.test(both),'a Word-only Master CV: the tile says Fresh and the card shows the DOCX, not "No Master CV yet"');
 await p.close(); await r.b.close();
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('buttons: all '+ok+' checks passed')); process.exit(bad?1:0);
})();
