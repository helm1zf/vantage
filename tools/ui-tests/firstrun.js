// First run: errors are said in plain words in the user's language, a missing folder or a synced folder is handled, a login that never finishes says so.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
(async()=>{
 let r=await launch({vp:{width:1300,height:900}}); let p=r.p; const ev=(f,a)=>p.evaluate(f,a);
 const map=await ev(()=>({net:friendlyError('curl: (6) Could not resolve host: claude.ai'),disk:friendlyError('No space left on device (os error 28)'),perm:friendlyError('Permission denied (os error 13)'),other:friendlyError('something else entirely')}));
 t(/internet/i.test(map.net)&&!/curl/.test(map.net),'a network error is said in plain words: '+map.net);
 t(/free space/i.test(map.disk)&&!/os error/.test(map.disk),'a full disk is said in plain words: '+map.disk);
 t(/not allowed to write/i.test(map.perm)&&!/os error/.test(map.perm),'a refused write is said in plain words: '+map.perm);
 t(map.other==='something else entirely','an unknown error is shown as it is');
 for (const lang of ['de','id']) { await ev((l)=>{ lang=l; },lang);
  const m=await ev(()=>friendlyError('No space left on device (os error 28)')); t(!/free space/i.test(m)&&m.length>10,lang+': the disk message is translated: '+m); }
 await r.b.close();
 // install without internet: the dialog says it in words
 r=await launch({vp:{width:1300,height:900},extra:{nova_status:{installed:false,logged_in:false},nova_install:{__throw:'curl: (6) Could not resolve host: claude.ai'}}}); p=r.p;
 await ev2(p,()=>novaInstall()); await p.waitForTimeout(500);
 const dlg=await p.evaluate(()=>document.getElementById('dlgSheet').innerText);
 t(/internet/i.test(dlg)&&!/curl/.test(dlg),'the install dialog says "no internet", not curl output: '+dlg.slice(0,120)); await r.b.close();
 // a folder that does not exist any more
 r=await launch({vp:{width:1300,height:900},extra:{inspect_folder:{kind:'missing',path:'/gone',users:[]}}}); p=r.p;
 await ev2(p,()=>openChosen('/gone')); await p.waitForTimeout(300);
 t(await p.evaluate(()=>/does not exist any more/i.test(document.getElementById('toastMsg').textContent)&&document.getElementById('dlg').hidden),'a missing folder says so and does not offer to set up'); await r.b.close();
 // an iCloud folder is questioned before it is used
 r=await launch({vp:{width:1300,height:900},extra:{inspect_folder:{kind:'empty',path:'/x',users:[]}}}); p=r.p;
 p.evaluate(()=>{ openChosen('/Users/a/Library/Mobile Documents/com~apple~CloudDocs/Vantage'); }); await p.waitForTimeout(400);
 t(await p.evaluate(()=>!document.getElementById('dlg').hidden&&/iCloud|OneDrive/.test(document.getElementById('dlgSheet').innerText)),'an iCloud folder is questioned before use');
 await r.b.close();
 // login that never completes
 r=await launch({vp:{width:1300,height:900},extra:{nova_status:{installed:true,logged_in:false},nova_login:null}}); p=r.p;
 await p.evaluate(()=>{ const real=Date.now; window.__skew=0; Date.now=()=>real()+window.__skew; });
 await p.evaluate(()=>novaLogin()); await p.evaluate(()=>{ window.__skew=6*60*1000; }); await p.waitForTimeout(3500);
 t(await p.evaluate(()=>/Not signed in yet/i.test(document.getElementById('toastMsg').textContent)),'a login that never finishes says so'); await r.b.close();
 // a new user's first screen has exactly one accent button, and it opens the chat for the current step
 r=await launch({vp:{width:1300,height:900},scan:{apps:[],reports:[],inbox:[],mat_items:[],materials:0,raw_facts_kb:0}}); p=r.p; await p.waitForTimeout(600);
 const hb=await p.evaluate(()=>({hero:!!document.querySelector('.lcd'),prim:[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()),chat:(document.querySelector('.hero-act .btn')||{dataset:{}}).dataset.chat}));
 t(r.errs.length===0,'no page error on the very first draw: '+JSON.stringify(r.errs)); t(hb.hero&&hb.prim.length===1&&hb.chat==='nova','the first screen of a new user has one accent button that opens a chat: '+JSON.stringify(hb)); await r.b.close();
 console.log(`firstrun: ${ok} ok, ${bad} bad`); process.exit(bad?1:0);
})();
function ev2(p,f){ return p.evaluate(f); }
