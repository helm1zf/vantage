#!/usr/bin/env python3
"""Generator CV satu halaman, ATS-safe. Hasil: .docx (buat portal yang minta Word) +
.pdf pratinjau di folder yang sama.

Sumber isi: satu file cv_content.json di folder lamaran (salinan
--settings/templates/cv/content.json). Tampilan PDF diambil dari
--settings/templates/cv/layout.html dan dicetak lewat Chrome/Edge (lib_render.py),
jadi tidak butuh Word maupun LibreOffice, dan hasilnya sama di semua komputer.

Cara pakai (dari folder user):
    python3 ./--settings/scripts/build_cv.py "02_workflow/01_Pipeline/18-08_ING_.../00_Draft/cv_content.json"

Data diri (nama, alamat, email, LinkedIn) dibaca dari
01_user_documents/--usersettings/identity.json. Isi file itu dulu sebelum generate CV
pertama kali. Jangan edit angka di script ini.

Script ini MEMVERIFIKASI hasilnya sendiri: jumlah halaman PDF harus 1. Kalau lebih,
dia bilang. Kenapa: tabrakan teks dan luberan halaman cuma kelihatan setelah dirender.

Aturan layout yang dikunci (jangan diubah tanpa alasan):
  - NOL TABEL. Tabel bikin ATS gagal baca isinya, termasuk daftar skill.
  - Satu kolom penuh, hitam-putih.
  - Foto ditanam OTOMATIS dari 01_user_documents/materials/00_Photo.jpg (crop kotak,
    sudut membulat). Tanpa file foto, CV tetap jalan.
"""

import html
import json
import os
import sys

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_placeholders  # noqa: E402
import lib_render  # noqa: E402
import lib_schema  # noqa: E402
from lib_links import linkify_html, write_line  # noqa: E402

# Seluruh dokumen hitam, termasuk garisnya. Hierarki dibentuk lewat tebal/miring/ukuran,
# bukan warna — supaya sekalian aman untuk cetak hitam-putih.
INK = RGBColor(0x00, 0x00, 0x00)
RULE_COLOR = "000000"
FONT = "Calibri"

BODY = 9.3
RIGHT_TAB = Cm(18.4)
PHOTO_GUTTER = Cm(3.0)

# Baris jabatan = "role | org" di kiri, tab, lokasi+tanggal di kanan. Yang bikin nabrak
# adalah panjang TOTAL kiri+kanan, bukan salah satunya. Dikalibrasi dari hasil render:
# 122 karakter masih aman, 144 sudah nabrak. Kalau kena, pendekkan nama organisasinya.
LINE_CHAR_MAX = 130

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
CONTACT = _identity.get("contact_lines_cv", ["<TAILOR: isi identity.json dulu>"])

if NAME.startswith("<TAILOR"):
    print("! identity.json belum diisi — CV akan pakai placeholder nama/kontak.")

# Folder utama project (satu tingkat di atas --settings).
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_PHOTO = "01_user_documents/materials/00_Photo.jpg"
LAYOUT_HTML = os.path.join(_THIS_DIR, "..", "templates", "cv", "layout.html")


# ---------------------------------------------------------------- helper layout

def _set_page(doc):
    for s in doc.sections:
        s.top_margin = Cm(0.9)
        s.bottom_margin = Cm(0.7)
        s.left_margin = Cm(1.1)
        s.right_margin = Cm(1.1)
        s.header_distance = Cm(0.3)
        s.footer_distance = Cm(0.3)
        s.page_width = Cm(21.0)
        s.page_height = Cm(29.7)


def _set_base_style(doc):
    st = doc.styles["Normal"]
    st.font.name = FONT
    st.font.size = Pt(BODY)
    st.paragraph_format.space_after = Pt(0)
    st.paragraph_format.line_spacing = 1.0


def _rule(paragraph, color=RULE_COLOR, sz="8"):
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), sz)
    bottom.set(qn("w:space"), "2")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def _section_title(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text.upper())
    r.bold = True
    r.font.size = Pt(10)
    r.font.name = FONT
    r.font.color.rgb = INK
    _rule(p)


