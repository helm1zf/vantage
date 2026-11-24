#!/usr/bin/env python3
"""Builds the README banner, the flow diagram and the app icon from the app's current theme (ui/beton.css).

One source of truth: colours come from the :root tokens in ui/beton.css and the fonts from ui/fonts, so the
GitHub images follow the app when the theme changes. Run from anywhere:

    python3 tools/brand/make_brand.py            # writes docs/assets/banner.svg, docs/assets/flow.svg, tools/brand/icon.svg
    python3 tools/brand/make_brand.py --png      # also renders app-icon.png (1024x1024) with headless Chrome

The fonts are embedded (base64 woff2) because GitHub shows SVGs as <img>, where web fonts cannot load from a URL.
"""
import base64, re, subprocess, sys, shutil, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSS = (ROOT / "ui/beton.css").read_text(encoding="utf-8")
root_block = re.search(r":root\{(.*?)\}", CSS, re.S).group(1)
T = dict(re.findall(r"--([\w-]+):\s*([^;]+);", root_block))
INK, PAPER, PANEL, HOUSING = T["ink"], T["paper"], T["panel"], T["housing"]
SUN, ROSE, SKY, MINT, MUTED = T["sun"], T["rose"], T["sky"], T["mint"], T["muted"]


def font(family, weight, file):
    data = base64.b64encode((ROOT / "ui/fonts" / file).read_bytes()).decode()
    return f'@font-face{{font-family:"{family}";font-weight:{weight};src:url(data:font/woff2;base64,{data}) format("woff2")}}'


FONTS_ALL = "\n".join([
    font("JetBrains Mono", 800, "jetbrains-mono-latin-800-normal.woff2"),
    font("JetBrains Mono", 500, "jetbrains-mono-latin-500-normal.woff2"),
    font("IBM Plex Sans", 400, "ibm-plex-sans-latin-400-normal.woff2"),
    font("IBM Plex Sans", 600, "ibm-plex-sans-latin-600-normal.woff2"),
])
MONO = "'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace"
SANS = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif"


def block(x, y, w, h, fill, sw=3, sh=6):
    """A Beton block: flat colour, thick black edge, hard offset shadow, square corners."""
    return (f'<rect x="{x+sh}" y="{y+sh}" width="{w}" height="{h}" fill="{INK}"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>')


def chip(x, y, label, fill):
    w = 14 + len(label) * 7.2
    return (f'<rect x="{x}" y="{y}" width="{w:.0f}" height="22" fill="{fill}" stroke="{INK}" stroke-width="1.5"/>'
            f'<text x="{x+7}" y="{y+15.5}" class="m5" font-size="12" letter-spacing=".5">{label}</text>')


def banner():
    cards = [
        block(906, 64, 300, 150, SKY) + f'<text x="926" y="92" class="m5" font-size="12" letter-spacing="1.5">SENT</text>',
        block(876, 100, 300, 150, ROSE) + f'<text x="896" y="128" class="m5" font-size="12" letter-spacing="1.5">INTERVIEW</text>',
        block(846, 136, 300, 150, SUN)
        + f'<text x="868" y="176" class="s6" font-size="22">Blauberg AG</text>'
        + f'<text x="868" y="204" class="s4" font-size="16">Working Student Supply Chain</text>'
        + chip(868, 238, "INTERVIEW", ROSE)
        + f'<text x="1124" y="255" class="m8" font-size="22" text-anchor="end">87%</text>',
    ]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 360" width="1280" height="360" role="img" aria-labelledby="t d">
  <title id="t">Vantage</title>
  <desc id="d">Vantage: a desktop app for your job search, with assistants on your Claude Code. Find ads, score the fit, write the CV, prepare the interview.</desc>
  <defs><style>
{FONTS_ALL}
    .m8{{font-family:{MONO};font-weight:800;fill:{INK}}} .m5{{font-family:{MONO};font-weight:500;fill:{INK}}}
    .s6{{font-family:{SANS};font-weight:600;fill:{INK}}} .s4{{font-family:{SANS};font-weight:400;fill:{INK}}}
  </style></defs>
  <rect width="1280" height="360" fill="{HOUSING}"/>
  {block(28, 26, 1214, 294, PAPER, sw=3, sh=8)}
  {mark(scale=0.094, dx=74, dy=68)}
  <text x="188" y="146" class="m8" font-size="74" letter-spacing="-2">VANTAGE</text>
  <text x="86" y="224" class="s4" font-size="22">A desktop app for your job search,</text>
  <text x="86" y="254" class="s4" font-size="22">with assistants on your Claude Code.</text>
  <text x="86" y="292" class="m5" font-size="14" letter-spacing="1.5" fill="{MUTED}" style="fill:{MUTED}">FIND ADS · SCORE THE FIT · WRITE THE CV · PREPARE THE INTERVIEW</text>
  {"".join(cards)}
