#!/usr/bin/env python3
"""Ubah satu file .md jadi .pdf (nama sama, folder sama) buat dibaca user.

Cara pakai:
    python3 ./--settings/scripts/md_to_pdf.py "<path/file.md>" [--hide-md]

--hide-md: sembunyikan file .md-nya dari Finder (chflags hidden), PDF tetap kelihatan.
Dicetak lewat Chrome/Edge (lib_render.py). Pakai modul `markdown` kalau ada; kalau tidak,
teks ditampilkan polos.
"""
import html, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_render  # noqa: E402


def _fix_lists(text):
    """Sisipkan baris kosong sebelum daftar (-, *, 1.) yang menempel ke paragraf/teks tebal.
    Tanpa ini, modul `markdown` menggabungkan daftar jadi satu paragraf panjang."""
    out, prev = [], ""
    for line in text.split("\n"):
        is_item = re.match(r"^\s*([-*+]|\d+\.)\s+", line)
        prev_item = re.match(r"^\s*([-*+]|\d+\.)\s+", prev)
        if is_item and prev.strip() and not prev_item and not prev.startswith((" ", "\t", "|", ">")):
            out.append("")
        out.append(line)
        prev = line
    return "\n".join(out)

CSS = """@page{size:A4;margin:16mm 16mm 18mm}body{font-family:-apple-system,Helvetica,Arial,sans-serif;
font-size:10.5pt;line-height:1.5;color:#1d2433}
h1{font-size:20pt;color:#0b3d6e;margin:0 0 4px}
h2{font-size:15pt;color:#0b3d6e;border-bottom:2px solid #0b3d6e;padding-bottom:3px;margin-top:22px}
h3{font-size:12.5pt;color:#14508c;margin:16px 0 4px}
h4{font-size:11pt;color:#1d2433;margin:12px 0 2px}
h5{font-size:10.5pt;color:#555;margin:8px 0 2px}
h2,h3,h4,h5{page-break-after:avoid;break-after:avoid}
p{margin:4px 0 6px}ul,ol{margin:2px 0 8px;padding-left:20px}li{margin:1px 0}li>ul,li>ol{margin:1px 0 2px}
blockquote{margin:8px 0;padding:6px 10px;background:#eef4fb;border-left:4px solid #14508c;color:#1d2433}
blockquote p{margin:2px 0}
table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:9.8pt}td,th{border:1px solid #d4dae3;padding:4px 6px;vertical-align:top}
th{background:#f3f6fa;text-align:left}tr{page-break-inside:avoid}code{background:#f3f6fa;padding:0 3px;font-size:9.5pt}pre{white-space:pre-wrap}
hr{border:0;border-top:1px solid #d4dae3;margin:14px 0}"""

def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = os.path.abspath(sys.argv[1])
    text = open(src, encoding="utf-8").read()
    try:
        import markdown
        body = markdown.markdown(_fix_lists(text), extensions=["tables", "sane_lists"])
    except ImportError:
        body = "<pre>" + html.escape(text) + "</pre>"
    title = os.path.splitext(os.path.basename(src))[0]
    page = f"<!doctype html><meta charset='utf-8'><title>{html.escape(title)}</title><style>{CSS}</style>{body}"
    out = os.path.splitext(src)[0] + ".pdf"
    if not lib_render.html_to_pdf(page, out):
        sys.exit(lib_render.INSTALL_HINT)
    if "--hide-md" in sys.argv and sys.platform == "darwin":
        subprocess.run(["chflags", "hidden", src])
    print(f"OK: {out}")


if __name__ == "__main__":
    main()
