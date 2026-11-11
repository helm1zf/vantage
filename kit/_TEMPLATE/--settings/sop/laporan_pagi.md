# SOP Laporan Pagi (v2) — cari lowongan, nilai, kirim laporan 1 halaman

**Satu nama, satu alur.** Laporan Pagi = prosedur ini + hasilnya di folder
`02_workflow/Laporan_Pagi/YYYY-MM-DD/`. **Satu-satunya sumber adalah JSON**
`YYYY-MM-DD_Laporan_Pagi.json` (salinan `templates/laporan_pagi/content.json`). Builder
`scripts/build_laporan_pagi.py` membuat semuanya dari JSON itu: PDF 1 halaman, `00_README.md`
(bagian dan tabel tetap), dan pesan Inbox. **`00_README.md` tidak pernah ditulis tangan.**
Sebelum membangun, builder menjalankan `scripts/check_report.py`; gagal = tidak ada yang dikirim.

**Siapa:** Sinta mencari, menyaring, dan mengisi bagian pencarian; Arga menganalisis penuh dan
mengisi rekomendasi; Nova mengisi "perlu aksi kamu" dan "fokus hari ini", membangun, lalu mengirim.
Serah terimanya otomatis (`sop/tabel_arah.md` bagian 3). Laporan ditandatangani "dari Sinta".

**Dijalankan langsung dari aplikasi** (tombol "Find jobs now" atau pencarian harian): aplikasi memulai SINTA sendiri, tanpa Nova. Sinta mengerjakan seluruh rantai: mencari dan menyaring,
memanggil Arga (agen `arga`, lewat Task) untuk analisis penuh dan rekomendasi, lalu mengisi sendiri "perlu aksi kamu" dan "fokus hari ini" (bagian Nova di tabel di bawah), menjalankan
`check_report.py` dan `build_laporan_pagi.py`, dan menutup dengan satu pesan pendek kepada user (nama file PDF, jumlah rekomendasi). Tidak ada sapaan dan tidak ada basa-basi antar agen.

**Cara jalan:** saat user menekan Find jobs now atau mengetik "laporan pagi" / "cariin lowongan"; hasilnya tampil di chat
dan di halaman Morning report. Jadwal harian diatur user sendiri di halaman Morning report (saklar dan jam, tugas terjadwal di komputer): jangan menyalakan atau menjanjikannya, cukup arahkan ke sana.

**Syarat mulai:** wawancara profil sudah selesai (`onboarding/wawancara/kupas_bahan.md`, bagian
"Wawancara selesai kalau"). Belum selesai → laporan pagi belum boleh jalan, karena skornya bakal ngawur.

---

## Isi laporan (urutan tetap, bagian kosong tetap muncul dengan "—")

| # | Bagian | Diisi | Aturan |
|---|---|---|---|
| — | Fokus hari ini | Nova | Satu kalimat, kata kerja di depan, maks 120 karakter: hal terpenting hari ini. |
| 0 | Cara Sinta mencari hari ini | Sinta | Label pendek (maks 30 karakter, satu hal per label): kata kunci, lokasi, filter, sumber; "tidak bisa dicek" (sumber yang gagal + alasan, atau kosong); corong angka ditemukan → lolos saring → link resmi OK → dianalisis → direkomendasikan. Apa adanya, supaya user bisa mengoreksi cara cari. |
| 1 | Perlu aksi kamu | Nova | Dari `applications.json`: follow-up >14 hari, deadline ≤7 hari, interview, tanggal mulai kerja, dokumen belum dikirim. Plus **belum dijawab** (aturan di bawah). Maks 8 baris. |
| 2 | Rekomendasi | Arga | Maks `maks_rekomendasi` (default 5), skor final ≥ ambang (default 80), urut skor. Per lowongan: skor + rincian (tugas 40 / skill 25 / bahasa 15 / kontrak 10 / nilai tambah 10, jumlahnya = skor), aksi + alasan wajib, cocok (≤140 karakter, ID raw_facts), gap (≤120), jenis, kota + perjalanan dari domisili, tanggal diposting, deadline (atau kosong = tidak disebut), riwayat dengan perusahaan itu dari tracker (atau kosong), usaha (dokumen + menit), link resmi. |
| 3 | Hampir masuk | Arga | Skor ambang−10 sampai ambang−1 (default 70–79), masing-masing link resmi + satu alasan turun. |
| 4 | Dilewati | Sinta | Angka saja: link resmi tidak ketemu · sudah ada di tracker (status apa pun) · sudah muncul di laporan 30 hari terakhir · skor < ambang−10 · lainnya (+ alasan singkat). |
| 5 | Pola gap minggu ini | Arga | Skill yang muncul sebagai gap ≥2 kali di iklan 7 hari terakhir, maks 3 ("Power BI diminta di 4 dari 10 iklan"). Kosong kalau belum ada pola. |
| 6 | Catatan pasar | Sinta | Maks 3 baris, fakta saja. |
| — | Footer | builder | "gas nomor N" + baris feedback 👍N / 👎N. |

