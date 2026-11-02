"""Validasi struktur dasar identity.json dan applications.json.

Bukan JSON Schema formal (gak nambah dependency pip) — cukup cek key wajib ada
dan tipenya benar, supaya kesalahan struktur ketauan dengan pesan jelas di titik
input, bukan nyusul jadi TypeError/KeyError samar di tengah builder/tracker.
"""


def validate_identity(data, path="identity.json"):
    """Return list kosong kalau valid, atau list pesan error kalau tidak."""
    errors = []
    if not isinstance(data, dict):
        return [f"{path}: harus berupa objek JSON ({{...}}), bukan {type(data).__name__}."]

    for key in ("name", "surname"):
        if key not in data:
            errors.append(f"{path}: field \"{key}\" tidak ada.")
        elif not isinstance(data[key], str):
            errors.append(f"{path}: field \"{key}\" harus teks, ketemu {type(data[key]).__name__}.")

    for key in ("contact_lines_cv", "contact_lines_cl"):
        if key not in data:
            errors.append(f"{path}: field \"{key}\" tidak ada.")
        elif not isinstance(data[key], list) or not all(isinstance(x, str) for x in data[key]):
            errors.append(f"{path}: field \"{key}\" harus list berisi teks.")

    return errors


def validate_applications(data, path="applications.json"):
    """Return list kosong kalau valid, atau list pesan error kalau tidak."""
    errors = []
    if not isinstance(data, dict):
        return [f"{path}: harus berupa objek JSON ({{...}}), bukan {type(data).__name__}."]

    if "applications" not in data:
        errors.append(f"{path}: field \"applications\" tidak ada.")
        return errors

    entries = data["applications"]
    if not isinstance(entries, list):
        errors.append(f"{path}: field \"applications\" harus list, ketemu {type(entries).__name__}.")
        return errors

    required = ("id", "perusahaan", "posisi", "status", "folder")
    seen_ids = set()
    for i, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append(f"{path}: applications[{i}] harus objek, ketemu {type(entry).__name__}.")
            continue
        for key in required:
            if key not in entry:
                errors.append(f"{path}: applications[{i}] (id={entry.get('id', '?')}) kurang field \"{key}\".")
        eid = entry.get("id")
        if eid is not None:
            if eid in seen_ids:
                errors.append(f"{path}: id \"{eid}\" dipakai lebih dari sekali — harus unik.")
            seen_ids.add(eid)

    return errors


def exit_if_invalid(errors, sys_module):
    """Helper: kalau ada error, cetak semua lalu exit(1). Kalau tidak, no-op."""
    if not errors:
        return
    msg = "! Struktur JSON tidak valid:\n" + "\n".join(f"  - {e}" for e in errors)
    sys_module.exit(msg)


# --- Laporan Pagi v2 (sop/laporan_pagi.md, templates/laporan_pagi/content.json) ---

_ISO = r"^\d{4}-\d{2}-\d{2}$"
_REPORT_REQUIRED = ("tanggal", "run", "status", "bahasa", "ambang_skor", "ambang_hampir", "target_jumlah",
                    "jumlah_dianalisis", "fokus", "pencarian", "perlu_aksi", "rekomendasi", "hampir_masuk",
                    "dilewati", "pola_gap", "catatan_pasar")
_REC_REQUIRED = ("perusahaan", "posisi", "jenis", "kota", "perjalanan", "diposting", "deadline", "skor", "komponen",
                 "cocok", "gap", "riwayat", "usaha", "link", "aksi", "aksi_alasan")
KOMPONEN_DEFAULT = {"tugas": 40, "skill": 25, "bahasa": 15, "kontrak": 10, "nilai_tambah": 10}
_KOMPONEN_MAX = KOMPONEN_DEFAULT  # untuk pemanggil lama


def _bobot_ok(w):
    return (isinstance(w, dict) and set(w) == set(KOMPONEN_DEFAULT)
            and all(isinstance(v, int) and not isinstance(v, bool) and v >= 0 for v in w.values())
            and sum(w.values()) == 100)


