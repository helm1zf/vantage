#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Bring an old Vantage folder (or a backup) into a user folder, the way a person would do it by hand, but safely and in one go.

pakai: python3 import_old.py <source> [--apply] <user folder>
  <source>   an old user folder, an old Vantage folder with users in it, a folder that was dropped into the Inbox, or a backup .zip
  (no flag)  plan only: prints JSON of what would be copied, what is identical, what would clash
  --apply    copies; writes 01_user_documents/--usersettings/import_log.json
Rules: the source is never changed. Nothing is overwritten: an identical file is skipped, a different one is kept next to the existing one
as "<name>.from_old.<ext>". Files that are still the empty template (identity.json, applications.json ...) are simply replaced by the old
ones. A file that is open in another program is reported and the rest carries on. System folders of old versions (00_Master, -settings,
--settings, _TEMPLATE) are not data and are not copied: they come back with an update.
Known old names are renamed on the way (see RENAMES). Things that need judgement (old CLAUDE.md, month folders) are listed under "todo".
"""
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import zipfile

SYSTEM_DIRS = {"00_master", "-settings", "--settings", "00_system", "_template", "_backups", "__pycache__", ".git", "node_modules", ".venv"}
MARKERS = ("01_user_documents", "02_workflow", "raw_facts_about_you.md", "raw_materials.md", "applications.json", "00_master", "-settings", "--settings")
RAW_ALIASES = {"raw_facts_about_you.md", "raw_materials.md", "raw_facts.md"}
# old name (lower case) -> new name, applied to path segments
RENAMES = {"role_model": "00_other_cv_as_role_model", "--usersetting": "--usersettings", "daily_recommendation_from_nova": "Laporan_Pagi",
           "00_inbox": "--- I N B O X ---", "------- i n b o x -------": "--- I N B O X ---"}
INBOX = "--- I N B O X ---"
USER_JSON = {"applications.json", "identity.json", "search_settings.json", "daily_jobs_seen.json", "job_profile.md", "jd_insights.md", "status.md"}


def lp(p):
    p = os.path.abspath(p)
    return "\\\\?\\" + p if os.name == "nt" and not p.startswith("\\\\?\\") else p


def sha(p):
    h = hashlib.sha256()
    with open(lp(p), "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def why(e):
    if isinstance(e, PermissionError) or getattr(e, "winerror", 0) in (5, 32, 33):
        return "in use by another program (Explorer, Word, a PDF reader): close it and run the import again"
    return str(e)


def safe_extract(zp, dest):
    with zipfile.ZipFile(zp) as z:
        for m in z.infolist():
            t = os.path.normpath(os.path.join(dest, m.filename))
            if not t.startswith(os.path.abspath(dest) + os.sep) and t != os.path.abspath(dest):
                raise ValueError("The backup contains an unsafe path: " + m.filename)
        z.extractall(dest)


def find_roots(src, depth=3):
    """Folders that look like an old Vantage user (markers inside), the source itself first."""
    out = []
    def marks(d):
        try:
            names = {n.lower() for n in os.listdir(d)}
        except OSError:
            return 0
        return sum(1 for m in MARKERS if m in names) + (1 if any(n.startswith("sop_") for n in names) else 0)
    def walk(d, lvl):
        if os.path.basename(d).lower() in SYSTEM_DIRS:
            return
        k = marks(d)
        if k >= 1 and any(m in {n.lower() for n in os.listdir(d)} for m in ("01_user_documents", "raw_facts_about_you.md", "raw_materials.md", "applications.json", "02_workflow")):
            out.append((k, d))
            return
        if lvl < depth:
            for n in sorted(os.listdir(d)):
                p = os.path.join(d, n)
                if os.path.isdir(p):
                    walk(p, lvl + 1)
    walk(src, 0)
    return [d for _, d in sorted(out, key=lambda x: -x[0])]


def new_rel(rel_parts):
    """Map the parts of a path inside an old user folder to the new layout."""
    parts = []
    for i, seg in enumerate(rel_parts):
        low = seg.lower()
        parts.append(RENAMES.get(low, seg))
    # materials/Photo.* and Original_CV.* got a 00_ prefix
    if len(parts) >= 3 and parts[0] == "01_user_documents" and parts[1] == "materials" and len(parts) == 3:
        if re.match(r"^photo\.", parts[2], re.I):
            parts[2] = "00_" + parts[2]
        elif re.match(r"^original_cv\.", parts[2], re.I):
            parts[2] = "00_" + parts[2]
    # old raw facts names, at the user root or in 01_user_documents
    if parts and parts[-1].lower() in RAW_ALIASES and (len(parts) == 1 or (len(parts) == 2 and parts[0] == "01_user_documents")):
        parts = ["01_user_documents", "raw_facts_about_you.md"]
    # loose files of the old --usersetting at the root of 01_user_documents stay; top-level old user files go to 01_user_documents
    return parts


# Folders people drop into the Inbox that are parts of an old Vantage user: they go back where they belong, not into materials.
PIECES = {"02_workflow": ["02_workflow"], "01_user_documents": ["01_user_documents"], "materials": ["01_user_documents", "materials"],
          "--usersetting": ["01_user_documents", "--usersettings"], "--usersettings": ["01_user_documents", "--usersettings"],
          "role_model": ["01_user_documents", "00_other_cv_as_role_model"], "00_other_cv_as_role_model": ["01_user_documents", "00_other_cv_as_role_model"],
          "daily_recommendation_from_nova": ["02_workflow", "Laporan_Pagi"], "laporan_pagi": ["02_workflow", "Laporan_Pagi"],
          "01_pipeline": ["02_workflow", "01_Pipeline"], "02_sent": ["02_workflow", "02_Sent"], "03_tracker": ["02_workflow", "03_Tracker"],
          "master_cv": ["01_user_documents", "Master_CV"], "your_recalling_journey": ["01_user_documents", "your_recalling_journey"],
          "recommended_skill_for_you": ["01_user_documents", "recommended_skill_for_you"]}


def template_like(path):
    try:
        t = open(lp(path), encoding="utf-8", errors="ignore").read()
    except OSError:
        return False
    s = t.strip()
    return (not s) or "(belum ada data" in s or "<TAILOR" in s or s in ("[]", "{}") or re.fullmatch(r'\{\s*"applications"\s*:\s*\[\s*\]\s*\}', s) is not None


def main():
    a = sys.argv[1:]
    pos = [x for x in a if not x.startswith("--")]
    inbox_mode = "--inbox" in a
    if len(pos) < (1 if inbox_mode else 2):
        sys.exit("pakai: python3 import_old.py <source> [--apply] <user folder>   |   python3 import_old.py --inbox [--apply] <user folder>")
    user = os.path.abspath(pos[-1])
    source = os.path.join(user, INBOX) if inbox_mode else os.path.abspath(pos[0])
    apply = "--apply" in a
    tmp = None
    if not os.path.exists(source):
        sys.exit("The source was not found.")
    if os.path.isfile(source) and source.lower().endswith(".zip"):
        tmp = tempfile.mkdtemp(prefix="vantage_import_")
        safe_extract(source, tmp)
        source = tmp
    if not os.path.isdir(os.path.join(user, "01_user_documents")):
        sys.exit("The target is not a Vantage user folder.")
    roots = [] if inbox_mode else find_roots(source)
    plan = {"source": source if not tmp else pos[0], "roots_found": [os.path.basename(r) for r in roots], "root": "", "copy": [], "same": 0, "replace_template": [], "conflicts": [],
            "errors": [], "todo": [], "to_inbox": False, "bytes": 0, "entries": [], "inbox_kept": []}
    cur = [None]
    jobs = []   # (src, dst, kind)
    def add(src, parts):
        dst = os.path.join(user, *parts)
        if not os.path.exists(lp(dst)):
            jobs.append((src, dst, "copy", cur[0])); plan["copy"].append("/".join(parts)); return
        if os.path.isdir(lp(dst)):
            return
        try:
            if sha(src) == sha(dst):
                plan["same"] += 1; return
        except OSError as e:
            plan["errors"].append({"file": "/".join(parts), "error": why(e)}); return
        if os.path.basename(dst).lower() in USER_JSON and template_like(dst):
            jobs.append((src, dst, "replace", cur[0])); plan["replace_template"].append("/".join(parts)); return
        stem, ext = os.path.splitext(dst)
        alt = stem + ".from_old" + ext
        n = 2
        while os.path.exists(lp(alt)):
            alt = f"{stem}.from_old_{n}{ext}"; n += 1
        jobs.append((src, alt, "conflict", cur[0])); plan["conflicts"].append({"file": "/".join(parts), "kept_as": os.path.basename(alt)})
    def walk_old(root, prefix):
        for dp, dns, fns in os.walk(root):
            rel_dir = os.path.relpath(dp, root)
            rel_parts_dir = [] if rel_dir == "." else rel_dir.split(os.sep)
            # skip system folders anywhere at the top of the old user, and old caches
            dns[:] = [d for d in dns if not (len(rel_parts_dir) == 0 and d.lower() in SYSTEM_DIRS) and d.lower() not in ("__pycache__", ".git", "node_modules", ".venv", "update_backup")]
            for fn in fns:
                if fn in (".DS_Store", "Thumbs.db") or fn.endswith(".pyc") or fn.startswith("~$"):
                    continue
                src = os.path.join(dp, fn)
                parts = new_rel(prefix + rel_parts_dir + [fn])
                if not prefix and len(parts) == 1 and fn.lower() == "claude.md":
                    parts = ["01_user_documents", "--usersettings", "imported", "CLAUDE_old.md"]
                    plan["todo"].append("The old CLAUDE.md was saved as --usersettings/imported/CLAUDE_old.md: ask Raka to move your personal rules into the new CLAUDE.md.")
                elif parts[0] not in ("01_user_documents", "02_workflow", INBOX):
                    # loose top-level files/folders of an old layout go to the Inbox for a tidy-up
                    if len(parts) == 1 and fn.lower() in USER_JSON:
                        parts = ["01_user_documents", "--usersettings", fn]
                    else:
                        parts = [INBOX, "_from_old_folder"] + parts
                        plan["to_inbox"] = True
                add(src, parts)
    if inbox_mode:
        for name in sorted(os.listdir(source)):
            pth = os.path.join(source, name); low = name.lower()
            if name.startswith((".", "_from_old")) or low in ("desktop.ini", "thumbs.db"):
                continue
            cur[0] = name
            if os.path.isdir(pth):
                if low in PIECES:
                    walk_old(pth, PIECES[low])
                else:
                    rts = find_roots(pth, depth=2)
                    if not rts:
                        plan["inbox_kept"].append(name); continue
                    for r in rts:
                        walk_old(r, [])
            else:
                if low in RAW_ALIASES:
                    add(pth, ["01_user_documents", "raw_facts_about_you.md"])
                elif low in USER_JSON:
                    add(pth, ["01_user_documents", "--usersettings", name])
                elif low == "claude.md":
                    add(pth, ["01_user_documents", "--usersettings", "imported", "CLAUDE_old.md"])
                else:
                    plan["inbox_kept"].append(name); continue
            plan["entries"].append(name)
        plan["root"] = ", ".join(plan["entries"])
    if roots:
        root = roots[0]
        plan["root"] = os.path.basename(root)
        if len(roots) > 1:
            plan["todo"].append("More than one old user was found (" + ", ".join(plan["roots_found"]) + "); the one with the most Vantage files was used. Run it again on the other folder if needed.")
        walk_old(root, [])
        if any(re.match(r"^\d{2} - ", p) for p in [d for _, ds, _ in os.walk(os.path.join(root, "02_workflow")) for d in ds] if os.path.isdir(os.path.join(root, "02_workflow"))):
            plan["todo"].append("Old month folders (NN - Month) were copied as they are: ask Nova to run the 2026-10-14 migration (it renames them and updates applications.json).")
    elif not inbox_mode:
        # No Vantage layout at all (for example folders that were just collected): everything goes to the Inbox for Raka's tidy-up.
        base = os.path.basename(source.rstrip("/\\")) or "imported"
        for dp, dns, fns in os.walk(source):
            dns[:] = [d for d in dns if d.lower() not in SYSTEM_DIRS]
            for fn in fns:
                if fn in (".DS_Store", "Thumbs.db"):
                    continue
                src = os.path.join(dp, fn)
                add(src, [INBOX, "_from_old_folder", base] + os.path.relpath(src, source).split(os.sep))
        plan["to_inbox"] = True
        plan["todo"].append("No old Vantage layout was found, so everything was put in the Inbox. Press Tidy up with Nova to sort it.")
    longest = max([len(d) for _, d, _, _ in jobs] + [0])
    if os.name == "nt" and longest > 240:
        plan["todo"].append(f"Some paths are very long ({longest} characters). Move your Vantage folder closer to the drive root (for example C:\\Vantage) if anything fails.")
    plan["bytes"] = sum(os.path.getsize(lp(x[0])) for x in jobs if os.path.exists(lp(x[0])))
    if apply:
        done = 0
        bad = set()
        for src, dst, kind, ent in jobs:
            try:
                os.makedirs(lp(os.path.dirname(dst)), exist_ok=True)
                shutil.copy2(lp(src), lp(dst))
                done += 1
            except OSError as e:
                plan["errors"].append({"file": os.path.relpath(dst, user), "error": why(e)}); bad.add(ent)
        plan["applied"] = done
        if inbox_mode:
            # What was imported leaves the Inbox (moved, not deleted) so the next tidy-up does not see it again.
            import datetime
            stash = os.path.join(user, "01_user_documents", "--usersettings", "imported", "inbox_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S"))
            for name in plan["entries"]:
                if name in bad:
                    plan["inbox_kept"].append(name); continue
                try:
                    os.makedirs(lp(stash), exist_ok=True)
                    shutil.move(lp(os.path.join(source, name)), lp(os.path.join(stash, name)))
                except OSError as e:
                    plan["inbox_kept"].append(name)
                    plan["todo"].append(name + ": copied, but the original is still in the Inbox (" + why(e) + "). Delete it by hand.")
        log = os.path.join(user, "01_user_documents", "--usersettings", "import_log.json")
        try:
            json.dump({k: v for k, v in plan.items() if k != "bytes"}, open(lp(log), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        except OSError:
            pass
    if tmp:
        shutil.rmtree(tmp, ignore_errors=True)
    plan["copy"] = plan["copy"][:200] + (["... +%d more" % (len(plan["copy"]) - 200)] if len(plan["copy"]) > 200 else [])
    print(json.dumps(plan, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
