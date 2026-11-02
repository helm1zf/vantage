# SOP Lamaran — bagian dokumen (langkah 4-9 + verifikasi, Bayu/Tari)

Bagian dari `sop/lamaran.md` (alur, folder, daftar isi ada di sana). Dibaca Bayu dan Tari, bersama `sop/aturan_isi.md`; Arga tidak perlu.

---

**4. Begitu diputuskan eksekusi** (otomatis dari skor ≥ ambang (default 80, `search_settings.json`), atau dari konfirmasi user
saat skor < ambang): bikin folder **RATA (flat), TANPA sub-folder Jenis/Tahun/Bulan**,
langsung di `02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/` — beda dari `02_Sent/` yang
nested (lihat langkah 8). Alasan dipisah begini: `01_Pipeline/` diakses SERING
(cek status, tambah dokumen) dan isinya alami SEDIKIT (begitu closed, langsung
pindah ke `02_Sent/`) — nesting di situ cuma nambah klik tanpa manfaat. `02_Sent/`
diakses JARANG tapi menumpuk terus dari waktu ke waktu — di situ nesting per
Jenis/Tahun/Bulan baru kepake.

Pola nama foldernya `DD-MM_Perusahaan_Posisi` (tanggal-bulan di depan, BUKAN lagi
`YYYY-MM-DD_Perusahaan_Posisi`) — supaya nama perusahaan+posisi (bagian paling
informatif) gak ke-hidden jadi "..." kalau file browser truncate nama folder yang
panjang. `DD-MM` cuma 5 karakter, jauh lebih sedikit "makan" ruang di depan
dibanding `YYYY-MM-DD` yang 10 karakter, sebelum nama perusahaan mulai kebaca.

```
02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/00_Draft/          <- cv_content.json, cl_content.json, .docx, .pdf pratinjau, qc_report.md
02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/01_Analisis/       <- JD.md, JD.json, Analisis_Fit_Gap.json -> JD.pdf, Analisis_Fit_Gap.pdf (build_analisis.py)
02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/02_ready_to_send/  <- PDF final, dibuat otomatis oleh export_pdf.py
```

Contoh konkret: `01_Pipeline/24-09_BFS-health-finance_Werkstudent-Data-Analytics/`

Isi `01_Analisis/` (Arga, `sop/lamaran_analisis.md` "Versi untuk user"), lalu salin dua template
ke `00_Draft/` sebagai titik mulai:
```
cp ./--settings/templates/cv/content.json  "02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/00_Draft/cv_content.json"
cp ./--settings/templates/cover_letter/content.json  "02_workflow/01_Pipeline/DD-MM_Perusahaan_Posisi/00_Draft/cl_content.json"
```

**Tentukan juga `tipe`-nya** — dari judul/kontrak di JD, salah satu dari lima:
`Praktikum`, `Werkstudent`, `Teilzeit`, `Vollzeit`, `Minijob` (kalau JD-nya bahasa
Inggris: "Intern"/"Internship" = `Praktikum`, "Working Student" = `Werkstudent`,
"Part-time" = `Teilzeit`, "Full-time" = `Vollzeit`). Kalau JD eksplisit nyebut
salah satunya, tentukan sekarang juga. Kalau JD gak eksplisit — tanya user
daripada nebak, dan itu boleh ditunda sampai sebelum langkah 8 (folder di
`01_Pipeline/` sendiri gak butuh info ini, `tipe` baru dipakai pas pindah ke
`02_Sent/`). Field `tipe` ini yang nanti diisi ke `applications.json` di langkah 8.

**JD campur jenis kontrak** (mis. "Minijob oder Teilzeit", "Werkstudent / Praktikum"):
pilih SATU `tipe` dengan urutan ini: (1) jenis yang user pilih di lamarannya (tanya kalau
belum jelas); (2) kalau user tidak punya preferensi, yang paling cocok dengan "Batasan
izin kerja" dan jam kerja di `CLAUDE.md` user; (3) kalau masih seri, jenis yang disebut
PERTAMA di judul JD. Catat alternatifnya di kolom `catatan` `applications.json`
(mis. "JD juga menawarkan Teilzeit"), supaya arsip tetap satu folder dan tidak dobel.

