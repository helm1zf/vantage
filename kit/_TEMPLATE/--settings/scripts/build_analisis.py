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
    if d.get("bahasa") not in (None, "", "id", "en", "de"):
        err.append("Analisis_Fit_Gap.json: bahasa harus id, en, atau de")
    if d.get("aksi") not in AKSI:
        err.append("Analisis_Fit_Gap.json: aksi harus salah satu dari " + ", ".join(AKSI))
    for i, r in enumerate(d.get("syarat", []), 1):
        if not isinstance(r, dict) or not r.get("syarat") or r.get("status") not in STATUS or r.get("jenis") not in ("Wajib", "Nilai tambah"):
            err.append(f"Analisis_Fit_Gap.json: syarat #{i} butuh syarat, jenis (Wajib/Nilai tambah), status (ok/part/no)")
        elif len(str(r.get("bukti_nama") or "")) > 40:
            err.append(f"Analisis_Fit_Gap.json: syarat #{i} bukti_nama lebih dari 40 karakter")
        elif r["status"] in ("ok", "part") and not r.get("bukti"):
            err.append(f"Analisis_Fit_Gap.json: syarat #{i} berstatus {r['status']} tapi tanpa ID bukti")
    return err


# ---------- JD.pdf ----------

DEADLINE_WORDS = ("frist", "deadline", "tenggat", "bewerbungsschluss", "closing", "apply by", "batas")
BRAND = '<div class="brand"><i>V</i>VANTAGE · {}</div>'


def fit_box(fg, lang):
    """Baris skor Fit/Gap di JD.pdf, kalau analisisnya sudah ada di folder yang sama dan lolos cek."""
    if not fg or validate_fg(fg):
        return ""
    f = F.get(lang, F["en"])
    k = kelas(fg["skor"], fg["aksi"])
    cls = {"v-ok": "", "v-part": "mid", "v-no": "no"}[k]
    return (f'<div class="box fit"><div class="n {cls}">{fg["skor"]}</div><div class="t"><b>{f["your_fit"]}: {e(fg["judul_verdict"])}</b> '
            f'<span class="mut">{f["see_fg"]}</span></div><div class="a"><span class="tag {"go" if k == "v-ok" else ""}">{e(f["aksi"][fg["aksi"]])}</span></div></div>')


def jd_html(d, original, fg=None):
    l = L[d["bahasa"]]
    sample = ' <span class="sample">SAMPEL</span>' if d.get("_contoh") else ""
    sub = " · ".join(x for x in (d["perusahaan"], d.get("unit", ""), f'{l["id"]} {d["job_id"]}' if d.get("job_id") else "") if x)
    src = f'<br>{l["source"]}: {e(d["sumber"])}' if d.get("sumber") else ""
    link = d.get("link") or ""
    link_head = f'<br><a href="{e(link)}">{e(link.split("//")[-1][:60])}</a>' if link.startswith("http") else ""
    hl = lambda k: ' class="hl"' if any(w in str(k).lower() for w in DEADLINE_WORDS) else ""
    facts = "".join(f'<div{hl(k)}><span class="cap">{e(k)}</span><b>{e(v)}</b></div>' for k, v in d["fakta"])
    ul = lambda xs, cls="": f'<ul class="{cls}">' + "".join(f"<li>{rich(x)}</li>" for x in xs) + "</ul>"
    dates = "".join(
        f'<li>{e(x[0])}: <b>{e(tgl(x[1]))}</b>' + (f' <span class="tag plain">{e(x[2])}</span>' if len(x) > 2 and x[2] else "") + "</li>"
        for x in d.get("tanggal_penting", []))
    nice = d.get("vorteil") or [l["none"]]
    when = l["pasted"] if d["asal"] == "user" else l["fetched"]
    link_foot = f' · <span>{e(link)}</span>' if link else ""
    body = f"""<header><div>{BRAND.format(l["brand"])}
<h1>{e(d["posisi"])}</h1><div class="sub">{e(sub)}</div></div>
<div class="hd-r">{l["found"]} <b>{e(tgl(d["ditemukan"]))}</b>{sample}{src}{link_head}</div></header>
<div class="facts">{facts}</div>
<div class="note sun"><span class="cap">{l["one"]}</span>{rich(d["ringkas"])}</div>
<h2 data-n="01">{l["tasks"]}</h2>{ul(d["aufgaben"])}
<div class="two"><div><h2 data-n="02">{l["must"]}</h2>{ul(d["muss"])}</div>
<div><h2 data-n="03">{l["nice"]}</h2>{ul(nice, "nice")}
{f'<h2 data-n="04">{l["dates"]}</h2><ul>{dates}</ul>' if dates else ""}</div></div>
{fit_box(fg, d["bahasa"])}
<footer><span>{l["foot1"]}</span><span>1</span></footer>
<div class="pb"></div>
<header><div>{BRAND.format(l["brand"])}<div class="sub" style="margin-top:6px"><b>{l["orig_user"] if d["asal"] == "user" else l["orig_web"]}</b></div></div>
<div class="hd-r">{when} <b>{e(tgl(d["ditemukan"]))}</b></div></header>
<div class="orig-h">{l["orig_note"]}</div>
<div class="orig">{e(original.strip(chr(10)))}</div>
<footer><span>{when} {e(tgl(d["ditemukan"]))}{link_foot}</span><span>JD.md</span></footer>"""
    return layout("jd", {"LANG": d["bahasa"], "DOC_TITLE": e(f'JD {d["perusahaan"]}'), "BETON": lib_render.beton_css(), "BODY": body})


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

