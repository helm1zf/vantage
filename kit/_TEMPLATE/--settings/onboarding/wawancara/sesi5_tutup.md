## SESI 5 — Tutup: lengkapi CLAUDE.md, lalu berhenti

Setelah semua topik wajib terisi (kalau alat dokumen belum terpasang, jalankan dulu
`onboarding/first_run.md` Langkah 7):

1. Buka `CLAUDE.md` di root folder user (SATU-SATUNYA — sudah gak ada salinan lain
   di `--settings/`), lengkapi bagian `<TAILOR>` yang tersisa bareng user (bahasa, hal
   yang dia gak mau Nova lakukan; target sudah terisi dari Sesi 1). Ini yang bikin
   sesi-sesi berikutnya langsung nyambung tanpa user harus ngulang konteks. Isi juga
   baris "Intensitas latihan interview" (default normal) dan "Batasan izin kerja".
   **Timpa baris urusan onboarding di `--usersettings/status.md`** dengan: "Onboarding
   selesai [tanggal], siap mulai lamaran pertama."
2. Kosongkan dulu bagian "Bukti terkuat per tipe role" dan "Daftar hitam" di Raw
   Materials. **Dua bagian itu memang harus kosong di awal** — isinya baru muncul
   setelah lamaran nyata jalan dan ada yang gagal. Bilang ini ke user supaya dia gak
   ngerasa filenya belum jadi.
3. **Tunjukkan `--settings/sop/aturan_isi_contoh.md`** — baca bareng,
   jangan cuma disuruh baca sendiri. Ini contoh ✅/❌ fiktif yang ngajarin "rasa" crispy
   vs generik; user bakal butuh ini persis pas mulai nulis bullet CV pertama, bukan
   cuma teori di sesi ini.
4. **Munculkan lagi folder `02_workflow/`** — di `onboarding/first_run.md` Langkah 3, folder ini
   sengaja disembunyikan sementara karena belum ada gunanya sebelum Raw Materials
   ada. Sekarang saatnya dimunculin lagi:
   - Mac: `chflags nohidden "<folder-user>/02_workflow"`
   - Windows: `attrib -h "<folder-user>\02_workflow"`
5. **Lengkapi `01_user_documents/--usersettings/job_profile.md`** (maksimal ~40 baris,
   dari raw_facts yang baru selesai). Bagian Target dan Topik wajib sudah ada dari
   Sesi 1; tambahkan lokasi dan kesediaan relokasi, batas jam kerja, bahasa + level,
   5-8 skill/pengalaman terkuat lengkap dengan ID bukti di raw_facts, hal yang TIDAK
   mau, dan daftar hitam ringkas. Ini ringkasan supaya laporan harian tidak membaca
   seluruh raw_facts tiap kali (hemat token). Kalau raw_facts berubah nyata, perbarui
   file ini juga.
6. **Laporan pagi** (maksimal 5 lowongan sesuai level target, skor minimal 80). Cek dulu
   "Wawancara selesai kalau" di atas. Jalankan laporan pertama sekarang
   (`sop/laporan_pagi.md`). Jadwal otomatis harian belum tersedia (segera hadir): jangan menjanjikannya; laporan jalan
   tiap user menekan Find jobs now atau mengetik "laporan pagi".
7. Bilang ke user bahwa onboarding selesai dan folder `02_workflow/` sekarang udah
   muncul dan siap dipakai. Lalu:
   - Kapan pun mau dicariin lowongan, tekan Find jobs now atau ketik "laporan pagi"; lowongan yang mau dilamar
     tinggal ditempel di chat Applications.

---

## Setelah onboarding: sistem ini belajar dari kegagalan, bukan dari file ini

Ini bagian yang paling sering disalahpahami. Starter Kit cuma ngasih **kerangka**.
Yang bikin hit rate naik itu putaran berikutnya:

```
lamar  →  ditolak / mentok  →  cari polanya  →  tulis jadi aturan  →  lamar lagi
```

Tiap kali ada pola gagal berulang, tulis jadi aturan permanen:
- Klaim yang rontok pas ditanya detail → pindahkan ke **Daftar hitam** di Raw Materials.
- Kesalahan proses/format yang kejadian → tambahkan sebagai aturan baru di
  **`--settings/sop/aturan_isi.md`**, lengkap dengan tanggal dan kejadian pemicunya.

**Claude: ingatkan user untuk mencatat, tiap kali muncul koreksi atau penolakan yang
ada alasannya.** Aturan yang gak ditulis bakal terulang di lamaran ke-20.
