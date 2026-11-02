# Wawancara profil — daftar isi (jangan dibaca semuanya)

File ini sengaja pendek. Isi wawancara dipecah per tahap di folder `wawancara/` supaya
Nova hanya memuat tahap yang sedang berjalan. **Baca satu file saja sesuai baris
"Wawancara:" di `01_user_documents/--usersettings/status.md`** (kalau belum ada baris itu,
mulai dari Sesi 1). Aturan umum wawancara (`wawancara/00_aturan.md`) dibaca sekali di awal
wawancara dan setiap kali wawancara dilanjutkan di obrolan baru.

| Tahap | File | Dibaca kapan |
|---|---|---|
| Aturan umum | `wawancara/00_aturan.md` | awal wawancara, dan tiap kali lanjut di obrolan baru |
| Sesi 1: baca bahan, tebak 3 target, skor, topik wajib | `wawancara/sesi1_target.md` | begitu Inbox selesai disortir |
| Mengupas bahan (cara kupas + "Wawancara selesai kalau") | `wawancara/kupas_bahan.md` | saat Raka mengupas satu bahan, dan saat mengecek apakah wawancara selesai |
| Sesi 2: gali per topik wajib | `wawancara/sesi2_gali.md` | setelah target dan topik wajib disepakati |
| Sesi 3: skill dan tool | `wawancara/sesi3_skill.md` | semua topik wajib sudah `terisi` atau `gap` |
| Sesi 4: bahasa dan batasan | `wawancara/sesi4_batasan.md` | setelah Sesi 3 |
| Sesi 5: tutup | `wawancara/sesi5_tutup.md` | setelah Sesi 4 |

**Penanda progres.** Setiap selesai satu sesi atau satu topik wajib, timpa baris ini di
`status.md` (satu baris, bukan menambah baris):

```
- [YYYY-MM-DD] Wawancara: Sesi <n>, topik <x> dari <total> → baca --settings/onboarding/wawancara/<file>.md
```

Nova yang membuka obrolan baru membaca baris ini lalu langsung membuka file yang disebut.
**Baris "Wawancara:" tidak ada?** Kalau `job_profile.md` sudah punya bagian "Topik wajib", target sudah
disepakati: lanjut dari topik yang belum `terisi`/`gap` (buka `wawancara/sesi2_gali.md`). Kalau belum ada
sama sekali, mulai dari `wawancara/sesi1_target.md`. Jangan mengulang sesi yang sudah punya hasil.

Wawancara selesai kalau Sesi 5 selesai; baris itu lalu diganti oleh baris "Onboarding selesai".
