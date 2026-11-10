// Inbox journey: who tidies (Raka), what happens when Claude is not connected, errors that are not swallowed,
// and the result of the last tidy-up on the page itself with an Undo.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const LAST={moved:[['EDU1/t.pdf','01_user_documents/materials/education/EDU1_UniX/t.pdf'],['cv.docx','01_user_documents/materials/00_Original_CV.docx']],trashed:['junk.tmp'],skipped:[['x.bin','that place is not one a tidy-up may use']],duplicates:[['transkrip.txt','01_user_documents/materials/education/EDU1_UniX/EDU1_transkrip.txt']]};
async function open(opts){ const r=await launch(Object.assign({vp:{width:1300,height:900},inbox:[{name:'transkrip.txt',kb:4,folder:false,modified:Math.floor(Date.now()/1000)-60},{name:'EDU1',kb:90,folder:true,modified:Math.floor(Date.now()/1000)-120}]},opts)); await r.p.click('nav a[data-view="inbox"]'); await r.p.waitForTimeout(700); return r; }
(async()=>{
 // 1. the name on the button and in the text is the agent that really does the work
 let r=await open({extra:{nova_status:{installed:true,logged_in:true}}}); let p=r.p;
 let txt=await p.evaluate(()=>document.getElementById('view').innerText);
 t(!/with Nova/i.test(txt),'the Inbox does not say "with Nova"');
 t(/Raka/.test(txt),'the Inbox says Raka sorts the files');
 t(await p.evaluate(()=>[...document.querySelectorAll('#view .btn.primary')].filter(b=>b.offsetParent).length<=1),'one accent button on the Inbox');
 await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(600);
 t(!/with Nova/i.test(await p.evaluate(()=>document.getElementById('view').innerText)),'Profile does not say "with Nova"');
 await p.close(); await r.b.close();
 // 2. Claude not logged in: the button says so (it used to open a chat without a word)
 r=await open({extra:{nova_status:{installed:true,logged_in:false}}}); p=r.p;
 await p.click('#btnTidy'); await p.waitForTimeout(500);
 const toast=await p.evaluate(()=>document.getElementById('toastMsg').textContent);
 t(/logged in|log in|sign in/i.test(toast)&&/Claude/i.test(toast),'not logged in: the user is told ('+toast+')');
 t(await p.evaluate(()=>!window.__calls.some(c=>c.cmd==='nova_send')),'nothing is sent to Raka while Claude is not connected');
 await p.close(); await r.b.close();
 r=await open({extra:{nova_status:{installed:false,logged_in:false}}}); p=r.p;
 await p.click('#btnTidy'); await p.waitForTimeout(500);
 t(/install/i.test(await p.evaluate(()=>document.getElementById('toastMsg').textContent)),'not installed: the user is told to install Claude Code');
 await p.close(); await r.b.close();
 // 3. the old-Vantage import step fails: the user hears about it, the tidy-up still runs
 r=await open({extra:{nova_status:{installed:true,logged_in:true},run_kit_script:{__throw:'python3: not found'},nova_send:null}}); p=r.p;
 await p.click('#btnTidy'); await p.waitForTimeout(900);
 const t3=await p.evaluate(()=>document.getElementById('toastMsg').textContent+' '+document.body.innerText);
 t(/python3: not found|old Vantage/i.test(t3),'a failed import step is shown, not swallowed');
 t(await p.evaluate(()=>window.__calls.some(c=>c.cmd==='nova_send')),'the tidy-up still goes on after a failed import step');
 await p.close(); await r.b.close();
 // 4. the last tidy-up is on the Inbox page, with Undo
 r=await open({extra:{nova_status:{installed:true,logged_in:true},nova_inbox_last:LAST,nova_inbox_undo:{restored:[['a','b']],skipped:[]}}}); p=r.p;
 await p.click('#lastTidy summary',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(200);
 const card=await p.evaluate(()=>{ const c=document.getElementById('lastTidy'); return c?c.innerText:''; });
 t(/2/.test(card)&&/EDU1_UniX/.test(card),'the last tidy-up lists what moved and where: '+card.replace(/\s+/g,' ').slice(0,120));
 t(/already|duplicate|same/i.test(card)&&/transkrip/.test(card),'duplicates are named');
 t(/Trash/i.test(card),'what went to the Trash is named');
 t(/not one a tidy-up may use|skipped/i.test(card),'what was skipped is named with the reason');
 t(await p.evaluate(()=>!!document.querySelector('#lastTidy [data-act="inbox-undo"]')),'there is an Undo button');
 t(await p.evaluate(()=>![...document.querySelectorAll('#lastTidy .btn')].some(b=>b.classList.contains('primary'))),'Undo is not an accent button (Tidy up owns it)');
 await p.click('#lastTidy [data-act="inbox-undo"]',{timeout:2000}).catch(()=>{}); await p.waitForTimeout(600);
 t(await p.evaluate(()=>window.__calls.some(c=>c.cmd==='nova_inbox_undo')),'Undo calls the backend');
 t(await p.evaluate(()=>!document.getElementById('lastTidy')||!document.querySelector('#lastTidy [data-act="inbox-undo"]')),'after Undo the card no longer offers Undo');
 await p.close(); await r.b.close();
 // 5. nothing to show before the first tidy-up
 r=await open({extra:{nova_status:{installed:true,logged_in:true},nova_inbox_last:null}}); p=r.p;
 t(await p.evaluate(()=>!document.querySelector('#lastTidy [data-act="inbox-undo"]')),'no Undo when there was no tidy-up');
 t(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no sideways scroll');
 await p.close(); await r.b.close();
 // 6. damaged log: the page does not break
 r=await open({extra:{nova_status:{installed:true,logged_in:true},nova_inbox_last:{moved:'x',trashed:null,skipped:[null,5],duplicates:{a:1}}}}); p=r.p; const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.waitForTimeout(400);
 t(!errs.length,'a damaged last-tidy log does not throw: '+errs[0]);
 t(!/undefined|\[object Object\]|NaN/.test(await p.evaluate(()=>document.getElementById('view').innerText)),'a damaged log shows no junk');
 await p.close(); await r.b.close();
 // 7. job postings are not the user's material: Raka is told to leave them in the Inbox
 r=await open({}); p=r.p;
 t(await p.evaluate(()=>/job posting/i.test(NOVA_TIDY)&&/not (the user's )?material|leave/i.test(NOVA_TIDY)),'the tidy-up brief says job postings stay out of the materials');
 await p.close(); await r.b.close();
 // 8. the version under the logo is the real one, and never an old number that was typed into the page
 r=await open({}); p=r.p; const ver=require('../../package.json').version;
 t(await p.evaluate(()=>document.getElementById('appVer').textContent)==='v'+ver,'the version shown is the app\'s own (v'+ver+')');
 await p.close(); await r.b.close();
 r=await open({extra:{app_update_check:{__throw:'offline'}}}); p=r.p;
 t(!/v0\.7\.2/.test(await p.evaluate(()=>document.getElementById('appVer').textContent)),'with no answer from the updater no made-up version is shown');
 await p.close(); await r.b.close();
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('inbox: all '+ok+' checks passed')); process.exit(bad?1:0);
})();
