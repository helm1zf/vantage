#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pembuat Laporan Pagi v2 (sop/laporan_pagi.md). Satu-satunya sumber: JSON laporan.

Cara pakai:
    python3 ./--settings/scripts/build_laporan_pagi.py "02_workflow/Laporan_Pagi/YYYY-MM-DD/YYYY-MM-DD_Laporan_Pagi.json"
Hasil di folder yang sama:
    <nama>.html + <nama>.pdf   laporan A4 bergaya Beton, 5 rekomendasi per halaman; mulai 4 rekomendasi bagian lain di halaman sesudahnya (templates/laporan_pagi/layout.html + templates/_shared/beton.css)
    00_README.md               ringkasan Markdown dengan bagian dan tabel tetap (jangan ditulis tangan)
    <nama>_pesan_inbox.md      pesan untuk chat, kirim apa adanya

Sebelum membangun, JSON wajib lolos check_report.py (struktur, skor, link, tanggal, label). Gagal = exit 1,
tidak ada file yang ditulis. Kalau Chrome/Edge tidak ada, PDF tidak dibuat; HTML, README, dan pesan
Inbox tetap jadi.
"""

import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import html
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import check_report  # noqa: E402
import lib_render  # noqa: E402
import lib_schema  # noqa: E402

TEMPLATE_HTML = os.path.join(HERE, "..", "templates", "laporan_pagi", "layout.html")

# Teks tetap per bahasa laporan (isi lowongan ditulis agent dalam bahasa yang sama).
L = {
    "id": dict(
        fit="COCOK", dari100="/ 100", cari="Cara {} mencari", brand="VANTAGE · LAPORAN PAGI", dari="dari", untuk="untuk", ambang="ambang skor", sampel="SAMPEL",
        hari=["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"],
        bulan=["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
        fokus="Fokus hari ini", hasil="Hasil", cara="Cara {} mencari hari ini", kw="Kata kunci", lok="Lokasi", fil="Filter",
        src="Sumber", src_note="(link yang dikirim selalu situs karier resmi)",
        src_note_agg="(situs karier resmi; bertanda 'hanya agregator' = iklan resminya tidak ketemu)",
        iklan_agg="Hanya agregator", agg_tag="hanya agregator", gagal="Tidak bisa dicek",
        gagal_none="tidak ada, semua sumber jalan", ubah='Cara carinya salah? Balas "ubah pencarian: …".',
        corong=["ditemukan", "lolos saring", "link resmi OK", "dianalisis", "direkomendasikan"],
        s1="Perlu aksi kamu", s2="Rekomendasi", s2_sub="skor ≥{}, maks {} · urut skor", s3="Hampir masuk",
        s3_sub="skor {}–{}", s4="Dilewati", s5="Pola gap minggu ini", s6="Catatan pasar",
        tidak_ada="Tidak ada.", tidak_ada_hari="Tidak ada hari ini.",
        kosong="Tidak ada lowongan baru ≥{} hari ini ({} iklan dicek).",
        hari_ini="hari ini", besok="besok", lagi="{} hari lagi", lalu="{} hari lalu", sejak="sejak {}",
        hilang="hilang dalam {} hari",
        jenis=dict(belum_dijawab="Belum dijawab", follow_up="Follow-up", deadline="Deadline",
                   interview="Interview", mulai_kerja="Mulai kerja", dokumen="Dokumen"),
        skor="skor", lamar_dalam="lamar dalam", diposting="diposting", tanpa_dl="tanpa deadline di iklan",
        tutup="tutup {} · {} hari", riwayat="Riwayat", belum_pernah="Belum pernah melamar di sini",
        cocok="Cocok", gap="Gap", aksi="Aksi", iklan="Iklan resmi", butuh="Butuh", menit="menit",
        komp=["Tugas", "Skill", "Bahasa", "Kontrak", "Nilai +"],
        dilewati="{} iklan dilewati: {} link resmi tidak ketemu · {} sudah ada di tracker · {} sudah muncul di "
                 "laporan sebelumnya · {} skor di bawah {}", lainnya=" · {} lainnya ({})",
        gap_line="<b>{}</b> diminta di {} dari {} iklan", gap_note='Balas "rencana belajar" untuk langkahnya.',
        gap_none="Belum ada pola (butuh ≥2 kemunculan dalam 7 hari).",
        warn="⚠️ Laporan belum lengkap. Bagian yang kosong menyusul di run berikutnya.",
        footer='Balas <b>"gas nomor N"</b> untuk mulai lamaran · skor terasa salah? Balas <b>👍N</b> / <b>👎N</b>',
        bobot="Bobot: T40 · S25 · B15 · K10 · N10",
        aksi_label={"Lamar": "Lamar", "Analisis": "Analisis", "Lewati": "Lewati"},
        readme_rec="| # | Perusahaan | Posisi | Jenis | Kota (perjalanan) | Skor | T/S/B/K/N | Diposting | Deadline | Butuh | Riwayat | Link | Aksi |",
    ),
    "en": dict(
        fit="FIT", dari100="/ 100", cari="How {} searched", brand="VANTAGE · MORNING REPORT", dari="from", untuk="for", ambang="score threshold", sampel="SAMPLE",
        hari=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        bulan=["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        fokus="Focus today", hasil="Result", cara="How {} searched today", kw="Keywords", lok="Locations", fil="Filters",
        src="Sources", src_note="(links sent are always official career sites)",
        src_note_agg="(official career sites; 'aggregator only' = no official posting was found)",
        iklan_agg="Aggregator only", agg_tag="aggregator only", gagal="Could not check",
        gagal_none="none, all sources worked", ubah='Search looks wrong? Reply "change search: …".',
        corong=["found", "passed screening", "official link OK", "analysed", "recommended"],
        s1="Needs your action", s2="Recommendations", s2_sub="score ≥{}, max {} · by score", s3="Near misses",
        s3_sub="score {}–{}", s4="Skipped", s5="Gap pattern this week", s6="Market note",
        tidak_ada="None.", tidak_ada_hari="None today.",
        kosong="No new postings ≥{} today ({} postings checked).",
        hari_ini="today", besok="tomorrow", lagi="in {} days", lalu="{} days ago", sejak="since {}",
        hilang="disappears in {} days",
        jenis=dict(belum_dijawab="Not answered", follow_up="Follow-up", deadline="Deadline",
                   interview="Interview", mulai_kerja="Start date", dokumen="Documents"),
        skor="score", lamar_dalam="apply in", diposting="posted", tanpa_dl="no deadline stated",
        tutup="closes {} · {} days", riwayat="History", belum_pernah="Never applied here",
        cocok="Fit", gap="Gap", aksi="Action", iklan="Official posting", butuh="Needs", menit="min",
        komp=["Tasks", "Skills", "Language", "Contract", "Extras"],
        dilewati="{} postings skipped: {} official link not found · {} already in tracker · {} already in an "
                 "earlier report · {} score below {}", lainnya=" · {} other ({})",
        gap_line="<b>{}</b> requested in {} of {} postings", gap_note='Reply "learning plan" for next steps.',
        gap_none="No pattern yet (needs ≥2 occurrences in 7 days).",
        warn="⚠️ Report incomplete. Missing parts follow in the next run.",
        footer='Reply <b>"go N"</b> to start an application · score feels wrong? Reply <b>👍N</b> / <b>👎N</b>',
        bobot="Weights: T40 · S25 · L15 · C10 · E10",
        aksi_label={"Lamar": "Apply", "Analisis": "Analyse", "Lewati": "Skip"},
        readme_rec="| # | Company | Role | Type | City (travel) | Score | T/S/L/C/E | Posted | Deadline | Needs | History | Link | Action |",
    ),
    "de": dict(
        fit="FIT", dari100="/ 100", cari="So hat {} gesucht", brand="VANTAGE · MORNING REPORT", dari="von", untuk="für", ambang="Schwelle", sampel="BEISPIEL",
        hari=["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
        bulan=["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
        fokus="Fokus heute", hasil="Ergebnis", cara="So hat {} heute gesucht", kw="Suchbegriffe", lok="Orte", fil="Filter",
        src="Quellen", src_note="(gesendete Links führen immer zur offiziellen Karriereseite)",
        src_note_agg="(offizielle Karriereseiten; 'nur Jobbörse' = keine offizielle Anzeige gefunden)",
        iklan_agg="Nur Jobbörse", agg_tag="nur Jobbörse", gagal="Nicht prüfbar",
        gagal_none="nichts, alle Quellen liefen", ubah='Suche falsch? Antworte "Suche ändern: …".',
        corong=["gefunden", "vorgefiltert", "Link geprüft", "analysiert", "empfohlen"],
        s1="Braucht dich", s2="Empfehlungen", s2_sub="ab {} Punkten, max. {} · beste zuerst", s3="Knapp daneben",
        s3_sub="{}–{} Punkte", s4="Ausgelassen", s5="Lückenmuster dieser Woche", s6="Marktnotiz",
        tidak_ada="Nichts.", tidak_ada_hari="Heute nichts.",
        kosong="Heute keine neuen Anzeigen ab {} Punkten ({} Anzeigen geprüft).",
        hari_ini="heute", besok="morgen", lagi="in {} Tagen", lalu="vor {} Tagen", sejak="seit {}",
        hilang="verschwindet in {} Tagen",
        jenis=dict(belum_dijawab="Unbeantwortet", follow_up="Nachfassen", deadline="Frist",
                   interview="Interview", mulai_kerja="Startdatum", dokumen="Unterlagen"),
        skor="Punkte", lamar_dalam="Bewerbung auf", diposting="online seit", tanpa_dl="keine Frist genannt",
        tutup="Frist {} · {} Tage", riwayat="Verlauf", belum_pernah="Hier noch nie beworben",
        cocok="Passt", gap="Lücke", aksi="Aktion", iklan="Offizielle Anzeige", butuh="Braucht", menit="Min.",
        komp=["Aufgaben", "Skills", "Sprache", "Vertrag", "Plus"],
        dilewati="{} Anzeigen ausgelassen: {} ohne offiziellen Link · {} schon im Tracker · {} schon in einem "
                 "früheren Bericht · {} unter {} Punkten", lainnya=" · {} sonstige ({})",
        gap_line="<b>{}</b> verlangt in {} von {} Anzeigen", gap_note='Antworte "Lernplan" für die nächsten Schritte.',
        gap_none="Noch kein Muster (braucht ≥2 Treffer in 7 Tagen).",
        warn="⚠️ Bericht unvollständig. Fehlende Teile folgen im nächsten Lauf.",
        footer='Antworte <b>"los N"</b>, um eine Bewerbung zu starten · Punktzahl wirkt falsch? Antworte <b>👍N</b> / <b>👎N</b>',
        bobot="Gewichte: A40 · S25 · Sp15 · V10 · P10",
        aksi_label={"Lamar": "Bewerben", "Analisis": "Prüfen", "Lewati": "Auslassen"},
        readme_rec="| # | Firma | Stelle | Art | Ort (Anfahrt) | Punkte | A/S/Sp/V/P | Online seit | Frist | Braucht | Verlauf | Link | Aktion |",
    ),
}


# Laporan lama yang dikonversi (dikonversi_dari_lama: true): hanya isi laporan lama, sisanya "-".
LG = {
    "id": dict(banner="DIKONVERSI DARI FORMAT LAMA", flag="DIKONVERSI", deadline="deadline", note="Catatan konversi", asli="Laporan asli", lewat="sudah lewat",
               rec_sub="seperti di laporan asli", catatan="Status", tanpa_vonis="tidak dinilai",
               s6="Catatan dari laporan asli", hampir_sub="seperti di laporan asli",
               readme_rec="| # | Perusahaan | Posisi | Jenis | Kota | Skor | Diposting | Link | Catatan laporan asli |",
               legacy_link="link LinkedIn (lama)", footer="Laporan ini hasil konversi: tidak ada pencarian atau penilaian baru."),
    "en": dict(banner="CONVERTED FROM THE OLD FORMAT", flag="CONVERTED", deadline="deadline", note="Conversion note", asli="Original report", lewat="past",
               rec_sub="as in the original report", catatan="Status", tanpa_vonis="not assessed",
               s6="Notes from the original report", hampir_sub="as in the original report",
               readme_rec="| # | Company | Role | Type | City | Score | Posted | Link | Original report note |",
               legacy_link="LinkedIn link (legacy)", footer="This report was converted: no new search or scoring was done."),
}
DASH = "-"
PER_PAGE = 5          # kartu rekomendasi per halaman PDF
ZOOMS = (1.0, 0.95, 0.9, 0.85, 0.8, 0.75)


def e(s):
    return html.escape(str(s if s is not None else ""), quote=True)


def host(u):
    return str(u).split("//")[-1].split("/")[0].replace("www.", "")


class Report:
    def __init__(self, data):
        self.d = data
        self.t = date.fromisoformat(data["tanggal"])
        self.l = L.get(data.get("bahasa"), L["id"])
        # Green score = high enough for "Lamar": threshold + 5 (default 80 -> 85). Old converted reports: 80.
        self.lamar = min(100, int(data.get("ambang_skor") or 80) + 5)
        self.recs = data["rekomendasi"] if data.get("dikonversi_dari_lama") is True else sorted(data["rekomendasi"], key=lambda r: -r["skor"])
        # Halaman iklan: 5 kartu per halaman. zoom mengecilkan kartu secara proporsional sampai 5 kartu muat (dicari build()).
        self.zoom, self.probe = 1.0, False

    def tgl(self, s):
        d = date.fromisoformat(s)
        return f"{d.day} {self.l['bulan'][d.month - 1]} {d.year}"

    def days(self, s):
        return (date.fromisoformat(s) - self.t).days

    def when(self, n):
        l = self.l
        return l["hari_ini"] if n == 0 else l["besok"] if n == 1 else l["lagi"].format(n) if n > 0 else l["lalu"].format(-n)

    def skip_line(self):
        dl, l = self.d["dilewati"], self.l
        total = sum(v for v in dl.values() if isinstance(v, int))
        s = l["dilewati"].format(total, dl["link_tidak_ketemu"], dl["sudah_di_tracker"], dl["sudah_dilaporkan"],
                                 dl["skor_rendah"], self.d["ambang_hampir"])
        if dl["lainnya"]:
            s += l["lainnya"].format(dl["lainnya"], dl.get("lainnya_alasan", ""))
        return s + "."

    # ---------------------------------------------------------------- converted old reports
    def legacy(self):
        return self.d.get("dikonversi_dari_lama") is True

    def lg(self):
        return LG["id"] if self.l is L["id"] else LG["en"]

    def skor_txt(self, x):
        return str(x["skor"]) if x.get("skor") is not None else (x.get("skor_label") or DASH)

    def link_txt(self, u):
        if not u:
            return DASH
        return self.lg()["legacy_link"] if check_report.aggregator_name(u) else host(u)

    def agg(self, x):
        """Iklan ini hanya ada di agregator (user mengizinkannya di Search settings)."""
        return x.get("hanya_agregator") is True

    def src_note(self):
        return self.l["src_note_agg"] if self.d.get("agregator_diizinkan") is True else self.l["src_note"]

    def lst(self, xs):
        return " · ".join(map(str, xs)) if xs else DASH

    # ---------------------------------------------------------------- shared Beton pieces (templates/_shared/beton.css)
    def head(self, oleh, ambang, flag=""):
        d, l = self.d, self.l
        return (f'<header><div><div class="brand"><i>V</i>{l["brand"]}</div><h1>{l["hari"][self.t.weekday()]}, {self.tgl(d["tanggal"])}</h1></div>'
                f'<div class="hd-r">{l["dari"]} <b>{e(oleh)}</b> {l["untuk"]} <b>{e(d.get("nama_panggilan", ""))}</b>{flag}<br>'
                f'run {d["run"]} · {l["ambang"]} {ambang}</div></header>')

    def hero(self, f):
        d, l = self.d, self.l
        keys = ["ditemukan", "lolos_saring", "link_resmi_ok", "dianalisis_penuh", "direkomendasikan"]
        steps = "".join(f'<div class="{"" if f.get(k) is not None else "dash"}"><b>{f.get(k) if f.get(k) is not None else DASH}</b><span>{lab}</span></div>'
                        for k, lab in zip(keys, l["corong"]))
        return f'<section class="box hero"><div><span class="cap">{l["fokus"]}</span><p>{e(d["fokus"])}</p></div><div class="fun">{steps}</div></section>'

    def cara_line(self, c, note=True):
        l = self.l
        parts = [self.lst(c["kata_kunci"]), self.lst(c["lokasi"]), self.lst(c["filter"]), self.lst(c["sumber"]) + (" " + self.src_note() if note else "")]
        gagal = f' · {l["gagal"]}: <b>{" · ".join(e(g) for g in c["gagal"])}</b>' if c["gagal"] else ""
        return f'<b>{l["cari"].format(e(c.get("oleh") or DASH))}:</b> ' + " · ".join(e(x) for x in parts if x and x != DASH) + gagal

    def html_legacy(self):
        d, l, g = self.d, self.l, self.lg()
        c = d["pencarian"]
        out = [self.head(c.get("oleh") or DASH, DASH, f' <span class="sample">{g["flag"]}</span>')]
        note = f'{g["note"]}: {e(d["catatan_konversi"])}' + (f' {l["warn"]}' if d["status"] == "terpotong" else "")
        out.append(f'<div class="warn">{note}</div>')
        out.append(self.hero(c.get("corong") or {}))
        rows = []
        for a in sorted(d["perlu_aksi"], key=lambda a: a["tanggal"]):
            kind = f'<span class="tag">{e(l["jenis"].get(a["jenis"], a["jenis"]))}</span>'
            when = f'<b>{self.tgl(a["tanggal"])}</b><small>{g["lewat"] if a["lewat"] else self.when(self.days(a["tanggal"]))}</small>'
            rows.append(f'<tr class="{"past" if a["lewat"] else ""}"><td>{when}</td><td>{kind}</td><td><b>{e(a["lamaran"])}</b>'
                        f'<small>{e(a["aksi"])}</small></td></tr>')
        if rows:
            out.append(f'<h2 data-n="01">{l["s1"]}</h2><div class="tb"><table class="act-t">{"".join(rows)}</table></div>')
        out.append(f'<h2 data-n="02">{l["s2"]} <small>{g["rec_sub"]}</small></h2>')
        if not d["rekomendasi"]:
            out.append(f'<p class="none">{l["tidak_ada"]}</p>')
        for r in d["rekomendasi"]:
            link = f'<a href="{e(r["link"])}">{e(self.link_txt(r["link"]))}</a>' if r["link"] else DASH
            sc = self.skor_txt(r)
            score = (f'<div class="sc {"" if r["skor"] >= self.lamar else "mid"}"><span>{l["fit"]}</span><b>{e(sc)}</b><span>{l["dari100"]}</span></div>'
                     if r.get("skor") is not None else f'<div class="sc skip lbl"><b>{e(sc)}</b></div>')
            status = f'<div class="why"><span class="cap">{g["catatan"]}</span><span>{e(r["catatan_asli"])}</span></div>' if r.get("catatan_asli") else ""
            out.append(
                f'<section class="box rec">{score}'
                f'<div class="bd"><div class="top"><div><div class="co">{e(r["perusahaan"])}</div><div class="role">{e(r["posisi"])}</div></div>'
                f'<span class="tag">{g["tanpa_vonis"]}</span></div>'
                f'<div class="meta">{e(r["jenis"])} · {e(r["kota"] or DASH)} · {l["diposting"]} {self.tgl(r["diposting"]) if r["diposting"] else DASH}</div>'
                # Old reports never recorded action, effort or score components: those rows are left out instead of printing "-".
                + (f'<div class="why"><span class="cap">{l["cocok"]}</span><span>{e(r["cocok"])}</span></div>' if r.get("cocok") else "")
                + (f'<div class="why"><span class="cap">{l["gap"]}</span><span>{e(r["gap"])}</span></div>' if r.get("gap") else "")
                + f'{status}<div class="ft"><span><b>{l["iklan"]}:</b> {link}</span></div></div>'
                f'<div class="sd"></div></section>')
        near = d["hampir_masuk"]
        blocks = []
        if near:
            blocks.append(f'<div><h2 data-n="03">{l["s3"]} <small>{g["hampir_sub"]}</small></h2><div class="tb"><table class="near">' + "".join(
                f'<tr><td>{e(self.skor_txt(n))}</td><td><b>{e(n["perusahaan"])}</b><small>{e(n["posisi"])}{", " + e(n["kota"]) if n.get("kota") else ""}'
                f'{" · " + e(n["alasan"]) if n.get("alasan") else ""}</small></td><td>{f"""<a href="{e(n["link"])}">{e(self.link_txt(n["link"]))}</a>""" if n.get("link") else ""}</td></tr>'
                for n in near) + "</table></div></div>")
        if d["catatan_asli"]:
            blocks.append(f'<div><h2 data-n="06">{g["s6"]}</h2><div class="note paper" style="margin-top:0"><ul>' + "".join(f"<li>{e(x)}</li>" for x in d["catatan_asli"]) + "</ul></div></div>")
        if blocks:
            out.append(f'<div class="{"two" if len(blocks) == 2 else ""}">' + "".join(blocks) + "</div>")
        out.append(f'<footer><span>{self.cara_line(c, note=False)}<br>{g["footer"]}</span><span>{l["bobot"]}</span></footer>')
        return "\n".join(out)

    def readme_legacy(self):
        d, l, g = self.d, self.l, self.lg()
        c = d["pencarian"]
        f = c.get("corong") or {}
        md = lambda s: str(s).replace("|", "/").replace("\n", " ")
        keys = ["ditemukan", "lolos_saring", "link_resmi_ok", "dianalisis_penuh", "direkomendasikan"]
        lines = [f'# {l["brand"].split(" · ")[-1].title()} · {d["tanggal"]} · {g["banner"]}', "",
                 f'> {g["note"]}: {md(d["catatan_konversi"])} {g["asli"]}: `{d["asal"]["readme"].split("/")[-1]}`.', ""]
        if d["status"] == "terpotong":
            lines += [l["warn"], ""]
        lines += [f'**{l["fokus"]}:** {md(d["fokus"])}', "",
                  f'## 0. {l["cara"].format(c.get("oleh") or DASH)}', "| | |", "|---|---|",
                  f'| {l["kw"]} | {self.lst(c["kata_kunci"])} |', f'| {l["lok"]} | {self.lst(c["lokasi"])} |',
                  f'| {l["src"]} | {self.lst(c["sumber"])} |', f'| {l["fil"]} | {self.lst(c["filter"])} |',
                  f'| {l["gagal"]} | {self.lst(c["gagal"])} |',
                  "| " + l["hasil"] + " | " + " → ".join(f"{f.get(k) if f.get(k) is not None else DASH} {lab}" for k, lab in zip(keys, l["corong"])) + " |",
                  "", f'## 1. {l["s1"]}']
        if d["perlu_aksi"]:
            lines += ["| | | |", "|---|---|---|"]
            for a in sorted(d["perlu_aksi"], key=lambda a: a["tanggal"]):
                lines.append(f'| {a["tanggal"]} ({g["lewat"] if a["lewat"] else self.when(self.days(a["tanggal"]))}) | '
                             f'{l["jenis"].get(a["jenis"], a["jenis"])}: {md(a["lamaran"])} | {md(a["aksi"])} |')
        else:
            lines.append(DASH)
        lines += ["", f'## 2. {l["s2"]} ({g["rec_sub"]})', g["readme_rec"], "|" + "---|" * 9]
        for i, r in enumerate(d["rekomendasi"], 1):
            link = f'[{self.link_txt(r["link"])}]({r["link"]})' if r["link"] else DASH
            lines.append(f'| {i} | {md(r["perusahaan"])} | {md(r["posisi"])} | {r["jenis"]} | {md(r["kota"] or DASH)} | {md(self.skor_txt(r))} | '
                         f'{r["diposting"] or DASH} | {link} | {md(r.get("catatan_asli") or DASH)} |')
        lines += ["", f'## 3. {l["s3"]} ({g["hampir_sub"]})']
        lines += ([f'- {md(self.skor_txt(n))} · {md(n["perusahaan"])} — {md(n["posisi"])}' + (f': {md(n["alasan"])}' if n.get("alasan") else "")
                   for n in d["hampir_masuk"]] or [DASH])
        lines += ["", f'## 4. {l["s4"]}', DASH, "", f'## 5. {l["s5"]}', DASH, "", f'## 6. {g["s6"]}']
        lines += [f"- {md(x)}" for x in d["catatan_asli"]] or [DASH]
        lines += ["", "---", g["footer"]]
        return "\n".join(lines) + "\n"

    def inbox_legacy(self):
        d, l, g = self.d, self.l, self.lg()
        lines = [f'**{l["brand"].split(" · ")[-1].title()}, {self.tgl(d["tanggal"])} ({g["banner"].lower()})**', "",
                 f'{l["fokus"]}: {d["fokus"]}', ""]
        for i, r in enumerate(d["rekomendasi"], 1):
            lines.append(f'{i}. [{r["perusahaan"]} — {r["posisi"]}]({r["link"]}) · {l["skor"]} {self.skor_txt(r)}')
        lines += ["", g["footer"]]
        return "\n".join(lines) + "\n"

    def sample(self):
        return any("SAMPEL" in str(c) or "SAMPLE" in str(c) for c in self.d.get("_catatan", []))

    # ---------------------------------------------------------------- HTML (PDF)
    def html_body(self):
        d, l = self.d, self.l
        c = d["pencarian"]
        out = [self.head(c["oleh"], d["ambang_skor"], f' <span class="sample">{l["sampel"]}</span>' if self.sample() else "")]
        if d["status"] == "terpotong":
            out.append(f'<div class="warn">{l["warn"]}</div>')
        out.append(self.hero(c["corong"]))
        rows = []
        for a in sorted(d["perlu_aksi"], key=lambda a: a["tanggal"]):
            kind = f'<span class="tag {"sun" if a["jenis"] == "belum_dijawab" else "rose" if a["jenis"] in ("deadline", "dokumen") else "sky"}">{e(l["jenis"].get(a["jenis"], a["jenis"]))}</span>'
            link = f' · <a href="{e(a["link"])}">{e(host(a["link"]))}</a>' if a.get("link") else ""
            skor = f' · {l["skor"]} {a["skor"]}' if a.get("skor") else ""
            if a["jenis"] == "belum_dijawab":
                when = f'<b>{l["sejak"].format(self.tgl(a["dari_laporan"]))}</b><small>{l["hilang"].format(max(0, self.days(a["tanggal"])))}</small>'
            else:
                n = self.days(a["tanggal"])
                when = f'<b>{self.tgl(a["tanggal"])}</b><small class="{"u" if n <= 3 else ""}">{self.when(n)}</small>'
            rows.append(f'<tr><td>{when}</td><td>{kind}</td><td><b>{e(a["lamaran"])}</b>{skor}<small>{e(a["aksi"])}{link}</small></td></tr>')
        # A section with nothing in it is not printed (the fixed list of sections stays in 00_README.md).
        needs = f'<h2 data-n="01">{l["s1"]}</h2><div class="tb"><table class="act-t">{"".join(rows)}</table></div>' if rows else ""
        # Up to 3 ads: everything flows on one page, "needs you" first. From 4 ads: the ad pages hold only ads (5 per page)
        # and everything else moves to the page after them.
        split = len(self.recs) >= PER_PAGE - 1
        if needs and not split:
            out.append(needs)
        out.append(f'<h2 data-n="02">{l["s2"]} <small>{l["s2_sub"].format(d["ambang_skor"], d["target_jumlah"])}</small></h2>')
        if not self.recs:
            out.append(f'<p class="none">{l["kosong"].format(d["ambang_skor"], d["jumlah_dianalisis"])}</p>')
        cards = []
        for r in self.recs:
            if r["deadline"]:
                n = self.days(r["deadline"])
                dlc = f'<span class="tag plain {"rose" if n <= 7 else ""}">{l["tutup"].format(self.tgl(r["deadline"]), n)}</span>'
            else:
                dlc = f'<span class="tag plain">{l["tanpa_dl"]}</span>'
            hist = f'{l["riwayat"]}: {e(r["riwayat"])}' if r["riwayat"] else l["belum_pernah"]
            agg = f' <span class="tag rose">{l["agg_tag"]}</span>' if self.agg(r) else ""
            bars = "".join(f'<div class="bar"><span>{lab}</span><i><em style="width:{r["komponen"][k] / mx * 100:.0f}%"></em></i>'
                           f'<b>{r["komponen"][k]}/{mx}</b></div>' for (k, mx), lab in zip(lib_schema.komponen_max(self.d).items(), l["komp"]))
            act = {"Lamar": "go", "Analisis": "sky", "Lewati": ""}[r["aksi"]]
            cards.append(
                f'<section class="box rec"><div class="sc {"" if r["skor"] >= self.lamar else "mid"}"><span>{l["fit"]}</span><b>{r["skor"]}</b><span>{l["dari100"]}</span></div>'
                f'<div class="bd"><div class="top"><div><div class="co">{e(r["perusahaan"])}</div><div class="role">{e(r["posisi"])}</div></div>'
                f'<span class="tag {act}">{e(l["aksi_label"][r["aksi"]])}</span></div>'
                f'<div class="meta">{e(r["jenis"])} · {e(r["kota"])} · {e(r["perjalanan"])} · {l["lamar_dalam"]} {e(r.get("bahasa_lamaran", ""))} · {l["diposting"]} {self.tgl(r["diposting"])}</div>'
                f'<div class="why"><span class="cap">{l["cocok"]}</span><span>{e(r["cocok"])}</span></div>'
                f'<div class="why"><span class="cap">{l["gap"]}</span><span>{e(r["gap"])}</span></div>'
                f'<div class="why"><span class="cap">{l["aksi"]}</span><span>{e(r["aksi_alasan"])}</span></div>'
                f'<div class="ft"><span><b>{l["iklan_agg"] if self.agg(r) else l["iklan"]}:</b> <a href="{e(r["link"])}">{e(host(r["link"]))}</a>{agg}</span>'
                f'<span><b>{l["butuh"]}:</b> {" · ".join(e(x) for x in r["usaha"]["dokumen"])}</span><span>±{r["usaha"]["menit"]} {l["menit"]}</span></div></div>'
                f'<div class="sd"><div class="chips">{dlc}<span class="tag plain">{hist}</span></div><div class="bars">{bars}</div></div></section>')
        pages = [cards[i:i + PER_PAGE] for i in range(0, len(cards), PER_PAGE)]
        for i, pg_cards in enumerate(pages):
            last = i == len(pages) - 1
            out.append(f'<div class="ads{"" if last and not split else " brk"}" style="zoom:{self.zoom:.2f}">' + "".join(pg_cards) + "</div>")
        if self.probe:
            return "\n".join(out)
        if needs and split:
            out.append(needs)
        near, pg, market = d["hampir_masuk"], d["pola_gap"], d["catatan_pasar"]
        blocks = []
        if near:
            blocks.append(f'<div><h2 data-n="03">{l["s3"]} <small>{l["s3_sub"].format(d["ambang_hampir"], d["ambang_skor"] - 1)}</small></h2><div class="tb"><table class="near">' + "".join(
                f'<tr><td>{n["skor"]}</td><td><b>{e(n["perusahaan"])}</b><small>{e(n["posisi"])}{", " + e(n["kota"]) if n.get("kota") else ""} · {e(n["alasan"])}</small></td>'
                f'<td><a href="{e(n["link"])}">{e(host(n["link"]))}</a>{"<small>" + l["agg_tag"] + "</small>" if self.agg(n) else ""}</td></tr>'
                for n in sorted(near, key=lambda n: -n["skor"])) + "</table></div></div>")
        if pg:
            blocks.append(f'<div><h2 data-n="05">{l["s5"]}</h2><div class="note paper" style="margin-top:0"><ul class="gapl">'
                          + "".join(f'<li>{l["gap_line"].format(e(g["skill"]), g["jumlah"], g["dari"])}</li>' for g in pg) + f'</ul><p class="mut" style="font-size:8pt;margin-top:3px">{l["gap_note"]}</p></div></div>')
        if market:
            blocks.append(f'<div><h2 data-n="06">{l["s6"]}</h2><div class="note paper" style="margin-top:0"><ul>' + "".join(f"<li>{e(x)}</li>" for x in market) + "</ul></div></div>")
        for i in range(0, len(blocks), 2):
            pair = blocks[i:i + 2]
            out.append(f'<div class="{"two" if len(pair) == 2 else ""}">' + "".join(pair) + "</div>")
        out.append(f'<p class="none" style="margin-top:10px"><b>{l["s4"]}:</b> {e(self.skip_line())}</p>')
        out.append(f'<footer><span>{self.cara_line(c)}<br>{l["footer"]}</span><span>{l["bobot"]}</span></footer>')
        return "\n".join(out)

    def html(self):
        with open(TEMPLATE_HTML, encoding="utf-8") as fh:
            tpl = fh.read()
        title = f'{self.l["brand"].split(" · ")[-1].title()} {self.d["tanggal"]}'
        return (tpl.replace("{{LANG}}", next(k for k, v in L.items() if v is self.l)).replace("{{BETON}}", lib_render.beton_css())
                .replace("{{DOC_TITLE}}", e(title)).replace("{{BODY}}", self.html_legacy() if self.legacy() else self.html_body()))

    # ---------------------------------------------------------------- 00_README.md
    def readme(self):
        d, l = self.d, self.l
        c, f = d["pencarian"], d["pencarian"]["corong"]
        md = lambda s: str(s).replace("|", "/").replace("\n", " ")
        keys = ["ditemukan", "lolos_saring", "link_resmi_ok", "dianalisis_penuh", "direkomendasikan"]
        lines = [f'# {l["brand"].split(" · ")[-1].title()} · {d["tanggal"]} · {l["hari"][self.t.weekday()]} · '
                 f'{l["dari"]} {c["oleh"]} {l["untuk"]} {d.get("nama_panggilan", "")}', ""]
        if d["status"] == "terpotong":
            lines += [l["warn"], ""]
        lines += [f'**{l["fokus"]}:** {md(d["fokus"])}', "",
                  f'## 0. {l["cara"].format(c["oleh"])}', "| | |", "|---|---|",
                  f'| {l["kw"]} | {" · ".join(map(md, c["kata_kunci"]))} |',
                  f'| {l["lok"]} | {" · ".join(map(md, c["lokasi"]))} |',
                  f'| {l["src"]} | {" · ".join(map(md, c["sumber"]))} {self.src_note()} |',
                  f'| {l["fil"]} | {" · ".join(map(md, c["filter"]))} |',
                  f'| {l["gagal"]} | {" · ".join(map(md, c["gagal"])) or l["gagal_none"]} |',
                  "| " + l["hasil"] + " | " + " → ".join(f"{f[k]} {lab}" for k, lab in zip(keys, l["corong"])) + " |",
                  "", l["ubah"].replace("…", "…"), "", f'## 1. {l["s1"]}']
        if d["perlu_aksi"]:
            lines += ["| | | |", "|---|---|---|"]
            for a in sorted(d["perlu_aksi"], key=lambda a: a["tanggal"]):
                when = (l["sejak"].format(a["dari_laporan"]) + f' ({l["hilang"].format(max(0, self.days(a["tanggal"])))})'
                        if a["jenis"] == "belum_dijawab" else f'{a["tanggal"]} ({self.when(self.days(a["tanggal"]))})')
                link = f' · [{host(a["link"])}]({a["link"]})' if a.get("link") else ""
                lines.append(f'| {when} | {l["jenis"].get(a["jenis"], a["jenis"])}: {md(a["lamaran"])} | {md(a["aksi"])}{link} |')
        else:
            lines.append("—")
        lines += ["", f'## 2. {l["s2"]} ({l["s2_sub"].format(d["ambang_skor"], d["target_jumlah"])})']
        if self.recs:
            lines += [l["readme_rec"], "|" + "---|" * 13]
            for i, r in enumerate(self.recs, 1):
                k = r["komponen"]
                lines.append(f'| {i} | {md(r["perusahaan"])} | {md(r["posisi"])} | {r["jenis"]} | {md(r["kota"])} ({md(r["perjalanan"])}) | '
                             f'{r["skor"]} | {k["tugas"]}/{k["skill"]}/{k["bahasa"]}/{k["kontrak"]}/{k["nilai_tambah"]} | {r["diposting"]} | '
                             f'{r["deadline"] or "—"} | {" · ".join(map(md, r["usaha"]["dokumen"]))} · ±{r["usaha"]["menit"]} | '
                             f'{md(r["riwayat"]) or "—"} | [{host(r["link"])}]({r["link"]}){" (" + l["agg_tag"] + ")" if self.agg(r) else ""} | {l["aksi_label"][r["aksi"]]} |')
            lines.append("")
            for i, r in enumerate(self.recs, 1):
                lines.append(f'{i}. ✅ {md(r["cocok"])} · ⚠️ {md(r["gap"])} · ➜ {l["aksi_label"][r["aksi"]]}: {md(r["aksi_alasan"])}')
        else:
            lines.append(l["kosong"].format(d["ambang_skor"], d["jumlah_dianalisis"]))
        lines += ["", f'## 3. {l["s3"]} ({l["s3_sub"].format(d["ambang_hampir"], d["ambang_skor"] - 1)})']
        lines += ([f'- {n["skor"]} · {md(n["perusahaan"])} — {md(n["posisi"])}: {md(n["alasan"])} · [{host(n["link"])}]({n["link"]}){" (" + l["agg_tag"] + ")" if self.agg(n) else ""}'
                   for n in sorted(d["hampir_masuk"], key=lambda n: -n["skor"])] or ["—"])
        lines += ["", f'## 4. {l["s4"]}', self.skip_line(), "", f'## 5. {l["s5"]}']
        lines += ([" · ".join(l["gap_line"].replace("<b>", "**").replace("</b>", "**").format(g["skill"], g["jumlah"], g["dari"]) for g in d["pola_gap"])]
                  if d["pola_gap"] else ["—"])
        lines += ["", f'## 6. {l["s6"]}'] + ([f"- {md(x)}" for x in d["catatan_pasar"]] or ["—"])
        lines += ["", "---", l["footer"].replace("<b>", "").replace("</b>", "")]
        return "\n".join(lines) + "\n"

    # ---------------------------------------------------------------- Inbox message
    def inbox(self):
        d, l = self.d, self.l
        lines = [f'**{l["brand"].split(" · ")[-1].title()}, {self.tgl(d["tanggal"])}**', "", f'{l["fokus"]}: {d["fokus"]}', ""]
        if self.recs:
            for i, r in enumerate(self.recs, 1):
                lines.append(f'{i}. [{r["perusahaan"]} — {r["posisi"]}]({r["link"]}) · {l["skor"]} {r["skor"]} · {l["aksi_label"][r["aksi"]]}')
        else:
            lines.append(l["kosong"].format(d["ambang_skor"], d["jumlah_dianalisis"]))
        und = [a for a in d["perlu_aksi"] if a["jenis"] == "belum_dijawab"]
        if und:
            lines += ["", l["jenis"]["belum_dijawab"] + ":"] + [f'- [{a["lamaran"]}]({a["link"]}) · {l["skor"]} {a["skor"]}' for a in und]
        lines += ["", l["footer"].replace("<b>", "").replace("</b>", "")]
        return "\n".join(lines) + "\n"


def pdf_pages(pdf_path):
    """Jumlah halaman PDF; tanpa pypdf dihitung dari objek halaman di file-nya."""
    n = lib_render.count_pages(pdf_path)
    if n:
        return n
    try:
        import re
        with open(pdf_path, "rb") as fh:
            return len(re.findall(rb"/Type\s*/Page(?![a-zA-Z])", fh.read())) or None
    except OSError:
        return None


def fit_zoom(rep, browser):
    """Perbesaran terbesar yang membuat tiap 5 kartu muat satu halaman: halaman iklan dicetak sendiri (tanpa bagian lain)
    dan dihitung halamannya. Tidak bisa dihitung = 1.0 (tampilan biasa)."""
    import tempfile
    want = -(-len(rep.recs) // PER_PAGE)
    with tempfile.TemporaryDirectory(prefix="vantage_fit_") as tmp:
        probe_html, probe_pdf = os.path.join(tmp, "p.html"), os.path.join(tmp, "p.pdf")
        for z in ZOOMS:
            rep.zoom, rep.probe = z, True
            try:
                with open(probe_html, "w", encoding="utf-8") as fh:
                    fh.write(rep.html())
            finally:
                rep.probe = False
            if not lib_render.print_pdf(probe_html, probe_pdf, browser):
                return 1.0
            pages = pdf_pages(probe_pdf)
            if pages is None:
                return 1.0
            if pages <= want:
                return z
    return ZOOMS[-1]


def build(json_path):
    with open(json_path, encoding="utf-8") as fh:
        data = json.load(fh)
    ap = check_report.find_applications(json_path)
    apps = json.load(open(ap, encoding="utf-8")) if ap else None
    sp = check_report.find_settings(json_path)
    try:
        settings = json.load(open(sp, encoding="utf-8")) if sp else {}   # no settings file = job boards not allowed
    except ValueError:
        settings = {}
    errors = check_report.validate(data, apps, settings if isinstance(settings, dict) else {})
    if errors:
        print("GAGAL, perbaiki JSON-nya dulu (check_report.py):")
        for x in errors:
            print("  x " + x)
        sys.exit(1)
    rep = Report(data)
    base = os.path.splitext(json_path)[0]
    folder = os.path.dirname(os.path.abspath(json_path))
    # German: only the PDF is German. 00_README.md and the Inbox message keep the English fixed texts (check_report.py knows id and en).
    txt = Report(dict(data, bahasa="en")) if data.get("bahasa") == "de" else rep
    readme_text = txt.readme_legacy() if rep.legacy() else txt.readme()
    rerr = check_report.validate_readme(readme_text)
    if rerr:
        print("GAGAL, README tidak sesuai template:")
        for x in rerr:
            print("  x " + x)
        sys.exit(1)
    html_path, pdf_path, msg_path = base + ".html", base + ".pdf", base + "_pesan_inbox.md"
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(rep.html())
    # A converted old report never overwrites the original 00_README.md next to it.
    readme_path = os.path.join(folder, "00_README_v2.md" if rep.legacy() else "00_README.md")
    with open(readme_path, "w", encoding="utf-8") as fh:
        fh.write(readme_text)
    with open(msg_path, "w", encoding="utf-8") as fh:
        fh.write(txt.inbox_legacy() if rep.legacy() else txt.inbox())
    browser = lib_render.find_browser()
    if browser and not rep.legacy() and len(rep.recs) >= PER_PAGE - 1:
        rep.zoom = fit_zoom(rep, browser)
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(rep.html())
    if browser and lib_render.print_pdf(html_path, pdf_path, browser):
        pages = pdf_pages(pdf_path)
        print(f"PDF OK (via {os.path.basename(browser)}" + (f", {pages} halaman" if pages else "") + f") -> {pdf_path}")
        # Halaman iklan memuat 5 kartu; mulai 4 rekomendasi, bagian lain pindah ke halaman sesudahnya.
        n = len(rep.recs)
        want = 1 if n < PER_PAGE - 1 else -(-n // PER_PAGE) + 1
        if pages and pages > want and not rep.legacy():
            print(f"PERINGATAN: laporan {pages} halaman, seharusnya {want}; pendekkan teks cocok/gap/catatan.")
        elif pages and pages > 2:
            print(f"Catatan: {len(rep.recs)} rekomendasi (maks_rekomendasi > 5), jadi laporan {pages} halaman. Itu wajar.")
    else:
        print("PERINGATAN: PDF tidak dibuat karena Chrome/Edge tidak ketemu atau gagal.")
        print(lib_render.INSTALL_HINT)
        print("Kirim pesan Inbox tanpa lampiran hari ini, dan sebut ke user bahwa PDF menyusul.")
    print(f"{len(rep.recs)} rekomendasi, {len(data['hampir_masuk'])} hampir masuk, {len(data['perlu_aksi'])} perlu aksi.")
    print(f"README -> {readme_path}")
    print(f"Pesan Inbox (kirim apa adanya) -> {msg_path}")
    return pdf_path


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    build(sys.argv[1])
