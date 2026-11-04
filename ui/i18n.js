// Interface language (en/de/id): navigation labels, the tutorial, and every request text sent to Nova.
// Stored per user in --usersettings/app_prefs.json (see prefs_get/prefs_set in main.rs).
const LANGS = [["en", "English"], ["de", "Deutsch"], ["id", "Bahasa Indonesia"]];
let lang = "en";
// Dates follow the interface language.
const LOC = () => ({en:"en-GB", de:"de-DE", id:"id-ID"})[lang] || "en-GB";
const MONTHS = {en:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
                de:["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sept.","Okt.","Nov.","Dez."],
                id:["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]};
const NAV = {
  inbox:     {en:"Inbox", de:"Inbox", id:"Inbox"},
  dash:      {en:"Dashboard", de:"Dashboard", id:"Dashboard"},
  pipeline:  {en:"Pipeline", de:"Pipeline", id:"Pipeline"},
  apps:      {en:"Applications", de:"Bewerbungen", id:"Lamaran"},
  interview: {en:"Interview", de:"Interview", id:"Interview"},
  laporan:   {en:"Morning report", de:"Morgenbericht", id:"Laporan pagi"},
  nova:      {en:"Nova", de:"Nova", id:"Nova"},
  profil:    {en:"Profile", de:"Profil", id:"Profil"},
  skill:     {en:"Skills", de:"Skills", id:"Skill"},
};
// Small group headings in the sidebar.
const NAVH = {
  search: {en:"Job search", de:"Bewerbung", id:"Lamaran"},
  you:    {en:"You", de:"Du", id:"Kamu"},
};
// Requests the app puts into the Vantage chat. Nova replies in the language it is spoken to.
const SAY = {
  tidy: {
    en: () => "Nova, please sort everything in my Inbox into my user documents following the Vantage standard, then ask Raka to unpack the new material.",
    de: () => "Nova, bitte sortiere alles aus meiner Inbox nach Vantage-Standard in meine User-Dokumente und bitte dann Raka, das neue Material aufzubereiten.",
    id: () => "Nova, tolong sortir semua isi Inbox aku ke user documents sesuai standar Vantage, lalu minta Raka mengupas bahan yang baru.",
  },
  mcv: {
    en: () => "Update my Master CV from the latest 01_user_documents/raw_facts_about_you.md, following sop/master_cv.md (have Tari check it).",
    de: () => "Aktualisiere meinen Master-CV aus der neuesten 01_user_documents/raw_facts_about_you.md, nach sop/master_cv.md (von Tari prüfen lassen).",
    id: () => "Perbarui Master CV aku dari 01_user_documents/raw_facts_about_you.md terbaru, sesuai sop/master_cv.md (minta Tari mengeceknya).",
  },
  interview: {
    en: (c, r) => `Nova, ask Laras to prepare the interview for my application at ${c} (${r}), following sop/persiapan_interview.md.`,
    de: (c, r) => `Nova, bitte Laras, das Interview für meine Bewerbung bei ${c} (${r}) vorzubereiten, nach sop/persiapan_interview.md.`,
    id: (c, r) => `Nova, minta Laras siapkan interview untuk lamaran ${c} (${r}), sesuai sop/persiapan_interview.md.`,
  },
  kupasSync: {
    en: () => "Raka, my materials index has no status table yet (my folder is older than status tracking). Please add it to materials/00_index.md following the template and onboarding/wawancara/kupas_bahan.md. For every material mark Read in full, Facts drawn and Confirmed by me with yes only when 01_user_documents/raw_facts_about_you.md cites that material (its ID). Do not guess: where 01_user_documents/raw_facts_about_you.md says nothing, leave it as not done. Then tell me how many materials are discussed.",
    de: () => "Raka, in meinem Materialindex gibt es noch keine Statustabelle (mein Ordner ist älter als die Statusverfolgung). Bitte lege sie in materials/00_index.md nach der Vorlage und onboarding/wawancara/kupas_bahan.md an. Markiere bei jedem Material „Vollständig gelesen“, „Fakten gezogen“ und „Von mir bestätigt“ nur dann mit ja, wenn 01_user_documents/raw_facts_about_you.md dieses Material (seine ID) belegen. Rate nicht: wo 01_user_documents/raw_facts_about_you.md nichts sagt, bleibt es offen. Sag mir danach, wie viele Materialien besprochen sind.",
    id: () => "Raka, indeks bahanku belum punya tabel status (foldernya lebih lama dari fitur status). Tolong buat tabelnya di materials/00_index.md sesuai template dan onboarding/wawancara/kupas_bahan.md. Untuk tiap bahan, isi Dibaca utuh, Fakta ditarik, dan Dikonfirmasi user dengan ya hanya kalau 01_user_documents/raw_facts_about_you.md menyebut bahan itu (lewat ID-nya). Jangan menebak: kalau 01_user_documents/raw_facts_about_you.md tidak menyebut, biarkan belum. Lalu kabari aku berapa bahan yang sudah dibahas.",
  },
  interviewGo: {
    en: (c, r) => `I want to practise for my interview at ${c} (${r}). Please follow sop/persiapan_interview.md. First look at my practice track record for this application (the practice log in its folder) and tell me in a few lines what we practised before, how it went and what is still weak. Then propose what to practise now and ask the first question as soon as I say I am ready.`,
    de: (c, r) => `Ich möchte für mein Interview bei ${c} (${r}) üben. Bitte folge sop/persiapan_interview.md. Schau zuerst in meine Übungshistorie zu dieser Bewerbung (das Übungslog in ihrem Ordner) und sag mir in wenigen Zeilen, was wir schon geübt haben, wie es lief und was noch schwach ist. Schlag dann vor, was wir jetzt üben, und stell die erste Frage, sobald ich sage, dass ich bereit bin.`,
    id: (c, r) => `Aku mau latihan untuk interview di ${c} (${r}). Tolong ikuti sop/persiapan_interview.md. Lihat dulu riwayat latihanku untuk lamaran ini (log latihan di foldernya), lalu ceritakan singkat apa yang sudah kita latih, bagaimana hasilnya, dan apa yang masih lemah. Setelah itu usulkan apa yang dilatih sekarang dan ajukan pertanyaan pertama begitu aku bilang siap.`,
  },
  go: {
    en: (ref) => `Nova, go for ${ref} (Arga full analysis, then Bayu documents).`,
    de: (ref) => `Nova, los mit ${ref} (Arga volle Analyse, dann Bayu Dokumente).`,
    id: (ref) => `Nova, gas ${ref} (Arga analisis penuh, lalu Bayu dokumen).`,
  },
  skip: {
    en: (ref) => `Nova, skip ${ref} (Sinta logs it).`,
    de: (ref) => `Nova, überspringe ${ref} (Sinta notiert es).`,
    id: (ref) => `Nova, lewati ${ref} (Sinta catat).`,
  },
  down: {
    en: (ref) => `👎 ${ref}: the score feels wrong`,
    de: (ref) => `👎 ${ref}: der Score fühlt sich falsch an`,
    id: (ref) => `👎 ${ref}: skornya terasa salah`,
  },
  search: {en: () => "@Sinta change search: ", de: () => "@Sinta Suche ändern: ", id: () => "@Sinta ubah pencarian: "},
  study:  {en: () => "study plan", de: () => "Lernplan", id: () => "rencana belajar"},
  runreport: {
    en: () => "Run the Morning Report now with my search settings (--usersettings/search_settings.json), following sop/laporan_pagi.md.",
    de: () => "Starte den Morgenbericht jetzt mit meinen Sucheinstellungen (--usersettings/search_settings.json), nach sop/laporan_pagi.md.",
    id: () => "Jalankan Morning Report sekarang pakai pengaturan pencarianku (--usersettings/search_settings.json), sesuai sop/laporan_pagi.md.",
  },
  studyplan: {
    en: (k) => `Make a study plan for "${k}" (sop/rencana_belajar.md).`,
    de: (k) => `Erstelle einen Lernplan für "${k}" (sop/rencana_belajar.md).`,
    id: (k) => `Buat rencana belajar untuk "${k}" (sop/rencana_belajar.md).`,
  },
  kupas: {
    en: () => "Nova, ask Raka to go through my materials that are not fully discussed yet: fill the kupas table in materials/00_index.md from what is already in 01_user_documents/raw_facts_about_you.md, and ask me to confirm the rest.",
    de: () => "Nova, bitte Raka, meine noch nicht ganz besprochenen Materialien durchzugehen: die Kupas-Tabelle in materials/00_index.md aus der vorhandenen 01_user_documents/raw_facts_about_you.md füllen und mich den Rest bestätigen lassen.",
    id: () => "Nova, minta Raka membahas bahan-bahanku yang belum tuntas dikupas: isi tabel kupas di materials/00_index.md dari yang sudah ada di 01_user_documents/raw_facts_about_you.md, lalu minta aku konfirmasi sisanya.",
  },
  update: {
    en: () => "Nova, update my Vantage to the latest version following sop/update.md.",
    de: () => "Nova, aktualisiere mein Vantage auf die neueste Version nach sop/update.md.",
    id: () => "Nova, update Vantage aku ke versi terbaru sesuai sop/update.md.",
  },
};
const say = (k, ...a) => (SAY[k][lang] || SAY[k].en)(...a);
function applyLang(){
  document.documentElement.lang = lang;
  if (typeof MON !== "undefined") MON.splice(0, 12, ...(MONTHS[lang] || MONTHS.en));
  document.querySelectorAll("#nav a[data-view]").forEach(a => {
    const t = NAV[a.dataset.view]; if (!t) return;
    const node = [...a.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
    if (node) node.textContent = t[lang] || t.en;
    if (a.classList.contains("on")) $("title").textContent = t[lang] || t.en;
  });
  document.querySelectorAll("#nav .navh").forEach(h => { const t = NAVH[h.dataset.h]; if (t) h.textContent = t[lang] || t.en; });
  if (typeof trTree === "function") trTree(document.body);
}

// Confirmation dialogs. Status names (Rejected, Interview R1, …) stay as they are: they are the tracker's values.
const DLG = {
  cancel: {en:"Cancel", de:"Abbrechen", id:"Batal"},
  ok: {en:"OK", de:"OK", id:"OK"},
  move: {en:"Move", de:"Verschieben", id:"Pindahkan"},
  remove: {en:"Remove", de:"Entfernen", id:"Hapus"},
  create: {en:"Create", de:"Erstellen", id:"Buat"},
  note: {en:"This moves its folder and updates the tracker.", de:"Dabei wird der Ordner verschoben und der Tracker aktualisiert.", id:"Foldernya ikut dipindah dan tracker diperbarui."},
  sentNote: {en:" Only do this once you have actually sent the application.", de:" Mach das erst, wenn du die Bewerbung wirklich abgeschickt hast.", id:" Lakukan ini hanya kalau lamarannya benar-benar sudah dikirim."},
  closedT: {en:(c) => `Move ${c} to Closed`, de:(c) => `${c} nach Closed verschieben`, id:(c) => `Pindahkan ${c} ke Closed`},
  closedX: {en:"Choose the final status. ", de:"Wähle den endgültigen Status. ", id:"Pilih status akhirnya. "},
  ivT: {en:(c) => `Move ${c} to Interview`, de:(c) => `${c} nach Interview verschieben`, id:(c) => `Pindahkan ${c} ke Interview`},
  ivX: {en:"Choose the stage. ", de:"Wähle die Phase. ", id:"Pilih tahapnya. "},
  moveT: {en:"Move application", de:"Bewerbung verschieben", id:"Pindahkan lamaran"},
  moveX: {en:(c, f, t) => `Move ${c} from ${f} to ${t}? `, de:(c, f, t) => `${c} von ${f} nach ${t} verschieben? `, id:(c, f, t) => `Pindahkan ${c} dari ${f} ke ${t}? `},
  rmT: {en:"Remove from tracker", de:"Aus dem Tracker entfernen", id:"Hapus dari tracker"},
  rmX: {en:(c, r) => `Remove ${c} (${r}) from applications.json and the Excel tracker? Its folder is already gone. You can undo right after.`,
        de:(c, r) => `${c} (${r}) aus applications.json und dem Excel-Tracker entfernen? Der Ordner existiert schon nicht mehr. Du kannst es direkt danach rückgängig machen.`,
        id:(c, r) => `Hapus ${c} (${r}) dari applications.json dan tracker Excel? Foldernya memang sudah tidak ada. Bisa di-undo setelahnya.`},
  newT: {en:"Create new user", de:"Neuen Benutzer anlegen", id:"Buat user baru"},
  newX: {en:"A new Vantage folder is created from the Vantage template, next to your current one.", de:"Ein neuer Vantage-Ordner wird aus der Vorlage erstellt, neben deinem aktuellen Ordner.", id:"Folder Vantage baru dibuat dari template Vantage, di sebelah folder kamu sekarang."},
  newIn: {en:"Full name, e.g. Maria Sari", de:"Vollständiger Name, z. B. Maria Sari", id:"Nama lengkap, mis. Maria Sari"},
};
const dt = (k, ...a) => { const v = DLG[k][lang] || DLG[k].en; return typeof v === "function" ? v(...a) : v; };
