// Runs the UI tests one after another, then judges them against the feature registry:  node tools/ui-tests/run.js   (needs playwright and a Chromium)
// Every check is written to a report file; coverage.js then prints Tab > feature and fails when a tab, feature or button has no test (see features.js).
const {spawnSync}=require('child_process'); const path=require('path'), os=require('os'), fs=require('fs'); let failed=0;
const report=path.join(os.tmpdir(),'vantage_ui_report_'+process.pid+'.jsonl'); fs.writeFileSync(report,''); const env=Object.assign({},process.env,{VANTAGE_REPORT:report});
for (const f of ['reply.js','first_paint.js','dashboard.js','morning.js','badreport.js','doctor.js','inbox.js','data.js','learn.js','registry.js','firstrun.js','priority.js','settings.js','offers.js','controls.js','buttons.js','updates.js','integration.js','route.js','fuzz.js']){ const r=spawnSync('node',[path.join(__dirname,f)],{encoding:'utf8',timeout:280000,env}); process.stdout.write(`== ${f}\n${r.stdout}${r.stderr}`); if(r.status!==0) failed++; }
const c=spawnSync('node',[path.join(__dirname,'coverage.js'),report],{encoding:'utf8'}); process.stdout.write('== feature coverage\n'+c.stdout+c.stderr); if(c.status!==0) failed++;
try{ fs.unlinkSync(report); }catch{}
console.log(failed?`${failed} UI test file(s) failed`:'all UI tests passed'); process.exit(failed?1:0);
