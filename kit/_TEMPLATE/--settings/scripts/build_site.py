#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Personal page: turns the Master CV content (JSON) into ONE self-contained web page (index.html, no internet, no tracking).

pakai: python3 build_site.py <master_cv_content.json> [--no-contact] [--out <index.html>]
Opt-in and local: nothing is uploaded. The page has light and dark mode, prints as a clean CV, and by default leaves out phone and
address (contact lines are only included without --no-contact). Host it anywhere (GitHub Pages, Netlify) only if YOU decide to.
"""
import _utf8  # noqa: F401  (output is UTF-8 on Windows too)
import html
import json
import os
import re
import sys

CSS = """
:root{--bg:#faf8f4;--ink:#1f1d1a;--mut:#6b675f;--line:#e6e1d7;--acc:#d9531e;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#161513;--ink:#ece8df;--mut:#9a958a;--line:#2b2925;--acc:#ff8a56;--card:#1d1c19}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:860px;margin:0 auto;padding:64px 24px 80px}
.hero{display:flex;gap:28px;align-items:center;margin-bottom:46px}.ph{width:112px;height:112px;border-radius:50%;background:var(--acc);color:#fff;display:grid;place-items:center;font:600 40px system-ui;flex:none}
h1{margin:0;font-size:44px;line-height:1.1;letter-spacing:-.02em}.tag{color:var(--acc);font-weight:600;margin:8px 0 0}.pro{margin:18px 0 0;color:var(--mut);max-width:60ch}
h2{font:600 12px ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);margin:48px 0 14px}
.row{display:grid;grid-template-columns:170px 1fr;gap:6px 28px;padding:18px 0;border-top:1px solid var(--line)}.when{color:var(--mut);font-size:14px}
.row h3{margin:0;font-size:19px}.org{color:var(--acc);font-weight:600;font-size:15px}.row ul{margin:8px 0 0;padding-left:18px}.row li{margin:3px 0}.ctx{color:var(--mut);font-style:italic;margin:4px 0 0}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:5px 14px;font-size:14px}.chip b{color:var(--acc);font-weight:600}
footer{margin-top:56px;color:var(--mut);font-size:13px;border-top:1px solid var(--line);padding-top:18px}
@media (max-width:640px){.hero{flex-direction:column;align-items:flex-start}.row{grid-template-columns:1fr}h1{font-size:34px}}
@media print{body{background:#fff;color:#000}.ph{display:none}main{padding:0}a{color:inherit}}
"""


def e(s):
    return html.escape(str(s or ""))


def initials(name):
    return "".join(w[0] for w in re.split(r"\s+", name.strip())[:2]).upper() or "?"


def build(c, contact=True):
    name = c.get("name") or "Your Name"
    secs = []
    for sec in c.get("sections", []):
        rows = []
        for ent in sec.get("entries", []):
            right = [x.strip() for x in str(ent.get("right", "")).split("|")]
            when = next((x for x in right if any(ch.isdigit() for ch in x)), right[-1] if right else "")
            org = f'<div class="org">{e(ent["org"])}</div>' if ent.get("org") else ""
            ctx = f'<p class="ctx">{e(ent["context"])}</p>' if ent.get("context") else ""
            lis = "".join(f'<li>{"<b>" + e(l) + ":</b> " if l else ""}{e(t)}</li>' for l, t in ent.get("bullets", []))
            rows.append(f'<div class="row"><div class="when">{e(when)}</div><div><h3>{e(ent["role"])}</h3>{org}{ctx}{"<ul>" + lis + "</ul>" if lis else ""}</div></div>')
        secs.append(f'<h2>{e(sec["title"])}</h2>' + "".join(rows))
    skills = "".join(f'<span class="chip"><b>{e(l)}</b> {e(t)}</span>' for l, t in c.get("skills", []))
    cont = " · ".join(e(x) for x in c.get("contact", [])) if contact and c.get("contact") else ""
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(name)}</title><meta name="description" content="{e(c.get('tagline', ''))}"><style>{CSS}</style></head><body><main>
<div class="hero"><div class="ph">{e(initials(name))}</div><div><h1>{e(name)}</h1><p class="tag">{e(c.get('tagline', ''))}</p><p class="pro">{e(c.get('profile', ''))}</p></div></div>
{''.join(secs)}<h2>{e(c.get('skills_title', 'Skills'))}</h2><div class="chips">{skills}</div>
<footer>{cont + ' · ' if cont else ''}Made with Vantage. This page is a copy of my CV, nothing is tracked.</footer></main></body></html>"""


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit("pakai: python3 build_site.py <master_cv_content.json> [--no-contact] [--out <index.html>]")
    with open(args[0], encoding="utf-8") as f:
        c = json.load(f)
    if any("<TAILOR" in json.dumps(c.get(k, "")) for k in ("profile", "tagline")):
        sys.exit("The Master CV still has <TAILOR> fields. Finish it first.")
    out = os.path.join(os.path.dirname(os.path.abspath(args[0])), "site", "index.html")
    if "--out" in sys.argv:
        out = sys.argv[sys.argv.index("--out") + 1]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        f.write(build(c, contact="--no-contact" not in sys.argv))
    print(out)


if __name__ == "__main__":
    main()
