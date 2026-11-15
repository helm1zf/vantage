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

    # Loose application folders dropped into the Inbox (an old user's archive) go to 02_workflow/02_Sent, not into the profile materials.
    # Before 0.11.2 the script did not know them, so Raka filed them under materials/other with OTH ids.
    def test_loose_application_folders_go_to_the_workflow_not_to_materials(self):
        u = self.user("apps")
        inbox = "--- I N B O X ---"
        self.put(u, inbox + "/12-03_Acme_Analyst/01_Analisis/JD.md", "ad text")
        self.put(u, inbox + "/12-03_Acme_Analyst/02_ready_to_send/Budi_CV.pdf", b"%PDF")
        self.put(u, inbox + "/2025-04-01_Beta_Werkstudent/Lebenslauf_Budi.pdf", b"%PDF")          # no Vantage sub-folders: a dated name and a CV
        self.put(u, inbox + "/Bewerbungen 2025/05-06_Gamma_Intern/Anschreiben.docx", b"x")         # an archive: every sub-folder is an application
        self.put(u, inbox + "/Bewerbungen 2025/07-08_Delta_Trainee/JD.pdf", b"%PDF")
        self.put(u, inbox + "/Zeugnisse 2024/Bachelor_Zeugnis.pdf", b"%PDF")                        # real material: stays for Raka
        self.put(u, inbox + "/12-01_Urlaub/foto.jpg", b"x")                                          # a dated folder without CV, letter or ad
        r = run("import_old.py", "--inbox", "--apply", u)
        self.assertEqual(sorted(r["applications"]), ["05-06_Gamma_Intern", "07-08_Delta_Trainee", "12-03_Acme_Analyst", "2025-04-01_Beta_Werkstudent"], r)
        sent = os.path.join(u, "02_workflow", "02_Sent")
        for rel in ("12-03_Acme_Analyst/01_Analisis/JD.md", "12-03_Acme_Analyst/02_ready_to_send/Budi_CV.pdf", "2025-04-01_Beta_Werkstudent/Lebenslauf_Budi.pdf",
                    "05-06_Gamma_Intern/Anschreiben.docx", "07-08_Delta_Trainee/JD.pdf"):
            self.assertTrue(os.path.isfile(os.path.join(sent, *rel.split("/"))), rel)
        left = sorted(os.listdir(os.path.join(u, inbox)))
        self.assertEqual([n for n in left if not n.startswith(".")], ["12-01_Urlaub", "Zeugnisse 2024"], "what is not an application stays in the Inbox for Raka")
        self.assertEqual(sorted(r["inbox_kept"]), ["12-01_Urlaub", "Zeugnisse 2024"])
        # the same script repairs what an earlier tidy-up filed wrongly: materials/other/OTH5_<application> goes to the workflow without the id
        self.put(u, "01_user_documents/materials/other/OTH5_09-10_Kestrel_Logistics/01_Analisis/JD.md", "ad")
        self.put(u, "01_user_documents/materials/other/OTH6_Interviewfragen/fragen.md", "q")
        r = run("import_old.py", "--repair", "--apply", u)
        self.assertEqual(r["applications"], ["09-10_Kestrel_Logistics"], r)
        self.assertTrue(os.path.isfile(os.path.join(sent, "09-10_Kestrel_Logistics", "01_Analisis", "JD.md")))
        self.assertFalse(os.path.exists(os.path.join(u, "01_user_documents", "materials", "other", "OTH5_09-10_Kestrel_Logistics")))
        self.assertTrue(os.path.isfile(os.path.join(u, "01_user_documents", "materials", "other", "OTH6_Interviewfragen", "fragen.md")), "real material is left alone")

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

    def test_an_accepted_offer_closes_the_application_even_with_an_older_status_list(self):
        # "Accepted" came after the first status list: a folder whose list does not name it must still take it.
        u = self.user("Accepted")
        self.put(u, US + "applications.json", json.dumps({"status_vocab": ["Draft", "Applied", "Offer", "Rejected", "Withdrawn"], "applications": [
            {"id": "a1", "perusahaan": "Acme", "posisi": "Intern", "tipe": "Werkstudent", "status": "Offer", "folder": "02_Sent/Werkstudent/2026/x/01-10_Acme_Intern", "next_action": "Sign", "next_action_due": "2026-10-20"}]}))
        run("move_application.py", "a1", "Accepted", u)
        a = json.load(open(os.path.join(u, *(US + "applications.json").split("/"))))["applications"][0]
        self.assertEqual((a["status"], a["next_action"], a["next_action_due"]), ("Accepted", "", ""))

    def test_skipping_a_recommendation_is_written_by_a_script_and_survives(self):
        u = self.user("Skip")
        r = run("answer_report.py", "list", u)
        self.assertEqual(r["skipped"], [])
        r = run("answer_report.py", "skip", "adesso SE", "Werkstudent Data", "https://x.example/job/1", u)
        self.assertTrue(r["ok"])
        # again: still one entry, and the answer is on it
        run("answer_report.py", "skip", "ADESSO se", "werkstudent data", "", u)
        seen = json.load(open(os.path.join(u, *(US + "daily_jobs_seen.json").split("/"))))
        entries = seen["seen"] if isinstance(seen, dict) else seen
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["dijawab"], "lewati")
        self.assertEqual(run("answer_report.py", "list", u)["skipped"], ["adesso se|werkstudent data"])
        # a file Sinta wrote earlier as a plain list, with other entries, keeps them
        self.put(u, US + "daily_jobs_seen.json", json.dumps([{"perusahaan": "Other", "posisi": "Dev", "skor": 70}]))
        run("answer_report.py", "skip", "Acme", "Intern", "", u)
        seen = json.load(open(os.path.join(u, *(US + "daily_jobs_seen.json").split("/"))))
        self.assertEqual({e["perusahaan"] for e in seen}, {"Other", "Acme"})
        self.assertNotEqual(run("answer_report.py", "skip", "", "", "", u, ok=False).returncode, 0)

    def test_adding_an_application_makes_the_folder_and_never_clashes(self):
        u = self.user("Add")
        first = run("add_application.py", json.dumps({"company": "Müller & Söhne GmbH", "role": "Werkstudent (m/w/d)", "fit": 81}), u)
        second = run("add_application.py", json.dumps({"company": "Müller & Söhne GmbH", "role": "Werkstudent (m/w/d)"}), u)
        self.assertNotEqual(first["id"], second["id"])
        self.assertTrue(os.path.isdir(os.path.join(u, "02_workflow", *first["folder"].split("/"))))
        self.assertNotEqual(run("add_application.py", json.dumps({"company": "", "role": "x"}), u, ok=False).returncode, 0)

    def test_adding_an_application_does_not_overwrite_a_change_made_meanwhile(self):
        # Nova may write applications.json while the Add button's script runs; the script must notice and write nothing (move_application.py already did).
        from unittest import mock
        u = self.user("AddRace")
        jp = os.path.join(u, *(US + "applications.json").split("/"))
        self.put(u, US + "applications.json", json.dumps({"applications": []}))
        sys.path.insert(0, SCRIPTS)
        try:
            import add_application
            real_makedirs = os.makedirs
            def touch_then_makedirs(*a, **k):   # runs between the read and the write of applications.json
                with open(jp, "w", encoding="utf-8") as fh: json.dump({"applications": [{"id": "from-nova", "perusahaan": "Nova Co"}]}, fh)
                return real_makedirs(*a, **k)
            with mock.patch.object(sys, "argv", ["add_application.py", json.dumps({"company": "Race GmbH", "role": "Dev"}), u]), \
                 mock.patch.object(os, "makedirs", side_effect=touch_then_makedirs):
                with self.assertRaises(SystemExit) as ctx:
                    add_application.main()
            self.assertIn("another program", str(ctx.exception))
        finally:
            sys.path.remove(SCRIPTS)
        self.assertEqual([a["id"] for a in json.load(open(jp, encoding="utf-8"))["applications"]], ["from-nova"], "the other program's change survives")
        self.assertFalse(any("race" in d.lower() for d in os.listdir(os.path.join(u, "02_workflow", "01_Pipeline"))), "no folder is left behind")

    def test_verify_after_an_app_update_is_clean_when_an_old_kit_sits_next_to_the_folder(self):
        # Reported by the owner (12 Nov): after the app's kit update the chat ran verify_consistency.py, which compared the freshly updated folder with the OLD
        # _TEMPLATE next to it (the package folder keeps the first kit) and with the old manifest, found dozens of "differences", refused to write the version
        # down and sent the user back to press Update again, forever. After an update the folder must be compared with the NEW kit (kept as update_source).
        base = tempfile.mkdtemp(); self.addCleanup(shutil.rmtree, base, True)
        pkg = os.path.join(base, "pkg"); user = os.path.join(pkg, "helmi")
        for d in (os.path.join(pkg, "_TEMPLATE"), user): shutil.copytree(TEMPLATE, d, ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copy(os.path.join(ROOT, "kit", "CLAUDE.md"), os.path.join(pkg, "CLAUDE.md"))
        for d in (os.path.join(pkg, "_TEMPLATE"), user):                      # the "old kit": two system files differ from the published one
            for rel in ("--settings/readme.md", "--settings/agents/arga.md"):
                with open(os.path.join(d, *rel.split("/")), "a", encoding="utf-8") as fh: fh.write("\nold kit\n")
        mp = os.path.join(user, "system_manifest.json"); man = json.load(open(mp, encoding="utf-8"))
        man["version"] = "2026-11-01"; man["files"]["--settings/readme.md"] = "0" * 64; json.dump(man, open(mp, "w", encoding="utf-8"))   # the old manifest the folder came with
        self.put(user, US + ".vantage_version", "2026-11-01\n")
        script = os.path.join(SCRIPTS, "apply_update.py")
        r = subprocess.run([sys.executable, script, "--source", os.path.join(ROOT, "kit"), "--user", user, "--apply"], capture_output=True, text=True); self.assertEqual(r.returncode, 0, r.stderr)
        keep = os.path.join(user, *(US + "update_source").split("/")); shutil.copytree(os.path.join(ROOT, "kit"), keep)       # what the app does while migrations are pending
        v = subprocess.run([sys.executable, os.path.join(user, "--settings", "scripts", "verify_consistency.py")], capture_output=True, text=True)
        self.assertEqual(v.returncode, 0, "verify must be clean right after a successful update:\n" + "\n".join(l for l in v.stdout.splitlines() if l.strip().startswith("x"))[:1500])

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


class NoStaleConcepts(unittest.TestCase):
    """A concept that changed must not survive in the kit's texts (CLAUDE.md, rule 1). Add a phrase here when a concept changes."""
    STALE = [
        ("belum tersedia (fitur segera hadir)", "the daily schedule exists now"),
        ("Jadwal otomatis belum tersedia", "the daily schedule exists now"),
        ("Jadwal otomatis harian belum tersedia", "the daily schedule exists now"),
        ("Chat mana pun boleh memulai pekerjaan apa pun", "chats do their own agent's work; hand-offs are done by the receiving chat"),
        ("Nova DILARANG", "the interview coach is Laras"),
        ("Sikap Mental Nova", "the interview coach is Laras"),
    ]
    def test_no_stale_phrase_is_left_in_the_kit(self):
        hits = []
        for base in (os.path.join(ROOT, "kit"),):
            for d, _, files in os.walk(base):
                for f in files:
                    if not f.endswith((".md", ".json", ".py")): continue
                    p = os.path.join(d, f)
                    try: t = open(p, encoding="utf-8").read()
                    except Exception: continue
                    if f == "riwayat_migrasi.md" or f == "test_kit.py": continue   # history keeps old words on purpose
                    for phrase, why in self.STALE:
                        if phrase in t: hits.append("%s: %r (%s)" % (os.path.relpath(p, ROOT), phrase, why))
        self.assertEqual(hits, [])

    def test_the_laras_agent_can_run_her_kit_script(self):
        card = open(os.path.join(ROOT, "kit", ".claude", "agents", "laras.md"), encoding="utf-8").read().split("---")[1]
        self.assertIn("Bash", card, "the interview SOP tells Laras to run build_interview_prep.py")


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


class Aggregators(unittest.TestCase):
    """Job boards are refused unless the user switched them on (allow_aggregators in search_settings.json)."""
    AGG = "https://de.linkedin.com/jobs/view/4012345678"

    @classmethod
    def setUpClass(cls):
        sys.path.insert(0, SCRIPTS)
        import check_links, check_report, run_smoke_test
        cls.links, cls.report, cls.sample = check_links, check_report, run_smoke_test.SAMPLE_LAPORAN

    def lap(self, **over):
        rec = dict(self.sample["rekomendasi"][0], **over.pop("rec", {}))
        return dict(self.sample, rekomendasi=[rec], hampir_masuk=[], **over)

    def test_the_sample_report_is_valid_before_anything_is_changed(self):
        self.assertEqual(self.report.validate(self.lap()), [])

    def test_off_is_the_default_and_refuses_a_job_board_link(self):
        errs = self.report.validate(self.lap(rec={"link": self.AGG}))
        self.assertTrue(any("agregator (LinkedIn)" in e for e in errs), errs)
        self.assertEqual(self.links.check(self.AGG), ("AGREGATOR", "LinkedIn"))   # no network: refused before any request
        # the mark alone does not open the door
        errs = self.report.validate(self.lap(rec={"link": self.AGG, "hanya_agregator": True}))
        self.assertTrue(any("tidak mengizinkan agregator" in e for e in errs), errs)
        errs = self.report.validate(self.lap(agregator_diizinkan=False, rec={"link": self.AGG, "hanya_agregator": True}))
        self.assertTrue(errs)

    def test_on_accepts_a_marked_job_board_link_and_nothing_else(self):
        on = {"allow_aggregators": True}
        self.assertEqual(self.report.validate(self.lap(agregator_diizinkan=True, rec={"link": self.AGG, "hanya_agregator": True}), None, on), [])
        # official links stay valid, unmarked
        self.assertEqual(self.report.validate(self.lap(agregator_diizinkan=True), None, on), [])
        # a job board link without the mark: the agent must look for the official posting first
        errs = self.report.validate(self.lap(agregator_diizinkan=True, rec={"link": self.AGG}), None, on)
        self.assertTrue(any("hanya_agregator: true" in e for e in errs), errs)
        # the mark on an official link is wrong
        errs = self.report.validate(self.lap(agregator_diizinkan=True, rec={"hanya_agregator": True}), None, on)
        self.assertTrue(any("bukan agregator" in e for e in errs), errs)
        # still a real ad, not a front page
        errs = self.report.validate(self.lap(agregator_diizinkan=True, rec={"link": "https://www.linkedin.com/", "hanya_agregator": True}), None, on)
        self.assertTrue(any("halaman depan" in e for e in errs), errs)

    def test_a_report_cannot_allow_job_boards_when_the_user_did_not(self):
        rep = self.lap(agregator_diizinkan=True, rec={"link": self.AGG, "hanya_agregator": True})
        for settings in ({}, {"allow_aggregators": False}, {"allow_aggregators": "yes"}):
            errs = self.report.validate(rep, None, settings)
            self.assertTrue(any("allow_aggregators" in e for e in errs), (settings, errs))

    def test_the_switch_is_read_from_the_users_folder_only_when_it_is_true(self):
        base = tempfile.mkdtemp(prefix="vantage_agg_"); self.addCleanup(shutil.rmtree, base, ignore_errors=True)
        st = os.path.join(base, "01_user_documents", "--usersettings"); os.makedirs(st)
        day = os.path.join(base, "02_workflow", "Laporan_Pagi", "2026-01-01"); os.makedirs(day)
        self.assertFalse(self.links.aggregators_allowed(day))                      # no file
        for text, want in (('{"allow_aggregators": true}', True), ('{"allow_aggregators": false}', False), ('{"kata_kunci": ["x"]}', False), ("not json", False), ("[]", False)):
            open(os.path.join(st, "search_settings.json"), "w", encoding="utf-8").write(text)
            self.assertEqual(self.links.aggregators_allowed(day), want, text)
            self.assertEqual(self.links.aggregators_allowed(os.path.join(day, "x_Laporan_Pagi.json")), want, text)

    def test_the_built_report_marks_a_job_board_only_ad(self):
        base = tempfile.mkdtemp(prefix="vantage_agg_"); self.addCleanup(shutil.rmtree, base, ignore_errors=True)
        st = os.path.join(base, "01_user_documents", "--usersettings"); os.makedirs(st)
        day = os.path.join(base, "02_workflow", "Laporan_Pagi", self.sample["tanggal"]); os.makedirs(day)
        path = os.path.join(day, self.sample["tanggal"] + "_Laporan_Pagi.json")
        json.dump(self.lap(agregator_diizinkan=True, rec={"link": self.AGG, "hanya_agregator": True}), open(path, "w", encoding="utf-8"), ensure_ascii=False)
        env = dict(os.environ, PYTHONIOENCODING="cp1252", PYTHONUTF8="0")
        build = lambda: subprocess.run([sys.executable, os.path.join(SCRIPTS, "build_laporan_pagi.py"), path], capture_output=True, env=env, cwd=base)
        r = build()                                                                 # the user's settings do not allow it: refused
        self.assertNotEqual(r.returncode, 0); self.assertFalse(os.path.isfile(os.path.join(day, "00_README.md")))
        open(os.path.join(st, "search_settings.json"), "w", encoding="utf-8").write('{"allow_aggregators": true}')
        r = build()
        self.assertEqual(r.returncode, 0, r.stdout.decode("utf-8", "replace") + r.stderr.decode("utf-8", "replace"))
        readme = open(os.path.join(day, "00_README.md"), encoding="utf-8").read()
        self.assertTrue("hanya agregator" in readme or "aggregator only" in readme, readme)


    # The Beton PDF pages: every language and the converted old report render to complete HTML (no placeholder left,
    # the shared stylesheet and fonts are inside), and a section with nothing in it is not printed.
    def test_the_beton_report_pages_render_in_every_variant(self):
        import copy, build_laporan_pagi as b, build_analisis as a
        full = copy.deepcopy(self.sample)
        full["perlu_aksi"] = [{"tanggal": full["tanggal"], "jenis": "follow_up", "lamaran": "Contoh GmbH", "aksi": "Kirim follow-up"}]
        full["pola_gap"] = [{"skill": "SQL", "jumlah": 3, "dari": 9}]; full["catatan_pasar"] = ["Banyak iklan minta SAP."]
        for lang in ("id", "en", "de"):
            page = b.Report(dict(full, bahasa=lang)).html()
            self.assertNotIn("{{", page, lang); self.assertIn("font/woff2;base64,", page); self.assertIn('class="box hero"', page)
            self.assertIn('class="box rec"', page); self.assertIn('class="act-t"', page); self.assertIn("SQL", page)
        self.assertIn("Empfehlungen", b.Report(dict(full, bahasa="de")).html())
        empty = b.Report(dict(self.sample, perlu_aksi=[], pola_gap=[], catatan_pasar=[])).html()
        self.assertNotIn('data-n="01"', empty); self.assertNotIn('data-n="05"', empty); self.assertNotIn('data-n="06"', empty)
        old = {"dikonversi_dari_lama": True, "tanggal": "2026-01-01", "run": 1, "status": "lengkap", "bahasa": "id", "fokus": "Lihat dua iklan lama.",
               "catatan_konversi": "Dari laporan lama.", "asal": {"readme": "00_README.md"}, "nama_panggilan": "Budi",
               "pencarian": {"oleh": "", "sumber": [], "kata_kunci": ["SAP"], "lokasi": [], "filter": [], "gagal": [], "corong": {"ditemukan": 4}},
               "perlu_aksi": [{"tanggal": "2025-12-30", "jenis": "deadline", "lamaran": "Alt AG", "aksi": "Kirim", "lewat": True}],
               "rekomendasi": [{"perusahaan": "Alt AG", "posisi": "Werkstudent", "jenis": "Werkstudent", "kota": "Bonn", "skor": None, "skor_label": "Tinggi",
                                "link": "https://www.linkedin.com/jobs/view/1", "aksi": "-", "diposting": "", "cocok": "Cocok lama", "gap": "", "catatan_asli": "Dilamar"},
                               {"perusahaan": "Neu GmbH", "posisi": "Praktikum", "jenis": "Praktikum", "kota": "", "skor": 82, "link": "", "aksi": "-", "diposting": "2025-12-28"}],
               "hampir_masuk": [{"perusahaan": "Fast AG", "posisi": "Intern", "skor": 71}], "catatan_asli": ["Catatan lama."]}
        page = b.Report(old).html()
        self.assertNotIn("{{", page); self.assertIn("Tinggi", page); self.assertIn("DIKONVERSI", page); self.assertIn("Catatan lama.", page)
        fg = json.load(open(os.path.join(SCRIPTS, "..", "templates", "fit_gap", "content.json"), encoding="utf-8"))
        jd = json.load(open(os.path.join(SCRIPTS, "..", "templates", "jd", "content.json"), encoding="utf-8"))
        self.assertEqual(a.validate_fg(fg), [])
        for lang, word in (("id", "Rincian skor"), ("en", "Score breakdown"), ("de", "Punkte im Detail")):
            page = a.fg_html(dict(fg, bahasa=lang))
            self.assertNotIn("{{", page, lang); self.assertIn(word, page); self.assertIn("Dashboard gudang", page); self.assertIn("ORG1-01", page)
        self.assertIn("ORG1-01", a.fg_html(dict(fg, syarat=[dict(r, bukti_nama="") for r in fg["syarat"]])))       # older analyses: the ID alone
        self.assertTrue(a.validate_fg(dict(fg, bahasa="fr"))); self.assertTrue(a.validate_fg(dict(fg, syarat=[dict(fg["syarat"][0], bukti_nama="x" * 41)])))
        page = a.jd_html(jd, "Originaltext <b>kein HTML</b>", fg)
        self.assertNotIn("{{", page); self.assertIn('class="box fit"', page); self.assertIn("&lt;b&gt;kein HTML&lt;/b&gt;", page)
        self.assertNotIn('class="box fit"', a.jd_html(jd, "x"))                                                      # no analysis yet: no fit line
        # Ad pages hold five cards: with 4 or more ads the other sections start after the ad pages, ten ads make two ad pages.
        ten = dict(full, target_jumlah=10, rekomendasi=[dict(full["rekomendasi"][0], perusahaan=f"Firma {i}", link=f"https://karriere.contoh-gmbh.de/jobs/{i}-x") for i in range(10)])
        rep = b.Report(ten); page = rep.html()
        self.assertEqual(page.count('class="ads brk"'), 2); self.assertEqual(page.count('class="box rec"'), 10)
        self.assertLess(page.index("Firma 9"), page.index('class="act-t"'), "needs-you follows the ad pages")
        rep.probe = True; probe = rep.html(); rep.probe = False
        self.assertNotIn('class="act-t"', probe); self.assertEqual(probe.count('class="box rec"'), 10)                        # the fit probe prints the ad pages only
        rep.zoom = 0.85; self.assertIn("zoom:0.85", rep.html())
        three = b.Report(dict(full, rekomendasi=ten["rekomendasi"][:3])).html()
        self.assertNotIn("ads brk", three); self.assertLess(three.index('class="act-t"'), three.index("Firma 0"), "few ads: one flowing page, needs-you first")

if __name__ == "__main__":
    unittest.main()