# Teks tetap Analisis_Fit_Gap.pdf per bahasa (field `bahasa` di JSON: id, en, de; bawaan id). Isi ditulis Arga dalam bahasa yang sama.
F = {
    "id": dict(brand="ANALISIS FIT / GAP", untuk="untuk", oleh="oleh", dianalisis="dianalisis", dari="DARI 100", sampel="SAMPEL",
               s1="Rincian skor", s2="Gap yang jujur", s3="Syarat iklan → buktimu", s4="Kesimpulan", lesson="Pelajaran interview", nxt="Langkah berikutnya",
               th=["Syarat (dari iklan)", "Jenis", "Buktimu", "Status", "Catatan"], no_gap="Tidak ada gap yang tercatat.", none="tidak ada",
               komp=["Tugas", "Skill", "Bahasa", "Kontrak", "Nilai tambah"], status={"ok": "Terpenuhi", "part": "Sebagian", "no": "Gap"},
               jenis={"Wajib": "Wajib", "Nilai tambah": "Nilai tambah"}, aksi={"Lamar": "Lamar", "Tanya dulu": "Tanya dulu", "Lewati": "Lewati"},
               rubrik="Ambang {} · bobot sama dengan Laporan Pagi", foot="Nama bukti dari bahanmu; ID = file yang dibuka.",
               your_fit="Kecocokanmu", see_fg="Lihat Analisis_Fit_Gap.pdf di folder yang sama."),
    "en": dict(brand="FIT / GAP ANALYSIS", untuk="for", oleh="by", dianalisis="analysed", dari="OF 100", sampel="SAMPLE",
               s1="Score breakdown", s2="Honest gaps", s3="Requirement against your evidence", s4="Conclusion", lesson="Interview lesson", nxt="Next step",
               th=["Requirement (from the ad)", "Type", "Your evidence", "Status", "Note"], no_gap="No gaps recorded.", none="none",
               komp=["Tasks", "Skills", "Language", "Contract", "Extras"], status={"ok": "Met", "part": "Partly", "no": "Gap"},
               jenis={"Wajib": "Must", "Nilai tambah": "Nice to have"}, aksi={"Lamar": "Apply", "Tanya dulu": "Ask first", "Lewati": "Skip"},
               rubrik="Threshold {} · same weights as the Morning Report", foot="Evidence names come from your materials; the ID is the file to open.",
               your_fit="Your fit", see_fg="See Analisis_Fit_Gap.pdf in the same folder."),
    "de": dict(brand="FIT-/GAP-ANALYSE", untuk="für", oleh="von", dianalisis="analysiert am", dari="VON 100", sampel="BEISPIEL",
               s1="Punkte im Detail", s2="Ehrliche Lücken", s3="Anforderung und dein Nachweis", s4="Fazit", lesson="Lehre aus dem Interview", nxt="Nächster Schritt",
               th=["Anforderung (aus der Anzeige)", "Art", "Dein Nachweis", "Status", "Notiz"], no_gap="Keine Lücken notiert.", none="keiner",
               komp=["Aufgaben", "Skills", "Sprache", "Vertrag", "Pluspunkte"], status={"ok": "Erfüllt", "part": "Teilweise", "no": "Lücke"},
               jenis={"Wajib": "Muss", "Nilai tambah": "Von Vorteil"}, aksi={"Lamar": "Bewerben", "Tanya dulu": "Erst klären", "Lewati": "Auslassen"},
               rubrik="Schwelle {} · gleiche Gewichte wie im Morning Report", foot="Nachweisnamen stammen aus deinen Unterlagen; die ID ist die Datei dazu.",
               your_fit="Deine Passung", see_fg="Siehe Analisis_Fit_Gap.pdf im selben Ordner."),
}


