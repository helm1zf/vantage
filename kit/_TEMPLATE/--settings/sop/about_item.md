# SOP About Item — kenali proyekmu sendiri lewat 5W+1H

**Tujuan:** tiap kuliah, proyek, atau pengalaman yang sering ditanya punya satu PDF yang
membuat user (1) **ingat lagi** proyeknya sampai paham, dan (2) **siap ngomong** saat
pewawancara bilang *"Tell me about this project"*, minimal 2 menit, lancar, tanpa
mengarang.

**Siapa:** Raka membuat file ini saat mengupas bahan (`onboarding/wawancara/kupas_bahan.md`).
Laras memakainya untuk latihan dan menambah bagian 5 setelah tiap sesi latihan.

**Cara kerja (sama seperti CV dan Morning Report):** agent hanya mengisi **JSON**; tampilan PDF
(templat editorial, `templates/about_item/layout.html`) dibuat skrip, tidak pernah ditulis tangan.
Salin `templates/about_item/content.json` (contoh fiktif yang valid), isi dari fakta user, lalu
`python3 ./--settings/scripts/build_about_item.py "<ID>_about.json" --check`, lalu tanpa `--check`.

**Sumber:** raw_facts (sub-ID item itu) + bahan asli di `materials/<ID>_<Singkat>/bahan/`.
Fakta yang belum ada di raw_facts → `FAKTA BARU`, konfirmasi user dulu, baru dipakai.

---

## 1. Kapan dibuat

- Untuk tiap item yang muncul di CV dan kemungkinan besar ditanya (proyek, skripsi,
  kerja/magang relevan, kuliah inti yang dekat dengan target role).
- Kerja sampingan yang tidak berhubungan dengan target role cukup dijawab dari raw_facts.
- Saat item itu pertama kali dikupas tuntas, atau saat user minta.

## 2. Letak dan nama

```
01_user_documents/materials/<ID>_<Singkat>/
├── bahan/                ← bahan asli (sop/penamaan_file.md)
├── <ID>_about.json       ← sumber yang diedit Nova (disembunyikan)
└── <ID>_about.pdf        ← yang dibaca user
```

PDF dibuat dengan `python3 ./--settings/scripts/build_about_item.py "<ID>_about.json"` (maks 3 halaman).
Skrip menolak isi yang belum valid dan menyebut field mana yang salah.

## 3. Isi (urutan tetap)

Peta ke field JSON: bagian 1 = `w5h1`, `inti`, `analogi`; bagian 2 = `cerita` (`kartu`, `naskah`,
`durasi_menit`, `bahasa`); bagian 3 = `cek_fakta` (status `terkonfirmasi` / `perkiraan` / `perlu dicek`);
bagian 4 = `istilah`; bagian 5 = `tanya_jawab`. Satu file per bahasa cerita; versi Deutsch = `<ID>_about_de.json`.
Teks boleh memakai `**tebal**` dan `*miring*`, tidak ada HTML.

### Bagian 1 — 5W+1H (inti, wajib lengkap)

Satu tabel, tiap baris 1-3 kalimat, semua dari raw_facts/bahan asli:

| | Pertanyaan | Isi |
|---|---|---|
| **What** | Proyek/kuliah/pekerjaan ini apa? Hasil akhirnya apa? | |
| **Why** | Masalah apa yang mau diselesaikan? Untuk siapa? Kenapa penting? | |
| **Who** | Tim berapa orang, peranmu persisnya apa, siapa stakeholder/klien/dosen? | |
| **When** | Kapan, berapa lama, di tahap apa studimu/kariermu? | |
| **Where** | Kampus/perusahaan mana, konteks/industrinya, lokasi? | |
| **How** | Langkahnya apa saja, alat/teknologi apa, hambatan apa dan bagaimana diatasi, hasil + angka? | |

Di bawahnya: **inti satu kalimat**, **3 jangkar ingatan** (angka/alat/hasil yang paling
mudah diingat), dan **satu analogi awam**.

### Bagian 2 — "Tell me about this project" (≥2 menit)

Dua bentuk untuk tiap bahasa (English wajib; Deutsch kalau user melamar dalam bahasa
Jerman):

1. **Kartu poin** (untuk latihan): 7-9 baris, urutan ngomong mengikuti alur
   Where/When → Why → What → Who → How → hasil → apa yang dipelajari / kaitannya ke role.
   Satu baris = satu ide, maksimal ±12 kata.
2. **Naskah lengkap** (untuk dilirik kalau macet): ~280-320 kata (≈2 menit bicara
   santai), kalimat pendek, mengikuti urutan kartu poin persis, tanpa istilah yang user
   sendiri tidak bisa jelaskan.

Tambahan opsional: versi 30 detik (3-4 kalimat) untuk saat waktu sempit.

### Bagian 3 — Cek fakta

Tabel klaim → ✅ boleh / ⚠️ hati-hati / ❌ jangan, masing-masing dengan bukti (ID
raw_facts atau nama file bahan). Klaim yang tidak ada buktinya tidak boleh muncul di
bagian 2.

### Bagian 4 — Istilah

Tabel Istilah | Analogi awam | Arti resmi. Analogi dulu, supaya user bisa menjelaskan
dengan bahasanya sendiri.

### Bagian 5 — Tanya-jawab lanjutan (terus bertambah)

