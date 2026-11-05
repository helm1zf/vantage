<p align="center">
  <img src="docs/assets/banner.svg" alt="Vantage" width="100%">
</p>

<p align="center">
  <a href="https://github.com/helm1zf/vantage/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/helm1zf/vantage?style=flat-square&color=E4511F&labelColor=1B1A18"></a>
  <a href="https://github.com/helm1zf/vantage/actions/workflows/release.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/helm1zf/vantage/release.yml?style=flat-square&labelColor=1B1A18"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square&labelColor=1B1A18">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square&labelColor=1B1A18"></a>
</p>

<p align="center">
  <a href="#tangkapan-layar">Tangkapan layar</a> &nbsp;/&nbsp;
  <a href="#instalasi">Instalasi</a> &nbsp;/&nbsp;
  <a href="#fitur">Fitur</a> &nbsp;/&nbsp;
  <a href="#cara-kerja">Cara kerja</a> &nbsp;/&nbsp;
  <a href="#privasi">Privasi</a> &nbsp;/&nbsp;
  <a href="#pengembangan">Pengembangan</a>
</p>

<p align="center"><sub><a href="README.md">English</a> &nbsp;|&nbsp; Bahasa Indonesia</sub></p>

---

Vantage adalah aplikasi desktop untuk mencari kerja, dengan tim asisten bawaan yang berjalan di akun Claude milikmu sendiri.
Mereka mencari lowongan, menilai seberapa cocok tiap lowongan denganmu, menulis CV dan surat lamaran yang disesuaikan, dan
menyiapkanmu untuk interview. Aplikasi menampilkan hasilnya di satu layar dan menyimpan semuanya di folder di komputermu.

Aplikasi tersedia dalam bahasa Inggris, Jerman, dan Indonesia. Asisten ditulis untuk pelamar berbahasa Indonesia yang mencari
posisi working student, magang, dan entry-level di Jerman; bagian yang tidak berlaku untukmu, seperti soal izin kerja, dilewati.

## Tangkapan layar

<p align="center">
  <img src="docs/assets/screenshot-dashboard.png" alt="Dashboard Vantage" width="100%">
</p>

<p align="center">
  <img src="docs/assets/screenshot-board.png" alt="Papan lamaran Vantage" width="100%">
</p>

<sub>Ditampilkan dengan data contoh bawaan. Repositori ini tidak berisi lamaran atau data pribadi yang asli.</sub>

## Instalasi

