// Runs the UI tests one after another:  node tools/ui-tests/run.js   (needs the playwright package and a Chromium)
const {spawnSync}=require('child_process'); let failed=0;
for (const f of ['reply.js','first_paint.js','dashboard.js','morning.js','integration.js','route.js','fuzz.js']){ const r=spawnSync('node',[require('path').join(__dirname,f)],{encoding:'utf8',timeout:280000}); process.stdout.write(`== ${f}\n${r.stdout}${r.stderr}`); if(r.status!==0) failed++; }
console.log(failed?`${failed} UI test file(s) failed`:'all UI tests passed'); process.exit(failed?1:0);
