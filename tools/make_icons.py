"""Draw the app icons (PNG) with the standard library only: a wooden shelf with book spines.

  python tools/make_icons.py

Writes assets/icons/icon-192.png, icon-512.png and apple-touch-icon.png (180).
The drawing keeps everything inside the middle 80%, so the same icon works as
"maskable" (Android crops it to a circle or rounded square).
"""
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "icons"

BG = (0x6b, 0x4a, 0x2f)        # wood
BACK = (0x4a, 0x31, 0x1f)      # inside of the cabinet
PLANK = (0xa0, 0x72, 0x45)     # shelf plank
BOOKS = [  # (color, height as a share of the shelf space)
    ((0x2f, 0x6f, 0x6f), 0.78), ((0x7a, 0x2e, 0x2a), 0.92), ((0xe8, 0xdc, 0xc4), 0.70),
    ((0x2f, 0x4f, 0x6f), 0.86), ((0xe9, 0xb2, 0x3a), 0.74), ((0x5b, 0x3b, 0x6b), 0.95),
    ((0x3d, 0x5c, 0x3a), 0.80),
]


def draw(size):
    px = [[BG] * size for _ in range(size)]

    def rect(x0, y0, x1, y1, c):
        for y in range(max(0, int(y0)), min(size, int(y1))):
            row = px[y]
            for x in range(max(0, int(x0)), min(size, int(x1))):
                row[x] = c

    s = size / 100.0
    rect(18 * s, 20 * s, 82 * s, 76 * s, BACK)          # cabinet opening (inside the safe zone)
    rect(14 * s, 74 * s, 86 * s, 82 * s, PLANK)         # shelf plank
    # books stand on the plank, right to left like a Hebrew shelf
    x = 78 * s
    widths = [7, 8, 6, 8, 6, 9, 7]
    for (color, h), w in zip(BOOKS, widths):
        top = 74 * s - h * 50 * s
        rect(x - w * s, top, x, 74 * s, color)
        rect(x - w * s, top + 6 * s, x, top + 7.5 * s, (0xf1, 0xe8, 0xdc))  # label band
        x -= (w + 1) * s
    return px


def png(px):
    h, w = len(px), len(px[0])
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
        (OUT / name).write_bytes(png(draw(size)))
        print("wrote", OUT / name)


if __name__ == "__main__":
    main()
