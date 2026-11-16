// Mix and Match – Cloudflare Worker.
// Holds the AI API key so it never reaches the browser. Free plan, no credit card.
// Env (Settings → Variables and Secrets):
//   PROVIDER         "gemini" (free tier) or "claude"
//   GEMINI_API_KEY   secret – from aistudio.google.com/apikey   (when PROVIDER=gemini)
//   ANTHROPIC_API_KEY secret – from console.anthropic.com        (when PROVIDER=claude)
//   ALLOWED_ORIGINS  e.g. "https://yonifluk.github.io"
//   DAILY_LIMIT      AI calls per user (IP) per day, default 40
//   USAGE            optional KV namespace binding for the daily limit

const CATS = { top: "עליון", bottom: "תחתון", dress: "שמלה", outer: "שכבה עליונה", shoes: "נעליים", bag: "תיק", acc: "אקססורי" };
const SEASONS = { all: "כל השנה", summer: "קיץ", winter: "חורף" };

const TAG_PROMPT = `זו תמונה של פריט לבוש אחד מהארון של אישה. זהי את הפריט המרכזי בתמונה.
החזירי JSON בלבד, בדיוק במבנה הזה:
{"name":"שם קצר וברור בעברית, למשל: טייץ שחור ספורטיבי","cat":"top|bottom|dress|outer|shoes|bag|acc","colors":["צבעים בעברית, הצבע העיקרי ראשון"],"hex":"#rrggbb של הצבע העיקרי","style":["מתוך הרשימה בלבד: ספורטיבי, קז׳ואל, בייסיק, עבודה, אלגנטי, ערב, חוף"],"season":"all|summer|winter"}
cat: top=חולצה/גופייה/סוודר, bottom=מכנסיים/חצאית/טייץ/שורט, dress=שמלה/אוברול, outer=ז׳קט/מעיל/בלייזר/קרדיגן/קפוצ׳ון, shoes=נעליים, bag=תיק, acc=אקססוריז/כובע/צעיף/תכשיט.
אם אין בתמונה פריט לבוש, החזירי {"cat":"none"}.`;

const clip = (v, n) => String(v ?? "").replace(/[\r\n|]+/g, " ").slice(0, n);

function stylistPrompt({ request, avoid, closet, season, date }) {
  const lines = closet.map(it => [
    clip(it.id, 40), clip(it.name, 60), CATS[it.cat] || "פריט",
    (it.colors || []).slice(0, 4).map(c => clip(c, 20)).join("/") || "-",
    (it.style || []).slice(0, 6).map(s => clip(s, 20)).join("/") || "-",
    SEASONS[it.season] || "כל השנה", clip(it.lastWorn, 12) || "לא תועד",
  ].join(" | ")).join("\n");
  return `את סטייליסטית אישית חמה ומקצועית. המשתמשת מבקשת לוק מתוך הבגדים שיש לה בארון.

הארון שלה (פורמט: id | שם | קטגוריה | צבעים | סגנון | עונה | נלבש לאחרונה):
${lines}

התאריך היום: ${clip(date, 12)}. העונה בישראל: ${clip(season, 10)}.
הבקשה שלה: "${clip(request, 300)}"
${avoid ? `היא כבר ראתה לוקים עם השילובים האלה – תני לה שילובים אחרים ושונים: ${clip(avoid, 600)}` : ""}

כללים:
- השתמשי רק בפריטים מהרשימה, לפי ה-id המדויק.
- כל לוק בנוי מבסיס (שמלה, או פריט עליון + פריט תחתון), ועוד נעליים אם יש בארון, ושכבה עליונה/תיק/אקססורי כשזה מתאים לבקשה ולעונה.
- תני עדיפות לפריטים שלא נלבשו לאחרונה. אל תחזרי על אותו בסיס בשני לוקים.
- אם אי אפשר למלא את הבקשה בדיוק (למשל אין פריט ורוד), תני את השילוב הכי קרוב ותכתבי בעדינות מה חסר בשדה missing.
- כתבי בעברית, בלשון נקבה, קליל וחם, בלי להגזים.

החזירי JSON בלבד במבנה:
{"note":"משפט פתיחה קצר ואישי, או ריק","looks":[{"title":"שם קצר וקליט ללוק","item_ids":["id1","id2"],"why":"למה זה עובד – משפט או שניים","tip":"טיפ סטיילינג קצר","missing":"פריט שהיה משדרג את הלוק, או ריק"}]}
תני 3 לוקים שונים זה מזה (פחות אם הארון קטן מדי).`;
}

