#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Take an exported Vantage account (backup_user.py) back in, EXACTLY, and prove that nothing is missing (stdlib only).

pakai: python3 account_import.py <package.zip | unzipped package folder> [--apply | --verify] <user folder>
  (no flag)  plan only: what would be copied / is identical / would be kept side by side. Nothing is written.
  --apply    copies. Safe to run again: only what is missing or changed is copied; a failed file is retried.
  --verify   writes nothing but the report: compares the package with the user folder, file by file (sha256), and lists what is missing or different.
Rules: nothing is overwritten. An identical file is skipped. A different file is kept next to the existing one as "<name>.from_old<ext>".
  A fresh account (no applications, no facts, no materials) takes the package's version of the template files (identity, settings, CLAUDE.md ...).
  applications.json and app_prefs.json are MERGED (every application and every note comes in; yours stay as they are).
  A file that cannot be copied (open in another program, a folder with the same name in the way, path too long, disk full) is named with the reason and a hint, the rest carries on.
  Every run writes --usersettings/import_report.md and import_report.json; Nova, Raka and Laras read the report and can finish what is open.
Prints JSON. Packages without vantage_export.json (older backups) are accepted: the list is made from the zip itself. A package that is not an account at all
(an old Vantage folder, loose folders) prints {"kind": "legacy"}: use import_old.py for that.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import datetime
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile

FORMAT, VERSION = "vantage-account", 1
MANIFEST = "vantage_export.json"
TOPS = ("01_user_documents", "02_workflow", "--- I N B O X ---", "CLAUDE.md")
US = "01_user_documents/--usersettings/"
FRESH_REPLACE = {"CLAUDE.md", US + "JD_Insights.md", "01_user_documents/materials/00_index.md"}   # template files a fresh account takes from the package
REBUILT = {US + "ui_context.md", US + "import_report.md", US + "import_report.json"}   # the app writes these itself
USER_FILES = {"identity.json", "search_settings.json", "daily_jobs_seen.json", "job_profile.md", "jd_insights.md", "status.md", "applications.json", "app_prefs.json"}


def lp(p):
    p = os.path.abspath(p)
    return "\\\\?\\" + p if os.name == "nt" and not p.startswith("\\\\?\\") else p


