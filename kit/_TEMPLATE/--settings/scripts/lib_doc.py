#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pustaka bersama untuk dokumen baca Vantage: About Item, Rencana Belajar, Interview Prep, Catatan Pengalaman.

Pola yang sama dengan Morning Report, CV, dan analisis fit/gap, jadi tiap jenis dokumen punya:
  sop/<jenis>.md                        aturan isi dan siapa yang membuat
  templates/<jenis>/content.json        contoh isi yang VALID (fiktif); salin lalu isi dari fakta user
  templates/<jenis>/layout.html         tampilan; tiap jenis sengaja punya tampilan sendiri
  scripts/build_<jenis>.py              cek isi, render HTML, ekspor PDF
Agent hanya mengisi content.json. Tampilan tidak pernah ditulis tangan, jadi hasilnya sama rapinya untuk semua user.

Dipakai oleh build_*.py, check_docs.py, dan verify_consistency.py (gerbang rilis).
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SETTINGS = os.path.dirname(HERE)
TPL = os.path.join(SETTINGS, "templates")
sys.path.insert(0, HERE)
import lib_render  # noqa: E402

# jenis dokumen -> (modul pembangun, berkas SOP). Satu tempat; verify_consistency memeriksa semuanya.
DOC_TYPES = {
    "about_item": ("build_about_item", "about_item.md"),
    "rencana_belajar": ("build_rencana_belajar", "rencana_belajar.md"),
    "interview_prep": ("build_interview_prep", "persiapan_interview.md"),
    "catatan_pengalaman": ("build_catatan_pengalaman", "catatan_pengalaman.md"),
}

# ---------- penyaji teks ----------


def e(s):
    return html.escape("" if s is None else str(s))


def inline(s):
    """Escape, lalu **tebal**, *miring* dan `kode`. Tidak ada HTML dari luar yang lolos."""
    t = e(s)
    t = re.sub(r"`([^`\n]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*\n]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"(?<![*\w])\*([^*\n]+)\*(?![*\w])", r"<i>\1</i>", t)
    return t


def paras(s):
    """Paragraf dipisah baris kosong; baris tunggal tetap satu paragraf."""
    return "".join(f"<p>{inline(p.strip())}</p>" for p in re.split(r"\n\s*\n", str(s or "")) if p.strip())


def ul(items, cls=""):
    items = [x for x in (items or []) if str(x).strip()]
    return f'<ul class="{cls}">' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>" if items else ""


def date_id(s):
    """2026-11-02 -> 2 Nov 2026 (kosong atau bukan tanggal: apa adanya)."""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", str(s or ""))
    if not m:
        return str(s or "")
    mon = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][int(m.group(2)) - 1]
    return f"{int(m.group(3))} {mon} {m.group(1)}"


# ---------- validasi isi ----------
# Aturan: {"t": "str|int|list|obj|bool", "req": True, "max": panjang/nilai maks, "min": nilai/jumlah min,
#          "enum": [...], "of": aturan item list, "f": {nama: aturan} untuk obj, "re": pola untuk str}

_PLACEHOLDER = re.compile(r"^\s*<[^<>]{2,}>\s*$|<TAILOR|<isi\b", re.I)
_ISO = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def S(**k):
    return dict(t="str", **k)


def N(**k):
    return dict(t="int", **k)


def L(of, **k):
    return dict(t="list", of=of, **k)


def O(f, **k):
    return dict(t="obj", f=f, **k)


def DATE(**k):
    return dict(t="str", re=_ISO.pattern, hint="YYYY-MM-DD", **k)


def validate(data, rule, path="$"):
    """Daftar pesan error (kosong = valid)."""
    t = rule["t"]
    req = rule.get("req", True)
    empty = data is None or (t == "str" and data == "") or (t == "list" and data == [])
    if empty:
        return [f"{path}: wajib diisi."] if req else []
    errs = []
    if t == "str":
        if not isinstance(data, str):
            return [f"{path}: harus teks."]
        if _PLACEHOLDER.search(data):
            errs.append(f"{path}: masih berisi penanda isi (<...>). Isi dari fakta user.")
        if rule.get("max") and len(data) > rule["max"]:
            errs.append(f"{path}: {len(data)} karakter, maksimal {rule['max']}.")
        if rule.get("enum") and data not in rule["enum"]:
            errs.append(f"{path}: '{data}' bukan salah satu {', '.join(rule['enum'])}.")
        if rule.get("re") and not re.match(rule["re"], data):
            errs.append(f"{path}: format harus {rule.get('hint', rule['re'])}.")
    elif t == "int":
        if not isinstance(data, int) or isinstance(data, bool):
            return [f"{path}: harus angka bulat."]
        if "min" in rule and data < rule["min"]:
            errs.append(f"{path}: {data} kurang dari {rule['min']}.")
        if "max" in rule and data > rule["max"]:
            errs.append(f"{path}: {data} lebih dari {rule['max']}.")
    elif t == "bool":
        if not isinstance(data, bool):
            errs.append(f"{path}: harus true atau false.")
    elif t == "list":
        if not isinstance(data, list):
            return [f"{path}: harus list."]
        if rule.get("max") and len(data) > rule["max"]:
            errs.append(f"{path}: {len(data)} butir, maksimal {rule['max']}.")
        if rule.get("min") and len(data) < rule["min"]:
            errs.append(f"{path}: {len(data)} butir, minimal {rule['min']}.")
        for i, x in enumerate(data):
            errs += validate(x, rule["of"], f"{path}[{i}]")
    elif t == "obj":
        if not isinstance(data, dict):
            return [f"{path}: harus objek."]
        for k, r in rule["f"].items():
            errs += validate(data.get(k), r, f"{path}.{k}")
    return errs


