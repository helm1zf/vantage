#!/usr/bin/env python3
"""Bangun JD.pdf dan Analisis_Fit_Gap.pdf (v2) dari JSON di satu folder 01_Analisis.

Cara pakai:
    python3 ./--settings/scripts/build_analisis.py "<folder 01_Analisis>"

Isi folder yang dibaca:
    JD.json                 ringkasan lowongan (templates/jd/content.json)
    JD.md                   teks asli lowongan, wortgleich; dicetak apa adanya di halaman 2 dst
    Analisis_Fit_Gap.json   analisis Arga (templates/fit_gap/content.json)
Yang ada saja yang dibangun. Hasil: JD.pdf, Analisis_Fit_Gap.pdf, Analisis_Fit_Gap.md
(versi teks untuk Bayu/Tari, dibuat dari JSON). Exit 1 kalau JSON tidak lolos cek.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import lib_render  # noqa: E402
import lib_schema  # noqa: E402

TPL = os.path.join(os.path.dirname(HERE), "templates")
MAKS = {"tugas": 40, "skill": 25, "bahasa": 15, "kontrak": 10, "nilai_tambah": 10}
NAMA_KOMP = {"tugas": "Tugas", "skill": "Skill", "bahasa": "Bahasa", "kontrak": "Kontrak", "nilai_tambah": "Nilai tambah"}
STATUS = {"ok": "Terpenuhi", "part": "Sebagian", "no": "Gap"}
AKSI = ("Lamar", "Tanya dulu", "Lewati")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

L = {
    "de": {"brand": "STELLENANZEIGE / JOB DESCRIPTION", "found": "gefunden", "source": "Quelle", "id": "Job-ID",
           "one": "In einem Satz", "tasks": "Aufgaben", "must": "Muss", "nice": "Von Vorteil", "dates": "Wichtige Daten",
           "foot1": "Oben: Zusammenfassung von Vantage. Ab Seite 2: Originaltext, unverändert.",
           "orig_user": "Originaltext, vom Nutzer eingefügt (unverändert)",
           "orig_web": "Originaltext der Stellenanzeige (unverändert)",
           "orig_note": "Wortgleich wie eingefügt; nur Website-Navigation und HTML-Reste entfernt. Nicht gekürzt, nicht übersetzt.",
           "pasted": "eingefügt am", "fetched": "abgerufen am", "none": "nicht genannt"},
    "en": {"brand": "JOB DESCRIPTION", "found": "found", "source": "Source", "id": "Job ID",
           "one": "In one sentence", "tasks": "Tasks", "must": "Must have", "nice": "Nice to have", "dates": "Key dates",
           "foot1": "Above: summary by Vantage. From page 2: original text, unchanged.",
           "orig_user": "Original text, pasted by the user (unchanged)",
           "orig_web": "Original text of the job ad (unchanged)",
           "orig_note": "Word for word as pasted; only site navigation and HTML leftovers removed. Not shortened, not translated.",
           "pasted": "pasted on", "fetched": "retrieved on", "none": "not stated"},
}


def e(s):
    return html.escape(str(s))


def rich(s):
    """Escape, lalu **teks** jadi <b>teks</b>."""
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", e(s))


def tgl(s):
    return f"{s[8:10]}.{s[5:7]}.{s[0:4]}" if DATE.match(str(s)) else str(s)


def layout(name, values):
    with open(os.path.join(TPL, name, "layout.html"), encoding="utf-8") as fh:
        return lib_render.fill(fh.read(), values)


# ---------- cek ----------

def validate_jd(d, original):
    err = []
    for k in ("bahasa", "asal", "posisi", "perusahaan", "ditemukan", "fakta", "ringkas", "aufgaben", "muss"):
        if k not in d or d[k] in ("", None, []):
            err.append(f"JD.json: '{k}' wajib diisi")
    if d.get("bahasa") not in L:
        err.append("JD.json: bahasa harus 'de' atau 'en'")
    if d.get("asal") not in ("user", "web"):
        err.append("JD.json: asal harus 'user' atau 'web'")
    if d.get("ditemukan") and not DATE.match(str(d["ditemukan"])):
        err.append("JD.json: ditemukan harus YYYY-MM-DD")
    f = d.get("fakta", [])
    if not isinstance(f, list) or len(f) != 8 or any(not isinstance(x, list) or len(x) != 2 for x in f):
        err.append("JD.json: fakta harus tepat 8 pasang [label, isi]")
    for k in ("aufgaben", "muss", "vorteil"):
        if k in d and not isinstance(d[k], list):
            err.append(f"JD.json: '{k}' harus daftar")
    for x in d.get("tanggal_penting", []):
        if not isinstance(x, list) or len(x) not in (2, 3):
            err.append("JD.json: tanggal_penting berisi [label, tanggal, catatan opsional]")
            break
    if original is None:
        err.append("JD.md (teks asli lowongan) tidak ada di folder ini")
    elif not original.strip():
        err.append("JD.md kosong; isinya harus teks asli lowongan")
    return err


def validate_fg(d):
    err = []
    for k in ("perusahaan", "posisi", "tanggal", "skor", "komponen", "aksi", "judul_verdict", "verdict", "syarat", "kesimpulan"):
        if k not in d or d[k] in ("", None, []):
            err.append(f"Analisis_Fit_Gap.json: '{k}' wajib diisi")
    if d.get("tanggal") and not DATE.match(str(d["tanggal"])):
        err.append("Analisis_Fit_Gap.json: tanggal harus YYYY-MM-DD")
    komp = d.get("komponen", {})
    maks = lib_schema.komponen_max(d)
    if set(komp) != set(maks):
        err.append("Analisis_Fit_Gap.json: komponen harus tepat " + ", ".join(maks))
    else:
        for k, m in maks.items():
            if not isinstance(komp[k], int) or not 0 <= komp[k] <= m:
                err.append(f"Analisis_Fit_Gap.json: komponen.{k} harus angka 0-{m}")
        if isinstance(d.get("skor"), int) and all(isinstance(v, int) for v in komp.values()) and sum(komp.values()) != d["skor"]:
            err.append(f"Analisis_Fit_Gap.json: skor {d['skor']} != jumlah komponen {sum(komp.values())}")
    if d.get("aksi") not in AKSI:
        err.append("Analisis_Fit_Gap.json: aksi harus salah satu dari " + ", ".join(AKSI))
    for i, r in enumerate(d.get("syarat", []), 1):
        if not isinstance(r, dict) or not r.get("syarat") or r.get("status") not in STATUS or r.get("jenis") not in ("Wajib", "Nilai tambah"):
            err.append(f"Analisis_Fit_Gap.json: syarat #{i} butuh syarat, jenis (Wajib/Nilai tambah), status (ok/part/no)")
        elif r["status"] in ("ok", "part") and not r.get("bukti"):
            err.append(f"Analisis_Fit_Gap.json: syarat #{i} berstatus {r['status']} tapi tanpa ID bukti")
    return err


# ---------- JD.pdf ----------

def jd_html(d, original):
    l = L[d["bahasa"]]
    sample = '<br><span class="sample">SAMPEL</span>' if d.get("_contoh") else ""
    sub = " · ".join(x for x in (d["perusahaan"], d.get("unit", ""), f'{l["id"]} {d["job_id"]}' if d.get("job_id") else "") if x)
    src = f'<br>{l["source"]}: {e(d["sumber"])}' if d.get("sumber") else ""
    facts = "".join(f'<div class="f"><span>{e(k)}</span><b>{e(v)}</b></div>' for k, v in d["fakta"])
    ul = lambda xs, cls="": f'<ul class="{cls}">' + "".join(f"<li>{rich(x)}</li>" for x in xs) + "</ul>"
    dates = "".join(
        f'<li>{e(x[0])}: {e(tgl(x[1]))}' + (f'<span class="tag">{e(x[2])}</span>' if len(x) > 2 and x[2] else "") + "</li>"
        for x in d.get("tanggal_penting", []))
    nice = d.get("vorteil") or [l["none"]]
    when = l["pasted"] if d["asal"] == "user" else l["fetched"]
    link = f' · <span>{e(d["link"])}</span>' if d.get("link") else ""
    body = f"""<header><div><div class="brand">VANTAGE · {l["brand"]}</div>
