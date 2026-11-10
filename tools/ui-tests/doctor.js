// System check (Profile): whatever doctor.py prints, the button must answer: a list of checks, or a plain "not available" message. Never silence.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const CASES=[
 ['a real result',JSON.stringify({checks:[{id:'python',ok:false,label:'Python',detail:'not found'},{id:'disk',ok:true,label:'Disk',detail:'ok'}]}),'dialog'],
 ['an object without checks','{}','toast'],
 ['an error object',JSON.stringify({error:'boom'}),'toast'],
 ['checks is not a list',JSON.stringify({checks:'x'}),'toast'],
 ['null','null','toast'],
 ['not JSON','Traceback (most recent call last)','toast'],
 ['checks with junk rows',JSON.stringify({checks:[null,{ok:false},{id:'a',ok:true,label:'A',detail:'fine'}]}),'dialog'],
];
(async()=>{
 for(const [name,out,want] of CASES){
  const r=await launch({vp:{width:1300,height:900},extra:{run_kit_script:out}}); const p=r.p; const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(700);
  await p.click('#btnDoctor').catch(()=>{}); await p.waitForTimeout(500);
  const s=await p.evaluate(()=>({dlg:!!document.querySelector('#dlg:not([hidden])')&&/system check/i.test(document.getElementById('dlgSheet').innerText), toast:/not available/i.test(document.getElementById('toastMsg').textContent), txt:document.getElementById('dlgSheet')?document.getElementById('dlgSheet').innerText:''}));
  t(!errs.length,name+' throws: '+errs[0]);
  t(want==='dialog'?s.dlg:(s.toast&&!s.dlg),name+' should end in a '+want+' (dialog='+s.dlg+' toast='+s.toast+')');
  t(!/undefined|\[object Object\]|NaN/.test(s.txt),name+' shows junk: '+s.txt.slice(0,80));
  await r.b.close();
 }
 // Python itself is missing: the check cannot run, so the dialog says that and offers the way out (not "update Vantage")
 { const r=await launch({vp:{width:1300,height:900},extra:{run_kit_script:{__throw:'Python is not installed or not found. Open Profile > System check to fix it.'}}}); const p=r.p;
  await p.click('nav a[data-view="profil"]'); await p.waitForTimeout(700); await p.click('#btnDoctor'); await p.waitForTimeout(500);
  const d=await p.evaluate(()=>({txt:document.getElementById('dlgSheet').innerText,btn:!!document.getElementById('docPyOpen'),shown:!document.getElementById('dlg').hidden}));
  t(d.shown&&/Python is not installed/.test(d.txt)&&!/Update Vantage/i.test(d.txt),'no Python: the check says so instead of "update Vantage": '+d.txt.slice(0,80));
  t(d.btn,'and offers a button to python.org');
  await p.click('#docPyOpen'); await p.waitForTimeout(300);
  t((await p.evaluate(()=>__calls.filter(c=>c.cmd==='open_url').map(c=>c.args.url))).some(u=>/python\.org/.test(u)),'the button opens python.org');
  await r.b.close(); }
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('doctor: all '+ok+' checks passed')); process.exit(bad?1:0);
})();
