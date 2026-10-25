import { BLOCKED_CLIENT_ID, CLIENT_ID_RE } from "./ids";
import { errorText, json, readJson, safeEqual } from "./http";
import type { Env } from "./env";

type TokenRow = {
  code: string;
  issued_at: number;
  status: string;
  redeemed_at: number | null;
};

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
      "SELECT code, issued_at, status, redeemed_at FROM tokens WHERE client_id = ?",
    )
    .bind(clientId)
    .first<TokenRow>();
}

function issuedBody(row: TokenRow) {
  return { result: "issued" as const, code: row.code, issuedAt: row.issued_at };
}

async function issueToken(
  db: D1Database,
  nickname: string,
  clientId: string,
): Promise<
  | { ok: true; body: ReturnType<typeof issuedBody> | { result: "sold_out" } }
  | { ok: false }
> {
  const existing = await findByClient(db, clientId);
  if (existing) return { ok: true, body: issuedBody(existing) };

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
      if (raced) return { ok: true, body: issuedBody(raced) };
      return { ok: true, body: { result: "sold_out" } };
    } catch (error) {
      const message = errorText(error);
      if (message.includes("tokens.client_id")) {
        const raced = await findByClient(db, clientId);
        if (raced) return { ok: true, body: issuedBody(raced) };
        return { ok: false };
      }
      if (message.includes("tokens.code")) continue;
      return { ok: false };
    }
  }

  return { ok: false };
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

  const issued = await issueToken(env.DB, nickname, clientId);
  if (!issued.ok) return json(request, { result: "unavailable" }, 500);
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

  if (!/^\d{4}$/.test(pin) || !(await safeEqual(pin, env.STAFF_PIN))) {
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

  if (!row) return json(request, { result: "unknown_code" }, 404);

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
