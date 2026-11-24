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
 // ---- "Have you used Vantage before?" (23 Nov: new users were asked "which folder?" first and did not know which one) ----
 const cap=()=>p.evaluate(()=>document.getElementById('dlg').hidden?'':document.querySelector('#dlgSheet .cap').textContent);
 const stubDlg=(ret)=>p.evaluate((r)=>{ window.__opened=[]; window.__TAURI__.dialog={open:async(o)=>{ window.__opened.push(o); return r.shift?r.shift():r; }}; window.vImportAccount=async(s)=>{ window.__imported=s; }; },ret);
 r=await launch({vp:{width:1300,height:900},extra:{default_vantage_dir:'/h/Documents/Vantage',vantage_setup:'/h/Documents/Vantage/new_user'}}); p=r.p; await stubDlg([]);
 p.evaluate(()=>{ pick(); }); await p.waitForTimeout(250);
 t(/Welcome/.test(await cap())&&await p.evaluate(()=>/new/i.test(document.getElementById('dlgOk').textContent)&&/Yes/.test(document.getElementById('dlgNo').textContent)),'the first question is "used Vantage before?" with a new and a yes answer');
 await p.click('#dlgOk'); await p.waitForTimeout(250);
 t(/Set up a new/.test(await cap()),'"No, I\'m new" goes to setting up a new folder');
 await p.click('#dlgOk'); await p.waitForTimeout(300);
 t(/Set up a new/.test(await cap())&&/full name/i.test(await p.evaluate(()=>document.getElementById('toastMsg').textContent)),'an empty name says so and asks again, it does not close silently');
 await p.fill('#dlgIn','Siti Nurhaliza Putri'); await p.click('#dlgOk'); await p.waitForTimeout(400);
 t(await p.evaluate(()=>window.__calls.some(c=>c.cmd==='vantage_setup'&&c.args.fullName==='Siti Nurhaliza Putri')),'the name is used to set up the folder');
 t(await p.evaluate(()=>localStorage.getItem('vantage.folder'))==='/h/Documents/Vantage/new_user','the new folder is opened');
 // a new user meets Nova after the tutorial, not under it
 t(await p.evaluate(()=>{ const opened=[]; dockOpen=(id)=>opened.push(id); state.novaAfterTour=true; tour={mode:'topics'}; endTour(); return opened.join()==='nova'&&state.novaAfterTour===false; }),'ending the tutorial opens Nova that was waiting for it (not both at once)');
 // the tutorial names buttons as they read in the chosen language, and the search key as this keyboard has it
 t(await p.evaluate(()=>{ const l=lang; lang='id'; const a=btnNames('Tekan <b>Tidy up</b> lalu <b>Find jobs now</b>.'); lang=l; return a==='Tekan <b>Rapikan</b> lalu <b>Cari lowongan</b>.'; }),'the tutorial shows button names in the app language (Tidy up reads Rapikan in Indonesian)');
 t(await p.evaluate(()=>{ const b=TNEW.palette.body.en; return !(b.includes('Ctrl K')&&b.includes('⌘ K')); }),'the tutorial names one search shortcut, the one of this keyboard');
 // the agents learn the app's language and what its buttons are called in it
 await p.evaluate(()=>{ lang='id'; }); await p.waitForTimeout(4600);
 const ctx=await p.evaluate(()=>{ const w=window.__calls.filter(c=>c.cmd==='write_ui_context'); return w.length?w[w.length-1].args.text:''; });
 t(/## App/.test(ctx)&&/Bahasa Indonesia \(id\)/.test(ctx)&&/Tidy up = "Rapikan"/.test(ctx)&&/Find jobs now = "Cari lowongan"/.test(ctx),'ui_context.md tells the agents the app language and the shown button names: '+ctx.slice(0,160).replace(/\n/g,' '));
 await r.b.close();
 // "Yes, I have" -> folder on this computer or a backup zip
 r=await launch({vp:{width:1300,height:900},extra:{default_vantage_dir:'/h/Documents/Vantage',vantage_setup:'/h/Documents/Vantage/back_user'}}); p=r.p; await stubDlg(['/h/old.zip']);
 p.evaluate(()=>{ pick(); }); await p.waitForTimeout(250); await p.click('#dlgNo'); await p.waitForTimeout(250);
 t(/Where is your Vantage/.test(await cap())&&/Vantage/.test(await p.evaluate(()=>document.getElementById('dlgSheet').innerText))&&/\.zip/.test(await p.evaluate(()=>document.getElementById('dlgNo').textContent)),'"Yes" asks where: the folder, or a backup (.zip), and says which folder to pick');
 await p.click('#dlgNo'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>window.__opened.length===1&&JSON.stringify(window.__opened[0].filters||[]).includes('zip')),'a backup is chosen as a .zip file');
 t(/Set up a new/.test(await cap())&&/backup/i.test(await p.evaluate(()=>document.getElementById('dlgSheet').innerText)),'the new folder for the backup says the backup goes into it');
 await p.fill('#dlgIn','Budi Santoso'); await p.click('#dlgOk'); await p.waitForTimeout(400);
 t(await p.evaluate(()=>window.__imported==='/h/old.zip'),'the backup is imported into the new folder');
 await r.b.close();
 r=await launch({vp:{width:1300,height:900}}); p=r.p; await stubDlg([null]);
 p.evaluate(()=>{ returning(); }); await p.waitForTimeout(250); await p.click('#dlgOk'); await p.waitForTimeout(250);
 t(await p.evaluate(()=>window.__opened.length===1&&window.__opened[0].directory===true&&/name/i.test(window.__opened[0].title)),'choosing the folder opens a folder picker that says the folder with your name is fine too');
 await r.b.close();
 // one folder too high, several users, a package without users
 r=await launch({vp:{width:1300,height:900},extra:{inspect_folder:{kind:'other',path:'/h/Documents',users:[],inside:'/h/Documents/Vantage'}}}); p=r.p;
 p.evaluate(()=>{ openChosen('/h/Documents'); }); await p.waitForTimeout(300);
 t(/inside this one/.test(await cap())&&/Vantage/.test(await p.evaluate(()=>document.getElementById('dlgSheet').innerText))&&!/Set up/.test(await cap()),'Documents (with Vantage in it) points to the Vantage folder instead of setting up a second one');
 await p.evaluate(()=>{ window.__extra.inspect_folder={kind:'user',path:'/h/Documents/Vantage/u',users:[]}; window.__extra.vantage_setup='x'; });
 await p.click('#dlgOk'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>window.__calls.filter(c=>c.cmd==='inspect_folder').map(c=>c.args.dir).includes('/h/Documents/Vantage')),'"Open it" opens the folder inside');
 await r.b.close();
 r=await launch({vp:{width:1300,height:900},extra:{inspect_folder:{kind:'package',path:'/h/V',users:['/h/V/anwar_budi','/h/V/putri_siti']},user_labels:['Budi Anwar','Siti Putri']}}); p=r.p;
 p.evaluate(()=>{ openChosen('/h/V'); }); await p.waitForTimeout(300);
 const opts=await p.evaluate(()=>[...document.querySelectorAll('#dlgSel option')].map(o=>o.textContent));
 t(/Which user/.test(await cap())&&opts.length===2&&opts.every(Boolean),'a Vantage folder with two users asks which one, by name: '+opts.join('|'));
 await p.selectOption('#dlgSel',{index:1}); await p.click('#dlgOk'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>localStorage.getItem('vantage.folder'))==='/h/V/putri_siti','the chosen user is opened, not the first one');
 await r.b.close();
 r=await launch({vp:{width:1300,height:900},extra:{inspect_folder:{kind:'package',path:'/h/V',users:[]}}}); p=r.p;
 p.evaluate(()=>{ openChosen('/h/V'); }); await p.waitForTimeout(300);
 t(/no user yet/.test(await p.evaluate(()=>document.getElementById('dlgSheet').innerText)),'a Vantage folder without a user is not called empty');
 await r.b.close();
 // the user menu can open an existing Vantage folder (a returning user who already made a fresh one was stuck)
 r=await launch({vp:{width:1300,height:900}}); p=r.p; await stubDlg([]);
 await p.click('#userMenuBtn'); await p.waitForTimeout(300);
 t(await p.evaluate(()=>!!document.querySelector('#umenu [data-openvantage]')),'the user menu has "Open a Vantage folder"');
 await p.click('#umenu [data-openvantage]'); await p.waitForTimeout(300);
 t(/Where is your Vantage/.test(await cap()),'"Open a Vantage folder" asks for the folder or a backup');
 await r.b.close();
 // the screen behind the welcome question (seen after Cancel) uses the same words; "your personal Vantage folder" was the confusing old wording (23 Nov)
 r=await launch({vp:{width:1300,height:900},scan:{ok:false}}); p=r.p; await p.evaluate(()=>{ localStorage.removeItem('vantage.folder'); folder=''; }); await p.evaluate(()=>render()); await p.waitForTimeout(300);
 await p.evaluate(()=>{ const d=document.getElementById('dlg'); if(!d.hidden) document.getElementById('dlgX').click(); }); await p.waitForTimeout(200);
 const empty=await p.evaluate(()=>({t:document.getElementById('view').innerText,who:document.getElementById('whoSub').textContent}));
 t(!/personal|Select Vantage folder|Select your folder/i.test(empty.t+empty.who)&&/not set up/i.test(empty.t),'the empty screen does not ask for a "personal Vantage folder": '+JSON.stringify(empty));
 // the open folder disappears (moved or deleted outside the app): like after "Delete user", the app looks for a folder in the usual place
 // before asking (23 Nov, real app: it only said "choose another folder" while one was waiting in Documents/Vantage)
 { const q=await launch({vp:{width:1300,height:900}});
   const now=await q.p.evaluate(async()=>{ window.__extra.existing_dirs=['/x/none']; window.__extra.find_users={users:['/x/found_here']}; await pruneUsers(); await new Promise(r=>setTimeout(r,300)); return folder; });
   t(now==='/x/found_here','a vanished folder: the app opens the Vantage folder it finds in the usual place: '+now); await q.b.close(); }
 // choosing the language in the tour changes every label, also the update button (stayed "Check for Updates" in Indonesian, 23 Nov, real app)
 { const q=await launch({vp:{width:1300,height:900}}); await q.p.evaluate(()=>startTour(true)); await q.p.waitForTimeout(400);
   await q.p.click('#tour [data-lang="id"]'); await q.p.waitForTimeout(400);
   const lbl=await q.p.evaluate(()=>document.getElementById('btnUpdateLbl').textContent.trim());
   t(lbl==='Cek update','the language chosen in the tour also renames the update button: '+lbl); await q.b.close(); }
 // switching back to the app (window focus) must not redraw the page under the mouse: the first click on the button was lost (23 Nov, real app)
 const same=await p.evaluate(async()=>{ const b=document.getElementById('btnPick'); window.dispatchEvent(new Event('focus')); await new Promise(r=>setTimeout(r,300)); return b.isConnected&&document.getElementById('btnPick')===b; });
 t(same,'with no folder yet, coming back to the window keeps the Get started button (no redraw that eats the click)');
 await p.click('#btnPick'); await p.waitForTimeout(300); t(/Welcome to Vantage/i.test(await cap()),'its button asks the welcome question');
 await r.b.close();
 console.log(`firstrun: ${ok} ok, ${bad} bad`); process.exit(bad?1:0);
})();
function ev2(p,f){ return p.evaluate(f); }
