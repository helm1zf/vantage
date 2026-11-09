#!/usr/bin/env python3
"""Bikin PDF final lamaran dengan penamaan yang benar, siap kirim.

Cara pakai (dari folder user):
    python3 ./--settings/scripts/export_pdf.py "02_workflow/01_Pipeline/<folder>"
    python3 ./--settings/scripts/export_pdf.py "02_workflow/01_Pipeline/<folder>" --suffix REQ-10118112
    python3 ./--settings/scripts/export_pdf.py "02_workflow/01_Pipeline/<folder>" --lang de

Sumbernya JSON di subfolder `00_Draft/` (cv_content.json, cl_content.json), dirender
pakai layout yang sama dengan build_cv.py/build_cover_letter.py, lalu dicetak lewat
Chrome/Edge (lib_render.py). Tidak butuh Word maupun LibreOffice, dan hasilnya sama di
semua komputer. PDF masuk ke `02_ready_to_send/`, jadi jelas mana yang dikirim.

Kenapa penamaannya begini:
  - Nama belakang di depan: recruiter mengunduh puluhan berkas ke satu folder. "CV.pdf"
    bertabrakan dengan kandidat lain dan jadi "CV(17).pdf".
  - PDF, bukan .docx: format tidak bergeser di komputer mereka.
  - Tanpa spasi, tanpa umlaut: aman untuk portal upload yang rewel.
  - Tanpa tanggal dan tanpa "v2/final/revisi": bocor proses, terbaca basi.
  - --suffix REQ-xxxx kalau melamar lewat email, atau kalau ada lebih dari satu lamaran
    ke perusahaan yang sama (mis. dua lowongan berbeda di perusahaan yang sama).

Nama belakang default dibaca dari 01_user_documents/--usersettings/identity.json,
atau override lewat --surname.
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_placeholders  # noqa: E402
import lib_render  # noqa: E402
import lib_schema  # noqa: E402

LABELS = {
    "en": {"cv": "CV", "cl": "Cover-Letter"},
    "de": {"cv": "Lebenslauf", "cl": "Anschreiben"},
}

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_IDENTITY_PATH = os.path.join(_THIS_DIR, "..", "..", "01_user_documents", "--usersettings", "identity.json")
try:
    with open(_IDENTITY_PATH, encoding="utf-8") as _f:
        _identity = json.load(_f)
    lib_schema.exit_if_invalid(lib_schema.validate_identity(_identity, _IDENTITY_PATH), sys)
    DEFAULT_SURNAME = _identity.get("surname", "TAILOR-SURNAME")
except FileNotFoundError:
    DEFAULT_SURNAME = "TAILOR-SURNAME"
except json.JSONDecodeError as _e:
    sys.exit(f"! identity.json bukan JSON valid ({_IDENTITY_PATH}): {_e}")


def classify(filename):
    low = filename.lower()
    if not low.endswith(".json") or low.startswith((".", "_")):
        return None
    if low.startswith("cl") or "cover" in low or "anschreiben" in low:
        return "cl"
    if low.startswith("cv") or "lebenslauf" in low or "resume" in low:
        return "cv"
    return None


def render(kind, json_path):
    with open(json_path, encoding="utf-8") as f:
        content = json.load(f)
    lib_placeholders.scrub(content)
    if kind == "cv":
        import build_cv
        return build_cv.render_html(content)
    import build_cover_letter
    return build_cover_letter.render_html(content)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="folder lamaran di 02_workflow/01_Pipeline/ atau 02_Sent/")
    ap.add_argument("--suffix", default="", help="mis. REQ-10118112 (untuk email / perusahaan yang sama)")
    ap.add_argument("--lang", default="en", choices=["en", "de"], help="bahasa nama berkas")
    ap.add_argument("--pick", default="", help="potongan nama JSON kalau ada lebih dari satu versi")
    ap.add_argument("--surname", default=DEFAULT_SURNAME)
    args = ap.parse_args()

    if "<" in args.surname or ">" in args.surname or args.surname == "TAILOR-SURNAME":
        sys.exit(
            f'! Nama belakang masih placeholder: "{args.surname}".\n'
            "  Isi field \"surname\" di 01_user_documents/--usersettings/identity.json dulu,\n"
            "  atau kasih manual lewat --surname, sebelum export PDF."
        )

    folder = os.path.abspath(args.folder)
    draft_dir = os.path.join(folder, "00_Draft")
    if not os.path.isdir(draft_dir):
        sys.exit(f"! subfolder 00_Draft tidak ada di: {folder}")

    if not lib_render.find_browser():
        sys.exit(lib_render.INSTALL_HINT)

    found = {"cv": [], "cl": []}
    for fn in sorted(os.listdir(draft_dir)):
        kind = classify(fn)
        if kind:
            found[kind].append(fn)
    if not found["cv"] and not found["cl"]:
        sys.exit("! tidak ada cv_content.json / cl_content.json di 00_Draft/")

    out_dir = os.path.join(folder, "02_ready_to_send")
    os.makedirs(out_dir, exist_ok=True)
    labels = LABELS[args.lang]
    suffix = f"_{args.suffix}" if args.suffix else ""

    ok = True
    for kind, files in found.items():
        if len(files) > 1:
            picked = [f for f in files if args.pick and args.pick.lower() in f.lower()]
            if len(picked) != 1:
                listing = "\n".join(f"    - {f}" for f in files)
                sys.exit(f"! ada {len(files)} JSON {kind} di 00_Draft/:\n{listing}\n"
                         "  Pilih satu dengan --pick <potongan-nama>.")
            files = picked
        if not files:
            continue
        dst = os.path.join(out_dir, f"{args.surname}_{labels[kind]}{suffix}.pdf")
        if not lib_render.html_to_pdf(render(kind, os.path.join(draft_dir, files[0])), dst):
            ok = False
            print(f"! gagal mencetak {files[0]}")
            continue
        n = lib_render.count_pages(dst)
        flag = "" if n == 1 else (f"  ! {n} halaman" if n else "  (halaman tidak dicek: pip install pypdf)")
        print(f"{files[0]}  ->  02_ready_to_send/{os.path.basename(dst)}{flag}")

    if not ok:
        sys.exit(1)
    lib_render.hide_internal()
    print(f"\nSiap kirim: {out_dir}")
    print("Baca PDF-nya sendiri dulu (sop/cek_kualitas.md) sebelum bilang selesai.")


if __name__ == "__main__":
    main()