def komponen_max(data=None):
    """Batas poin tiap komponen skor (jumlahnya 100). Laporan atau analisis boleh membawa `bobot_skor` sendiri, disalin
    dari search_settings.json saat ditulis, jadi yang lama tetap terbaca dengan bobotnya. Dipakai hanya kalau tepat lima
    komponen, angka bulat >= 0, jumlah 100; kalau tidak, tabel bawaan (40/25/15/10/10) yang berlaku."""
    w = data.get("bobot_skor") if isinstance(data, dict) else None
    return dict(w) if _bobot_ok(w) else dict(KOMPONEN_DEFAULT)
_JENIS_KONTRAK = ("Werkstudent", "Praktikum", "Teilzeit", "Vollzeit", "Minijob")
_JENIS_AKSI = ("follow_up", "deadline", "interview", "mulai_kerja", "dokumen", "belum_dijawab")
_MAXLEN = {"fokus": 120, "cocok": 140, "gap": 120, "aksi_alasan": 120, "perjalanan": 40, "riwayat": 60}


def validate_report(data, path="Laporan_Pagi.json"):
    """Struktur Laporan Pagi v2. Return list kosong kalau valid, atau list pesan error."""
    import re
    if not isinstance(data, dict):
        return [f"{path}: harus berupa objek JSON."]
    if data.get("_versi") != 2:
        return [f"{path}: bukan format v2 (\"_versi\": 2). Salin ulang templates/laporan_pagi/content.json."]
    if "bobot_skor" in data and not _bobot_ok(data["bobot_skor"]):
        return [f"{path}: bobot_skor harus tepat lima komponen ({', '.join(KOMPONEN_DEFAULT)}), angka bulat >= 0, jumlah 100."]
    if data.get("dikonversi_dari_lama") is True:
        return validate_legacy_report(data, path)
    errors = [f"{path}: field \"{k}\" tidak ada." for k in _REPORT_REQUIRED if k not in data]
    if errors:
        return errors
    if not re.match(_ISO, str(data["tanggal"])):
        errors.append(f"{path}: tanggal harus YYYY-MM-DD.")
    if data["status"] not in ("lengkap", "terpotong"):
        errors.append(f"{path}: status harus 'lengkap' atau 'terpotong'.")
    if len(str(data["fokus"])) > _MAXLEN["fokus"] or not str(data["fokus"]).strip():
        errors.append(f"{path}: fokus wajib diisi, maks {_MAXLEN['fokus']} karakter.")
    c = data["pencarian"]
    for k in ("oleh", "sumber", "kata_kunci", "lokasi", "filter", "gagal", "corong"):
        if k not in c:
            errors.append(f"{path}: pencarian.{k} tidak ada.")
    for k in ("ditemukan", "lolos_saring", "link_resmi_ok", "dianalisis_penuh", "direkomendasikan"):
        if not isinstance(c.get("corong", {}).get(k), int):
            errors.append(f"{path}: pencarian.corong.{k} harus angka.")
    for i, a in enumerate(data["perlu_aksi"], 1):
        for k in ("tanggal", "jenis", "lamaran", "aksi"):
            if not a.get(k):
                errors.append(f"{path}: perlu_aksi #{i} kurang '{k}'.")
        if a.get("jenis") and a["jenis"] not in _JENIS_AKSI:
            errors.append(f"{path}: perlu_aksi #{i} jenis '{a['jenis']}' tidak dikenal.")
        if a.get("tanggal") and not re.match(_ISO, str(a["tanggal"])):
            errors.append(f"{path}: perlu_aksi #{i} tanggal harus YYYY-MM-DD.")
    recs = data["rekomendasi"]
    tj = data["target_jumlah"]
    if not isinstance(tj, int) or not 1 <= tj <= 50:
        errors.append(f"{path}: target_jumlah harus angka 1-50 (maks_rekomendasi di search_settings.json).")
        return errors
    if not isinstance(recs, list) or len(recs) > tj:
        errors.append(f"{path}: rekomendasi harus list, maksimal target_jumlah ({tj}).")
        return errors
    for i, r in enumerate(recs, 1):
        tag = f"{path}: rekomendasi #{i}"
        miss = [k for k in _REC_REQUIRED if k not in r]
        if miss:
            errors.append(f"{tag} kurang field {', '.join(miss)}.")
            continue
        if r["jenis"] not in _JENIS_KONTRAK:
            errors.append(f"{tag} jenis '{r['jenis']}' bukan salah satu {', '.join(_JENIS_KONTRAK)}.")
        if r["aksi"] not in ("Lamar", "Analisis", "Lewati"):
            errors.append(f"{tag} aksi harus Lamar, Analisis, atau Lewati.")
        if not isinstance(r["skor"], int) or not 0 <= r["skor"] <= 100:
            errors.append(f"{tag} skor harus angka bulat 0-100.")
        for k, mx in komponen_max(data).items():
            v = r["komponen"].get(k)
            if not isinstance(v, int) or not 0 <= v <= mx:
                errors.append(f"{tag} komponen.{k} harus angka 0-{mx}.")
        if not re.match(_ISO, str(r["diposting"])):
            errors.append(f"{tag} diposting harus YYYY-MM-DD.")
        if r["deadline"] and not re.match(_ISO, str(r["deadline"])):
            errors.append(f"{tag} deadline harus YYYY-MM-DD atau kosong.")
        for k, mx in _MAXLEN.items():
            if k in r and len(str(r[k])) > mx:
                errors.append(f"{tag} {k} lebih dari {mx} karakter.")
        if not str(r["aksi_alasan"]).strip():
            errors.append(f"{tag} aksi_alasan wajib diisi.")
        u = r["usaha"]
        if not isinstance(u, dict) or not isinstance(u.get("dokumen"), list) or not isinstance(u.get("menit"), int):
            errors.append(f"{tag} usaha harus {{\"dokumen\": [...], \"menit\": angka}}.")
    for i, n in enumerate(data["hampir_masuk"], 1):
        for k in ("skor", "perusahaan", "posisi", "alasan", "link"):
            if k not in n:
                errors.append(f"{path}: hampir_masuk #{i} kurang '{k}'.")
    for k in ("link_tidak_ketemu", "sudah_di_tracker", "sudah_dilaporkan", "skor_rendah", "lainnya"):
        if not isinstance(data["dilewati"].get(k), int):
            errors.append(f"{path}: dilewati.{k} harus angka.")
    if not isinstance(data["pola_gap"], list) or len(data["pola_gap"]) > 3:
        errors.append(f"{path}: pola_gap maksimal 3.")
    if not isinstance(data["catatan_pasar"], list) or len(data["catatan_pasar"]) > 3:
        errors.append(f"{path}: catatan_pasar maksimal 3 baris.")
    return errors