def sha_file(p):
    h = hashlib.sha256()
    with open(lp(p), "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def why(e):
    """Plain words for the reason, and what to do about it."""
    w = getattr(e, "winerror", 0)
    if isinstance(e, PermissionError) or w in (5, 32, 33):
        return "in use by another program", "Close Word, a PDF reader or File Explorer windows that show your Vantage folder, then run the import again."
    if isinstance(e, (IsADirectoryError, NotADirectoryError)):
        return "a folder with the same name is in the way", "Rename or move that folder in your Vantage folder, then run the import again."
    if w in (3, 206) or "File name too long" in str(e):
        return "the path is too long for Windows", "Move your Vantage folder closer to the drive root (for example C:\\Vantage) and run the import again."
    if getattr(e, "errno", 0) == 28 or w == 112:
        return "the disk is full", "Free some disk space and run the import again."
    if isinstance(e, zipfile.BadZipFile) or "CRC" in str(e) or "Bad CRC" in str(e):
        return "the file is damaged inside the package", "Export the account again from the old computer and import the new package."
    return str(e)[:160], "Run the import again; if it repeats, ask Nova to look at import_report.md."


def safe_name(rel):
    if not rel or rel.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", rel) or ".." in rel.replace("\\", "/").split("/"):
        return False
    return True


class Source:
    """A zip or an unzipped folder; read-only."""
    def __init__(self, path):
        self.path, self.zip, self.members = path, None, {}
        if os.path.isdir(path):
            for dp, dns, fns in os.walk(path):
                for fn in fns:
                    full = os.path.join(dp, fn)
                    self.members[os.path.relpath(full, path).replace(os.sep, "/")] = full
        else:
            self.zip = zipfile.ZipFile(lp(path))
            for i in self.zip.infolist():
                if not i.filename.endswith("/"):
                    self.members[i.filename] = i

    def open(self, rel):
        return self.zip.open(self.members[rel]) if self.zip else open(lp(self.members[rel]), "rb")

    def read_json(self, rel):
        with self.open(rel) as f:
            return json.loads(f.read().decode("utf-8"))

    def hash(self, rel):
        h = hashlib.sha256()
        with self.open(rel) as f:
            for b in iter(lambda: f.read(1 << 20), b""):
                h.update(b)
        return h.hexdigest()


def is_fresh(user):
    """An account nobody has used yet: no applications, no facts, no materials, nothing in the Inbox."""
    us = os.path.join(user, "01_user_documents")
    try:
        apps = json.load(open(lp(os.path.join(us, "--usersettings", "applications.json")), encoding="utf-8")).get("applications", [])
    except (OSError, ValueError):
        apps = []
    facts = os.path.join(us, "raw_facts_about_you.md")
    mats = os.path.join(us, "materials")
    inbox = os.path.join(user, "--- I N B O X ---")
    used_mats = os.path.isdir(mats) and any(n not in ("00_index.md", ".keep", ".DS_Store") for n in os.listdir(mats))
    used_inbox = os.path.isdir(inbox) and any(not n.startswith(".") for n in os.listdir(inbox))
    wf = os.path.join(user, "02_workflow")
    used_wf = any(os.path.isdir(os.path.join(wf, d)) and any(not n.startswith(".") for n in os.listdir(os.path.join(wf, d))) for d in ("01_Pipeline", "02_Sent")) if os.path.isdir(wf) else False
    return not apps and not (os.path.isfile(facts) and os.path.getsize(facts) > 200) and not used_mats and not used_inbox and not used_wf


def merge_apps(existing, incoming, fresh, pkg):
    """Union by id. Same id and same content: nothing. Same id, different content: yours stays, the imported one comes in as '<id>-imported'."""
    if fresh:
        return incoming, {"added": len(incoming.get("applications", [])), "kept_both": []}
    out = json.loads(json.dumps(existing))
    apps = out.setdefault("applications", [])
    have = {a.get("id"): a for a in apps}
    added, both = 0, []
    for a in incoming.get("applications", []):
        i = a.get("id")
        if i not in have:
            apps.append(a)
            have[i] = a
            added += 1
        elif have[i] != a:
            b = dict(a)
            b["id"] = f"{i}-imported"
            b["catatan"] = (str(b.get("catatan", "")) + f" (imported from {pkg}; your own entry for this id was kept)").strip()
            if b["id"] not in have:
                apps.append(b)
                have[b["id"]] = b
                added += 1
            both.append(str(i))
    for k, v in incoming.items():
        if k == "applications":
            continue
        if k not in out or (k == "meta" and isinstance(v, dict) and "<TAILOR" in json.dumps(out.get(k, {}))):
            out[k] = v
    return out, {"added": added, "kept_both": both}


def merge_prefs(existing, incoming, fresh):
    """Every note and choice comes in. Fresh account: the package wins on conflicts. Otherwise yours win."""
    out = json.loads(json.dumps(existing))
    for k, v in incoming.items():
        if k not in out:
            out[k] = v
        elif isinstance(v, dict) and isinstance(out[k], dict):
            for kk, vv in v.items():
                if kk not in out[k] or fresh:
                    out[k][kk] = vv
        elif fresh:
            out[k] = v
    return out


def write_atomic(path, data, binary=False):
    os.makedirs(lp(os.path.dirname(path)), exist_ok=True)
    tmp = path + ".vtmp"
    with open(lp(tmp), "wb") as f:
        f.write(data if binary else data.encode("utf-8"))
    os.replace(lp(tmp), lp(path))


def copy_member(src, rel, dst):
    """Stream one file out of the package into a temp file, check its hash on the way, then move it into place."""
    os.makedirs(lp(os.path.dirname(dst)), exist_ok=True)
    tmp = dst + ".vtmp"
    h = hashlib.sha256()
    try:
        with src.open(rel) as fi, open(lp(tmp), "wb") as fo:
            for b in iter(lambda: fi.read(1 << 20), b""):
                h.update(b)
                fo.write(b)
        os.replace(lp(tmp), lp(dst))
    except BaseException:
        try:
            os.remove(lp(tmp))
        except OSError:
            pass
        raise
    return h.hexdigest()


def side_name(dst):
    stem, ext = os.path.splitext(dst)
    alt, n = stem + ".from_old" + ext, 2
    while os.path.exists(lp(alt)):
        alt = f"{stem}.from_old_{n}{ext}"
        n += 1
    return alt


def main():
    a = sys.argv[1:]
    pos = [x for x in a if not x.startswith("--")]
    if len(pos) < 2:
        sys.exit("pakai: python3 account_import.py <package.zip | folder> [--apply | --verify] <user folder>")
    source_path, user = os.path.abspath(pos[0]), os.path.abspath(pos[-1])
    apply, verify_only = "--apply" in a, "--verify" in a
    if not os.path.exists(source_path):
        sys.exit("The package was not found.")
    if not os.path.isdir(os.path.join(user, "01_user_documents")):
        sys.exit("The target is not a Vantage user folder.")
    try:
        src = Source(source_path)
    except (zipfile.BadZipFile, OSError) as e:
        sys.exit("The package cannot be opened (" + why(e)[0] + "). Export the account again and use the new file.")
    names = set(src.members)
    manifest, warn = None, []
    if MANIFEST in names:
        try:
            manifest = src.read_json(MANIFEST)
        except ValueError:
            warn.append("The file list inside the package is damaged; the list was rebuilt from the package itself.")
    has_data = any(n.split("/")[0] == "01_user_documents" for n in names)
    if not has_data:
        print(json.dumps({"kind": "legacy", "source": source_path}))
        return
    unsafe = [n for n in names if not safe_name(n)]
    if unsafe:
        sys.exit("The package contains an unsafe path (" + unsafe[0] + "). Nothing was imported.")
    if manifest and manifest.get("format") != FORMAT:
        manifest = None
    if manifest and int(manifest.get("version", 1)) > VERSION:
        warn.append("This package was made by a newer Vantage (format %s). Import it after updating Vantage; what is known is imported anyway." % manifest.get("version"))
    declared = {f["path"]: f for f in (manifest or {}).get("files", [])}
    not_exported = (manifest or {}).get("not_exported", [])
    files = [n for n in sorted(names) if n != MANIFEST and n.split("/")[0] in TOPS and not n.endswith(".vtmp")]
    skipped_other = [n for n in sorted(names) if n != MANIFEST and n.split("/")[0] not in TOPS]
    fresh = is_fresh(user)
    pkg = os.path.basename(source_path)
    res = {"kind": "account", "source": source_path, "package": pkg, "format": "manifest" if manifest else "inferred", "fresh_target": fresh, "files_in_package": len(files),
           "copy": [], "same": 0, "replaced": [], "conflicts": [], "merged": {}, "failed": [], "damaged": [], "missing_in_package": not_exported, "skipped": [], "warnings": warn,
           "applied": 0, "todo": [], "verify": {}, "report": ""}
    jobs = []   # (rel, dst, kind, expected_sha)
    for rel in files:
        dst = os.path.join(user, *rel.split("/"))
        exp = (declared.get(rel) or {}).get("sha256")
        try:
            got = src.hash(rel)
        except Exception as e:  # noqa: BLE001  damaged member
            r, h = why(e)
            res["damaged"].append({"file": rel, "reason": r, "hint": h})
            continue
        if exp and got != exp:
            res["damaged"].append({"file": rel, "reason": "the file inside the package does not match the list (damaged in transit)", "hint": "Export the account again and import the new package."})
            continue
        if rel in REBUILT:
            res["skipped"].append({"file": rel, "why": "rebuilt by the app"})
            continue
        low = os.path.basename(rel).lower()
        if os.path.isdir(lp(dst)):
            jobs.append((rel, dst, "blocked", got))
        elif rel == US + "app_prefs.json" or (rel == US + "applications.json" and not fresh):
            jobs.append((rel, dst, "merge", got))
        elif not os.path.exists(lp(dst)):
            jobs.append((rel, dst, "copy", got))
        else:
            try:
                same = sha_file(dst) == got
            except OSError as e:
                r, h = why(e)
                res["failed"].append({"file": rel, "reason": r, "hint": h})
                continue
            if same:
                res["same"] += 1
            elif fresh and (rel in FRESH_REPLACE or (rel.startswith(US) and rel.count("/") == 2 and low in USER_FILES)):
                jobs.append((rel, dst, "replace", got))
            else:
                jobs.append((rel, dst, "side", got))
        if jobs and jobs[-1][0] == rel and jobs[-1][2] == "side" and rel == "CLAUDE.md":
            res["todo"].append("The CLAUDE.md in the package differs from the one here. It was kept as CLAUDE.from_old.md: ask Nova to merge the personal rules into CLAUDE.md.")
    for rel, dst, kind, got in jobs:
        if kind == "copy":
            res["copy"].append(rel)
        elif kind == "replace":
            res["replaced"].append(rel)
        elif kind == "side":
            res["conflicts"].append({"file": rel, "kept_as": os.path.basename(side_name(dst))})
        elif kind == "blocked":
            res["failed"].append({"file": rel, "reason": "a folder with the same name is in the way", "hint": "Rename or move that folder in your Vantage folder, then run the import again."})
    if apply and not verify_only:
        done = 0
        for rel, dst, kind, got in jobs:
            try:
                if kind == "blocked":
                    continue
                if kind == "merge":
                    inc = src.read_json(rel)
                    try:
                        cur = json.load(open(lp(dst), encoding="utf-8")) if os.path.exists(lp(dst)) else {}
                    except ValueError:
                        shutil.copy2(lp(dst), lp(dst + ".damaged"))
                        cur = {}
                    if rel.endswith("applications.json"):
                        out, info = merge_apps(cur, inc, fresh, pkg)
                        res["merged"]["applications.json"] = info
                        if os.path.exists(lp(dst)) and cur != out:
                            stem, ext = os.path.splitext(dst)
                            shutil.copy2(lp(dst), lp(stem + ".before_import" + ext))
                    else:
                        out = merge_prefs(cur, inc, fresh)
                        res["merged"]["app_prefs.json"] = {"keys": len(inc)}
                    write_atomic(dst, json.dumps(out, ensure_ascii=False, indent=2) + "\n")
                elif kind == "side":
                    copy_member(src, rel, side_name(dst))
                else:
                    copy_member(src, rel, dst)
                done += 1
            except Exception as e:  # noqa: BLE001
                r, h = why(e)
                res["failed"].append({"file": rel, "reason": r, "hint": h})
        res["applied"] = done
    # ---- verification: every file of the package, compared with what is in the account now
    ver = {"ok": 0, "missing": [], "different": []}
    failed_set = {f["file"] for f in res["failed"]} | {d["file"] for d in res["damaged"]}
    for rel in (files if (apply or verify_only) else []):      # a plan has nothing to verify yet
        if rel in REBUILT or rel in {d["file"] for d in res["damaged"]}:
            continue
        dst = os.path.join(user, *rel.split("/"))
        try:
            got = src.hash(rel)
        except Exception:  # noqa: BLE001
            continue
        if rel == US + "applications.json":
            try:
                cur = json.load(open(lp(dst), encoding="utf-8"))
                have = {x.get("id") for x in cur.get("applications", [])}
                inc = src.read_json(rel)
                lost = [x.get("id") for x in inc.get("applications", []) if x.get("id") not in have]
                (ver.__setitem__("ok", ver["ok"] + 1) if not lost else ver["missing"].append({"file": rel, "detail": "applications missing: " + ", ".join(map(str, lost[:8]))}))
            except (OSError, ValueError):
                ver["missing"].append({"file": rel, "detail": "applications.json cannot be read"})
        elif rel == US + "app_prefs.json":
            try:
                cur = json.load(open(lp(dst), encoding="utf-8"))
                inc = src.read_json(rel)
                lost = [k for k in inc if k not in cur]
                (ver.__setitem__("ok", ver["ok"] + 1) if not lost else ver["missing"].append({"file": rel, "detail": "settings missing: " + ", ".join(lost[:8])}))
            except (OSError, ValueError):
                ver["missing"].append({"file": rel, "detail": "app_prefs.json cannot be read"})
        else:
            try:
                if os.path.exists(lp(dst)) and sha_file(dst) == got:
                    ver["ok"] += 1
                    continue
                side = [os.path.join(os.path.dirname(dst), n) for n in (os.listdir(lp(os.path.dirname(dst))) if os.path.isdir(lp(os.path.dirname(dst))) else []) if ".from_old" in n and n.startswith(os.path.splitext(os.path.basename(dst))[0])]
                if any(sha_file(s) == got for s in side):
                    ver["ok"] += 1
                elif not os.path.exists(lp(dst)):
                    if rel not in failed_set:
                        ver["missing"].append({"file": rel, "detail": "not in your folder"})
                else:
                    ver["different"].append({"file": rel, "detail": "differs from the package and no side-by-side copy exists"})
            except OSError as e:
                ver["missing"].append({"file": rel, "detail": why(e)[0]})
    open_items = len(res["failed"]) + len(res["damaged"]) + len(ver["missing"]) + len(ver["different"])
    res["verify"] = ver if (apply or verify_only) else {}
    res["complete"] = open_items == 0
    res["open_items"] = open_items
    # ---- report for the person and for Nova / Raka / Laras
    if apply or verify_only:
        rep_dir = os.path.join(user, "01_user_documents", "--usersettings")
        L = [f"# Import report", "", f"- Package: `{source_path}`", f"- Checked: {datetime.datetime.now().isoformat(timespec='seconds')}", f"- Files in the package: {res['files_in_package']}",
             f"- Accounted for: {ver['ok']} of {len(files) - len(res['skipped'])}", f"- Open items: {open_items}", ""]
        if open_items:
            L += ["## Open items (for Nova)", "", "Work through these one by one. After fixing, run again:", f"`python3 ./--settings/scripts/account_import.py \"{source_path}\" --apply ./`", "", "| File | What is wrong | What to do |", "|---|---|---|"]
            for f in res["failed"]:
                L.append(f"| {f['file']} | {f['reason']} | {f['hint']} |")
            for f in res["damaged"]:
                L.append(f"| {f['file']} | {f['reason']} | {f['hint']} |")
            for f in ver["missing"]:
                L.append(f"| {f['file']} | missing: {f['detail']} | Run the import again. If it stays missing, copy it by hand from the package. |")
            for f in ver["different"]:
                L.append(f"| {f['file']} | {f['detail']} | Compare both files with the user and keep the right one. |")
            L.append("")
        if res["missing_in_package"]:
            L += ["## Not in the package (the old computer could not read them when exporting)", ""] + [f"- {x['file']}: {x['why']}" for x in res["missing_in_package"]] + ["", "Ask the user to close the program that used them and export again, or copy them by hand.", ""]
        if res["conflicts"]:
            L += ["## Kept side by side (both versions exist)", ""] + [f"- {c['file']} -> {c['kept_as']}" for c in res["conflicts"]] + ["", "Ask the user which version to keep; do not delete one without asking.", ""]
        if res["merged"]:
            L += ["## Merged", ""] + [f"- {k}: {json.dumps(v, ensure_ascii=False)}" for k, v in res["merged"].items()] + [""]
        for t in res["todo"] + warn:
            L.append(f"- {t}")
        try:
            write_atomic(os.path.join(rep_dir, "import_report.md"), "\n".join(L) + "\n")
            write_atomic(os.path.join(rep_dir, "import_report.json"), json.dumps({k: v for k, v in res.items() if k not in ("copy",)}, ensure_ascii=False, indent=1))
            res["report"] = "01_user_documents/--usersettings/import_report.md"
        except OSError:
            pass
    res["counts"] = {"copy": len(res["copy"]), "same": res["same"], "replaced": len(res["replaced"]), "conflicts": len(res["conflicts"]), "failed": len(res["failed"]), "damaged": len(res["damaged"]), "merged": len(res["merged"])}
    res["copy"] = res["copy"][:100] + (["... +%d more" % (len(res["copy"]) - 100)] if len(res["copy"]) > 100 else [])
    print(json.dumps(res, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