1. Unduh installer dari [rilis terbaru](https://github.com/helm1zf/vantage/releases/latest): `Vantage_<versi>_aarch64.dmg`
   (Mac Apple Silicon), `Vantage_<versi>_x64.dmg` (Mac Intel) atau `Vantage_<versi>_x64-setup.exe` (Windows).
2. Pasang dan buka. Saat pertama dibuka, aplikasi menawarkan **Set up a new Vantage folder** (`~/Documents/Vantage`, di Windows
   `%USERPROFILE%\Vantage`) dan menanyakan nama lengkapmu. File yang dibutuhkan sudah ada di dalam aplikasi.
3. Chat **Nova** menunjukkan cara menghubungkan Claude Code (aplikasi memasangnya dan membuka halaman masuk). Dibutuhkan akun
   Claude Pro atau Max.

Supaya Claude yang mengerjakan langkah 1 dan 2, buka **Code** di aplikasi Claude dan kirim
`Please install Vantage from this link: https://github.com/helm1zf/vantage`. Langkah yang diikutinya ada di [INSTALL.md](INSTALL.md).

**Aplikasi belum ditandatangani** Apple atau Microsoft, jadi peluncuran pertama diblokir. macOS: klik kanan aplikasi, pilih **Open**
(atau jalankan `xattr -dr com.apple.quarantine /Applications/Vantage.app`). Windows SmartScreen: **More info**, lalu **Run anyway**.
Membangun dari sumber (lihat [Pengembangan](#pengembangan)) terbuka di macOS tanpa peringatan.

## Fitur

| Bagian | Fungsinya |
|---|---|
| Dashboard | Status, tingkat balasan, yang perlu perhatian, tugas hari ini dengan target mingguan, perubahan sejak kunjungan terakhir, dan kartu untuk hal yang perlu dicek. Kartu bisa disembunyikan. |
| Inbox | Taruh file atau folder apa saja. **Tidy up** merapikannya ke dokumenmu; bagian folder Vantage lama dikembalikan ke tempatnya. |
| Morning report | Lowongan harian dengan skor kecocokan. Dijalankan sesuai permintaan atau otomatis pada jam yang kamu pilih. |
| Applications | Papan dan daftar. Cari, urutkan, kecocokan minimum, pindahkan beberapa kartu sekaligus, tambah lamaran manual, ekspor ke CSV dan kalender (.ics). Detailnya berisi dokumen, kontak dan catatan, dan draf tindak lanjut dalam tiga bahasa. |
| Interview | Persiapan per lamaran dengan daftar periksa, catatan latihan, dan chat Laras. |
| Profile, Skills, Learn | Bahan sumber, Master CV, celah skill dari iklan yang dianalisis, rencana belajar, dan pelacak mingguan. |
| Offers | Bandingkan tawaran dengan bobot yang kamu tentukan. |
| Datamu | **Export account** menulis satu zip dengan daftar setiap file; **Import account** memasukkannya kembali persis dan membuktikan tidak ada yang hilang. **Fix misplaced files** dan **System check** memperbaiki folder. |
| Chat | Nova (tanya apa saja), Raka (profilmu), grup Applications (Sinta, Arga, Bayu, Tari), dan Laras (latihan interview). Tombol memulai agen yang tepat langsung. Tema terang dan gelap; pencarian keyboard dengan Ctrl/Cmd+K. |

## Cara kerja

Asisten berjalan di Claude Code milikmu. Tombol di aplikasi memulai agen yang memegang tugasnya; di grup Applications kamu bisa
menyapa anggota langsung (`@Sinta`), dan yang lain masuk ke Nova, yang memanggil agen lainnya.

<p align="center">
  <img src="docs/assets/flow.svg" alt="Nova mengarahkan pekerjaan ke Raka, Sinta, Arga, Bayu, Tari, dan Laras" width="100%">
</p>

| Agen | Tanggung jawab |
|---|---|
| Raka | Mewawancarai pengalamanmu, memproses bahanmu, dan satu-satunya agen yang menulis basis faktamu. |
| Sinta | Mencari iklan yang cocok dengan profilmu dan memastikan tautan menuju halaman resmi perusahaan yang masih aktif. |
| Arga | Memetakan tiap syarat iklan ke bukti di faktamu dan menilai kecocokan (ambang bawaan 80). |
| Bayu | Menulis CV dan surat lamaran yang disesuaikan dari bukti itu dan mengekspornya sebagai PDF. |
| Tari | Memeriksa tiap PDF dan memberi lulus atau daftar perbaikan bernomor, hingga tiga putaran. |
| Laras | Meriset perusahaan, menjalankan interview latihan, dan mengevaluasi. |

Dokumen ditulis dari bukti di basis faktamu sendiri, bukan dari templat umum. Yang kamu catat di aplikasi (kontak, skor latihan,
tujuan) disalin ke file teks baca-saja (`ui_context.md`) supaya agen tahu tanpa perlu diberi tahu.

## Pembaruan

Aplikasi memperbarui dirinya sendiri: spanduk menawarkan restart dan *What's new* menampilkan perubahannya. Agen dan skrip di
foldermu diperbarui saat aplikasi menampilkan *Vantage update available* dan kamu menekan **Update now**: file sistem
dibandingkan lewat hash dan diganti setelah dicadangkan. Materi, lamaran, dan laporanmu tidak pernah ditimpa.

## Privasi

- Semua data tetap di folder Vantage di komputermu.
- Aplikasi sendiri menulis pengaturanmu, salinan Inbox, dan perubahan tracker (memindah, menambah, atau menghapus lamaran) serta membuat ekspor; setiap perubahan tracker dicatat di `app_changes.log`.
- Agen hanya membaca dan menulis di dalam folder Vantage. Selain skrip Python, `ls`, dan `mkdir`, perintah shell perlu persetujuanmu di chat, dan perintah yang menghapus atau mengubah pengaturan sistem tidak pernah diizinkan.
- Tidak ada yang dikirim ke mana pun selain permintaanmu ke Claude, halaman web yang dibuka agen untuk pencarian, dan pengecekan pembaruan di GitHub.

## Pengembangan

Vantage dibangun dengan [Tauri v2](https://tauri.app): cangkang Rust di `src-tauri/` dan antarmuka HTML, CSS, dan JavaScript
biasa di `ui/`. Direktori `kit/` adalah templat folder pengguna; ia ditanam di dalam aplikasi dan dipublikasikan sebagai
`Vantage_Kit.zip`.

```text
.
├── ui/              antarmuka (index.html, app.js, nova.js, chatdock.js, tour.js, features/)
├── src-tauri/       cangkang Rust, capabilities, dan unit test
├── kit/             agen, prosedur, templat, dan skrip Python yang dijalankan aplikasi
├── tools/           cek terjemahan, tes skrip kit (tests/), tes UI (ui-tests/)
├── docs/assets/     gambar untuk README ini
├── .github/         workflow cek (ci.yml) dan rilis (release.yml)
├── INSTALL.md       langkah instalasi untuk Claude
└── vantage.json     pengaturan publikasi (github_repo)
```

Untuk menjalankan lokal kamu butuh [Node.js](https://nodejs.org) dan [toolchain Rust](https://rustup.rs):

```bash
npm install
npx tauri icon app-icon.png   # ikon dibuat otomatis dan tidak di-commit
npm run dev
```

Pengecekan (juga dijalankan `ci.yml` di setiap push ke main):

```bash
node tools/check_i18n.js                                   # setiap teks UI punya terjemahan Jerman dan Indonesia
python3 -m unittest discover -s tools/tests                # ekspor/impor, pindah dan tambah lamaran, ekspor tracker
node tools/ui-tests/run.js                                 # UI dengan backend tiruan (butuh playwright)
cd src-tauri && cargo clippy --all-targets && cargo test
```

### Merilis versi baru

1. Perbarui `RELEASE_NOTES.md` dan versi di `package.json`, `src-tauri/tauri.conf.json`, dan `src-tauri/Cargo.toml`.
   Kalau kit berubah: tambahkan entri di `kit/_TEMPLATE/--settings/docs/riwayat_migrasi.md`, isi `.vantage_version` dengan tanggalnya, dan jalankan
   `python3 kit/_TEMPLATE/--settings/scripts/generate_update.py`.
2. Push tag seperti `v0.9.0`.
3. [Workflow rilis](.github/workflows/release.yml) membangun macOS (Apple Silicon dan Intel) dan Windows, menandatangani file
   pembaruan, dan menerbitkan rilis dengan `latest.json` dan `Vantage_Kit.zip`. Aplikasi yang terpasang mengambilnya saat
   dibuka berikutnya.

Kunci penandatangan pembaruan disimpan sekali sebagai secret repositori `TAURI_SIGNING_PRIVATE_KEY` (Settings, Secrets and
variables, Actions). Kunci itu tanpa kata sandi dan tidak pernah di-commit.

## Lisensi

Dirilis di bawah [Lisensi MIT](LICENSE). Hak cipta (c) 2026 punktepy.
