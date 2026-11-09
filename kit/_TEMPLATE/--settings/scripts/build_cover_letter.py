#!/usr/bin/env python3
"""Generator cover letter satu halaman. Sepasang dengan build_cv.py.

Cara pakai:
    python3 ./--settings/scripts/build_cover_letter.py "02_workflow/01_Pipeline/<folder>/00_Draft/cl_content.json"

Data diri (nama, alamat, email, LinkedIn) dibaca dari
01_user_documents/--usersettings/identity.json —
ISI FILE ITU DULU sebelum generate cover letter pertama kali.

Sama seperti CV: layout dikunci (templates/cover_letter/layout.html untuk PDF, kode di
bawah untuk .docx), yang ditulis ulang tiap lamaran cuma JSON-nya. Hasil: .docx + .pdf
pratinjau di folder yang sama. PDF dicetak lewat Chrome/Edge (lib_render.py), dan
jumlah halamannya dicek otomatis (harus 1).

Struktur cover letter yang dipakai — urutannya sengaja:
  1. Kait: puji perusahaan lewat hal spesifik di JD, lalu sambungkan ke kenapa role ini
  2-4. Tiap paragraf mengambil SATU tugas dari JD, lalu memasangkannya dengan bukti dari CV
  5. Penutup: ketersediaan + tanggal eksplisit, relokasi, sifat kerja, ajakan bicara

Aturan isi ada di sop/aturan_isi.md. Yang khusus cover letter:
  - Kutip tugas JD-nya, jangan parafrase jauh — itu sekalian keyword untuk ATS
  - Pujian harus nempel ke hal konkret di JD, bukan pujian umum yang bisa ditempel ke
    perusahaan mana pun
  - Tanggal mulai dan durasi ditulis eksplisit kalau JD memintanya
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import html
import json
import os
import sys

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_placeholders  # noqa: E402
import lib_render  # noqa: E402
import lib_schema  # noqa: E402
from lib_links import linkify_html, write_line  # noqa: E402

INK = RGBColor(0x00, 0x00, 0x00)
FONT = "Calibri"
BODY = 10.2

# ---------------------------------------------------------------- identity (EDIT DI JSON, bukan di sini)

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_IDENTITY_PATH = os.path.join(_THIS_DIR, "..", "..", "01_user_documents", "--usersettings", "identity.json")

try:
    with open(_IDENTITY_PATH, encoding="utf-8") as _f:
        _identity = json.load(_f)
except FileNotFoundError:
    sys.exit(f"! identity.json tidak ada di {_IDENTITY_PATH}. Buat dulu (contoh ada di README).")
except json.JSONDecodeError as _e:
    sys.exit(f"! identity.json bukan JSON valid ({_IDENTITY_PATH}): {_e}")

lib_schema.exit_if_invalid(lib_schema.validate_identity(_identity, _IDENTITY_PATH), sys)

NAME = _identity.get("name", "<TAILOR: Nama Lengkap>")
CONTACT = _identity.get("contact_lines_cl", ["<TAILOR: isi identity.json dulu>"])
LAYOUT_HTML = os.path.join(_THIS_DIR, "..", "templates", "cover_letter", "layout.html")


def render_html(content):
    """Isi layout.html dengan cl_content.json. Dipakai juga oleh export_pdf.py."""
    e = html.escape
    name = content.get("name", NAME)
    avail = content.get("availability_line")
    with open(LAYOUT_HTML, encoding="utf-8") as f:
        tpl = f.read()
    return lib_render.fill(tpl, {
        "DOC_TITLE": e(name), "NAME": e(name),
        "CONTACT": "".join(f'<p class="contact">{linkify_html(x)}</p>'
                           for x in content.get("contact", CONTACT)),
        "RECIPIENT": "".join(f"<p>{e(x)}</p>" for x in content["recipient"]),
        "SUBJECT": e(content["subject"]),
        "AVAILABILITY": f'<p class="availability">{e(avail)}</p>' if avail else "",
        "SALUTATION": e(content.get("salutation", "Dear Hiring Team,")),
        "BODY": "".join(f"<p>{e(x)}</p>" for x in content["body"]),
        "SIGNOFF": e(content.get("signoff", "Kind regards,")),
    })


def _p(doc, text, size=BODY, bold=False, italic=False, space_after=8,
       justify=True, space_before=0):
    par = doc.add_paragraph()
    par.paragraph_format.space_after = Pt(space_after)
    par.paragraph_format.space_before = Pt(space_before)
    if justify:
        par.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = par.add_run(text)
    r.font.name = FONT
    r.font.size = Pt(size)
    r.bold = bold
    r.italic = italic
    r.font.color.rgb = INK
    return par


def build(content, out_path):
    doc = Document()
    for s in doc.sections:
        s.top_margin = Cm(1.2)
        s.bottom_margin = Cm(1.0)
        s.left_margin = Cm(2.0)
        s.right_margin = Cm(2.0)
        s.page_width = Cm(21.0)
        s.page_height = Cm(29.7)

    st = doc.styles["Normal"]
    st.font.name = FONT
    st.font.size = Pt(BODY)
    st.paragraph_format.space_after = Pt(0)

    # sender — email dan LinkedIn dibuat bisa diklik
    _p(doc, content.get("name", NAME), size=13, bold=True, space_after=1, justify=False)
    for line in content.get("contact", CONTACT):
        par = doc.add_paragraph()
        par.paragraph_format.space_after = Pt(0)
        write_line(par, line, FONT, Pt(9.5), INK)

    # recipient
    for i, line in enumerate(content["recipient"]):
        _p(doc, line, space_after=0, justify=False,
           space_before=14 if i == 0 else 0)

    # subject + availability
    _p(doc, content["subject"], bold=True, space_after=1, justify=False, space_before=12)
    if content.get("availability_line"):
        _p(doc, content["availability_line"], size=9.8, space_after=12, justify=False)

    _p(doc, content.get("salutation", "Dear Hiring Team,"), space_after=9, justify=False)

    for para in content["body"]:
        _p(doc, para, space_after=6.5)

    _p(doc, content.get("signoff", "Kind regards,"), space_after=2, justify=False,
       space_before=4)
    _p(doc, content.get("name", NAME), space_after=0, justify=False)

    doc.save(out_path)


def main():
    if len(sys.argv) < 2:
        sys.exit("pakai: python3 build_cover_letter.py <path/cl_content.json>")

    content_path = os.path.abspath(sys.argv[1])
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)

    lib_placeholders.cek_nama_output(content["output"])
    belum_diisi = lib_placeholders.scrub(content)

    out_path = os.path.join(os.path.dirname(content_path), content["output"])
    if os.path.exists(out_path):
        try:
            os.remove(out_path)
        except PermissionError:
            sys.exit(f"! {os.path.basename(out_path)} sedang dibuka di Word. Tutup dulu.")

    build(content, out_path)
    print(f"OK: {out_path}")

    pdf_path = os.path.splitext(out_path)[0] + ".pdf"
    if lib_render.html_to_pdf(render_html(content), pdf_path):
        pages = lib_render.count_pages(pdf_path)
        words = sum(len(x.split()) for x in content["body"])
        print(f"OK: {pdf_path}" + (f" ({pages} halaman, {words} kata isi)" if pages else ""))
        if pages and pages > 1:
            print("! LEBIH DARI 1 HALAMAN. Pangkas paragraf, target 600-650 kata isi.")
    else:
        print(lib_render.INSTALL_HINT)
        print("! PDF pratinjau tidak dibuat; .docx tetap jadi.")

    if belum_diisi:
        print(f"\n! {len(belum_diisi)} field masih placeholder, dikosongkan supaya tidak ikut ter-render:")
        for lokasi in belum_diisi:
            print(f"    - {lokasi}")
        print("  Isi dari raw_facts_about_you.md kalau memang perlu, atau hapus key-nya dari JSON.")


if __name__ == "__main__":
    main()
