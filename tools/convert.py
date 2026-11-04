"""Convert between the app's backup file and the standard library format.

The standard format is described in docs/FORMAT.md and schema/library.schema.json.

Commands:
  python tools/convert.py from-backup BACKUP.json -o library.json
  python tools/convert.py to-backup   library.json -o backup.json
  python tools/convert.py to-csv      library.json -o library.csv
  python tools/convert.py from-csv    library.csv  -o library.json
  python tools/convert.py validate    library.json
  python tools/convert.py to-js       library.json -o data/library.js
  python tools/convert.py baseline    ~/Downloads/library.json   (new starting point)

Uses only the Python standard library. If the `jsonschema` package is
installed, `validate` also checks the file against the full JSON Schema.
"""
import argparse
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = ROOT / "schema" / "library.schema.json"
FORMAT = "bookshelf-library"
VERSION = "1.0.0"
GENERATOR = "BookShelf tools/convert.py"

STATUSES = ["shelf", "reading", "read", "want", "lent", "borrowed", "given"]

# Placeholders the app uses for "not identified yet".
NO_TITLE = "כותר לא מזוהה"
NO_AUTHOR = "לא מזוהה"

# The app keeps all authors in one text field. These are the known
# multi-author entries, split by hand. Splitting automatically on " ו" is
# not safe (for example "ג'ון ויליאמס" is one person).
AUTHOR_SPLITS = {
    "מיכאל בר-זהר ונסים משעל": ["מיכאל בר-זהר", "נסים משעל"],
    "איתן הבר ויוסי מלמן": ["איתן הבר", "יוסי מלמן"],
    "מרי אן שפר ואנני בארוז": ["מרי אן שפר", "אנני בארוז"],
}
JOIN = {tuple(v): k for k, v in AUTHOR_SPLITS.items()}

DEFAULT_LIBRARY = {
    "id": "ohad-noa-home",
    "name": "ארון הספרים של אוהד ונועה",
    "inLanguage": "he",
    "owners": ["אוהד", "נועה"],
}

CSV_COLUMNS = [
    "id", "title", "subtitle", "authors", "translators", "language", "isbn",
    "publisher", "published", "pages", "shelf", "position", "status",
    "person", "due_date", "needs_review", "rating", "tags", "current_page",
    "start_date", "end_date", "review", "notes",
]
LIST_SEP = "; "

HEB = re.compile(r"[֐-׿]")
LAT = re.compile(r"[A-Za-z]")


def guess_language(text):
    if HEB.search(text or ""):
        return "he"
    if LAT.search(text or ""):
        return "en"
    return None


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def prune(d):
    """Drop empty values so that 'absent' always means 'unknown'."""
    return {k: v for k, v in d.items() if v not in (None, "", [], {}, 0)}


# ---------- backup -> library ----------

def book_from_backup(b, position):
    title = (b.get("title") or "").strip()
    author = (b.get("author") or "").strip()
    authors = AUTHOR_SPLITS.get(author, [author] if author and author != NO_AUTHOR else [])
    name = title if title and title != NO_TITLE else None
    work = prune({
        "name": name,
        "author": authors,
        "inLanguage": guess_language(name) or guess_language(" ".join(authors)),
        "numberOfPages": int(b.get("pages") or 0),
    })
    copy = prune({
        "shelf": b.get("shelf") or None,
        "position": position,
        "status": b.get("status") or "shelf",
        "person": b.get("person"),
        "dueDate": b.get("due"),
        "coverFront": b.get("front"),
        "coverBack": b.get("back"),
    })
    copy["status"] = b.get("status") or "shelf"
    if b.get("check"):
        copy["needsReview"] = True
    reading = prune({
        "rating": int(b.get("rating") or 0),
        "review": b.get("review"),
        "notes": b.get("notes"),
        "tags": list(dict.fromkeys(b.get("tags") or [])),
        "currentPage": int(b.get("page") or 0),
        "startDate": b.get("started"),
        "endDate": b.get("finished"),
    })
    out = {"id": str(b["id"]), "work": work, "copy": copy}
    if reading:
        out["reading"] = reading
    return out