Yang diisi cuma bagian bertanda `<TAILOR>`. Key yang diawali underscore diabaikan
builder, boleh ditinggal.

**Sebelum nulis bullet/paragraf, cek bagian "Contoh konkret" di `sop/aturan_isi.md`** — pasangan ✅/❌ buat ngerasain crispy vs generik sebelum nulis,
bukan sesudahnya.

**Sekali saja, setelah lamaran PERTAMA selesai — bekukan fakta tetapmu ke template.**
Template bawaan Starter Kit masih `<TAILOR>` semua karena belum tahu siapa kamu. Begitu
lamaran pertama jadi, salin balik bagian yang **gak akan pernah berubah** ke
`--settings/templates/cv/content.json`: nama perusahaan, jabatan, lokasi, tanggal kerja,
nama kampus, gelar, nilai.

Yang tetap dibiarkan `<TAILOR>` di template: `tagline`, `profile`, semua isi `bullets`,
urutan `skills`, dan seluruh isi cover letter — itu memang ditulis ulang tiap lamaran.

*Kenapa: fakta tetap justru bagian yang haram berubah dan paling gampang dicek recruiter.
Ngetik ulang tiap lamaran cuma nambah peluang typo di bagian yang paling mahal kalau
salah. Setelah dibekukan, lamaran ke-2 dan seterusnya jauh lebih cepat.*

**5. Build CV dan cover letter:**
Sebelum build, isi `_sumber` di tiap entry `cv_content.json` (ID raw_facts per bullet, daftar
sejajar dengan `bullets`), lalu jalankan
`python3 -I ./--settings/scripts/check_facts.py 01_user_documents/raw_facts_about_you.md <cv_content.json> <cl_content.json>`.
Ditolak (exit 1) kalau ada bullet tanpa ID, ID tidak ada di raw_facts, atau ID bertanda DICORET.
Perbaiki JSON sampai lolos; jangan lanjut build.
```
python3 ./--settings/scripts/build_cv.py "02_workflow/01_Pipeline/<folder>/00_Draft/cv_content.json"
python3 ./--settings/scripts/build_cover_letter.py "02_workflow/01_Pipeline/<folder>/00_Draft/cl_content.json"
```
Hasilnya .docx (buat portal yang minta Word) + .pdf pratinjau, plus jumlah halamannya.
Layout tidak pernah disentuh (`templates/*/layout.html`) — kalau ada dorongan menyusun
layout baru dari nol, jangan; itu sumber cacat render.

Struktur cover letter: paragraf 1 kait + pujian spesifik ke JD; paragraf 2-4 masing-masing
ambil SATU tugas dari JD lalu pasangkan bukti dari CV; paragraf terakhir ketersediaan +
tanggal eksplisit + relokasi + sifat kerja. Kutip istilah JD apa adanya. Sekitar
600-650 kata, muat satu halaman.

**6. Export ke PDF:**
```
python3 ./--settings/scripts/export_pdf.py "02_workflow/01_Pipeline/<folder>" --suffix REQ-xxxxx
```
Script membaca JSON di `00_Draft/`, mencetak PDF lewat Chrome/Edge dengan layout yang
sama, dan menaruh hasilnya di `02_ready_to_send/`. Tidak butuh Word atau LibreOffice,
jadi hasilnya sama di semua komputer. Selalu kirim PDF, jangan .docx.

Konvensi nama: `<Surname>_CV.pdf`, `<Surname>_Cover-Letter.pdf` — nama belakang di
depan (recruiter unduh puluhan berkas ke satu folder, tabrakan nama kalau tidak),
tanpa spasi, tanpa umlaut, tanpa tanggal dan tanpa "v2/final".

