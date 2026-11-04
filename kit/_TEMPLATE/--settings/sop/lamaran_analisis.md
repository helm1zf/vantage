# SOP Lamaran — bagian analisis (langkah 1-3c, Arga)

Bagian dari `sop/lamaran.md` (alur, folder, daftar isi ada di sana). Dibaca Arga; Bayu tidak perlu.

---

**1. Parse JD.** Cari juga instruksi tersembunyi yang gampang kelewat:
- periode wajib dan tanggal mulai eksplisit
- dokumen tambahan (transkrip, portofolio, dll)
- bahasa lamaran

**Cek baris bahasa duluan, SEBELUM memetakan bukti.** Kalau JD minta level bahasa
tertentu (mis. "native level"), sadari GAP itu di awal, jangan sesudah menghabiskan
waktu petain bukti. Ini bukan alasan skip otomatis — cuma jangan diabaikan.

**Jangan pernah auto-skip lowongan karena tipe role atau bahasanya.** Rekomendasi
"skip aja" boleh keluar, tapi harus dari HASIL ANALISIS, bukan dari kategori semata.

**2. Petakan JD ke bukti.** Turun ke ID Raw Materials satu per satu — jangan cuma
comot 3-4 ID teratas kalau bahannya sebenarnya banyak.

**Bawa pelajaran interview.** Sebelum menulis fit/gap, lihat `Interview_Prep/Debrief_*.md` dari
lamaran yang sudah pernah interview (cukup 3 terbaru, `02_Sent/` dan `01_Pipeline/`). Pelajaran
yang relevan untuk peran ini ditulis satu baris "Pelajaran interview" di `Analisis_Fit_Gap.md`
(field `pelajaran_interview` di `Analisis_Fit_Gap.json`, mis. "tutup cerita dengan satu angka"), supaya Bayu ikut menyorotnya. Tidak ada debrief → baris dilewati.

**Di mana hasil analisis disimpan.** JD yang ditempel user: analisis (langkah 1-3b) dikerjakan dan
hasilnya disampaikan di obrolan. File analisis (lihat "Versi untuk user" di bawah) baru ditulis ke
`01_Pipeline/<folder>/01_Analisis/` saat keputusannya EKSEKUSI (langkah 4 di `sop/lamaran_dokumen.md`);
kalau SKIP, tidak ada folder dan tidak ada file, cukup `JD_Insights.md` (langkah 3b). Lowongan dari laporan
pagi sudah punya file analisisnya di `Laporan_Pagi/YYYY-MM-DD/NN_.../`; itu dipindah saat "gas".

**Versi untuk user = PDF, layout v2 (aturan 2026-11-01).**
Di `01_Analisis/` ada empat file kerja + dua PDF:
- `JD.md` = **teks asli lowongan, wortgleich** seperti ditempel user (atau seperti di halaman iklan
  untuk laporan pagi). Boleh buang menu situs dan sisa HTML; jangan diringkas, diterjemahkan, atau
  dirapikan. File ini juga dibaca `check_keywords.py`.
- `JD.json` = ringkasan (salin dari `--settings/templates/jd/content.json`): posisi, 8 fakta, satu
  kalimat inti, tugas, syarat wajib, nilai tambah, tanggal penting. Bahasa = bahasa JD.
- `Analisis_Fit_Gap.json` = hasil langkah 2-3 (salin dari `--settings/templates/fit_gap/content.json`),
  Bahasa Indonesia.
- Lalu jalankan `python3 ./--settings/scripts/build_analisis.py "<folder 01_Analisis>"`. Hasilnya
  `JD.pdf` (halaman 1 ringkasan, halaman 2 dst "Originaltext, vom Nutzer eingefügt" = isi `JD.md`
  apa adanya) dan `Analisis_Fit_Gap.pdf` (1 halaman), plus `Analisis_Fit_Gap.md` versi teks untuk
  Bayu dan Tari. Builder menolak JSON yang tidak lolos cek (exit 1): perbaiki JSON-nya, jangan
  menulis PDF atau `Analisis_Fit_Gap.md` sendiri.