def from_backup(backup, library_info):
    meta = backup.get("meta") or {}
    shelves = [{"id": str(s["id"])} for s in meta.get("shelves", [])]
    shelf_order = {s["id"]: i for i, s in enumerate(shelves)}
    books = backup.get("books") or []

    # position = 1-based order on the shelf, by the app's pos value
    positions = {}
    by_shelf = {}
    for b in books:
        by_shelf.setdefault(b.get("shelf") or "", []).append(b)
    for sid, items in by_shelf.items():
        for i, b in enumerate(sorted(items, key=lambda x: x.get("pos") or 0), 1):
            positions[str(b["id"])] = i if sid else None

    converted = [book_from_backup(b, positions[str(b["id"])]) for b in books]
    converted.sort(key=lambda x: (shelf_order.get(x["copy"].get("shelf"), 10**6),
                                  x["copy"].get("position") or 0, x["id"]))
    library = dict(library_info)
    if meta.get("goal"):
        library["yearlyGoal"] = int(meta["goal"])
    library["shelves"] = shelves
    return {
        "format": FORMAT,
        "formatVersion": VERSION,
        "exportedAt": now_iso(),
        "generator": GENERATOR,
        "library": library,
        "books": converted,
    }


BACKUP_FIELDS = {"title": "", "author": "", "shelf": "", "pos": 0, "notes": "", "check": False,
                 "status": "shelf", "person": "", "due": "", "rating": 0, "review": "", "page": 0,
                 "pages": 0, "started": "", "finished": "", "front": "", "back": "", "tags": []}


def clean_backup(b):
    """A backup book with every field present, the same way the app fills them in."""
    out = {"id": str(b["id"])}
    for k, default in BACKUP_FIELDS.items():
        out[k] = b.get(k, default) if b.get(k) is not None else default
    return out


# ---------- library -> backup ----------

def book_to_backup(bk):
    w, c, r = bk.get("work", {}), bk.get("copy", {}), bk.get("reading", {})
    authors = w.get("author") or []
    if len(authors) > 1:
        author = JOIN.get(tuple(authors)) or " ו".join(authors)
    else:
        author = authors[0] if authors else NO_AUTHOR
    return {
        "id": bk["id"],
        "title": w.get("name") or NO_TITLE,
        "author": author,
        "shelf": c.get("shelf", ""),
        "pos": (c.get("position") or 0) * 1000,
        "notes": r.get("notes", ""),
        "check": bool(c.get("needsReview")),
        "status": c.get("status", "shelf"),
        "person": c.get("person", ""),
        "due": c.get("dueDate", ""),
        "rating": r.get("rating", 0),
        "review": r.get("review", ""),
        "page": r.get("currentPage", 0),
        "pages": w.get("numberOfPages", 0),
        "started": r.get("startDate", ""),
        "finished": r.get("endDate", ""),
        "tags": r.get("tags", []),
        "front": c.get("coverFront", ""),
        "back": c.get("coverBack", ""),
    }


def to_backup(lib):
    return {
        "app": "bookshelf",
        "version": 2,
        "exported": now_iso(),
        "meta": {
            "shelves": [{"id": s["id"]} for s in lib["library"]["shelves"]],
            "goal": lib["library"].get("yearlyGoal", 0),
        },
        "books": [book_to_backup(b) for b in lib["books"]],
    }


# ---------- CSV ----------

def shelf_number(lib, sid):
    for i, s in enumerate(lib["library"]["shelves"], 1):
        if s["id"] == sid:
            return i
    return ""


def to_csv_rows(lib):
    for bk in lib["books"]:
        w, c, r = bk.get("work", {}), bk.get("copy", {}), bk.get("reading", {})
        yield {
            "id": bk["id"],
            "title": w.get("name", ""),
            "subtitle": w.get("alternativeHeadline", ""),
            "authors": LIST_SEP.join(w.get("author", [])),
            "translators": LIST_SEP.join(w.get("translator", [])),
            "language": w.get("inLanguage", ""),
            "isbn": w.get("isbn", ""),
            "publisher": w.get("publisher", ""),
            "published": w.get("datePublished", ""),
            "pages": w.get("numberOfPages", ""),
            "shelf": shelf_number(lib, c.get("shelf")),
            "position": c.get("position", ""),
            "status": c.get("status", ""),
            "person": c.get("person", ""),
            "due_date": c.get("dueDate", ""),
            "needs_review": "yes" if c.get("needsReview") else "",
            "rating": r.get("rating", ""),
            "tags": LIST_SEP.join(r.get("tags", [])),
            "current_page": r.get("currentPage", ""),
            "start_date": r.get("startDate", ""),
            "end_date": r.get("endDate", ""),
            "review": r.get("review", ""),
            "notes": r.get("notes", ""),
        }