**7. Verifikasi (wajib, tidak boleh dilewat): otomatis ke Tari.** Bayu membaca PDF-nya
sekali, lalu Tari memeriksa dengan `sop/cek_kualitas.md` (maks 3 putaran, lihat
`sop/tabel_arah.md` bagian 3). Belum `LULUS` = belum siap kirim. Lihat juga "Verifikasi" di bawah.
**Baca file PDF yang barusan dihasilkan di `02_ready_to_send/` langsung** — jangan
bikin render sementara terpisah buat dicek lalu dibuang, itu convert dokumen yang
sama dua kali tanpa guna. Kalau ketemu masalah (teks nabrak, kepanjangan, dll):
benerin `cv_content.json`/`cl_content.json`, ulangi langkah 5, lalu jalankan ULANG
langkah 6 (export_pdf.py menimpa PDF lama) — baru verifikasi lagi PDF yang baru.

Pakai `--suffix REQ-xxxxx` kalau melamar lewat email atau ada lebih dari satu
lamaran ke perusahaan yang sama.

**8. Update tracker:** edit `01_user_documents/--usersettings/applications.json`, lalu
`python3 02_workflow/03_Tracker/build_tracker.py` (script-nya tetap di `03_Tracker/`, cuma
data sumbernya yang pindah — path default di script udah diarahkan otomatis).

- Begitu folder dibuat di langkah 4, tracker langsung dapat entri baru dengan status
  `Draft` — ini otomatis, gak perlu ditanya.
- Status naik jadi `Applied` **HANYA setelah user eksplisit konfirmasi dokumennya
  beneran sudah dikirim ke perekrut.** Jangan asumsikan submitted cuma karena
  file-nya udah ada di `02_ready_to_send/`.
- **Begitu user konfirmasi, PINDAHKAN FOLDERNYA SENDIRI — jangan cuma update JSON-nya
  doang.** Folder `01_Pipeline/DD-MM_Perusahaan_Posisi/` (seisinya, 3 subfolder
  sekaligus) WAJIB benar-benar dipindahkan secara fisik ke
  `02_Sent/<Jenis>/<Tahun>/<Bulan>/DD-MM_Perusahaan_Posisi/` — pakai `mv` lewat
  Bash (Mac/Linux) atau `Move-Item`/perintah move yang setara di PowerShell
  (Windows), BUKAN copy, dan BUKAN dibiarkan di `01_Pipeline/` sambil cuma ngubah
  status di `applications.json`. User tidak perlu drag folder itu sendiri secara
  manual — kalau itu terjadi, berarti langkah ini kelewat.

  **Cara nentuin `<Jenis>/<Tahun>/<Bulan>` tujuannya:**
  1. `<Jenis>` = field `tipe` yang udah diisi di `applications.json` (Praktikum/
     Werkstudent/Teilzeit/Vollzeit/Minijob) — sudah ditentukan dari langkah 4,
     tinggal dipakai lagi di sini.
  2. `<Tahun>` = tahun hari ini (bukan tahun JD-nya ditemukan), format 4 digit.
  3. `<Bulan>` = pola `Month_NN` (mis. `Month_05`, `Month_09`), NN dua digit dari
     bulan HARI INI. (Diganti dari `NN - NamaBulan` 2026-10-08 supaya tidak kebaca tanggal.)
  4. **Logic penanda bulan aktif (prefix `00_`)** — supaya bulan yang lagi
     berjalan selalu nongol paling atas tanpa perlu di-scroll:
     - Cek isi `02_Sent/<Jenis>/<Tahun>/` — kalau ada folder bulan yang PREFIX-nya
       `00_` tapi angka bulannya BEDA dari bulan hari ini, itu bulan lama yang
       kelewat di-"turunin" — rename balik ke normal
       (`00_currentMonth_NN` → `Month_NN`).
     - Kalau folder bulan HARI INI belum ada sama sekali di situ: buat baru
       langsung dengan prefix, `00_currentMonth_NN` (mis. `00_currentMonth_09`).
     - Kalau folder bulan HARI INI sudah ada tapi belum ber-prefix: rename jadi
       ber-prefix (`Month_NN` → `00_currentMonth_NN`).
     - Kalau folder bulan HARI INI sudah ber-prefix `00_`: biarkan, gak perlu
       diapa-apain.
     - Lakukan pengecekan ini di SETIAP kali mau mindahin folder ke `02_Sent/`
       (murah dan idempotent, bukan cuma sekali di awal bulan) — supaya kalau
       Nova gak dipakai pas awal bulan baru, begitu dipakai lagi langsung
       kekoreksi sendiri.
  5. Baru sesudah folder `<Jenis>/<Tahun>/<Bulan>/` tujuannya benar (ber-prefix
     kalau memang bulan berjalan), `mv` folder lamarannya ke dalam situ.
