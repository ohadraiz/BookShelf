# Project Instructions - ארון הספרים שלי (BookShelf)

קובץ ההוראות של הפרויקט, לכל הסוכנים: Claude Code (דרך `CLAUDE.md`), Codex ו-Copilot.

## מה זה
אפליקציית ווב בעברית (RTL) לניהול ספריית הספרים הביתית של אוהד ונועה. הארון מוצג כארון עץ עם מדפים ממוספרים, והספרים עומדים עליו כשדרות צבעוניות. לחיצה על ספר פותחת כרטיס: סטטוס קריאה, דירוג בכוכבים, הערה, תמונות כריכה ועריכה.

## איך עובדים היום (מ-4 בנובמבר 2026)
כל העבודה נעשית מהמחשב הזה, כמו בפרויקט "רחובות ירושלים". אין שרת ואין שיתוף.
א. **הפעלה:** `start.cmd`, או `python -m http.server 8765 --bind 127.0.0.1` ופתיחת http://127.0.0.1:8765/app.html. תמיד מאותה כתובת: הדפדפן שומר את הארון לפי כתובת, כולל הפורט.
ב. **נקודת ההתחלה (baseline):** `data/library.json` - 137 הספרים, אחרי האימות מ-4 בנובמבר 2026. כשאין ארון שמור בדפדפן, האפליקציה טוענת אותה מ-`data/library.js` (נוצר אוטומטית, לא עורכים ביד).
ג. **שינויים:** נשמרים בדפדפן (`localStorage`, מפתח `bookshelf-local-v1`). תמונות כריכה נשמרות ב-IndexedDB (`bookshelf-covers`) ולא נכנסות לקבצי הייצוא.
ד. **שמירת שינויים בפרויקט:** בתפריט "ייצוא לקובץ library.json", ואז `python tools/convert.py baseline <הקובץ שהורד>`. הפקודה בודקת את הקובץ, ורק אם הוא תקין מעדכנת את `data/library.json`, `library.js` ו-`library.csv`. אחר כך commit.
ה. **חזרה להתחלה:** בתפריט "חזרה לנקודת ההתחלה". מוחק את השינויים בדפדפן וטוען מחדש את `data/library.json`.

## מצבי ההפעלה של app.html
| מצב | מתי | איפה הנתונים |
|---|---|---|
| מקומי (`localMode`) | נפתח מהמחשב, בלי `window.claude` | `localStorage` + IndexedDB |
| Claude (`db`) | נפתח כ-Artifact ב-claude.ai | מסד המסמכים של ה-Artifact |
| זיכרון (`memMode`) | `test.html` עם תגית `<script id="demo">` | זיכרון בלבד, שינויים לא נשמרים |

**ה-Artifact ב-claude.ai קפוא.** https://claude.ai/artifact/VpYb4SQNy3fmvKBQBTG9nw (slug `e9634e55-6f83-45c1-a574-78fef8647480`) מכיל את הגרסה מ-4 בנובמבר 2026 ואת הנתונים שם. לא מפרסמים אליו ולא כותבים למסד שלו בלי בקשה מפורשת של אוהד. הקישור הישן https://claude.ai/artifact/Vcna6ehDVJEN9t8KLrszkx ציבורי ולא ניתן לעדכון, ולכן לא משתמשים בו.

## מבנה הקבצים
| קובץ | מה זה |
|---|---|
| `app.html` | האפליקציה: HTML, CSS ו-JS בקובץ אחד, בלי build |
| `assets/format.js` | המרה בין הפורמט הקבוע לרשומות של האפליקציה. מקביל ל-`tools/convert.py` |
| `data/library.json` | נקודת ההתחלה בפורמט הקבוע. ההסבר ב-`docs/FORMAT.md` |
| `data/library.js` | אותם נתונים כסקריפט, כדי שהאפליקציה תטען אותם. נוצר אוטומטית |
| `data/library.csv` | אותם נתונים כגיליון |
| `data/backups/` | עותקים בפורמט הגיבוי של האפליקציה |
| `data/seed.json` | הקטלוג הראשוני. היסטורי, לא בשימוש |
| `schema/library.schema.json` | הגדרת הפורמט (JSON Schema 2020-12) |
| `tools/convert.py` | המרות, בדיקת תקינות, ועדכון נקודת ההתחלה (`baseline`) |
| `tools/make_test.py` | בונה `test.html` במצב זיכרון |

## מודל הנתונים בתוך האפליקציה
```json
{ "title":"", "author":"", "shelf":"s1", "pos":1000,
  "status":"shelf|reading|read|want|lent|borrowed|given",
  "rating":0, "review":"", "notes":"", "tags":[],
  "person":"", "due":"YYYY-MM-DD", "page":0, "pages":0,
  "started":"", "finished":"", "front":"<assetId>", "back":"<assetId>",
  "check": false }
```
א. `pos` - מיקום על המדף. הזזה מחשבת ממוצע בין השכנים, ו-renumber נעשה כשאין מרווח.
ב. `check` - הזיהוי לא ודאי ("לבדיקה").
ג. `want` - "רוצה לקרוא". ספרים בסטטוס הזה לא מוצגים בארון.
ד. מדפים: `meta.shelves` = `[{id}]`, הסדר במערך הוא סדר המדפים. אין להם שמות, הם מוצגים כ"מדף 1", "מדף 2".

## בדיקות חובה לפני שמכריזים שמשהו עובד
```bash
node tests/format.test.js
python tools/test_convert.py
python tools/convert.py validate data/library.json
```
בשינוי ב-JavaScript: `node --check` על הקובץ, ולסקריפט שבתוך `app.html` - לחלץ אותו ולבדוק. אחר כך לבדוק בדפדפן בכתובת המקומית.

## כללים קבועים
א. אין commit, push או פרסום בלי אישור מפורש של אוהד.
ב. ממשק בעברית ו-RTL. בכותרות שמשלבות שפות, העברית באה ראשונה. בלי אימוג'ים. מקף רגיל (-), לא מקף ארוך.
ג. תכנון מכוון ולא "vibe coding". שינויים זהירים, ובדיקה לפני שמכריזים שמשהו עובד.
ד. שינוי בפורמט מעלה את `formatVersion`, ומעדכן יחד את `schema/`, `tools/convert.py`, `assets/format.js` ו-`docs/FORMAT.md`.
ה. כל שינוי בנתונים מתחיל מנקודת ההתחלה (`data/library.json`). לא עורכים את `data/library.js` ביד.
ו. סוף שורה LF (`.gitattributes`). בכתיבת קבצים מ-Python ב-Windows להעביר `newline="\n"`.

## תוכנית העבודה
`docs/ROADMAP.md`.