**Aturan aksi (wajib, alasan satu kalimat di `aksi_alasan`):**
- **Lamar** = analisis penuh selesai, skor ≥ ambang+5 (default 85), tidak ada penghalang.
- **Analisis** = skor ambang sampai ambang+4 (default 80–84), ATAU ada syarat yang harus dicek dulu (visa, tanggal mulai, bahasa, lokasi).
- **Lewati** = ada penghalang pasti (tetap ditulis supaya user tahu kenapa).

**Belum dijawab (aturan 7 hari):** rekomendasi ≥ ambang dari laporan 7 hari terakhir yang belum ada di
`applications.json` dan belum dijawab "lewati" TIDAK diulang di Rekomendasi, tapi masuk "Perlu aksi
kamu" dengan `jenis: belum_dijawab`, `dari_laporan`, `skor`, `link`, dan `tanggal` = hari terakhir ia
muncul. Lewat 7 hari atau deadline/iklan mati → catat `tidak dijawab` di `daily_jobs_seen.json` dan
berhenti muncul. "gas" → alur lamaran biasa; "lewati" → `answer_report.py skip` (sudah ditulis oleh tombol Skip di app; jangan ditulis ulang dengan tangan) dan berhenti muncul.
`daily_jobs_seen.json` = `{"seen":[{link, perusahaan, posisi, skor, tanggal, dilaporkan, dijawab, tanggal_dijawab, feedback}]}`.

**Feedback:** balasan 👍N / 👎N dicatat Nova di `daily_jobs_seen.json` (field `feedback`) dan dipakai
Sinta/Arga untuk menyetel kata kunci dan rubrik. Jangan mengubah skor laporan yang sudah terkirim.

**Bahasa dan nada:** bahasa isi = bahasa chat user (`bahasa`: `id`, `en`, atau `de`; teks tetap
builder ikut). Netral-formal, tanpa basa-basi pembuka/penutup, tanpa "gua". Satu sel = satu fakta.
Tanggal selalu `YYYY-MM-DD` di JSON; hitung mundur dibuat builder.

**Tampilan (layout.html, jangan diubah per hari):** 1 halaman A4, putih, hemat tinta. Warna hanya
di teks dan garis tipis: hijau = siap/bagus (skor ≥ ambang+5, Lamar, Cocok), biru = cek/info (skor ambang sampai ambang+4,
Analisis, link, kotak pencarian), merah-bata = gap/deadline/terlambat, oranye = perhatian (nomor
bagian, hitung mundur ≤3 hari), ungu = interview/mulai kerja, kuning tua = belum dijawab.

**Varian:** hari kosong (tidak ada ≥ ambang) → Rekomendasi berisi "Tidak ada lowongan baru ≥<ambang> hari ini
(N iklan dicek)", laporan tetap dikirim. Jalan ulang di hari yang sama → `run: 2`, file
`YYYY-MM-DD_Laporan_Pagi_run2.json`, yang lama tidak ditimpa. Terpotong (batas pemakaian habis) →
`status: "terpotong"`, builder menulis baris ⚠️ di atas.

---

## Aturan link (berlaku untuk semua lowongan yang sampai ke user)

1. **Agregator cuma buat menemukan, tidak pernah buat dikasih.** StepStone, Indeed,
   LinkedIn, Glassdoor, XING, Arbeitsagentur, Jobware, Kimeta, dll. Contoh: REWE Group
   pasang iklan di StepStone → yang dikasih ke user adalah halaman iklan yang sama di
   situs karier REWE Group atau sistem lamarannya, bukan link stepstone.de.
2. **Cara cari link resmi (hemat):** nama perusahaan + judul posisi + "karriere"/"careers"
   di mesin pencari, atau buka halaman karier perusahaan lalu cari judulnya. Cukup untuk
   kandidat yang lolos saring cepat, bukan semua iklan.
