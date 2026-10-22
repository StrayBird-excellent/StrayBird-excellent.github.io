# -*- coding: utf-8 -*-
"""Build the two self-hosted woff2 faces used by the art site.

  • Garamond-italic  — latin subset of EB Garamond (the Latin voice, italic)
  • straybird-serif  — Noto Serif SC subset to exactly the glyphs we ship

Run from anywhere:  python build_fonts.py
Requires: fonttools + brotli
"""
import io
import os
import re
import urllib.request

from fontTools import subset
from fontTools.ttLib import TTFont

BASE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(BASE, "assets", "fonts")
os.makedirs(FONTS, exist_ok=True)

UA = {"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                     "(KHTML, like Gecko) Chrome/141.0 Safari/537.36")}
CSS = ("https://fonts.googleapis.com/css2?"
       "family=EB+Garamond:ital,wght@1,400&display=swap")


def fetch(url, timeout=180):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA),
                                  timeout=timeout).read()


# ── 1. EB Garamond italic (latin only) ──────────────────────────────────────
def build_garamond():
    css = fetch(CSS).decode("utf-8")
    block = None
    for label, blk in re.findall(r"/\*\s*([a-z0-9\-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css):
        if label == "latin":
            block = blk
            break
    if not block:
        raise SystemExit("latin subset of EB Garamond not found")
    url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    data = fetch(url)
    out = os.path.join(FONTS, "garamond-italic.woff2")
    open(out, "wb").write(data)
    print(f"garamond-italic.woff2: {len(data)/1024:.1f} KB")


# ── 2. Noto Serif SC, subset to the site's own glyphs ───────────────────────
NOTO_URL = ("https://raw.githubusercontent.com/googlefonts/noto-cjk/main/"
            "Serif/OTF/SimplifiedChinese/NotoSerifCJKsc-Regular.otf")

EXTRA = set("，。、；：？！“”‘’（）《》〈〉【】…—·～　「」『』﹁﹂①②③")


def collect_glyphs():
    chars = set()
    for name in ("index.html", "content.js", "watercolor.js"):
        path = os.path.join(BASE, name)
        if os.path.exists(path):
            chars |= set(open(path, encoding="utf-8").read())
    chars |= {chr(c) for c in range(32, 127)}
    chars |= EXTRA
    return {c for c in chars if c not in "\n\r\t"}


def build_serif():
    full = os.path.join(FONTS, "_noto-full.otf")
    if not os.path.exists(full):
        print("downloading Noto Serif SC (~25 MB, one time)…")
        open(full, "wb").write(fetch(NOTO_URL, timeout=300))
    glyphs = collect_glyphs()
    print(f"glyphs to keep: {len(glyphs)}")

    font = TTFont(full)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.recalc_bounds = True
    sub = subset.Subsetter(options=opts)
    sub.populate(text="".join(sorted(glyphs)))
    sub.subset(font)
    font.flavor = "woff2"
    out = os.path.join(FONTS, "straybird-serif.woff2")
    font.save(out)
    os.remove(full)  # keep the repo small
    print(f"straybird-serif.woff2: {os.path.getsize(out)/1024:.1f} KB")


if __name__ == "__main__":
    build_garamond()
    build_serif()
    print("fonts ready →", FONTS)
