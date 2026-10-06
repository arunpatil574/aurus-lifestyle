#!/usr/bin/env python3
"""
Aurus — image optimiser.

For every image in assets/brands/<brand>/ this generates two lightweight
WebP derivatives the site actually loads:

  <brand>/thumbs/<name>.webp   small  — the grid + filmstrip
  <brand>/view/<name>.webp     medium — the full-screen viewer

The originals stay where they are and are used only as a fallback if a
derivative is missing. Re-run this whenever you add or replace images:

    python tools/optimize-images.py

Requires Pillow:  pip install Pillow
"""
import os
import sys
from PIL import Image, ImageOps

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "brands")
BRANDS = ["blinco", "kudos-handles", "kudos-knobs", "ciscon"]
EXTS = (".jpg", ".jpeg", ".png", ".webp")

THUMB_EDGE = 800     # px, longest side — grid tiles (covers 2x retina)
VIEW_EDGE = 2000     # px, longest side — full-screen viewer
THUMB_Q = 72
VIEW_Q = 82


def derive(src_path, out_path, max_edge, quality):
    if os.path.exists(out_path) and os.path.getmtime(out_path) >= os.path.getmtime(src_path):
        return False  # up to date
    with Image.open(src_path) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "P", "LA"):
            im = im.convert("RGB")
        im.thumbnail((max_edge, max_edge), Image.LANCZOS)
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        im.save(out_path, "WEBP", quality=quality, method=6)
    return True


def main():
    total_made = 0
    for brand in BRANDS:
        bdir = os.path.join(ROOT, brand)
        if not os.path.isdir(bdir):
            print(f"  (skip) {brand} — no folder")
            continue
        names = sorted(
            f for f in os.listdir(bdir)
            if f.lower().endswith(EXTS) and os.path.isfile(os.path.join(bdir, f))
        )
        made = 0
        for name in names:
            stem = os.path.splitext(name)[0]
            src = os.path.join(bdir, name)
            if derive(src, os.path.join(bdir, "thumbs", stem + ".webp"), THUMB_EDGE, THUMB_Q):
                made += 1
            if derive(src, os.path.join(bdir, "view", stem + ".webp"), VIEW_EDGE, VIEW_Q):
                made += 1
        total_made += made
        print(f"  {brand}: {len(names)} images, {made} derivatives written/updated")
    print(f"Done. {total_made} files written.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa
        print("Error:", e, file=sys.stderr)
        sys.exit(1)
