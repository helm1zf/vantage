// Every agent has its own character picture (ui/avatars/<name>.svg) wherever it shows in the chats: the chat list, the chat
// header, the corner chat stack and the member names inside the Applications group. Never a bare initial letter for an agent.
// Light and dark theme. Run:  node tools/ui-tests/avatars.js
const {launch}=require('./harness.js'); const fs=require('fs'), path=require('path');
let ok=0,bad=0; const t=(c,m)=>{ require('./report.js').rec(__filename,c,m); if(c) ok++; else { bad++; console.log('FAIL',m);} };
const AGENTS=['Nova','Raka','Sinta','Arga','Bayu','Tari','Laras'];
for (const a of AGENTS) t(fs.existsSync(path.join(__dirname,'../../ui/avatars',a.toLowerCase()+'.svg')), `chat.avatars: ui/avatars/${a.toLowerCase()}.svg exists`);
(async()=>{
 for (const theme of ['light','dark']) {
  const r=await launch({vp:{width:1400,height:900}, prefs:{theme}}); const p=r.p; const ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ state.view='nova'; render(); }); await p.waitForTimeout(700);
  // chat list: Nova, Raka, Laras show their own picture; the Applications group shows its four members
  const list=await ev(()=>[...document.querySelectorAll('.wa-item')].map(b=>({chat:b.dataset.novachat, imgs:[...b.querySelectorAll('.wa-av img')].map(i=>({src:i.getAttribute('src'), w:i.naturalWidth})), txt:(b.querySelector('.wa-av')||{}).textContent||''})));
  for (const [chat,who] of [['nova','nova'],['raka','raka'],['laras','laras']]) {
   const it=list.find(x=>x.chat===chat);
   t(it && it.imgs.length===1 && it.imgs[0].src==='avatars/'+who+'.svg', `chat.avatars: ${theme}: ${chat} in the chat list shows avatars/${who}.svg`);
   t(it && it.imgs.every(i=>i.w>0), `chat.avatars: ${theme}: the ${chat} picture really loads`);
   t(it && !it.txt.trim(), `chat.avatars: ${theme}: ${chat} has no initial letter next to its picture`);
  }
  const g=list.find(x=>x.chat==='lamaran');
  t(g && ['sinta','arga','bayu','tari'].every(n=>g.imgs.some(i=>i.src==='avatars/'+n+'.svg')), `chat.avatars: ${theme}: the Applications group shows Sinta, Arga, Bayu and Tari`);
  // header of the open chat
  const head=await ev(()=>{ const i=document.querySelector('.wa-head .wa-av img'); return i&&i.getAttribute('src'); });
  t(head==='avatars/nova.svg', `chat.avatars: ${theme}: the open chat header shows the agent's picture`);
  // a group message from a member: picture + name, not a coloured name only
  await ev(()=>{ novaSt('lamaran').msgs.push({role:'nova',text:'**Sinta:** Found 3 new ads.\n\n**Arga:** Blauberg AG fits 87%.',at:Date.now()}); nova.chat='lamaran'; render(); }); await p.waitForTimeout(500);
  const who=await ev(()=>[...document.querySelectorAll('#novaLog .wa-who')].map(w=>({name:w.textContent.trim(), src:(w.querySelector('img')||{getAttribute:()=>''}).getAttribute('src')})));
  t(who.some(w=>w.name==='Sinta'&&w.src==='avatars/sinta.svg') && who.some(w=>w.name==='Arga'&&w.src==='avatars/arga.svg'), `chat.avatars: ${theme}: group messages show the member's picture next to the name`);
  // corner chat: back to a normal page, the collapsed stack shows pictures
  await ev(()=>{ state.view='dash'; render(); }); await p.waitForTimeout(600);
  const stack=await ev(()=>[...document.querySelectorAll('.nw-stack .wa-av')].map(a=>({img:!!a.querySelector('img'), txt:a.textContent.trim()})));
  t(stack.length>0 && stack.every(a=>a.img && !a.txt), `chat.avatars: ${theme}: the corner chat stack shows pictures, no letters`);
  t(r.errs.length===0, `chat.avatars: ${theme}: no page errors (${r.errs.join('; ')})`);
  await r.b.close();
 }
 console.log(`avatars: ${ok} passed, ${bad} failed`); process.exit(bad?1:0);
})();
