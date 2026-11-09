// A morning report JSON is written by a language model, so its shape can be wrong: a string where a list belongs, null inside a list,
// an object where text belongs. One such report must never break a page (it used to throw while drawing and leave the page stale or empty).
// Every page that reads reports is drawn with each kind of damage; nothing may throw, show "undefined"/"[object Object]", or run code from the report.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ if(c) ok++; else { bad++; console.log('FAIL',m);} };
const GOOD={perusahaan:'Alpha GmbH',posisi:'Werkstudent SAP',skor:91,aksi:'LAMAR'};
const DAMAGE={
 'null inside the recommendations':{rekomendasi:[null,undefined,'text',7,GOOD]},
 'recommendations is an object':{rekomendasi:{a:1}},
 'recommendations is a string':{rekomendasi:'none'},
 'score is text or empty':{rekomendasi:[{perusahaan:'A',posisi:'B',skor:'abc',aksi:'LAMAR'},{perusahaan:'C',posisi:'D',skor:null}]},
 'company and role are not text':{rekomendasi:[{perusahaan:{x:1},posisi:['a'],skor:{},aksi:5,alasan:{}}]},
 'html in company, role, focus and link':{rekomendasi:[{perusahaan:'<img src=x onerror="window.__xss=1">',posisi:'"><script>window.__xss=2</script>',skor:90,aksi:'LAMAR',url:'javascript:window.__xss=3'}],fokus:'<b onmouseover=1>x</b>'},
 'actions are mixed':{perlu_aksi:[null,'x',{a:1},5],rekomendasi:[GOOD]},
 'near misses and skipped are not lists':{hampir_masuk:'x',dilewati:'many',rekomendasi:[GOOD]},
 'near misses hold junk':{hampir_masuk:[null,5,{skor:'x'}],rekomendasi:[GOOD]},
 'coverage is junk':{cakupan:{kata_kunci:'a,b',lokasi:5,filter:null,sumber:{x:1},gagal:'x'},rekomendasi:[GOOD]},
 'gap pattern is junk':{pola_gap:'x',catatan_pasar:{a:1},rekomendasi:[GOOD]},
 'gap pattern holds junk':{pola_gap:[null,'x',{skill:{a:1}}],rekomendasi:[GOOD]},
 'nested lists are junk':{rekomendasi:[{perusahaan:'A',posisi:'B',skor:80,aksi:'LAMAR',cocok:'x',gap:{a:1},komponen:'x',riwayat:5,perjalanan:null}]},
 'run and status are odd':{run:{a:1},status:'terpotong',ambang_skor:'x',target_jumlah:'y',rekomendasi:[GOOD]},
};
const VIEWS=[['dash'],['laporan','today'],['laporan','considered'],['laporan','search'],['apps']];
(async()=>{
 const SCHED={supported:true,registered:true,time:'07:00',last_end:0,last_ok:true,last_error:'',next:Math.floor(Date.now()/1000)+3600};
 for(const [name,data] of Object.entries(DAMAGE)){
  const r=await launch({vp:{width:1300,height:900},reportData:data,extra:{sched_status:SCHED}}); const p=r.p; const errs=[];
  p.on('pageerror',e=>errs.push(e.message));   // the harness list hides some messages on purpose; this one hides nothing
  for(const [view,tab] of VIEWS){
   errs.length=0;
   const out=await p.evaluate(async([view,tab])=>{
     let thrown=''; window.__xss=0;
     try{ await refresh(true); state.view=view; if(tab) state.rtab=tab; render(); }catch(e){ thrown=String(e&&e.message||e); }
     return {thrown, txt:document.getElementById('view').innerText, xss:window.__xss};
   },[view,tab]);
   await p.waitForTimeout(40);
   const w=name+' on '+view+(tab?'/'+tab:'');
   t(!out.thrown&&!errs.length,w+' throws: '+(out.thrown||errs[0]));
   t(out.txt.trim().length>20,w+' leaves the page empty');
   for(const b of ['undefined','NaN','Invalid Date','[object Object]']) t(!out.txt.includes(b),w+' shows "'+b+'"');
   t(!out.xss,w+' ran code from the report ('+out.xss+')');
  }
  await r.b.close();
 }
 const r=await launch({vp:{width:1300,height:900}}); const p=r.p;
 // good data must come through unchanged
 const same=await p.evaluate(()=>{ const x={rekomendasi:[{perusahaan:'A',posisi:'B',skor:88,aksi:'LAMAR',alasan:'ok'}],perlu_aksi:[{tanggal:'2026-01-01',lewat:true}],pola_gap:[{skill:'SQL',jumlah:2,dari:5}],cakupan:{kata_kunci:['a']},dilewati:{link_tidak_ketemu:2}}; const d={reports:[{date:'2026-01-01',data:JSON.parse(JSON.stringify(x))}]}; normalizeReports(d); return JSON.stringify(d.reports[0].data)===JSON.stringify(x); });
 t(same,'a well-formed report is not changed by cleaning');
 console.log(bad?('FAILED '+bad+' (passed '+ok+')'):('badreport: all '+ok+' checks passed')); await r.b.close(); process.exit(bad?1:0);
})();
