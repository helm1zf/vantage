#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rencana Belajar: peta jalan mingguan untuk menutup satu skill gap, dengan bukti yang bisa ditunjukkan ke recruiter.

pakai: python3 build_rencana_belajar.py <content.json> [--check] [--html keluaran.html]
Aturan isi: sop/rencana_belajar.md. Contoh isi: templates/rencana_belajar/content.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_doc as D  # noqa: E402
from lib_doc import S, N, L, O, DATE  # noqa: E402

SPEC = {
    "skill": S(max=60),
    "tanggal": DATE(),
    "muncul_di": N(min=1),
    "total_jd": N(min=1),
    "alasan": S(max=300),
    "level_diminta": S(max=120),
    "bukti_sekarang": S(max=300),
    "contoh_lowongan": L(S(max=90), max=5, req=False),
    "minggu": L(O({
        "judul": S(max=70),
        "fokus": S(max=200),
        "langkah": L(S(max=160), min=2, max=6),
        "waktu_jam": N(min=1, max=40),
    }), min=1, max=8),
    "proyek_mini": O({"nama": S(max=70), "deskripsi": S(max=320), "hasil": S(max=160)}),
    "sumber": L(O({"nama": S(max=80), "jenis": S(enum=["dokumentasi", "kursus", "buku", "video", "latihan"]), "catatan": S(max=140)}), min=2, max=6),
    "cara_menunjukkan": L(S(max=200), min=1, max=4),
}


def render_html(d):
    total = sum(w["waktu_jam"] for w in d["minggu"])
    pct = round(100 * d["muncul_di"] / d["total_jd"])
    weeks = ""
    for i, w in enumerate(d["minggu"], 1):
        steps = "".join(f"<li>{D.inline(s)}</li>" for s in w["langkah"])
        weeks += (f'<div class="wk"><div class="rail"><b>{i}</b></div><div class="body"><div class="wh"><h4>{D.inline(w["judul"])}</h4>'
                  f'<span class="hrs">{w["waktu_jam"]} jam</span></div><p class="fokus">{D.inline(w["fokus"])}</p><ul>{steps}</ul></div></div>')
    src = "".join(f'<li><b>{D.inline(x["nama"])}</b><span class="tag">{D.e(x["jenis"])}</span><em>{D.inline(x["catatan"])}</em></li>' for x in d["sumber"])
    show = "".join(f"<li>{D.inline(x)}</li>" for x in d["cara_menunjukkan"])
    ex = D.ul(d.get("contoh_lowongan"), "ex")
    ex_blk = f'<div class="ex-w"><h5>Contoh lowongan</h5>{ex}</div>' if ex else ""
    p = d["proyek_mini"]
    return D.layout("rencana_belajar", {
        "SKILL": D.e(d["skill"]),
        "DATE": D.e(D.date_id(d["tanggal"])),
        "COUNT": str(d["muncul_di"]),
        "TOTAL": str(d["total_jd"]),
        "PCT": str(pct),
        "ALASAN": D.inline(d["alasan"]),
        "LEVEL": D.inline(d["level_diminta"]),
        "BUKTI": D.inline(d["bukti_sekarang"]),
        "EXAMPLES": ex_blk,
        "WEEKS": weeks,
        "WEEKS_N": str(len(d["minggu"])),
        "HOURS": str(total),
        "MINI_NAME": D.inline(p["nama"]),
        "MINI_DESC": D.inline(p["deskripsi"]),
        "MINI_OUT": D.inline(p["hasil"]),
        "SOURCES": src,
        "SHOW": show,
    })


if __name__ == "__main__":
    D.cli("rencana_belajar", SPEC, render_html, maks_hal=3)
