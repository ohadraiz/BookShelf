"""Round-trip tests for tools/convert.py. Run: python tools/test_convert.py"""
import csv
import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import convert as c  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
SNAP = sorted((ROOT / "data" / "backups").glob("live-*.json"))[-1]


def order(backup):
    """Books per shelf in display order, as the app shows them."""
    out = {}
    for b in sorted(backup["books"], key=lambda b: b["pos"]):
        out.setdefault(b["shelf"], []).append(b["id"])
    return out


def strip(b):
    return {k: v for k, v in c.clean_backup(b).items() if k != "pos"}


def main():
    src = json.loads(SNAP.read_text(encoding="utf-8"))
    lib = c.from_backup(src, c.DEFAULT_LIBRARY)
    fails = []

    errs, full = c.validate(lib)
    if errs:
        fails.append(f"library not valid: {errs[:3]}")

    # backup -> library -> backup keeps every field and the shelf order
    back = c.to_backup(lib)
    a = {b["id"]: strip(b) for b in src["books"]}
    z = {b["id"]: strip(b) for b in back["books"]}
    if a != z:
        diff = [k for k in a if a[k] != z.get(k)][:5]
        fails.append(f"backup round trip changed books: {diff}")
    if order(src) != order(back):
        fails.append("backup round trip changed shelf order")
    if src["meta"]["shelves"] != back["meta"]["shelves"]:
        fails.append("backup round trip changed shelves")

    # library -> CSV -> library keeps the same books
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=c.CSV_COLUMNS)
    w.writeheader()
    w.writerows(c.to_csv_rows(lib))
    buf.seek(0)
    lib2 = c.from_csv(list(csv.DictReader(buf)), c.DEFAULT_LIBRARY)
    if [b for b in lib["books"]] != [b for b in lib2["books"]]:
        fails.append("CSV round trip changed books")

    # counts
    n = len(lib["books"])
    review = sum(1 for b in lib["books"] if b["copy"].get("needsReview"))
    multi = [b["id"] for b in lib["books"] if len(b["work"].get("author", [])) > 1]
    print(f"books {n}, needsReview {review}, multi-author {multi}, schema {'full' if full else 'basic'}")

    for f in fails:
        print("FAIL", f)
    print("PASS" if not fails else f"{len(fails)} failed")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
