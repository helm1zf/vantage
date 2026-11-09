#!/usr/bin/env python3
"""Rapikan 01_user_documents/materials/: ratakan kedalaman dan bersihkan nama file.

Aturan (sop/penamaan_file.md):
  - Kedalaman maksimal: materials/<ID_folder>/<satu subfolder opsional>/<file>.
    Semua yang lebih dalam dipindah naik ke subfolder tingkat-1 tempat dia berada.
  - Nama file/folder: buang karakter yang dilarang Windows (< > : " / \\ | ? *), umlaut
    diganti (ä→ae), spasi jadi tanda hubung, panjang nama dipotong supaya path dari
    folder user tetap <= 150 karakter.
  - Nama bentrok setelah dipindah → tambah _2, _3, ...
  - Setiap perubahan dicatat (path lama → path baru) di materials/00_index.md bagian
    "Log ganti nama", jadi nama asli tidak hilang.
  - Path lama yang disebut di 01_user_documents/raw_facts_about_you.md otomatis diganti
    ke path baru (cuma teks path-nya; isi fakta tidak disentuh).

Cara pakai (dari folder user):
    python3 ./--settings/scripts/tidy_materials.py            # cuma tampilkan rencana
    python3 ./--settings/scripts/tidy_materials.py --apply    # jalankan

Isi file tidak pernah diubah; cuma lokasi dan namanya.
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import datetime
import os
import re
import shutil
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
MATERIALS = os.path.join(ROOT, "01_user_documents", "materials")
INDEX = os.path.join(MATERIALS, "00_index.md")
RAW_FACTS = os.path.join(ROOT, "01_user_documents", "raw_facts_about_you.md")
PATH_BUDGET = 150
SKIP = {".DS_Store", "Thumbs.db", "desktop.ini"}


def clean(name, is_dir=False):
    stem, ext = (name, "") if is_dir else os.path.splitext(name)
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("Ä", "Ae"), ("Ö", "Oe"), ("Ü", "Ue"), ("ß", "ss")):
        stem = stem.replace(a, b)
    stem = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode()
    stem = re.sub(r'[<>:"/\\|?*\x00-\x1f]', " ", stem)
    stem = re.sub(r"[\s]+", "-", stem.strip()).strip(".-_ ") or "file"
    stem = re.sub(r"-{2,}", "-", stem)
    return stem, ext.lower()


def fit(dir_rel, stem, ext):
    """Potong stem supaya path relatif dari folder user tidak lewat anggaran."""
    room = PATH_BUDGET - len(dir_rel) - 1 - len(ext) - 3  # sisakan ruang untuk akhiran _2, _3
    return stem[:max(12, room)].rstrip("-_.") + ext


def unique(directory, name, taken):
    stem, ext = os.path.splitext(name)
    cand, n = name, 2
    while cand.lower() in taken or os.path.exists(os.path.join(directory, cand)):
        cand = f"{stem}_{n}{ext}"
        n += 1
    taken.add(cand.lower())
    return cand


def plan():
    moves = []
    if not os.path.isdir(MATERIALS):
        return moves
    for id_dir in sorted(os.listdir(MATERIALS)):
        id_path = os.path.join(MATERIALS, id_dir)
        if not os.path.isdir(id_path):
            continue
        for dp, dns, fns in os.walk(id_path):
            rel = os.path.relpath(dp, id_path)
            depth = 0 if rel == "." else rel.count(os.sep) + 1
            for fn in fns:
                if fn in SKIP:
                    continue
                if depth <= 1:
                    target_dir = dp
                else:
                    level1 = rel.split(os.sep)[0]
                    target_dir = os.path.join(id_path, level1)
                moves.append((os.path.join(dp, fn), target_dir))
    return moves


def main():
    apply = "--apply" in sys.argv
    moves = plan()
    taken_by_dir = {}
    log = []
    # Ganti nama folder tingkat-1 dulu kalau namanya kotor.
    renamed_dirs = {}
    if os.path.isdir(MATERIALS):
        for id_dir in sorted(os.listdir(MATERIALS)):
            id_path = os.path.join(MATERIALS, id_dir)
            if not os.path.isdir(id_path):
                continue
            for sub in sorted(os.listdir(id_path)):
                sp = os.path.join(id_path, sub)
                if os.path.isdir(sp):
                    stem, _ = clean(sub, is_dir=True)
                    new = stem[:30]
                    if new != sub:
                        renamed_dirs[sp] = os.path.join(id_path, new)
    for src, target_dir in moves:
        final_dir = renamed_dirs.get(target_dir, target_dir)
        rel_dir = os.path.relpath(final_dir, ROOT)
        base = os.path.basename(src)
        stem, ext = clean(base)
        if (os.path.dirname(src) == final_dir and stem + ext == base
                and len(os.path.relpath(src, ROOT)) <= PATH_BUDGET):
            taken_by_dir.setdefault(final_dir, set()).add(base.lower())
            continue  # sudah bersih dan muat: jangan disentuh (idempoten)
        name = fit(rel_dir, stem, ext)
        taken = taken_by_dir.setdefault(final_dir, set())
        if os.path.dirname(src) == final_dir and name == os.path.basename(src):
            taken.add(name.lower())
            continue
        name = unique(final_dir if apply else "/nonexistent", name, taken)
        dst = os.path.join(final_dir, name)
        log.append((os.path.relpath(src, MATERIALS), os.path.relpath(dst, MATERIALS)))

    if not log:
        print("OK: materials/ sudah rapi (kedalaman dan nama aman).")
        return
    for a, b in log:
        print(f"{a}\n   -> {b}")
    print(f"\n{len(log)} file akan dipindah/diganti nama.")
    if not apply:
        print("Belum ada yang diubah. Jalankan lagi dengan --apply untuk mengerjakan.")
        return

    for old, new in renamed_dirs.items():
        if os.path.isdir(old) and not os.path.exists(new):
            os.rename(old, new)
    for a, b in log:
        src = os.path.join(MATERIALS, a)
        for old, new in renamed_dirs.items():
            if src.startswith(old + os.sep):
                src = new + src[len(old):]
        dst = os.path.join(MATERIALS, b)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)
    for dp, dns, fns in sorted(os.walk(MATERIALS), key=lambda x: -len(x[0])):
        if dp != MATERIALS and not [f for f in os.listdir(dp) if f not in SKIP]:
            shutil.rmtree(dp, ignore_errors=True)
    stamp = datetime.date.today().isoformat()
    with open(INDEX, "a", encoding="utf-8") as f:
        if os.path.getsize(INDEX) if os.path.exists(INDEX) else 0:
            f.write("\n")
        f.write(f"\n### Log ganti nama {stamp} (tidy_materials.py)\n\n| Lama | Baru |\n|---|---|\n")
        for a, b in log:
            a_md, b_md = a.replace("|", "\\|"), b.replace("|", "\\|")
            f.write(f"| `{a_md}` | `{b_md}` |\n")
    print(f"Selesai. Log nama asli ditulis di {os.path.relpath(INDEX, ROOT)}.")
    fixed = update_raw_facts(log)
    print(f"raw_facts: {fixed} rujukan path diperbarui." if fixed is not None
          else "raw_facts tidak ditemukan; tidak ada path yang diperbarui.")


def update_raw_facts(log):
    """Ganti path lama → baru di raw_facts. Yang panjang duluan supaya tidak saling timpa."""
    if not os.path.isfile(RAW_FACTS):
        return None
    with open(RAW_FACTS, encoding="utf-8") as f:
        text = f.read()
    n = 0
    for old, new in sorted(log, key=lambda x: -len(x[0])):
        for prefix in ("01_user_documents/materials/", "materials/"):
            a, b = prefix + old.replace(os.sep, "/"), prefix + new.replace(os.sep, "/")
            if a in text:
                n += text.count(a)
                text = text.replace(a, b)
    if n:
        with open(RAW_FACTS, "w", encoding="utf-8") as f:
            f.write(text)
    return n


if __name__ == "__main__":
    main()
