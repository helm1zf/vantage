# First Run — setup pertama, sebelum wawancara profil

**Kapan dipakai:** Nova dibuka di folder Vantage (sejajar `_TEMPLATE/`) dan belum tahu
folder user-nya. Dijalankan di obrolan pembukaan (= **Interview with Nova**; kalau thread
tidak tersedia, obrolan yang sama), SETELAH pembukaan di `onboarding/project_mode.md`.
Nova sudah kenalan dan tahu nama panggilan; jangan kenalan ulang. Sapaan tidak ditanya:
default aku-kamu, ikuti gua-lu kalau user pakai itu.

**Urutan singkat:** nama lengkap → cari folder lama → bikin folder → minta bahan (sambil
pasang alat baca) → sortir → langsung tebak target. Alat dokumen (Langkah 7) ditunda sampai
benar-benar dibutuhkan. Tujuannya: user cepat sampai ke momen tebakan target, bukan
menunggu instalasi.

User kebanyakan bukan orang IT: **jangan suruh mereka membuka Terminal atau mengetik
perintah.** Nova yang menjalankan, lalu melapor dalam bahasa awam.

---

## Langkah 1 — Nama lengkap

Tanya **nama lengkap** kalau baru punya nama panggilan. Jangan mencocokkan folder dari
nama panggilan saja: nama depan bisa sama untuk dua orang dan datanya bisa tercampur.

## Langkah 2 — Cari folder user yang sudah ada

Slug folder: `<nama_belakang>_<nama_depan+tengah_digabung>`, huruf kecil ASCII, umlaut
diganti (ä→ae), tanpa spasi, **maksimal 20 karakter** (lebih → nama depan jadi inisial,
mis. `wulandari_sd`; masih lebih → nama belakang dipotong).
Contoh: "Budi Santoso" → `santoso_budi`; "Sari Dewi Wulandari" → `wulandari_saridewi`.

Cari folder itu (tidak peka huruf besar/kecil) di folder Vantage.
- **Ketemu:** baca `CLAUDE.md`, `--usersettings/status.md`, dan `applications.json`-nya,
  sambut dengan ringkasan progres terakhir. Jangan mulai dari nol. Selesai.
- **Tidak ketemu:** lanjut Langkah 2b.

## Langkah 2b — Baru tanya: pernah pakai Vantage versi lama?

*"Sebelum ini kamu pernah pakai Vantage (mungkin dengan nama atau susunan folder lain)?"*
- **Pernah, di komputer ini:** cari folder dengan isi khas Vantage (ada
  `raw_facts_about_you.md`, `applications.json`, `00_Master/`, `-settings/`). Ketemu →
  itu folder user-nya; pasang versi baru di tempat lewat `--settings/sop/update.md`. Tidak
  membuat folder baru, tidak menyalin apa pun ke Inbox.
