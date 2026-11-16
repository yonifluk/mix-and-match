# Mix and Match 👗

סטייליסטית אישית בטלפון: מצלמים את הבגדים בארון, ובבוקר כותבים "באלי משהו ספורטיבי שחור וורוד" – ומקבלים 3 לוקים מהארון, עם הדמיה על דמות. אפשר גם להעלות צילום מסך של לוק מאינסטגרם/זארה ולקבל אותו מהארון.

**האתר:** https://yonifluk.github.io/mix-and-match/

## איך זה בנוי (הכל חינם)
| חלק | איפה | עלות |
|---|---|---|
| האפליקציה (`index.html`) | GitHub Pages | חינם |
| הארון והתמונות | בטלפון של כל משתמשת (IndexedDB) | חינם |
| ה-AI | Cloudflare Worker (`worker/worker.js`) שמחזיק את המפתח | חינם, בלי כרטיס |
| המודל | Gemini (מכסה חינמית) או Claude (לפי שימוש) | לבחירה |

בלי ה-Worker האפליקציה עדיין עובדת – רק בלי זיהוי אוטומטי מתמונה, וההמלצות פשוטות יותר.

---

## שלב 1 – הפעלת האתר (פעם אחת)
1. בריפו: **Settings → Pages**
2. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)** → **Save**
3. אחרי דקה-שתיים האתר עולה בכתובת למעלה ✅

מעכשיו כל שינוי שנכנס ל-main מתעדכן באתר לבד.

## שלב 2 – ה-AI (Cloudflare Worker)
1. **מפתח:** חינמי ב-[aistudio.google.com/apikey](https://aistudio.google.com/apikey) (Gemini), או מפתח Claude מ-console.anthropic.com
2. נרשמים ב-[dash.cloudflare.com](https://dash.cloudflare.com) (חינם, בלי כרטיס)
3. **Workers & Pages → Create → Create Worker** → שם: `mix-and-match-api` → **Deploy**
4. **Edit code** → מוחקים הכל, מדביקים את התוכן של `worker/worker.js` → **Deploy**
5. **Settings → Variables and Secrets:**
   - `PROVIDER` = `gemini` (או `claude`)
   - `ALLOWED_ORIGINS` = `https://yonifluk.github.io`
   - `GEMINI_API_KEY` (או `ANTHROPIC_API_KEY`) → סוג **Secret**
6. (מומלץ) הגבלה יומית: **Storage & Databases → KV → Create** בשם `mm-usage`, ואז ב-Worker: **Settings → Bindings → KV namespace** בשם `USAGE`
7. מעתיקים את כתובת ה-Worker (`https://mix-and-match-api.<you>.workers.dev`) ומדביקים ב-`config.js`

## בטיחות ועלויות
- המפתח נשמר רק ב-Cloudflare – לא בקוד ולא בטלפון.
- ה-Worker עונה רק לבקשות מהאתר (`ALLOWED_ORIGINS`) ומגביל כל משתמשת ל-40 בקשות ביום (`DAILY_LIMIT`).
- עם Claude: מומלץ להגדיר spend limit ב-console.anthropic.com.
- עם Gemini חינמי: המכסה של גוגל מוגבלת, והיא רשאית להשתמש בתוכן הבקשות לשיפור המוצרים שלה – בדקו את התנאים לפני השקה רחבה.
