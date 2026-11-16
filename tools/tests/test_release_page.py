"""The GitHub release page: short body (download files near the top) and no @mention of a stranger.

Bug 15 Nov: every release body was the whole RELEASE_NOTES.md (~34,000 characters), so the download files sat far below,
and "@Sinta" in the 0.8.7 notes linked the GitHub user "Sinta", whom GitHub then listed as a contributor of the release.
"""
import os, re, shutil, subprocess, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "release_body.sh"
NOTES = """## What's new in 1.2.0

- New thing.

## What's new in 1.1.0

- Old thing.
"""


@unittest.skipIf(os.name == "nt" or not shutil.which("bash"), "the release body is built by bash on the release runners")
class ReleaseBody(unittest.TestCase):
    def run_script(self, ver, text=NOTES):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / "notes.md"
            f.write_text(text, encoding="utf-8")
            return subprocess.run(["bash", str(SCRIPT), ver, str(f)], capture_output=True, text=True)

    def test_only_the_tagged_version(self):
        r = self.run_script("v1.2.0")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout, "- New thing.\n")

    def test_the_oldest_section_runs_to_the_end(self):
        self.assertEqual(self.run_script("1.1.0").stdout, "- Old thing.\n")

    def test_a_missing_section_stops_the_release(self):
        r = self.run_script("1.3.0")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("1.3.0", r.stderr)

    def test_the_real_notes_give_a_short_body_for_every_version(self):
        text = (ROOT / "RELEASE_NOTES.md").read_text(encoding="utf-8")
        versions = re.findall(r"^## What's new in (\S+)$", text, re.M)
        self.assertTrue(versions)
        for v in versions:
            r = subprocess.run(["bash", str(SCRIPT), v], capture_output=True, text=True, cwd=ROOT)
            self.assertEqual(r.returncode, 0, (v, r.stderr))
            self.assertNotIn("## What's new in", r.stdout, v)

    def test_the_release_workflow_uses_the_script(self):
        wf = (ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
        self.assertIn("tools/release_body.sh", wf)
        self.assertNotIn("cat RELEASE_NOTES.md", wf)


class NoStrangerMentions(unittest.TestCase):
    def test_no_bare_at_mention_in_public_texts(self):
        # GitHub turns @name into a link to that account (and a "contributor" on a release). Agent names go in backticks.
        for name in ["RELEASE_NOTES.md", "README.md", "README.id.md", "INSTALL.md"]:
            text = (ROOT / name).read_text(encoding="utf-8")
            text = re.sub(r"```.*?```", "", text, flags=re.S)
            text = re.sub(r"`[^`\n]*`", "", text)
            bare = re.findall(r"(?<![\w./-])@[A-Za-z][\w-]*", text)
            self.assertEqual(bare, [], name)


if __name__ == "__main__":
    unittest.main()