# --- Laporan lama yang dikonversi ke v2 ("dikonversi_dari_lama": true) ---
# Isinya HANYA yang tertulis di laporan lama. Yang tidak dicatat: null / "" / "-" (tampil sebagai "-").
# Tidak ada vonis baru: aksi selalu "-". Skor kata (Tinggi/Sedang) disimpan di skor_label, skor = null.

_LEGACY_REQUIRED = ("tanggal", "run", "status", "bahasa", "fokus", "catatan_konversi", "asal", "pencarian",
                    "perlu_aksi", "rekomendasi", "hampir_masuk", "catatan_asli")


def _skor_ok(x):
    """Skor angka 0-100, atau null dengan skor_label teks."""
    if x.get("skor") is None:
        return bool(str(x.get("skor_label") or "").strip())
    return isinstance(x["skor"], int) and 0 <= x["skor"] <= 100


def validate_legacy_report(data, path="Laporan_Pagi.json"):
    import re
    errors = [f"{path}: field \"{k}\" tidak ada (laporan konversi)." for k in _LEGACY_REQUIRED if k not in data]
    if errors:
        return errors
    if not re.match(_ISO, str(data["tanggal"])):
        errors.append(f"{path}: tanggal harus YYYY-MM-DD.")
    if data["status"] not in ("lengkap", "terpotong"):
        errors.append(f"{path}: status harus 'lengkap' atau 'terpotong'.")
    if not str(data["fokus"]).strip() or len(str(data["fokus"])) > _MAXLEN["fokus"]:
        errors.append(f"{path}: fokus wajib diisi, maks {_MAXLEN['fokus']} karakter.")
    if not str(data["catatan_konversi"]).strip():
        errors.append(f"{path}: catatan_konversi wajib diisi.")
    if not isinstance(data["asal"], dict) or not data["asal"].get("readme"):
        errors.append(f"{path}: asal.readme (laporan asli) wajib diisi.")
    c = data["pencarian"]
    for k in ("sumber", "kata_kunci", "lokasi", "filter", "gagal"):
        if not isinstance(c.get(k), list):
            errors.append(f"{path}: pencarian.{k} harus list (kosong = tidak dicatat).")
    for k, v in (c.get("corong") or {}).items():
        if v is not None and not isinstance(v, int):
            errors.append(f"{path}: pencarian.corong.{k} harus angka atau null.")
    for i, a in enumerate(data["perlu_aksi"], 1):
        for k in ("tanggal", "jenis", "lamaran", "aksi"):
            if not a.get(k):
                errors.append(f"{path}: perlu_aksi #{i} kurang '{k}'.")
        if a.get("jenis") and a["jenis"] not in _JENIS_AKSI:
            errors.append(f"{path}: perlu_aksi #{i} jenis '{a['jenis']}' tidak dikenal.")
        if a.get("tanggal") and not re.match(_ISO, str(a["tanggal"])):
            errors.append(f"{path}: perlu_aksi #{i} tanggal harus YYYY-MM-DD.")
        if not isinstance(a.get("lewat"), bool):
            errors.append(f"{path}: perlu_aksi #{i} wajib punya 'lewat' (true kalau tanggalnya sudah lewat).")
    recs = data["rekomendasi"]
    if not isinstance(recs, list) or len(recs) > 10:
        return errors + [f"{path}: rekomendasi harus list, maksimal 10."]
    for i, r in enumerate(recs, 1):
        tag = f"{path}: rekomendasi #{i}"
        miss = [k for k in ("perusahaan", "posisi", "jenis", "kota", "skor", "link", "aksi", "diposting") if k not in r]
        if miss:
            errors.append(f"{tag} kurang field {', '.join(miss)}.")
            continue
        if r["jenis"] not in _JENIS_KONTRAK:
            errors.append(f"{tag} jenis '{r['jenis']}' bukan salah satu {', '.join(_JENIS_KONTRAK)}.")
        if r["aksi"] != "-":
            errors.append(f"{tag} laporan konversi tidak boleh punya vonis; aksi harus \"-\".")
        if not _skor_ok(r):
            errors.append(f"{tag} skor harus angka 0-100, atau null dengan skor_label.")
        if r.get("komponen") is not None:
            for k, mx in komponen_max(data).items():
                v = r["komponen"].get(k)
                if not isinstance(v, int) or not 0 <= v <= mx:
                    errors.append(f"{tag} komponen.{k} harus angka 0-{mx}.")
        if r["diposting"] and not re.match(_ISO, str(r["diposting"])):
            errors.append(f"{tag} diposting harus YYYY-MM-DD atau kosong.")
        if r.get("deadline") and not re.match(_ISO, str(r["deadline"])):
            errors.append(f"{tag} deadline harus YYYY-MM-DD atau kosong.")
        if not str(r["link"]).startswith("https://"):
            errors.append(f"{tag} link harus https.")
        for k, mx in _MAXLEN.items():
            if k in r and len(str(r[k] or "")) > mx:
                errors.append(f"{tag} {k} lebih dari {mx} karakter.")
    for i, n in enumerate(data["hampir_masuk"], 1):
        for k in ("perusahaan", "posisi"):
            if not n.get(k):
                errors.append(f"{path}: hampir_masuk #{i} kurang '{k}'.")
        if not _skor_ok(n):
            errors.append(f"{path}: hampir_masuk #{i} skor harus angka, atau null dengan skor_label.")
    if not isinstance(data["catatan_asli"], list):
        errors.append(f"{path}: catatan_asli harus list.")
    return errors
