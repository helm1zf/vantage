#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Verifikasi konsistensi instalasi Vantage — TIDAK mengubah apa pun, cuma melaporkan.

Mencakup titik-titik yang paling rawan gak sinkron: --settings/ milik user vs
_TEMPLATE/, field "folder" di applications.json vs lokasi fisik folder, isi
UPDATE.md vs berkas sumbernya, penanda versi, prefix bulan aktif di 02_Sent/, dan
panjang path (batas aman Windows, lihat --settings/sop/penamaan_file.md).

Cara pakai: `python3 ./--settings/scripts/verify_consistency.py` dari root folder pengguna
(sejajar --settings/, 01_user_documents/, 02_workflow/) — atau dari _TEMPLATE/ buat
cek _TEMPLATE/ itu sendiri. Jalankan abis migrasi folder apa pun, abis UPDATE.md
dijalankan, atau kapan pun curiga ada yang gak sinkron. Exit code 0 = semua aman,
1 = ada yang perlu dicek.

Tiap run ditambahkan ke `01_user_documents/--usersettings/activity.log` (append-only,
kalau folder itu ada) — jejak audit yang independen dari transcript chat, isinya
timestamp + ringkasan + baris yang bermasalah kalau ada.
"""

import os
import sys
import re
import json
import filecmp
import datetime
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))          # .../--settings
SETTINGS = os.path.dirname(HERE)                            # .../--settings
ROOT = os.path.dirname(SETTINGS)                            # folder pengguna (atau _TEMPLATE/)

# Pasang ulang flag "hidden" (bisa hilang kalau file ditulis ulang). Tidak mengubah path.
if os.path.isfile(os.path.join(HERE, "hide_internal.py")) and os.path.basename(ROOT) != "_TEMPLATE":
    subprocess.run([sys.executable, os.path.join(HERE, "hide_internal.py")], capture_output=True)
PACKAGE_ROOT = os.path.dirname(ROOT)                         # sejajar _TEMPLATE/

problems = []
oks = []
warnings = []

# Batas aman path (lihat --settings/sop/penamaan_file.md). Windows lama memutus di 260 karakter
# total; folder Vantage sendiri biasanya sudah makan ~80-100 karakter, jadi sisa untuk path
# di dalam folder user dijaga maksimal 150.
PATH_BUDGET = 150
WINDOWS_BAD_CHARS = set('<>:"|?*')


def report(ok, msg):
    (oks if ok else problems).append(msg)


# --- Cek 1: --settings/ milik user vs _TEMPLATE/--settings/ ---
# Berkas yang MEMANG sengaja tidak ikut dicopy ke folder personal user (lihat onboarding/first_run.md).
NEVER_COPIED_TO_USER = {"UPDATE.md", "system_manifest.json", "generate_update.py"}
# Penanda personalisasi yang diketahui aman (baris ini ADA di file = perbedaan itu disengaja,
# bukan drift) — kalau ada personalisasi baru di masa depan, tambah entrinya di sini.
# Format: {"path relatif di --settings": "teks penanda"}. Kosong = tidak ada personalisasi.
# Personalisasi aturan sebaiknya ditulis di CLAUDE.md user, bukan di file sistem.
KNOWN_PERSONALIZATION_MARKERS = {}

template_master = os.path.join(PACKAGE_ROOT, "_TEMPLATE", "--settings")
if os.path.isdir(template_master) and os.path.abspath(template_master) != os.path.abspath(SETTINGS):
    _rels = []
    for _dp, _dns, _fns in os.walk(template_master):
        _dns[:] = [d for d in _dns if d != "__pycache__"]
        for _fn in _fns:
            if _fn != ".DS_Store":
                _rels.append(os.path.relpath(os.path.join(_dp, _fn), template_master))
    for fname in sorted(_rels):
        src = os.path.join(template_master, fname)
        if os.path.basename(fname) in NEVER_COPIED_TO_USER or fname.startswith("docs" + os.sep):
            continue  # alat & dokumen pengembang, sengaja tidak ada di folder user
        dst = os.path.join(SETTINGS, fname)
        if not os.path.exists(dst):
            report(False, f"[--settings] '{fname}' ada di _TEMPLATE/ tapi TIDAK ADA di sini — "
                           f"kemungkinan berkas baru yang belum pernah di-sync.")
            continue
        if not filecmp.cmp(src, dst, shallow=False):
            marker = KNOWN_PERSONALIZATION_MARKERS.get(fname)
            if marker and marker in open(dst, encoding="utf-8", errors="ignore").read():
                report(True, f"[--settings] '{fname}' beda dari _TEMPLATE/, tapi ini "
                              f"personalisasi yang sudah diketahui/didokumentasikan "
                              f"(penanda '{marker}' ditemukan) — bukan drift.")
            else:
                report(False, f"[--settings] '{fname}' BEDA dari _TEMPLATE/ — cek apakah ini "
                               f"personalisasi yang disengaja (biasanya ada komentar "
                               f"penjelasnya di dalam file) atau drift yang belum di-sync.")
        else:
            report(True, f"[--settings] '{fname}' sinkron dengan _TEMPLATE/")
else:
    report(True, "[--settings] Tidak ada _TEMPLATE/ di sebelah (mungkin ini _TEMPLATE/ itu "
                 "sendiri, atau instalasi berdiri sendiri) — cek dilewati.")

# --- Cek 2: field "folder" di applications.json vs keberadaan fisik ---
apps_path = os.path.join(ROOT, "01_user_documents", "--usersettings", "applications.json")
if os.path.isfile(apps_path):
    try:
        data = json.load(open(apps_path, encoding="utf-8"))
    except Exception as e:
        report(False, f"[applications.json] GAGAL dibaca sebagai JSON: {e}")
        data = None
    if data is not None:
        entries = data.get("applications", data) if isinstance(data, dict) else data
        for e in entries:
            folder = e.get("folder")
            eid = e.get("id")
            if not folder:
                report(False, f"[applications.json] entri id={eid} tidak punya field 'folder'.")
                continue
            full = os.path.join(ROOT, "02_workflow", folder)
            if os.path.isdir(full):
                report(True, f"[applications.json] id={eid} folder OK: {folder}")
            else:
                report(False, f"[applications.json] id={eid} folder='{folder}' TIDAK KETEMU "
                               f"di disk (02_workflow/{folder}) — kemungkinan folder sudah "
                               f"dipindah/di-rename tapi JSON belum diupdate.")
else:
    report(True, "[applications.json] Tidak ditemukan (instalasi baru, belum ada data) — "
                 "cek dilewati.")

# --- Cek 3: system_manifest.json cocok dengan berkas sumbernya ---
manifest_path = os.path.join(ROOT, "system_manifest.json")
if os.path.isfile(manifest_path) and os.path.isfile(os.path.join(HERE, "generate_update.py")):
    import hashlib
    def _sha(p):
        b = open(p, "rb").read()
        if p.endswith((".md", ".py", ".json", ".html", ".txt", ".js", ".css", ".gitignore")):
            b = b.replace(b"\r\n", b"\n")
        return hashlib.sha256(b).hexdigest()
    man = json.load(open(manifest_path, encoding="utf-8"))
    bad = [rel for rel, h in man["files"].items() if not os.path.isfile(os.path.join(ROOT, rel)) or _sha(os.path.join(ROOT, rel)) != h]
    report(not bad, "[manifest] semua " + str(len(man["files"])) + " berkas sistem cocok dengan system_manifest.json" if not bad
           else "[manifest] TIDAK COCOK: " + ", ".join(bad[:4]) + " — jalankan ulang generate_update.py.")
    gone = [rel for rel in man.get("obsolete", []) if os.path.exists(os.path.join(ROOT, rel))]
    report(not gone, "[manifest] tidak ada berkas usang di kit" if not gone else "[manifest] berkas usang masih ada: " + ", ".join(gone))
else:
    report(True, "[manifest] Tidak relevan di instalasi ini (bukan _TEMPLATE/) — cek dilewati.")

# --- Cek 4: penanda versi ---
version_path = os.path.join(ROOT, "01_user_documents", "--usersettings", ".vantage_version")
if os.path.isfile(version_path):
    v = open(version_path, encoding="utf-8").read().strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", v):
        report(True, f"[.vantage_version] OK, isinya '{v}'.")
    else:
        report(False, f"[.vantage_version] Isinya '{v}' — bukan format YYYY-MM-DD yang valid.")
else:
    report(True, "[.vantage_version] Tidak ada (instalasi baru, atau update belum "
                 "pernah dijalankan) — bukan error fatal, cuma bikin UPDATE.md nanti "
                 "anggap instalasi ini paling lama.")

# --- Cek 5: prefix 00_ di 02_Sent/ cuma ada SATU per Jenis/Tahun, dan itu bulan sekarang ---
sent_root = os.path.join(ROOT, "02_workflow", "02_Sent")
if os.path.isdir(sent_root):
    today = datetime.date.today()
    expected_prefix = f"00_currentMonth_{today.month:02d}"
    for jenis in sorted(os.listdir(sent_root)):
        jenis_path = os.path.join(sent_root, jenis)
        if not os.path.isdir(jenis_path):
            continue
        for tahun in sorted(os.listdir(jenis_path)):
            tahun_path = os.path.join(jenis_path, tahun)
            if not os.path.isdir(tahun_path):
                continue
            prefixed = [b for b in os.listdir(tahun_path) if b.startswith("00_")]
            if len(prefixed) > 1:
                report(False, f"[02_Sent] {jenis}/{tahun}/ punya LEBIH DARI SATU folder "
                               f"ber-prefix 00_: {prefixed} — seharusnya cuma satu (bulan "
                               f"yang sedang berjalan).")
            elif len(prefixed) == 1 and tahun == str(today.year) and not prefixed[0].startswith(expected_prefix):
                report(False, f"[02_Sent] {jenis}/{tahun}/{prefixed[0]} ber-prefix 00_ tapi "
                               f"bukan bulan sekarang ({today.month:02d}) — kemungkinan lupa "
                               f"'diturunin' pas bulan berganti.")
            elif len(prefixed) == 1:
                report(True, f"[02_Sent] {jenis}/{tahun}/{prefixed[0]} — prefix 00_ benar.")
else:
    report(True, "[02_Sent] Folder tidak ada (instalasi baru) — cek dilewati.")

# --- Cek 7: aturan baca/tulis tiap agent ada di kartunya, tidak dobel di tabel_arah ---
agents_dir = os.path.join(SETTINGS, "agents")
if os.path.isdir(agents_dir):
    for fn in sorted(os.listdir(agents_dir)):
        if not fn.endswith(".md") or fn == "readme.md":
            continue
        txt = open(os.path.join(agents_dir, fn), encoding="utf-8").read()
        if "## Boleh baca / tulis" in txt and "**Baca:**" in txt and "**Tulis:**" in txt:
            report(True, f"[agents] {fn}: bagian 'Boleh baca / tulis' ada")
        else:
            report(False, f"[agents] {fn}: bagian 'Boleh baca / tulis' (Baca/Tulis) tidak ada")
    tabel = os.path.join(SETTINGS, "sop", "tabel_arah.md")
    if os.path.isfile(tabel) and "| Boleh BACA |" in open(tabel, encoding="utf-8").read():
        report(False, "[agents] tabel_arah.md masih memuat matriks baca/tulis; aturan itu "
                      "seharusnya cuma di kartu agent (supaya tidak dobel)")

# --- Cek 8: indeks per fase (fase/*.md) hanya menunjuk file yang masih ada ---
fase_dir = os.path.join(SETTINGS, "fase")
if os.path.isdir(fase_dir):
    for fn in sorted(os.listdir(fase_dir)):
        if not fn.endswith(".md"):
            continue
        txt = open(os.path.join(fase_dir, fn), encoding="utf-8").read()
        refs = set(re.findall(r"`((?:sop|onboarding|agents|templates|scripts)/[^`\s*]+)`", txt))
        missing = sorted(r for r in refs if not os.path.exists(os.path.join(SETTINGS, r)))
        if missing:
            report(False, f"[fase] {fn}: rujukan patah: {', '.join(missing)}")
        else:
            report(True, f"[fase] {fn}: {len(refs)} rujukan semua ada")

# --- Cek 9: Morning Report (Laporan Pagi v2) terpasang dan pemicunya ada ---
_lp = os.path.join(SETTINGS, "sop", "laporan_pagi.md")
_ta = os.path.join(SETTINGS, "sop", "tabel_arah.md")
_nv = os.path.join(SETTINGS, "agents", "nova.md")
_cl = os.path.join(ROOT, "CLAUDE.md")
for _ok, _msg in [
    (os.path.isfile(os.path.join(SETTINGS, "scripts", "check_report.py")), "scripts/check_report.py ada"),
    (os.path.isfile(_lp) and "(v2)" in open(_lp, encoding="utf-8").read(), "sop/laporan_pagi.md versi v2"),
    (os.path.isfile(_ta) and "## 1b. Morning Report" in open(_ta, encoding="utf-8").read(), "tabel_arah.md punya bagian 1b (pemicu Morning Report)"),
    (os.path.isfile(_nv) and "Morning Report" in open(_nv, encoding="utf-8").read(), "agents/nova.md menunjuk pemicu Morning Report"),
    (os.path.isfile(_cl) and "Morning Report" in open(_cl, encoding="utf-8").read(), "CLAUDE.md menunjuk pemicu Morning Report"),
]:
    report(_ok, f"[laporan pagi] {_msg}" if _ok else f"[laporan pagi] TIDAK: {_msg}")

# --- Cek 10: tiap dokumen baca punya SOP, templat, contoh isi valid, dan pembangun yang jalan ---
sys.path.insert(0, HERE)
try:
    import lib_doc as _ld
    for _tipe, _probs in _ld.selfcheck(SETTINGS):
        report(not _probs, f"[dokumen] {_tipe}: " + ("SOP, layout, contoh isi, dan pembangun cocok" if not _probs else "; ".join(_probs)))
    _mc = os.path.join(SETTINGS, "templates", "master_cv", "contoh_terisi.json")
    if os.path.isfile(_mc):
        import build_master_cv as _bm
        with open(_mc, encoding="utf-8") as _fh:
            _c = json.load(_fh)
        _p = _bm.check(_c) or [("layout punya penanda kosong: " + ", ".join(_ld.leftover(_bm.render_html(_c))))] * bool(_ld.leftover(_bm.render_html(_c)))
        report(not _p, "[dokumen] master_cv: contoh terisi lolos cek dan layout terisi penuh" if not _p else "[dokumen] master_cv: " + "; ".join(_p))
    else:
        report(False, "[dokumen] master_cv: templates/master_cv/contoh_terisi.json tidak ada")
except Exception as _exc:  # noqa: BLE001
    report(False, f"[dokumen] pemeriksaan templat gagal: {type(_exc).__name__}: {_exc}")

# --- Cek 6: panjang path + karakter terlarang Windows (PERINGATAN, tidak bikin gagal) ---
if os.path.basename(ROOT) != "_TEMPLATE":
    too_long, bad_chars = [], []
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in ("__pycache__", ".git")]
        for name in dns + fns:
            rel = os.path.relpath(os.path.join(dp, name), ROOT)
            if len(rel) > PATH_BUDGET:
                too_long.append(rel)
            if WINDOWS_BAD_CHARS & set(name):
                bad_chars.append(rel)
    if too_long:
        warnings.append(f"[path] {len(too_long)} path lebih dari {PATH_BUDGET} karakter (rawan "
                        f"'path too long' di Windows). Terpanjang: {max(too_long, key=len)}")
    if bad_chars:
        warnings.append(f"[path] {len(bad_chars)} nama berisi karakter yang dilarang Windows "
                        f"(< > : \" | ? *), mis. {bad_chars[0]}")
    if not too_long and not bad_chars:
        report(True, f"[path] semua path <= {PATH_BUDGET} karakter dan aman untuk Windows")

# --- Laporan akhir ---
summary = (f"=== HASIL VERIFIKASI ({len(oks)} OK, {len(problems)} bermasalah, "
           f"{len(warnings)} peringatan) ===")
print(f"\n{summary}\n")
if warnings:
    print("PERINGATAN (tidak bikin gagal, tapi sebaiknya dirapikan — sop/penamaan_file.md):")
    for w in warnings:
        print(f"  ! {w}")
    print()
if problems:
    print("BERMASALAH:")
    for p in problems:
        print(f"  x {p}")
    print()
if oks:
    print("OK:")
    for o in oks:
        print(f"  v {o}")

# --- Log ke activity.log (jejak audit persisten, terpisah dari transcript chat) ---
log_dir = os.path.join(ROOT, "01_user_documents", "--usersettings")
if os.path.isdir(log_dir) and os.path.basename(ROOT) != "_TEMPLATE":  # template tetap bersih
    log_path = os.path.join(log_dir, "activity.log")
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{ts}] verify_consistency.py — {len(oks)} OK, {len(problems)} bermasalah\n")
            for p in problems:
                f.write(f"    x {p}\n")
    except OSError:
        pass  # logging gak boleh bikin verifikasi sendiri gagal

sys.exit(1 if problems else 0)
