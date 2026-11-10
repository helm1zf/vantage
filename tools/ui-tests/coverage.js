// Reads the report of one full UI test run and judges it against the feature registry (features.js). Prints Tab > feature > checks and controls.
// Exit 1 on any gap. See features.js for the rules.
const fs=require('fs'), path=require('path'); const {TABS, UNTESTED, NOT_A_FEATURE}=require('./features.js');
const UI=path.resolve(__dirname,'../../ui'); const rep=process.argv[2]||process.env.VANTAGE_REPORT;
const lines=fs.readFileSync(rep,'utf8').split('\n').filter(Boolean).map(l=>JSON.parse(l));
const checks=lines.filter(l=>'ok' in l), clicked=new Set(lines.filter(l=>l.click).map(l=>l.click));
const files=[...fs.readdirSync(UI).filter(f=>f.endsWith('.js')||f==='index.html').map(f=>path.join(UI,f)), ...fs.readdirSync(path.join(UI,'features')).map(f=>path.join(UI,'features',f))];
const src=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
// --- what exists in the code
const views=new Set(); for (const m of src.matchAll(/data-view="([a-z]+)"/g)) views.add(m[1]); for (const m of src.matchAll(/dataset\.view\s*=\s*"([a-z]+)"/g)) views.add(m[1]);
const controls=new Set();
for (const m of src.matchAll(/<(?:button|a)\b[^>]*>/g)){ for (const i of m[0].matchAll(/\bid="([A-Za-z0-9_]+)"/g)) controls.add('#'+i[1]); for (const d of m[0].matchAll(/\bdata-([a-z]+)=/g)) controls.add('[data-'+d[1]+']'); }
const GENERIC=new Set(['[data-view]','[data-i]','[data-h]','[data-tauri-drag-region]','[data-say]','[data-agent]','[data-draft]','[data-send]','[data-id]','[data-go]','[data-v]']);   // attributes that only configure another control
let problems=[]; const bad=(m)=>problems.push(m);
// --- tabs
const tabViews={inbox:'inbox',dash:'dash',laporan:'laporan',apps:'apps',offers:'offers',interview:'interview',learn:'learn',profil:'profil',skill:'skill',settings:'settings'};
for (const v of views){ if (v==='nova'||v==='pipeline') continue; if (!TABS[v]) bad(`TAB "${v}" exists in the app but has no entry in features.js (add its features and tests)`); }
// --- checks -> features
const claimed=new Array(checks.length).fill(false), reg={};
for (const [tab,t] of Object.entries(TABS)) for (const [fid,f] of Object.entries(t.features)){
  const mine=[]; checks.forEach((c,i)=>{ if (c.file==='controls.js'&&c.msg.startsWith(tab+'.'+fid)||f.checks.some(([file,re])=>c.file===file&&re.test(c.msg))){ mine.push(c); claimed[i]=true; } });
  reg[tab+'.'+fid]={tab,fid,f,mine};
  if ((f.checks.length||(f.controls||[]).length)&&!mine.length) bad(`FEATURE ${tab}.${fid}: no check ran for it (${f.what})`);
  if (!f.checks.length&&!(f.controls||[]).length) bad(`FEATURE ${tab}.${fid}: has neither checks nor controls`);
  mine.filter(c=>!c.ok).forEach(c=>bad(`FEATURE ${tab}.${fid}: FAILED "${c.msg.slice(0,90)}"`));
}
const orphan=checks.filter((c,i)=>!claimed[i]); if (orphan.length){ const by={}; orphan.forEach(c=>(by[c.file]=by[c.file]||[]).push(c.msg)); for (const [f,ms] of Object.entries(by)) bad(`${ms.length} check(s) in ${f} belong to no feature, e.g. "${ms[0].slice(0,80)}" (add them to a feature in features.js)`); }
// --- controls
const listed=new Map(); for (const [k,r] of Object.entries(reg)) (r.f.controls||[]).forEach(c=>listed.set(c,k));
for (const c of controls){ if (GENERIC.has(c)) continue; if (!listed.has(c)&&!NOT_A_FEATURE[c]) bad(`CONTROL ${c} is in the code but under no feature (a new button needs a feature entry and a test)`); }
for (const [c,k] of listed) if (!controls.has(c)&&!GENERIC.has(c)) bad(`CONTROL ${c} is listed under ${k} but no longer exists in the code (remove it)`);
const debt=[]; for (const c of controls){ if (GENERIC.has(c)||NOT_A_FEATURE[c]) continue; if (!clicked.has(c)){ if (UNTESTED[c]) debt.push(c); else bad(`CONTROL ${c} (${listed.get(c)||'?'}) is never pressed by any test (write one, or list it in UNTESTED with the reason)`); } }
for (const c of Object.keys(UNTESTED)) if (clicked.has(c)) bad(`CONTROL ${c} is in UNTESTED but a test presses it now (remove it from UNTESTED)`);
// --- report
const out=[]; for (const [tab,t] of Object.entries(TABS)){ out.push(`${t.title}`); for (const [fid,f] of Object.entries(t.features)){ const r=reg[tab+'.'+fid], cs=(f.controls||[]).filter(c=>controls.has(c)&&!GENERIC.has(c)), hit=cs.filter(c=>clicked.has(c)).length;
  out.push(`  ${r.mine.every(c=>c.ok)&&(r.mine.length||!f.checks.length)?'ok ':'FAIL'} ${fid.padEnd(11)} ${String(r.mine.length).padStart(3)} checks  ${cs.length?hit+'/'+cs.length+' controls pressed':''}  ${f.what}`); } }
console.log(out.join('\n')); console.log(`\n${Object.keys(reg).length} features in ${Object.keys(TABS).length} tabs, ${checks.length} checks, ${controls.size} controls (${[...controls].filter(c=>clicked.has(c)).length} pressed by tests, ${debt.length} listed as untested debt)`);
if (debt.length) console.log('UNTESTED DEBT: '+debt.join(' '));
if (problems.length){ console.log('\nFEATURE COVERAGE FAILED:\n'+problems.map(p=>' - '+p).join('\n')); process.exit(1); } console.log('feature coverage: ok');
