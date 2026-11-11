// "Dead button" sweep: on every tab, press every visible button/link once and require an EFFECT: a call to the backend, a changed page, a dialog,
// a toast or a drawer. A button that does nothing is a fake feature (owner rule: no fake features). Destructive buttons are pressed too, because they
// only open a confirm dialog (that is an effect). Messages start with "<tab>.sweep:" so features.js claims them.
const {launch}=require('./harness.js'); let ok=0,bad=0; const saved=process.env.VANTAGE_REPORT;
const rec=(c,m)=>{ if(saved!==undefined) process.env.VANTAGE_REPORT=saved; require('./report.js').rec(__filename,c,m); if(saved===undefined) delete process.env.VANTAGE_REPORT; if(c) ok++; else { bad++; console.log('FAIL',m);} };
// buttons that legitimately only change something invisible to this check, or leave the page
// Exceptions, each with its reason (effects of these are checked in controls.js):
//  #btnPickFiles/#btnPickDir open the operating system's file picker (no effect a mock can see); [data-ivaddb] and [data-nw=send] with an empty field do nothing on purpose;
//  [data-amode]/[data-range]/[data-skfilter] are filters that re-draw the same list on the mock data.
const SKIP=/^(#btnPickFiles|#btnPickDir|\[data-ivaddb\]|\[data-nw\]\[data-id\]|\[data-amode\]|\[data-range\]|\[data-skfilter\])$/;
const LIST=`(()=>{ const key=(e)=>((e.id?'#'+e.id:'')||[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>'['+a.name+']').join('')||e.className||e.tagName)+'|'+(e.textContent||'').trim().slice(0,30); return [...document.querySelectorAll('#view button, #view a[href], #view [role=button]')].filter(e=>e.offsetParent!==null&&!e.disabled).map(e=>({e,key:key(e)})); })()`;
(async()=>{
 const TABS=[['dash','dash'],['inbox','inbox'],['laporan','laporan'],['apps','apps'],['interview','interview'],['profil','profil'],['skill','skill'],['settings','settings']];
 const res={};
 delete process.env.VANTAGE_REPORT;   // the sweep must not count as "a test presses this control" in the coverage report
 const fresh=async()=>{ const r=await launch({vp:{width:1300,height:900}}); r.p.setDefaultTimeout(3000); return r; };
 for(const [view,tab] of TABS){
  let r=await fresh(), p=r.p;
  const open=async()=>{ await p.evaluate((v)=>{ document.getElementById('dlg').hidden=true; state.view=v; render(); },view); await p.waitForTimeout(800); };
  await open();
  const items=await p.evaluate((L)=>{ const seen={}; return eval(L).map(x=>{ seen[x.key]=(seen[x.key]||0)+1; const [label,text]=x.key.split('|'); return {key:x.key,n:seen[x.key]-1,label,text}; }); },LIST);
  res[tab]={n:items.length,dead:[]};
  for(const it of items){
   if(SKIP.test(it.label)) continue;
   await r.b.close(); r=await fresh(); p=r.p; await open();
   const before=await p.evaluate(([L,key,n])=>{ const e=eval(L).filter(x=>x.key===key)[n]; if(!e) return null; window.__calls.splice(0); window.__sig=document.body.innerHTML.length+'|'+document.body.innerHTML.slice(0,4000); return true; },[LIST,it.key,it.n]);
   if(!before) continue;
   try{ await p.evaluate(([L,key,n])=>{ eval(L).filter(x=>x.key===key)[n].e.click(); },[LIST,it.key,it.n]); }catch{}
   await p.waitForTimeout(350);
   const eff=await p.evaluate(()=>({calls:window.__calls.length, changed:window.__sig!==(document.body.innerHTML.length+'|'+document.body.innerHTML.slice(0,4000)), dlg:!document.getElementById('dlg').hidden, view:state.view}));
   if(!(eff.calls||eff.changed||eff.dlg||eff.view!==view)) res[tab].dead.push(it.label+' "'+it.text+'"');
  }
  await r.b.close();
 }
 for(const [,tab] of TABS){ const x=res[tab]; rec(x.dead.length===0, tab+'.sweep: every button on the tab does something ('+x.n+' pressed'+(x.dead.length?'; NO EFFECT: '+x.dead.join(' | '):'')+')'); }
 if(saved!==undefined) process.env.VANTAGE_REPORT=saved;
 console.log(`deadbtn: ${ok} ok, ${bad} failed`); process.exit(bad?1:0);
})();
