# SOP Penamaan File — nama pendek, path aman, gampang dicari

**Kenapa ada:** banyak user dapat error *"path too long"* / *"the destination path is too
long"* waktu memindah atau menyalin folder Vantage, hampir selalu di
`01_user_documents/materials/`. Penyebabnya tiga, sering sekaligus:
1. **Bahan upload-an dengan nama asli yang panjang** (judul paper, nama slide dosen),
   bertumpuk di beberapa level subfolder bawaan dosen/kampus.
2. **Karakter yang dilarang Windows** di nama file (`:` `|` `?` `*` `<` `>` `"`), biasanya
   dari judul slide seperti "Bab 2: Dasar-dasar | Teil 1". Di Mac aman, di Windows
   langsung gagal.
3. **Folder lama disalin utuh ke dalam folder baru** (mis. seluruh folder user ke Inbox),
   jadi path-nya dobel panjang.

Windows lama memutus di 260 karakter TOTAL (termasuk `C:\Users\...\OneDrive\...\Vantage\`,
yang sendirian sering sudah 80-100 karakter). Jadi path di dalam folder user dijaga
**maksimal 150 karakter**. `verify_consistency.py` memberi peringatan kalau lewat.

---

## 1. Folder user

- Pola `<nachname>_<vorname>`, huruf kecil, tanpa spasi, tanpa umlaut (ä→ae, ö→oe,
  ü→ue, ß→ss), **maksimal 20 karakter**.
- Kalau lebih dari 20: nama depan diganti inisial (`wulandari_sd` untuk "Sari Dewi
  Wulandari"). Masih lebih: nama belakang dipotong sampai muat.

## 2. `materials/` (bahan bukti)

**Folder per pengalaman:** `<ID>_<Singkat>`
- `<ID>` sama dengan ID di raw_facts (`EDU1`, `PROJ2`, `ORG1`, `EDU1-03`), panjangnya bebas.
- `<Singkat>` **maksimal 10 karakter**, huruf/angka/tanda hubung, tanpa spasi.
  Contoh: `EDU1_UniX`, `PROJ2_Kasir`, `ORG1_TokoY`, `EDU1-03_Statistik`.
- **Kedalaman maksimal satu subfolder:** `materials/<ID>_<Singkat>/<subfolder opsional>/<file>`.
  Biasanya subfolder itu `bahan/` (bahan asli). Semua yang lebih dalam (mis.
  `PROJ2_X/Lehrmaterial/1-Lecture/B-Principles/slide.pdf`) **diratakan naik** ke
  subfolder tingkat-1 tempat dia berada; nama yang bentrok dapat akhiran `_2`, `_3`.
- Sub-item (mis. satu mata kuliah di dalam satu jenjang studi) dapat folder ID sendiri
  di tingkat yang sama, bukan bersarang: `EDU1_UniX/` dan `EDU1-03_Statistik/`
  berdampingan.
- **Otomatis:** `python3 ./--settings/scripts/tidy_materials.py` menampilkan rencana
  perataan + pembersihan nama; tambah `--apply` untuk mengerjakan. Nama lama dicatat di
  `materials/00_index.md` bagian "Log ganti nama". Nova menjalankannya setiap selesai
  menyortir Inbox. Path di raw_facts yang menunjuk ke file yang dipindah ikut diperbarui
  otomatis oleh script itu; Nova cukup mengecek hasilnya.

**Kategori:** boleh ada folder kategori (`education/`, `research/`, `projects/`, `work/`, `certificates/`) berisi satu subfolder per item (`research/RES2_Demand_Forecast/`).
Vantage menampilkan tiap item sendiri, dikelompokkan per kategori. Jangan menaruh file lepas langsung di folder kategori.

**Rapikan Inbox:** Nova menulis rencana, aplikasi yang memindahkan. Tujuan yang boleh: `materials/...`, `raw_facts_about_you.md`, `Master_CV/`,
`00_other_cv_as_role_model/`, `your_recalling_journey/`, `recommended_skill_for_you/`, `02_workflow/Laporan_Pagi/`. Nama yang bentrok tidak ditimpa
(file baru jadi `<nama>_from_inbox.<ext>`). Jangan pernah menolak memindahkan raw facts atau laporan pagi lama.

**File di dalamnya:** `<ID>_<jenis>[_nn].<ext>`
- `<jenis>` pendek dan jelas: `transkrip`, `ijazah`, `sertifikat`, `laporan`, `slide`,
  `paper`, `kode`, `foto`. Nomor `_01`, `_02` kalau lebih dari satu.
- Bahan kuliah yang banyak (slide per sesi) boleh pakai pola `<ID>_<jenis>_<nn>_<kata
  kunci maks 25 karakter>.<ext>`, mis. `PROJ2_slide_04_basis-data.pdf`.
- **Nama asli dicatat** di `materials/00_index.md` (kolom "Nama asli"), jadi tidak ada
  yang hilang walaupun file-nya diganti nama.
- File lepas di root `materials/` berawalan `00_`: `00_Original_CV.<ext>`, `00_Photo.jpg`.

**Bersihkan nama** (juga dikerjakan `tidy_materials.py`): buang `< > : " / \ | ? *`, spasi di ujung, titik di ujung; ganti
spasi dengan `_` atau `-`; ganti umlaut; potong supaya path total ≤150.

## 3. Inbox

- User boleh menaruh apa saja di folder Inbox, dengan nama apa saja.
- **Nova langsung menyortir** ke `materials/` dengan aturan di atas, mencatat di
  `materials/00_index.md`, lalu mengosongkan Inbox. Inbox bukan tempat simpan.
- Kode proyek (repo) cukup disimpan sebagai zip `<ID>_kode.zip`, bukan folder ribuan file.
- **Jangan pernah menyalin folder Vantage lama (folder user utuh) ke Inbox.** Untuk
  update dan pindah versi, pakai `sop/update.md`.

## 4. Lokasi folder Vantage

Saran ke user (sekali, waktu setup): taruh folder Vantage di path pendek, mis.
`C:\Vantage` atau `Dokumen/Vantage`, bukan di dalam banyak lapis folder OneDrive/iCloud.

## 5. Cek

`python3 ./--settings/scripts/verify_consistency.py` → bagian PERINGATAN `[path]`
menyebut jumlah path yang terlalu panjang atau memakai karakter terlarang, plus contoh
terpanjangnya. Rapikan sampai peringatan itu hilang.
