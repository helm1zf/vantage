#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Study pack: turns a Rencana Belajar JSON (templates/rencana_belajar) into a folder a learner can work through, plus a .zip.

pakai: python3 build_study_pack.py <rencana.json> [<folder-user>]   -> prints the .zip path
Layout:  <Skill>_study_pack/ README.md (map + 'enough for the market' marker), week_NN/{README.md, exercises.md}, project/README.md, tracker.md
The 'market' marker is the week where the plan first reaches what the job ads ask for (level_diminta); finishing later weeks is optional.
"""
import json
import os
import re
import sys
import zipfile


def slug(s):
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_") or "skill"


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.rstrip() + "\n")


def main():
    if len(sys.argv) < 2:
        sys.exit("pakai: python3 build_study_pack.py <rencana.json> [<folder-user>]")
    with open(sys.argv[1], encoding="utf-8") as f:
        d = json.load(f)
    weeks = d["minggu"]
    out_dir = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), slug(d["skill"]) + "_study_pack")
    market = max(1, round(len(weeks) * 0.6))   # job-ready point: about 60 percent of the plan, at least week 1
    total_h = sum(w["waktu_jam"] for w in weeks)
    market_h = sum(w["waktu_jam"] for w in weeks[:market])
    readme = [f"# {d['skill']}: from zero to hero", "",
              f"Why: {d['alasan']}", "", f"What the ads ask for: {d['level_diminta']}", "",
              f"Where you start: {d['bukti_sekarang']}", "",
              f"**Enough for the market: finish week {market}** (about {market_h} of {total_h} hours). Weeks after that make you stronger, but you can apply now.", "", "## Map"]
    for i, w in enumerate(weeks, 1):
        flag = "  <- enough for the market" if i == market else ""
        readme.append(f"- Week {i:02d}: {w['judul']} ({w['waktu_jam']} h){flag}")
    readme += ["- Project: " + d["proyek_mini"]["nama"], "", "## Resources"] + [f"- {x['nama']} ({x['jenis']}): {x['catatan']}" for x in d["sumber"]]
    write(os.path.join(out_dir, "README.md"), "\n".join(readme))
    tracker = ["# Tracker", "", "Tick what you finished (edit this file or use the Learn tab in Vantage).", ""]
    for i, w in enumerate(weeks, 1):
        wd = os.path.join(out_dir, f"week_{i:02d}")
        write(os.path.join(wd, "README.md"), f"# Week {i}: {w['judul']}\n\nFocus: {w['fokus']}\n\nTime: about {w['waktu_jam']} hours\n\n## Steps\n" + "\n".join(f"{n}. {s}" for n, s in enumerate(w["langkah"], 1)))
        write(os.path.join(wd, "exercises.md"), f"# Exercises, week {i}\n\n" + "\n".join(f"- [ ] Do it yourself without copying: {s}" for s in w["langkah"]) + "\n- [ ] Explain what you did in 3 sentences, out loud.\n- [ ] Write down one thing that went wrong and how you fixed it.")
        tracker.append(f"- [ ] Week {i:02d}: {w['judul']}")
    p = d["proyek_mini"]
    write(os.path.join(out_dir, "project", "README.md"), f"# Project: {p['nama']}\n\n{p['deskripsi']}\n\nResult to show: {p['hasil']}\n\n## How to show it\n" + "\n".join(f"- {x}" for x in d["cara_menunjukkan"]))
    tracker += ["- [ ] Project: " + p["nama"]]
    write(os.path.join(out_dir, "tracker.md"), "\n".join(tracker))
    zp = out_dir + ".zip"
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(out_dir):
            for fn in files:
                full = os.path.join(root, fn)
                z.write(full, os.path.relpath(full, os.path.dirname(out_dir)))
    print(zp)


if __name__ == "__main__":
    main()