def split_list(s):
    return [x.strip() for x in (s or "").split(";") if x.strip()]


def to_int(s):
    s = (s or "").strip()
    return int(s) if s.isdigit() else None


def from_csv(rows, library_info):
    shelves_needed = sorted({to_int(r.get("shelf")) for r in rows if to_int(r.get("shelf"))})
    count = max(shelves_needed or [0])
    shelves = [{"id": f"s{i}"} for i in range(1, count + 1)]
    books = []
    for n, r in enumerate(rows, 1):
        sn = to_int(r.get("shelf"))
        work = prune({
            "name": (r.get("title") or "").strip() or None,
            "alternativeHeadline": (r.get("subtitle") or "").strip(),
            "author": split_list(r.get("authors")),
            "translator": split_list(r.get("translators")),
            "inLanguage": (r.get("language") or "").strip(),
            "isbn": re.sub(r"[^0-9]", "", r.get("isbn") or ""),
            "publisher": (r.get("publisher") or "").strip(),
            "datePublished": (r.get("published") or "").strip(),
            "numberOfPages": to_int(r.get("pages")),
        })
        copy = prune({
            "shelf": f"s{sn}" if sn else None,
            "position": to_int(r.get("position")),
            "person": (r.get("person") or "").strip(),
            "dueDate": (r.get("due_date") or "").strip(),
        })
        copy["status"] = (r.get("status") or "shelf").strip()
        if (r.get("needs_review") or "").strip().lower() in ("yes", "true", "1", "כן"):
            copy["needsReview"] = True
        reading = prune({
            "rating": to_int(r.get("rating")),
            "tags": list(dict.fromkeys(split_list(r.get("tags")))),
            "currentPage": to_int(r.get("current_page")),
            "startDate": (r.get("start_date") or "").strip(),
            "endDate": (r.get("end_date") or "").strip(),
            "review": (r.get("review") or "").strip(),
            "notes": (r.get("notes") or "").strip(),
        })
        bk = {"id": (r.get("id") or "").strip() or f"b{n}", "work": work, "copy": copy}
        if reading:
            bk["reading"] = reading
        books.append(bk)
    library = dict(library_info)
    library["shelves"] = shelves
    return {"format": FORMAT, "formatVersion": VERSION, "exportedAt": now_iso(),
            "generator": GENERATOR, "library": library, "books": books}


# ---------- validation ----------

DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def basic_checks(lib):
    """Checks that do not need the jsonschema package, plus rules a schema cannot express."""
    errs = []
    if lib.get("format") != FORMAT:
        errs.append("format must be 'bookshelf-library'")
    if not re.match(r"^1\.\d+\.\d+$", str(lib.get("formatVersion", ""))):
        errs.append("formatVersion must be 1.x.y")
    shelves = [s.get("id") for s in lib.get("library", {}).get("shelves", [])]
    if len(set(shelves)) != len(shelves):
        errs.append("shelf ids must be unique")
    seen, places = set(), set()
    for bk in lib.get("books", []):
        bid = bk.get("id")
        where = f"book {bid}"
        if bid in seen:
            errs.append(f"{where}: duplicate id")
        seen.add(bid)
        c, r = bk.get("copy", {}), bk.get("reading", {})
        if c.get("status") not in STATUSES:
            errs.append(f"{where}: unknown status {c.get('status')!r}")
        if c.get("shelf") and c["shelf"] not in shelves:
            errs.append(f"{where}: shelf {c['shelf']} does not exist")
        if c.get("shelf") and c.get("position"):
            key = (c["shelf"], c["position"])
            if key in places:
                errs.append(f"{where}: two books at shelf {c['shelf']} position {c['position']}")
            places.add(key)
        if "rating" in r and not (1 <= r["rating"] <= 5):
            errs.append(f"{where}: rating must be 1-5")
        for k in ("startDate", "endDate"):
            if k in r and not DATE.match(r[k]):
                errs.append(f"{where}: {k} must be YYYY-MM-DD")
        if "dueDate" in c and not DATE.match(c["dueDate"]):
            errs.append(f"{where}: dueDate must be YYYY-MM-DD")
    return errs


