// Who answers: buttons and named members go straight to that agent; approval cards keep the whole command.
const {launch}=require('./harness.js'); let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
(async()=>{ const r=await launch(); const p=r.p; const ev=(f,a)=>p.evaluate(f,a); const calls=(c)=>ev((c)=>__calls.filter(x=>x.cmd===c).map(x=>x.args),c);
 await p.click('nav a[data-view="laporan"]'); await p.waitForTimeout(800); await p.click('#btnLpRun'); await p.waitForTimeout(1000);
 let ns=await calls('nova_send'); t(ns.length===1&&ns[0].agent==='sinta'&&ns[0].thread==='lamaran','Find jobs now goes to Sinta');
 t((await calls('nova_quick')).length===0,'no small-talk check for a button'); t(!/coming[- ]soon\W/i.test(ns[0].context.replace('Never say a feature is "coming soon"','')),'no stale coming-soon claim');
 for (const [msg,who] of [['@Arga check this: https://x.de/job','arga'],['what next?','']]){ await ev(()=>{ novaSt('lamaran').run=null; }); await ev(async(m)=>{ await novaSend(m,{chat:'lamaran'}); },msg); await p.waitForTimeout(400); ns=await calls('nova_send'); t((ns[ns.length-1].agent||'')===who,'"'+msg+'" goes to '+(who||'Nova')); }
 await ev(()=>{ novaSt('lamaran').run=null; });
 const long='cd Master_CV && python3 ./--settings/scripts/build_master_cv.py "x.json" --check '+'x'.repeat(300);
 t(await ev((c)=>!novaCanRule(c)&&!novaInline(c),long),'a very long command cannot become a rule');
 t(await ev(()=>novaInline('cd X && python3 - <<EOF print(1) EOF')&&novaInline('python -c "print(1)"')&&!novaInline('python3 -m pip install x')),'typed programs are recognised');
 await ev(()=>{ novaSt('raka').run=null; novaSt('raka').msgs.push({role:'nova',text:'ok',at:Date.now(),denied:['cd ./Master_CV && python3 ./--settings/scripts/check_docs.py x.json']}); });
 t(await ev(()=>!novaPermCard(novaSt('raka').msgs.slice(-1)[0]).includes('Not run')),'a normal command gets the Allow card');
 await ev(()=>novaPerm('raka','once')); await p.waitForTimeout(400); const last=(await calls('nova_send')).pop();
 t(last.agent==='raka'&&!/check_docs/.test(last.text)&&last.extraAllowed.includes('Bash(cd ./Master_CV)'),'Allow once sends no command text and passes the rules');
 t(r.errs.length===0,'no page errors'); console.log(ok+' passed, '+bad+' failed'); await r.b.close(); process.exit(bad?1:0); })();
