#!/usr/bin/env python3
"""Bikin dua zip rilis dari folder paket pengembang (sejajar _TEMPLATE/).

    python3 _TEMPLATE/--settings/scripts/build_release.py            # tanggal hari ini
    python3 _TEMPLATE/--settings/scripts/build_release.py 2026-10-23
    ... --force     # lewati gerbang verify_consistency (hanya kalau sengaja)

Hasil di folder paket:
  Vantage_Starter_<tanggal>.zip  → user BARU. Isi: Vantage/{CLAUDE.md, .claude/agents/, _TEMPLATE/}
  Vantage_Update_<tanggal>.zip   → user LAMA. Isi: vantage_update/{README.md, UPDATE.md,
                                   CLAUDE.md, .claude/agents/, _TEMPLATE/} (sop/update.md)

Yang TIDAK pernah ikut: folder user mana pun, .claude/settings*.json (pengaturan pribadi
pengembang), bagian "## graphify" di CLAUDE.md root, sampah OS (.DS_Store, ._*, ~$*, __pycache__, *.tmp, .~lock*).
Urutan otomatis: (1) tulis nomor versi (tanggal rilis) ke --usersettings/.vantage_version,
(2) buat ulang UPDATE.md, (3) gerbang verify_consistency, (4) zip. Opsi: --force (lewati gerbang).
"""

import datetime
import fnmatch
import os
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.dirname(os.path.dirname(HERE))
PACKAGE = os.path.dirname(TEMPLATE)
JUNK = [".DS_Store", "._*", "~$*", "*.tmp", ".~lock*", "__MACOSX", "__pycache__", "*.pyc"]

README_UPDATE = """# Update Vantage ({date})

**Jangan salin folder lama kamu ke mana pun.** Folder kamu (yang berisi CV, bahan, dan
lamaran) tetap di tempatnya. Paket ini cuma berisi file sistem baru.

1. Pindahkan folder `vantage_update` ini ke **dalam folder Vantage kamu**, sejajar folder
   `_TEMPLATE` dan folder nama kamu.
2. Buka Nova di folder Vantage, lalu ketik: **update**
3. Nova kasih ringkasan singkat apa saja yang berubah. Jawab "oke", Nova kerjakan sampai
   selesai, lalu bilang kalau folder `vantage_update` boleh dihapus.

Data kamu, CV kamu, dan cara Nova ngobrol sama kamu tidak diubah.
"""


def junk(name):
    return any(fnmatch.fnmatch(name, p) for p in JUNK)


def add_tree(zf, src, arc_root):
    for dp, dns, fns in os.walk(src):
        dns[:] = [d for d in dns if not junk(d)]
        for fn in fns:
            if junk(fn):
                continue
            full = os.path.join(dp, fn)
            zf.write(full, os.path.join(arc_root, os.path.relpath(full, src)))


def release_claude_md():
    """CLAUDE.md root tanpa bagian khusus mesin pengembang (mis. '## graphify' yang
    ditambahkan alat pribadi). Semua yang mulai dari judul bagian itu dibuang."""
    with open(os.path.join(PACKAGE, "CLAUDE.md"), encoding="utf-8") as f:
        text = f.read()
    for marker in ("\n## graphify", "\n<!-- dev-only -->"):
        if marker in text:
            text = text[:text.index(marker)]
    return text.rstrip() + "\n"


def add_common(zf, root):
    zf.writestr(f"{root}/CLAUDE.md", release_claude_md())
    agents = os.path.join(PACKAGE, ".claude", "agents")
    if os.path.isdir(agents):
        add_tree(zf, agents, f"{root}/.claude/agents")
    add_tree(zf, TEMPLATE, f"{root}/_TEMPLATE")


def stamp_version(date):
    path = os.path.join(TEMPLATE, "01_user_documents", "--usersettings", ".vantage_version")
    with open(path, "w", encoding="utf-8") as f:
        f.write(date + "\n")
    print(f"versi: {date}")


def regenerate_update():
    r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "generate_update.py")],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("BERHENTI: generate_update.py gagal:\n" + r.stderr[-800:])
        sys.exit(1)
    print("UPDATE.md dibuat ulang")


def gate():
    """Tolak bikin zip kalau verify_consistency masih merah (mis. UPDATE.md basi)."""
    r = subprocess.run([sys.executable, "-I", os.path.join(HERE, "verify_consistency.py")],
                       capture_output=True, text=True)
    red = [l for l in r.stdout.splitlines() if l.strip().startswith("x ")]
    if red:
        print("BERHENTI: verify_consistency masih merah, zip tidak dibuat.")
        print("\n".join(red[:15]))
        print("Jalankan generate_update.py dulu, perbaiki sisanya, atau pakai --force kalau sengaja.")
        sys.exit(1)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    date = args[0] if args else datetime.date.today().isoformat()
    stamp_version(date)
    regenerate_update()
    if "--force" not in sys.argv:
        gate()
    starter = os.path.join(PACKAGE, f"Vantage_Starter_{date}.zip")
    update = os.path.join(PACKAGE, f"Vantage_Update_{date}.zip")
    for p in (starter, update):
        if os.path.exists(p):
            os.remove(p)
    with zipfile.ZipFile(starter, "w", zipfile.ZIP_DEFLATED) as zf:
        add_common(zf, "Vantage")
    with zipfile.ZipFile(update, "w", zipfile.ZIP_DEFLATED) as zf:
        add_common(zf, "vantage_update")
        zf.writestr("vantage_update/README.md", README_UPDATE.format(date=date))
        upd = os.path.join(TEMPLATE, "UPDATE.md")
        if os.path.isfile(upd):
            zf.write(upd, "vantage_update/UPDATE.md")
    for p in (starter, update):
        with zipfile.ZipFile(p) as zf:
            bad = zf.testzip()
            n = len(zf.namelist())
        print(f"{'OK' if bad is None else 'RUSAK: ' + bad}  {os.path.basename(p)}  ({n} file)")


if __name__ == "__main__":
    main()