3. **Uji pakai script, bukan dibaca:**
   `python3 ./--settings/scripts/check_links.py "<link>" --expect "<judul posisi>"`
   - `OK` → boleh dipakai.
   - `JUDUL?` atau `CEK MANUAL` → buka sekali pakai web untuk memastikan; kalau benar,
     boleh dipakai.
   - `MATI` atau `AGREGATOR` → tidak boleh dipakai.
   - **Situs karier yang isinya dimuat JavaScript** (Workday `*.myworkdayjobs.com`,
     SAP SuccessFactors `*.successfactors.*` / `jobs.sap.com`, Personio `*.jobs.personio.*`,
     SmartRecruiters, Greenhouse, Lever) sering keluar `JUDUL?` karena judulnya tidak ada
     di HTML awal. Untuk domain itu: status 200 + URL masih di halaman iklan (bukan
     beranda/pencarian) sudah cukup; buka pakai web HANYA kalau statusnya `MATI`/`CEK
     MANUAL`. Ini yang menjaga biaya token tetap kecil.
4. **Link resmi tidak ketemu → lowongan dilewati.** Jumlahnya disebut di `catatan_jujur`
   ("2 lowongan dilewati karena link resminya tidak ketemu"). Jangan mengarang link.
5. **Sebelum PDF dibuat**, cek sekali lagi semua link di JSON:
   `python3 ./--settings/scripts/check_links.py --json "<path json>"`. Builder juga
   menolak link agregator.

## Pengaturan pencarian (`--usersettings/search_settings.json`)

Satu file, diisi user lewat aplikasi Vantage (tab Morning report → Search settings) atau lewat chat
("ubah pencarian: …", Sinta yang menulis). Isinya: `kata_kunci`, `lokasi`, `jarak_km`, `remote_ok`,
`jenis_kontrak`, `umur_iklan_hari`, `bahasa_lamaran`, `kecualikan_perusahaan`, `maks_rekomendasi`
(1-50, default 5; lebih dari 5 boleh, tapi pencarian sebanyak itu lebih mudah dianggap bot oleh situs),
`ambang_skor` (60-95, default 80), `bobot_skor` (lima komponen skor: `tugas`, `skill`, `bahasa`, `kontrak`,
`nilai_tambah`; bawaan 40/25/15/10/10; angka bulat, jumlah harus 100; diatur user di Search settings → Advanced), `diperbarui`, `oleh` (`app` atau `Sinta`). Key lain (mis. `_catatan`) dibiarkan. File tidak ada atau
`kata_kunci` kosong → cari dari `job_profile.md` seperti biasa, lalu isi file ini dari raw_facts dan profil, bukan
dari tebakan: `kata_kunci` dari target di `job_profile.md`, `lokasi` dan `jarak_km` dari domisili di `identity.json` dan
raw_facts, `jenis_kontrak` dari profil, `bahasa_lamaran` dari bahasa yang dikuasai di raw_facts, sisanya bawaan
(`oleh: "Sinta"`), supaya panel di aplikasi tidak kosong. User boleh mengubah semuanya sendiri di aplikasi. Bagian `pencarian` di JSON laporan diisi
apa adanya dari pengaturan yang benar-benar dipakai.

**Ambang (`ambang_skor`, default 80) berlaku untuk semua skor kecocokan**, laporan pagi maupun JD yang
ditempel user (`sop/lamaran_analisis.md` langkah 3). Turunannya selalu sama: rekomendasi ≥ ambang;
Lamar ≥ ambang+5 (maks 100); Analisis = ambang sampai ambang+4; hampir masuk = ambang−10 sampai ambang−1.
Tiap laporan mencatat ambang yang dipakai di `ambang_skor` dan `ambang_hampir` (= ambang−10), dan bobot yang
dipakai di `bobot_skor` (salinan dari pengaturan; kosong = bawaan), jadi laporan lama tetap terbaca dengan ambang dan
bobotnya sendiri. File tidak ada atau `ambang_skor` kosong = 80.

**"Find jobs now"** (tombol di aplikasi; dulu "Run Morning Report now") mengetik permintaan "jalankan Morning Report sekarang pakai
pengaturan pencarianku" di chat; diperlakukan sama dengan pemicu laporan pagi biasa (`sop/tabel_arah.md`
bagian 1b). Kalau laporan hari ini sudah ada, buat run berikutnya (`run` +1) di folder yang sama.

## Langkah

1. **Baca dulu, cuma ini (Sinta):** `--usersettings/search_settings.json` (pengaturan pencarian,
   lihat "Pengaturan pencarian" di bawah), `--usersettings/job_profile.md`,
   `--usersettings/daily_jobs_seen.json` (kalau ada), bagian "Yang aku cari" di `CLAUDE.md`
   user. `job_profile.md` tidak ada → jangan menebak: kirim satu pesan pendek bahwa
   laporan hari ini batal karena data profil tidak terbaca, lalu berhenti.
2. **Folder hari ini:** `02_workflow/Laporan_Pagi/YYYY-MM-DD/`. Salin
   `./--settings/templates/laporan_pagi/content.json` jadi `YYYY-MM-DD_Laporan_Pagi.json` di situ.