- **Verifikasi pindahnya beneran berhasil sebelum lapor selesai** — jalankan
  `python3 ./--settings/scripts/verify_consistency.py` (exit code 0 = aman, ada baris
  "BERMASALAH" = belum). Ini bukan opsional — script ini yang cek folder
  sudah tidak ada lagi di `01_Pipeline/`, sudah muncul di lokasi
  `02_Sent/<Jenis>/<Tahun>/<Bulan>/` yang benar (termasuk prefix `00_`-nya), DAN
  field `folder` di `applications.json` sudah match — jangan cuma dicek manual
  pakai mata sendiri, ketauan lolos kalau ada yang kelewat justru dari sini.
  Di Windows, perintah move sering gagal diam-diam (`Permission denied`/`access
  is denied`) kalau ada File Explorer, Word, atau PDF viewer yang masih membuka
  salah satu file di folder itu — kalau gagal, bilang eksplisit ke user file mana
  yang perlu ditutup dulu, jangan cuma retry diam-diam atau (lebih parah)
  diam-diam nyerah dan ninggalin foldernya di `01_Pipeline/` tanpa bilang apa-apa.
- Jangan lupa **update field `folder` di `applications.json`** ke path barunya
  (path bersarang penuh, termasuk prefix `00_` kalau ada) sesudah dipindah (lihat
  aturan umum di bagian "Arsip folder" di atas) — kalau tidak, link dari tracker
  ke folder lamaran itu putus.

*Alasan: tracker dipakai ukur response rate — kalau status `Applied` dicatat padahal
belum beneran dikirim, angkanya jadi bohong. Sama alasannya kayak kenapa JD yang
di-skip gak ikut dicatat.*

**9. Fakta baru → Raw Materials (Raka).** Kalau muncul fakta baru dari obrolan, tulis
`FAKTA BARU: ...`; Raka mengonfirmasi ke user dan menulisnya ke Raw Materials **sebelum**
dipakai di dokumen. Ditambah, bukan ditimpa.

**Selesai → timpa baris urusan ini di `--usersettings/status.md`** (`sop/tabel_arah.md` bagian 4).

---

## Verifikasi — jangan pernah dilewat

Mengisi JSON **tidak** menunjukkan hasil render. Yang bisa lolos tanpa ketahuan: nama
organisasi nabrak kolom tanggal, CV 2 halaman padahal dikira 1, kalimat terpotong.

`build_cv.py` dan `build_cover_letter.py` otomatis melaporkan jumlah halaman PDF.
Selain itu, **baca PDF hasil langkah 6** (`02_ready_to_send/<Surname>_CV.pdf` dan
`_Cover-Letter.pdf`) sebelum bilang selesai — itu sudah dokumen final, gak perlu
render sementara terpisah. Cek: ada teks nabrak? ada baris menggantung? ada salah
kata?

**Kalau lebih dari 1 halaman atau ada yang perlu dibenerin:** edit
`cv_content.json`/`cl_content.json` (pangkas kalimat dulu, gabung bullet
berdekatan — mengecilkan font itu langkah terakhir, jangan di bawah 9pt), ulangi
langkah 5 lalu 6, baru verifikasi lagi PDF yang baru.

---

---

## Yang perlu ditanya, bukan diasumsikan

- **Tanggal mulai realistis** — kalau masih kerja di tempat lain, hitung dari
  perkiraan tanggal offer + notice period, jangan janji tanggal JD mentah-mentah.
- Bahasa lamaran kalau JD ambigu.
- Fakta yang belum ada di Raw Materials — tanya, jangan karang.
