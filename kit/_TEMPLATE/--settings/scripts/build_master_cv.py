#!/usr/bin/env python3
"""Generator Master CV: dokumen baca lengkap, BOLEH berhalaman-halaman.

Beda dengan build_cv.py:
  - build_cv.py = CV lamaran, dikunci 1 halaman, isi di-tailor dari raw_facts per lowongan.
  - build_master_cv.py = semua isi lengkap untuk dibaca user. BUKAN sumber tailoring;
    tailoring tetap dari 01_user_documents/raw_facts_about_you.md.

.docx masih dari build_cv.build() (tanpa cek "harus 1 halaman"). PDF punya tampilan SENDIRI
(templates/master_cv/layout.html): dokumen arsip dengan kolom tanggal di kiri dan judul bagian
di samping, bukan tampilan CV lamaran. PDF dicetak lewat Chrome/Edge, tanpa Word/LibreOffice.

Cara pakai:
    python3 ./--settings/scripts/build_master_cv.py "01_user_documents/Master_CV/master_cv_content.json"
    ... --check            hanya periksa isi (tidak membuat file)
    ... --html keluar.html hanya tulis HTML (untuk pratinjau)

Hasil: .docx dan .pdf di folder yang sama dengan JSON-nya.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import html  # noqa: E402

import build_cv  # noqa: E402
import lib_placeholders  # noqa: E402
import lib_render  # noqa: E402

LAYOUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "templates", "master_cv", "layout.html")


def check(content):
    """Daftar masalah isi (kosong = layak dibuat). Dijalankan SETELAH scrub, jadi sisa <TAILOR> sudah kosong."""
    probs = []
    for k in ("output", "profile"):
        if not str(content.get(k, "")).strip():
            probs.append(f"'{k}' kosong.")
    secs = content.get("sections")
    if not isinstance(secs, list) or not secs:
        return probs + ["'sections' kosong."]
    for i, sec in enumerate(secs):
        t = sec.get("title", "")
        if not str(t).strip():
            probs.append(f"sections[{i}].title kosong.")
        if not sec.get("entries"):
            probs.append(f"Bagian '{t}' tidak punya entri; hapus bagiannya kalau memang kosong.")
        for j, ent in enumerate(sec.get("entries", [])):
            for k in ("role", "right"):
                if not str(ent.get(k, "")).strip():
                    probs.append(f"'{t}' entri {j + 1}: '{k}' kosong.")
            for b in ent.get("bullets", []):
                if not (isinstance(b, list) and len(b) == 2 and str(b[1]).strip()):
                    probs.append(f"'{t}' entri {j + 1}: bullet harus [judul, isi] dengan isi terisi.")
                    break
    if not content.get("skills"):
        probs.append("'skills' kosong.")
    return probs


def render_html(content):
    """PDF Master CV: kolom kiri tanggal/tempat, kolom kanan peran dan bullet, judul bagian di tepi."""
    e = html.escape
    photo_path = build_cv.resolve_photo(content)
    photo = ""
    if photo_path:
        photo = f'<img class="photo" src="{lib_render.image_data_uri(build_cv._prep_photo(photo_path))}" alt="">'
    contact = "".join(f'<span>{build_cv.linkify_html(line)}</span>' for line in content.get("contact", build_cv.CONTACT))
    secs = []
    for sec in content["sections"]:
        rows = []
        for ent in sec["entries"]:
            parts = [x.strip() for x in str(ent.get("right", "")).split("|")]
            dates = next((x for x in parts if any(c.isdigit() for c in x)), parts[-1] if parts else "")
            place = " / ".join(x for x in parts if x and x != dates)
            org = f'<div class="org">{e(ent["org"])}</div>' if ent.get("org") else ""
            ctx = f'<p class="ctx">{e(ent["context"])}</p>' if ent.get("context") else ""
            lis = "".join(f'<li>{"<b>" + e(l) + "</b> " if l else ""}{e(t)}</li>' for l, t in ent.get("bullets", []))
            ul = f"<ul>{lis}</ul>" if lis else ""
            rows.append(f'<div class="row"><div class="when"><b>{e(dates)}</b><span>{e(place)}</span></div>'
                        f'<div class="what"><h4>{e(ent["role"])}</h4>{org}{ctx}{ul}</div></div>')
        secs.append(f'<section><h2><span>{e(sec["title"])}</span></h2><div class="rows">{"".join(rows)}</div></section>')
    skills = "".join(f'<div class="sk"><b>{e(l)}</b><span>{e(t)}</span></div>' for l, t in content["skills"])
    with open(LAYOUT, encoding="utf-8") as f:
        tpl = f.read()
    name = content.get("name", build_cv.NAME)
    return lib_render.fill(tpl, {
        "DOC_TITLE": e(name), "NAME": e(name), "PHOTO": photo, "TAGLINE": e(content.get("tagline", "")),
        "CONTACT": contact, "PROFILE": e(content.get("profile", "")),
        "SECTIONS": "\n".join(secs),
        "SKILLS_TITLE": e(content.get("skills_title", "Skills & Certifications")),
        "SKILLS": skills,
    })


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--html" in sys.argv:  # nilai setelah --html bukan path JSON
        i = sys.argv.index("--html")
        args = [a for a in args if a != (sys.argv[i + 1] if i + 1 < len(sys.argv) else None)]
    if not args:
        sys.exit("pakai: python3 build_master_cv.py <path/master_cv_content.json> [--check] [--html keluar.html]")

    content_path = os.path.abspath(args[0])
    with open(content_path, encoding="utf-8") as f:
        content = json.load(f)
    lib_placeholders.cek_nama_output(content["output"])
    belum_diisi = lib_placeholders.scrub(content)
    if belum_diisi:
        print(f"! {len(belum_diisi)} field masih <TAILOR>, dikosongkan (mis. {belum_diisi[0]}).")

    probs = check(content)
    if probs:
        print(f"{len(probs)} masalah isi:")
        for x in probs:
            print("  -", x)
        sys.exit(1)
    if "--check" in sys.argv:
        print("OK: isi Master CV layak dibuat.")
        return
    if "--html" in sys.argv:
        i = sys.argv.index("--html")
        out = sys.argv[i + 1]
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(render_html(content))
        print(f"HTML OK -> {out}")
        return

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

    if not lib_render.html_to_pdf(render_html(content), pdf_path):
        sys.exit(lib_render.INSTALL_HINT)
    print(f"OK: {pdf_path} ({lib_render.count_pages(pdf_path)} halaman)")
    lib_render.hide_internal()


if __name__ == "__main__":
    main()
