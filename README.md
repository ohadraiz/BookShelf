# ארון הספרים שלי - Virtual Home Bookshelf

אפליקציית ווב בעברית לניהול ספריית הספרים הביתית של אוהד ונועה. הארון מוצג כארון עץ עם מדפים, והספרים עומדים עליו כשדרות צבעוניות.

## שני מקומות, שני תפקידים
| מקום | קישור | מה יש שם |
|---|---|---|
| האתר החי (Claude Artifact) | https://claude.ai/artifact/VpYb4SQNy3fmvKBQBTG9nw | האפליקציה שרצה, והנתונים החיים (מסד הנתונים של ה-Artifact) |
| המאגר הזה (GitHub) | - | קוד המקור, פורמט הנתונים, גיבויים, תיעוד והיסטוריית שינויים |

תוכנית העבודה וכללי הסנכרון בין השניים: [docs/ROADMAP.md](docs/ROADMAP.md).

## מה יש כאן
| קובץ | מה זה |
|---|---|
| `app.html` | כל האפליקציה בקובץ אחד: HTML, CSS ו-JavaScript, בלי build |
| `data/library.json` | כל הספרים בפורמט הקבוע ([docs/FORMAT.md](docs/FORMAT.md)) |
| `data/library.csv` | אותם נתונים כגיליון |
| `data/backups/` | עותקים בפורמט הגיבוי של האתר |
| `data/seed.json` | הקטלוג הראשוני (תמונת מצב ישנה) |
| `schema/library.schema.json` | הגדרת הפורמט (JSON Schema 2020-12) |
| `tools/convert.py` | המרה בין גיבוי האתר, הפורמט הקבוע ו-CSV |
| `tools/test_convert.py` | בדיקה שההמרות לא מאבדות מידע |
| `tools/make_test.py` | בונה `test.html` לבדיקה מקומית עם נתוני ה-seed |
| `docs/` | פורמט, תוכנית עבודה ודוחות |

## הרצה מקומית
```bash
python tools/make_test.py
python -m http.server 8765 --bind 127.0.0.1
```
ואז לפתוח את http://127.0.0.1:8765/test.html. במצב הזה שינויים לא נשמרים.

## בדיקות
```bash
python tools/test_convert.py
python tools/convert.py validate data/library.json
```
