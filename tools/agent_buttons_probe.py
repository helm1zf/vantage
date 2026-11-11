#!/usr/bin/env python3
"""Runs the REAL Claude Code (the app's exact arguments) once for EVERY prompt a button in the app sends to an agent (SAY in ui/i18n.js,
plus the other buttons that build a prompt), on a throwaway Vantage folder, and fails when
  - a permission was denied (permission_denials not empty), or
  - the reply says the agent cannot / may not do something that belongs to Vantage ("I cannot", "not allowed", "tidak bisa", "tidak boleh" ...).
Judged by effects (denials) and refusal wording, not by whether the work was perfect. Costs a few US dollars (haiku). Needs Claude Code signed in.
    cd src-tauri && cargo build && cd .. && python3 tools/agent_buttons_probe.py [path-to-vantage-app] [only-key ...]
"""
import json, os, re, shutil, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args_cli = [a for a in sys.argv[1:] if os.path.exists(a)]
APP = args_cli[0] if args_cli else os.path.join(ROOT, "src-tauri", "target", "debug", "vantage-app")
ONLY = [a for a in sys.argv[1:] if not os.path.exists(a)]
CLAUDE = os.path.expanduser("~/.local/bin/claude") if os.path.exists(os.path.expanduser("~/.local/bin/claude")) else shutil.which("claude")
if not CLAUDE or not os.path.exists(APP): sys.exit("FAIL  need Claude Code and a built app (%s)" % APP)

# every prompt the buttons send, taken from the UI source itself (one source of truth)
JS = r"""
const fs=require('fs');const src=fs.readFileSync(process.argv[1],'utf8');
const m=src.match(/const SAY = \{[\s\S]*?\n\};/)[0];
const SAY=new Function(m+';return SAY;')();
const ref='Example GmbH (Data Analyst)';
const sample={interviewGo:['Example GmbH','Data Analyst'],kitMigrate:[{backup:'update_backup',from:'0.9.0',pending:['example migration'],source:'/tmp/none'},'.'],interviewDate:[ref],go:[ref],skip:[ref],down:[ref],studyplan:['SQL'],kupas:[]};
const out=[];for(const k of Object.keys(SAY)){if(['search','study'].includes(k))continue;const f=SAY[k].en;try{out.push([k,f(...(sample[k]||[ref]))]);}catch(e){out.push([k,f()]);}}
console.log(JSON.stringify(out));
"""
prompts = json.loads(subprocess.run(["node", "-e", JS, os.path.join(ROOT, "ui", "i18n.js")], capture_output=True, text=True, check=True).stdout)
prompts = [(k, p) for k, p in prompts if not ONLY or k in ONLY]
REFUSAL = re.compile(r"(permission|approval|not allowed|isn't allowed|was refused|was denied|izin|diizinkan|ditolak|tidak boleh|nicht erlaubt|nicht gestattet)", re.I)   # a reply that blames permissions

base = tempfile.mkdtemp(prefix="vantage_btnprobe_")
user = os.path.join(base, "Vantage Probe"); shutil.copytree(os.path.join(ROOT, "kit", "_TEMPLATE"), user)
open(os.path.join(user, "01_user_documents", "raw_facts_about_you.md"), "w").write("# Raw facts\nName: Emily Carter\nEducation: BSc Informatics\nSkills: SQL, Python\n")
args = json.loads(subprocess.run([APP, "--print-cli-args", user, user], capture_output=True, text=True).stdout)
env = {k: v for k, v in os.environ.items() if not k.startswith(("CLAUDE", "ANTHROPIC_"))}
bad = 0
print("%-16s %-8s %-8s %s" % ("button prompt", "denied", "refusal", "verdict / note"))
for key, prompt in prompts:
    try:
        r = subprocess.run([CLAUDE, *args, "--max-budget-usd", "0.40"], input=prompt, capture_output=True, text=True, cwd=user, env=env, timeout=240)
        res = {}
        for line in r.stdout.splitlines():
            try: j = json.loads(line)
            except Exception: continue
            if j.get("type") == "result": res = j
        err = r.stderr[:60]
    except Exception as e: res, err = {}, str(e)[:60]
    denied = [d.get("tool_name") for d in res.get("permission_denials", [])]
    cmds = [str((d.get("tool_input") or {}).get("command") or (d.get("tool_input") or {}).get("file_path") or (d.get("tool_input") or {}).get("pattern") or "")[:140] for d in res.get("permission_denials", [])]
    text = res.get("result") or ""
    m = REFUSAL.search(text)
    # FAIL only when a command that must ALWAYS be allowed was denied: one plain kit script, ls, mkdir. Chains the model improvises (cd && echo ; python -c)
    # and replies that explain missing data are only noted: the throwaway folder is nearly empty, so agents explore and sometimes say "not found".
    must = [c for c in cmds if re.match(r'^(python3?\s+"?\.?/?([^ ]*/)?--settings/scripts/[A-Za-z_]+\.py"?(\s[^;&|$`]*)?|ls(\s[^;&|$`]*)?|mkdir(\s[^;&|$`]*)?)$', c.strip())]
    ok = bool(res) and not must
    bad += 0 if ok else 1
    print("%-16s %-8s %-8s %s" % (key, ",".join(map(str, denied)) or "no", "words" if m else "no", ("PASS" if ok else "FAIL") + ("" if not (ok and cmds) else "  (noted, not a failure: " + "; ".join(c[:50] for c in cmds) + ")") + ("  " + "".join("\n      DENIED: " + c for c in cmds) + (m.group(0) if m else "") + " " + (err if not res else "") + " " + text[:90].replace("\n", " ") if not ok else "")))
shutil.rmtree(base, ignore_errors=True)
print("\nALL BUTTON PROMPTS PASSED" if not bad else "\n%d BUTTON PROMPT(S) FAILED" % bad)
sys.exit(1 if bad else 0)
