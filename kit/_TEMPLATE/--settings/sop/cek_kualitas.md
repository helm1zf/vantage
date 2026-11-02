# SOP Cek Kualitas — checklist Tari sebelum dokumen dianggap siap

**Tujuan:** hasil yang sama bagusnya setiap kali, siapa pun yang menulis dan kapan pun.
Checklist ini "SOP hasil": yang dinilai PDF akhirnya, bukan niat penulisnya.

**Dipakai untuk:** PDF lamaran di `02_ready_to_send/` (CV + cover letter) dan Master CV.
**Yang memeriksa:** Tari, dengan ruang kerja baru di tiap putaran (`sop/tabel_arah.md`
bagian 3). Bahannya cuma: PDF terbaru, `JD.md`, `Analisis_Fit_Gap.md`, blok ID raw_facts
yang dikutip, dan daftar perbaikan putaran sebelumnya.

---

## Checklist (semua butir wajib, urut)

**Sebelum butir A:** jalankan `check_facts.py` (lihat `sop/lamaran_dokumen.md` langkah 5) pada `cv_content.json` dan `cl_content.json`. Hasil bukan `OK` = `PERBAIKAN`, sebutkan temuannya di `qc_report.md`. Untuk **Master CV** langkah ini dilewati (JSON-nya tidak memakai `_sumber`); fakta Master CV diperiksa lewat butir 6-7.

### A. Bentuk
1. **Jumlah halaman:** CV = 1, cover letter = 1 (`count_pages` di output build/export).
   Master CV boleh lebih.
2. **Tidak ada teks nabrak atau terpotong:** baris jabatan vs kolom kanan, bullet yang
   meluber ke luar margin, baris menggantung sendirian di halaman berikut.
3. **Tidak ada placeholder:** `<TAILOR`, `<...>`, `TODO`, `xxx`, `REQ-xxxxx`.
4. **Nama file benar:** `<Surname>_CV.pdf`, `<Surname>_Cover-Letter.pdf` (atau versi
   Jerman), tanpa spasi, tanpa tanggal, tanpa "final/v2".
5. **Kontak bisa diklik:** email dan LinkedIn di PDF adalah link.

### B. Fakta
6. **Setiap klaim ada di raw_facts:** angka, nama tool, nama perusahaan/brand, peran.
   Tidak ketemu = gagal, walaupun kalimatnya bagus.
7. **Tanggal, nilai, nama institusi persis** seperti raw_facts (bukan dibulatkan).
8. **Level bahasa dan tool tidak dilebihkan** (kalibrasi 3 tingkat di `sop/aturan_isi.md`).
9. **Daftar hitam** di akhir raw_facts tidak dilanggar.
10. **Label internal** (`[internal: not for applications]`) tidak muncul di dokumen lamaran.

### C. Isi terhadap lowongan
11. **Kata kunci iklan:** tiap kata/frasa penting di JD (tim/unit, alat, topik, program
    wajib) muncul di CV/cover letter, atau tercatat sebagai gap di `Analisis_Fit_Gap.md`.
    Mulai dari `python3 ./--settings/scripts/check_keywords.py "<folder lamaran>"` (daftar
    ADA / TIDAK ADA), lalu nilai sendiri tiap yang TIDAK ADA; script bisa melewatkan
    istilah umum, jadi baca JD-nya juga.
12. **Tiap bullet punya jangkar** (angka, tool, atau brand/event).
13. **Cover letter:** paragraf tugas+bukti mengutip istilah JD; tidak ada kalimat yang
    mengumumkan kekurangan ("saya belum pernah ..."); ketersediaan/tanggal mulai sesuai
    yang diminta JD; 600-650 kata isi (pedoman, batas kerasnya tetap 1 halaman).
14. **Register formal**, bahasa sesuai JD/aturan user, ejaan dan tata bahasa bersih.
15. **Etika framing:** tidak merendahkan orang lain, tidak memposisikan diri "sudah
    melewati" kerjaan dasar, istilah lokal dijelaskan.

## Format hasil (`qc_report.md`, ditimpa tiap putaran)

```
LULUS
```
atau
```
PERBAIKAN (putaran 2/3)
1. [B6] CV, bullet ke-2 Werkstudent: "cut reporting time by 60%" — angka 60% tidak ada di raw_facts (ORG1-03 cuma "dari 3 hari jadi 1 hari").
2. [A1] Cover letter 2 halaman — paragraf 4 dan 5 bisa digabung.
```

Kode di kurung siku = nomor butir checklist, supaya Bayu langsung tahu aturannya.
Putaran ke-3 masih `PERBAIKAN` → berhenti, Nova lapor ke user (butir yang belum lolos +
kutipannya + path PDF terakhir).
