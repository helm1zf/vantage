// FEATURE REGISTRY = the map of what Vantage does, per tab (class) and per feature (function), and the single list the tester is held to.
// check_all fails when: a tab in the sidebar has no entry here; a feature has no passing check or a failing one; a check belongs to no feature;
// a button in ui/ is not listed under a feature (a new button = a new feature entry = a new test); or a listed button is never pressed by any test
// (unless it sits in `untested` WITH a reason, which is shown as debt in every report). Change a tab, change this file and its tests.
//   checks: [[test file, /regex on the check's message/], ...]      controls: '#id' of a button or '[data-name]' of a button/link
const T = (file, re) => [file, re];
exports.TABS = {
  inbox: {title:'Inbox', features:{
    tidy:      {what:'Tidy up: Raka sorts the Inbox; says what moved, what went to the Trash, what was skipped', checks:[T('inbox.js',/tidy|Raka|with Nova|Claude|import step|lists what moved|duplicates|Trash|skipped|brief/i)], controls:['#btnTidy','[data-novatidy]']},
    undo:      {what:'Undo the last tidy-up', checks:[T('inbox.js',/Undo|damaged/i)], controls:['[data-act]']},
    remove:    {what:'Remove files from the Inbox (to the Trash)', checks:[T('inbox.js',/accent button on the Inbox|sideways/i)], controls:['#btnIbTrash','[data-ibtrash]']},
  }},
  dash: {title:'Dashboard', features:{
    numbers:   {what:'Four number tiles that match the data; the funnel is folded', checks:[T('dashboard.js',/tile|funnel|numbers are quieter|black status/i)], controls:[]},
    hierarchy: {what:'One focus step, one accent button, quiet secondary cards, no sideways scroll', checks:[T('dashboard.js',/focus|accent|secondary|sideways|backup reminder|Morning report card|late label|coloured|errors/i),T('first_paint.js',/.*/)], controls:[]},
    today:     {what:'Today card: due steps once, tick, snooze, goal, hide', checks:[T('dashboard.js',/appears once|overdue|Today/i),T('integration.js',/tick|snooze|snoozed|Today|Needs attention|steps listed/i)], controls:['#tdGoal']},
    attention: {what:'Needs attention: interview date missing, mark as followed up', checks:[T('data.js',/interview date|draft to Arga/i),T('buttons.js',/followed up|due list|Needs attention/i)], controls:['[data-dismiss]']},
    cards:     {what:'Customize cards, backup reminder, layout', checks:[T('integration.js',/no page errors|layout|footer|backup|hidden|undefined text|reminder|export/i)], controls:['#dwCust','#bkNow','#bkOff','#btnWReset']},
    nodata:    {what:'First screen of a new user: one accent button that opens a chat', checks:[T('firstrun.js',/first screen|first draw/i)], controls:['#spGo']},
  }},
  laporan: {title:'Morning report', features:{
    page:      {what:'Report tabs (today / considered / search), no junk text, old reports labelled', checks:[T('morning.js',/undefined|Invalid|NaN|null|Fit\/Gap|tabs|first tab|Search tab|Considered|older report|sideways/i),T('badreport.js',/.*/)], controls:['[data-rtab]','[data-reprange]','[data-rep]']},
    answer:    {what:'Go, Skip and "score feels wrong" go straight to the agent', checks:[T('morning.js',/accent button|top recommendation|quiet while/i),T('buttons.js',/Go|Skip|Score feels wrong|👍|Message ready|reference in an English/i)], controls:[]},
    schedule:  {what:'Real OS schedule: switch, next/last run, failures, refusals', checks:[T('morning.js',/timer|schedule|switch|OS task|runs while|failed run|sched_set|registered|refused|status|Find jobs now/i)], controls:['#btnLpRun','#btnLpCancel','#btnLpEdit']},
    search:    {what:'Search settings drawer (keywords, places, match threshold)', checks:[T('morning.js',/search and schedule share/i)], controls:['#btnSsSave','#btnSsRun','#btnSsFill','#ssMaxDn','#ssMaxUp','[data-v]']},
  }},
  apps: {title:'Applications', features:{
    board:     {what:'Board and List of one tracker; an overdue strip; search, status filter, sort; move to another stage', checks:[T('priority.js',/no match|overdue|strip|list|search|status|sort|drawer|Applications|late|warning colour/i),T('integration.js',/apps controls|two actions|duplicate|add_application|count shown|select bar|picked|bar hidden/i)], controls:['[data-amode]','[data-range]','[data-open]','#sortDir','#drMove','#btSel','#btMove','#btClear','[data-mvid]','[data-rmapp]','#drClose']},
    honest:    {what:'A damaged applications.json is said out loud; empty tracker text is true', checks:[T('data.js',/board:|list:|empty tracker/i)], controls:['[data-fixtext]']},
    contacts:  {what:'Contacts, follow-up, notes, export', checks:[T('integration.js',/export|contacts|contact|follow|notes|draft uses/i)], controls:[]},
  }},
  offers: {title:'Offers', features:{
    compare:   {what:'Compare offers with your weights; a winner only with real numbers; add and remove by hand', checks:[T('offers.js',/.*/)], controls:['#ofAdd','[data-ofdel]']},
  }},
  interview: {title:'Interview', features:{
    prepare:   {what:'One accent button (the soonest interview), its date, Laras gets the request', checks:[T('priority.js',/Interview|interview/),T('buttons.js',/Interview page|chat with Laras/)], controls:['[data-ivaddb]','[data-ivscore]']},
  }},
  learn: {title:'Learn', features:{
    plan:      {what:'Only a plan Arga wrote shows weeks; read errors are not "no data"; singular/plural', checks:[T('learn.js',/.*/)], controls:['#lhPlan','#lhPack','#lhRetry','[data-lhsel]','[data-lhlv]']},
    pack:      {what:'Build the study pack from the selected plan, with the real error', checks:[T('buttons.js',/study pack/)], controls:['#pscBuild','#pscBtn','#pscAgain','[data-pscopen]']},
  }},
  profil: {title:'Profile', features:{
    master:    {what:'Master CV: one accent when missing/outdated, never "Loading…" forever, Word-only CV', checks:[T('priority.js',/Profile/),T('buttons.js',/Master CV|Loading|Word-only|personal page|open_file|Python/)], controls:['#mcvRetry','#btnPick']},
    health:    {what:'System check (Python missing is said, not "update Vantage")', checks:[T('doctor.js',/.*/)], controls:['#btnCheck','#docPyOpen','[data-docfix]']},
    materials: {what:'Materials list, groups, search, open', checks:[T('inbox.js',/Profile does not/)], controls:['[data-mat]','[data-matnav]','[data-mgroup]','[data-mtoggle]','[data-q]','[data-ufolder]','[data-openfile]','[data-viewfile]','[data-file]','[data-url]','[data-hl]']},
    account:   {what:'Export, import, edit name, open folder, delete user', checks:[T('integration.js',/export date|no reminder/)], controls:['#btnBackup','#btnImport','#btnEditName','#btnOpenUser','#btnDelUser','#btnPickDir','#btnPickFiles']},
  }},
  skill: {title:'Skills', features:{
    gaps:      {what:'Skill gaps from the job ads; plans matched by the skill name; read errors have a retry', checks:[T('learn.js',/Skills tab|Java|Präsentation/)], controls:['[data-skfilter]','#skRetry']},
  }},
  settings: {title:'Settings', features:{
    choices:   {what:'Theme, language, reminders, tutorial, hidden cards: dropdowns on one page', checks:[T('settings.js',/.*/),T('integration.js',/dark theme|theme saved|back to automatic/)], controls:['#stCards','#stMorning']},
  }},
  nova: {title:'Chats (Nova and agents)', features:{
    routing:   {what:'Who answers what; buttons hand over to the right agent, with no loop', checks:[T('route.js',/.*/),T('registry.js',/.*/),T('buttons.js',/these buttons only fill the chat box/)], controls:['#novaSend','#novaStop','[data-chat]','[data-novachat]','[data-novamove]','[data-nw]','[data-nm]','[data-perm]','[data-novafile]','[data-novalink]','[data-send]']},
    reply:     {what:'Reply detail (short / standard / full) and the work rule per agent', checks:[T('reply.js',/.*/)], controls:[]},
  }},
  app: {title:'App frame (header, updates, first run)', features:{
    update:    {what:'One update path (top-right button): app and files; honest offline/failed messages', checks:[T('updates.js',/.*/),T('inbox.js',/version/)], controls:['#btnUpdate','#toastAct']},
    firstrun:  {what:'Plain-words errors, missing/iCloud folder, login that never finishes', checks:[T('firstrun.js',/.*/)], controls:['#btnRepair','#slOk']},
    tour:      {what:'Tutorial: opens from "?", topics, sections, close', checks:[], controls:['#btnTour','[data-tact]','[data-sec]','[data-lang]']},
    frame:     {what:'Dialogs, user menu, side bar, context menu', checks:[], controls:['#dlgOk','#dlgNo','#userBtn','#userMenuBtn','#sbToggle','#ctxOpen','#fuCopy','#fuPolish','#fuDone']},
  }},
};
// Controls that exist but no test presses yet. Each needs a reason; they are listed as debt in every report and each one is a to-do.
exports.UNTESTED = {};
// Controls that are not features of their own (the generic parts every tab shares) - each with the reason.
exports.NOT_A_FEATURE = {};
