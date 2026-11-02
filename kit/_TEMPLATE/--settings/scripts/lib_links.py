"""Menulis baris kontak dengan email dan URL yang benar-benar bisa diklik.

Dipakai bareng build_cv.py dan build_cover_letter.py (versi .docx lewat write_line,
versi HTML/PDF lewat linkify_html).

Kenapa ini perlu: python-docx tidak punya API hyperlink. Kalau teksnya ditulis sebagai run
biasa, di PDF hasilnya cuma teks mati — email tidak membuka mail client, LinkedIn tidak
bisa diklik. Sebagian pembaca PDF memang mendeteksi URL sendiri, tapi itu tergantung
aplikasinya, dan "linkedin.com/in/..." tanpa https:// sering tidak terdeteksi. Recruiter
yang ingin membuka profil lalu harus mengetik ulang — hambatan kecil yang tidak perlu ada.

Tampilannya sengaja tetap hitam tanpa garis bawah, sama persis seperti teks sekitarnya.
Yang berubah cuma bisa-diklik-nya.
"""

import html
import re

from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# Email, atau URL. Pemisah "·" dan "|" sengaja dikecualikan supaya tidak ikut tertelan URL.
PATTERN = re.compile(
    r"(?P<email>[\w.+-]+@[\w-]+\.[\w.]+)"
    r"|(?P<url>(?:https?://|www\.)[^\s·|]+|(?:[\w-]+\.)+(?:com|de|org|net|io)/[^\s·|]+|(?:[\w-]+\.)+app\b)"
)


def _href(match):
    if match.lastgroup == "email" or match.group("email"):
        return "mailto:" + match.group("email")
    url = match.group("url")
    return url if url.startswith("http") else "https://" + url


def _styled_rPr(font, size, underline=False):
    rPr = OxmlElement("w:rPr")
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:ascii"), font)
    rFonts.set(qn("w:hAnsi"), font)
    rPr.append(rFonts)
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), str(int(round(size * 2))))
    rPr.append(sz)
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "000000")
    rPr.append(color)
    if underline:
        u = OxmlElement("w:u")
        u.set(qn("w:val"), "single")
        rPr.append(u)
    return rPr


def add_hyperlink(paragraph, url, text, font, size, underline=False):
    r_id = paragraph.part.relate_to(url, RT.HYPERLINK, is_external=True)
    link = OxmlElement("w:hyperlink")
    link.set(qn("r:id"), r_id)

    run = OxmlElement("w:r")
    run.append(_styled_rPr(font, size, underline))
    t = OxmlElement("w:t")
    t.text = text
    t.set(qn("xml:space"), "preserve")
    run.append(t)
    link.append(run)
    paragraph._p.append(link)


def write_line(paragraph, text, font, size, color=None):
    """Tulis satu baris; potongan email/URL jadi hyperlink, sisanya teks biasa."""
    pos = 0
    found = 0
    for m in PATTERN.finditer(text):
        if m.start() > pos:
            r = paragraph.add_run(text[pos:m.start()])
            r.font.name = font
            r.font.size = size
            if color is not None:
                r.font.color.rgb = color
        add_hyperlink(paragraph, _href(m), m.group(0), font, size.pt)
        pos = m.end()
        found += 1
    if pos < len(text):
        r = paragraph.add_run(text[pos:])
        r.font.name = font
        r.font.size = size
        if color is not None:
            r.font.color.rgb = color
    return found


def linkify_html(text):
    """Versi HTML dari write_line: escape teksnya, potongan email/URL jadi <a href>."""
    out, pos = [], 0
    for m in PATTERN.finditer(text):
        out.append(html.escape(text[pos:m.start()]))
        out.append(f'<a href="{html.escape(_href(m), quote=True)}">{html.escape(m.group(0))}</a>')
        pos = m.end()
    out.append(html.escape(text[pos:]))
    return "".join(out)