3. **Cari (Sinta)** pakai `search_settings.json` dulu: `kata_kunci`, `lokasi` + `jarak_km`
   (kosong = tanpa batas) + `remote_ok`, `jenis_kontrak`, `umur_iklan_hari`, `bahasa_lamaran`,
   lewati `kecualikan_perusahaan`, dan `target_jumlah` = `maks_rekomendasi` (1-50), `ambang_skor` = ambang pengaturan, `ambang_hampir` = ambang−10. Yang tidak diisi
   di sana diambil dari `job_profile.md`. Tetap hormati batasan jam kerja/izin kerja dan role yang
   dijeda di `CLAUDE.md` user. Ambang diambil dari `ambang_skor` (bagian "Ambang" di atas). Lewati yang sudah ada di `applications.json` (hitung sebagai `sudah_di_tracker`) atau
   sudah muncul di laporan 30 hari terakhir (`daily_jobs_seen.json`, hitung `sudah_dilaporkan`).
   Catat kata kunci, lokasi, filter, sumber, dan sumber yang gagal di `pencarian`.
4. **Saring cepat (Sinta):** skor kasar + satu alasan dari iklannya saja. Berhenti kalau
   sudah ~15 kandidat (atau 3× `maks_rekomendasi` kalau lebih besar) atau `maks_rekomendasi` kandidat yang jelas ≥ ambang. Kandidat ≥ ambang−10 dicarikan link resmi
   (aturan link di atas). Isi `pencarian.corong` dan `dilewati`.
5. **Analisis penuh (Arga, otomatis):** kandidat saring cepat ≥ ambang dengan link `OK` dianalisis
   pakai rubrik `sop/lamaran_analisis.md` langkah 1-3. Isi `rekomendasi` (maks `maks_rekomendasi`, ≥ ambang, aksi +
   alasan, komponen, riwayat dari `applications.json`, deadline, perjalanan, usaha) dan
   `hampir_masuk` (ambang−10 sampai ambang−1). Isi `pola_gap` dari gap 7 hari terakhir. Jangan menurunkan
   ambang supaya jumlahnya genap.
6. **Tiap rekomendasi disimpan seperti JD manual:**
   `Laporan_Pagi/YYYY-MM-DD/NN_Perusahaan_Posisi/` berisi `JD.md` (teks iklan wortgleich), `JD.json`
   (`asal: "web"`, link resmi, tanggal diambil) dan `Analisis_Fit_Gap.json`, lalu
   `build_analisis.py` untuk folder itu (`sop/lamaran_analisis.md` "Versi untuk user").
   Update `JD_Insights.md` untuk rekomendasi saja.
   Nama folder pendek (`sop/penamaan_file.md`). Laporan tidak membuat CV/CL.
7. **Nova:** isi `perlu_aksi` (termasuk belum dijawab) dan `fokus`.
8. **Cek dan bangun:**
   `python3 ./--settings/scripts/check_report.py "<path json>"` lalu
   `python3 ./--settings/scripts/build_laporan_pagi.py "<path json>"`. Builder menolak JSON
   yang tidak lolos cek (exit 1): perbaiki JSON-nya, jangan menulis README atau PDF sendiri.
   Hasil: `.pdf`, `.html`, `00_README.md`, `_pesan_inbox.md`. Kalau PDF tidak dibuat (tidak ada
   Chrome/Edge), kirim pesannya tanpa lampiran dan sebut bahwa PDF menyusul. **Baca PDF-nya**
   sebelum dikirim; lebih dari 1 halaman → pendekkan teks cocok/gap/catatan.
9. **Kirim (Nova):** isi `_pesan_inbox.md` apa adanya, PDF sebagai lampiran.
10. **Catat** semua kandidat yang dilihat (lolos maupun tidak) ke `daily_jobs_seen.json`:
    link, perusahaan, posisi, skor, tanggal, `dilaporkan` (true kalau masuk rekomendasi).
11. **Jangan** bikin folder di `01_Pipeline/`, jangan isi tracker, jangan bikin CV dari laporan.

**"gas nomor N"** (di chat mana pun): jalankan `sop/lamaran_dokumen.md` (langkah 4 dst).
Pindahkan `Laporan_Pagi/YYYY-MM-DD/NN_Perusahaan_Posisi/` ke
`01_Pipeline/DD-MM_Perusahaan_Posisi/01_Analisis/`, jadi analisisnya tidak diulang.

**Laporan lama** (sebelum v2, tanpa JSON) tidak diubah; app Vantage menampilkannya sebagai format lama.

**Biaya token:** tahap saring cepat + cek link lewat script yang menjaga biayanya. Kalau
user minta lebih hemat, kurangi batas kandidat (mis. 10).
