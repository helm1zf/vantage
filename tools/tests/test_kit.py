"""Tests for the kit scripts the app runs: export/import of an account, moving and adding applications, the tracker export.

Run from the repository root:  python3 -m unittest discover -s tools/tests -v
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEMPLATE = os.path.join(ROOT, "kit", "_TEMPLATE")
SCRIPTS = os.path.join(TEMPLATE, "--settings", "scripts")
US = "01_user_documents/--usersettings/"


def run(script, *args, ok=True):
    # Windows gives a script's output a legacy code page (cp1252) when it is piped; run every script that way here too, so the
    # failure shows on a Mac as well. The scripts must still print UTF-8 (the app reads it as UTF-8).
    env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0")
    r = subprocess.run([sys.executable, os.path.join(SCRIPTS, script), *args], capture_output=True, env=env)
    r.stdout = r.stdout.decode("utf-8", errors="strict") if isinstance(r.stdout, bytes) else r.stdout
    r.stderr = r.stderr.decode("utf-8", errors="replace") if isinstance(r.stderr, bytes) else r.stderr
    if ok and r.returncode != 0:
        raise AssertionError(f"{script} exited {r.returncode}: {r.stderr or r.stdout}")
    return json.loads(r.stdout) if r.returncode == 0 else r


def sha(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def tree(root):
    out = {}
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ("--settings", "_Backups")]
        for f in fn:
            p = os.path.join(dp, f)
            out[os.path.relpath(p, root).replace(os.sep, "/")] = sha(p)
    return out


class Kit(unittest.TestCase):
    def setUp(self):
        self.base = tempfile.mkdtemp(prefix="vantage_kit_")
        self.addCleanup(shutil.rmtree, self.base, ignore_errors=True)

    def user(self, name):
        p = os.path.join(self.base, name)
        shutil.copytree(TEMPLATE, p, ignore=shutil.ignore_patterns("__pycache__"))
        return p

    def put(self, user, rel, data):
        p = os.path.join(user, *rel.split("/"))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "wb" if isinstance(data, bytes) else "w", **({} if isinstance(data, bytes) else {"encoding": "utf-8"})) as f:
            f.write(data)

    def rich_account(self):
        a = self.user("Beispiel Größe 日本")
        self.put(a, US + "identity.json", json.dumps({"full_name": "Beispiel Größe"}))
        self.put(a, US + "applications.json", json.dumps({"meta": {"owner_name": "B"}, "status_vocab": ["Draft", "Applied"], "applications": [
            {"id": "2026-10-01_Acme", "perusahaan": "Acme", "posisi": "Intern", "status": "Applied", "folder": "01_Pipeline/01-10_Acme_Intern"},
            {"id": "2026-10-02_Beta", "perusahaan": "Beta", "posisi": "Dev", "status": "Draft", "folder": "01_Pipeline/02-10_Beta_Dev"}]}, ensure_ascii=False))
        self.put(a, US + "app_prefs.json", json.dumps({"lang": "de", "contacts": {"2026-10-01_Acme": {"name": "Frau Weber"}}}))
        self.put(a, US + "nova_chat/nova/2026-11-04.jsonl", '{"role":"user","text":"Hallo"}\n')
        self.put(a, "01_user_documents/raw_facts_about_you.md", "# Facts\n" + "Worked on forecasting. " * 40)
        self.put(a, "01_user_documents/materials/education/EDU-01_Uni Trier/Transkript Größe (final) 日本.pdf", b"%PDF-1.4 fake" * 300)
        self.put(a, "01_user_documents/materials/research/RES2_" + "x" * 90 + "/data/a.csv", "a,b\n1,2\n")
        self.put(a, "02_workflow/01_Pipeline/01-10_Acme_Intern/00_Draft/cv.json", "{}")
        self.put(a, "--- I N B O X ---/loose note.txt", "inbox")
        self.put(a, "CLAUDE.md", "# My rules\n- Answer in German\n")
        return a

    def export(self, account):
        r = run("backup_user.py", account)
        self.assertEqual(r["skipped"], [])
        return r["path"]

    # ---- export and import

    def test_export_lists_every_file_with_its_hash(self):
        z = zipfile.ZipFile(self.export(self.rich_account()))
        m = json.loads(z.read("vantage_export.json"))
        self.assertEqual(m["format"], "vantage-account")
        self.assertEqual(m["file_count"], len(m["files"]))
        self.assertTrue(all(f["path"] in z.namelist() for f in m["files"]))
        self.assertNotIn("--settings/readme.md", z.namelist())

    def test_a_fresh_account_takes_the_export_exactly(self):
        a = self.rich_account()
        pkg = self.export(a)
        b = self.user("Neu")
        before = tree(b)
        plan = run("account_import.py", pkg, b)
        self.assertTrue(plan["fresh_target"])
        self.assertEqual(tree(b), before, "a plan writes nothing")
        r = run("account_import.py", pkg, "--apply", b)
        self.assertEqual((r["failed"], r["damaged"], r["open_items"]), ([], [], 0))
        ta, tb = tree(a), tree(b)
        exempt = {US + "app_prefs.json", US + "import_report.md", US + "import_report.json", US + "ui_context.md"}
        manifest = json.loads(zipfile.ZipFile(pkg).read("vantage_export.json"))["files"]
        for f in manifest:
            if f["path"] not in exempt:
                self.assertEqual(ta[f["path"]], tb.get(f["path"]), f["path"])
        prefs_a, prefs_b = (json.load(open(os.path.join(x, *(US + "app_prefs.json").split("/")))) for x in (a, b))
        self.assertTrue(all(prefs_b.get(k) == v for k, v in prefs_a.items()))
        again = run("account_import.py", pkg, "--apply", b)
        self.assertTrue(again["complete"] and not any(".from_old" in k for k in tree(b)), "a second run changes nothing")

    def test_a_used_account_keeps_its_own_and_gets_the_rest(self):
        pkg = self.export(self.rich_account())
        c = self.user("Alt")
        self.put(c, US + "applications.json", json.dumps({"meta": {}, "status_vocab": ["Draft"], "applications": [
            {"id": "2026-10-01_Acme", "perusahaan": "Acme", "posisi": "OTHER", "status": "Draft"}, {"id": "own", "perusahaan": "Own", "posisi": "X", "status": "Draft"}]}))
        self.put(c, US + "app_prefs.json", json.dumps({"lang": "en"}))
        self.put(c, "01_user_documents/raw_facts_about_you.md", "# Mine\n" + "mine " * 100)
        self.put(c, "CLAUDE.md", "# C rules\n")
        before = tree(c)
        r = run("account_import.py", pkg, "--apply", c)
        self.assertFalse(r["fresh_target"])
        self.assertTrue(r["complete"], r["verify"])
        after = tree(c)
        for k, v in before.items():
            if k not in (US + "applications.json", US + "app_prefs.json"):
                self.assertEqual(after[k], v, k)
        ids = [x["id"] for x in json.load(open(os.path.join(c, *(US + "applications.json").split("/"))))["applications"]]
        self.assertEqual(sorted(ids), sorted(["own", "2026-10-01_Acme", "2026-10-01_Acme-imported", "2026-10-02_Beta"]))
        self.assertEqual(json.load(open(os.path.join(c, *(US + "app_prefs.json").split("/"))))["lang"], "en")
        self.assertTrue(os.path.isfile(os.path.join(c, "CLAUDE.from_old.md")))
        self.assertTrue(os.path.isfile(os.path.join(c, "01_user_documents", "raw_facts_about_you.from_old.md")))

    def test_a_failure_is_named_and_the_same_command_finishes_the_job(self):
        pkg = self.export(self.rich_account())
        d = self.user("Blockiert")
        blocked = os.path.join(d, "01_user_documents", "materials", "education", "EDU-01_Uni Trier", "Transkript Größe (final) 日本.pdf")
        os.makedirs(blocked)                                     # a folder where a file must go
        r = run("account_import.py", pkg, "--apply", d)
        self.assertEqual(len(r["failed"]), 1)
        self.assertIn("folder", r["failed"][0]["reason"])
        self.assertFalse(r["complete"])
        report = open(os.path.join(d, *(US + "import_report.md").split("/")), encoding="utf-8").read()
        self.assertIn("## Open items", report)
        self.assertIn(pkg, report)
        os.rmdir(blocked)
        self.assertTrue(run("account_import.py", pkg, "--apply", d)["complete"])

    def test_a_damaged_package_names_the_file(self):
        pkg = self.export(self.rich_account())
        bad = os.path.join(self.base, "damaged.zip")
        with zipfile.ZipFile(pkg) as zin, zipfile.ZipFile(bad, "w") as zo:
            for i in zin.infolist():
                data = zin.read(i.filename)
                zo.writestr(i.filename, data + b"x" if i.filename.endswith("a.csv") else data)
        r = run("account_import.py", bad, "--apply", self.user("Schaden"))
        self.assertEqual([d["file"][-5:] for d in r["damaged"]], ["a.csv"])
        self.assertFalse(r["complete"])

    def test_unsafe_and_foreign_packages_are_not_imported(self):
        evil = os.path.join(self.base, "evil.zip")
        with zipfile.ZipFile(evil, "w") as z:
            z.writestr("01_user_documents/../../x.txt", "x")
            z.writestr("01_user_documents/a.txt", "x")
        self.assertNotEqual(run("account_import.py", evil, self.user("H"), ok=False).returncode, 0)
        legacy = os.path.join(self.base, "legacy.zip")
        with zipfile.ZipFile(legacy, "w") as z:
            z.writestr("role_model/cv.pdf", "x")
        self.assertEqual(run("account_import.py", legacy, self.user("G"))["kind"], "legacy")

    # ---- applications

    def test_moving_an_application_moves_the_folder_and_sets_the_next_step(self):
        u = self.user("Move")
        self.put(u, US + "applications.json", json.dumps({"status_vocab": ["Draft", "Applied", "Rejected"], "applications": [
            {"id": "a1", "perusahaan": "Acme", "posisi": "Intern", "tipe": "Werkstudent", "status": "Draft", "folder": "01_Pipeline/01-10_Acme_Intern", "next_action": "Send", "next_action_due": "2026-10-20"}]}))
        self.put(u, "02_workflow/01_Pipeline/01-10_Acme_Intern/00_Draft/cv.json", "{}")
        r = run("move_application.py", "Acme", "Applied", u)
        self.assertIn("02_Sent/Werkstudent/", r["folder"])
        self.assertTrue(os.path.isfile(os.path.join(u, "02_workflow", *r["folder"].split("/"), "00_Draft", "cv.json")))
        a = json.load(open(os.path.join(u, *(US + "applications.json").split("/"))))["applications"][0]
        self.assertEqual(a["next_action"], "Follow up (14 days)")
        run("move_application.py", "a1", "Rejected", u)
        a = json.load(open(os.path.join(u, *(US + "applications.json").split("/"))))["applications"][0]
        self.assertEqual((a["next_action"], a["next_action_due"]), ("", ""))
        self.assertNotEqual(run("move_application.py", "a1", "Nonsense", u, ok=False).returncode, 0)
        self.assertIn("(changed in a chat)", open(os.path.join(u, *(US + "app_changes.log").split("/"))).read())

    def test_adding_an_application_makes_the_folder_and_never_clashes(self):
        u = self.user("Add")
        first = run("add_application.py", json.dumps({"company": "Müller & Söhne GmbH", "role": "Werkstudent (m/w/d)", "fit": 81}), u)
        second = run("add_application.py", json.dumps({"company": "Müller & Söhne GmbH", "role": "Werkstudent (m/w/d)"}), u)
        self.assertNotEqual(first["id"], second["id"])
        self.assertTrue(os.path.isdir(os.path.join(u, "02_workflow", *first["folder"].split("/"))))
        self.assertNotEqual(run("add_application.py", json.dumps({"company": "", "role": "x"}), u, ok=False).returncode, 0)

    def test_the_tracker_export_quotes_and_escapes(self):
        u = self.user("Export")
        self.put(u, US + "applications.json", json.dumps({"applications": [
            {"id": "a1", "perusahaan": "Müller, Söhne; GmbH", "posisi": 'Werkstudent "Controlling"', "status": "Applied", "tanggal_status": "2026-10-20", "next_action": "Call", "next_action_due": "2026-11-06"}]}))
        r = run("export_tracker.py", "both", u)
        csv_path, ics_path = r["files"]
        self.assertIn('"Müller, Söhne; GmbH"', open(csv_path, encoding="utf-8-sig").read())
        ics = open(ics_path, encoding="utf-8", newline="").read()
        self.assertIn(r"SUMMARY:Follow up: Müller\, Söhne\; GmbH", ics.replace("\r\n ", ""))
        self.assertTrue(ics.startswith("BEGIN:VCALENDAR") and "\r\n" in ics)


class AgentCardReplyLength(unittest.TestCase):
    """Work agents (analysis, documents, QC, interviews) must not be cut to a few sentences: a short reply skipped checks."""
    AG = os.path.join(ROOT, "kit", ".claude", "agents")

    def card(self, name):
        return open(os.path.join(self.AG, name + ".md"), encoding="utf-8").read()

    def test_work_agents_have_no_sentence_or_word_cap(self):
        for a in ("arga", "bayu", "tari", "laras"):
            t = self.card(a)
            self.assertNotIn("maks 6 kalimat", t, a)
            self.assertNotIn("maks 150 kata", t, a)

    def test_conversation_agents_stay_short(self):
        for a in ("raka", "sinta"):
            self.assertIn("maks 6 kalimat", self.card(a), a)

    def test_arga_checks_documents_and_location(self):
        t = open(os.path.join(TEMPLATE, "--settings", "agents", "arga.md"), encoding="utf-8").read()
        self.assertIn("identity.json", t)
        self.assertIn("Periksa syarat dokumen", t)


class Utf8(unittest.TestCase):
    def test_every_script_that_prints_uses_utf8_output(self):
        # On Windows a piped script prints in cp1252 and crashes on any other character (a Turkish ğ, an emoji, a Chinese name).
        missing = []
        for f in sorted(os.listdir(SCRIPTS)):
            if f.endswith(".py") and not f.startswith("_"):
                src = open(os.path.join(SCRIPTS, f), encoding="utf-8").read()
                if "print(" in src and "import _utf8" not in src:
                    missing.append(f)
        self.assertEqual(missing, [], "these scripts print but do not `import _utf8`")

    def test_output_with_any_character_survives_a_legacy_code_page(self):
        probe = os.path.join(SCRIPTS, "_utf8_probe_tmp.py")
        open(probe, "w", encoding="utf-8").write("import _utf8\nprint('Müller ğş 日本 → ✓ 😀')\n")
        try:
            env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0")
            r = subprocess.run([sys.executable, probe], capture_output=True, env=env)
        finally:
            os.remove(probe)
        self.assertEqual(r.returncode, 0, r.stderr.decode("utf-8", "replace"))
        self.assertEqual(r.stdout.decode("utf-8").strip(), "Müller ğş 日本 → ✓ 😀")


if __name__ == "__main__":
    unittest.main()