- Pertanyaan yang mungkin muncul setelah cerita di bagian 2, dikelompokkan per W/H
  ("Why did you choose X?", "What would you do differently?", "What was your exact role?").
- Tiap jawaban **satu kalimat** yang memakai konsep/alat/hasil yang benar-benar ada di
  bahan; cerita panjang pakai kartu poin + teks lengkap.
- Ditutup dengan **pertanyaan batas** (yang tidak dikuasai) + jawaban jujur singkat.
- Setiap sesi latihan Laras: jawaban yang sudah dicek fakta ditambahkan di sini dengan
  tanda "(dilatih YYYY-MM-DD)".

## 4. Selesai kalau

- [ ] Keenam baris 5W+1H terisi dan semuanya punya bukti di bagian 3.
- [ ] Naskah EN 280-320 kata, kartu poinnya cocok urutannya.
- [ ] Tidak ada klaim ❌ di bagian 2.
- [ ] `--check` lulus, PDF jadi dan sudah dibaca ulang, `.json` disembunyikan.
- [ ] Baris item ini di `materials/00_index.md` kolom "About item" diisi tanggalnya.

## 5. Format

Poin pendek (maks. 2-3 baris per paragraf), tanpa catatan internal di isi. Tampilan diatur templat,
jadi jangan menambah gaya sendiri.

---

## 6. Contoh lengkap (FIKTIF — yang dicontek polanya, bukan isinya)

**PROJ2 — Aplikasi kasir koperasi kampus** (`materials/PROJ2_Kasir/PROJ2_about.md`)

### Bagian 1 — 5W+1H

| | Isi |
|---|---|
| **What** | Aplikasi web kasir + stok untuk koperasi mahasiswa; menggantikan buku catatan dan Excel. |
| **Why** | Stok sering selisih (±40 barang/bulan tidak cocok) dan laporan bulanan butuh 2 hari. |
| **Who** | Tim 4 mahasiswa; aku pegang database dan laporan stok. Pengguna: 6 penjaga koperasi. Pembimbing: dosen mata kuliah Rekayasa Perangkat Lunak. |
| **When** | Semester 5, Feb–Jun 2025 (16 minggu), proyek mata kuliah. |
| **Where** | Universitas X, koperasi mahasiswa (±300 transaksi/hari). |
| **How** | Wawancara penjaga → desain database (MySQL, 7 tabel) → aplikasi (Laravel) → uji 2 minggu paralel dengan buku lama. Hambatan: data barang lama tidak rapi → aku bikin skrip impor + pembersihan. Hasil: selisih stok turun ke <5 barang/bulan, laporan bulanan jadi 10 menit. |

**Inti:** aku membangun bagian database dan laporan stok sebuah aplikasi kasir yang
memangkas selisih stok koperasi dari ±40 jadi <5 barang per bulan.
**3 jangkar:** 300 transaksi/hari · MySQL 7 tabel · 2 hari → 10 menit.
**Analogi:** seperti mengganti buku kas warung dengan kalkulator yang ingat semua barang.

### Bagian 2 — "Tell me about this project" (EN)

**Kartu poin:**
1. University X co-op, ~300 sales a day, semester 5.
2. Problem: stock never matched, ~40 items off monthly.
3. Monthly report took two full days by hand.
4. Team of four; I owned database and stock reports.
5. Interviewed the six cashiers first, mapped real workflow.
6. Designed MySQL schema, 7 tables; Laravel web app.
7. Messy old data → wrote import and clean-up script.
8. Two-week parallel test against the paper book.
9. Result: under 5 items off; report in 10 minutes.
10. Learned: talk to users before designing tables.

**Naskah (~300 kata):**

> At my university, the student co-op runs about three hundred sales a day, and until
> last year everything was tracked in a paper book and a few Excel sheets. The problem
> was simple but expensive: every month around forty items didn't match between what
> the book said and what was on the shelf, and the monthly report took two full days.
>
> In my fifth semester, four of us built a replacement as our software engineering
> project. My part was the database and the stock reports. Before designing anything, I
> sat with the six cashiers and watched how they actually worked, because the official
> process and the real one were different — for example, returns were written on sticky
> notes, not in the book.
>
> Based on that, I designed a MySQL schema with seven tables, including a separate table
> for returns, and we built the app in Laravel. The hardest part was the old data: item
> names were spelled five different ways. I wrote an import script that cleaned and
> matched them, and flagged about sixty items for the cashiers to check by hand.
>
> We then ran the new system in parallel with the paper book for two weeks, so nobody
> had to trust it blindly. After that, the monthly mismatch dropped from around forty
> items to fewer than five, and the report went from two days to about ten minutes,
> because it's generated directly from the data.
>
> What I took from it is that the database design was only as good as my understanding
> of the real workflow. That's also why I'm interested in this role: you work closely
> with the people who use the systems, not just on the systems themselves.

### Bagian 5 — contoh tanya-jawab

- *Why MySQL and not Excel with macros?* — Six people wrote at the same time, and Excel
  files kept conflicting; a database handles that by design.
- *What would you do differently?* — Start the parallel test earlier; two weeks found
  bugs we could have fixed sooner.
- *Pertanyaan batas:* *How did you secure the app?* — Honestly, security was handled by a
  teammate; I know we used Laravel's built-in authentication, but I didn't design it.
