import type { Env } from "./env";
import { googleAdminConfigured, verifyGoogleAdmin } from "./google";
import { json, readJson } from "./http";

const REGIONS = new Set([
  "fukuoka",
  "saga",
  "nagasaki",
  "kumamoto",
  "oita",
  "miyazaki",
  "kagoshima",
  "okinawa",
  "other",
]);

const FOOD_ITEMS = new Set([
  "",
  "soda_akane",
  "soda_blue",
  "soda_green",
  "soda_yugiri",
  "other",
]);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 3;
const OTHER_MAX = 20;
const COMMENT_MAX = 400;
const RECENT_COMMENTS = 30;

function bearerToken(request: Request): string {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match?.[1] ?? "";
}

async function requireGoogleAdmin(request: Request, env: Env): Promise<Response | null> {
  if (!googleAdminConfigured(env)) {
    return json(request, { success: false, error: "UNAVAILABLE" }, 503);
  }
  const token = bearerToken(request);
  if (!token || !(await verifyGoogleAdmin(token, env))) {
    return json(request, { success: false, error: "UNAUTHORIZED" }, 401);
  }
  return null;
}

function clientIp(request: Request): string {
  const cf = request.headers.get("CF-Connecting-IP")?.trim();
  if (cf) return cf.slice(0, 64);
  const forwarded = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 64);
  return "unknown";
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (text.length > max) return null;
  return text;
}

function ratingOf(value: unknown): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > 5) return undefined;
  return value;
}

type SurveyBody = {
  region: string;
  regionOther: string;
  boughtFood: boolean;
  foodItem: string;
  foodRating: number | null;
  foodComment: string;
  appRating: number | null;
  appComment: string;
};

function parseBody(payload: unknown): SurveyBody | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;

  const region = typeof body.region === "string" ? body.region : "";
  if (!REGIONS.has(region)) return null;

  const regionOther = cleanText(body.regionOther ?? "", OTHER_MAX);
  if (regionOther === null) return null;
  if (region === "other" && regionOther.length < 1) return null;
  if (region !== "other" && regionOther.length > 0) return null;

  if (typeof body.boughtFood !== "boolean") return null;
  const boughtFood = body.boughtFood;

  const foodItem = typeof body.foodItem === "string" ? body.foodItem : "";
  if (!FOOD_ITEMS.has(foodItem)) return null;

  const foodRating = ratingOf(body.foodRating);
  if (foodRating === undefined) return null;
  const foodComment = cleanText(body.foodComment ?? "", COMMENT_MAX);
  if (foodComment === null) return null;

  const appRating = ratingOf(body.appRating);
  if (appRating === undefined) return null;
  const appComment = cleanText(body.appComment ?? "", COMMENT_MAX);
  if (appComment === null) return null;

  if (!boughtFood) {
    if (foodItem || foodRating !== null || foodComment) return null;
  } else if (foodItem === "") {
    return null;
  }

  return {
    region,
    regionOther: region === "other" ? regionOther : "",
    boughtFood,
    foodItem: boughtFood ? foodItem : "",
    foodRating: boughtFood ? foodRating : null,
    foodComment: boughtFood ? foodComment : "",
    appRating,
    appComment,
  };
}

async function takeRateSlot(db: D1Database, ip: string, now: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT window_start, count FROM survey_rate WHERE ip = ?")
    .bind(ip)
    .first<{ window_start: number; count: number }>();

  if (!row || now - row.window_start >= RATE_WINDOW_MS) {
    await db
      .prepare(
        `INSERT INTO survey_rate (ip, window_start, count) VALUES (?1, ?2, 1)
         ON CONFLICT(ip) DO UPDATE SET window_start = ?2, count = 1`,
      )
      .bind(ip, now)
      .run();
    return true;
  }

  if (row.count >= RATE_MAX) return false;

  await db
    .prepare("UPDATE survey_rate SET count = count + 1 WHERE ip = ? AND count < ?")
    .bind(ip, RATE_MAX)
    .run();
  return true;
}

export async function handleSurveySubmit(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { success: false, error: "INVALID" }, 400);

  const body = parseBody(parsed.payload);
  if (!body) return json(request, { success: false, error: "INVALID" }, 400);

  const now = Date.now();
  const ip = clientIp(request);
  const allowed = await takeRateSlot(env.DB, ip, now);
  if (!allowed) return json(request, { success: false, error: "LOCKED" }, 429);

  await env.DB.prepare(
    `INSERT INTO surveys (
      created_at, region, region_other, bought_food, food_item,
      food_rating, food_comment, app_rating, app_comment
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      now,
      body.region,
      body.regionOther,
      body.boughtFood ? 1 : 0,
      body.foodItem,
      body.foodRating,
      body.foodComment,
      body.appRating,
      body.appComment,
    )
    .run();

  return json(request, { success: true });
}

export async function handleSurveySummary(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;

  const totalRow = await env.DB.prepare("SELECT COUNT(*) AS n FROM surveys").first<{ n: number }>();
  const total = Number(totalRow?.n ?? 0);

  const regionRows = await env.DB.prepare(
    `SELECT region, COUNT(*) AS n FROM surveys GROUP BY region ORDER BY n DESC`,
  ).all<{ region: string; n: number }>();

  const boughtRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM surveys WHERE bought_food = 1",
  ).first<{ n: number }>();
  const bought = Number(boughtRow?.n ?? 0);

  const foodAvgRow = await env.DB.prepare(
    "SELECT AVG(food_rating) AS avg FROM surveys WHERE food_rating IS NOT NULL",
  ).first<{ avg: number | null }>();
  const appAvgRow = await env.DB.prepare(
    "SELECT AVG(app_rating) AS avg FROM surveys WHERE app_rating IS NOT NULL",
  ).first<{ avg: number | null }>();

  const foodItemRows = await env.DB.prepare(
    `SELECT food_item AS item, COUNT(*) AS n FROM surveys
     WHERE bought_food = 1 AND food_item != ''
     GROUP BY food_item ORDER BY n DESC`,
  ).all<{ item: string; n: number }>();

  const recent = await env.DB.prepare(
    `SELECT created_at AS createdAt, region, region_other AS regionOther,
            bought_food AS boughtFood, food_item AS foodItem, food_rating AS foodRating,
            food_comment AS foodComment, app_rating AS appRating, app_comment AS appComment
     FROM surveys ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(RECENT_COMMENTS)
    .all<{
      createdAt: number;
      region: string;
      regionOther: string;
      boughtFood: number;
      foodItem: string;
      foodRating: number | null;
      foodComment: string;
      appRating: number | null;
      appComment: string;
    }>();

  return json(request, {
    success: true,
    total,
    bought,
    foodRatingAvg: foodAvgRow?.avg == null ? null : Number(foodAvgRow.avg),
    appRatingAvg: appAvgRow?.avg == null ? null : Number(appAvgRow.avg),
    regions: (regionRows.results ?? []).map((row) => ({
      region: row.region,
      count: Number(row.n),
    })),
    foodItems: (foodItemRows.results ?? []).map((row) => ({
      item: row.item,
      count: Number(row.n),
    })),
    recent: (recent.results ?? []).map((row) => ({
      createdAt: row.createdAt,
      region: row.region,
      regionOther: row.regionOther,
      boughtFood: row.boughtFood === 1,
      foodItem: row.foodItem,
      foodRating: row.foodRating,
      foodComment: row.foodComment,
      appRating: row.appRating,
      appComment: row.appComment,
    })),
  });
}
