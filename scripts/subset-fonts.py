"""Google Fonts strips small caps and old-style figures from its Latin slices, so the page
self-hosts a subset of Adobe's OFL release with those features kept.
"""
import hashlib
import html
import os
import re
import tempfile
import urllib.request
import zipfile
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

URL = "https://github.com/adobe-fonts/source-serif/releases/download/4.005R/source-serif-4.005_WOFF2.zip"
SHA256 = "af10e80dcd2296748b04cb9917db9f7ba0ae65101165fd2f0c16b9812d9abd28"
ARCHIVE = Path(tempfile.gettempdir()) / "source-serif-4.005_WOFF2.zip"
GEORGIA_DIR = Path(os.environ.get("GEORGIA_DIR", "/System/Library/Fonts/Supplemental"))
REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "fonts"

TEXT = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x2009, 0x200A, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2020, 0x2021,
       0x2022, 0x2026, 0x202F, 0x2032, 0x2033, 0x20AC, 0x2122, 0x2192, 0x2264, 0x2265]
)
LETTERS = list(range(0x41, 0x5B)) + list(range(0x61, 0x7B)) + [0x20, 0x2C, 0x2E, 0x2019]
FEATURES = ["kern", "liga", "ccmp", "locl", "smcp", "c2sc", "onum", "lnum", "tnum", "pnum", "case", "zero"]
FAMILY = "JC Serif"
NOTICES = {0: "copyright", 7: "trademark", 13: "license", 14: "license URL"}

FACES = {
    "serif-text.woff2": ("SourceSerif4Variable-Roman.ttf.woff2", {"wght": (340, 650), "opsz": 20}, TEXT, "Text"),
    "serif-italic.woff2": ("SourceSerif4Variable-Italic.ttf.woff2", {"wght": 400, "opsz": 20}, TEXT, "Italic"),
    "serif-display.woff2": ("SourceSerif4Variable-Roman.ttf.woff2", {"wght": 400, "opsz": 60}, LETTERS, "Display"),
}

PAGE_BOLD_WEIGHT = 620
FALLBACKS = [
    ("Georgia.ttf", 400, "normal", "serif-text.woff2", {}),
    ("Georgia Bold.ttf", 700, "normal", "serif-text.woff2", {"wght": PAGE_BOLD_WEIGHT}),
    ("Georgia Italic.ttf", 400, "italic", "serif-italic.woff2", {}),
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def archive() -> zipfile.ZipFile:
    if not ARCHIVE.exists() or sha256(ARCHIVE) != SHA256:
        part = ARCHIVE.with_suffix(".part")
        urllib.request.urlretrieve(URL, part)
        if (digest := sha256(part)) != SHA256:
            raise SystemExit(f"{URL} downloaded with sha256 {digest}, want {SHA256}")
        part.replace(ARCHIVE)
    return zipfile.ZipFile(ARCHIVE)


def rename(font: TTFont, style: str) -> None:
    name = font["name"]
    prefix = f"JCSerif{style}"
    records = {
        1: FAMILY if style in ("Text", "Italic") else f"{FAMILY} {style}",
        3: f"{name.getDebugName(3).split(';')[0]};JCSerif-{style}",
        4: f"{FAMILY} {style}",
        6: f"JCSerif-{style}",
        16: FAMILY,
        17: style,
        25: prefix,
    }
    for instance in font["fvar"].instances if "fvar" in font else []:
        records[instance.postscriptNameID] = f"{prefix}-{name.getDebugName(instance.subfamilyNameID).replace(' ', '')}"
    for name_id, value in records.items():
        name.setName(value, name_id, 3, 1, 0x409)
    reserved = [r.nameID for r in name.names if r.nameID not in NOTICES and "Source" in r.toUnicode()]
    if reserved:
        raise SystemExit(f"name IDs {reserved} still use the reserved name Source")


def cut(source: bytes, axes: dict, unicodes: list, style: str, dest: Path) -> None:
    font = TTFont(BytesIO(source), recalcTimestamp=False)
    options = subset.Options()
    options.layout_features = FEATURES
    options.desubroutinize = True
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font = instancer.instantiateVariableFont(font, axes)
    rename(font, style)
    font.flavor = "woff2"
    font.save(dest)


def page_text() -> str:
    body = (REPO / "index.html").read_text(encoding="utf-8")
    body = re.sub(r"(?s)<(style|script|head)\b.*?</\1>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body)))


def average_advance(font: TTFont, text: str) -> float:
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    widths = [hmtx[cmap[ord(c)]][0] for c in text if ord(c) in cmap]
    return sum(widths) / len(widths) / font["head"].unitsPerEm


def fallback_rules() -> list[str]:
    sample, rules = page_text(), []
    for local_file, weight, style, webfont, axes in FALLBACKS:
        serif, georgia = TTFont(OUT / webfont), TTFont(GEORGIA_DIR / local_file)
        if axes:
            serif = instancer.instantiateVariableFont(serif, axes)
        src = ", ".join(f'local("{name}")' for name in dict.fromkeys(georgia["name"].getDebugName(i) for i in (4, 6)))
        size = average_advance(serif, sample) / average_advance(georgia, sample)
        upm, hhea = serif["head"].unitsPerEm, serif["hhea"]
        ascent, descent, gap = hhea.ascent / upm / size, -hhea.descent / upm / size, hhea.lineGap / upm / size
        rules.append(
            f'@font-face {{ font-family: "JC Serif Fallback"; src: {src}; font-weight: {weight}; font-style: {style}; '
            f"size-adjust: {size:.2%}; ascent-override: {ascent:.2%}; "
            f"descent-override: {descent:.2%}; line-gap-override: {gap:.2%}; }}"
        )
    return rules


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    with archive() as zipped:
        for name, (source, axes, unicodes, style) in FACES.items():
            cut(zipped.read(f"source-serif-4.005_WOFF2/VAR/{source}"), axes, unicodes, style, OUT / name)
            print(f"{name:22} {(OUT / name).stat().st_size / 1024:6.1f} KB  {axes}")
    if (REPO / "index.html").exists():
        print("\n".join(fallback_rules()))
