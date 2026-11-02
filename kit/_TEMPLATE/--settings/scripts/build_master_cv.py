#!/usr/bin/env python3
"""Generator Master CV: dokumen baca lengkap, BOLEH berhalaman-halaman.

Beda dengan build_cv.py:
  - build_cv.py = CV lamaran, dikunci 1 halaman, isi di-tailor dari raw_facts per lowongan.
  - build_master_cv.py = semua isi lengkap untuk dibaca user. BUKAN sumber tailoring;
    tailoring tetap dari 01_user_documents/raw_facts_about_you.md.

Layout dipinjam utuh dari build_cv.py (.docx lewat build(), PDF lewat render_html() +
templates/cv/layout.html), jadi layout tidak ditulis ulang di sini. Yang dilewati cuma
cek "harus 1 halaman". PDF dicetak lewat Chrome/Edge, tanpa Word/LibreOffice.

Cara pakai:
    python3 ./--settings/scripts/build_master_cv.py "01_user_documents/Master_CV/master_cv_content.json"

Hasil: .docx dan .pdf di folder yang sama dengan JSON-nya.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import build_cv  # noqa: E402
import lib_placeholders  # noqa: E402
import lib_render  # noqa: E402


def main():
    if len(sys.argv) < 2:
        sys.exit("pakai: python3 build_master_cv.py <path/master_cv_content.json>")

    content_path = os.path.abspath(sys.argv[1])
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)
    lib_placeholders.cek_nama_output(content["output"])
    belum_diisi = lib_placeholders.scrub(content)
    if belum_diisi:
        print(f"! {len(belum_diisi)} field masih <TAILOR>, dikosongkan (mis. {belum_diisi[0]}).")

    folder = os.path.dirname(content_path)
    docx_path = os.path.join(folder, content["output"])
    pdf_path = os.path.splitext(docx_path)[0] + ".pdf"

    for p in (docx_path, pdf_path):
        if os.path.exists(p):
            try:
                os.remove(p)
            except PermissionError:
                sys.exit(f"! {os.path.basename(p)} sedang dibuka. Tutup dulu.")

    warnings = build_cv.build(content, docx_path)
    print(f"OK: {docx_path}")
    for w in warnings:
        print(f"! {w}")

    if not lib_render.html_to_pdf(build_cv.render_html(content), pdf_path):
        sys.exit(lib_render.INSTALL_HINT)
    print(f"OK: {pdf_path} ({lib_render.count_pages(pdf_path)} halaman)")
    lib_render.hide_internal()


if __name__ == "__main__":
    main()
