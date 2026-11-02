#!/usr/bin/env python3
"""Prepare this repository for publishing (maintainer tool, run on the maintainer's computer).

    python3 tools/prepare_publish.py "<path to the Vantage package>"   # copies kit/, then checks
    python3 tools/prepare_publish.py --check                           # checks only

1. kit/  <- the Vantage package without personal data: root CLAUDE.md (developer-only sections removed),
   .claude/agents/*.md and _TEMPLATE/ (no caches, no .DS_Store).
2. Privacy check of every file that would be uploaded (git-tracked files, or all files minus .gitignore):
   names and words from tools/private_words.txt (kept out of git), e-mail addresses, phone numbers,
   absolute personal paths, private keys and tokens. Exit 1 if anything is found.
"""
import os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "kit")
SKIP_DIRS = {"node_modules", "target", "gen", "icons", ".git", "__pycache__", "graphify-out"}
SKIP_FILES = {".DS_Store"}
TEXT_EXT = {".md", ".py", ".json", ".js", ".html", ".css", ".rs", ".toml", ".yml", ".yaml", ".txt", ".sh", ".gitignore", ""}

PATTERNS = [
    (re.compile(r"/Users/(?!runner\b)[A-Za-z0-9._-]+"), "absolute macOS user path"),
    (re.compile(r"[A-Za-z]:\\{1,2}Users\\{1,2}(?!\.\.\.)[A-Za-z0-9_-][A-Za-z0-9._-]*"), "absolute Windows user path"),
    (re.compile(r"[A-Za-z0-9._%+-]+@(?!example\.(com|org|de))[A-Za-z0-9.-]+\.[a-z]{2,}"), "e-mail address"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|untrusted comment: (rsign|minisign) encrypted secret key"), "private key"),
    (re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b"), "token"),
    (re.compile(r"\+\d{2}\s?\d{3,4}\s?(?!0000000)\d{5,}"), "phone number"),
]
ALLOWED_EMAIL = re.compile(r"noreply@|@example\.|@users\.noreply\.github\.com|\.(png|jpe?g|svg|gif|webp|ico)$")


def copy_kit(pkg):
    if not os.path.isdir(os.path.join(pkg, "_TEMPLATE")):
        sys.exit(f"Not a Vantage package (no _TEMPLATE): {pkg}")
    if os.path.isdir(KIT):
        shutil.rmtree(KIT)
    ign = shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store", "graphify-out", "--")
    shutil.copytree(os.path.join(pkg, "_TEMPLATE"), os.path.join(KIT, "_TEMPLATE"), ignore=ign)
    os.makedirs(os.path.join(KIT, ".claude", "agents"))
    for f in sorted(os.listdir(os.path.join(pkg, ".claude", "agents"))):
        if f.endswith(".md"):
            shutil.copy2(os.path.join(pkg, ".claude", "agents", f), os.path.join(KIT, ".claude", "agents", f))
    text = open(os.path.join(pkg, "CLAUDE.md"), encoding="utf-8").read()
    text = re.split(r"\n## graphify\b", text)[0].rstrip() + "\n"  # developer-only section
    open(os.path.join(KIT, "CLAUDE.md"), "w", encoding="utf-8").write(text)
    print(f"kit/ copied from {os.path.basename(os.path.normpath(pkg))}")


def files_to_upload():
    try:
        out = subprocess.run(["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.split("\n")
        return [f for f in out if f]
    except (OSError, subprocess.CalledProcessError):
        res = []
        for d, dirs, fs in os.walk(ROOT):
            dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
            res += [os.path.relpath(os.path.join(d, f), ROOT) for f in fs if f not in SKIP_FILES]
        return res


def check():
    words_file = os.path.join(ROOT, "tools", "private_words.txt")
    words = [w.strip() for w in open(words_file, encoding="utf-8")] if os.path.isfile(words_file) else []
    words = [w for w in words if w and not w.startswith("#")]
    if not words:
        print("! tools/private_words.txt is missing or empty: names are not checked (add one name/word per line).")
    word_re = re.compile(r"\b(" + "|".join(re.escape(w) for w in words) + r")\b", re.I) if words else None
    problems = 0
    for rel in files_to_upload():
        if rel.replace("\\", "/") == "tools/private_words.txt":
            continue
        path = os.path.join(ROOT, rel)
        if any(part in SKIP_DIRS for part in rel.split(os.sep)) or os.path.basename(rel) in SKIP_FILES:
            print(f"x {rel}: should not be uploaded (cache or build output)")
            problems += 1
            continue
        ext = os.path.splitext(rel)[1].lower()
        if ext == ".pdf":
            try:
                text = subprocess.run(["pdftotext", path, "-"], capture_output=True, text=True).stdout
            except OSError:
                print(f"! {rel}: PDF not checked (pdftotext missing)")
                continue
        elif ext not in TEXT_EXT:
            continue
        else:
            try:
                text = open(path, encoding="utf-8").read()
            except (UnicodeDecodeError, OSError):
                continue
        for n, line in enumerate(text.split("\n"), 1):
            hits = []
            if word_re and word_re.search(line):
                hits.append("private name/word")
            for rx, label in PATTERNS:
                m = rx.search(line)
                if m and not (label == "e-mail address" and ALLOWED_EMAIL.search(m.group(0))):
                    hits.append(label)
            for h in hits:
                print(f"x {rel}:{n}: {h}: {line.strip()[:110]}")
                problems += 1
    print(f"\n{problems} problem(s) in the files that would be uploaded." if problems else "\nOK: nothing private found in the files that would be uploaded.")
    return problems == 0


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] != "--check":
        copy_kit(args[0])
    sys.exit(0 if check() else 1)
