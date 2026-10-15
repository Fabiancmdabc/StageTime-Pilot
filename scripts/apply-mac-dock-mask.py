#!/usr/bin/env python3
"""Apply macOS-like squircle alpha mask to app icons and rebuild .icns/.ico."""
from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


# Apple macOS Big Sur+ template ~223px radius on 1024 grid
RADIUS_RATIO = 223 / 1024


def squircle_mask(size: int) -> Image.Image:
    radius = max(1, int(round(size * RADIUS_RATIO)))
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    # Slight blur for continuous-corner feel, then restore opaque core
    blur = max(1, size // 512)
    soft = mask.filter(ImageFilter.GaussianBlur(radius=blur))
    return soft


def apply_mask(src: Path, dest: Path, size: int | None = None) -> None:
    im = Image.open(src).convert("RGBA")
    if size and im.size != (size, size):
        im = im.resize((size, size), Image.Resampling.LANCZOS)
    w, h = im.size
    side = min(w, h)
    if w != h:
        # center-crop to square
        left = (w - side) // 2
        top = (h - side) // 2
        im = im.crop((left, top, left + side, top + side))
        w = h = side
    mask = squircle_mask(w)
    r, g, b, a = im.split()
    a = ImageChops.multiply(a, mask)
    out = Image.merge("RGBA", (r, g, b, a))
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG")


ICONSET_SIZES = [
    ("icon_16x16.png", 16),
    ("diana.k@example.org", 32),
    ("icon_32x32.png", 32),
    ("ivan.p@example.net", 64),
    ("icon_128x128.png", 128),
    ("alice.j@example.com", 256),
    ("icon_256x256.png", 256),
    ("wendy.h@example.net", 512),
    ("icon_512x512.png", 512),
    ("walt.e@example.net", 1024),
]


def build_icns(png_1024: Path, icns_path: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        base = Image.open(png_1024).convert("RGBA")
        if base.size != (1024, 1024):
            base = base.resize((1024, 1024), Image.Resampling.LANCZOS)
        for name, px in ICONSET_SIZES:
            base.resize((px, px), Image.Resampling.LANCZOS).save(iconset / name, "PNG")
        icns_path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.check_call(["iconutil", "-c", "icns", str(iconset), "-o", str(icns_path)])


def build_ico(png_1024: Path, ico_path: Path) -> None:
    im = Image.open(png_1024).convert("RGBA")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icons = [im.resize(s, Image.Resampling.LANCZOS) for s in sizes]
    ico_path.parent.mkdir(parents=True, exist_ok=True)
    icons[0].save(ico_path, format="ICO", sizes=sizes, append_images=icons[1:])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", type=Path, help="Source PNG (may be opaque square)")
    ap.add_argument("--png", type=Path, required=True, help="Output masked PNG (1024)")
    ap.add_argument("--icns", type=Path, help="Output .icns")
    ap.add_argument("--ico", type=Path, help="Output .ico")
    ap.add_argument("--copy", type=Path, nargs="*", default=[], help="Extra PNG copies")
    args = ap.parse_args()

    apply_mask(args.source, args.png, size=1024)
    for extra in args.copy:
        shutil.copy2(args.png, extra)
    if args.icns:
        build_icns(args.png, args.icns)
    if args.ico:
        build_ico(args.png, args.ico)
    # verify
    im = Image.open(args.png)
    c = im.getpixel((0, 0))
    print(f"OK {args.png} corner={c}")


if __name__ == "__main__":
    main()
