"""Build the beta site: beta.html and assets/beta/ from the working app.html and assets/.

The beta page loads its own copy of the code (assets/beta/*) and keeps its library in a
separate browser store, so testing in beta never touches the main bookshelf.
Data files (data/library.js) are shared: they are data, not code.

  python tools/make_beta.py           build
  python tools/make_beta.py --check   fail if beta.html or assets/beta/ are out of date

Never edit beta.html or assets/beta/ by hand.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "app.html"
TARGET = ROOT / "beta.html"
ASSETS = ROOT / "assets"
BETA_ASSETS = ASSETS / "beta"
COPIES = ["format.js"]  # code files that get an isolated beta copy

BANNER_CSS = (
    "<style>.beta-flag{background:#5b3b6b;color:#fff;"
    "text-align:center;font:500 13px Heebo,system-ui,sans-serif;padding:4px 8px}</style>\n"
)
BANNER = '<div class="beta-flag" role="note">סביבת בטא - כאן בודקים שינויים. הארון כאן נפרד מהארון באתר הראשי.</div>\n'

REPLACEMENTS = [
    ("<title>ארון הספרים שלי</title>\n",
     "<title>בטא - ארון הספרים שלי</title>\n<meta name=\"robots\" content=\"noindex\">\n" + BANNER_CSS),
    ('<script src="assets/format.js"></script>', '<script src="assets/beta/format.js"></script>'),
    ("const LS_KEY='bookshelf-local-v1';", "const LS_KEY='bookshelf-beta-v1';"),
    ("indexedDB.open('bookshelf-covers',1)", "indexedDB.open('bookshelf-beta-covers',1)"),
    ("<body>\n", "<body>\n" + BANNER),
]


def build_html():
    s = SOURCE.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS:
        n = s.count(old)
        if n != 1:
            sys.exit(f"make_beta: expected exactly one {old[:50]!r} in app.html, found {n}")
        s = s.replace(old, new)
    head = "<!-- Generated from app.html by tools/make_beta.py. Do not edit by hand. -->\n"
    return head + s


def main():
    check = "--check" in sys.argv
    html = build_html()
    stale = []
    if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != html:
        stale.append("beta.html")
    for name in COPIES:
        src, dst = ASSETS / name, BETA_ASSETS / name
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            stale.append(f"assets/beta/{name}")
    if check:
        if stale:
            print("make_beta: out of date:", ", ".join(stale), "- run python tools/make_beta.py")
            return 1
        print("make_beta: beta is up to date")
        return 0
    TARGET.write_text(html, encoding="utf-8", newline="\n")
    BETA_ASSETS.mkdir(parents=True, exist_ok=True)
    for name in COPIES:
        (BETA_ASSETS / name).write_bytes((ASSETS / name).read_bytes())
    print("make_beta: wrote beta.html, " + ", ".join("assets/beta/" + n for n in COPIES))
    return 0


if __name__ == "__main__":
    sys.exit(main())
