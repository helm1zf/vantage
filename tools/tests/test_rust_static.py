"""Static guards for code that only a Windows PC would reveal (CLAUDE.md: three platforms).
A console program started without CREATE_NO_WINDOW flashes a black window for every call on Windows."""
import os, re, unittest
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "src-tauri", "src")
CONSOLE = ("powershell", "where", "curl", "cmd", "schtasks", "reg", "taskkill", "wscript", "py", "python", "python3", "tar", "unzip", "icacls")

class WindowsConsole(unittest.TestCase):
    def test_console_programs_are_started_quietly(self):
        bad = []
        for f in sorted(os.listdir(SRC)):
            if not f.endswith(".rs"): continue
            lines = open(os.path.join(SRC, f), encoding="utf-8").read().splitlines()
            in_tests = False
            for i, l in enumerate(lines):
                if l.strip().startswith("#[cfg(test)]"): in_tests = True
                if in_tests: break
                m = re.search(r'Command::new\("([^"]+)"\)', l)
                if not m or m.group(1) not in CONSOLE: continue
                window = "\n".join(lines[max(0, i - 3): i + 8])
                if "quiet(" not in window and "creation_flags" not in window and "run_python" not in window:
                    bad.append("%s:%d Command::new(%r) without quiet()" % (f, i + 1, m.group(1)))
        self.assertEqual(bad, [])

    def test_there_is_one_python_finder(self):
        # the lists of Python candidates live only in pyfind.rs
        for f in sorted(os.listdir(SRC)):
            if f.endswith(".rs") and f != "pyfind.rs":
                t = open(os.path.join(SRC, f), encoding="utf-8").read()
                self.assertNotIn('"/opt/homebrew/bin/python3"', t.split("#[cfg(test)]")[0].replace("script_rules", ""), f + " has its own Python candidate list")

if __name__ == "__main__":
    unittest.main()
