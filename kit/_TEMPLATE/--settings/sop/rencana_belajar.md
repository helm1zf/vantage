# SOP Rencana Belajar — kalau satu skill gap muncul di 5 lowongan

**Pemicu:** di `--usersettings/JD_Insights.md`, satu skill gap sudah disebut di **5 JD
berbeda** dan kolom "Dibahas ke user?" masih "Belum" (`sop/lamaran_analisis.md` langkah 3b).
**Siapa:** Arga membuat (dia yang memegang JD_Insights), Tari memeriksa (checklist di
bawah), Nova menyampaikan ke user.

---

## 1. Ke user (satu paragraf di akhir jawaban analisis JD itu)

> Btw, aku lihat kamu masih ada gap di **<skill>**. Udah muncul di 5 lowongan berbeda
> (<3 nama teratas>, dll). Aku udah bikinin rencana belajarnya, PDF-nya terlampir.

Bukan pertanyaan, bukan ceramah. User bebas mengabaikan.

## 2. PDF rencana belajar

**Letak:** `01_user_documents/recommended_skill_for_you/YYYY-MM-DD_Rencana_Belajar_<Skill>.pdf`
(sumber `.md` di folder yang sama, disembunyikan; PDF lewat `md_to_pdf.py --hide-md`).
Nama `<Skill>` pendek, tanpa spasi (`sop/penamaan_file.md`).

**Isi (urutan tetap, maks 2 halaman):**
1. **Kenapa skill ini:** disebut di JD mana saja (perusahaan – posisi, tanggal), dan
   bagaimana kaitannya dengan target role di `CLAUDE.md` user. 2-3 kalimat.
2. **Posisi user sekarang:** apa yang sudah ada di raw_facts yang mendekati (ID), apa
   yang belum. Jujur, tanpa melebihkan.
3. **Alur belajar bertahap:** 3-5 tahap, tiap tahap = sumber + perkiraan jam + hasil
   yang bisa dicek ("bisa membuat X sendiri"). Sumber gratis/resmi dulu (dokumentasi
   resmi, kursus gratis dari pembuat alatnya, kampus), berbayar hanya kalau tidak ada
   alternatif dan ditandai "berbayar".
4. **Cara membuktikannya di CV:** proyek kecil/sertifikat apa yang bisa jadi jangkar,
   dan kalimat contoh setelah selesai (ditandai "contoh, isi setelah benar-benar selesai").
5. **Total perkiraan waktu.**

## 3. Checklist QC (Tari, sebelum dikirim)

- [ ] Kelima bagian ada, maks 2 halaman.
- [ ] Daftar JD di bagian 1 cocok dengan kolom "Disebut di" di `JD_Insights.md`.
- [ ] Setiap link sudah dibuka dan hidup (`check_links.py`), tidak ada link karangan.
- [ ] Sumber berbayar ditandai; ada minimal satu jalur gratis.
- [ ] Bagian 2 dan 4 tidak mengklaim hal yang belum ada di raw_facts.
- [ ] Tidak ada `<...>` tersisa.

## 4. Setelah terkirim

Ubah kolom "Dibahas ke user?" jadi `Ya, YYYY-MM-DD + PDF`. Skill yang sudah dibahas tidak
diulang, kecuali user minta. Kalau user bilang sudah mulai/selesai belajar, itu
`FAKTA BARU` untuk Raka (bukti baru di raw_facts).
