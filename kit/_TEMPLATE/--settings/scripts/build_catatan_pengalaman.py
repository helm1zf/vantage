#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Catatan Pengalaman: ringkasan satu sesi mengingat kembali (Raka), berurutan menurut waktu.

pakai: python3 build_catatan_pengalaman.py <content.json> [--check] [--html keluaran.html]
Aturan isi: sop/catatan_pengalaman.md. Contoh isi: templates/catatan_pengalaman/content.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_doc as D  # noqa: E402
from lib_doc import S, N, L, O, DATE  # noqa: E402

SPEC = {
    "sesi": N(min=1),
    "judul": S(max=90),
    "tanggal": DATE(),
    "durasi_menit": N(min=1, max=240),
    "topik_wajib": L(S(max=80), max=6, req=False),
    "ingatan": L(O({
        "periode": S(max=40),
        "judul": S(max=90),
        "apa_yang_diingat": S(max=700),
        "kutipan": S(max=220, req=False),
        "fakta_baru": L(S(max=160), max=6, req=False),
        "id": S(max=40, req=False),
        "dikonfirmasi": dict(t="bool"),
    }), min=1, max=14),
    "pertanyaan_terbuka": L(S(max=200), max=8, req=False),
    "langkah_berikut": L(S(max=180), min=1, max=5),
}


def render_html(d):
    entries = ""
    for m in d["ingatan"]:
        quote = f'<blockquote>{D.inline(m["kutipan"])}</blockquote>' if m.get("kutipan") else ""
        facts = ""
        if m.get("fakta_baru"):
            facts = '<div class="new"><b>Fakta baru</b>' + D.ul(m["fakta_baru"]) + "</div>"
        flag = '<i class="ok">terkonfirmasi</i>' if m["dikonfirmasi"] else '<i class="wait">menunggu konfirmasi</i>'
        ref = f'<span class="ref">{D.e(m["id"])}</span>' if m.get("id") else ""
        entries += (f'<article><div class="when"><span>{D.e(m["periode"])}</span></div><div class="dot"></div>'
                    f'<div class="what"><div class="th"><h3>{D.inline(m["judul"])}</h3>{flag}</div>{D.paras(m["apa_yang_diingat"])}{quote}{facts}{ref}</div></article>')
    must = ""
    if d.get("topik_wajib"):
        must = '<div class="chips"><span class="lab">Topik sesi</span>' + "".join(f"<span>{D.e(x)}</span>" for x in d["topik_wajib"]) + "</div>"
    openq = ""
    if d.get("pertanyaan_terbuka"):
        openq = '<div class="box"><h2>Masih terbuka</h2>' + D.ul(d["pertanyaan_terbuka"]) + "</div>"
    nxt = "".join(f"<li>{D.inline(x)}</li>" for x in d["langkah_berikut"])
    confirmed = sum(1 for m in d["ingatan"] if m["dikonfirmasi"])
    return D.layout("catatan_pengalaman", {
        "SESSION": str(d["sesi"]),
        "TITLE": D.e(d["judul"]),
        "DATE": D.e(D.date_id(d["tanggal"])),
        "MIN": str(d["durasi_menit"]),
        "COUNT": str(len(d["ingatan"])),
        "CONFIRMED": str(confirmed),
        "MUST": must,
        "ENTRIES": entries,
        "OPEN": openq,
        "NEXT": nxt,
    })


if __name__ == "__main__":
    D.cli("catatan_pengalaman", SPEC, render_html, maks_hal=6)
