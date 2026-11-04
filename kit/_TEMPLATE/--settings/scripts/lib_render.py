"""Satu mesin PDF untuk semua dokumen Vantage: HTML dicetak lewat Chrome/Edge/Chromium.

Dipakai build_cv.py, build_cover_letter.py, build_master_cv.py, export_pdf.py,
dan build_laporan_pagi.py.

Kenapa satu mesin: dulu .docx yang sama bisa dirender Word Windows, Word Mac, atau
LibreOffice, tergantung komputernya. Font, jarak baris, dan jumlah halaman bisa beda,
jadi "hasil beda-beda". Sekarang tampilan ditentukan template HTML + CSS yang sama,
dan dicetak browser berbasis Chromium yang hampir selalu sudah ada di komputer user
(Edge bawaan Windows, Chrome di Mac). Tidak butuh Word maupun LibreOffice.

Lokasi browser lain bisa dipaksa lewat env VANTAGE_BROWSER=<path>.
"""

import base64
import glob
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

INSTALL_HINT = (
    "! Chrome/Edge/Chromium tidak ketemu.\n"
    "  Windows: Microsoft Edge biasanya sudah ada; kalau tidak, install Google Chrome.\n"
    "  Mac    : install Google Chrome (google.com/chrome).\n"
    "  Lokasi lain: set env VANTAGE_BROWSER=<path ke chrome/msedge>."
)


def find_browser():
    env = os.environ.get("VANTAGE_BROWSER")
    cands = [env] if env else []
    cands += [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ]
    for name in ("msedge", "microsoft-edge", "google-chrome", "google-chrome-stable",
                 "chromium", "chromium-browser", "chrome"):
        p = shutil.which(name)
        if p:
            cands.append(p)
    cands += sorted(glob.glob("/opt/pw-browsers/chromium*/chrome-linux*/chrome"))
    for c in cands:
        if c and os.path.isfile(c):
            return c
    return None


def print_pdf(html_path, pdf_path, browser=None):
    """Cetak file HTML ke PDF. True kalau berhasil."""
    browser = browser or find_browser()
    if not browser:
        return False
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    with tempfile.TemporaryDirectory(prefix="vantage_chrome_") as profile:
        args = [browser, "--headless=new", "--disable-gpu", "--no-first-run",
                "--no-default-browser-check", f"--user-data-dir={profile}",
                "--no-pdf-header-footer", f"--print-to-pdf={os.path.abspath(pdf_path)}",
                Path(os.path.abspath(html_path)).as_uri()]
        if sys.platform.startswith("linux"):
            args.insert(1, "--no-sandbox")
        try:
            subprocess.run(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
        except (OSError, subprocess.TimeoutExpired):
            return False
    return os.path.isfile(pdf_path) and os.path.getsize(pdf_path) > 0


def html_to_pdf(html, pdf_path, keep_html=None):
    """Tulis HTML (string) lalu cetak ke PDF. keep_html = path kalau HTML-nya mau disimpan."""
    if keep_html:
        html_path = keep_html
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html)
        return print_pdf(html_path, pdf_path)
    fd, html_path = tempfile.mkstemp(suffix=".html", prefix="vantage_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(html)
        return print_pdf(html_path, pdf_path)
    finally:
        os.remove(html_path)


def count_pages(pdf_path):
    """Jumlah halaman PDF, atau None kalau pypdf tidak terpasang."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return None
    return len(PdfReader(pdf_path).pages)


def image_data_uri(path):
    ext = os.path.splitext(path)[1].lower().lstrip(".") or "png"
    mime = "jpeg" if ext in ("jpg", "jpeg") else ext
    with open(path, "rb") as f:
        return f"data:image/{mime};base64," + base64.b64encode(f.read()).decode("ascii")


def fill(template, values):
    """Ganti penanda {{KEY}} di template dengan nilai yang sudah di-escape."""
    for key, val in values.items():
        template = template.replace("{{" + key + "}}", val)
    return template

def hide_internal():
    """Sembunyikan file dapur (JSON kerja, .md) setelah dokumen jadi, supaya user tidak perlu
    diingatkan. Best effort: gagal tidak menghentikan apa pun. Dilewati di _TEMPLATE/ sendiri."""
    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.abspath(os.path.join(here, "..", ".."))
    script = os.path.join(here, "hide_internal.py")
    if os.path.basename(root) == "_TEMPLATE" or not os.path.isfile(script):
        return
    try:
        subprocess.run([sys.executable, script], capture_output=True, timeout=60)
    except Exception:
        pass