def validate(lib):
    errs = basic_checks(lib)
    try:
        import jsonschema  # optional
    except ImportError:
        return errs, False
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    v = jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    for e in sorted(v.iter_errors(lib), key=lambda e: list(e.path)):
        errs.append("/".join(map(str, e.path)) + ": " + e.message)
    return errs, True


# ---------- CLI ----------

def read_json(p):
    return json.loads(Path(p).read_text(encoding="utf-8-sig"))


def write_json(p, data):
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def write_js(p, lib):
    """The baseline as a script, so app.html can load it even when opened as a file (file://)."""
    body = json.dumps(lib, ensure_ascii=False, indent=1).replace("</", "<\\/")
    Path(p).parent.mkdir(parents=True, exist_ok=True)
    Path(p).write_text(
        "/* Generated from data/library.json by tools/convert.py to-js. Do not edit by hand.\n"
        "   The starting point (baseline) the app loads when this browser has no saved library. */\n"
        "window.BOOKSHELF_BASELINE = " + body + ";\n",
        encoding="utf-8", newline="\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["from-backup", "to-backup", "to-csv", "from-csv", "validate", "to-js", "baseline"])
    ap.add_argument("input")
    ap.add_argument("-o", "--output")
    a = ap.parse_args(argv)

    if a.command == "validate":
        errs, full = validate(read_json(a.input))
        for e in errs:
            print("ERROR", e)
        print(("OK" if not errs else f"{len(errs)} errors") + (" (full schema)" if full else " (basic checks; install jsonschema for the full schema)"))
        return 1 if errs else 0

    if not a.output and a.command != "baseline":
        ap.error("-o is required")

    if a.command == "from-backup":
        lib = from_backup(read_json(a.input), DEFAULT_LIBRARY)
    elif a.command == "from-csv":
        with open(a.input, encoding="utf-8-sig", newline="") as f:
            lib = from_csv(list(csv.DictReader(f)), DEFAULT_LIBRARY)
    elif a.command == "baseline":
        # Make an exported library.json the new starting point: data/library.json, .js and .csv
        lib_in = read_json(a.input)
        errs, _ = validate(lib_in)
        if errs:
            for e in errs:
                print("ERROR", e)
            print("baseline not changed: the file is not valid")
            return 1
        data = ROOT / "data"
        write_json(data / "library.json", lib_in)
        write_js(data / "library.js", lib_in)
        with open(data / "library.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            w.writeheader()
            w.writerows(to_csv_rows(lib_in))
        print(f"new baseline: {len(lib_in['books'])} books -> data/library.json, library.js, library.csv")
        return 0
    elif a.command == "to-js":
        lib_in = read_json(a.input)
        errs, _ = validate(lib_in)
        if errs:
            for e in errs:
                print("ERROR", e)
            print("not written: the input is not valid")
            return 1
        write_js(a.output, lib_in)
        print(f"wrote {a.output} ({len(lib_in['books'])} books)")
        return 0
    elif a.command == "to-backup":
        write_json(a.output, to_backup(read_json(a.input)))
        print("wrote", a.output)
        return 0
    else:  # to-csv
        lib_in = read_json(a.input)
        Path(a.output).parent.mkdir(parents=True, exist_ok=True)
        with open(a.output, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            w.writeheader()
            w.writerows(to_csv_rows(lib_in))
        print("wrote", a.output)
        return 0

    errs, _ = validate(lib)
    if errs:
        for e in errs:
            print("ERROR", e)
        print("not written: the result is not valid")
        return 1
    write_json(a.output, lib)
    print(f"wrote {a.output} ({len(lib['books'])} books, {len(lib['library']['shelves'])} shelves)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
