"""The GitHub images (banner, flow diagram, app icon) follow the app's current theme.

They are generated from ui/beton.css by tools/brand/make_brand.py. If the theme changes and the images are not
regenerated, this fails. It also catches a hand edit that brings back the old dark/orange theme.
"""
import importlib.util, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("make_brand", ROOT / "tools/brand/make_brand.py")
mb = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mb)

def read(f):
    # Windows checkouts may turn LF into CRLF; compare the content, not the line endings.
    return (ROOT / f).read_text(encoding="utf-8").replace("\r\n", "\n")


OLD_THEME = ["E4511F", "FF7A3D", "1B1A18", "EDE9DF", "14130F"]


class BrandAssets(unittest.TestCase):
    def test_svgs_match_the_generator(self):
        self.assertEqual(read("docs/assets/banner.svg"), mb.banner(),
                         "banner.svg is stale: run python3 tools/brand/make_brand.py")
        self.assertEqual(read("docs/assets/flow.svg"), mb.flow(),
                         "flow.svg is stale: run python3 tools/brand/make_brand.py")
        self.assertEqual(read("tools/brand/icon.svg"), mb.icon(),
                         "icon.svg is stale: run python3 tools/brand/make_brand.py --png")

    def test_agent_pictures_match_the_generator_and_cover_every_agent(self):
        agents = {p.stem for p in (ROOT / "kit/.claude/agents").glob("*.md")} | {"nova"}
        self.assertEqual(set(mb.AGENTS), agents, "every agent (kit/.claude/agents + Nova) needs exactly one picture")
        for name, svg in mb.avatars().items():
            self.assertEqual(read(f"ui/avatars/{name}.svg"), svg, f"ui/avatars/{name}.svg is stale: run python3 tools/brand/make_brand.py")

    def test_no_old_theme_colours_in_readme_or_images(self):
        for f in ["README.md", "README.id.md", "docs/assets/banner.svg", "docs/assets/flow.svg", "tools/brand/icon.svg"]:
            text = read(f).upper()
            for c in OLD_THEME:
                self.assertNotIn(c, text, f"{f} still uses old theme colour #{c}")

    def test_app_icon_is_the_yellow_block(self):
        from PIL import Image  # Pillow is installed in CI (ci.yml)
        im = Image.open(ROOT / "app-icon.png").convert("RGBA")
        self.assertEqual(im.size, (1024, 1024))
        sun = tuple(int(mb.SUN.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
        self.assertEqual(im.getpixel((200, 820))[:3], sun, "app-icon.png is not the current mark: run make_brand.py --png")
        self.assertEqual(im.getpixel((4, 4))[3], 0, "icon margin should be transparent")


if __name__ == "__main__":
    unittest.main()