- **Pernah, tapi datanya di komputer/folder lain:** minta user memindahkan folder lamanya
  LANGSUNG ke folder Vantage ini (sejajar `_TEMPLATE/`), bukan ke Inbox (bagian "Data lama
  dari tempat lain" di bawah). Tidak perlu Langkah 3 (folder sudah ada).
- **Belum pernah:** lanjut Langkah 3.

## Langkah 3 — Bikin folder baru dari template

0. **Cek panjang path** folder Vantage. Kalau sangat panjang (banyak lapis OneDrive/iCloud),
   sarankan sekali untuk memindahnya ke path pendek (mis. `C:\Vantage`), alasannya di
   `--settings/sop/penamaan_file.md` bagian 4.
1. Salin isi `_TEMPLATE/` ke `<folder Vantage>/<slug>/`, **kecuali** alat pengembang:
   `UPDATE.md`, `--settings/scripts/generate_update.py`, `build_release.py`,
   `--settings/docs/`.
2. Salin `--settings/templates/interview_stories.md` → `01_user_documents/interview_stories.md`.
   (`--usersettings/status.md` dan `materials/00_index.md` sudah ikut dari template.)
3. Isi nama lengkap di `CLAUDE.md` (root folder user) dan baris "Sapaan". `CLAUDE.md` =
   aturan personal saja; progres ada di `--usersettings/status.md`. Harus di root folder
   user supaya selalu terbaca otomatis.
4. Tulis tanggal hari ini (`YYYY-MM-DD`) ke `01_user_documents/--usersettings/.vantage_version`.
5. **Sembunyikan "dapur":** `python3 ./--settings/scripts/hide_internal.py` (Mac/Windows;
   tidak mengubah nama apa pun), plus `02_workflow/` disembunyikan SEMENTARA sampai
   wawancara profil selesai:
   - Mac: `chflags hidden "<folder-user>/02_workflow"`
   - Windows: `attrib +h "<folder-user>\02_workflow"`
   Gagal → abaikan, cuma kosmetik.
6. Bilang terus terang ke user (bahasa awam): folder `--settings/`, file `CLAUDE.md`, dan
   subfolder `--usersettings/` disembunyikan supaya tidak membingungkan, bukan
   dirahasiakan; semua perubahan tetap lewat obrolan. Panggil user pakai nama
   panggilannya, bukan slug folder.

## Langkah 4 — Minta bahan mentah (jangan jelaskan struktur dulu)

> "Taruh semua bahan mentah kamu — CV lama, transkrip nilai, laporan/paper kuliah,
> kode proyek, foto formal — ke folder `--- I N B O X ---/` di folder kamu. Asal taruh aja,
> gak perlu dirapiin. Makin lengkap makin bagus: Arbeitszeugnis, project kampus, apa pun
> yang kamu punya. Biar cepat, CV lama juga boleh. Bilang ke aku kalau udah."

**Sambil menunggu user menyiapkan bahan** (jangan membuatnya menunggu instalasi), pasang
alat BACA saja, yang kecil dan cepat:
1. **OS dan Python:** `uname` (Mac/Linux) atau cek env Windows; `python3 --version` /
   `python --version`. Python tidak ada → kasih link python.org, tunggu user bilang sudah
   install (ini satu-satunya yang boleh membuat user menunggu).
2. `pip install pypdf Pillow`. Gagal → coba berurutan, berhenti di yang pertama berhasil:
   1. `pip install --user pypdf Pillow` (error izin).
   2. Error "externally-managed-environment" (Python bawaan Mac/Homebrew/Linux) → buat
      lingkungan sendiri: `python3 -m venv --system-site-packages "--settings/.venv"` lalu
      `"--settings/.venv/bin/pip" install pypdf Pillow` (Windows: `--settings\.venv\Scripts\pip`),
      dan pakai `python` dari lingkungan itu untuk skrip berikutnya.
   3. Tetap gagal (offline, jaringan kantor/kampus memblokir) → lanjut TANPA pypdf, lihat
      poin 3.
3. **Pasang alat tidak boleh jadi beban user.** Alat dipakai untuk membaca PDF dan foto; kalau
   gagal, baca langsung lewat kemampuan baca file bawaan (PDF dan gambar bisa dibuka langsung
   oleh alat baca file Claude, tanpa pypdf). Bahan teks (`.md`, `.txt`) selalu bisa dibaca.
   **Jangan meminta user mengetik ulang, memfoto layar, atau mengonversi file.** Hanya kalau
   satu file benar-benar tidak terbaca (PDF hasil scan yang isinya gambar semua dan tidak
   terbaca juga secara visual, file rusak, atau dilindungi password), sebut nama file itu saja
   dan minta user mengirim ulang file yang itu atau membuka kuncinya. Sisa bahan tetap jalan.
4. Lapor satu kalimat: *"Sistemnya udah siap baca bahan kamu."*

Tunggu konfirmasi bahan dari user.

### Data lama dari tempat lain

**Jangan lewat Inbox** (path jadi dobel panjang, di Windows gagal "path too long"). Minta:
*"Pindahin folder Vantage lama kamu langsung ke folder Vantage ini, jadi sejajar dengan
`_TEMPLATE`."* Dari komputer lain: *"Klik kanan folder lama → Compress/Kirim ke ZIP, lalu
extract ZIP-nya langsung ke folder Vantage ini (bukan ke Inbox)."* Setelah folder ada, pasang
versi baru lewat `--settings/sop/update.md`. Kalau susunannya terlalu lama untuk update
biasa, migrasi per file dari folder itu:
1. Baca daftar isinya (kalau masih zip: Python `zipfile`), jangan bongkar utuh.
2. Ekstrak per file langsung ke tujuan barunya dengan nama baru, urut prioritas:
   `raw_facts_about_you.md` (paling kritis; nama lama bisa `Raw_Materials.md`) →
   `01_user_documents/`; `applications.json`, `identity.json`, `JD_Insights.md` →
   `--usersettings/`; aturan personal di `CLAUDE.md` lama → gabungkan ke `CLAUDE.md` baru;
   bahan bukti → `materials/` dengan aturan `penamaan_file.md`.
3. Verifikasi: jumlah baris file teks tidak berubah drastis, JSON valid, jumlah entri masuk
   akal. Ringkas ke user apa yang ketemu dan apa yang tidak.

## Langkah 5 — Sortir Inbox (Nova, otomatis)

Pindahkan (`mv`, bukan copy) tiap file dari `--- I N B O X ---/` ke
`01_user_documents/materials/`:

| Terdeteksi sebagai | Aksi |
|---|---|
| CV/resume (nama mengandung cv/resume/lebenslauf, atau isinya jelas CV) | `materials/00_Original_CV.<ext>` |
| Foto wajah formal (cek visual) | `materials/00_Photo.jpg` (nama persis ini; dibaca otomatis `build_cv.py`) |
| Folder kode/repo (ada `.git`, `package.json`, `pom.xml`, dll) | Zip jadi `<nama-singkat>_kode.zip` (tanpa `node_modules`/`.git` kalau besar), ke `materials/<nama-singkat>/` |
| Dokumen lain (transkrip, laporan, sertifikat, slide kuliah) | `materials/`, nama pendek dan bersih; folder bertingkat diratakan, maks 1 subfolder |

Lalu `python3 ./--settings/scripts/tidy_materials.py` (rencana) → `--apply`, isi
`materials/00_index.md` (ID, file, nama asli). Aturan lengkap: `--settings/sop/penamaan_file.md`.
Inbox harus kosong lagi. File yang tidak jelas (mis. foto grup) → tanya user dulu.
**Tidak ada foto formal di bahan?** Minta sekali: *"Kamu punya pasfoto atau headshot? Kalau ada,
taruh di Inbox ya, nanti dipasang di CV."* Tidak punya → lanjut tanpa foto, jangan diulang.

## Langkah 6 — Jelaskan singkat, langsung tebak target

Ceritakan di chat dalam satu-dua kalimat: bahannya sudah rapi di
`01_user_documents/materials/` (boleh dibuka, tapi perubahan lewat obrolan), dan folder
kerja lamaran muncul setelah wawancara selesai.

Sebut juga nama fitur hariannya satu kalimat: *"Nanti ada **Morning Report**: Sinta carikan lowongan
sesuai targetmu dan kirim satu laporan satu halaman. Cukup bilang 'cariin lowongan' kapan saja."*
(Pemicu dan balasannya: `sop/tabel_arah.md` bagian 1b. Belum dijalankan sebelum wawancara selesai.)

Lalu **jangan tanya "mau mulai?"**: langsung baca `onboarding/wawancara/00_aturan.md` dan
`onboarding/wawancara/sesi1_target.md` (baca bahan, tebak 3 target, skor). Kalimat transisinya cukup:

> "Bahan kamu udah aku rapiin. Sekarang aku baca semuanya dulu, terus aku tebak
> pekerjaan yang paling cocok buat kamu."

**Inbox kosong** (user belum punya bahan sama sekali): tanya tiga hal, satu per giliran
(status kuliah/kerja dan jurusan, pengalaman kerja atau proyek terbesar, bahasa yang
dikuasai), lalu tebak dari jawaban itu.

---

## Langkah 7 — Alat dokumen (DITUNDA)

**Jangan dijalankan di pembukaan.** Jalankan sekali, tepat sebelum skrip mana pun pertama kali
membuat PDF atau dokumen (biasanya file about item saat mengupas bahan, `onboarding/wawancara/kupas_bahan.md`;
paling lambat di penutup wawancara, `onboarding/wawancara/sesi5_tutup.md`), dan juga kalau
sebuah skrip gagal karena modul atau browser tidak ditemukan. Sambil bilang satu kalimat: *"Sebentar, aku pasang alat buat bikin PDF CV kamu."*

1. **Paket Python dokumen** (otomatis, tanpa izin, kecil):
   `pip install python-docx openpyxl markdown`
   (error izin atau "externally-managed-environment" → cara bertingkat yang sama seperti Langkah 4;
   kalau Langkah 4 memakai `--settings/.venv`, pasang di situ dan jalankan skrip dengan `python` dari situ).
   `pypdf` dan `Pillow` sudah ada dari Langkah 4.
2. **Mesin PDF: Chrome atau Edge** (Word dan LibreOffice TIDAK dibutuhkan):
   ```
   python3 -c "import sys; sys.path.insert(0, '_TEMPLATE/--settings/scripts'); import lib_render; print(lib_render.find_browser() or 'TIDAK ADA')"
   ```
   Windows hampir selalu punya Edge. `TIDAK ADA` → minta izin user, bantu install Google
   Chrome ("buat bikin PDF CV kamu").
3. Lapor satu kalimat: *"Alat bikin PDF-nya udah siap."*