<h1>{e(d["posisi"])}</h1><div class="sub">{e(sub)}</div></div>
<div class="hd-r">{l["found"]} {e(tgl(d["ditemukan"]))}{src}{sample}</div></header>
<div class="facts">{facts}</div>
<div class="key"><b>{l["one"]}</b>{rich(d["ringkas"])}</div>
<h2 data-n="01">{l["tasks"]}</h2>{ul(d["aufgaben"])}
<div class="two"><div><h2 data-n="02">{l["must"]}</h2>{ul(d["muss"])}</div>
<div><h2 data-n="03">{l["nice"]}</h2>{ul(nice, "nice")}
{f'<h2 data-n="04">{l["dates"]}</h2><ul>{dates}</ul>' if dates else ""}</div></div>
<footer><span>{l["foot1"]}</span><span>1</span></footer>
<div class="pb"></div>
<h2 data-n="05">{l["orig_user"] if d["asal"] == "user" else l["orig_web"]}</h2>
<div class="orig-h">{l["orig_note"]}</div>
<div class="orig">{e(original.strip(chr(10)))}</div>
<footer><span>{when} {e(tgl(d["ditemukan"]))}{link}</span><span>JD.md</span></footer>"""
    return layout("jd", {"LANG": d["bahasa"], "DOC_TITLE": e(f'JD {d["perusahaan"]}'), "BODY": body})


# ---------- Analisis_Fit_Gap.pdf + .md ----------

def ambang_user(folder):
    """ambang_skor dari --usersettings/search_settings.json milik user (default 80)."""
    d = os.path.abspath(folder)
    for _ in range(6):
        p = os.path.join(d, "01_user_documents", "--usersettings", "search_settings.json")
        if os.path.isfile(p):
            try:
                v = json.load(open(p, encoding="utf-8")).get("ambang_skor")
                return v if isinstance(v, int) and 60 <= v <= 95 else 80
            except (OSError, ValueError):
                return 80
        d = os.path.dirname(d)
    return 80


AMBANG = 80


def kelas(skor, aksi):
    if aksi == "Lewati" or skor < AMBANG - 10:
        return "v-no"
    return "v-ok" if skor >= AMBANG and aksi == "Lamar" else "v-part"


def gap_li(x):
    if ":" in x:
        a, b = x.split(":", 1)
        return f"<li><b>{rich(a)}</b>:{rich(b)}</li>"
    return f"<li>{rich(x)}</li>"


def fg_html(d):
    sample = '<br><span class="sample">SAMPEL</span>' if d.get("_contoh") else ""
    bars = "".join(f'<div class="kb"><span>{NAMA_KOMP[k]}</span><i><em style="width:{d["komponen"][k] / m * 100:.0f}%"></em></i>'
                   f'<b>{d["komponen"][k]}/{m}</b></div>' for k, m in lib_schema.komponen_max(d).items())
    gaps = "".join(gap_li(x) for x in d.get("gap", [])) or "<li>Tidak ada gap yang tercatat.</li>"
    trs = "".join(f'<tr><td>{rich(r["syarat"])}</td><td>{e(r["jenis"])}</td><td class="id">{e(r.get("bukti") or "—")}</td>'
                  f'<td><span class="st {r["status"]}">{STATUS[r["status"]]}</span></td><td>{rich(r.get("catatan", ""))}</td></tr>'
                  for r in d["syarat"])
    oleh = f' oleh {e(d["oleh"])}' if d.get("oleh") else ""
    untuk = f'untuk {e(d["untuk"])}' if d.get("untuk") else ""
    sub = " · ".join(x for x in (d.get("sub", ""), f'dianalisis {tgl(d["tanggal"])}{oleh}') if x)
    lesson = f'<div class="lesson"><b>Pelajaran interview:</b> {rich(d["pelajaran_interview"])}</div>' if d.get("pelajaran_interview") else ""
    nxt = f'<div class="next"><b>Langkah berikutnya:</b> {rich(d["langkah"])}</div>' if d.get("langkah") else ""
    body = f"""<header><div><div class="brand">VANTAGE · ANALISIS FIT / GAP</div>
