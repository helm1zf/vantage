// First-launch tutorial: language choice, then a few steps that point at the real controls.
// Shown once per user folder (app_prefs.json "tour"); replay from the user menu.
let prefs = {};
async function loadPrefs(){
  prefs = {};
  if (invoke && folder){ try { prefs = await invoke("prefs_get", {root:folder}) || {}; } catch {} }
  lang = LANGS.some(l => l[0] === prefs.lang) ? prefs.lang : "en";
  applyLang(); drawUpdBtn();
  if (state.view !== "nova") render();
  autoTour();
  checkUpdate(false);
}
async function copyText(text){ try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
const savePref = (key, value) => { prefs[key] = value; if (invoke && folder) invoke("prefs_set", {root:folder, key, value}).catch(e => toast(String(e))); };

const TX = {
  next:{en:"Next", de:"Weiter", id:"Lanjut"}, back:{en:"Back", de:"Zurück", id:"Kembali"},
  skip:{en:"Skip tutorial", de:"Tutorial überspringen", id:"Lewati tutorial"}, done:{en:"Let's start", de:"Los geht's", id:"Mulai"},
  copy:{en:"Copy path", de:"Pfad kopieren", id:"Salin path"}, copied:{en:"Path copied", de:"Pfad kopiert", id:"Path disalin"},
  reveal:{en:IS_MAC ? "Open in Finder" : "Open in File Explorer", de:IS_MAC ? "Im Finder öffnen" : "Im Explorer öffnen", id:IS_MAC ? "Buka di Finder" : "Buka di File Explorer"},
  save:{en:"Save", de:"Speichern", id:"Simpan"},
};
const tx = (k) => TX[k][lang] || TX[k].en;
// Each step: target (CSS selector or null for a centred card), title and body per language.
const TOLD = [
  {lang:true, title:{en:"Choose your language", de:"Sprache wählen", id:"Pilih bahasa"},
   body:{en:"Vantage and the requests it sends to Nova will use this language. You can change it later in the user menu (▾).",
         de:"Vantage und die Anfragen an Nova verwenden diese Sprache. Du kannst sie später im Benutzermenü (▾) ändern.",
         id:"Vantage dan permintaan yang dikirim ke Nova akan memakai bahasa ini. Bisa diganti nanti lewat menu user (▾)."}},
  {target:"#userBtn", path:true, title:{en:"This is your Vantage folder", de:"Das ist dein Vantage-Ordner", id:"Ini folder Vantage kamu"},
   body:{en:"Everything Vantage knows about you lives in this folder on your computer: your materials, applications and reports. Nothing is stored anywhere else.",
         de:"Alles, was Vantage über dich weiß, liegt in diesem Ordner auf deinem Computer: Materialien, Bewerbungen und Berichte. Nichts wird woanders gespeichert.",
         id:"Semua yang Vantage tahu tentang kamu ada di folder ini di komputer kamu: bahan, lamaran, dan laporan. Tidak ada yang disimpan di tempat lain."}},
  {target:"#dock", title:{en:"Chat with the team", de:"Mit dem Team chatten", id:"Ngobrol dengan tim"},
   body:{en:"The chat in the bottom-right corner is where the work happens, in four chats: <b>Nova</b> (ask anything), <b>Raka</b> (your profile), the <b>Applications</b> group (job search, CVs, checks) and <b>Laras</b> (interview practice). The first time, connect Claude: Vantage installs Claude Code and you sign in with your Claude Pro or Max account on Claude's own page.",
         de:"Im Chat unten rechts passiert die Arbeit, in vier Chats: <b>Nova</b> (frag alles), <b>Raka</b> (dein Profil), die Gruppe <b>Bewerbungen</b> (Stellensuche, CVs, Prüfung) und <b>Laras</b> (Interview-Training). Beim ersten Mal verbindest du Claude: Vantage installiert Claude Code, und du meldest dich auf Claudes eigener Seite mit deinem Claude-Pro- oder Max-Konto an.",
         id:"Chat di pojok kanan bawah adalah tempat semua kerjaan, dalam empat chat: <b>Nova</b> (tanya apa saja), <b>Raka</b> (profil kamu), grup <b>Lamaran</b> (cari lowongan, CV, pengecekan), dan <b>Laras</b> (latihan interview). Pertama kali, sambungkan Claude: Vantage memasang Claude Code dan kamu masuk dengan akun Claude Pro atau Max di halaman resmi Claude."}},
  {target:'#nav a[data-view="inbox"]', title:{en:"Inbox", de:"Inbox", id:"Inbox"},
   body:{en:"Drop any file here: certificates, old CVs, notes. Then press <b>Tidy up</b>: Raka sorts everything into your documents and tells you where each file went.",
         de:"Zieh beliebige Dateien hierher: Zeugnisse, alte CVs, Notizen. Dann <b>Tidy up</b> drücken: Raka sortiert alles in deine Dokumente und sagt dir, wo jede Datei gelandet ist.",
         id:"Lempar file apa saja ke sini: sertifikat, CV lama, catatan. Lalu tekan <b>Tidy up</b>: Raka merapikan semuanya ke dokumen kamu dan memberi tahu tiap file masuk ke mana."}},
  {target:'#nav a[data-view="apps"]', title:{en:"Applications: Board and List", de:"Bewerbungen: Board und Liste", id:"Lamaran: Papan dan Daftar"},
   body:{en:"All your applications, in two views. Switch at the top of the tab: <b>Board</b> shows a card per application in columns (Preparing, Sent, Interview, Offer, Closed); <b>List</b> shows them sorted by date, name, score or status. Click any card or row to see its details and documents. On the Board, drag a card to the next column when something happens; Vantage moves the folder, updates your tracker, and you can undo.",
         de:"Alle Bewerbungen, in zwei Ansichten. Umschalten oben im Tab: <b>Board</b> zeigt jede Bewerbung als Karte in Spalten (Vorbereitung, Gesendet, Interview, Angebot, Abgeschlossen); <b>Liste</b> sortiert nach Datum, Name, Score oder Status. Klick auf eine Karte oder Zeile zeigt Details und Dokumente. Im Board ziehst du eine Karte in die nächste Spalte, wenn etwas passiert; Vantage verschiebt den Ordner, aktualisiert den Tracker, rückgängig machen geht auch.",
         id:"Semua lamaranmu, dalam dua tampilan. Ganti di bagian atas tab: <b>Papan</b> menampilkan satu kartu per lamaran dalam kolom (Persiapan, Terkirim, Interview, Offer, Selesai); <b>Daftar</b> mengurutkan menurut tanggal, nama, skor, atau status. Klik kartu atau baris untuk melihat detail dan dokumennya. Di Papan, geser kartu ke kolom berikutnya kalau ada perkembangan; Vantage memindahkan foldernya, memperbarui tracker, dan bisa di-undo."}},
];
// ---- Tutorial: topics (sections) with their own steps. A step can switch page (view), prepare something (before) and point at a control (target).
const L3 = (en, de, id) => ({en, de, id});
const TNEW = {
  palette:{target:"#btnPal", title:L3("Search everything", "Alles finden", "Cari apa saja"),
    body:L3("Press <b>Ctrl K</b> (⌘ K on a Mac) anywhere. One box finds pages, actions like Find jobs now, your applications, chats and materials. Arrow keys and Enter to open, Esc to close.",
      "Drücke überall <b>Strg K</b> (⌘ K auf dem Mac). Eine Box findet Seiten, Aktionen wie Find jobs now, deine Bewerbungen, Chats und Materialien. Pfeiltasten und Enter zum Öffnen, Esc zum Schließen.",
      "Tekan <b>Ctrl K</b> (⌘ K di Mac) di mana saja. Satu kotak menemukan halaman, aksi seperti Find jobs now, lamaran, chat, dan bahan. Panah dan Enter untuk membuka, Esc untuk menutup.")},
  report:{view:"laporan", target:'#nav a[data-view="laporan"]', title:L3("Morning report", "Morning Report", "Morning Report"),
    body:L3("Jobs that fit your profile, each with a match score out of 100. Press <b>Find jobs now</b> for a fresh report, or open <b>Search settings</b> to choose keywords, places and the minimum score.",
      "Stellen, die zu deinem Profil passen, jede mit einem Match-Score von 100. <b>Find jobs now</b> startet einen neuen Bericht; in den <b>Sucheinstellungen</b> wählst du Stichwörter, Orte und den Mindest-Score.",
      "Lowongan yang cocok dengan profilmu, masing-masing dengan skor kecocokan dari 100. Tekan <b>Find jobs now</b> untuk laporan baru, atau buka <b>Search settings</b> untuk memilih kata kunci, kota, dan skor minimum.")},
  sched:{view:"laporan", target:"#lpBar .lp-sched", title:L3("Daily search", "Tägliche Suche", "Pencarian harian"),
    body:L3("Turn this on and your computer starts the search by itself every day at the time you choose, even when Vantage is closed. The line next to the switch shows when it runs next and whether the last run worked.",
      "Schalte das ein, und dein Computer startet die Suche jeden Tag zur gewählten Uhrzeit von selbst, auch wenn Vantage geschlossen ist. Neben dem Schalter siehst du den nächsten Lauf und ob der letzte geklappt hat.",
      "Nyalakan ini dan komputermu memulai pencarian sendiri tiap hari pada jam yang kamu pilih, bahkan saat Vantage tertutup. Di samping saklar terlihat kapan jalan berikutnya dan apakah yang terakhir berhasil.")},
  periods:{view:"dash", target:".rseg", title:L3("Morning report on the Dashboard", "Morning Report im Dashboard", "Morning Report di Dashboard"),
    body:L3("Switch between <b>Day, Week, Month, Year and All</b>. Day shows only today's report; if there is none, it says so instead of showing an old one.",
      "Wechsle zwischen <b>Tag, Woche, Monat, Jahr und Alle</b>. Tag zeigt nur den heutigen Bericht; gibt es keinen, steht das da, statt eines alten.",
      "Ganti antara <b>Hari, Minggu, Bulan, Tahun, dan Semua</b>. Hari hanya menampilkan laporan hari ini; kalau belum ada, tertulis begitu, bukan laporan lama.")},
  paste:{view:"dash", target:"#spBox", title:L3("Paste a job", "Stelle einfügen", "Tempel lowongan"),
    body:L3("Paste a job link or the whole ad. Vantage reads it on the spot (language, contract, city, skills) and one button hands it to Arga for the fit check. Nothing is sent before you press the button.",
      "Füge einen Stellenlink oder die ganze Anzeige ein. Vantage liest sie sofort (Sprache, Vertrag, Stadt, Skills), und ein Button übergibt sie an Arga zur Passung-Prüfung. Nichts wird gesendet, bevor du den Button drückst.",
      "Tempel link lowongan atau seluruh iklannya. Vantage langsung membacanya (bahasa, kontrak, kota, skill) dan satu tombol menyerahkannya ke Arga untuk cek kecocokan. Tidak ada yang terkirim sebelum kamu menekan tombolnya.")},
  since:{view:"dash", target:"#slBox", title:L3("Since you were last here", "Seit deinem letzten Besuch", "Sejak terakhir kamu di sini"),
    body:L3("After a break, a card on the Dashboard lists what changed while Vantage was closed: status moves, new reports, new Inbox files, passed deadlines. Press <b>Got it</b> to clear it. It only appears when something changed.",
      "Nach einer Pause listet eine Karte im Dashboard auf, was sich geändert hat, während Vantage geschlossen war: Statuswechsel, neue Berichte, neue Inbox-Dateien, verpasste Fristen. Mit <b>Got it</b> räumst du sie weg. Sie erscheint nur, wenn sich etwas geändert hat.",
      "Setelah beberapa waktu, kartu di Dashboard mencantumkan apa yang berubah saat Vantage tertutup: perubahan status, laporan baru, file baru di Inbox, deadline yang lewat. Tekan <b>Got it</b> untuk menutupnya. Hanya muncul kalau ada yang berubah.")},
  presend:{view:"apps", before:async () => { const a = (state.data.apps || []).find(x => x.folder); if (a) await openApp(a.id); }, keepDrawer:true, target:"#pscBtn", title:L3("Pre-send check", "Prüfung vor dem Senden", "Cek sebelum kirim"),
    body:L3("Open any application and press <b>Pre-send check</b>. Vantage checks the final PDFs (present, page count, leftover placeholders, password, size, portal-safe names, Tari's quality check) and, when all pass, builds a clean zip to upload.",
      "Öffne eine Bewerbung und drücke <b>Pre-send check</b>. Vantage prüft die fertigen PDFs (vorhanden, Seitenzahl, Platzhalter, Passwort, Größe, portalsichere Namen, Tari-Qualitätsprüfung) und baut bei Erfolg ein sauberes ZIP zum Hochladen.",
      "Buka satu lamaran dan tekan <b>Pre-send check</b>. Vantage memeriksa PDF final (ada, jumlah halaman, sisa placeholder, password, ukuran, nama aman portal, cek kualitas Tari) dan kalau lolos membuat zip bersih untuk diunggah.")},
  offers:{view:"apps", target:"#btOffers", title:L3("Compare offers", "Angebote vergleichen", "Bandingkan offer"),
    body:L3("When you hold an offer, a <b>Compare offers</b> button appears on Applications. Put offers side by side (pay per hour, remote days, commute, growth, visa help), set what matters to you with the sliders, and see a score for each.",
      "Sobald du ein Angebot hast, erscheint bei den Bewerbungen der Button <b>Angebote vergleichen</b>. Stelle Angebote nebeneinander (Lohn pro Stunde, Remote-Tage, Pendeln, Wachstum, Visa-Hilfe), gewichte mit den Reglern, was dir wichtig ist, und sieh für jedes einen Score.",
      "Begitu kamu punya offer, tombol <b>Bandingkan offer</b> muncul di Lamaran. Bandingkan offer berdampingan (gaji per jam, hari remote, perjalanan, perkembangan, bantuan visa), atur yang penting buatmu dengan slider, dan lihat skor tiap offer.")},
  interview:{view:"interview", target:'#nav a[data-view="interview"]', title:L3("Interview", "Interview", "Interview"),
    body:L3("Every application that reaches the interview stage gets a card here. <b>Let's prepare this interview</b> starts Laras, who reads your CV and cover letter and trains you question by question.",
      "Jede Bewerbung, die die Interview-Phase erreicht, bekommt hier eine Karte. <b>Let's prepare this interview</b> startet Laras, die deinen CV und dein Anschreiben liest und dich Frage für Frage trainiert.",
      "Setiap lamaran yang sampai tahap interview punya kartu di sini. <b>Let's prepare this interview</b> memulai Laras, yang membaca CV dan surat lamaranmu lalu melatihmu pertanyaan demi pertanyaan.")},
  tracker:{view:"interview", target:".ivt", title:L3("Prep tracker", "Vorbereitungs-Tracker", "Tracker persiapan"),
    body:L3("Tick what you have prepared, add your own items, and log each practice run with a score from 1 to 5. The bar shows how ready you are.",
      "Hake ab, was du vorbereitet hast, füge eigene Punkte hinzu und protokolliere jede Übung mit einer Note von 1 bis 5. Der Balken zeigt, wie bereit du bist.",
      "Centang yang sudah kamu siapkan, tambah item sendiri, dan catat tiap latihan dengan skor 1 sampai 5. Bar menunjukkan seberapa siap kamu.")},
  laras:{view:"interview", target:".nembed", title:L3("Laras, on this page", "Laras, auf dieser Seite", "Laras di halaman ini"),
    body:L3("Laras lives here too: it is the same conversation as in the corner chat, just shown where you prepare. Start practising from either place.",
      "Laras ist auch hier: Es ist dasselbe Gespräch wie im Chat unten rechts, nur dort gezeigt, wo du dich vorbereitest. Starte das Training an beiden Orten.",
      "Laras juga ada di sini: percakapannya sama dengan chat di pojok, hanya ditampilkan di tempat kamu bersiap. Mulai latihan dari mana saja.")},
  learn:{view:"learn", target:"#btTabs", title:L3("Learn", "Lernen", "Belajar"),
    body:L3("Your skill gaps with a goal: from zero, job-ready, or hero. A week-by-week tracker you can tick, and a marker for where it is <b>enough for the market</b>, so you know when you can already apply.",
      "Deine Skill-Lücken mit Ziel: von null, jobreif oder Profi. Ein Wochen-Tracker zum Abhaken und eine Markierung, ab wann es <b>für den Markt reicht</b>, damit du weißt, wann du dich schon bewerben kannst.",
      "Skill gap kamu dengan tujuan: dari nol, siap kerja, atau hero. Tracker per minggu yang bisa dicentang, dan penanda kapan <b>cukup untuk pasar</b>, supaya kamu tahu kapan sudah boleh melamar.")},
  pack:{view:"learn", target:"#lhPack", title:L3("Study pack", "Lernpaket", "Paket belajar"),
    body:L3("Ask Arga for a full plan, then build a <b>study pack</b> (.zip): a guide per week, exercises, a project and a tracker file, ready to work through offline.",
      "Bitte Arga um einen vollständigen Plan und erstelle dann ein <b>Lernpaket</b> (.zip): eine Anleitung pro Woche, Übungen, ein Projekt und eine Tracker-Datei, bereit zum Durcharbeiten.",
      "Minta Arga membuat rencana lengkap, lalu buat <b>paket belajar</b> (.zip): panduan per minggu, latihan, proyek, dan file tracker, siap dikerjakan.")},
  profile:{view:"profil", target:"#userBtn", title:L3("Profile", "Profil", "Profil"),
    body:L3("Click your name to open your profile: your materials, Master CV and experience notes in one place, with Skills and Learn as tabs. The dots show what was already discussed with Raka.",
      "Klick auf deinen Namen öffnet dein Profil: Materialien, Master-CV und Erfahrungsnotizen an einem Ort, mit Skills und Lernen als Tabs. Die Punkte zeigen, was schon mit Raka besprochen wurde.",
      "Klik namamu untuk membuka profil: bahan, Master CV, dan catatan pengalamanmu di satu tempat, dengan Skill dan Belajar sebagai tab. Titik-titiknya menunjukkan apa yang sudah dibahas dengan Raka.")},
  name:{view:"profil", target:"#btnEditName", title:L3("Your name", "Dein Name", "Namamu"),
    body:L3("Edit the name shown in the sidebar and in your documents. <b>Delete this user…</b> at the bottom of the page asks twice and only moves the folder away: nothing is erased.",
      "Ändere den Namen, der in der Seitenleiste und in deinen Dokumenten steht. <b>Delete this user…</b> ganz unten fragt zweimal und verschiebt den Ordner nur: nichts wird gelöscht.",
      "Ubah nama yang tampil di sidebar dan di dokumenmu. <b>Delete this user…</b> di bagian bawah bertanya dua kali dan hanya memindahkan folder: tidak ada yang dihapus.")},
  site:{view:"settings", target:"#btnSite", title:L3("Personal page", "Persönliche Seite", "Halaman pribadi"),
    body:L3("Turn your Master CV into one web page (light and dark mode, prints cleanly, no tracking). It stays on your computer and your phone number and address are left out; you decide if it ever goes online.",
      "Mache aus deinem Master-CV eine einzelne Webseite (heller und dunkler Modus, sauber druckbar, kein Tracking). Sie bleibt auf deinem Computer, Telefon und Adresse bleiben weg; du entscheidest, ob sie je online geht.",
      "Ubah Master CV-mu jadi satu halaman web (mode terang dan gelap, rapi saat dicetak, tanpa pelacakan). Tetap di komputermu, telepon dan alamat tidak disertakan; kamu yang memutuskan kalau mau mengunggahnya.")},
  doctor:{view:"settings", target:"#btnDoctor", title:L3("System check", "Systemcheck", "Cek sistem"),
    body:L3("See what this computer still needs (Python, libraries, Chrome or Edge, Claude Code) and fix each missing item with one button.",
      "Sieh, was dieser Computer noch braucht (Python, Bibliotheken, Chrome oder Edge, Claude Code), und behebe jeden fehlenden Punkt mit einem Button.",
      "Lihat apa yang masih dibutuhkan komputer ini (Python, pustaka, Chrome atau Edge, Claude Code) dan perbaiki tiap yang kurang dengan satu tombol.")},
  data:{view:"settings", target:"#btnBackup", title:L3("Export and import your account", "Konto exportieren und importieren", "Ekspor dan impor akun"),
    body:L3("<b>Export account</b> saves everything as one zip file. <b>Import account</b> takes that file back in on any computer: it comes back exactly, nothing is overwritten, and you see that every file arrived or which ones did not. <b>Check import</b> compares again at any time, and Nova can finish whatever is open.",
      "<b>Export account</b> speichert alles als eine Zip-Datei. <b>Import account</b> holt diese Datei auf jedem Computer zurück: Sie kommt genau zurück, nichts wird überschrieben, und du siehst, dass jede Datei angekommen ist oder welche nicht. <b>Check import</b> vergleicht jederzeit erneut, und Nova kann erledigen, was offen ist.",
      "<b>Export account</b> menyimpan semuanya sebagai satu file zip. <b>Import account</b> memasukkannya kembali di komputer mana pun: kembali persis, tidak ada yang ditimpa, dan kamu melihat bahwa setiap file sampai atau yang mana yang tidak. <b>Check import</b> membandingkan lagi kapan saja, dan Nova bisa menyelesaikan yang masih terbuka.")},
  addapp:{view:"apps", target:"#qaAdd", title:L3("Add and export", "Hinzufügen und exportieren", "Tambah dan ekspor"),
    body:L3("<b>Add application</b> tracks a job you found yourself. <b>Select</b> moves several cards at once, and the search, match and sort bar narrows the board. <b>Export</b> gives you a spreadsheet and a calendar file. Open a card for contacts, notes and a ready follow-up draft.",
      "<b>Add application</b> erfasst eine Stelle, die du selbst gefunden hast. <b>Select</b> verschiebt mehrere Karten auf einmal, die Leiste mit Suche, Match und Sortierung grenzt das Board ein. <b>Export</b> liefert eine Tabelle und eine Kalenderdatei. Öffne eine Karte für Kontakte, Notizen und einen fertigen Nachfrage-Entwurf.",
      "<b>Add application</b> mencatat lowongan yang kamu temukan sendiri. <b>Select</b> memindahkan beberapa kartu sekaligus, dan bilah cari, kecocokan, dan urutan mempersempit papan. <b>Export</b> memberi spreadsheet dan file kalender. Buka kartu untuk kontak, catatan, dan draf tindak lanjut siap pakai.")},
  theme:{target:"#btnGear", title:L3("Light and dark", "Hell und dunkel", "Terang dan gelap"),
    body:L3("The gear opens Settings: the theme (light, dark or automatic), the language and the reminders. On the Dashboard, <b>Customize</b> hides the cards you do not need.",
      "Hinter dem Zahnrad liegen die Einstellungen: Design (hell, dunkel, automatisch), Sprache und Erinnerungen. Auf dem Dashboard blendet <b>Customize</b> Karten aus, die du nicht brauchst.",
      "Ikon gerigi membuka Pengaturan: tema (terang, gelap, otomatis), bahasa, dan pengingat. Di Dashboard, <b>Customize</b> menyembunyikan kartu yang tidak kamu butuhkan.")},
  update:{target:"#btnUpdate", title:L3("Updates", "Updates", "Pembaruan"),
    body:L3("This button lights up when a new version is ready and installs it without you closing the app. Vantage also checks by itself every 30 minutes.",
      "Dieser Button leuchtet auf, wenn eine neue Version bereit ist, und installiert sie, ohne dass du die App schließen musst. Vantage prüft außerdem alle 30 Minuten von selbst.",
      "Tombol ini menyala kalau versi baru siap dan memasangnya tanpa kamu menutup aplikasi. Vantage juga memeriksa sendiri tiap 30 menit.")},
};
const TOUR_SECS = [
  {id:"basics", icon:"grid", title:L3("Getting started", "Erste Schritte", "Mulai dari sini"), desc:L3("Language, your folder, the chat, the Inbox and search.", "Sprache, dein Ordner, der Chat, die Inbox und die Suche.", "Bahasa, foldermu, chat, Inbox, dan pencarian."),
   steps:[TOLD[0], TOLD[1], TOLD[2], TOLD[3], TNEW.palette]},
  {id:"jobs", icon:"sun", title:L3("Find jobs", "Stellen finden", "Cari lowongan"), desc:L3("Morning report, daily search, pasting a job, what changed.", "Morning Report, tägliche Suche, Stelle einfügen, was sich geändert hat.", "Morning Report, pencarian harian, menempel lowongan, apa yang berubah."),
   steps:[TNEW.report, TNEW.sched, TNEW.periods, TNEW.paste, TNEW.since]},
  {id:"apps", icon:"cols", title:L3("Applications", "Bewerbungen", "Lamaran"), desc:L3("The board, the pre-send check and comparing offers.", "Das Board, die Prüfung vor dem Senden und der Angebotsvergleich.", "Papan, cek sebelum kirim, dan membandingkan offer."),
   steps:[Object.assign({view:"apps"}, TOLD[4]), TNEW.addapp, TNEW.presend, TNEW.offers]},
  {id:"learn", icon:"talk", title:L3("Interview and learning", "Interview und Lernen", "Interview dan belajar"), desc:L3("Practice with Laras, the prep tracker and the Learn tab.", "Training mit Laras, der Vorbereitungs-Tracker und der Tab Lernen.", "Latihan dengan Laras, tracker persiapan, dan tab Belajar."),
   steps:[TNEW.interview, TNEW.tracker, TNEW.laras, TNEW.learn, TNEW.pack]},
  {id:"you", icon:"user", title:L3("You and your tools", "Du und deine Werkzeuge", "Kamu dan alatmu"), desc:L3("Profile, your name, personal page, system check and updates.", "Profil, dein Name, persönliche Seite, Systemcheck und Updates.", "Profil, namamu, halaman pribadi, cek sistem, dan pembaruan."),
   steps:[TNEW.profile, TNEW.name, TNEW.site, TNEW.doctor, TNEW.data, TNEW.theme, TNEW.update]},
];
const T2 = {
  topics:L3("All topics", "Alle Themen", "Semua topik"), off:L3("Do not show me again", "Nicht mehr anzeigen", "Jangan tampilkan lagi"),
  on:L3("Show the tutorial automatically again", "Tutorial wieder automatisch anzeigen", "Tampilkan tutorial otomatis lagi"), close:L3("Close", "Schließen", "Tutup"),
  head:L3("Vantage tutorial", "Vantage-Tutorial", "Tutorial Vantage"), sub:L3("Pick a topic. Each one takes about a minute, and you can come back any time with the ? button.", "Wähle ein Thema. Jedes dauert etwa eine Minute, und mit dem ?-Button kommst du jederzeit zurück.", "Pilih topik. Masing-masing sekitar satu menit, dan kamu bisa kembali kapan saja lewat tombol ?."),
  new:L3("New", "Neu", "Baru"), seen:L3("Done", "Fertig", "Selesai"), steps:L3("steps", "Schritte", "langkah"), all:L3("You have seen every topic. The ? button opens this list again.", "Du hast alle Themen gesehen. Der ?-Button öffnet diese Liste wieder.", "Kamu sudah melihat semua topik. Tombol ? membuka daftar ini lagi."),
  hidden:L3("The tutorial will not open by itself any more. The ? button still opens it.", "Das Tutorial öffnet sich nicht mehr von selbst. Der ?-Button öffnet es weiterhin.", "Tutorial tidak akan terbuka sendiri lagi. Tombol ? tetap membukanya."),
};
const t2 = (k) => T2[k][lang] || T2[k].en;
const tourWait = (ms) => new Promise(r => setTimeout(r, ms));
const seenList = () => Array.isArray(prefs.tourSeen) ? prefs.tourSeen : [];
const doneList = () => Array.isArray(prefs.tourDone) ? prefs.tourDone : [];
let tour = null;
// Called when preferences are loaded: new users start with "Getting started"; everyone else only sees the topic list when a TNEW topic exists.
function autoTour(){
  if (!folder || prefs.tourOff) return;
  if (prefs.tour && !Array.isArray(prefs.tourSeen)){ savePref("tourSeen", ["basics"]); savePref("tourDone", ["basics"]); }   // saw the old tutorial
  if (!prefs.tour && !Array.isArray(prefs.tourSeen)) return startSection("basics");
  if (TOUR_SECS.some(s => !seenList().includes(s.id))) openTopics();
}
function tourShow(){ $("tour").hidden = false; drawTour(); }
function startTour(langOnly){
  if (langOnly){ tour = {mode:"lang", sec:TOUR_SECS[0], i:0}; return tourShow(); }
  openTopics();
}
function openTopics(){
  tour = {mode:"topics", fresh:TOUR_SECS.filter(s => !seenList().includes(s.id)).map(s => s.id)};
  savePref("tourSeen", TOUR_SECS.map(s => s.id));   // offered once: it only opens by itself again when a new topic is added
  tourShow();
}
async function startSection(id){
  const sec = TOUR_SECS.find(s => s.id === id); if (!sec) return;
  tour = {mode:"steps", sec, i:0}; $("tour").hidden = false; await showStep();
}
async function showStep(){
  const t = tour; if (!t) return;
  const st = t.sec.steps[t.i];
  if (!st.keepDrawer && $("drawer") && !$("drawer").hidden) closeApp();
  if (st.view && state.view !== st.view){ $("tourCard").classList.add("busy"); goView(st.view); await tourWait(500); }
  if (st.before){ try { await st.before(); } catch {} await tourWait(350); }
  if (tour !== t) return;
  drawTour();
}
function endTour(){
  if (!tour) return;
  if (tour.mode !== "lang") savePref("tour", true);
  tour = null; $("tour").hidden = true; if ($("drawer") && !$("drawer").hidden) closeApp();
}
function drawTour(){
  const card = $("tourCard"), ring = $("tourRing"); card.classList.remove("busy");
  if (tour.mode === "topics"){
    ring.hidden = true; card.classList.add("center", "wide");
    const done = doneList(), off = !!prefs.tourOff;
    card.innerHTML = `<div class="cap">Tutorial</div><h3>${esc(t2("head"))}</h3><div class="tbody">${esc(t2("sub"))}</div>
      <div class="tsecs">${TOUR_SECS.map(s => `<button class="tsec${done.includes(s.id) ? " done" : ""}" data-sec="${s.id}"><i class="ic" data-i="${s.icon}"></i><span><b>${esc(s.title[lang] || s.title.en)}</b><small>${esc(s.desc[lang] || s.desc.en)}</small><em>${s.steps.length} ${esc(t2("steps"))}</em></span>${tour.fresh.includes(s.id) ? `<u class="tnew">${esc(t2("new"))}</u>` : done.includes(s.id) ? `<u class="tdone">${esc(t2("seen"))}</u>` : ""}</button>`).join("")}</div>
      ${TOUR_SECS.every(s => done.includes(s.id)) ? `<div class="tbody muted" style="margin-top:8px">${esc(t2("all"))}</div>` : ""}
      <div class="tfoot"><button class="link" data-tact="${off ? "on" : "off"}">${esc(t2(off ? "on" : "off"))}</button><span></span><button class="btn primary" data-tact="close">${esc(t2("close"))}</button></div>`;
    card.querySelectorAll(".ic").forEach(el => el.innerHTML = `<svg viewBox="0 0 16 16">${ICONS[el.dataset.i]}</svg>`);
    card.style.left = ""; card.style.top = ""; return;
  }
  card.classList.remove("wide");
  const sec = tour.sec, st = sec.steps[tour.i], langOnly = tour.mode === "lang", last = langOnly || tour.i === sec.steps.length - 1;
  const tgt = st.target && document.querySelector(st.target);
  if (tgt && tgt.scrollIntoView) tgt.scrollIntoView({block:"nearest"});
  ring.hidden = !tgt;
  let html = `<div class="cap">${langOnly ? "" : esc(sec.title[lang] || sec.title.en) + " · " + (tour.i + 1) + " / " + sec.steps.length}</div><h3>${esc(st.title[lang] || st.title.en)}</h3><div class="tbody">${st.body[lang] || st.body.en}</div>`;
  if (st.lang) html += `<div class="tlangs">${LANGS.map(([k, n]) => `<button class="btn${k === lang ? " primary" : ""}" data-lang="${k}">${n}</button>`).join("")}</div>`;
  if (st.path && folder) html += `<div class="tpath mono" title="${esc(folder)}">${esc(folder)}</div><div class="trow"><button class="btn" data-tact="copy">${tx("copy")}</button><button class="btn" data-tact="reveal">${tx("reveal")}</button></div>`;
  html += `<div class="tfoot">${langOnly ? "" : `<button class="link" data-tact="topics">${esc(t2("topics"))}</button>`}<span></span>` +
    (tour.i && !langOnly ? `<button class="btn" data-tact="back">${tx("back")}</button>` : "") +
    `<button class="btn primary" data-tact="next">${langOnly ? tx("save") : last ? tx("done") : tx("next")}</button></div>` +
    (langOnly ? "" : `<div class="toff"><button class="link" data-tact="off">${esc(t2("off"))}</button></div>`);
  card.innerHTML = html;
  card.classList.toggle("center", !tgt);
  if (tgt){
    const r = tgt.getBoundingClientRect(), pad = 4;
    Object.assign(ring.style, {left:(r.left - pad) + "px", top:(r.top - pad) + "px", width:(r.width + pad * 2) + "px", height:(r.height + pad * 2) + "px"});
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const right = r.right + 16 + cw <= innerWidth - 12;
    card.style.left = Math.max(12, right ? r.right + 16 : Math.min(r.left, innerWidth - cw - 12)) + "px";
    card.style.top = Math.max(12, Math.min(right ? r.top - 8 : r.bottom + 12, innerHeight - ch - 12)) + "px";
  } else { card.style.left = ""; card.style.top = ""; }
}
$("tour").onclick = async (e) => {
  const l = e.target.closest("[data-lang]");
  if (l){ lang = l.dataset.lang; savePref("lang", lang); applyLang(); render(); drawTour(); return; }
  const sc = e.target.closest("[data-sec]"); if (sc) return startSection(sc.dataset.sec);
  const b = e.target.closest("[data-tact]"); if (!b) return;
  const act = b.dataset.tact;
  if (act === "close") return endTour();
  if (act === "topics") return openTopics();
  if (act === "off"){ savePref("tourOff", true); endTour(); return toast(t2("hidden")); }
  if (act === "on"){ savePref("tourOff", false); return drawTour(); }
  if (act === "back"){ tour.i--; return showStep(); }
  if (act === "next"){
    if (tour.mode === "lang") return endTour();
    if (tour.i === tour.sec.steps.length - 1){ savePref("tourDone", [...new Set([...doneList(), tour.sec.id])]); return openTopics(); }
    tour.i++; return showStep();
  }
  if (act === "copy"){ toast((await copyText(folder)) ? tx("copied") : "Could not copy"); return; }
  if (act === "reveal" && invoke) invoke("open_path", {path:folder}).catch(err => toast(String(err)));
};
window.addEventListener("resize", () => { if (tour && tour.mode !== "topics") drawTour(); });
document.addEventListener("keydown", (e) => { if (tour && e.key === "Escape") endTour(); });
booted.then(() => { if (folder) loadPrefs(); });

// Vantage folder updates: newer entries in _TEMPLATE's migration log than the user's .vantage_version (update_info in main.rs).
let upd = null;
async function checkUpdate(manual){
  if (!invoke || !folder) return;
  try { upd = await invoke("update_info", {root:folder}); } catch { upd = null; }
  drawUpdBtn();
  if (manual) onUpdateBtn();
}
const kitPending = () => !!(upd && upd.source && upd.entries && upd.entries.length);
// The kit (SOPs, agents, scripts) in the user's folder: the app downloads it and replaces what changed, with a backup (kit_update.rs).
// Only the data migrations, which need judgement, go to Nova, as one message.
async function kitUpdateNow(){
  toast(ft("Updating Vantage's files…", "Vantage-Dateien werden aktualisiert…", "Memperbarui file Vantage…"));
  let r;
  try { r = await invoke("kit_update_apply", {root: folder}); }
  catch (e) {
    const again = await dialog({title:ft("The update did not work", "Das Update hat nicht geklappt", "Update tidak berhasil"), text:String(e), ok:ft("Try again", "Erneut versuchen", "Coba lagi"), no:au("close")});
    return again ? kitUpdateNow() : undefined;
  }
  drawUpdBtn();
  const pending = arr(r && r.pending);
  const n = (r.new || 0) + (r.changed || 0) + (r.obsolete || 0);
  const html = `<p><b>${n} ${ft("files updated", "Dateien aktualisiert", "file diperbarui")}</b>` + (r.backup ? ` · ${ft("a backup of the replaced files is in", "ein Backup der ersetzten Dateien liegt in", "cadangan file yang diganti ada di")} <span class="mono">${esc(r.backup)}</span>` : "") + `</p>` +
    `<p class="muted">${esc(pending.length
      ? ft(`Nova now goes through ${pending.length} change(s) to your data.`, `Nova geht jetzt ${pending.length} Änderung(en) an deinen Daten durch.`, `Nova sekarang memeriksa ${pending.length} perubahan pada datamu.`)
      : ft("Your materials, applications and reports were not touched.", "Deine Unterlagen, Bewerbungen und Berichte wurden nicht angefasst.", "Materi, lamaran, dan laporanmu tidak disentuh."))}</p>`;
  const shown = dialog({title:ft("Vantage is updated", "Vantage ist aktualisiert", "Vantage sudah diperbarui"), html, no:false});
  if (pending.length) sendNow(say("kitMigrate", Object.assign({}, r, {pending}), folder), "nova");   // at once: the dialog only informs
  checkUpdate(false);
  await shown;
}

// App updates from GitHub Releases (app_update_* in main.rs): checked a few seconds after start, downloaded in the
// background, then one banner: "ready, restart". Nothing to type, nothing to confirm in the chat.
const AU = {
  dl:    {en:(v, p) => `Downloading Vantage ${v}… ${p}`, de:(v, p) => `Vantage ${v} wird geladen… ${p}`, id:(v, p) => `Mengunduh Vantage ${v}… ${p}`},
  ready: {en:(v) => `Vantage ${v} is ready.`, de:(v) => `Vantage ${v} ist bereit.`, id:(v) => `Vantage ${v} sudah siap.`},
  restart: {en:"Restart to update", de:"Neu starten", id:"Mulai ulang untuk update"},
  news:  {en:"What's new", de:"Was ist neu", id:"Apa yang baru"},
  later: {en:"Later", de:"Später", id:"Nanti"},
  newIn: {en:(v) => `What's new in Vantage ${v}`, de:(v) => `Neu in Vantage ${v}`, id:(v) => `Yang baru di Vantage ${v}`},
  log:   {en:"Update log", de:"Update-Verlauf", id:"Log update"},
  check: {en:"Check for Updates", de:"Nach Updates suchen", id:"Cek update"},
  checking: {en:"Checking…", de:"Prüfe…", id:"Memeriksa…"},
  dlShort: {en:(p) => `Downloading… ${p}`, de:(p) => `Lädt… ${p}`, id:(p) => `Mengunduh… ${p}`},
  uptodate: {en:(v) => `Vantage is up to date. You are on version ${v}.`, de:(v) => `Vantage ist aktuell. Du hast Version ${v}.`, id:(v) => `Vantage sudah versi terbaru. Kamu memakai versi ${v}.`},
  avail: {en:"Update available", de:"Update verfügbar", id:"Update tersedia"},
  filesT: {en:"Your Vantage files", de:"Deine Vantage-Dateien", id:"File Vantage-mu"},
  filesX: {en:"Only system files are updated. Your materials, applications and reports stay as they are, and a backup is made first.", de:"Nur Systemdateien werden aktualisiert. Deine Unterlagen, Bewerbungen und Berichte bleiben, vorher wird ein Backup gemacht.", id:"Hanya file sistem yang diperbarui. Materi, lamaran, dan laporanmu tetap, dan cadangan dibuat dulu."},
  updNow: {en:"Update now", de:"Jetzt aktualisieren", id:"Perbarui sekarang"},
  close: {en:"Close", de:"Schließen", id:"Tutup"},
  checkFail: {en:"Could not check for updates. Check your internet connection.", de:"Die Update-Prüfung ist nicht möglich. Prüf deine Internetverbindung.", id:"Tidak bisa memeriksa update. Periksa koneksi internetmu."},
  dlFail: {en:(v) => `Vantage ${v} could not be downloaded.`, de:(v) => `Vantage ${v} konnte nicht geladen werden.`, id:(v) => `Vantage ${v} tidak berhasil diunduh.`},
  retry: {en:"Try again", de:"Erneut versuchen", id:"Coba lagi"},
  none:  {en:"No release notes yet.", de:"Noch keine Versionshinweise.", id:"Belum ada catatan rilis."},
  off:   {en:"Update checks are not set up in this copy of Vantage yet.", de:"Update-Prüfung ist in dieser Vantage-Kopie noch nicht eingerichtet.", id:"Pengecekan update belum diatur di salinan Vantage ini."},
};
const au = (k, ...a) => { const t = AU[k][lang] || AU[k].en; return typeof t === "function" ? t(...a) : t; };
let appUpd = null, appUpdState = "";
function drawAppUpd(pct){
  drawUpdBtn(pct);
}
function drawUpdBtn(pct){
  const b = $("btnUpdate"), l = $("btnUpdateLbl"); if (!b || !l) return;
  const st = appUpd ? appUpdState : "";
  b.classList.toggle("hot", st === "dl" || st === "ready" || kitPending());
  l.textContent = st === "dl" ? au("dlShort", pct || "") : st === "ready" ? au("restart") : kitPending() ? au("avail") : au("check");
}
let lastAppCheck = 0, appCfg = true, appCheckErr = false;
async function checkAppUpdate(manual){
  if (!invoke) return null;
  if (appUpdState === "dl" || appUpdState === "ready") return appUpd;   // already found, nothing to ask again
  lastAppCheck = Date.now();
  let r = null;
  try { r = await invoke("app_update_check"); } catch { appCheckErr = true; return null; }
  appCheckErr = !!(r && r.error);
  if ($("appVer") && r.current) $("appVer").textContent = "v" + r.current;
  appCfg = !!r.configured;
  whatsNewOnce(r);
  if (!r.available){ appUpd = null; appUpdState = ""; drawUpdBtn(); return r; }
  appUpd = r; appUpdState = "dl"; drawAppUpd();
  try { await invoke("app_update_prepare"); appUpdState = "ready"; }
  catch { appUpdState = "error"; }  // quiet: tried again at the next check
  drawAppUpd();
  return r;
}
if (T && T.event) T.event.listen("app-update", (e) => {
  const {done, total} = e.payload || {};
  if (appUpdState === "dl") drawAppUpd(total ? Math.round(done / total * 100) + "%" : "");
});
// Update log: release notes from GitHub, newest first. Shown once by itself after an update.
async function showLog(list, title){
  if (!list){
    try { list = invoke ? await invoke("release_notes") : []; } catch { list = []; }
  }
  const fmt = (d) => { const t = parseDate(d); return t ? t.getDate() + " " + MON[t.getMonth()] + " " + t.getFullYear() : d; };
  const html = list && list.length
    ? `<div class="updbody">` + list.map(r => `<h3>Vantage ${esc(r.version)} <span class="muted mono">${esc(fmt(r.date))}</span></h3>${md(r.notes || "")}`).join("") + `</div>`
    : `<p>${au(appUpd || list ? "none" : "off")}</p>`;
  return dialog({title: title || au("log"), html, no:false});
}
async function whatsNewOnce(r){
  const KEY = "vantage.seenVersion";
  let seen = null; try { seen = localStorage.getItem(KEY); localStorage.setItem(KEY, r.current); } catch {}
  if (!seen || seen === r.current || !r.configured) return;
  let list = []; try { list = await invoke("release_notes"); } catch {}
  const mine = list.filter(x => x.version === r.current);
  if (mine.length) showLog(mine, au("newIn", r.current));
}

// First visit to the Chat tab: point at "Use this chat for Vantage" until a chat is pinned.
// Translate the interface (strings.js) from the start and for everything rendered later.
startTranslation();

// ---- top-right tools: tutorial and update (theme and language live in Settings) ----
function setLanguage(k){
  if (!LANGS.some(l => l[0] === k) || k === lang) return;
  lang = k; savePref("lang", k); applyLang(); drawUpdBtn();
  if (state.view !== "nova") render();
}
$("btnTour").onclick = () => startTour(false);

// One button for "check for updates" and "what's new": it opens a small window with the status and the release notes.
async function showUpdateDialog(){
  const ready = appUpd && appUpdState === "ready", dl = appUpd && appUpdState === "dl";
  const cur = ($("appVer") && $("appVer").textContent || "").replace(/^v/, "");
  let list = [];
  if (appUpd && appUpd.notes) list = [{version:appUpd.version, date:appUpd.date, notes:appUpd.notes}];
  else { try { list = invoke ? (await invoke("release_notes")).slice(0, 1) : []; } catch {} }
  const fmt = (d) => { const t = parseDate(d); return t ? t.getDate() + " " + MON[t.getMonth()] + " " + t.getFullYear() : d; };
  const failed = appUpd && appUpdState === "error";   // found, but the download did not work
  const status = !appCfg ? au("off") : ready ? au("ready", appUpd.version) : dl ? au("dl", appUpd.version, "") : failed ? au("dlFail", appUpd.version) : appCheckErr ? au("checkFail") : au("uptodate", cur || "?");
  const kit = kitPending();
  const kitHtml = kit ? `<h3>${au("filesT")}</h3><ul class="updlog">${upd.entries.map(e => `<li><span class="mono">${esc(fmt(e.date))}</span>${esc(e.title)}</li>`).join("")}</ul><p class="muted">${au("filesX")}</p>` : "";
  const html = `<p><b>${esc(kit && !ready && !dl ? au("avail") : status)}</b></p>` + kitHtml + (list.length
    ? `<div class="updbody">` + list.map(r => `<h3>Vantage ${esc(r.version)} <span class="muted mono">${esc(fmt(r.date))}</span></h3>${md(r.notes || "")}`).join("") + `</div>`
    : `<p>${au("none")}</p>`);
  const ok = await dialog({title: au("newIn", ready ? appUpd.version : (cur || "")), html, ok: kit ? au("updNow") : ready ? au("restart") : failed ? au("retry") : au("close"), no: kit || ready || failed ? (kit || ready ? au("later") : au("close")) : false});
  if (ok && kit) return kitUpdateNow();
  if (ok && ready) invoke("app_update_restart").catch(err => toast(String(err)));
  if (ok && failed){ appUpdState = ""; appUpd = null; await checkAppUpdate(true); }
}
async function onUpdateBtn(){
  const b = $("btnUpdate"), l = $("btnUpdateLbl");
  if (!appUpd){ b.classList.add("busy"); l.textContent = au("checking"); await checkAppUpdate(true); b.classList.remove("busy"); drawUpdBtn(); }
  await showUpdateDialog();
  checkUpdate(false);   // also refresh the notice for the files in the user's folder
}
$("btnUpdate").onclick = onUpdateBtn;

// Look for a new version at once, then every 30 minutes and whenever the window comes back to the front.
function startUpdateWatch(){
  checkAppUpdate();
  setInterval(() => checkAppUpdate(), 30 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && Date.now() - lastAppCheck > 5 * 60 * 1000) checkAppUpdate(); });
}
drawUpdBtn(); startUpdateWatch();
