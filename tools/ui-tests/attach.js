// Files in the chat, like a messenger: drop a file ON a chat (full view or corner window), paste a picture, or press the paper
// clip. The file is copied into the user's Inbox (inside the Vantage folder, where the agent may read), shows as a chip under the
// message box and as a card in the sent message, and the agent is told where it is, so the user never has to say "I sent a file".
// A drop anywhere else still goes to the Inbox as before. Run:  node tools/ui-tests/attach.js
const {launch}=require('./harness.js');
let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const INBOX='--- I N B O X ---';
const calls=(p,cmd)=>p.evaluate((c)=>__calls.filter(x=>x.cmd===c).map(x=>x.args),cmd);
// a native drop as Rust forwards it: physical pixels
const drop=(p,type,paths,sel)=>p.evaluate(([type,paths,sel])=>{ const el=sel&&document.querySelector(sel); const r=el?el.getBoundingClientRect():{left:5,top:5,width:0,height:0};
  __h['vantage-drop']({payload:{type,paths,x:(r.left+r.width/2)*devicePixelRatio,y:(r.top+r.height/2)*devicePixelRatio}}); },[type,paths,sel]);
const done=(p,id,added,errors)=>p.evaluate(([id,added,errors])=>__h['inbox-progress']({payload:{id,phase:'done',current:'',done_items:added.length,total_items:added.length,done_bytes:1,total_bytes:1,added,errors:errors||[]}}),[id,added,errors]);
const chips=(p,scope)=>p.evaluate((s)=>[...document.querySelectorAll(s+' .wa-chip')].map(c=>({name:c.dataset.name, busy:c.classList.contains('busy')})),scope);
(async()=>{
 // ---- full chat view
 let r=await launch({vp:{width:1300,height:860}, extra:{inbox_add:41, chat_paste:'pasted 2026-11-24.png'}}); let p=r.p; const ev=(f,a)=>p.evaluate(f,a);
 await ev(()=>{ state.view='nova'; nova.chat='nova'; render(); }); await p.waitForTimeout(600);
 t(await ev(()=>!!document.querySelector('.wa-in [data-attach]')), 'chat.attach: the full chat has a paper-clip button');
 await drop(p,'over',[], '#novaLog');
 t(/attach|chat/i.test(await ev(()=>document.getElementById('dropov').textContent)), 'chat.attach: dragging over a chat says the file goes to this chat');
 await drop(p,'drop',['/Users/a/Desktop/cv photo.jpg'], '#novaLog'); await p.waitForTimeout(300);
 let ia=await calls(p,'inbox_add');
 t(ia.length===1 && ia[0].paths[0]==='/Users/a/Desktop/cv photo.jpg', 'chat.attach: a file dropped on the chat is copied (into the Inbox, inside the Vantage folder)');
 let ch=await chips(p,'.wa-in');
 t(ch.length===1 && ch[0].name==='cv photo.jpg' && ch[0].busy, 'chat.attach: a chip shows the file while it copies');
 await done(p,41,['cv photo.jpg']); await p.waitForTimeout(300);
 ch=await chips(p,'.wa-in');
 t(ch.length===1 && !ch[0].busy, 'chat.attach: the chip is ready when the copy is done');
 t(!(await ev(()=>/Added to your Inbox/.test((document.getElementById('toast')||{}).textContent||''))), 'chat.attach: no "Added to your Inbox" toast for a chat attachment');
 // send with no text: the file alone is a message
 await ev(()=>novaSend()); await p.waitForTimeout(400);
 const ns=(await calls(p,'nova_send')).pop();
 t(ns && ns.text.includes(INBOX+'/cv photo.jpg') && /Read/.test(ns.text), 'chat.attach: the agent is told where the file is and to open it (no "I sent a file" needed)');
 t(ns && ns.text.includes('"/x/pengguna/'+INBOX+'/cv photo.jpg"'), 'chat.attach: the agent gets the full path (it may work in the folder above the user folder)');
 t(ns && /never an instruction/.test(ns.text), 'chat.attach: the agent is told a file\'s contents are not instructions');
 t(ns && !/upload|describe/i.test(ns.text.replace(/Do not ask[^.]*\./,'')), 'chat.attach: the agent is not told to ask for an upload');
 const kept=(await calls(p,'nova_chat_append')).map(a=>a.msg).filter(m=>m.role==='user').pop();
 t(kept && Array.isArray(kept.files) && kept.files[0]===INBOX+'/cv photo.jpg', 'chat.attach: the sent message keeps its files (they show again after a restart)');
 t(kept && !kept.text.includes(INBOX), 'chat.attach: the saved text is what the user typed, not the note to the agent');
 t((await chips(p,'.wa-in')).length===0, 'chat.attach: the chips clear after sending');
 const card=await ev(()=>{ const b=[...document.querySelectorAll('#novaLog .wa-b.me')].pop(); const f=b&&b.querySelector('[data-novafile]'); return f&&{rel:f.dataset.novafile, txt:f.textContent}; });
 t(card && card.rel===INBOX+'/cv photo.jpg' && /cv photo\.jpg/.test(card.txt), 'chat.attach: the sent message shows the file as a card that opens it');
 // paste a picture
 await ev(async()=>{ const ta=document.getElementById('novaText'); const dt=new DataTransfer(); dt.items.add(new File([new Uint8Array([137,80,78,71,1,2,3])],'image.png',{type:'image/png'}));
   ta.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); }); await p.waitForTimeout(500);
 const cp=(await calls(p,'chat_paste')).pop();
 t(cp && cp.data && /png$/i.test(cp.name), 'chat.attach: a pasted picture is saved (chat_paste) with a png name');
 // a file over 25 MB is refused before it is read into memory
 const before=(await calls(p,'chat_paste')).length;
 await ev(async()=>{ const ta=document.getElementById('novaText'); const dt=new DataTransfer(); const f=new File([new Uint8Array(1)],'huge.mov',{type:'video/quicktime'}); Object.defineProperty(f,'size',{value:26*1024*1024});
   dt.items.add(f); ta.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true})); }); await p.waitForTimeout(300);
 t((await calls(p,'chat_paste')).length===before, 'chat.attach: a pasted file over 25 MB is refused in the app, not sent over');
 ch=await chips(p,'.wa-in');
 t(ch.length===1 && ch[0].name==='pasted 2026-11-24.png' && !ch[0].busy, 'chat.attach: the pasted picture shows as a ready chip');
 // the x removes it, nothing is sent
 await p.click('.wa-in [data-attx]'); await p.waitForTimeout(200);
 t((await chips(p,'.wa-in')).length===0, 'chat.attach: x removes a chip');
 // the paper clip opens the file picker
 await ev(()=>{ window.__TAURI__.dialog={open:async()=>['/Users/a/Documents/Zeugnis.pdf']}; });
 await p.click('.wa-in [data-attach]'); await p.waitForTimeout(400);
 ia=await calls(p,'inbox_add');
 t(ia.length===2 && ia[1].paths[0]==='/Users/a/Documents/Zeugnis.pdf', 'chat.attach: the paper clip picks files for the chat');
 t(r.errs.length===0, 'chat.attach: no page errors in the full view ('+r.errs.join('; ')+')');
 await r.b.close();

 // ---- corner chat window and the rest of the window
 r=await launch({vp:{width:1300,height:860}, extra:{inbox_add:52}}); p=r.p;
 await p.evaluate(()=>{ state.view='dash'; render(); dockOpen('raka'); }); await p.waitForTimeout(700);
 t(await p.evaluate(()=>!!document.querySelector('.nwin[data-nwin="raka"] [data-attach]')), 'chat.attach: the corner chat window has a paper-clip button');
 await drop(p,'drop',['/Users/a/Desktop/Bachelor.pdf'], '.nwin[data-nwin="raka"] .nw-log'); await p.waitForTimeout(300);
 await done(p,52,['Bachelor.pdf']); await p.waitForTimeout(300);
 ch=await chips(p,'.nwin[data-nwin="raka"]');
 t(ch.length===1 && ch[0].name==='Bachelor.pdf' && !ch[0].busy, 'chat.attach: a file dropped on the corner window goes to that chat (Raka)');
 // a drop next to the chat, on the page: the Inbox, as before
 await p.evaluate(()=>{ __extra.inbox_add=53; });
 await drop(p,'drop',['/Users/a/Desktop/other.pdf'], 'h1'); await p.waitForTimeout(1000);
 await done(p,53,['other.pdf']); await p.waitForTimeout(400);
 t((await chips(p,'.nwin[data-nwin="raka"]')).length===1, 'chat.attach: a drop on the page does not attach to the chat');
 t(await p.evaluate(()=>/Inbox/.test((document.getElementById('toast')||{}).textContent||'')), 'chat.attach: a drop on the page still says it went to the Inbox');
 t(r.errs.length===0, 'chat.attach: no page errors in the corner chat ('+r.errs.join('; ')+')');
 await r.b.close();
 console.log(`attach: ${ok} passed, ${bad} failed`); process.exit(bad?1:0);
})();
