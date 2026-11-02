#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""About Item: satu halaman-dua untuk satu proyek/pengalaman, siap dipakai menjawab "ceritakan tentang proyek ini".

pakai: python3 build_about_item.py <content.json> [--check] [--html keluaran.html]
Aturan isi: sop/about_item.md. Contoh isi: templates/about_item/content.json.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib_doc as D  # noqa: E402
from lib_doc import S, N, L, O  # noqa: E402

SPEC = {
    "id": S(max=40),
    "judul": S(max=80),
    "jenis": S(enum=["proyek", "kerja", "magang", "organisasi", "riset", "lainnya"]),
    "periode": S(max=40),
    "peran": S(max=80),
    "organisasi": S(max=80),
    "alat": L(S(max=40), max=12),
    "inti": S(max=260),
    "analogi": S(max=260, req=False),
    "w5h1": O({k: S(max=420) for k in ["apa", "kenapa", "siapa", "di_mana", "kapan", "bagaimana"]}),
    "cerita": O({
        "bahasa": S(enum=["id", "en", "de"]),
        "durasi_menit": N(min=1, max=5),
        "kartu": L(S(max=90), min=3, max=6),
        "naskah": S(max=1800),
    }),
    "cek_fakta": L(O({"klaim": S(max=200), "sumber": S(max=160), "status": S(enum=["terkonfirmasi", "perkiraan", "perlu dicek"])}), max=10),
    "istilah": L(O({"kata": S(max=40), "arti": S(max=200)}), max=8, req=False),
    "tanya_jawab": L(O({"tanya": S(max=160), "jawab": S(max=420)}), min=3, max=8),
    "pembaruan": S(max=60),
}

W5 = [("apa", "Apa"), ("kenapa", "Kenapa"), ("siapa", "Siapa"), ("di_mana", "Di mana"), ("kapan", "Kapan"), ("bagaimana", "Bagaimana")]
STATUS = {"terkonfirmasi": "ok", "perkiraan": "kira", "perlu dicek": "cek"}
LANG = {"id": "Bahasa Indonesia", "en": "English", "de": "Deutsch"}


def render_html(d):
    meta = [d["jenis"].capitalize(), d["periode"], d["peran"], d["organisasi"]]
    tools = "".join(f"<span>{D.e(t)}</span>" for t in d.get("alat", []))
    w5 = "".join(f'<div class="w"><h4>{lab}</h4><p>{D.inline(d["w5h1"][k])}</p></div>' for k, lab in W5)
    c = d["cerita"]
    cards = "".join(f"<li><b>{i + 1}</b><span>{D.inline(x)}</span></li>" for i, x in enumerate(c["kartu"]))
    fakta = "".join(f'<tr><td>{D.inline(x["klaim"])}</td><td class="src">{D.inline(x["sumber"])}</td>'
                    f'<td><i class="st {STATUS[x["status"]]}">{D.e(x["status"])}</i></td></tr>' for x in d["cek_fakta"])
    istilah = "".join(f"<dt>{D.e(x['kata'])}</dt><dd>{D.inline(x['arti'])}</dd>" for x in d.get("istilah", []))
    qa = "".join(f'<div class="qa"><h4>{D.inline(x["tanya"])}</h4><p>{D.inline(x["jawab"])}</p></div>' for x in d["tanya_jawab"])
    analogi = f'<p class="analogi"><span>Gambaran singkat</span>{D.inline(d["analogi"])}</p>' if d.get("analogi") else ""
    istilah_blk = f'<section><h3>Istilah yang mungkin ditanya</h3><dl>{istilah}</dl></section>' if istilah else ""
    return D.layout("about_item", {
        "TITLE": D.e(d["judul"]),
        "KICKER": D.e(" / ".join(x for x in meta[:2] if x)),
        "META": D.e(" / ".join(x for x in meta[2:] if x)),
        "TOOLS": tools,
        "INTI": D.inline(d["inti"]),
        "ANALOGI": analogi,
        "W5H1": w5,
        "STORY_LANG": D.e(LANG[c["bahasa"]]),
        "STORY_MIN": str(c["durasi_menit"]),
        "CARDS": cards,
        "SCRIPT": D.paras(c["naskah"]),
        "FACTS": fakta,
        "ISTILAH": istilah_blk,
        "QA": qa,
        "UPDATED": D.e(d["pembaruan"]),
    })


if __name__ == "__main__":
    D.cli("about_item", SPEC, render_html, maks_hal=3)
