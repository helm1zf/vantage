#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pre-send check and send pack for ONE application.

pakai: python3 pack_application.py <application folder, relative to the user folder> [--apply] <user folder>
Checks (prints JSON): final CV and cover letter PDFs exist, page counts (CV 1 page, CL 1 page), no <TAILOR> left, file names safe for
upload portals, file sizes under 5 MB, Tari's quality report passed. With --apply and no failed check, copies the PDFs to
<application>/03_send/ under clean names (CV_<Surname>_<Company>.pdf) and zips them.
"""
import json
import os
import re
import shutil
import sys
import zipfile

MAX_MB = 5


def pages_and_text(path):
    try:
        from pypdf import PdfReader
        r = PdfReader(path)
        txt = " ".join((pg.extract_text() or "") for pg in r.pages[:3])
        return len(r.pages), txt, bool(r.is_encrypted)
    except Exception:  # noqa: BLE001
        return None, "", False


def main():
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    pos = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(pos) < 2:
        sys.exit("pakai: python3 pack_application.py <application folder> [--apply] <user folder>")
    root = pos[-1]
    app = os.path.join(root, pos[0]) if not os.path.isabs(pos[0]) else pos[0]
    rts = os.path.join(app, "02_ready_to_send")
    checks = []

    def add(id_, label, ok, detail):
        checks.append({"id": id_, "label": label, "ok": bool(ok), "detail": detail})

    pdfs = sorted(f for f in os.listdir(rts) if f.lower().endswith(".pdf")) if os.path.isdir(rts) else []
    cv = next((f for f in pdfs if re.search(r"(^|[_ -])cv|lebenslauf|resume", f, re.I)), None)
    cl = next((f for f in pdfs if re.search(r"cover|anschreiben|(^|[_ -])cl([_ .-]|$)", f, re.I)), None)
    add("cv", "CV (PDF) is in 02_ready_to_send", cv, cv or "missing")
    add("cl", "Cover letter (PDF) is in 02_ready_to_send", cl, cl or "missing")
    for kind, f, want in (("cv", cv, 1), ("cl", cl, 1)):
        if not f:
            continue
        n, txt, enc = pages_and_text(os.path.join(rts, f))
        label = "CV" if kind == "cv" else "Cover letter"
        add(kind + "_pages", f"{label} is {want} page", n == want if n else False, f"{n} pages" if n else "page count unavailable (pypdf missing)")
        add(kind + "_todo", f"{label} has no unfinished <TAILOR> text", "<TAILOR" not in txt, "clean" if "<TAILOR" not in txt else "placeholder text found")
        add(kind + "_open", f"{label} is not password protected", not enc, "ok" if not enc else "encrypted")
        mb = os.path.getsize(os.path.join(rts, f)) / 1e6
        add(kind + "_size", f"{label} is under {MAX_MB} MB", mb < MAX_MB, f"{mb:.2f} MB")
        add(kind + "_name", f"{label} file name is portal-safe", bool(re.fullmatch(r"[A-Za-z0-9._-]+", f)), f)
    qc = os.path.join(app, "00_Draft", "qc_report.md")
    if os.path.isfile(qc):
        t = open(qc, encoding="utf-8").read()
        add("qc", "Tari's quality check passed", bool(re.search(r"LULUS", t)) and not re.search(r"GAGAL|REVISI", t.split("LULUS")[-1][:200]), "LULUS" if "LULUS" in t else "no LULUS line")
    ok = all(c["ok"] for c in checks)
    out = {"ok": ok, "checks": checks, "pack": ""}
    if "--apply" in flags and ok:
        ident = os.path.join(root, "01_user_documents", "--usersettings", "identity.json")
        sur = "Applicant"
        if os.path.isfile(ident):
            sur = re.sub(r"[^A-Za-z0-9]+", "", json.load(open(ident, encoding="utf-8")).get("surname", "") or "Applicant") or "Applicant"
        comp = re.sub(r"[^A-Za-z0-9]+", "", re.sub(r"^\d{2}-\d{2}_", "", os.path.basename(app)).split("_")[0]) or "Company"
        dest = os.path.join(app, "03_send")
        os.makedirs(dest, exist_ok=True)
        names = {cv: f"CV_{sur}_{comp}.pdf", cl: f"CoverLetter_{sur}_{comp}.pdf"}
        for src, dst in names.items():
            shutil.copy2(os.path.join(rts, src), os.path.join(dest, dst))
        zp = os.path.join(dest, f"Application_{sur}_{comp}.zip")
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
            for dst in names.values():
                z.write(os.path.join(dest, dst), dst)
        out["pack"] = zp
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
