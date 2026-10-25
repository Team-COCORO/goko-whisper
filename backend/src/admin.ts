import type { Env } from "./env";
import { googleAdminConfigured, verifyGoogleAdmin } from "./google";
import { json, readJson } from "./http";
import { STAMP_IDS } from "./ids";

const MAX_RESULTS = 500;
const STAMP_ORDER = ["spot1", "spot2", "spot3"] as const;
const TELEGRAM_CODE_RE = /^[0-7]-[0-7]-[0-7]-[0-7]$/;

type SearchRow = {
  nickname: string;
  telegram_code: string;
  stamps: string;
  created_at: number;
  redeemed: number;
  ticket: number;
};

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

export async function handleSummary(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;

  const issuedRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM tokens",
  ).first<{ n: number }>();
  const redeemedRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM tokens WHERE status = 'redeemed'",
  ).first<{ n: number }>();
  const limitRow = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'reward_limit'",
  ).first<{ value: string }>();

  const issued = Number(issuedRow?.n ?? 0);
  const redeemed = Number(redeemedRow?.n ?? 0);
  const limit = Number(limitRow?.value ?? 0);
  const remaining = Math.max(0, (Number.isFinite(limit) ? limit : 0) - issued);

  return json(request, { success: true, issued, redeemed, remaining, limit });
}

function bearerToken(request: Request): string {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  return match?.[1] ?? "";
}

function parseLimit(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  if (value < 1) return null;
  return Math.min(value, MAX_RESULTS);
}

function searchRequest(url: URL): { nickname?: string; limit: number } | null {
  const nicknameParam = url.searchParams.get("nickname");
  if (nicknameParam !== null) {
    const nickname = nicknameParam.trim();
    if (nickname.length < 1 || nickname.length > 10) return null;
    return { nickname, limit: MAX_RESULTS };
  }
  const limitParam = url.searchParams.get("limit");
  if (limitParam === null) return { limit: MAX_RESULTS };
  const limit = parseLimit(limitParam);
  if (limit === null) return null;
  return { limit };
}

function parseStamps(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const present = new Set(
      parsed.filter((item): item is string => typeof item === "string" && STAMP_IDS.has(item)),
    );
    return STAMP_ORDER.filter((id) => present.has(id));
  } catch {
    return [];
  }
}

export async function handleStudentSearch(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;

  const query = searchRequest(new URL(request.url));
  if (!query) return json(request, { success: false, error: "INVALID" }, 400);

  const sql = `SELECT s.nickname, s.telegram_code, s.stamps, s.created_at,
            CASE WHEN t.status = 'redeemed' THEN 1 ELSE 0 END AS redeemed,
            CASE WHEN t.status = 'issued' THEN 1 ELSE 0 END AS ticket
     FROM students s
     LEFT JOIN tokens t ON t.client_id = s.client_id
     ${query.nickname ? "WHERE s.nickname = ?" : ""}
     ORDER BY s.created_at DESC
     LIMIT ?`;
  const statement = env.DB.prepare(sql);
  const listed = query.nickname
    ? await statement.bind(query.nickname, query.limit + 1).all<SearchRow>()
    : await statement.bind(query.limit + 1).all<SearchRow>();
  const truncated = listed.results.length > query.limit;
  const students = listed.results.slice(0, query.limit).map((row) => ({
    nickname: row.nickname,
    telegramCode: row.telegram_code,
    createdAt: Number(row.created_at),
    stamps: parseStamps(row.stamps),
    redeemed: Number(row.redeemed) === 1,
    ticketIssued: Number(row.ticket) === 1,
  }));
  return json(request, { success: true, truncated, students });
}

function readStudentKey(payload: unknown): { nickname: string; telegramCode: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { nickname?: unknown; telegramCode?: unknown };
  const nickname = typeof record.nickname === "string" ? record.nickname.trim() : "";
  const telegramCode = typeof record.telegramCode === "string" ? record.telegramCode : "";
  if (nickname.length < 1 || nickname.length > 10 || !TELEGRAM_CODE_RE.test(telegramCode)) return null;
  return { nickname, telegramCode };
}

function readStampSet(payload: unknown): string[] | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { stamps?: unknown };
  if (!Array.isArray(record.stamps)) return null;
  const present = new Set<string>();
  for (const item of record.stamps) {
    if (typeof item !== "string" || !STAMP_IDS.has(item) || present.has(item)) return null;
    present.add(item);
  }
  return STAMP_ORDER.filter((id) => present.has(id));
}

export async function handleStudentDelete(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { success: false, error: "INVALID" }, 400);
  const key = readStudentKey(parsed.payload);
  if (!key) return json(request, { success: false, error: "INVALID" }, 400);

  const student = await env.DB.prepare(
    "SELECT client_id FROM students WHERE nickname = ? AND telegram_code = ?",
  )
    .bind(key.nickname, key.telegramCode)
    .first<{ client_id: string }>();
  if (!student) return json(request, { success: false, error: "NOT_FOUND" }, 404);

  const token = await env.DB.prepare("SELECT status FROM tokens WHERE client_id = ?")
    .bind(student.client_id)
    .first<{ status: string }>();

  const statements = [];
  if (token?.status === "issued") {
    statements.push(
      env.DB.prepare("DELETE FROM tokens WHERE client_id = ? AND status = 'issued'").bind(student.client_id),
    );
  }
  statements.push(
    env.DB.prepare("DELETE FROM students WHERE nickname = ? AND telegram_code = ?").bind(
      key.nickname,
      key.telegramCode,
    ),
  );
  const results = await env.DB.batch(statements);
  const removed = results[results.length - 1];
  if ((removed?.meta.changes ?? 0) < 1) {
    return json(request, { success: false, error: "NOT_FOUND" }, 404);
  }
  return json(request, { success: true });
}

export async function handleStudentStamps(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { success: false, error: "INVALID" }, 400);
  const key = readStudentKey(parsed.payload);
  const stamps = readStampSet(parsed.payload);
  if (!key || !stamps) return json(request, { success: false, error: "INVALID" }, 400);

  const updated = await env.DB.prepare(
    `UPDATE students
     SET stamps = ?1, updated_at = ?2
     WHERE nickname = ?3 AND telegram_code = ?4`,
  )
    .bind(JSON.stringify(stamps), Date.now(), key.nickname, key.telegramCode)
    .run();
  if ((updated.meta.changes ?? 0) < 1) {
    return json(request, { success: false, error: "NOT_FOUND" }, 404);
  }
  return json(request, { success: true });
}

export async function handleStudentRedeem(request: Request, env: Env): Promise<Response> {
  const denied = await requireGoogleAdmin(request, env);
  if (denied) return denied;
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { success: false, error: "INVALID" }, 400);
  const key = readStudentKey(parsed.payload);
  if (!key) return json(request, { success: false, error: "INVALID" }, 400);

  const student = await env.DB.prepare(
    "SELECT client_id FROM students WHERE nickname = ? AND telegram_code = ?",
  )
    .bind(key.nickname, key.telegramCode)
    .first<{ client_id: string }>();
  if (!student) return json(request, { success: false, error: "NOT_FOUND" }, 404);

  const updated = await env.DB.prepare(
    `UPDATE tokens
     SET status = 'redeemed', redeemed_at = ?1
     WHERE client_id = ?2 AND status = 'issued'`,
  )
    .bind(Date.now(), student.client_id)
    .run();
  if ((updated.meta.changes ?? 0) < 1) {
    return json(request, { success: false, error: "NO_TOKEN" }, 409);
  }
  return json(request, { success: true });
}
