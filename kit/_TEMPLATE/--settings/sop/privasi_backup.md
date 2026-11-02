# SOP Privasi & Backup — data user aman, dan bisa dipulihkan

**Berlaku untuk:** Nova dan semua agent, di semua thread.

---

## 1. Apa yang boleh keluar dari komputer user

| Boleh tanpa tanya | Wajib izin user di chat dulu | Tidak pernah |
|---|---|---|
| Pencarian lowongan dan halaman publik perusahaan (tanpa data user di URL) | Mengunggah file user ke layanan/aplikasi lain | Push data user ke GitHub atau repo publik |
| Link resmi lowongan yang diberikan ke user | Mengirim email/pesan atas nama user (Nova tidak mengirim; user yang menekan kirim) | Memasukkan data user ke formulir situs pihak ketiga |
| | Membagikan PDF ke orang lain lewat alat apa pun | Menaruh nama, email, nomor, alamat di URL/query |

- Data user = isi `01_user_documents/`, `02_workflow/`, `CLAUDE.md` user, dan isi obrolan.
- Contoh, template, dan paket rilis (`_TEMPLATE/`, zip) **tidak boleh** memuat data user
  mana pun. Sebelum rilis: cari nama, email, perusahaan, kampus milik pengguna nyata.
- Riset pewawancara (Laras) hanya dari informasi publik dan relevan dengan pekerjaan.

## 2. Backup

- **Cara utama:** user men-zip folder Vantage utuh secara berkala (mis. tiap habis
  melamar atau seminggu sekali) dan menyimpannya di tempat lain (drive eksternal / cloud
  pribadi). Nova mengingatkan sekali sebulan lewat satu kalimat, tidak lebih.
- Sebelum operasi besar (update, `tidy_materials.py --apply`, memindah banyak folder):
  Nova menyarankan zip dulu dan menunggu "udah" sebelum lanjut.
- File `.bak` buatan Nova dihapus setelah operasinya terbukti berhasil
  (`verify_consistency.py` bersih), supaya tidak menumpuk dan membingungkan.

## 3. Kalau ada file rusak

| Gejala | Langkah |
|---|---|
| `identity.json` / `applications.json` gagal dibaca builder | Jangan menimpa dari nol. Tunjukkan pesan error-nya, perbaiki tanda kutip/koma di baris yang disebut, jalankan lagi. Masih gagal → pulihkan dari zip backup terakhir |
| `raw_facts_about_you.md` terhapus/terpotong | Berhenti. Cari di backup user dan di cache sinkronisasi (iCloud/OneDrive "versi sebelumnya"). Jangan menulis ulang dari ingatan |
| PDF/DOCX hasil rusak | Tidak masalah: generate ulang dari JSON-nya |
| Folder lamaran hilang tapi masih ada di tracker | `verify_consistency.py` menunjukkan yang mana; cari di `01_Pipeline/` dan `02_Sent/`, perbaiki kolom `folder` |

## 4. Hapus data

Nova tidak pernah menghapus permanen data user. Kalau user minta hapus: pindahkan ke
folder sampah sistem (Trash/Recycle Bin) atau minta user menghapusnya sendiri.
