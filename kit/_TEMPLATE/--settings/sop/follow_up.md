# SOP Follow Up — setelah lamaran dikirim

**Kapan:** lamaran berstatus `Applied` (user sudah bilang benar-benar mengirim,
`sop/lamaran_dokumen.md` langkah 8), sampai lamaran itu tertutup (`Rejected`, `Withdrawn`,
`Offer` selesai).
**Siapa:** Nova mengingatkan dan mencatat; Laras untuk interview; Raka untuk pola gagal
yang jadi aturan; Bayu untuk email balasan formal.

---

## 1. Pengingat kabar

- Nova mengecek `applications.json` di awal obrolan (bareng `status.md`). Lamaran
  `Applied` tanpa kabar **lebih dari 14 hari** → satu kalimat ke user: *"Lamaran ke X
  udah 2 minggu tanpa kabar. Mau aku bikinin email tanya kabar singkat?"*
- Email tanya kabar (kalau user mau): Bayu menulis 3-4 kalimat formal, bahasa sesuai
  lamarannya, sebut posisi + tanggal kirim + ketertarikan. **User yang mengirim**, bukan
  Nova.
- Tidak ada kabar **lebih dari 6 minggu** → tawarkan status `No Response` (status resmi tracker) dan
  pindahkan foldernya ke `02_Sent/` (langkah 8 `sop/lamaran_dokumen.md`).
- Isi `next_action` dan `next_action_due` di `applications.json` supaya pengingat ini
  muncul tepat waktu.

## 2. Undangan interview

1. Update status (`Screening` / `Interview R1` / `R2` / `Assessment`), isi tanggal di
   `next_action_due`, timpa baris di `status.md`.
2. Kalau folder sudah di `02_Sent/`, pindahkan kembali ke `01_Pipeline/` (aktif lagi).
3. Serahkan ke Laras (`sop/persiapan_interview.md`). Konfirmasi jadwal/balasan email
   ditulis Bayu, dikirim user.
4. Setelah interview: debrief oleh Laras, lalu status berikutnya.

## 3. Penolakan

1. Status `Rejected`, tanggal, alasan kalau disebut perekrut (kutip apa adanya) di
   kolom `catatan`. Folder ke `02_Sent/<Jenis>/<Tahun>/<Bulan>/`.
2. **Cari pola, bukan cuma mencatat:** Nova melihat penolakan 60 hari terakhir. Ada
   pola yang berulang (≥3 kali alasan mirip, mis. bahasa jadi gerbang keras, tipe role
   yang sama selalu gagal di tahap yang sama) → `USULAN ATURAN` ke user. Kalau user
   setuju: Raka menulis ke "Daftar hitam" di raw_facts, dan aturan isi baru masuk
   `sop/aturan_isi.md` dengan format pemicu + tanggal.
3. **Kalau penolakan datang sesudah interview:** pastikan `Interview_Prep/Debrief_*.md` sudah ada
   (kalau belum, Laras membuatnya sekarang) lalu salurkan pelajarannya sesuai tabel di
   `sop/persiapan_interview.md` bagian 10. Ini jalur "ditolak, balik ke lamaran dengan bekal baru".
4. Penolakan bukan alasan menulis ulang raw_facts. Fakta tetap fakta.

## 4. Tawaran (Offer)

- Status `Offer`, catat tanggal batas jawab. Tidak menandatangani atau menjawab atas
  nama user.
- Lamaran lain yang masih aktif: tanya user mau dilanjutkan atau ditarik (`Withdrawn`);
  surat penarikan sopan ditulis Bayu, dikirim user.
- Topik izin kerja/kontrak yang belum jelas → arahkan ke sumber resmi (kantor
  imigrasi/kampus/serikat), bukan ditebak.

## 5. Selesai

Setiap perubahan status: `applications.json` → `build_tracker.py` → timpa baris di
`status.md` → `verify_consistency.py` kalau ada folder yang dipindah.
