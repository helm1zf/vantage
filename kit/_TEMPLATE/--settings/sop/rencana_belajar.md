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

**Cara kerja:** agent mengisi JSON, skrip membuat PDF (templat peta jalan, `templates/rencana_belajar/layout.html`).
Salin `templates/rencana_belajar/content.json`, isi dari fakta, lalu
`python3 ./--settings/scripts/build_rencana_belajar.py "<file>.json" --check`, lalu tanpa `--check`.

**Letak:** `01_user_documents/recommended_skill_for_you/YYYY-MM-DD_Rencana_Belajar_<Skill>.json` (disembunyikan) dan `.pdf`
di sebelahnya. Nama `<Skill>` pendek, tanpa spasi (`sop/penamaan_file.md`). Maks 3 halaman.

**Isi (peta ke field):**
1. **Kenapa skill ini** = `alasan`, `muncul_di` / `total_jd` (angka dari `JD_Insights.md`), `contoh_lowongan` (maks 5), `level_diminta`.
2. **Posisi user sekarang** = `bukti_sekarang`. Dari raw_facts (sebut ID di catatan kerja), jujur, tanpa melebihkan.
3. **Jalur mingguan** = `minggu` (1-8 minggu): tiap minggu `judul`, `fokus`, 2-6 `langkah`, `waktu_jam`. Total jam dihitung otomatis.
   Sumber gratis/resmi dulu; berbayar hanya kalau tidak ada alternatif.
4. **Proyek mini penutup** = `proyek_mini` (nama, deskripsi, hasil yang bisa ditunjukkan).
5. **Sumber belajar** = `sumber` (2-6, dengan `jenis`) dan **cara menunjukkannya** = `cara_menunjukkan`.
   Kalimat CV hanya sebagai contoh sampai benar-benar selesai.

## 3. Checklist QC (Tari, sebelum dikirim)

- [ ] `--check` lulus dan PDF dibaca ulang (maks 3 halaman).
- [ ] `muncul_di` dan daftar contoh cocok dengan kolom "Disebut di" di `JD_Insights.md`.
- [ ] Setiap link sudah dibuka dan hidup (`check_links.py`), tidak ada link karangan.
- [ ] Ada minimal satu jalur gratis; yang berbayar disebut jelas di `catatan`.
- [ ] `bukti_sekarang` dan `cara_menunjukkan` tidak mengklaim hal yang belum ada di raw_facts.
- [ ] Tidak ada `<...>` tersisa.

## 4. Setelah terkirim

Ubah kolom "Dibahas ke user?" jadi `Ya, YYYY-MM-DD + PDF`. Skill yang sudah dibahas tidak
diulang, kecuali user minta. Kalau user bilang sudah mulai/selesai belajar, itu
`FAKTA BARU` untuk Raka (bukti baru di raw_facts).
