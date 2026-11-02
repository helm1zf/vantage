## SESI 1 — Baca bahan, tebak 3 target, skor

Dijalankan langsung setelah Inbox disortir (`onboarding/first_run.md` Langkah 5), tanpa
menunggu user minta. Bahan sudah ada di `materials/`, jadi JANGAN minta user melempar
bahan lagi.

### 1a. Baca cepat semua bahan

Baca CV lama dulu (kalau ada), lalu transkrip, lalu judul/daftar isi bahan lain. Ini
baca cepat untuk menebak arah, belum mengupas. Dari sini susun **daftar blok
pengalaman** (kerja, magang, organisasi, kuliah, proyek) dan status user sekarang
(masih kuliah atau sudah lulus, semester berapa, izin kerja kalau kelihatan).

### 1b. Tebak 3 target

Tiap tebakan = **peran + level + skor kecocokan + satu kalimat alasan**. Level:
**Werkstudent** (kerja paruh waktu sambil kuliah), **Praktikum** (magang penuh waktu,
biasanya 3-6 bulan; catat juga **Pflicht** = wajib dari kampus atau **freiwillig** = sukarela,
karena sebagian lowongan hanya menerima salah satunya), **Teilzeit** (paruh waktu di luar
status mahasiswa), atau **Vollzeit** (kerja penuh waktu). Masih kuliah → utamakan
Werkstudent/Praktikum; sudah lulus → Vollzeit.

Pilih tiga peran yang benar-benar berbeda (bukan tiga variasi nama yang sama), urut
dari skor tertinggi. Kirim dalam SATU pesan berbentuk **laporan singkat**:
- Maksimal sekitar 12 baris. Tanpa kalimat pembuka dan penutup basa-basi.
- Tiap alasan menyebut bahan konkret (nama proyek, mata kuliah, angka), bukan pujian umum.
- Hindari kata kosong ("menarik", "luar biasa", "potensi besar", "sangat cocok sekali").
- Gaya ngobrol biasa sesuai sapaan user, bukan bahasa brosur.

Contoh:

> "Aku udah baca semua bahanmu. Tiga pekerjaan yang paling cocok:
> 1. **Data Analyst, Werkstudent** (78/100): dua proyek Python dan nilai statistik
>    bagus, tapi belum ada pengalaman kerja di bidang data.
> 2. **Controlling, Praktikum** (71/100): ...
> 3. **SAP Consultant Junior, Praktikum** (64/100): ...
> 4. **Bukan ketiganya?** Tulis sendiri mau kerja jadi apa dan levelnya.
>
> Pilih yang mana? Boleh satu utama dan satu cadangan."

### 1c. Skor kecocokan profil (0-100, empat komponen)

Ini skor **profil terhadap target** (belum ada lowongan nyata). Beda dengan skor
lowongan di `sop/lamaran_analisis.md` langkah 3 (ambang dari `search_settings.json`, default 80); jangan dicampur.

| Komponen | Bobot | Penuh kalau… |
|---|---|---|
| Skill teknis | 40 | alat/skill inti yang biasa diminta untuk peran ini sudah terbukti di bahan |
| Pengalaman | 30 | ada kerja/magang/proyek nyata yang tugasnya mirip peran ini |
| Level | 15 | status user cocok dengan level (mis. masih kuliah untuk Werkstudent, lulus untuk Vollzeit) |
| Bahasa | 15 | bahasa yang biasa diminta untuk peran ini di negara tujuan sudah dikuasai di level kerja |

Arti angka: **≥75 cocok** · **50-74 bisa, dengan jembatan** · **<50 terlalu jauh untuk
sekarang**. Selalu tampilkan alasan singkat, bukan cuma angka. Kalau datanya belum ada
(mis. level bahasa), pakai perkiraan dari bahan dan bilang begitu.

### 1d. Kalau user memilih target sendiri (slot ke-4)

Tanya peran dan level kalau belum disebut (kalau Praktikum: wajib dari kampus atau
sukarela?), lalu skor dengan tabel di atas.
- **≥50:** lanjut seperti biasa ke 1e.
- **<50 (terlalu jauh):** jelaskan jujur per komponen kenapa jauh, dan sebut tebakan
  yang lebih cocok sebagai pembanding. Lalu tanya SATU pertanyaan: *"Ada pengalaman
  atau minat apa yang bikin kamu pengen kerja di situ?"* Dari jawabannya, bantu
  rangkai jembatan: skill yang biasa diminta pasar untuk peran itu, mana yang sudah
  bisa dibuktikan dari bahan/cerita user, dan mana yang perlu dipelajari dulu (gap
  dicatat di `JD_Insights.md`; rencana belajar lewat `sop/rencana_belajar.md` kalau
  user mau). Keputusan tetap di user. Kalau dia tetap mau target itu, lanjut tanpa
  diulang-ulang.

### 1e. Tulis target dan daftar topik wajib

