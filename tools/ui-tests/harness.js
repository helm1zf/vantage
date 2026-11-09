// Opens the real UI (ui/index.html) in Chromium with a mocked Tauri backend and returns the page and the list of page errors.
// Shared test harness: opens the working copy of the UI with a mocked Tauri backend and returns the page.
const {chromium}=require('playwright'); const path=require('path');
exports.launch = async function(opts={}){
  const S=path.resolve(__dirname); const b=await chromium.launch(); const p=await b.newPage({viewport:opts.vp||{width:1400,height:860}, deviceScaleFactor:+(process.env.DSF||1)}); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));   // nothing is filtered out: a page error is a failure
  await p.addInitScript((o)=>{ window.__calls=[]; window.__h={}; window.__extra=Object.assign({},o.extra||{}); localStorage.setItem('vantage.folder','/x/pengguna');
    const iso=(n)=>{const d=new Date();d.setDate(d.getDate()-n);return d.toISOString().slice(0,10)};
    const rc=(c,pos,s)=>({perusahaan:c,posisi:pos,skor:s,aksi:'LAMAR'});
    const reps=o.reports===false?[]:o.reportData?[{date:iso(0),text:'',pdf:null,data:o.reportData}]:[{date:iso(0),text:'',pdf:null,data:{ambang_skor:80,rekomendasi:[rc('Alpha GmbH','Werkstudent SAP',91),rc('Beta AG','Praktikum Data',84)],perlu_aksi:[]}}];
    const now=Date.now();
    const logs={nova:[{role:'nova',text:'Hai! Ada yang mau dibahas?',at:now-3600e3}],raka:[],lamaran:[],laras:[]};
    window.__prefs=Object.assign({tour:true,tourOff:true,lang:'en'},o.prefs||{});
    window.__TAURI__={core:{invoke:async(cmd,args)=>{ window.__calls.push({cmd,args}); switch(cmd){
      case 'scan': {const d=JSON.parse(JSON.stringify(MOCK)); d.reports=reps; return d;}
      case 'nova_status': return {installed:true,logged_in:true};
      case 'prefs_get': return window.__prefs; case 'prefs_set': window.__prefs[args.key]=args.value; return null;
      case 'nova_chat_load': return (logs[args.chat]||[]).slice(); case 'nova_quick': return {result:'WORK'}; case 'nova_send': return null;
      case 'master_cv': return {files:[],cv_modified:0,raw_facts_modified:0}; case 'skill_gaps': return MOCK_GAPS; case 'dir_files': return [];
      case 'search_settings_get': return {kata_kunci:['Werkstudent SAP'],orte:['Hamburg'],vertragsarten:['Werkstudent'],ambang_skor:80,max_pro_bericht:5};
      case 'existing_dirs': return (args&&args.paths)||[]; case 'fingerprint': return 'x'; case 'user_photo': return '';
      case 'app_update_check': return {configured:true,available:false,current:o.ver}; case 'update_info': return {source:'github',current:'',latest:'',entries:[]};
      case 'release_notes': return []; case 'user_labels': return ['Pengguna']; case 'find_users': return {users:[]};
      default: { const v=window.__extra&&window.__extra[cmd]; if(v&&v.__throw) throw v.__throw; return v!==undefined?v:null; } }}}, event:{listen:(n,f)=>{window.__h[n]=f;}}}; }, Object.assign({ver:require('../../package.json').version}, opts));
  await p.goto('file://'+path.resolve(__dirname,'../../ui/index.html')); await p.waitForTimeout(1300);
  return {b,p,errs};
};
