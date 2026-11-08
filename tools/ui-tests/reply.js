// Reply length per agent: conversation stays short, work replies (analysis, documents, checks, interviews) are not cut short.
// Plain node, no browser:  node tools/ui-tests/reply.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ui = (f) => fs.readFileSync(path.join(__dirname, '../../ui', f), 'utf8');
const nova = ui('nova.js');
let ok = 0, bad = 0; const t = (c, m) => { if (c) ok++; else { bad++; console.log('FAIL', m); } };
const a = nova.indexOf('// <reply-profile>'), b = nova.indexOf('// </reply-profile>');
t(a >= 0 && b > a, 'reply-profile block exists in ui/nova.js');
if (a >= 0 && b > a) {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(nova.slice(a, b) + '\nthis.rule = novaReplyRule;', ctx);
  const rule = ctx.rule, SHORT = /Keep every reply short/, WORK = /work reply/i, FACTS = /Morning Report/;
  t(SHORT.test(rule({id: 'nova', agent: ''}, '', 'standard')), 'Nova chat stays short');
  t(SHORT.test(rule({id: 'raka', agent: 'raka'}, 'raka', 'standard')), 'Raka stays short');
  for (const ag of ['arga', 'bayu', 'tari', 'laras']) t(WORK.test(rule({id: ag, agent: ag}, ag, 'standard')) && !SHORT.test(rule({id: ag, agent: ag}, ag, 'standard')), ag + ' gets the work rule, not the short one');
  t(WORK.test(rule({id: 'lamaran', group: true, agent: ''}, '', 'standard')), 'the Applications group gets the work rule');
  t(WORK.test(rule({id: 'nova', agent: ''}, 'arga', 'standard')), 'a message sent straight to Arga gets the work rule');
  t(SHORT.test(rule({id: 'laras', agent: 'laras'}, 'laras', 'short')), 'level Short cuts every reply');
  t(WORK.test(rule({id: 'nova', agent: ''}, '', 'full')), 'level Full gives Nova the work rule');
  t(SHORT.test(rule({id: 'lamaran', group: true}, '', 'full', true)), 'the Inbox tidy-up always stays short');
  for (const lv of ['short', 'standard', 'full']) t(FACTS.test(rule({id: 'nova'}, '', lv)), 'the Morning Report facts stay at level ' + lv);
  t(/against the files/.test(rule({id: 'arga', agent: 'arga'}, 'arga', 'standard')), 'work rule demands checking requirements against files');
}
t(!/one short message per member/.test(nova), 'group rules no longer force one short message per member');
t(/id:"lamaran"[^\n]*budget:8/.test(nova), 'Applications hard limit is the high safety limit ($8)');
t(/data-nm="detail"/.test(ui('chatdock.js')), 'the chat menu has the Reply detail dropdown');
console.log(ok + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