Begitu target disepakati:
1. Tulis ke bagian "Yang aku cari" di `CLAUDE.md` user (target utama + cadangan + level).
2. Buat `01_user_documents/--usersettings/job_profile.md` dengan bagian **Target**
   (peran, level lengkap termasuk Pflicht/freiwillig bila Praktikum, skor + alasan) dan
   **Topik wajib wawancara**. Sisa isinya dilengkapi
   di Sesi 5. Tambahkan juga bagian **Tebakan awal**, satu baris per tebakan dari 1b
   (`- Peran, Level (skor/100): alasan singkat`), dan tandai yang dipilih user dengan
   `← dipilih` (target tulisan sendiri: `- <peran>, <level> (skor/100) ← dipilih, tulis sendiri`).
   Tanpa ini, tebakan hanya hidup di chat dan tidak bisa dicek atau dipakai lagi.
3. **Topik wajib = 5 sampai 8 hal** yang hampir pasti ditanya atau dicari untuk target
   ini (dari pengetahuan umum lowongan peran + level itu). Tiap topik ditulis sebagai
   satu baris dengan blok/bahan yang kemungkinan menjawabnya dan status:

   ```
   ## Topik wajib wawancara (target: Data Analyst, Werkstudent)
   - [ ] SQL & database: EDU1 (Datenbanken), PROJ2 → status: belum
   - [ ] Python/pandas: PROJ2, PROJ3 → status: belum
   - [ ] Visualisasi/dashboard: PROJ3 → status: belum
   - [ ] Statistik: EDU1 (Statistik II) → status: belum
   - [ ] Kerja dengan data nyata/stakeholder: ORG1 → status: belum
   - [ ] Bahasa kerja (Jerman/Inggris) → status: belum
   ```

   Status akhirnya salah satu dari: `terisi` (ada fakta ✅/⚠️ di raw_facts) atau
   `gap` (user memang belum punya; ditulis jujur, nanti jadi bahan rencana belajar).

### 1f. Tandai bahan yang tidak dibawa ke CV

**Sebelum menandai satu bahan "tidak dibawa", cari dulu celah yang nyata:** adakah bagian
darinya (skill, tool, cara kerja, hasil) yang jujur nyambung ke target? Kalau ada, tandai
`ya` dan kupas HANYA bagian itu. Kalau tidak ada, jangan dipaksakan nyambung: bahan yang
dipaksakan membuat CV terasa generik dan buatan AI.

Isi kolom **Relevan** di `materials/00_index.md` untuk tiap baris:
- `ya` → dikupas penuh (bagian "Mengupas bahan").
- `tidak dibawa: <alasan singkat>` → tetap disimpan di `materials/`, TIDAK dikupas dan
  TIDAK ditanya lebih dalam.

Lalu kabari user SEKALI, jujur beserta alasannya, tanpa menawarkan pilihan:

> "Beberapa bahan aku simpan tapi gak aku bawa ke CV untuk target ini: mata kuliah
> Marketing dan Sustainability. Alasannya biar CV gak penuh noise dan lamarannya lebih
> tepat sasaran. Tetap aman di folder kamu, dan kepakai lagi kalau target kamu ganti."

**Pengecualian, CV kosong:** kalau bahan yang relevan tidak cukup untuk mengisi CV satu
halaman (mis. kurang dari tiga blok kerja/proyek yang relevan), ganti kalimatnya: bahan
itu dipakai sebagai pengisi singkat (satu baris di pendidikan/lainnya) supaya CV tetap
padat satu halaman. Tandai di index sebagai `pengisi: <alasan>`, tanya cukup 1-2
fakta dasarnya (apa, kapan, nilai/hasil) — bukan dikupas penuh — dan tulis faktanya
di raw_facts dengan tanda `(pengisi)`.

**User merasa bahan itu relevan?** Minta dia jelaskan kenapa menurutnya relevan ke target
ini. Penjelasannya nyambung ke topik wajib → ubah jadi `ya` dan kupas bagian yang nyambung.
Tidak nyambung → jelaskan baik-baik kenapa belum, tetap simpan, jangan berdebat berulang.

### 1g. Kerangka raw_facts dan rapikan materials

Buat `01_user_documents/raw_facts_about_you.md` (BUKAN di `--settings/` — itu cuma
tempat template kosongnya) dari `--settings/templates/raw_facts.md`, berisi **kerangka
kosong** — kode blok (`ORG1`, `ORG2`, `EDU1`, `SKL1`) + nama organisasi + tanggal saja.

Langsung setelah kerangka jadi: **rapikan `01_user_documents/materials/` sesuai kode ID**
(aturan lengkap di `--settings/sop/penamaan_file.md`): tiap bahan bukti dipindah ke folder
`<ID>_<Singkat>/` (`<Singkat>` maks 10 karakter, mis. `PROJ2_Ticketing`, `EDU1_UniX`),
maksimal satu subfolder di dalamnya (biasanya `bahan/`). `00_Original_CV.*` dan
`00_Photo.jpg` tetap di root `materials/`. Jalankan `tidy_materials.py` (rencana dulu,
lalu `--apply`; path di raw_facts ikut diperbarui otomatis), isi `materials/00_index.md`
(satu baris per bahan), dan tulis path tiap bahan di entri raw_facts yang bersangkutan.

Lalu langsung lanjut ke topik wajib pertama. Jangan tanya "mau lanjut?".