function closetText(closet) {
  return closet.map(it => [
    clip(it.id, 40), clip(it.name, 60), CATS[it.cat] || "פריט",
    (it.colors || []).slice(0, 4).map(c => clip(c, 20)).join("/") || "-",
    (it.style || []).slice(0, 6).map(s => clip(s, 20)).join("/") || "-",
    SEASONS[it.season] || "כל השנה", clip(it.lastWorn, 12) || "לא תועד",
  ].join(" | ")).join("\n");
}

function inspoPrompt({ closet, season }) {
  return `את סטייליסטית אישית. מצורף צילום מסך של לוק השראה שהמשתמשת אהבה (מאינסטגרם, דוגמנית או אתר אופנה).
1. זהי את הלוק בתמונה: אילו פריטים, צבעים וסגנון.
2. הרכיבי מהארון שלה עד 2 גרסאות שהכי קרובות ללוק הזה.

הארון שלה (פורמט: id | שם | קטגוריה | צבעים | סגנון | עונה | נלבש לאחרונה):
${closetText(closet)}

העונה בישראל: ${clip(season, 10)}.
כללים: השתמשי רק בפריטים מהרשימה לפי id מדויק. בכל לוק: שמלה, או עליון + תחתון, ועוד נעליים/שכבה/תיק כשזה מתאים להשראה.
בשדה missing כתבי איזה פריט ספציפי חסר לה כדי להגיע ללוק המקורי (סוג, צבע, גזרה – כך שתוכל לחפש אותו בחנות), או ריק.
כתבי בעברית, בלשון נקבה, קליל וחם. אל תזהי ואל תזכירי מי האדם שבתמונה.

החזירי JSON בלבד:
{"note":"משפט שמתאר את לוק ההשראה ומה המפתח שלו","looks":[{"title":"...","item_ids":["..."],"why":"מה לקחנו מההשראה","tip":"טיפ סטיילינג קצר","missing":"..."}]}`;
}

function parseJson(text) {
  try { return JSON.parse(text); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch (_) {} }
  const a = text.search(/[{[]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (_) {} }
  throw new Error("bad_json");
}


async function callClaude(env, model, prompt, image) {
  const content = image
    ? [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } }, { type: "text", text: prompt }]
    : prompt;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content }] }),
  });
  if (r.status === 429) throw Object.assign(new Error("rate"), { status: 429 });
  if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text()).slice(0, 200));
  const j = await r.json();
  return j.content.map(c => c.text || "").join("");
}

async function callGemini(env, prompt, image) {
  const model = env.GEMINI_MODEL || "gemini-flash-latest";
  const parts = image ? [{ inline_data: { mime_type: "image/jpeg", data: image } }, { text: prompt }] : [{ text: prompt }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.8 } }),
  });
  if (r.status === 429) throw Object.assign(new Error("rate"), { status: 429 });
  if (!r.ok) throw new Error("gemini " + r.status + " " + (await r.text()).slice(0, 200));
  const j = await r.json();
  return (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
}

async function ask(env, quick, prompt, image) {
  if ((env.PROVIDER || "gemini") === "claude") return callClaude(env, quick ? "claude-haiku-5-5" : "claude-sonnet-5-5", prompt, image);
  return callGemini(env, prompt, image);
}

const json = (obj, status, headers) => new Response(JSON.stringify(obj), { status, headers: { ...headers, "content-type": "application/json" } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const ok = !allowed.length || allowed.includes(origin);
    const cors = { "Access-Control-Allow-Origin": ok ? (origin || "*") : "null", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || !ok) return json({ error: "forbidden" }, 403, cors);

    if (env.USAGE) {
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const key = new Date().toISOString().slice(0, 10) + ":" + ip;
      const n = parseInt((await env.USAGE.get(key)) || "0", 10);
      if (n >= (parseInt(env.DAILY_LIMIT, 10) || 40)) return json({ error: "rate_limited" }, 429, cors);
      await env.USAGE.put(key, String(n + 1), { expirationTtl: 90000 });
    }

    let d;
    try { d = await req.json(); } catch { return json({ error: "bad_request" }, 400, cors); }
    const closet = Array.isArray(d.closet) ? d.closet.slice(0, 400) : [];
    const image = typeof d.image === "string" && d.image.length < 4_000_000 ? d.image : null;

    try {
      let text;
      if (d.action === "tag" && image) text = await ask(env, true, TAG_PROMPT, image);
      else if (d.action === "recommend" && closet.length >= 2) text = await ask(env, false, stylistPrompt({ ...d, closet }));
      else if (d.action === "inspo" && image && closet.length >= 2) text = await ask(env, false, inspoPrompt({ ...d, closet }), image);
      else return json({ error: "bad_request" }, 400, cors);
      return json(parseJson(text), 200, cors);
    } catch (e) {
      if (e.status === 429) return json({ error: "rate_limited" }, 429, cors);
      console.log(String(e));
      return json({ error: "upstream" }, 502, cors);
    }
  },
};
