"""What the agents tell the user must match the app the user is looking at.

Found 23 Nov 2026: a brand-new user asked Nova "what do I do?" and was told to put files "in the folder `--- I N B O X ---/`"
and press "Tidy up with Nova". The app has an Inbox *tab* and a button called "Tidy up" ("Rapikan" in Indonesian), and Raka,
not Nova, sorts. Other files pointed at first_run.md steps that no longer exist ("Langkah 7") or at places that are not in the
app ("Inbox from Nova", Export account "in Profile"). These checks keep the agent texts and the app in step.
"""
import pathlib
import re
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
KIT = ROOT / "kit"
UI = ROOT / "ui"


def kit_docs():
    for p in sorted(KIT.rglob("*.md")):
        if "riwayat_migrasi" in p.name:   # the migration history quotes old texts on purpose
            continue
        yield p, p.read_text(encoding="utf-8")


def ui_source():
    return "\n".join(p.read_text(encoding="utf-8") for p in sorted(UI.rglob("*.js"))) + (UI / "index.html").read_text(encoding="utf-8")


def kit_scripts():
    # Kit scripts write texts the agent reads and repeats (import_old.py's to-do list). Found 25 Nov 2026: after the 23 Nov
    # sweep Nova still told a user to "press Tidy up with Nova", because import_old.py was never checked (only *.md was).
    for p in sorted(KIT.rglob("*.py")):
        yield p, p.read_text(encoding="utf-8")


class AgentTextsMatchApp(unittest.TestCase):
    def test_no_stale_names_for_places_and_buttons(self):
        stale = {
            "Tidy up with Nova": "the button is called Tidy up, and Raka sorts",
            "Inbox from Nova": "reports are on the Morning report tab",
            "Nova (sortir)": "Raka sorts the Inbox (Tidy up)",
            "chflags nohidden": "02_workflow is no longer hidden during onboarding",
            "folder `--- I N B O X ---/`": "the user sees an Inbox tab, not a folder",
            '"Export account" di Profile': "Export account is in Settings",
        }
        found = [f"{p.relative_to(ROOT)}: {s!r} ({why})" for p, t in [*kit_docs(), *kit_scripts()] for s, why in stale.items() if s in t]
        self.assertEqual(found, [], "agent texts that describe an app that does not exist:\n" + "\n".join(found))

    def test_every_step_reference_points_at_a_step_that_exists(self):
        steps = {}
        for p, t in kit_docs():
            steps[p.name] = set(re.findall(r"^##+ Langkah (\d+)", t, re.M))
        bad = []
        for p, t in kit_docs():
            # with or without backticks: "`first_run.md` Langkah 3" and "(setelah first_run.md Langkah 5)" (missed until 23 Nov)
            for m in re.finditer(r"`?(?:[\w-]+/)*([\w-]+\.md)`?\s*\(?Langkah (\d+)(?:-(\d+))?", t):
                name, nums = m.group(1), [m.group(2)] + ([m.group(3)] if m.group(3) else [])
                if name in steps and steps[name]:
                    bad += [f"{p.relative_to(ROOT)}: {name} Langkah {n}" for n in nums if n not in steps[name]]
        self.assertEqual(bad, [], "references to steps that do not exist:\n" + "\n".join(bad))

    def test_button_names_the_agents_tell_the_user_to_press_exist_in_the_app(self):
        # The files an agent reads when it guides a user through the app.
        guides = ["CLAUDE.md", "first_run.md", "nova.md", "update.md", "privasi_backup.md", "tabel_arah.md", "fase_1_setup.md"]
        ui = ui_source()
        missing = []
        for p, t in kit_docs():
            if p.name not in guides:
                continue
            # A name the user is told to press or open: right after "tekan", "tombol", "klik", "tab", "menu" or an arrow.
            for m in re.finditer(r'(?:tekan|tombol|klik|tab|menu|→)\s+(?:\*\*([^*\n]{2,40})\*\*|"([^"\n]{2,40})")', t, re.I):
                label = (m.group(1) or m.group(2)).strip()
                if label not in ui:
                    missing.append(f"{p.relative_to(ROOT)}: {label!r}")
        self.assertEqual(missing, [], "agent texts name buttons that are not in the app:\n" + "\n".join(missing))

    def test_the_app_tells_the_agents_its_language_and_button_names(self):
        sync = (UI / "features" / "f50_context_sync.js").read_text(encoding="utf-8")
        self.assertIn("## App", sync, "ui_context.md carries an App section")
        self.assertIn("Language of the app", sync)
        labels = re.search(r"UI_LABELS = window.UI_LABELS = \[(.*?)\];", sync, re.S)
        self.assertTrue(labels, "the label list is in f50_context_sync.js")
        names = re.findall(r'"([^"]+)"', labels.group(1))
        strings = (UI / "strings.js").read_text(encoding="utf-8")
        allow = (ROOT / "tools" / "i18n_allow.txt").read_text(encoding="utf-8").splitlines()
        untranslated = [n for n in names if f'"{n}":' not in strings and n not in allow]
        self.assertEqual(untranslated, [], "every label the agents are told about has its shown name in strings.js")
        for must in ["Tidy up", "Find jobs now", "Export account", "Import account"]:
            self.assertIn(must, names)


if __name__ == "__main__":
    unittest.main()
