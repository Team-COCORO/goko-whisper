import type { Env } from "./env";
import { errorText, json, readJson, safeEqual } from "./http";
import { BLOCKED_CLIENT_ID, CLIENT_ID_RE } from "./ids";
import { clearPinFailure, pinLocked, recordPinFailure } from "./lockout";

type TokenRow = {
  code: string;
  nickname: string;
  issued_at: number;
  status: string;
  redeemed_at: number | null;
};

const REQUIRED_STAMPS = ["spot1", "spot2", "spot3"] as const;

const INSERT_TOKEN = `
INSERT INTO tokens (client_id, code, nickname, status, issued_at)
SELECT ?1, ?2, ?3, 'issued', ?4
WHERE (SELECT COUNT(*) FROM tokens)
      < (SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'reward_limit')
`;

function drawCode(): string {
  const span = 900_000;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / span) * span;
  let value = 0;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return String(100_000 + (value % span));
}

async function findByClient(
  db: D1Database,
  clientId: string,
): Promise<TokenRow | null> {
  return db
    .prepare(
      "SELECT code, nickname, issued_at, status, redeemed_at FROM tokens WHERE client_id = ?",
    )
    .bind(clientId)
    .first<TokenRow>();
}

function issuedBody(row: TokenRow) {
  return { result: "issued" as const, code: row.code, issuedAt: row.issued_at };
}

function hasAllStamps(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return false;
    const present = new Set(parsed);
    return REQUIRED_STAMPS.every((id) => present.has(id));
  } catch {
    return false;
  }
}

type Issued = ReturnType<typeof issuedBody> | { result: "sold_out" };

function keepExisting(
  row: TokenRow,
  nickname: string,
): { ok: true; body: Issued } | { ok: false; error: "forbidden" } {
  if (row.nickname !== nickname) return { ok: false, error: "forbidden" };
  return { ok: true, body: issuedBody(row) };
}

async function issueToken(
  db: D1Database,
  nickname: string,
  clientId: string,
  stamps: string,
): Promise<{ ok: true; body: Issued } | { ok: false; error: "unavailable" | "forbidden" }> {
  const existing = await findByClient(db, clientId);
  if (existing) return keepExisting(existing, nickname);
  if (!hasAllStamps(stamps)) return { ok: false, error: "forbidden" };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = drawCode();
    const issuedAt = Date.now();
    try {
      const result = await db
        .prepare(INSERT_TOKEN)
        .bind(clientId, code, nickname, issuedAt)
        .run();
      if ((result.meta.changes ?? 0) > 0) {
        return {
          ok: true,
          body: { result: "issued", code, issuedAt },
        };
      }
      const raced = await findByClient(db, clientId);
      if (raced) return keepExisting(raced, nickname);
      return { ok: true, body: { result: "sold_out" } };
    } catch (error) {
      const message = errorText(error);
      if (message.includes("tokens.client_id")) {
        const raced = await findByClient(db, clientId);
        if (raced) return keepExisting(raced, nickname);
        return { ok: false, error: "unavailable" };
      }
      if (message.includes("tokens.code")) continue;
      return { ok: false, error: "unavailable" };
    }
  }

  return { ok: false, error: "unavailable" };
}

export async function handleIssue(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { result: "invalid" }, 400);
  const payload = parsed.payload;

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { nickname?: unknown; clientId?: unknown };
  const nickname =
    typeof record.nickname === "string" ? record.nickname.trim() : "";
  const clientId = typeof record.clientId === "string" ? record.clientId : "";

  if (
    !nickname ||
    nickname.length > 10 ||
    !CLIENT_ID_RE.test(clientId) ||
    clientId === BLOCKED_CLIENT_ID
  ) {
    return json(request, { result: "invalid" }, 400);
  }

  const student = await env.DB.prepare(
    "SELECT nickname, stamps FROM students WHERE client_id = ?",
  )
    .bind(clientId)
    .first<{ nickname: string; stamps: string }>();
  if (!student || student.nickname !== nickname) {
    return json(request, { result: "forbidden" }, 403);
  }

  const issued = await issueToken(env.DB, student.nickname, clientId, student.stamps);
  if (!issued.ok) {
    const status = issued.error === "forbidden" ? 403 : 500;
    return json(request, { result: issued.error === "forbidden" ? "forbidden" : "unavailable" }, status);
  }
  return json(request, issued.body);
}

export async function handleVerify(request: Request, env: Env): Promise<Response> {
  const parsed = await readJson(request);
  if (!parsed.ok) return json(request, { result: "invalid" }, 400);
  const payload = parsed.payload;

  if (!payload || typeof payload !== "object") {
    return json(request, { result: "invalid" }, 400);
  }

  const record = payload as { code?: unknown; pin?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const pin = typeof record.pin === "string" ? record.pin : "";

  if (!/^\d{4}$/.test(pin)) {
    return json(request, { result: "invalid_pin" }, 401);
  }
  if (!/^\d{4}$|^\d{6}$/.test(code)) {
    return json(request, { result: "unknown_code" }, 404);
  }

  const row = await env.DB.prepare(
    "SELECT status, redeemed_at FROM tokens WHERE code = ?",
  )
    .bind(code)
    .first<{ status: string; redeemed_at: number | null }>();

  const now = Date.now();
  if (row && (await pinLocked(env.DB, code, now))) {
    return json(request, { result: "locked" }, 429);
  }

  const pinOk = await safeEqual(pin, env.STAFF_PIN);
  if (!pinOk) {
    if (!row) return json(request, { result: "invalid_pin" }, 401);
    const failure = await recordPinFailure(env.DB, code, now);
    if (failure === "locked") return json(request, { result: "locked" }, 429);
    return json(request, { result: "invalid_pin" }, 401);
  }

  if (!row) return json(request, { result: "unknown_code" }, 404);
  await clearPinFailure(env.DB, code);

  if (row.status === "redeemed") {
    return json(request, {
      result: "already_redeemed",
      redeemedAt: row.redeemed_at,
    });
  }

  const redeemedAt = Date.now();
  const updated = await env.DB.prepare(
    `UPDATE tokens
     SET status = 'redeemed', redeemed_at = ?1
     WHERE code = ?2 AND status = 'issued'`,
  )
    .bind(redeemedAt, code)
    .run();

  if ((updated.meta.changes ?? 0) > 0) {
    return json(request, { result: "redeemed", redeemedAt });
  }

  const latest = await env.DB.prepare(
    "SELECT status, redeemed_at FROM tokens WHERE code = ?",
  )
    .bind(code)
    .first<{ status: string; redeemed_at: number | null }>();

  if (latest?.status === "redeemed") {
    return json(request, {
      result: "already_redeemed",
      redeemedAt: latest.redeemed_at,
    });
  }

  return json(request, { result: "unknown_code" }, 404);
}
