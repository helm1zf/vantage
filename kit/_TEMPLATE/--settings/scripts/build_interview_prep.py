#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Interview Prep: dosier persiapan satu interview, termasuk rekam jejak latihan bersama Laras.

pakai: python3 build_interview_prep.py <Interview_Prep.json> [--check] [--html keluaran.html]
Aturan isi: sop/persiapan_interview.md. Contoh isi: templates/interview_prep/content.json.
Rekam jejak (riwayat_latihan) ditambah Laras setiap selesai sesi latihan; PDF dibuat hanya kalau user minta.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_doc as D  # noqa: E402
from lib_doc import S, N, L, O, DATE  # noqa: E402

SPEC = {
    "perusahaan": S(max=80),
    "posisi": S(max=100),
    "tanggal_interview": DATE(),
    "waktu": S(max=40, req=False),
    "format": S(max=100),
    "pewawancara": S(max=140, req=False),
    "ringkasan_perusahaan": S(max=520),
    "sorotan_peran": L(S(max=160), min=2, max=6),
    "pitch_60_detik": S(max=700),
    "pertanyaan": L(O({
        "kelompok": S(enum=["pembuka", "perilaku", "teknis", "motivasi", "situasi", "lain"]),
        "tanya": S(max=180),
        "kerangka_jawab": S(max=520),
        "cerita": S(max=80, req=False),
        "tingkat": S(enum=["mudah", "sedang", "sulit"]),
    }), min=5, max=18),
    "pertanyaan_balik": L(S(max=180), min=3, max=8),
    "logistik": L(S(max=160), max=8, req=False),
    "riwayat_latihan": L(O({
        "tanggal": DATE(),
        "intensitas": S(enum=["ringan", "sedang", "keras"]),
        "fokus": S(max=120),
        "nilai": N(min=1, max=5),
        "catatan": S(max=300),
        "perlu_dilatih": L(S(max=100), max=5, req=False),
    }), max=30, req=False),
    "fokus_berikutnya": S(max=300, req=False),
}

GROUP = {"pembuka": "Pembuka", "perilaku": "Perilaku", "teknis": "Teknis", "motivasi": "Motivasi", "situasi": "Situasi", "lain": "Lain-lain"}


def render_html(d):
    hl = "".join(f"<li>{D.inline(x)}</li>" for x in d["sorotan_peran"])
    qs = ""
    for i, q in enumerate(d["pertanyaan"], 1):
        story = f'<span class="cs">Cerita: {D.inline(q["cerita"])}</span>' if q.get("cerita") else ""
        qs += (f'<div class="q"><div class="qh"><b>{i:02d}</b><span class="grp">{GROUP[q["kelompok"]]}</span>'
               f'<span class="lv {q["tingkat"]}">{D.e(q["tingkat"])}</span></div><h4>{D.inline(q["tanya"])}</h4>'
               f'<p>{D.inline(q["kerangka_jawab"])}</p>{story}</div>')
    back = "".join(f"<li>{D.inline(x)}</li>" for x in d["pertanyaan_balik"])
    logi = D.ul(d.get("logistik"), "logi")
    logi_blk = f'<div class="card"><h3>Logistik</h3>{logi}</div>' if logi else ""
    rows = d.get("riwayat_latihan", [])
    if rows:
        rows = sorted(rows, key=lambda r: r["tanggal"])
        bars = ""
        for r in rows:
            need = D.ul(r.get("perlu_dilatih"), "need")
            bars += (f'<div class="tr"><div class="trd">{D.e(D.date_id(r["tanggal"]))}<small>{D.e(r["intensitas"])}</small></div>'
                     f'<div class="trb"><div class="meter"><i style="width:{r["nilai"] * 20}%"></i></div><b>{r["nilai"]}/5</b></div>'
                     f'<div class="trt"><strong>{D.inline(r["fokus"])}</strong><p>{D.inline(r["catatan"])}</p>{need}</div></div>')
        first, last = rows[0]["nilai"], rows[-1]["nilai"]
        trend = f"{len(rows)} sesi. Nilai pertama {first}/5, terakhir {last}/5."
        track = f'<section class="track"><h2>Rekam jejak latihan</h2><p class="sum">{trend}</p>{bars}</section>'
    else:
        track = '<section class="track"><h2>Rekam jejak latihan</h2><p class="sum">Belum ada sesi latihan. Mulai dari tombol Interview, Laras mencatat tiap sesi di sini.</p></section>'
    nxt = f'<div class="next"><h3>Fokus sesi berikutnya</h3><p>{D.inline(d["fokus_berikutnya"])}</p></div>' if d.get("fokus_berikutnya") else ""
    meta = [("Tanggal", D.date_id(d["tanggal_interview"]) + (" / " + d["waktu"] if d.get("waktu") else "")), ("Format", d["format"])]
    if d.get("pewawancara"):
        meta.append(("Pewawancara", d["pewawancara"]))
    meta_html = "".join(f"<div><span>{D.e(k)}</span><b>{D.inline(v)}</b></div>" for k, v in meta)
    return D.layout("interview_prep", {
        "COMPANY": D.e(d["perusahaan"]),
        "ROLE": D.e(d["posisi"]),
        "META": meta_html,
        "ABOUT": D.inline(d["ringkasan_perusahaan"]),
        "HIGHLIGHTS": hl,
        "PITCH": D.inline(d["pitch_60_detik"]),
        "QUESTIONS": qs,
        "ASK": back,
        "LOGISTICS": logi_blk,
        "TRACK": track,
        "NEXT": nxt,
    })


if __name__ == "__main__":
    D.cli("interview_prep", SPEC, render_html, maks_hal=6)