User cuma lihat PDF-nya; .md dan .json disembunyikan otomatis. Folder `00_Draft/` (json, docx kerja)
juga disembunyikan; `export_pdf.py` melakukannya otomatis di akhir tiap lamaran, tidak perlu diingat.
Lamaran yang sudah jadi sebelum 2026-11-01 tidak dibangun ulang.

Tabel syarat (`syarat` di `Analisis_Fit_Gap.json`): satu baris per syarat JD, kolom bukti = ID raw_facts.
Requirement JD yang belum ada pasangan ID = gap (`status: no`), ditulis JUJUR.

**3. Skor fit 0-100 + rekomendasi.** Termasuk "skip aja" kalau memang tidak cocok.
Rubriknya SAMA untuk JD dari user dan untuk laporan pagi, supaya ambang (default 80) artinya sama
di mana pun:

| Komponen | Bobot | Penuh kalau… |
|---|---|---|
| Tugas inti JD tertutup bukti | 40 | tiap tugas inti punya ID bukti langsung di raw_facts |
| Skill/tool wajib | 25 | semua yang "must have" ada di level yang diminta |
| Bahasa | 15 | level bahasa user ≥ yang diminta JD |
| Kontrak & logistik | 10 | jenis kontrak, jam kerja, lokasi, izin kerja, tanggal mulai cocok |
| Nilai tambah | 10 | "nice to have", industri/domain yang sama, referral |

Bobot di tabel adalah bawaan. Kalau `search_settings.json` punya `bobot_skor` (lima angka bulat, jumlah 100; diatur user di
Search settings → Advanced), pakai bobot itu sebagai batas tiap komponen dan salin ke `bobot_skor` di
`Analisis_Fit_Gap.json` dan di laporan pagi, supaya skor lama tetap terbaca dengan bobotnya sendiri.

Kurangi dari total kalau: pengalaman cuma skala kecil/self-directed padahal JD minta
pengalaman kerja nyata, atau tipe role yang sudah terbukti jadi titik gagal historis
(daftar hitam di raw_facts). Tulis rincian per komponen di `komponen` `Analisis_Fit_Gap.json` (jumlahnya = skor).

**Beda dengan skor tebakan target di onboarding** (4 komponen untuk menebak peran, sebelum ada JD): jangan dicampur. Skor di sini selalu per lowongan dan memakai tabel di atas.

**Ambang tunggal = `ambang_skor` di `01_user_documents/--usersettings/search_settings.json`** (default 80,
diatur user di aplikasi: Morning report → Search settings; file/angka tidak ada = 80). ≥ ambang = cocok,
lanjut otomatis. < ambang = tanya user. Laporan pagi memakai ambang yang sama; kandidat ambang−10 sampai
ambang−1 cuma masuk daftar "hampir masuk". Di bawah ini "ambang" selalu berarti angka itu.

**Jangan menghitung bentrok jadwal antar lamaran.** Melamar itu memang menyebar;
kalau lebih dari satu tembus, tinggal pilih satu.

**3b. Update `01_user_documents/--usersettings/JD_Insights.md` — tiap JD yang dianalisis, dilamar ATAU
cuma ditimbang.** Ini bukan opsional dan gak perlu ditanya dulu. Caranya:
- Requirement JD yang gak ada bukti kuatnya di Raw Materials (gap dari langkah 2) →
  cari nama skill itu di tabel "Skill Gap yang Berulang" di `JD_Insights.md`. Ada →
  naikkan **Jumlah** +1 dan tambahkan JD ini di kolom **Disebut di**
  (`Perusahaan – posisi singkat (DD-MM)`). Belum ada → tambah baris baru (Jumlah 1).
  Satu JD dihitung sekali per skill.
- Baris dengan angka 1 dibiarkan tanpa rekomendasi. Begitu naik ke **2x atau lebih**,
  isi kolom Rekomendasi (sertifikasi/portofolio/dll).
- **Aturan 5x:** begitu satu skill disebut di **5 JD berbeda** dan kolom "Dibahas ke
  user?" masih "Belum" → jalankan `sop/rencana_belajar.md` (paragraf ke user + PDF rencana
  belajar + QC-nya).