def kelas(skor, aksi):
    if aksi == "Lewati" or skor < AMBANG - 10:
        return "v-no"
    return "v-ok" if skor >= AMBANG and aksi == "Lamar" else "v-part"


def gap_note(x):
    if ":" in x:
        a, b = x.split(":", 1)
        return f'<div class="note rose"><b>{rich(a)}</b>{rich(b)}</div>'
    return f'<div class="note rose">{rich(x)}</div>'


def fg_html(d):
    lang = d.get("bahasa") if d.get("bahasa") in F else "id"
    f = F[lang]
    sample = f' <span class="sample">{f["sampel"]}</span>' if d.get("_contoh") else ""
    bars = "".join(f'<div class="bar"><span>{lab}</span><i><em style="width:{d["komponen"][k] / m * 100:.0f}%"></em></i>'
                   f'<b>{d["komponen"][k]}/{m}</b></div>' for (k, m), lab in zip(lib_schema.komponen_max(d).items(), f["komp"]))
    gaps = "".join(gap_note(x) for x in d.get("gap", [])) or f'<p class="none">{f["no_gap"]}</p>'
    tagc = {"ok": "mint", "part": "sun", "no": "rose"}

    def bukti(r):
        bid, nama = r.get("bukti") or "", r.get("bukti_nama") or ""
        if not bid and not nama:
            return f'<td class="mut">{f["none"]}</td>'
        if nama:
            return f'<td class="id"><b>{e(nama)}</b>' + (f"<small>{e(bid)}</small>" if bid else "") + "</td>"
        return f'<td class="id"><b>{e(bid)}</b></td>'

    trs = "".join(f'<tr><td>{rich(r["syarat"])}</td><td>{e(f["jenis"][r["jenis"]])}</td>{bukti(r)}'
                  f'<td><span class="tag {tagc[r["status"]]}">{f["status"][r["status"]]}</span></td><td>{rich(r.get("catatan", ""))}</td></tr>'
                  for r in d["syarat"])
    who = " · ".join(x for x in (f'{f["untuk"]} <b>{e(d["untuk"])}</b>' if d.get("untuk") else "", f'{f["oleh"]} <b>{e(d["oleh"])}</b>' if d.get("oleh") else "") if x)
    k = kelas(d["skor"], d["aksi"])
    cls = {"v-ok": "", "v-part": "mid", "v-no": "no"}[k]
    lesson = f'<div class="note paper"><span class="cap">{f["lesson"]}</span>{rich(d["pelajaran_interview"])}</div>' if d.get("pelajaran_interview") else ""
    nxt = f'<div class="note ink"><span class="cap">{f["nxt"]}</span>{rich(d["langkah"])}</div>' if d.get("langkah") else ""
    body = f"""<header><div>{BRAND.format(f["brand"])}
<h1>{e(d["perusahaan"])}</h1><div class="sub">{e(" · ".join(x for x in (d["posisi"], d.get("sub", "")) if x))}</div></div>
<div class="hd-r">{who}{sample}<br>{f["dianalisis"]} <b>{tgl(d["tanggal"])}</b></div></header>
<section class="box verdict"><div class="sc {cls}"><b>{d["skor"]}</b><span>{f["dari"]}</span></div>
<div class="tx"><b>{e(d["judul_verdict"])}</b><p>{rich(d["verdict"])}</p></div><div class="ac {cls}">{e(f["aksi"][d["aksi"]]).upper()}</div></section>
<div class="two"><div><h2 data-n="01">{f["s1"]}</h2><div class="bars">{bars}</div>
<p class="mut" style="font-size:7.8pt;margin-top:6px">{f["rubrik"].format(AMBANG)}</p></div>
<div><h2 data-n="02">{f["s2"]}</h2><div class="gaps">{gaps}</div></div></div>
{lesson}
<h2 data-n="03">{f["s3"]}</h2>
<div class="tb"><table><tr>{"".join(f"<th>{x}</th>" for x in f["th"])}</tr>{trs}</table></div>
<div class="note paper"><span class="cap">{f["s4"]}</span>{rich(d["kesimpulan"])}</div>
{nxt}
<footer><span>{f["foot"]}</span><span>Analisis_Fit_Gap</span></footer>"""
    return layout("fit_gap", {"LANG": lang, "DOC_TITLE": e(f'Fit-Gap {d["perusahaan"]}'), "BETON": lib_render.beton_css(), "BODY": body})


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
            fg = next((x for kk, x, _ in jobs if kk == "fg"), None)
            ok &= render(jd_html(d, original, fg), os.path.join(folder, "JD.pdf"))
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