def validate_doc(data, spec, tipe):
    if not isinstance(data, dict):
        return ["Berkas harus berupa objek JSON."]
    if data.get("_tipe") != tipe:
        return [f"_tipe harus \"{tipe}\" (salin templates/{tipe}/content.json)."]
    if data.get("_versi") != 1:
        return ['_versi harus 1.']
    return validate(data, O(spec))


# ---------- berkas dan PDF ----------


def load_json(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        sys.exit(f"Tidak ketemu: {path}")
    except json.JSONDecodeError as exc:
        sys.exit(f"{path}: bukan JSON yang valid ({exc}).")


def layout(name, values):
    with open(os.path.join(TPL, name, "layout.html"), encoding="utf-8") as fh:
        page = lib_render.fill(fh.read(), values)
    return page


def leftover(page):
    """Penanda {{...}} yang tidak terisi (tanda layout dan pembangun tidak sinkron)."""
    return sorted(set(re.findall(r"\{\{[A-Z_]+\}\}", page)))


def export(page, pdf_path, maks_hal=None):
    if not lib_render.html_to_pdf(page, pdf_path):
        print(lib_render.INSTALL_HINT)
        return False
    pages = lib_render.count_pages(pdf_path)
    print("PDF OK" + (f" ({pages} halaman)" if pages else "") + f" -> {pdf_path}")
    if maks_hal and pages and pages > maks_hal:
        print(f"PERINGATAN: {pages} halaman, targetnya maksimal {maks_hal}. Pendekkan teks.")
    return True


def cli(tipe, spec, render, maks_hal=None):
    """Perintah standar semua pembangun:
         python3 build_<jenis>.py <content.json> [--check] [--html keluaran.html]
       Tanpa opsi: cek isi lalu tulis PDF di samping JSON (nama sama, ekstensi .pdf)."""
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(f"pakai: python3 build_{tipe}.py <content.json> [--check] [--html keluaran.html]")
    path = args[0]
    data = load_json(path)
    errs = validate_doc(data, spec, tipe)
    if errs:
        print(f"{path}: {len(errs)} masalah, PDF tidak dibuat:")
        for x in errs:
            print("  -", x)
        sys.exit(1)
    if "--check" in sys.argv:
        print(f"OK: {path} valid.")
        return
    page = render(data)
    miss = leftover(page)
    if miss:
        sys.exit("Layout belum terisi penuh: " + ", ".join(miss))
    if "--html" in sys.argv:
        i = sys.argv.index("--html")
        out = sys.argv[i + 1] if i + 1 < len(sys.argv) else os.path.splitext(path)[0] + ".html"
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(page)
        print(f"HTML OK -> {out}")
        return
    if not export(page, os.path.splitext(path)[0] + ".pdf", maks_hal):
        sys.exit(1)


# ---------- pemeriksaan template (dipanggil verify_consistency) ----------


def selfcheck(settings=None):
    """Untuk tiap jenis dokumen: SOP, layout, contoh isi, pembangun ada; contoh valid; layout terisi penuh.
    Return list (nama, [masalah])."""
    settings = settings or SETTINGS
    out = []
    for tipe, (mod, sop) in DOC_TYPES.items():
        probs = []
        tdir = os.path.join(settings, "templates", tipe)
        for rel, label in [(os.path.join("sop", sop), f"sop/{sop}"), (os.path.join("templates", tipe, "layout.html"), f"templates/{tipe}/layout.html"),
                           (os.path.join("templates", tipe, "content.json"), f"templates/{tipe}/content.json"),
                           (os.path.join("scripts", mod + ".py"), f"scripts/{mod}.py")]:
            if not os.path.isfile(os.path.join(settings, rel)):
                probs.append(f"{label} tidak ada")
        if not probs:
            try:
                sys.path.insert(0, os.path.join(settings, "scripts"))
                m = __import__(mod)
                with open(os.path.join(tdir, "content.json"), encoding="utf-8") as fh:
                    sample = json.load(fh)
                errs = validate_doc(sample, m.SPEC, tipe)
                probs += [f"contoh isi: {x}" for x in errs[:3]]
                if not errs:
                    page = m.render_html(sample)
                    left = leftover(page)
                    if left:
                        probs.append("layout punya penanda yang tidak terisi: " + ", ".join(left))
            except Exception as exc:  # noqa: BLE001
                probs.append(f"pembangun gagal: {type(exc).__name__}: {exc}")
        out.append((tipe, probs))
    return out