<h1>{e(d["perusahaan"])} · {e(d["posisi"])}</h1><div class="sub">{sub}</div></div>
<div class="hd-r">{untuk}{sample}</div></header>
<div class="verdict {kelas(d["skor"], d["aksi"])}"><div class="score">{d["skor"]}</div>
<div class="vt"><b>{e(d["judul_verdict"])}</b><div>{rich(d["verdict"])}</div></div><span class="act">{e(d["aksi"])}</span></div>
<div class="two" style="margin-top:8px"><div><h2 data-n="01">Rincian skor</h2>{bars}</div>
<div><h2 data-n="02">Gap yang jujur</h2><ul class="gap">{gaps}</ul></div></div>
{lesson}
<h2 data-n="03">Syarat JD → bukti</h2>
<table><tr><th>Syarat (dari JD)</th><th>Jenis</th><th>Bukti</th><th>Status</th><th>Catatan</th></tr>{trs}</table>
<h2 data-n="04">Kesimpulan</h2><div class="concl">{rich(d["kesimpulan"])}</div>
{nxt}
<footer><span>Rubrik sama dengan laporan pagi: Tugas 40 · Skill 25 · Bahasa 15 · Kontrak 10 · Nilai tambah 10 · ambang {AMBANG}</span><span>Analisis_Fit_Gap</span></footer>"""
    return layout("fit_gap", {"DOC_TITLE": e(f'Fit-Gap {d["perusahaan"]}'), "BODY": body})


def fg_md(d):
    cell = lambda s: str(s).replace("|", "/").replace("\n", " ")
    out = [f'# Analisis Fit/Gap: {d["perusahaan"]} · {d["posisi"]}', "",
           "<!-- Dibuat build_analisis.py dari Analisis_Fit_Gap.json. Jangan edit tangan; ubah JSON lalu bangun ulang. -->", "",
           f'- Tanggal: {d["tanggal"]}' + (f' · oleh {d["oleh"]}' if d.get("oleh") else ""),
           f'- **Skor: {d["skor"]}/100** · aksi: **{d["aksi"]}** · {d["judul_verdict"]}', f'- {d["verdict"]}', "",
           "## Rincian skor", "", "| Komponen | Nilai | Maks |", "|---|---|---|"]
    out += [f'| {NAMA_KOMP[k]} | {d["komponen"][k]} | {m} |' for k, m in lib_schema.komponen_max(d).items()]
    out += ["", "## Gap yang jujur", ""] + ([f"- {x}" for x in d.get("gap", [])] or ["- (tidak ada)"])
    if d.get("pelajaran_interview"):
        out += ["", f'Pelajaran interview: {d["pelajaran_interview"]}']
    out += ["", "## Syarat JD → bukti", "", "| Syarat (dari JD) | Jenis | Bukti | Status | Catatan |", "|---|---|---|---|---|"]
    out += [f'| {cell(r["syarat"])} | {r["jenis"]} | {cell(r.get("bukti") or "—")} | {STATUS[r["status"]]} | {cell(r.get("catatan", ""))} |'
            for r in d["syarat"]]
    out += ["", "## Kesimpulan", "", d["kesimpulan"]]
    if d.get("langkah"):
        out += ["", f'**Langkah berikutnya:** {d["langkah"]}']
    return "\n".join(out) + "\n"


def render(page, pdf_path, maks_hal=None):
    if not lib_render.html_to_pdf(page, pdf_path):
        print(lib_render.INSTALL_HINT)
        return False
    pages = lib_render.count_pages(pdf_path)
    print(f"PDF OK" + (f" ({pages} halaman)" if pages else "") + f" -> {pdf_path}")
    if maks_hal and pages and pages > maks_hal:
        print(f"PERINGATAN: lebih dari {maks_hal} halaman; pendekkan teks verdict/catatan/kesimpulan.")
    return True


def build(folder):
    global AMBANG
    folder = os.path.abspath(folder)
    AMBANG = ambang_user(folder)
    jd_json, jd_md = os.path.join(folder, "JD.json"), os.path.join(folder, "JD.md")
    fg_json = os.path.join(folder, "Analisis_Fit_Gap.json")
    if not os.path.isfile(jd_json) and not os.path.isfile(fg_json):
        print(f"GAGAL: tidak ada JD.json atau Analisis_Fit_Gap.json di {folder}")
        sys.exit(1)
    jobs, errors = [], []
    if os.path.isfile(jd_json):
        d = json.load(open(jd_json, encoding="utf-8"))
        original = open(jd_md, encoding="utf-8").read() if os.path.isfile(jd_md) else None
        errors += validate_jd(d, original)
        jobs.append(("jd", d, original))
    if os.path.isfile(fg_json):
        d = json.load(open(fg_json, encoding="utf-8"))
        errors += validate_fg(d)
        jobs.append(("fg", d, None))
    if errors:
        print("GAGAL, perbaiki JSON-nya dulu:")
        for x in errors:
            print("  x " + x)
        sys.exit(1)
    ok = True
    for kind, d, original in jobs:
        if kind == "jd":
            ok &= render(jd_html(d, original), os.path.join(folder, "JD.pdf"))
        else:
            with open(os.path.join(folder, "Analisis_Fit_Gap.md"), "w", encoding="utf-8") as fh:
                fh.write(fg_md(d))
            ok &= render(fg_html(d), os.path.join(folder, "Analisis_Fit_Gap.pdf"), maks_hal=1)
    lib_render.hide_internal()
    if not ok:
        sys.exit(2)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    build(sys.argv[1])