</svg>
'''


def flow():
    agents = [("PROFILE", "Raka", "Your facts; sorts", "the Inbox", MINT),
              ("SEARCH", "Sinta", "Finds ads, verifies", "official, live links", SKY),
              ("FIT", "Arga", "Scores each ad", "against your facts", SUN),
              ("WRITE", "Bayu", "Tailored CV and cover", "letter, as PDF", ROSE),
              ("CHECK", "Tari", "Reviews every PDF,", "up to three rounds", SKY),
              ("INTERVIEW", "Laras", "Company research,", "practice and debrief", ROSE)]
    cards = []
    for i, (k, n, r1, r2, c) in enumerate(agents):
        x = i * 186
        cards.append(block(x, 176, 156, 128, PANEL, sw=2, sh=4) + chip(x + 14, 190, k, c)
                     + f'<text x="{x+16}" y="240" class="m8" font-size="20">{n}</text>'
                     + f'<text x="{x+16}" y="264" class="s4" font-size="12.5">{r1}</text>'
                     + f'<text x="{x+16}" y="281" class="s4" font-size="12.5">{r2}</text>')
    drops = "".join(f"M{78+i*186} 140V172" for i in range(6))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 380" width="1200" height="380" role="img" aria-labelledby="t d">
  <title id="t">How Vantage works</title>
  <desc id="d">Buttons in the app start the agent that owns the task; in chat, Nova hands a request to the right agent. Six agents: Sinta hands ads to Arga, Arga hands strong matches to Bayu, and Bayu hands documents to Tari. Raka and Laras work on request.</desc>
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9z" fill="{INK}"/></marker>
    <style>
{FONTS_ALL}
    .m8{{font-family:{MONO};font-weight:800;fill:{INK}}} .m5{{font-family:{MONO};font-weight:500;fill:{INK}}}
    .s6{{font-family:{SANS};font-weight:600;fill:{INK}}} .s4{{font-family:{SANS};font-weight:400;fill:{INK}}}
    .lg{{font-family:{SANS};font-weight:400;fill:{MUTED};font-size:13px}}
    </style>
  </defs>
  <rect x="1" y="1" width="1198" height="378" fill="{PAPER}" stroke="{INK}" stroke-width="2"/>

  {block(370, 26, 460, 78, SUN, sw=3, sh=5)}
  <text x="600" y="60" text-anchor="middle" class="m8" font-size="23">Vantage app · Nova</text>
  <text x="600" y="86" text-anchor="middle" class="s4" font-size="14">a button starts the right agent; in chat, Nova hands over</text>

  <g transform="translate(57 0)">
    <path d="M543 109V140M78 140H1008{drops}" fill="none" stroke="{INK}" stroke-width="2" stroke-dasharray="6 5"/>
    {"".join(cards)}
    <g stroke="{INK}" stroke-width="2.2" fill="none">
      <path d="M344 240H366" marker-end="url(#ar)"/>
      <path d="M530 240H552" marker-end="url(#ar)"/>
      <path d="M716 240H738" marker-end="url(#ar)"/>
    </g>
    <path d="M0 344H26" stroke="{INK}" stroke-width="2.2" marker-end="url(#ar)"/>
    <text class="lg" x="40" y="348">Automatic hand-off between agents</text>
    <path d="M330 344H360" stroke="{INK}" stroke-width="2" stroke-dasharray="6 5"/>
    <text class="lg" x="374" y="348">Started by a button, or by Nova in chat</text>
  </g>
</svg>
'''


def mark(scale=1.0, dx=0, dy=0):
    """The Vantage mark on a 1024 grid: a stack of application cards (sky, rose, yellow) with a heavy V on the front one."""
    def b(x, y, fill):
        return block(x, y, 560, 560, fill, sw=36, sh=40)
    body = (b(300, 110, SKY) + b(220, 210, ROSE) + b(130, 320, SUN)
            + f'<text x="410" y="780" text-anchor="middle" font-family="{MONO}" font-weight="800" font-size="480" fill="{INK}">V</text>')
    return f'<g transform="translate({dx} {dy}) scale({scale})">{body}</g>'


def icon():
    # 1024 grid with a transparent margin (macOS/Windows draw their own frame around it).
    v = font("JetBrains Mono", 800, "jetbrains-mono-latin-800-normal.woff2")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><style>{v}</style></defs>
  {mark()}
</svg>
'''


def chrome():
    for c in ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "google-chrome", "chromium", "chrome"]:
        if Path(c).exists() or shutil.which(c):
            return c
    sys.exit("Chrome not found: needed to render app-icon.png")


def render_png(svg: Path, out: Path, w: int, h: int):
    with tempfile.TemporaryDirectory() as d:
        page = Path(d) / "p.html"
        page.write_text(f'<html><body style="margin:0;background:transparent"><img src="{svg.as_uri()}" width="{w}" height="{h}"></body></html>')
        subprocess.run([chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--default-background-color=00000000", f"--window-size={w},{h}",
                        f"--screenshot={out}", page.as_uri()], check=True, capture_output=True)


if __name__ == "__main__":
    (ROOT / "docs/assets/banner.svg").write_text(banner(), encoding="utf-8")
    (ROOT / "docs/assets/flow.svg").write_text(flow(), encoding="utf-8")
    icon_svg = ROOT / "tools/brand/icon.svg"
    icon_svg.write_text(icon(), encoding="utf-8")
    if "--png" in sys.argv:
        render_png(icon_svg, ROOT / "app-icon.png", 1024, 1024)
    print("brand assets written")