- Ini cuma **update kecil ke satu file kecil**, BUKAN scan ulang seluruh riwayat JD di
  `01_Pipeline/`/`02_Sent/` — jangan buka ulang folder-folder lama cuma buat ngerjain
  langkah ini, biar tidak boros token seiring lamaran menumpuk.
- JD dengan fit skor di bawah ambang boleh dibuang dari "Log per JD" biar gak numpuk,
  tapi skill gap yang dia hasilkan tetap harus naik hitungannya duluan di tabel
  ringkasan sebelum dibuang.

**3c. Skip atau Eksekusi?** — keputusan ditentukan dari skor langkah 3, BUKAN
ditanyakan sebelum ada skor:

| | Skip | Eksekusi |
|---|---|---|
| Analisis fit/gap + skor + JD_Insights.md | tetap dilakukan (langkah 1-3b) | tetap dilakukan (langkah 1-3b) |
| Folder di `01_Pipeline/` | tidak dibuat | dibuat |
| Entri tracker | tidak dicatat | dicatat, status `Draft` |
| CV, cover letter, sampai `ready_to_send/` | tidak dibuat | dibuat otomatis |

- **Skor ≥ ambang → lanjut OTOMATIS ke langkah 4 (Bayu), tanpa nanya dulu ke user.** Ini yang
  berubah dari versi lama: dokumen langsung disusun sampai `02_ready_to_send/` selama
  skornya cukup, biar user gak perlu manually bilang "tolong tailor-in CV-nya" tiap
  kali. Kalaupun ujung-ujungnya gak jadi dikirim, dokumennya cuma nganggur di
  `01_Pipeline/` — gak ada ruginya dibanding harus nanya-nanya dulu.
  **Tapi "otomatis" bukan berarti "diam-diam."** Begitu keputusan lanjut otomatis
  diambil, kasih tau singkat di chat SEBELUM mulai kerja — mis. *"Skor 83/100,
  aku lanjut susun CV & cover letter-nya otomatis ya"* — ini cuma informasi, bukan
  pertanyaan, jangan nunggu balasan buat mulai. Tanpa ini, user bisa kaget nemuin
  folder baru muncul sendiri tanpa tau kapan/kenapa — bertentangan sama prinsip
  transparansi "apapun perubahannya lewat percakapan" yang berlaku di seluruh sistem
  ini. *(pemicu: user minta ini eksplisit, 2026-09-23, biar auto-eksekusi gak bikin
  kaget)*
- **Skor < ambang → sampaikan hasil analisisnya ke user** (skor + alasan singkat), lalu
  tanya eksplisit: *"Skip atau tetap eksekusi?"* Terima jawaban kasual sebagai sinyal
  jelas — **"gas", "oke lanjut", "boleh", "iya", "lanjut aja"** semuanya dihitung
  sebagai **EKSEKUSI**, gak perlu kalimat formal "saya mau melamar ini". Sebaliknya,
  "skip", "lewati", "gak usah", "nanti aja" dihitung sebagai **SKIP** — berhenti di
  sini, jangan bikin folder atau catat tracker (skill gap-nya udah kecatat duluan di
  3b, itu cukup).
- **Kalau jawaban user ambigu atau dia malah pindah ke topik lain** — JANGAN diam
  nunggu tanpa kejelasan. Tanya ulang eksplisit: *"biar jelas: skip atau tetap
  dieksekusi?"* — jangan lanjut ke hal lain sebelum ini kejawab. Ini exact bug yang
  pernah bikin user real bingung kenapa `ready_to_send/` gak pernah muncul padahal dia
  ngerasa udah kasih lampu hijau *(pemicu: laporan tester, 2026-09-23)*.

**Penting: sampai `02_ready_to_send/` BUKAN berarti sudah dilamar.** Status `Applied`
di tracker (dan pindah folder ke `02_Sent/`) tetap butuh konfirmasi eksplisit dari user
bahwa dokumennya BENERAN sudah dikirim ke perekrut — lihat langkah 8 di `sop/lamaran_dokumen.md`. Membuat dokumen
otomatis (di atas) cuma menyiapkan berkasnya, bukan menyatakan lamaran sudah jalan.
