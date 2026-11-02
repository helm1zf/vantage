#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator UPDATE.md — jangan diedit hasilnya (UPDATE.md) secara manual.

UPDATE.md butuh isi lengkap tiap berkas "sistem" (--settings/*.py, sop/lamaran.md,
dst — semua yang generik/non-personal) supaya instalasi lama seumur apa pun bisa
disamakan ke standar terbaru cuma lewat satu file .md, tanpa kirim zip ulang. Isi
itu di-generate dari berkas aslinya, bukan ditulis tangan, supaya dua salinan
tidak bisa gak sinkron satu sama lain.

Cara pakai: jalankan file ini (`python3 generate_update.py`) dari folder
`--settings/` kapan pun isi salah satu berkas SISTEM di bawah berubah. Riwayat
migrasi tetap ditulis tangan di `--settings/docs/riwayat_migrasi.md` — itu narasi
keputusan, bukan sesuatu yang bisa disimpulkan otomatis dari diff file.
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_ROOT = os.path.dirname(os.path.dirname(HERE))  # _TEMPLATE/
OUT_PATH = os.path.join(TEMPLATE_ROOT, "UPDATE.md")

# Berkas "sistem" — generik, TIDAK PERNAH dipersonalisasi user, aman di-replace
# wholesale di instalasi mana pun. Path relatif ke _TEMPLATE/. Isi --settings/ diambil
# otomatis (supaya file baru tidak pernah lupa didaftarkan), kecuali alat pengembang.
DEV_ONLY = {"generate_update.py", "build_release.py"}
DEV_ONLY_DIRS = {"docs", "__pycache__"}
EXTRA_SYSTEM_FILES = [
    "02_workflow/03_Tracker/build_tracker.py",
    "01_user_documents/--usersettings/JD_Insights.md",
    "01_user_documents/--usersettings/status.md",
    "01_user_documents/materials/00_index.md",
    "01_user_documents/README.md",
    "01_user_documents/00_other_cv_as_role_model/README.md",
]


def system_files():
    files = []
    base = os.path.join(TEMPLATE_ROOT, "--settings")
    for dp, dns, fns in os.walk(base):
        dns[:] = sorted(d for d in dns if d not in DEV_ONLY_DIRS)
        for fn in sorted(fns):
            if fn in DEV_ONLY or fn.startswith(".") or fn.endswith(".pyc"):
                continue
            files.append(os.path.relpath(os.path.join(dp, fn), TEMPLATE_ROOT).replace(os.sep, "/"))
    return files + EXTRA_SYSTEM_FILES


SYSTEM_FILES = system_files()

LANG_BY_EXT = {
    ".py": "python",
    ".json": "json",
    ".md": "markdown",
    ".html": "html",
}

HISTORY_PATH = os.path.join(TEMPLATE_ROOT, "--settings", "docs", "riwayat_migrasi.md")


def migration_history():
    """Blok riwayat migrasi, ditulis tangan di docs/riwayat_migrasi.md (tanpa judul file)."""
    with open(HISTORY_PATH, encoding="utf-8") as f:
        text = f.read()
    text = re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL)
    return text.split("\n", 1)[1].strip() if text.startswith("# ") else text.strip()


MIGRATION_HISTORY = migration_history()

INTRO = """\
# UPDATE.md — Sinkronisasi Vantage ke Standar Terbaru

**Untuk siapa file ini:** device/folder yang SUDAH PERNAH pakai Vantage sebelumnya —
ada `--settings/` dan `01_user_documents/` di dalamnya, seberapa pun lamanya versi itu.
**BUKAN** untuk instalasi yang benar-benar baru (device yang belum pernah pasang
Vantage sama sekali) — itu jalurnya beda: install ulang dari zip terbaru, lalu
pindahkan folder `01_user_documents/` (data pribadi) dari device lama ke instalasi
baru itu (lihat `--settings/sop/update.md`, bagian "Pindah ke komputer baru", untuk detail).

**Isi file ini:** daftar perubahan Vantage (bagian "Riwayat Migrasi") dan isi lengkap
file sistem terbaru (bagian "Isi Lengkap Berkas Sistem"). File ini cuma membawa isi;
cara memasangnya diatur `--settings/sop/update.md` di folder user.

**Cara memasang:**
- Instalasi yang sudah punya `--settings/sop/update.md`: ikuti SOP itu.
- Instalasi lama yang belum punya: pasang dulu `--settings/sop/update.md` (isinya ada di
  bagian "Isi Lengkap Berkas Sistem"), tambahkan satu baris di "Baca juga" pada
  `CLAUDE.md` user: "`--settings/sop/update.md` — kalau user kasih `UPDATE.md` dan bilang
  'update', ikuti SOP ini.", lalu lanjut ikuti SOP itu.

**Ringkasan perubahan terbaru (2026-10-24):**
- Nama folder: `--settings/` (sistem), `01_user_documents/--usersettings/` (data teknis
  user), `--- I N B O X ---/`, `02_workflow/Laporan_Pagi/`.
- Semua file di `--settings/` pakai huruf kecil + garis bawah; template satu folder per
  dokumen (`content.json` + `layout.html`).
- 7 agent nyata (Nova + Raka, Sinta, Arga, Bayu, Tari, Laras) dengan rantai otomatis,
  peta di `sop/tabel_arah.md`; progres di `--usersettings/status.md`.
- SOP baru: `tabel_arah`, `aturan_isi` (pecahan `lamaran`), `cek_kualitas`, `rencana_belajar`,
  `follow_up`, `penamaan_file`, `privasi_backup`; `update` sekarang juga memuat Paket Update
  dan pindah komputer. Ditulis ulang: `about_item` (5W+1H + contoh), `laporan_pagi`,
  `first_run`, `persiapan_interview` (intensitas, arketipe per tipe role).
- Ambang skor tunggal 80. Link lowongan wajib situs resmi, dicek `check_links.py`.
- PDF lewat Chrome/Edge, tanpa Word/LibreOffice. `tidy_materials.py` untuk path pendek
  (path di raw_facts ikut diperbarui), `check_keywords.py` untuk cek kata kunci iklan.

**Kalau instalasinya masih pakai nama folder lama** (`00_Master`, `00_system`,
`00_Inbox`, `-settings`, `--usersetting`): blok riwayat di bawah sudah ditulis dengan
nama BARU. Jalankan dulu blok [2026-10-24] langkah 1 (ganti nama folder), baru blok lain
urut dari atas.

Urutan kerjanya:
1. `Langkah 0` — cek versi.
2. `Langkah 0.5` — waspada kalau instalasinya lebih purba dari yang dikenal file ini.
3. `Langkah 0.6` — cek tool apa yang kamu punya (bisa pindah/hapus fisik, atau cuma
   bisa tulis isi file) — ini menentukan apakah kamu kerjakan semuanya sendiri atau
   sebagian jadi checklist manual buat user.
4. `Langkah 1` — scan & klasifikasi ISI seluruh folder lama, pindahkan (atau, kalau
   `Langkah 0.6` bilang kamu tidak bisa pindah fisik, susun checklist) file personal
   ke lokasi standar (jangan andalkan path/nama file yang disebut di `Riwayat
   Migrasi` sebagai kepastian — itu cuma konteks tambahan).
5. `Riwayat Migrasi` — baru sesudah data personal aman di lokasi barunya (atau
   checklist-nya sudah diberikan ke user), terapkan tiap blok yang masih relevan
   (kode sistem, hidden-flag, struktur SOP, dst), urut dari atas ke bawah (blok yang
   lebih lama duluan). Lewati blok yang "Deteksi"-nya sudah tidak cocok — berarti
   sudah pernah diterapkan atau memang tidak relevan.

**JANGAN PERNAH** menghapus atau menimpa isi data personal user
(`raw_facts_about_you.md`, isi personal di `CLAUDE.md` seperti "Siapa
aku"/"Yang aku cari"/"Sesi terakhir", `identity.json`, `applications.json`,
`JD_Insights.md` yang sudah ada isinya, `materials/`, `00_other_cv_as_role_model/`) — yang boleh
di-replace wholesale HANYA berkas generik/sistem yang memang tidak pernah
dipersonalisasi (daftarnya di bagian "Isi Lengkap Berkas Sistem" di bawah).

**Cara pakai (jelasin ke user kalau ditanya):** taruh file `UPDATE.md` ini di mana
saja di folder Vantage lama (root folder pengguna juga boleh, `--- I N B O X ---/` juga
boleh), lalu bilang ke Nova: *"update"*. Tidak perlu kirim zip ulang — device yang
sudah pernah instal Vantage cukup file ini saja.

## Langkah 0 — Cek versi saat ini

Baca `01_user_documents/--usersettings/.vantage_version` kalau ada (isinya cuma satu
baris tanggal, mis. `2026-09-24`). Kalau file itu tidak ada sama sekali, anggap
instalasi user ini SEBELUM semua migrasi di `Riwayat Migrasi` di bawah (paling lama)
— jalankan semuanya urut dari atas.

## Langkah 0.5 — Kalau instalasinya lebih purba dari yang dikenal file ini (WAJIB dibaca)

`Riwayat Migrasi` di bawah cuma mencatat perubahan sampai ke titik file ini
di-generate — **bukan jaminan mencakup SEMUA versi yang pernah ada.** Kalau instalasi
user ternyata dari sebelum semua itu (nama paketnya bukan "Job-Search Automation"
ATAU bukan "Vantage", strukturnya beda dari yang dideskripsikan di `Riwayat Migrasi`
manapun, ada file/folder yang tidak dikenali sama sekali di file ini), **JANGAN
memaksakan salah satu blok migrasi untuk "kira-kira cocok" atau menebak-nebak
tindakannya sendiri.** Sebagai gantinya:

1. Laporkan ke user, secara konkret, isi folder mereka SAAT INI (nama file/folder
   yang ada, terutama yang tidak disebut di `Riwayat Migrasi` manapun) — supaya ada
   dasar buat mutuskan langkah berikutnya bareng-bareng, bukan diam-diam ditebak.
2. Tetap boleh terapkan bagian dari `Riwayat Migrasi` yang deteksinya JELAS cocok
   (mis. kalau `--settings/CLAUDE.md` memang ada persis seperti dideskripsikan,
   langkah konsolidasi itu tetap aman dijalankan apa adanya).
3. Untuk bagian yang TIDAK dikenali sama sekali oleh `Riwayat Migrasi` — jangan hapus,
   jangan timpa, jangan asumsikan itu "sampah versi lama yang aman dibuang". Data
   personal user (riwayat kerja, draft lamaran lama, dst.) mungkin ada di situ dalam
   bentuk/lokasi yang berbeda dari yang diasumsikan file ini.
4. Kalau raw_facts_about_you.md (atau padanannya di versi lama itu) tetap ketemu dan
   bisa dibaca, itu tetap sumber fakta yang harus dipakai/dipindahkan — jangan sampai
   user disuruh wawancara ulang dari nol cuma karena strukturnya tidak dikenali file
   ini, kalau isinya sebenarnya masih bisa diselamatkan.

Prinsipnya: file ini menjamin instalasi "yang tercatat pernah ada" bisa disamakan
ke standar terbaru dengan aman. Untuk apa pun yang tidak tercatat, keamanannya
datang dari BERHENTI DAN NANYA, bukan dari asumsi.

## Langkah 0.6 — Cek Tool Apa yang Kamu Punya (WAJIB, sebelum janji apa pun ke user)

Migrasi di file ini punya dua jenis pekerjaan yang beda kebutuhan tool-nya:

- **Tulis/edit ISI file** (gabung CLAUDE.md, timpa isi script/dokumen sistem) — cuma
  butuh kemampuan baca+tulis file biasa. Ini SELALU bisa kamu kerjakan, di environment
  manapun kamu jalan.
- **Pindah/rename/hapus file & folder secara fisik** (data personal ke lokasi baru,
  restrukturisasi `04_workflow` → `02_workflow` dst, hidden-kan folder, hapus
  `--settings/CLAUDE.md` lama) — ini butuh tool tambahan (mis. Bash dengan `mv`/`rm`,
  atau tool file-management setara) yang TIDAK SELALU tersedia tergantung environment
  kamu jalan sekarang, terlepas dari isi instruksi di file ini.

**Kalau kamu TIDAK punya tool buat pindah/rename/hapus** (cuma bisa baca dan menulis
isi file) — ini bukan alasan buat berhenti atau menolak seluruh migrasi. Jangan
bilang "gak bisa dijalankan" dan berhenti di situ. Sebagai gantinya, PECAH kerjaannya:

1. **Kerjakan semua yang bisa kamu kerjakan** lewat tulis-isi-file — merge CLAUDE.md,
   replace isi `sop/lamaran.md`/`README.md`/`onboarding/wawancara_profil.md`/script Python di lokasi
   file itu SEKARANG (menimpa isi file yang sudah ada di tempatnya BUKAN butuh tool
   pindah, itu cuma butuh tool tulis). Alur kerja baru (skor-dulu-baru-tanya, dst)
   sudah aktif begitu ini selesai, walau strukturnya folder belum berubah.
2. **Susun CHECKLIST KONKRET buat user** untuk sisanya yang butuh pindah fisik —
   sebutkan persis folder/file mana, dari path lama yang mana, ke path baru yang
   mana (hasil dari `Langkah 1` di bawah), supaya user bisa drag-and-drop sendiri
   lewat File Explorer/Finder dalam hitungan menit. Jangan generik ("pindahkan data
   personalmu") — sebutkan nama folder persis yang kamu temukan lewat scan.
3. Untuk `--settings/CLAUDE.md` lama dan hidden-flag: seperti disebut di blok
   "Konsolidasi CLAUDE.md" — itu opsional/kosmetik, tidak menghalangi migrasi
   dianggap selesai. Cukup masuk ke checklist yang sama sebagai item "opsional,
   beres-beres".
4. Sesudah user bilang sudah selesai pindahin manual, **verifikasi lagi** (baca
   ulang struktur folder yang relevan) sebelum bilang migrasi selesai — jangan
   percaya begitu saja tanpa cek ulang.

Prinsipnya: keterbatasan tool bukan alasan buat berhenti total, tapi juga bukan
alasan buat memaksakan hal yang memang butuh tangan manusia. Bagi tugasnya sesuai
kemampuan masing-masing pihak.

## Langkah 1 — Scan Isi Folder Lama Secara Menyeluruh (WAJIB, kerjakan ini DULU)

**Jangan andalkan nama file atau lokasi/path yang disebut di `Riwayat Migrasi` di
bawah sebagai kepastian.** Itu cuma "petunjuk dari versi yang pernah tercatat" —
nama folder dan lokasi persis bisa beda-beda tiap versi, apalagi kalau usernya
sendiri pernah oprek/rename manual. Yang jadi pegangan utama adalah **ISI file**,
bukan nama atau lokasinya.

**Cara kerja:**
1. Telusuri SELURUH folder instalasi lama secara rekursif (bukan cuma lapisan atas)
   — termasuk sub-folder yang tersembunyi.
2. **Kenali dulu FOLDER-FOLDER besarnya** dari isinya (bukan dari nomor urut/nama
   di depannya — nomor urut folder besar itu PALING gampang beda antar versi, dan
   PALING berisiko kalau salah baca, karena satu folder besar bisa berisi puluhan
   file/riwayat lamaran nyata sekaligus). Pakai tabel "Fingerprint Folder" di bawah.
   Jangan cocokkan berdasarkan nomor prefix (`02_` vs `04_` dst) — cocokkan
   berdasarkan APA YANG ADA DI DALAMNYA.
3. Untuk tiap FILE yang ditemukan (baik di dalam folder besar yang sudah dikenali
   maupun yang tercecer), buka dan kenali JENISNYA dari ISI-nya, pakai tabel
   "Fingerprint Berkas Personal" di bawah — bukan dari nama filenya persis
   (`identity.json` versi lama bisa saja sudah di-rename usernya jadi `data_ku.json`
   misalnya, tetap harus dikenali dari isinya).
4. **Kalau ketemu lebih dari satu file/folder dengan jenis yang sama** (mis. dua-duanya
   "identity.json-like", atau dua folder yang sama-sama kelihatan seperti folder
   role_model): buka dan BANDINGKAN isinya dulu — jangan asal pilih satu secara
   diam-diam, dan jangan biarkan keduanya jadi duplikat di lokasi baru.
   - Kalau jelas satu cuma versi lebih lama/kurang lengkap dari yang lain (subset
     data yang sama) — pakai yang paling lengkap/terbaru, sisanya cukup diabaikan
     (tidak perlu dihapus paksa, cukup tidak ikut dipindah).
   - Kalau keduanya kelihatan berisi data yang BEDA (bukan sekadar versi lama vs
     baru dari data yang sama) — JANGAN putuskan sendiri. Tanya user mana yang
     harus dipakai, atau apakah keduanya perlu digabung manual.
5. Pindahkan (`mv`/`Move-Item`, BUKAN copy) tiap file/folder yang sudah dikenali ke
   lokasi & nama STANDAR sesuai tabel di bawah. Buat folder tujuannya kalau belum
   ada. Untuk folder besar (workflow/pipeline/arsip): pindahkan SELURUH ISINYA,
   termasuk tiap sub-folder lamaran per perusahaan di dalamnya — jangan cuma
   pindahkan folder luarnya lalu lupa cek isinya lengkap atau tidak.
6. File/folder yang TIDAK cocok jenis mana pun di tabel (skrip sistem versi lama,
   file sampah, atau sesuatu yang benar-benar asing) — JANGAN dihapus otomatis.
   Ikuti `Langkah 0.5` untuk yang benar-benar tidak dikenali.
7. **Baru setelah semua file & folder personal aman di lokasi standar barunya**,
   lanjut ke blok "Data personal berujung di 01_user_documents/--usersettings/" di
   `Riwayat Migrasi` untuk urusan hidden-flag dan replace kode.

### Fingerprint Folder (kenali dari ISI folder, bukan nomor urut/nama depannya)

| Jenis folder | Ciri isi | Lokasi standar tujuan |
|---|---|---|
| Bahan mentah belum disortir | Isinya campuran file mentah (CV lama, transkrip, dll) yang kelihatan belum dikelompokkan/dirapikan | Kalau masih ada isinya: sortir dulu tiap file sesuai "Fingerprint Berkas Personal" di bawah, JANGAN dianggap sampah cuma karena namanya mengandung "Inbox". Kalau sudah kosong: cukup pastikan `--- I N B O X ---/` standar (sejajar `--settings/` di root folder pengguna) ada. |
| Referensi CV/CL orang lain | Isinya dokumen CV/cover letter yang JELAS BUKAN milik user (nama berbeda-beda, kadang per-folder-per-orang) | `01_user_documents/00_other_cv_as_role_model/` — pindahkan seluruh isinya, berapa pun level nesting aslinya (top-level atau nested) |
| Folder lamaran aktif (belum closed) | Berisi sub-folder yang isinya CV/CL/analisis JD per lamaran, status masih Draft/Screening/Interview/Assessment — nama sub-foldernya bisa berpola `<tanggal>_<perusahaan>_<posisi>` (format tanggal apa pun, versi lama) | `02_workflow/01_Pipeline/DD-MM_<perusahaan>_<posisi>/` — RATA, TANPA sub-folder Jenis/Tahun/Bulan (beda dari `02_Sent/` di bawah — sengaja, `01_Pipeline/` diakses sering + isinya alami sedikit). Cukup ganti pola nama ke `DD-MM_...`, jangan ditambah nesting apa pun. |
| Folder lamaran arsip (closed: Applied/Rejected/Withdrawn/Offer selesai) | Sama seperti di atas tapi statusnya sudah closed — nama sub-foldernya bisa rata `<tanggal>_<perusahaan>_<posisi>` ATAU sudah nested sebagian | `02_workflow/02_Sent/<Jenis>/<Tahun>/<Bulan>/DD-MM_<perusahaan>_<posisi>/` — `<Jenis>` dari field `tipe` di `applications.json` (Praktikum/Werkstudent/Teilzeit/Vollzeit/Minijob), `<Bulan>` berpola `NN - NamaBulan` Bahasa Inggris, dan bulan YANG SEDANG BERJALAN (bukan bulan folder ini) dapat prefix `00_` (mis. `00_currentMonth_09`) — lihat blok migrasi "01_Pipeline/ jadi rata, 02_Sent/ jadi nested" untuk logic lengkap prefix-nya. **PALING RAWAN ke-skip** karena nomor prefix folder besarnya bisa beda (mis. `04_workflow/` di versi sangat lama vs `02_workflow/` sekarang). Pindahkan SEMUA sub-folder satu per satu, jangan cuma folder luarnya, `mkdir -p` dulu sebelum `mv` kalau parent-nya belum ada. |
| Script & data tracker | Berisi `build_tracker.py` dan/atau `Application_Tracker.xlsx` | `02_workflow/03_Tracker/` (scriptnya di-replace wholesale — lihat "Isi Lengkap Berkas Sistem"; `applications.json` di dalamnya ikut aturan fingerprint file di bawah) |

### Fingerprint Berkas Personal (kenali dari ISI, bukan nama file)

| Jenis | Ciri isi | Lokasi & nama standar tujuan |
|---|---|---|
| Identitas diri | JSON objek dengan field semacam nama/email/alamat/telepon/LinkedIn milik satu orang | `01_user_documents/--usersettings/identity.json` |
| Tracker lamaran | JSON array/objek berisi banyak entri, tiap entri ada field semacam perusahaan/posisi/status/tanggal | `01_user_documents/--usersettings/applications.json` |
| Sumber fakta personal | Markdown panjang berisi entri berkode ID (pola mirip `ORG1-01`, `PROJ2`, `EDU1`) — riwayat kerja/proyek/pendidikan seseorang | `01_user_documents/raw_facts_about_you.md` |
| Catatan skill-gap | Markdown berisi tabel dengan kolom semacam "Skill Gap"/"Disebut"/"Rekomendasi" | `01_user_documents/--usersettings/JD_Insights.md` |
| Aturan personal asisten | Markdown yang menyebut preferensi personal user (nama lengkap, target lamaran, gaya bicara, aturan konten) — ini `CLAUDE.md` versi lama | JANGAN dipindah/ditimpa mentah — lihat blok "Konsolidasi CLAUDE.md" di `Riwayat Migrasi`, isi personalnya WAJIB digabung ke struktur baru, bukan dibuang |
| Dokumen pendukung | CV lama, transkrip, foto formal, dokumentasi proyek — file yang diupload user, bukan dibuat sistem (di versi sangat lama bisa saja ada langsung di root `01_user_documents/`, bukan di subfolder) | `01_user_documents/materials/` (kelompokkan sesuai jenisnya, ikuti pola nama di `01_user_documents/README.md`) |
| Referensi CV orang lain | CV/CL milik orang lain (bukan user sendiri), disimpan sebagai contoh/pembanding | `01_user_documents/00_other_cv_as_role_model/` |

Kalau ragu satu file atau folder itu jenis apa, BUKA dan BACA isinya dulu sebelum
mutusin — jangan tebak dari nama atau nomor urutnya doang. Kalau setelah dibaca
tetap tidak jelas, itu masuk kategori "tidak dikenali" di `Langkah 0.5` — laporkan
ke user, jangan ditebak.

## Riwayat Migrasi (konteks tambahan per perubahan — terapkan yang masih relevan)

Bagian di bawah ini melengkapi `Langkah 1`, bukan menggantikannya — isinya hal-hal
yang TIDAK bisa disimpulkan cuma dari isi file (mis. status hidden sebuah folder,
struktur alur kerja di dalam SOP, atau kode program yang perlu diganti versi
terbarunya). Urutan kronologis, blok yang lebih lama duluan.
"""

OUTRO = """\

## Setelah Semua Langkah yang Relevan Diterapkan

1. Tulis/timpa `01_user_documents/--usersettings/.vantage_version` dengan tanggal HARI INI
   (bukan tanggal migrasi terakhir yang diterapkan) — format satu baris `YYYY-MM-DD`.
2. **Jalankan `python --settings/verify_consistency.py`.** Ini WAJIB, bukan
   opsional — script ini cek otomatis: isi `--settings/` sudah sinkron sama versi
   di file ini, field `folder` di `applications.json` match ke lokasi fisiknya,
   dan (kalau relevan) prefix `00_` di `02_Sent/` sudah benar. Exit code 0 berarti
   aman. Kalau ada baris "BERMASALAH", BACA dan BERESIN dulu satu-satu sebelum
   lapor migrasi selesai — jangan cuma jalanin lalu abaikan hasilnya kalau ada
   yang bermasalah.
3. Ringkas ke user apa aja yang barusan disinkronkan (bahasa awam, bukan daftar
   nama file teknis).
4. Verifikasi tambahan: jalankan salah satu builder (`build_cv.py` dengan
   `cv_content.json` contoh apa pun yang ada) buat pastikan tidak ada error jalur
   file setelah migrasi — jangan cuma bilang "selesai" tanpa dicoba jalanin sekali.

---

## Isi Lengkap Berkas Sistem (generik — aman direplace wholesale sesuai instruksi di atas)

**Catatan:** bagian ini di-generate otomatis dari `_TEMPLATE/` versi terbaru — jangan
diedit manual di sini. Kalau ada yang perlu diubah, ubah file aslinya di `_TEMPLATE/`
lalu jalankan ulang `--settings/generate_update.py`.
"""


def lang_for(path):
    _, ext = os.path.splitext(path)
    return LANG_BY_EXT.get(ext, "")


def fence_for(content):
    """Pilih pagar backtick lebih panjang dari run terpanjang di dalam content,
    supaya blok kode yang di-embed tidak menutup pagar wrapper secara prematur
    kalau isinya sendiri punya contoh ```."""
    runs = re.findall(r"`+", content)
    longest = max((len(r) for r in runs), default=0)
    return "`" * max(3, longest + 1)


def main():
    parts = [INTRO.rstrip(), "", MIGRATION_HISTORY, "", OUTRO.rstrip(), ""]
    for rel_path in SYSTEM_FILES:
        abs_path = os.path.join(TEMPLATE_ROOT, rel_path)
        if not os.path.exists(abs_path):
            print(f"! DILEWATI (tidak ketemu): {rel_path}")
            continue
        with open(abs_path, "r", encoding="utf-8") as f:
            content = f.read()
        lang = lang_for(rel_path)
        fence = fence_for(content)
        parts.append(f"### `{rel_path}`\n")
        parts.append(f"{fence}{lang}")
        parts.append(content.rstrip("\n"))
        parts.append(fence)
        parts.append("")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(parts))

    print(f"DONE -> {OUT_PATH}")
    print(f"{len(SYSTEM_FILES)} berkas sistem di-embed.")


if __name__ == "__main__":
    main()