def _entry(doc, role, org, right, context=None):
    p = doc.add_paragraph()
    p.paragraph_format.tab_stops.add_tab_stop(RIGHT_TAB, WD_TAB_ALIGNMENT.RIGHT)
    p.paragraph_format.space_before = Pt(3.5)
    p.paragraph_format.space_after = Pt(0)
    r1 = p.add_run(role)
    r1.bold = True
    r1.font.size = Pt(9.8)
    r1.font.name = FONT
    r1.font.color.rgb = INK
    if org:
        r2 = p.add_run(f"  |  {org}")
        r2.font.size = Pt(9.4)
        r2.font.name = FONT
    r3 = p.add_run("\t" + right)
    r3.bold = True
    r3.font.size = Pt(9)
    r3.font.name = FONT
    r3.font.color.rgb = INK

    if context:
        p2 = doc.add_paragraph()
        p2.paragraph_format.space_after = Pt(1)
        rc = p2.add_run(context)
        rc.italic = True
        rc.font.size = Pt(8.7)
        rc.font.name = FONT
        rc.font.color.rgb = INK


def _bullet(doc, lead, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(0.5)
    p.paragraph_format.left_indent = Cm(0.42)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    if lead:
        r1 = p.add_run(f"{lead}: ")
        r1.bold = True
        r1.font.size = Pt(BODY)
        r1.font.name = FONT
    r2 = p.add_run(text)
    r2.font.size = Pt(BODY)
    r2.font.name = FONT


def _plain(doc, lead, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0.5)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r1 = p.add_run(f"{lead}: ")
    r1.bold = True
    r1.font.size = Pt(BODY)
    r1.font.name = FONT
    r2 = p.add_run(text)
    r2.font.size = Pt(BODY)
    r2.font.name = FONT


# ---------------------------------------------------------------- build

def _prep_photo(src_path, px=1000, top_bias=0.5, radius_frac=0.12):
    """Crop tengah jadi kotak, bulatkan sudut (alpha), simpan PNG sementara.

    Kenapa: Photo.jpg sering portrait tinggi. Kalau lebarnya dipatok tapi tingginya ikut
    aspek, fotonya memanjang ke bawah dan menembus teks profil. Crop kotak mem-bound
    tingginya, dan sudut membulat + latar transparan bikin tampilannya seperti headshot
    kecil yang mengambang. top_bias menggeser crop ke atas supaya wajah tetap di frame.

    Kalau Pillow tak ada, kembalikan file asli (fallback aman).
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return src_path
    import tempfile
    img = Image.open(src_path).convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = int((h - side) * top_bias)
    img = img.crop((left, top, left + side, top + side))
    px = min(px, side)  # jangan upscale di atas resolusi sumber — cuma bikin blur, tak nambah detail
    img = img.resize((px, px), Image.LANCZOS)
    mask = Image.new("L", (px, px), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, px - 1, px - 1),
                                           radius=int(px * radius_frac), fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    fd, tmp = tempfile.mkstemp(suffix=".png", prefix="cvphoto_")
    os.close(fd)
    out.save(tmp)
    return tmp


def _float_top_right(paragraph, photo_path, width_cm=2.3):
    """Tanam foto sebagai gambar mengambang di kanan atas.

    Mengambang (anchor + wrapSquare), bukan inline: teks tidak tergeser, dan pembaca ATS
    melewatinya begitu saja — gambar memang tidak pernah dibaca ATS. Foto di-crop kotak +
    sudut membulat lewat _prep_photo supaya kecil dan tidak menembus teks profil.

    Ini ditanam otomatis, bukan dipasang manual di Word, karena setiap generate ulang
    menimpa .docx-nya. Foto yang dipasang tangan akan hilang tanpa disadari.
    """
    photo_path = _prep_photo(photo_path)
    run = paragraph.add_run()
    run.add_picture(photo_path, width=Cm(width_cm), height=Cm(width_cm))
    inline = run._r.find(qn("w:drawing"))[0]

    anchor = OxmlElement("wp:anchor")
    for k, v in {
        "distT": "0", "distB": "0", "distL": "114300", "distR": "114300",
        "simplePos": "0", "relativeHeight": "251658240", "behindDoc": "0",
        "locked": "0", "layoutInCell": "1", "allowOverlap": "1",
    }.items():
        anchor.set(k, v)

    simple_pos = OxmlElement("wp:simplePos")
    simple_pos.set("x", "0")
    simple_pos.set("y", "0")
    anchor.append(simple_pos)

    pos_h = OxmlElement("wp:positionH")
    pos_h.set("relativeFrom", "margin")
    align_h = OxmlElement("wp:align")
    align_h.text = "right"
    pos_h.append(align_h)
    anchor.append(pos_h)

    pos_v = OxmlElement("wp:positionV")
    pos_v.set("relativeFrom", "paragraph")
    off_v = OxmlElement("wp:posOffset")
    off_v.text = "0"
    pos_v.append(off_v)
    anchor.append(pos_v)

    # Urutan anak elemen wp:anchor itu wajib menurut skemanya:
    # extent, effectExtent, <wrap>, docPr, cNvGraphicFramePr, graphic.
    # python-docx tidak membuat effectExtent, dan tanpa elemen wrap Word menolak membuka
    # berkasnya sama sekali ("Word experienced an error trying to open the file").
    # Jadi keduanya dibuat sendiri di sini.
    extent = inline.find(qn("wp:extent"))
    if extent is not None:
        anchor.append(extent)

    effect = inline.find(qn("wp:effectExtent"))
    if effect is None:
        effect = OxmlElement("wp:effectExtent")
        for edge in ("l", "t", "r", "b"):
            effect.set(edge, "0")
    anchor.append(effect)

    wrap = OxmlElement("wp:wrapSquare")
    wrap.set("wrapText", "bothSides")
    anchor.append(wrap)

    for tag in ("wp:docPr", "wp:cNvGraphicFramePr", "a:graphic"):
        el = inline.find(qn(tag))
        if el is not None:
            anchor.append(el)

    inline.getparent().replace(inline, anchor)


def resolve_photo(content):
    """Path foto yang dipakai, atau None kalau tidak ada."""
    photo = content.get("photo", DEFAULT_PHOTO)
    if not photo:
        return None
    path = photo if os.path.isabs(photo) else os.path.join(ROOT, photo)
    if not os.path.isfile(path):
        # nama lama (sebelum 2026-10-08): materials/Photo.jpg
        for alt in ("01_user_documents/materials/00_Photo.jpg", "01_user_documents/materials/Photo.jpg"):
            if os.path.isfile(os.path.join(ROOT, alt)):
                return os.path.join(ROOT, alt)
        return None
    return path


def render_html(content):
    """Isi layout.html dengan content.json. Dipakai juga oleh export_pdf.py dan build_master_cv.py."""
    e = html.escape
    photo_path = resolve_photo(content)
    photo = ""
    if photo_path:
        photo = f'<img class="photo" src="{lib_render.image_data_uri(_prep_photo(photo_path))}" alt="">'
    contact = "".join(f'<p class="contact">{linkify_html(line)}</p>'
                      for line in content.get("contact", CONTACT))
    sections = []
    for section in content["sections"]:
        parts = [f"<h2>{e(section['title'])}</h2>"]
        for ent in section["entries"]:
            org = f'<span class="org">  |  {e(ent["org"])}</span>' if ent.get("org") else ""
            ctx = f'<p class="context">{e(ent["context"])}</p>' if ent.get("context") else ""
            items = []
            for lead, text in ent.get("bullets", []):
                lead_html = f'<span class="lead">{e(lead)}:</span> ' if lead else ""
                items.append(f"<li>{lead_html}{e(text)}</li>")
            ul = f"<ul>{''.join(items)}</ul>" if items else ""
            parts.append(f'<div class="entry"><div class="entry-head"><span><span class="role">'
                         f'{e(ent["role"])}</span>{org}</span><span class="right">{e(ent["right"])}'
                         f"</span></div>{ctx}{ul}</div>")
        sections.append("\n".join(parts))
    skills = "".join(f'<p class="skill"><span class="lead">{e(lead)}:</span> {e(text)}</p>'
                     for lead, text in content["skills"])
    with open(LAYOUT_HTML, encoding="utf-8") as f:
        tpl = f.read()
    return lib_render.fill(tpl, {
        "DOC_TITLE": e(content.get("name", NAME)), "PHOTO": photo,
        "NAME": e(content.get("name", NAME)), "TAGLINE": e(content.get("tagline", "")),
        "CONTACT": contact, "PROFILE": e(content.get("profile", "")),
        "SECTIONS": "\n".join(sections),
        "SKILLS_TITLE": e(content.get("skills_title", "Skills & Certifications")),
        "SKILLS": skills,
    })


def build(content, out_path):
    doc = Document()
    _set_page(doc)
    _set_base_style(doc)

    # header
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.right_indent = PHOTO_GUTTER
    r = p.add_run(content.get("name", NAME))
    r.bold = True
    r.font.size = Pt(19)
    r.font.name = FONT
    r.font.color.rgb = INK

    photo = content.get("photo", DEFAULT_PHOTO)
    photo_ok = False
    if photo:
        photo_path = photo if os.path.isabs(photo) else os.path.join(ROOT, photo)
        if not os.path.isfile(photo_path):
            # nama lama (sebelum 2026-10-08): materials/Photo.jpg
            for alt in ("01_user_documents/materials/00_Photo.jpg", "01_user_documents/materials/Photo.jpg"):
                if os.path.isfile(os.path.join(ROOT, alt)):
                    photo_path = os.path.join(ROOT, alt)
                    break
        if os.path.isfile(photo_path):
            _float_top_right(p, photo_path)
            photo_ok = True

    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.right_indent = PHOTO_GUTTER
    r = p.add_run(content["tagline"])
    r.italic = True
    r.font.size = Pt(10)
    r.font.name = FONT
    r.font.color.rgb = INK

    lines = content.get("contact", CONTACT)
    links_made = 0
    for i, line in enumerate(lines):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3 if i == len(lines) - 1 else 0)
        p.paragraph_format.right_indent = PHOTO_GUTTER
        links_made += write_line(p, line, FONT, Pt(8.9), INK)
    _rule(p, sz="12")

    # profile
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    r = p.add_run(content["profile"])
    r.font.size = Pt(9.2)
    r.font.name = FONT
    r.italic = True

    # sections
    warnings = []
    for section in content["sections"]:
        _section_title(doc, section["title"])
        for e in section["entries"]:
            role, org, right = e["role"], e.get("org", ""), e["right"]
            total = len(role) + len(org) + len(right)
            if total > LINE_CHAR_MAX:
                warnings.append(
                    f'"{role} | {org}" + kolom kanan = {total} char (>{LINE_CHAR_MAX}) '
                    "— berisiko nabrak, pendekkan nama org"
                )
            _entry(doc, role, org, e["right"], e.get("context"))
            for b in e.get("bullets", []):
                _bullet(doc, b[0] or None, b[1])

    _section_title(doc, content.get("skills_title", "Skills & Certifications"))
    for lead, text in content["skills"]:
        _plain(doc, lead, text)

    doc.paragraphs[-1].paragraph_format.space_after = Pt(0)

    # Email dan LinkedIn harus bisa diklik di PDF-nya. Kalau nol, pola di lib_links.py
    # tidak cocok dengan format baris kontaknya — bukan sekadar kosmetik.
    if links_made == 0:
        warnings.append("baris kontak tidak menghasilkan satu pun hyperlink — cek format email/URL-nya")
    if not photo_ok:
        warnings.append(f"foto tidak ditanam — cek {os.path.join(ROOT, str(photo))} (opsional, boleh diabaikan kalau memang belum ada foto)")

    doc.save(out_path)
    return warnings


def main():
    if len(sys.argv) < 2:
        sys.exit("pakai: python3 build_cv.py <path/cv_content.json>")

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

    warnings = build(content, out_path)
    print(f"OK: {out_path}")

    for w in warnings:
        print(f"! {w}")

    if belum_diisi:
        print(f"\n! {len(belum_diisi)} field masih placeholder, dikosongkan supaya tidak ikut ter-render:")
        for lokasi in belum_diisi:
            print(f"    - {lokasi}")
        print("  Isi dari raw_facts_about_you.md kalau memang perlu, atau hapus key-nya dari JSON.")

    pdf_path = os.path.splitext(out_path)[0] + ".pdf"
    if not lib_render.html_to_pdf(render_html(content), pdf_path):
        print(lib_render.INSTALL_HINT)
        print("! PDF pratinjau tidak dibuat; .docx tetap jadi.")
        return
    pages = lib_render.count_pages(pdf_path)
    print(f"OK: {pdf_path}" + (f" ({pages} halaman)" if pages else ""))
    if pages and pages > 1:
        print("! LEBIH DARI 1 HALAMAN. Pangkas kalimat dulu (bullet tanpa jangkar duluan),")
        print("  jangan langsung kecilkan font.")


if __name__ == "__main__":
    main()
