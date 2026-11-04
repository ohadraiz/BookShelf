"""Build test.html: app.html with the seed data embedded as demo data (memory mode)."""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "app.html").read_text(encoding="utf-8")
seed = (root / "data" / "seed.json").read_text(encoding="utf-8").replace("<", "\\u003c")
tag = '<script type="application/json" id="demo">' + seed + "</script>\n"
(root / "test.html").write_text(html.replace("<body>\n", "<body>\n" + tag, 1), encoding="utf-8")
print("wrote", root / "test.html")
